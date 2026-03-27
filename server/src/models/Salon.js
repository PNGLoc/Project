import mongoose from 'mongoose';

const salonSchema = new mongoose.Schema({
    // 1. Link to Owner (User collection)
    ownerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true
    },

    // 2. Basic Info
    name: { type: String, required: true },
    phone: { type: String, required: true }, // Salon Hotline Phone

    // 3. Detailed Address
    address: { type: String, required: true },

    // 4. Map Location (GeoJSON for radius search)
    location: {
        type: { type: String, enum: ['Point'], default: 'Point' },
        coordinates: { type: [Number], default: [0, 0] } // [Longitude, Latitude]
    },

    // 5. Images (Array of image paths)
    images: [String],

    // 6. Identification
    businessLicenseImage: String,
    ownerIdNumber: String,

    // 7. Operation Status
    isApproved: { type: Boolean, default: false }, // Requires Admin approval
    isActive: { type: Boolean, default: false },   // Owner can toggle open/closed
    rejectionReason: String,                       // Rejection reason if any

    // 7. Opening Hours
    workingHours: [{
        day: Number,  // 0: Sun, 1: Mon...
        open: String, // "08:00"
        close: String // "20:00"
    }],

    // 8. Display Data
    rating: { type: Number, default: 0 },
    reviews: { type: Number, default: 0 }

}, {
    timestamps: true, // Automatically create createdAt, updatedAt
    collection: 'salon'
});

salonSchema.index({ ownerId: 1 }, { unique: false });

// Geospatial index for nearby salon search
salonSchema.index({ location: "2dsphere" });

salonSchema.post('save', async function (doc) {
    try {
        // Automatically link the Salon ID to the Owner (User)
        await mongoose.model('User').findByIdAndUpdate(doc.ownerId, {
            salonId: doc._id
        });
        console.log("Successfully updated salonId for User!");
    } catch (err) {
        console.error("Error updating salonId for User:", err);
    }
});

export default mongoose.model('Salon', salonSchema);