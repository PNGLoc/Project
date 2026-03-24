import mongoose from 'mongoose';

const flashsaleSchema = new mongoose.Schema({
    salonId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Salon',
        required: true
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        trim: true
    },
    startTime: {
        type: Date,
        required: true
    },
    endTime: {
        type: Date,
        required: true
    },
    status: {
        type: String,
        enum: ['Upcoming', 'Active', 'Expired', 'Cancelled'],
        default: 'Upcoming'
    },
    services: [{
        serviceId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Service',
            required: true
        },
        discountType: {
            type: String,
            enum: ['percentage', 'fixed'],
            default: 'percentage'
        },
        discountValue: {
            type: Number,
            required: true,
            min: 0
        },
        usageLimit: {
            type: Number,
            required: true,
            min: 1
        },
        usedCount: {
            type: Number,
            default: 0
        }
    }]
}, {
    timestamps: true
});

const Flashsale = mongoose.model('Flashsale', flashsaleSchema);
export default Flashsale;
