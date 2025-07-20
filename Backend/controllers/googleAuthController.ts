import { Request, Response } from 'express';
import userModel, { User } from '../models/userModel';
import { createAccessToken, createRefreshToken } from './userController';
import logger from '../utils/logger';

// Handle Google OAuth callback
export const googleAuthCallback = async (req: Request, res: Response): Promise<void> => {
  try {
    // Ensure user exists from OAuth middleware
    const user = req.user as User | undefined;
    if (!user || !user._id) {
      throw new Error('User not authenticated');
    }

    // Ensure FRONTEND_URL is defined
    if (!process.env.FRONTEND_URL) {
      throw new Error('FRONTEND_URL is not defined');
    }

    // Generate access and refresh tokens
    const accessToken = createAccessToken(user._id.toString());
    const refreshToken = createRefreshToken(user._id.toString());

    // Update user with refresh token
    await userModel.findByIdAndUpdate(user._id, { refreshToken });
    logger.info(`Google OAuth login successful for ${user.email}`);

    // Redirect to frontend with tokens
    res.redirect(
      `${process.env.FRONTEND_URL}/success?accessToken=${accessToken}&refreshToken=${refreshToken}&userId=${user._id.toString()}`
    );
  } catch (error: any) {
    logger.error('Google auth callback error', { error: error.message });
    const redirectUrl = process.env.FRONTEND_URL ? `${process.env.FRONTEND_URL}/error` : '/error';
    res.redirect(redirectUrl);
  }
};