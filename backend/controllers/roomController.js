const Room = require('../models/room');

exports.createRoom = async (req, res) => {
  try {
    const { username, roomCode } = req.body;

    if (!username || !username.trim() || !roomCode || roomCode.length !== 6) {
      return res.status(400).json({ success: false, message: "Username and valid 6-letter room code are required" });
    }

    const code = roomCode.toUpperCase();
    const existingRoom = await Room.findActiveRoom(code);
    if (existingRoom) {
      return res.status(400).json({ success: false, message: "Room code already in use" });
    }

    const newRoom = new Room({ roomCode: code, createdBy: username.trim() });
    await newRoom.save();

    res.status(201).json({ success: true, roomCode: newRoom.roomCode, message: "Room created successfully" });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

exports.getRoom = async (req, res) => {
  try {
    const { roomCode } = req.params;
    if (!roomCode || roomCode.length !== 6) {
      return res.status(400).json({ success: false, message: "Invalid room code" });
    }

    const room = await Room.findActiveRoom(roomCode);
    if (!room) {
      return res.status(404).json({ success: false, message: "Room Not Found" });
    }

    res.status(200).json({
      success: true,
      room: {
        roomCode: room.roomCode,
        createdBy: room.createdBy,
        createdAt: room.createdAt
      }
    });
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};
