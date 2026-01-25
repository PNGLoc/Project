import mongoose from 'mongoose';

const pendingUserSchema = new mongoose.Schema({
    fullName: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
    },
    password: {
        type: String,
        required: true,
    },
    phone: {
        type: String,
        required: true,
    },
    verificationToken: {
        type: String,
        required: true,
    },
    otpExpires: {
        type: Date,
        required: true,
    },
    createdAt: {
        type: Date,
        default: Date.now,
        expires: 600, // Automatically delete after 10 minutes (600 seconds)
    }
});

const PendingUser = mongoose.model('PendingUser', pendingUserSchema);
export default PendingUser;
