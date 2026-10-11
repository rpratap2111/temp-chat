const mongoose = require('mongoose');
const { USERNAME_MAX_LENGTH, MAX_CIPHERTEXT_LENGTH } = require('../utils/constants');

const messageSchema = new mongoose.Schema({
  roomCode: {
    type: String,
    required: true,
    uppercase: true,
  },
  username: {
    type: String,
    required: true,
    trim: true,
    maxlength: USERNAME_MAX_LENGTH,
  },
  messageType: {
    type: String,
    enum: ['user', 'system'],
    default: 'user',
  },
  // Plain text, only for server-generated system messages ("Ann joined").
  text: {
    type: String,
    maxlength: 500,
  },
  // User messages are encrypted in the browser; the server stores only
  // the AES-GCM ciphertext and IV, both base64.
  ciphertext: {
    type: String,
    maxlength: MAX_CIPHERTEXT_LENGTH,
  },
  iv: {
    type: String,
    maxlength: 32,
  },
  size: {
    type: Number,
    default: 0,
  },
  // SHA-256 of the sender's session token, so only they (or the host) can
  // delete the message even if someone later reuses the same name.
  senderKey: {
    type: String,
  },
  burnSeconds: {
    type: Number,
    default: 0,
  },
  pinned: {
    type: Boolean,
    default: false,
  },
  // The room's expiry, or the burn time for self-destructing messages.
  expiresAt: {
    type: Date,
    required: true,
  },
}, {
  timestamps: true,
});

messageSchema.index({ roomCode: 1, createdAt: 1 });
messageSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Returns the most recent `limit` live messages in chronological order.
// MongoDB's TTL sweep runs about once a minute, so already-expired documents
// are filtered out here rather than relied on to be gone.
messageSchema.statics.getRecentMessages = async function (roomCode, limit) {
  const newestFirst = await this.find({
    roomCode: roomCode.toUpperCase(),
    expiresAt: { $gt: new Date() },
  })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean()
    .exec();
  return newestFirst.reverse();
};

messageSchema.statics.createSystemMessage = function (roomCode, text, expiresAt) {
  return this.create({
    roomCode: roomCode.toUpperCase(),
    username: 'System',
    text,
    messageType: 'system',
    expiresAt,
  });
};

const Message = mongoose.model('Message', messageSchema);
module.exports = Message;
