import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import userModel, { User } from '../models/userModel';
import { createAccessToken, createRefreshToken } from './userController';
import logger from '../utils/logger';

// Helper function to validate environment variables
const validateEnv = (): void => {
  if (!process.env.JWT_SECRET_KEY) {
    throw new Error('JWT_SECRET_KEY is not defined');
  }
};

// Verify email using JWT token
export const verifyEmail = async (req: Request, res: Response): Promise<void> => {
  try {
    const { token } = req.query;
    logger.debug('Processing verifyEmail', { token: token ? 'provided' : 'missing' });

    // Validate token
    if (!token || typeof token !== 'string') {
      throw new Error('Verification token is required');
    }

    // Verify JWT token
    validateEnv();
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET_KEY!) as { email: string };
    } catch (error: any) {
      throw new Error('Invalid or expired verification token');
    }

    // Find user by email
    const user: User | null = await userModel.findOne({ email: decoded.email });
    if (!user) {
      throw new Error('User not found or token invalid');
    }

    // Update user verification status
    await userModel.findByIdAndUpdate(user._id, { isVerified: true, verificationToken: null });

    // Generate tokens
    const accessToken = createAccessToken(user._id.toString());
    const refreshToken = createRefreshToken(user._id.toString());

    // Update refresh token
    await userModel.findByIdAndUpdate(user._id, { refreshToken });
    logger.info(`Email verified successfully for ${decoded.email}`);

    // Send response
    res.json({
      success: true,
      message: 'Email verified successfully',
      accessToken,
      refreshToken,
    });
  } catch (error: any) {
    logger.error('Error in verifyEmail', { error: error.message });
    res.status(
      error.message.includes('required') || error.message.includes('not found')
        ? 400
        : error.message.includes('Invalid') || error.message.includes('expired')
        ? 401
        : 500
    ).json({
      success: false,
      message: error.message,
    });
  }
};