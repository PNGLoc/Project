import nodemailer from 'nodemailer';
import Coupon from '../models/Coupon.js';
import UserCollectedCoupon from '../models/UserCollectedCoupon.js';
import User from '../models/User.js';
import Transaction from '../models/Transaction.js';

export const calculateCouponDiscount = (coupon, amount) => {
    if (!coupon || amount <= 0) return 0;

    if (coupon.discountType === 'PERCENTAGE') {
        const rawDiscount = (amount * coupon.discountValue) / 100;
        if (coupon.maxDiscountAmount && coupon.maxDiscountAmount > 0) {
            return Math.max(0, Math.min(rawDiscount, coupon.maxDiscountAmount));
        }
        return Math.max(0, rawDiscount);
    }

    return Math.max(0, coupon.discountValue || 0);
};

export const reserveCollectedCouponUsage = async ({ collectedCouponId, appointmentId }) => {
    if (!collectedCouponId || !appointmentId) return;

    const collected = await UserCollectedCoupon.findById(collectedCouponId);
    if (!collected) return;

    collected.isUsed = true;
    collected.usedAt = new Date();
    collected.usedAppointmentId = appointmentId;
    await collected.save();

    await Coupon.updateOne(
        { _id: collected.couponId },
        { $inc: { usedCount: 1 } }
    );
};

export const releaseCollectedCouponUsage = async (appointment) => {
    const collectedCouponId = appointment?.appliedCoupon?.collectedCouponId;
    const couponId = appointment?.appliedCoupon?.couponId;

    if (!couponId) return false;

    if (collectedCouponId) {
        const collected = await UserCollectedCoupon.findById(collectedCouponId);
        if (collected && collected.usedAppointmentId?.toString() === appointment._id.toString()) {
            collected.isUsed = false;
            collected.usedAt = null;
            collected.usedAppointmentId = null;
            await collected.save();
        }
    }

    await Coupon.updateOne(
        { _id: couponId, usedCount: { $gt: 0 } },
        { $inc: { usedCount: -1 } }
    );

    return true;
};

export const refundAppointmentToWallet = async (appointment) => {
    if (!appointment?.customerId || !appointment?.totalPrice || appointment.totalPrice <= 0) {
        return 0;
    }

    const refundFilter = {
        relatedId: appointment._id,
        onModel: 'Appointment',
        type: 'REFUND'
    };

    try {
        await Transaction.create({
            userId: appointment.customerId,
            amount: appointment.totalPrice,
            type: 'REFUND',
            relatedId: appointment._id,
            onModel: 'Appointment'
        });
    } catch (error) {
        if (error?.code === 11000) {
            return 0;
        }
        throw error;
    }

    const walletUpdated = await User.updateOne(
        { _id: appointment.customerId },
        { $inc: { walletBalance: appointment.totalPrice } }
    );

    if (!walletUpdated?.matchedCount) {
        await Transaction.deleteOne(refundFilter);
        throw new Error('Refund failed: customer wallet not found.');
    }

    return appointment.totalPrice;
};

const getEmailTransporter = () => {
    const { EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASS } = process.env;

    if (!EMAIL_HOST || !EMAIL_PORT || !EMAIL_USER || !EMAIL_PASS) {
        return null;
    }

    return nodemailer.createTransport({
        host: EMAIL_HOST,
        port: Number(EMAIL_PORT),
        secure: false,
        auth: {
            user: EMAIL_USER,
            pass: EMAIL_PASS.replace(/\s+/g, '')
        }
    });
};

export const sendBookingConfirmationEmail = async ({ customer, appointment }) => {
    if (!customer?.email || !appointment) return;

    const transporter = getEmailTransporter();
    if (!transporter) return;

    const schedule = new Date(appointment.startAt).toLocaleString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });

    const salonName = appointment.salonSnapshot?.name || 'Your salon';
    const serviceName = appointment.serviceSnapshot?.name || 'Service';
    const stylistName = appointment.staffSnapshot?.fullName || 'Stylist';
    const amount = Number(appointment.totalPrice || 0).toLocaleString('vi-VN');

    const subject = 'Booking Confirmation - Boms Salon';
    const text = `Hello ${customer.fullName || 'Customer'},\n\n` +
        `Your booking has been confirmed successfully.\n` +
        `Salon: ${salonName}\n` +
        `Service: ${serviceName}\n` +
        `Stylist: ${stylistName}\n` +
        `Schedule: ${schedule}\n` +
        `Amount: ${amount} VND\n\n` +
        `Thank you for booking with us.`;

    const html =
        `<p>Hello <b>${customer.fullName || 'Customer'}</b>,</p>` +
        `<p>Your booking has been confirmed successfully.</p>` +
        `<ul>` +
        `<li><b>Salon:</b> ${salonName}</li>` +
        `<li><b>Service:</b> ${serviceName}</li>` +
        `<li><b>Stylist:</b> ${stylistName}</li>` +
        `<li><b>Schedule:</b> ${schedule}</li>` +
        `<li><b>Amount:</b> ${amount} VND</li>` +
        `</ul>` +
        `<p>Thank you for booking with us.</p>`;

    try {
        await transporter.sendMail({
            from: `"Boms Salon" <${process.env.EMAIL_USER}>`,
            to: customer.email,
            subject,
            text,
            html
        });
    } catch (error) {
        console.error('[BOOKING EMAIL ERROR]', error.message);
    }
};

export const sendAppointmentReminderEmail = async ({ customer, appointment }) => {
    if (!customer?.email || !appointment) return;

    const transporter = getEmailTransporter();
    if (!transporter) return;

    const schedule = new Date(appointment.startAt).toLocaleString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });

    const salonName = appointment.salonSnapshot?.name || 'Your salon';
    const serviceName = appointment.serviceSnapshot?.name || 'Service';
    const stylistName = appointment.staffSnapshot?.fullName || 'Stylist';

    const subject = `Reminder: Your Appointment at ${salonName} is Tomorrow!`;
    const text = `Hello ${customer.fullName || 'Customer'},\n\n` +
        `This is a friendly reminder for your upcoming appointment.\n` +
        `Salon: ${salonName}\n` +
        `Service: ${serviceName}\n` +
        `Stylist: ${stylistName}\n` +
        `Schedule: ${schedule}\n\n` +
        `We look forward to seeing you!`;

    const html =
        `<p>Hello <b>${customer.fullName || 'Customer'}</b>,</p>` +
        `<p>This is a friendly reminder for your upcoming appointment.</p>` +
        `<ul>` +
        `<li><b>Salon:</b> ${salonName}</li>` +
        `<li><b>Service:</b> ${serviceName}</li>` +
        `<li><b>Stylist:</b> ${stylistName}</li>` +
        `<li><b>Schedule:</b> ${schedule}</li>` +
        `</ul>` +
        `<p>We look forward to seeing you!</p>`;

    try {
        await transporter.sendMail({
            from: `"Boms Salon" <${process.env.EMAIL_USER}>`,
            to: customer.email,
            subject,
            text,
            html
        });
        console.log(`[REMINDER SENT] Appointment ${appointment._id} to ${customer.email}`);
    } catch (error) {
        console.error('[REMINDER EMAIL ERROR]', error.message);
    }
};
