import cron from 'node-cron';
import Appointment from '../models/Appointment.js';
import { sendAppointmentReminderEmail } from '../utils/appointmentHelpers.js';

/**
 * Checks for appointments scheduled in the next 24 hours 
 * and sends reminder emails if not already sent.
 */
export const checkAndSendReminders = async () => {
    try {
        const now = new Date();
        const twentyFourHoursFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

        // Find confirmed appointments within the next 24 hours that haven't had a reminder sent
        const upcomingAppointments = await Appointment.find({
            status: 'CONFIRMED',
            reminderSent: false,
            startAt: {
                $gt: now,
                $lte: twentyFourHoursFromNow
            }
        }).populate('customerId', 'fullName email');

        if (upcomingAppointments.length === 0) {
            return;
        }

        console.log(`[REMINDER SERVICE] Found ${upcomingAppointments.length} upcoming appointments for reminders.`);

        await Promise.all(upcomingAppointments.map(async (appointment) => {
            const customer = appointment.customerId;
            if (customer && customer.email) {
                await sendAppointmentReminderEmail({ customer, appointment });
            }
            
            // Mark as sent regardless of success to avoid spamming on recurring errors
            // (In a production app, you might want more robust error handling)
            appointment.reminderSent = true;
            await appointment.save();
        }));

    } catch (error) {
        console.error('[REMINDER SERVICE ERROR]', error);
    }
};

/**
 * Initializes the reminder cron job.
 * Runs every hour.
 */
export const initReminderCron = () => {
    // Run every hour at minute 0
    cron.schedule('0 * * * *', () => {
        console.log('[CRON] Running scheduled appointment reminders check...');
        checkAndSendReminders();
    });

    // Optionally run once immediately on startup for testing/safety
    // checkAndSendReminders();
    
    console.log('[CRON] Appointment reminder service initialized.');
};
