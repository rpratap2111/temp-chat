const express = require('express');
const mongoose = require('mongoose');
const socketIo = require('socket.io');
const http = require('http');
const cors = require('cors');
const dotenv = require('dotenv');
dotenv.config();

const connectDB = require('./models/db');
const roomRoutes = require('./routes/roomRoutes');
const socketHandler = require('./socket/socketHandler');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.NODE_ENV === 'production' ? false : process.env.VITE_URL,
    methods: ['GET', 'POST'],
    credentials: true
  }
});

connectDB();
app.use(cors({ origin: process.env.VITE_URL, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/rooms', roomRoutes);

socketHandler(io); // ✅ plug in Socket.IO logic

// Global error handler
app.use((err, req, res) => {
  console.error('Server error:', err);
  res.status(500).json({ success: false, message: 'Internal server error' });
});

app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

const PORT = 4000;
server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
