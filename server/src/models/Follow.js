import mongoose from 'mongoose';

const FollowSchema = new mongoose.Schema(
  {
    followerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    targetType: {
      type: String,
      enum: ['SALON', 'STAFF'],
      required: true,
    },
    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

FollowSchema.index(
  { followerId: 1, targetType: 1, targetId: 1 },
  { unique: true }
);

const Follow = mongoose.model('Follow', FollowSchema);

// Drop old index if exists (one-time fix)
Follow.collection.getIndexes().then((indexes) => {
  if (indexes['followerId_1_followingId_1']) {
    Follow.collection.dropIndex('followerId_1_followingId_1').catch((err) => {
      // Ignore if index doesn't exist
      if (err.code !== 27) {
        console.error('[FOLLOW MODEL] Error dropping old index:', err.message);
      }
    });
  }
}).catch((err) => {
  console.error('[FOLLOW MODEL] Error checking indexes:', err.message);
});

export default Follow;


