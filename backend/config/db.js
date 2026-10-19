const mongoose = require('mongoose');

mongoose.set('strictQuery', true);

/**
 * Connect to MongoDB (Atlas or local). Throws a readable error if URI is missing
 * so the server can report it instead of crashing with a stack trace.
 */
async function connectDB(uri = process.env.MONGODB_URI) {
  if (!uri) throw new Error('MONGODB_URI is not set. Copy .env.example to backend/.env and fill it in.');
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 8000 });
  console.log(`MongoDB connected: ${mongoose.connection.host}/${mongoose.connection.name}`);
  return mongoose.connection;
}

module.exports = connectDB;
