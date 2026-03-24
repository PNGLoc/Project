import CommissionRate from '../models/CommissionRate.js';
import CommissionTransaction from '../models/CommissionTransaction.js';

const DEFAULT_COMMISSION_PERCENT = 10;

const roundMoney = (value) => Math.round(Number(value || 0));

export const buildCommissionSplit = ({ grossAmount, commissionPercent }) => {
    const normalizedGross = Math.max(0, Number(grossAmount || 0));
    const normalizedPercent = Number.isFinite(Number(commissionPercent))
        ? Number(commissionPercent)
        : DEFAULT_COMMISSION_PERCENT;

    const systemAmount = roundMoney((normalizedGross * normalizedPercent) / 100);
    const salonAmount = roundMoney(normalizedGross - systemAmount);

    return {
        grossAmount: normalizedGross,
        commissionPercent: normalizedPercent,
        systemAmount,
        salonAmount
    };
};

export const createCommissionTransactionForAppointment = async (appointment) => {
    if (!appointment?._id || appointment.paymentStatus !== 'PAID') return null;

    const existing = await CommissionTransaction.findOne({ appointmentId: appointment._id });
    if (existing) return existing;

    const latestRate = await CommissionRate.findOne().sort({ createdAt: -1 }).select('commissionPercent');
    const commissionPercent = latestRate?.commissionPercent ?? DEFAULT_COMMISSION_PERCENT;

    const split = buildCommissionSplit({
        grossAmount: appointment.totalPrice,
        commissionPercent
    });

    return CommissionTransaction.create({
        appointmentId: appointment._id,
        salonId: appointment.salonId,
        customerId: appointment.customerId || null,
        grossAmount: split.grossAmount,
        commissionPercent: split.commissionPercent,
        systemAmount: split.systemAmount,
        salonAmount: split.salonAmount,
        paymentMethod: appointment.paymentMethod,
        paidAt: new Date()
    });
};
