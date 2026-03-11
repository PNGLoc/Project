import Appointment from '../models/Appointment.js';
import Transaction from '../models/Transaction.js';
import User from '../models/User.js';
import { verifyVnpayReturn } from '../utils/vnpay.js';
import {
    releaseCollectedCouponUsage,
    sendBookingConfirmationEmail
} from '../utils/appointmentHelpers.js';

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
