import Appointment from '../models/Appointment.js';
import Transaction from '../models/Transaction.js';
import User from '../models/User.js';
import mongoose from 'mongoose';
import WalletTopup from '../models/WalletTopup.js';
import { buildVnpayUrl, verifyVnpayReturn } from '../utils/vnpay.js';
import {
    decryptWalletEnvelope,
    getWalletEncryptionPublicKey
} from '../utils/walletCrypto.js';
import {
    releaseCollectedCouponUsage,
    sendBookingConfirmationEmail
} from '../utils/appointmentHelpers.js';
import { createCommissionTransactionForAppointment } from '../utils/commissionHelpers.js';

const MIN_FUND_AMOUNT = 1000;
const MAX_FUND_AMOUNT = 50000000;
const WALLET_TOPUP_TXN_PREFIX = 'TOPUP_';

export const getWalletBalance = async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select('walletBalance');
        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }

        return res.json({
            success: true,
            data: {
                walletBalance: Number(user.walletBalance || 0)
            }
        });
    } catch (error) {
        return res.status(500).json({ message: error.message || 'Server error' });
    }
};

export const getWalletPublicKey = async (req, res) => {
    try {
        const publicKey = getWalletEncryptionPublicKey();

        return res.json({
            success: true,
            data: {
                algorithm: 'RSA-OAEP/AES-GCM',
                publicKey
            }
        });
    } catch (error) {
        return res.status(500).json({ message: error.message || 'Server error' });
    }
};

export const addFundEncrypted = async (req, res) => {
    try {
        const { encryptedKey, iv, payload } = req.body || {};

        const decrypted = decryptWalletEnvelope({
            encryptedKey,
            iv,
            payload,
            userId: req.user?._id
        });

        const amount = Number(decrypted?.amount || 0);
        if (!Number.isFinite(amount) || amount < MIN_FUND_AMOUNT || amount > MAX_FUND_AMOUNT) {
            return res.status(400).json({
                message: `Amount must be between ${MIN_FUND_AMOUNT.toLocaleString('vi-VN')} and ${MAX_FUND_AMOUNT.toLocaleString('vi-VN')} VND.`
            });
        }

        const roundedAmount = Math.round(amount);

        const user = await User.findById(req.user._id).select('_id');
        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }

        const topup = await WalletTopup.create({
            userId: req.user._id,
            amount: roundedAmount,
            status: 'PENDING',
            method: 'VNPAY'
        });

        const txnRef = `${WALLET_TOPUP_TXN_PREFIX}${topup._id.toString()}`;

        const returnUrl = process.env.VNPAY_RETURN_URL || 'http://localhost:5000/api/payments/vnpay/return';
        const ipAddr = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
        const paymentUrl = buildVnpayUrl({
            amount: roundedAmount,
            txnRef,
            orderInfo: `Wallet topup ${topup._id}`,
            ipAddr,
            returnUrl
        });

        topup.vnpay = {
            ...topup.vnpay,
            txnRef
        };
        await topup.save();

        return res.status(201).json({
            success: true,
            message: 'Topup request created. Please complete VNPay payment.',
            data: {
                amount: roundedAmount,
                topupId: topup._id,
                paymentUrl
            },
            paymentUrl
        });
    } catch (error) {
        return res.status(400).json({ message: error.message || 'Invalid encrypted wallet request.' });
    }
};

export const getWalletTopupHistory = async (req, res) => {
    try {
        const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
        const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 50);
        const skip = (page - 1) * limit;

        const filter = { userId: req.user._id };

        const [items, total] = await Promise.all([
            WalletTopup.find(filter)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .select('_id amount status method createdAt updatedAt vnpay'),
            WalletTopup.countDocuments(filter)
        ]);

        return res.json({
            success: true,
            data: items,
            pagination: {
                page,
                limit,
                total,
                pages: Math.max(1, Math.ceil(total / limit))
            }
        });
    } catch (error) {
        return res.status(500).json({ message: error.message || 'Server error' });
    }
};

