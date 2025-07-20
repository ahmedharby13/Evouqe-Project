import csrf from 'csurf';
import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';

// Initialize CSRF middleware with secure cookie options
export const csrfProtection = csrf({
  cookie: {
    httpOnly: true, // Prevent client-side access to the cookie
    secure: process.env.NODE_ENV === 'production', // Use secure cookies in production
    sameSite: 'strict', // Prevent cross-site requests
  },
});

// Generate CSRF token
export const generateCsrfToken = (req: Request, res: Response): void => {
  try {
    logger.debug('Processing generateCsrfToken');

    // Check if CSRF token generation is available
    if (!req.csrfToken) {
      throw new Error('CSRF token generation not available');
    }

    // Generate CSRF token
    const token = req.csrfToken();
    logger.info('CSRF token generated successfully');

    // Send response with CSRF token
    res.json({ success: true, csrfToken: token });
  } catch (error: any) {
    logger.error('Error in generateCsrfToken', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to generate CSRF token',
    });
  }
};