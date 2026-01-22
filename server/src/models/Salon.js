// server/models/Salon.js
const mongoose = require('mongoose');

const SalonSchema = new mongoose.Schema({
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true },
    address: {
        street: String,
        district: String,
        city: String
    },
    location: {
        type: { type: String, default: "Point" },
        coordinates: { type: [Number], index: "2dsphere" }
    },
    images: [String],
    rating: { type: Number, default: 5.0 },
    isApproved: { type: Boolean, default: false },
    isActive: { type: Boolean, default: false },
    workingHours: [Object]
}, { timestamps: true });

module.exports = mongoose.model('Salon', SalonSchema);