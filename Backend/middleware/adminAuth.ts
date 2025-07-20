import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import userModel, { User } from '../models/userModel';
import logger from '../utils/logger';

// Define JWT payload interface
interface JwtPayload {
  id: string;
}

// Extend Request interface for authUser
export interface AuthRequest extends Request {
  authUser?: User;
}

// Helper function to validate environment variables
const validateEnv = (): void => {
  if (!process.env.JWT_SECRET_KEY) {
    throw new Error('JWT_SECRET_KEY is not defined');
  }
};

// Admin authentication middleware
const adminAuth = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    logger.debug('Processing adminAuth middleware');

    // Extract and validate authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new Error('Unauthorized: No token provided');
    }

    const token = authHeader.replace('Bearer ', '');
    logger.debug('Extracted token', { token: token.substring(0, 10) + '...' });

    // Verify JWT token
    validateEnv();
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET_KEY!) as JwtPayload;
      logger.debug('Token verified successfully', { userId: decoded.id });
    } catch (error: any) {
      throw new Error('Unauthorized: Invalid token');
    }

    // Find user by ID
    const user = await userModel.findById(decoded.id);
    if (!user) {
      throw new Error('Unauthorized: User not found');
    }

    // Check if user is admin
    if (user.role !== 'admin') {
      throw new Error('Forbidden: Admin access required');
    }

    // Attach user to request
    req.authUser = user;
    logger.info('Admin authentication successful', { userId: user._id });

    next();
  } catch (error: any) {
    logger.error('Error in adminAuth middleware', { error: error.message });
    res.status(
      error.message.includes('Unauthorized') ? 401 :
      error.message.includes('Forbidden') ? 403 : 500
    ).json({
      success: false,
      message: error.message,
    });
  }
};

export default adminAuth;