import Appointment from '../models/Appointment.js';
import Transaction from '../models/Transaction.js';
import { verifyVnpayReturn } from '../utils/vnpay.js';

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
            const appointment = await Appointment.findByIdAndUpdate(txnRef, {
                paymentStatus: 'PAID',
                status: 'CONFIRMED',
                paymentMethod: 'VNPAY',
                vnpay: {
                    txnRef: req.query.vnp_TxnRef,
                    txnNo: req.query.vnp_TransactionNo,
                    bankCode: req.query.vnp_BankCode,
                    payDate: req.query.vnp_PayDate
                }
            }, { new: true });

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
            }

            return res.redirect(`${clientUrl}/book-appointment?vnpay=success&appointmentId=${txnRef}`);
        }

        return res.redirect(`${clientUrl}/book-appointment?vnpay=failed&code=${responseCode}`);
    } catch (error) {
        return res.redirect(`${clientUrl}/book-appointment?vnpay=failed&message=server-error`);
    }
};
