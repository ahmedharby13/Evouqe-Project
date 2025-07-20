import { v2 as cloudinary } from 'cloudinary';
import 'dotenv/config';

// Initialize Cloudinary configuration
const connectCloudinary = async (): Promise<void> => {
  // Ensure environment variables are defined
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error('Cloudinary environment variables are missing');
  }

  // Configure Cloudinary with provided credentials
  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
  });
};

export default connectCloudinary;