export const handleVnpayReturn = async (req, res) => {
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';

    try {
        const isValid = verifyVnpayReturn(req.query);
        if (!isValid) {
            return res.redirect(`${clientUrl}/book-appointment?vnpay=failed&message=invalid-signature`);
        }

        const responseCode = req.query.vnp_ResponseCode;
        const txnRef = req.query.vnp_TxnRef;

        if (!txnRef) {
            return res.redirect(`${clientUrl}/book-appointment?vnpay=failed&message=missing-reference`);
        }

        if (txnRef.startsWith(WALLET_TOPUP_TXN_PREFIX)) {
            const topupId = txnRef.slice(WALLET_TOPUP_TXN_PREFIX.length);

            if (!mongoose.Types.ObjectId.isValid(topupId)) {
                return res.redirect(`${clientUrl}/profile?tab=wallet&walletTopup=failed&message=invalid-topup-ref`);
            }

            const topup = await WalletTopup.findById(topupId);
            if (!topup) {
                return res.redirect(`${clientUrl}/profile?tab=wallet&walletTopup=failed&message=topup-not-found`);
            }

            if (topup.status === 'SUCCESS') {
                return res.redirect(`${clientUrl}/profile?tab=wallet&walletTopup=success&topupId=${topup._id}`);
            }

            if (responseCode === '00') {
                const amountFromGateway = Number(req.query.vnp_Amount || 0) / 100;
                if (!Number.isFinite(amountFromGateway) || amountFromGateway <= 0 || amountFromGateway !== Number(topup.amount || 0)) {
                    topup.status = 'FAILED';
                    topup.vnpay = {
                        ...topup.vnpay,
                        responseCode,
                        txnNo: req.query.vnp_TransactionNo || '',
                        bankCode: req.query.vnp_BankCode || '',
                        payDate: req.query.vnp_PayDate || ''
                    };
                    await topup.save();
                    return res.redirect(`${clientUrl}/profile?tab=wallet&walletTopup=failed&message=amount-mismatch`);
                }

                const existingDeposit = await Transaction.findOne({
                    relatedId: topup._id,
                    onModel: 'Bank',
                    type: 'DEPOSIT'
                });

                if (!existingDeposit) {
                    try {
                        await Transaction.create({
                            userId: topup.userId,
                            amount: topup.amount,
                            type: 'DEPOSIT',
                            relatedId: topup._id,
                            onModel: 'Bank'
                        });
                    } catch (transactionError) {
                        if (transactionError?.code !== 11000) {
                            throw transactionError;
                        }
                    }

                    const walletUpdated = await User.updateOne(
                        { _id: topup.userId },
                        { $inc: { walletBalance: topup.amount } }
                    );

                    if (!walletUpdated?.matchedCount) {
                        await Transaction.deleteOne({
                            relatedId: topup._id,
                            onModel: 'Bank',
                            type: 'DEPOSIT'
                        });
                        throw new Error('Topup failed: customer wallet not found.');
                    }
                }

                topup.status = 'SUCCESS';
                topup.vnpay = {
                    ...topup.vnpay,
                    responseCode,
                    txnNo: req.query.vnp_TransactionNo || '',
                    bankCode: req.query.vnp_BankCode || '',
                    payDate: req.query.vnp_PayDate || ''
                };
                await topup.save();

                return res.redirect(`${clientUrl}/profile?tab=wallet&walletTopup=success&topupId=${topup._id}`);
            }

            topup.status = 'FAILED';
            topup.vnpay = {
                ...topup.vnpay,
                responseCode,
                txnNo: req.query.vnp_TransactionNo || '',
                bankCode: req.query.vnp_BankCode || '',
                payDate: req.query.vnp_PayDate || ''
            };
            await topup.save();

            return res.redirect(`${clientUrl}/profile?tab=wallet&walletTopup=failed&code=${responseCode}&topupId=${topup._id}`);
        }

        if (responseCode === '00') {
            const appointment = await Appointment.findById(txnRef);

            if (!appointment) {
                return res.redirect(`${clientUrl}/book-appointment?vnpay=failed&message=appointment-not-found`);
            }

            if (appointment.paymentStatus === 'PAID') {
                return res.redirect(`${clientUrl}/book-appointment?vnpay=success&appointmentId=${txnRef}`);
            }

            if (appointment.status === 'CANCELLED' || appointment.paymentStatus === 'REFUNDED') {
                return res.redirect(`${clientUrl}/book-appointment?vnpay=failed&message=appointment-closed`);
            }

            if (appointment.paymentMethod !== 'VNPAY' || appointment.status !== 'PENDING' || appointment.paymentStatus !== 'UNPAID') {
                return res.redirect(`${clientUrl}/book-appointment?vnpay=failed&message=invalid-appointment-state`);
            }

            const amountFromGateway = Number(req.query.vnp_Amount || 0) / 100;
            if (!Number.isFinite(amountFromGateway) || amountFromGateway <= 0 || amountFromGateway !== Number(appointment.totalPrice || 0)) {
                return res.redirect(`${clientUrl}/book-appointment?vnpay=failed&message=amount-mismatch`);
            }

            appointment.paymentStatus = 'PAID';
            appointment.status = 'CONFIRMED';
            appointment.paymentMethod = 'VNPAY';
            appointment.vnpay = {
                txnRef: req.query.vnp_TxnRef,
                txnNo: req.query.vnp_TransactionNo,
                bankCode: req.query.vnp_BankCode,
                payDate: req.query.vnp_PayDate
            };
            await appointment.save();

            if (appointment) {
                const existing = await Transaction.findOne({
                    relatedId: appointment._id,
                    onModel: 'Appointment',
                    type: 'PAYMENT'
                });

                if (!existing) {
                    try {
                        await Transaction.create({
                            userId: appointment.customerId,
                            amount: appointment.totalPrice,
                            type: 'PAYMENT',
                            relatedId: appointment._id,
                            onModel: 'Appointment'
                        });
                    } catch (transactionError) {
                        if (transactionError?.code !== 11000) {
                            throw transactionError;
                        }
                    }
                }

                await createCommissionTransactionForAppointment(appointment);

                const customer = await User.findById(appointment.customerId).select('fullName email');
                if (customer) {
                    sendBookingConfirmationEmail({ customer, appointment });
                }
            }

            return res.redirect(`${clientUrl}/book-appointment?vnpay=success&appointmentId=${txnRef}`);
        }

        const failedAppointment = await Appointment.findById(txnRef);
        if (
            failedAppointment &&
            failedAppointment.paymentMethod === 'VNPAY' &&
            failedAppointment.status === 'PENDING' &&
            failedAppointment.paymentStatus === 'UNPAID'
        ) {
            failedAppointment.status = 'CANCELLED';
            failedAppointment.paymentStatus = 'UNPAID';
            await failedAppointment.save();
            await releaseCollectedCouponUsage(failedAppointment);
        }

        return res.redirect(`${clientUrl}/book-appointment?vnpay=failed&code=${responseCode}&appointmentId=${txnRef}`);
    } catch (error) {
        return res.redirect(`${clientUrl}/book-appointment?vnpay=failed&message=server-error`);
    }
};
