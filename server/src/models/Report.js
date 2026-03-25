import mongoose from 'mongoose';

const reportSchema = new mongoose.Schema(
  {
    salonId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Salon',
      required: true,
    },
    // For backward-compatibility: legacy reports use `userId` as reporter (customer)
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    // New fields to express "who reported whom" explicitly (supports provider reports)
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    targetUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    appointmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Appointment',
      default: null,
    },
    reason: {
      type: String,
      trim: true,
      maxlength: 200,
      default: '',
    },
    type: {
      type: String,
      enum: ['SALON_COMPLAINT', 'USER_COMPLAINT'],
      default: 'SALON_COMPLAINT',
    },
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },
    evidenceUrls: [String],
    status: {
      type: String,
      enum: ['PENDING', 'IN_REVIEW', 'RESOLVED', 'DISMISSED'],
      default: 'PENDING',
    },
    adminNote: {
      type: String,
      trim: true,
      maxlength: 2000,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model('Report', reportSchema);

