import mongoose from 'mongoose';

const reviewSchema = new mongoose.Schema({
  reviewerEmail: { type: String, required: true, lowercase: true },
  reviewerName: String,
  recipientEmail: { type: String, required: true, lowercase: true },
  rating: { type: Number, min: 1, max: 5, required: true },
  text: { type: String, required: true }
}, { timestamps: true });

export default mongoose.model('Review', reviewSchema);
