import mongoose from 'mongoose';
import 'dotenv/config';
import logger from '../utils/logger';

// Connect to MongoDB database
const connectDB = async (): Promise<void> => {
  // Ensure MONGODB_URI is defined
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    throw new Error('MONGODB_URI environment variable is missing');
  }

  try {
    // Set up connection event listeners
    mongoose.connection.on('connected', () => {
      logger.info('MongoDB connected successfully');
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB connection disconnected');
    });

    mongoose.connection.on('error', (err) => {
      logger.error('MongoDB connection error:', { error: err });
    });

    // Connect to MongoDB
    await mongoose.connect(mongoUri);
  } catch (error: unknown) {
    logger.error('Failed to connect to MongoDB:', { error });
    throw error; // Re-throw to allow caller to handle
  }
};

export default connectDB;