const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  roomCode: {
    type: String,
    required: true,
    uppercase: true
  },
  username: {
    type: String,
    required: true,
    trim: true
  },
  message: {
    type: String,
    required: true,
    trim: true,
    maxlength: 1000
  },
  messageType: {
    type: String,
    enum: ['user', 'system'],
    default: 'user'
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

messageSchema.index({ roomCode: 1, timestamp: 1 });

messageSchema.statics.getRecentMessages = function(roomCode, limit = 50) {
  return this.find({ roomCode: roomCode.toUpperCase() })
    .sort({ timestamp: -1 })
    .limit(limit)
    .exec();
};

messageSchema.statics.createSystemMessage = function(roomCode, message) {
  return this.create({
    roomCode: roomCode.toUpperCase(),
    username: 'System',
    message,
    messageType: 'system'
  });
};

const Message = mongoose.model('Message', messageSchema);
module.exports = Message;