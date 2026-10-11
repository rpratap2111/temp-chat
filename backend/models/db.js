const mongoose = require('mongoose');
const Room = require('./room');
const Message = require('./message');

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection failed:', error.message);
    process.exit(1);
  }

  // Make the collections' indexes match the schemas. This also drops indexes
  // the schemas no longer declare, such as the old fixed one-hour TTL indexes,
  // which would otherwise delete rooms early regardless of their lifetime.
  try {
    await Promise.all([Room.syncIndexes(), Message.syncIndexes()]);
  } catch (error) {
    console.error('Index sync failed:', error.message);
  }
};

module.exports = connectDB;
