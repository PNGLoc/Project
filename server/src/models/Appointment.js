import mongoose from 'mongoose';

const appointmentSchema = new mongoose.Schema({
    salonId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Salon',
        required: true
    },
    customerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    serviceId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Service',
        required: true
    },
    staffId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Staff',
        required: true
    },
    startAt: {
        type: Date,
        required: true
    },
    endAt: {
        type: Date,
        required: true
    },
    totalPrice: {
        type: Number,
        required: true
    },
    status: {
        type: String,
        enum: ['PENDING', 'CONFIRMED', 'CANCELLED'],
        default: 'PENDING'
    },
    paymentStatus: {
        type: String,
        enum: ['UNPAID', 'PAID'],
        default: 'UNPAID'
    },
    paymentMethod: {
        type: String,
        enum: ['CASH', 'VNPAY'],
        default: 'CASH'
    },
    note: {
        type: String,
        trim: true,
        default: ''
    },
    vnpay: {
        txnRef: String,
        txnNo: String,
        bankCode: String,
        payDate: String
    },
    serviceSnapshot: {
        name: String,
        price: Number,
        duration: Number
    },
    staffSnapshot: {
        fullName: String
    }
}, {
    timestamps: true
});

export default mongoose.model('Appointment', appointmentSchema);
