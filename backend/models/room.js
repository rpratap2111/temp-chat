const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema({
    roomCode: {
        type: String,
        required: true,
        unique: true,
        minlength: 6,
        maxlength: 6
    },
    createdBy: {
        type: String,
        required: true,
        trim: true
    },
    createdAt: {
        type: Date,
        default: Date.now,
        expires: 3600 
    },
    active: {
        type: Boolean,
        default: true
    },
    participants: [{
        username: {
            type: String,
            required: true,
            trim: true
        },
        joinedAt: {
            type: Date,
            default: Date.now
        }
    }]
}, {
    timestamps: true
});

roomSchema.pre('save', function (next) {
    if (this.roomCode) {
        this.roomCode = this.roomCode.toUpperCase();
    }
    next();
});

roomSchema.statics.findActiveRoom = function (roomCode) {
    return this.findOne({ roomCode: roomCode.toUpperCase(), active: true });
};

const Room = mongoose.model('Room', roomSchema);

module.exports = Room;
