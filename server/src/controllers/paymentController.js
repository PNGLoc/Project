import Appointment from '../models/Appointment.js';
import Transaction from '../models/Transaction.js';
import User from '../models/User.js';
import { verifyVnpayReturn } from '../utils/vnpay.js';
import {
    reserveCollectedCouponUsage,
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

            if (appointment.appliedCoupon?.collectedCouponId) {
                await reserveCollectedCouponUsage({
                    collectedCouponId: appointment.appliedCoupon.collectedCouponId,
                    appointmentId: appointment._id
                });
            }

            if (appointment) {
                const existing = await Transaction.findOne({
                    relatedId: appointment._id,
                    onModel: 'Appointment',
                    type: 'PAYMENT'
                });

                if (!existing) {
                    await Transaction.create({
                        userId: appointment.customerId,
                        amount: appointment.totalPrice,
                        type: 'PAYMENT',
                        relatedId: appointment._id,
                        onModel: 'Appointment'
                    });
                }

                const customer = await User.findById(appointment.customerId).select('fullName email');
                if (customer) {
                    sendBookingConfirmationEmail({ customer, appointment });
                }
            }

            return res.redirect(`${clientUrl}/book-appointment?vnpay=success&appointmentId=${txnRef}`);
        }

        const failedAppointment = await Appointment.findById(txnRef);
        if (failedAppointment && failedAppointment.paymentStatus !== 'PAID') {
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
