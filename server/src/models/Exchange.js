import mongoose from 'mongoose';

const exchangeSchema = new mongoose.Schema({
  requesterEmail: { type: String, required: true, lowercase: true },
  ownerEmail: { type: String, required: true, lowercase: true },
  requesterName: String,
  ownerName: String,
  skillId: String,
  skillTitle: String,
  offer: String,
  status: { type: String, enum: ['pending', 'accepted', 'rejected', 'completed'], default: 'pending' }
}, { timestamps: true });

export default mongoose.model('Exchange', exchangeSchema);
