const mongoose = require('mongoose');
const { ROOM_CODE_LENGTH, END_POLICIES, DEFAULT_END_POLICY } = require('../utils/constants');

const roomSchema = new mongoose.Schema({
  roomCode: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    minlength: ROOM_CODE_LENGTH,
    maxlength: ROOM_CODE_LENGTH,
  },
  // SHA-256 of the secret handed to the creator. Whoever presents the secret
  // is the host, regardless of the name they chat under.
  hostTokenHash: {
    type: String,
    required: true,
  },
  // scrypt "salt:hash", or null for rooms without a password.
  passwordHash: {
    type: String,
    default: null,
  },
  endPolicy: {
    type: String,
    enum: END_POLICIES,
    default: DEFAULT_END_POLICY,
  },
  locked: {
    type: Boolean,
    default: false,
  },
  slowModeSeconds: {
    type: Number,
    default: 0,
  },
  // Total ciphertext stored for this room, used to cap per-room storage.
  storageBytes: {
    type: Number,
    default: 0,
  },
  expiresAt: {
    type: Date,
    required: true,
  },
}, {
  timestamps: true,
});

// MongoDB deletes the document once expiresAt has passed. The socket handler
// also runs its own timer so connected users are told the moment it happens.
roomSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

roomSchema.statics.findByCode = function (roomCode) {
  return this.findOne({ roomCode: roomCode.toUpperCase() });
};

const Room = mongoose.model('Room', roomSchema);

module.exports = Room;
