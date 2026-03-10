import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
    fullName: {
        type: String,
        required: [true, 'Please add a full name'],
    },
    email: {
        type: String,
        required: [true, 'Please add an email'],
        unique: true,
        match: [
            /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
            'Please add a valid email',
        ],
    },
    password: {
        type: String,
        required: [true, 'Please add a password'],
        minlength: [8, 'Password must be at least 8 characters'],
        validate: {
            validator: function (v) {
                // If it's already a bcrypt hash, return true
                if (v && v.startsWith('$2b$')) return true;
                // At least one uppercase, one lowercase, one number, and one special character
                return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/.test(v);
            },
            message: 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
        },
        select: false,
    },
    role: {
        type: String,
        enum: ['CUSTOMER', 'SALON_OWNER', 'STAFF', 'ADMIN'],
        default: 'CUSTOMER',
    },
    avatar: {
        type: String,
        default: 'default-avatar.jpg', // Placeholder
    },
    phone: {
        type: String,
        required: [true, 'Please add a phone number'],
        match: [/^0\d{9}$/, 'Please add a valid Vietnamese phone number (10 digits, starts with 0)'],
    },
    walletBalance: {
        type: Number,
        default: 0,
    },
    bio: {
        type: String,
        maxLength: [500, 'Bio cannot exceed 500 characters'],
        default: '',
    },
    dateOfBirth: {
        type: Date,
    },
    isActive: {
        type: Boolean,
        default: true,
    },
    isVerified: {
        type: Boolean,
        default: false,
    },
    verificationToken: String,
    otpExpires: Date,
    resetPasswordToken: String,
    resetPasswordExpire: Date,
    salonId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Salon'
    }
}, {
    timestamps: true,
});

// Encrypt password using bcrypt
userSchema.pre('save', async function () {
    if (!this.isModified('password') || this.password.startsWith('$2b$')) {
        return;
    }
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

// Match user entered password to hashed password in database
userSchema.methods.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model('User', userSchema);
export default User;
