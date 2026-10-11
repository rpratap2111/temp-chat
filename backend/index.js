const express = require('express');
const socketIo = require('socket.io');
const http = require('http');
const cors = require('cors');
const dotenv = require('dotenv');
dotenv.config();

const connectDB = require('./models/db');
const roomRoutes = require('./routes/roomRoutes');
const socketHandler = require('./socket/socketHandler');
const { SOCKET_MAX_BUFFER_BYTES } = require('./utils/constants');

// Comma-separated list of allowed browser origins, e.g. the deployed frontend
// plus a local Vite dev server.
const allowedOrigins = (process.env.VITE_URL || 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const app = express();
const server = http.createServer(app);

// Behind a reverse proxy (Render, Heroku, nginx) the client IP arrives in
// X-Forwarded-For. Rate limits key on it, so only trust it when told to.
if (process.env.TRUST_PROXY) app.set('trust proxy', 1);

const io = socketIo(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true,
  },
  // Encrypted file attachments are sent over the socket.
  maxHttpBufferSize: SOCKET_MAX_BUFFER_BYTES,
});

connectDB();

app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json({ limit: '10kb' }));

app.use('/api/rooms', roomRoutes);

socketHandler(io);

app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(err.status || 500).json({ success: false, message: 'Internal server error' });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
