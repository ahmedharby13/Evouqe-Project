import dotenv from 'dotenv';
import { Request, Response } from 'express';
import { Secret, SignOptions } from 'jsonwebtoken';
import userModel, { User } from '../models/userModel';
import validator from 'validator';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import zxcvbn from 'zxcvbn';
import logger from '../utils/logger';
import { sendVerificationEmail } from '../utils/nodemailer';
import mongoose from 'mongoose';

dotenv.config();

// Interfaces
interface LoginRequestBody {
  email: string;
  password: string;
}

interface RegisterRequestBody {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

interface AuthRequest extends Request {
  authUser?: { _id: string; email: string; role: string };
}

// Helper function to validate environment variables
const validateEnv = () => {
  if (!process.env.JWT_SECRET_KEY || !process.env.JWT_REFRESH_SECRET_KEY) {
    throw new Error('JWT_SECRET_KEY or JWT_REFRESH_SECRET_KEY is not defined');
  }
};

// Helper function to validate login inputs
const validateLoginInputs = (email: string, password: string): void => {
  if (!email || !password) {
    throw new Error('Email and password are required');
  }
  if (!validator.isEmail(email)) {
    throw new Error('Invalid email format');
  }
};

// Helper function to validate registration inputs
const validateRegisterInputs = ({ name, email, password, confirmPassword }: RegisterRequestBody): void => {
  if (!name || !email || !password || !confirmPassword) {
    throw new Error('All fields are required');
  }
  if (password !== confirmPassword) {
    throw new Error('Passwords do not match');
  }
  if (!validator.isEmail(email)) {
    throw new Error('Invalid email format');
  }
  const passwordStrength = zxcvbn(password);
  if (passwordStrength.score < 3) {
    throw new Error('Password is too weak. It must include uppercase, lowercase, numbers, and special characters.');
  }
};

// Create JWT access token
export const createAccessToken = (id: string): string => {
  validateEnv();
  const secret: Secret = process.env.JWT_SECRET_KEY!;
  const expiresIn = (process.env.JWT_ACCESS_EXPIRES_IN ?? '12h') as SignOptions['expiresIn'];
  return jwt.sign({ id }, secret, { expiresIn });
};

// Create JWT refresh token
export const createRefreshToken = (id: string): string => {
  validateEnv();
  const secret: Secret = process.env.JWT_REFRESH_SECRET_KEY!;
  const expiresIn = (process.env.JWT_REFRESH_EXPIRES_IN ?? '7d') as SignOptions['expiresIn'];
  return jwt.sign({ id }, secret, { expiresIn });
};

// User login
export const userLogin = async (req: Request<{}, {}, LoginRequestBody>, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;
    logger.debug('Processing userLogin', { email });

    // Validate inputs
    validateLoginInputs(email, password);

    // Find user
    const user: User | null = await userModel.findOne({ email });
    if (!user) {
      throw new Error('User with this email does not exist');
    }

    // Check verification status
    if (!user.isVerified) {
      throw new Error('Please verify your email before logging in');
    }

    // Check if Google OAuth-only
    if (user.googleId && !user.password) {
      throw new Error('This account uses Google OAuth. Please log in with Google.');
    }

    // Verify password
    const isMatch = await bcrypt.compare(password, user.password || '');
    if (!isMatch) {
      throw new Error('Invalid password');
    }

    // Generate tokens
    const accessToken = createAccessToken(user._id.toString());
    const refreshToken = createRefreshToken(user._id.toString());

    // Update refresh token
    await userModel.findByIdAndUpdate(user._id, { refreshToken });
    logger.info(`User ${email} logged in successfully`);

    res.json({
      success: true,
      message: 'User logged in successfully',
      userId: user._id.toString(),
      accessToken,
      refreshToken,
    });
  } catch (error: any) {
    logger.error('Error in userLogin', { error: error.message });
    res.status(error.message.includes('Invalid') || error.message.includes('not exist') ? 400 : 403).json({
      success: false,
      message: error.message,
    });
  }
};

// Register a new user
export const registerUser = async (req: Request<{}, {}, RegisterRequestBody>, res: Response): Promise<void> => {
  try {
    const { name, email, password, confirmPassword } = req.body;
    logger.debug('Processing registerUser', { email });

    // Validate inputs
    validateRegisterInputs({ name, email, password, confirmPassword });

    // Check if user exists
    const exists: User | null = await userModel.findOne({ email });
    if (exists) {
      throw new Error('User with this email already exists');
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create verification token
    validateEnv();
    const verificationToken = jwt.sign({ email }, process.env.JWT_SECRET_KEY!, { expiresIn: '24h' });

    // Create user
    const newUser = new userModel({ name, email, password: hashedPassword });
    const user = await newUser.save();

    // Send verification email
    try {
      await sendVerificationEmail(email, verificationToken);
      logger.info(`User ${email} registered successfully, verification email sent`);
      res.status(201).json({
        success: true,
        message: 'User registered successfully. Please check your email to verify your account.',
      });
    } catch (emailError: any) {
      await userModel.findByIdAndDelete(user._id);
      logger.error(`Failed to send verification email to ${email}`, { error: emailError.message });
      throw new Error('Failed to send verification email. Please try registering again.');
    }
  } catch (error: any) {
    logger.error('Error in registerUser', { error: error.message });
    res.status(error.message.includes('Invalid') || error.message.includes('exists') || error.message.includes('weak') ? 400 : 500).json({
      success: false,
      message: error.message,
    });
  }
};

// Admin login
export const adminLogin = async (req: Request<{}, {}, LoginRequestBody>, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;
    logger.debug('Processing adminLogin', { email });

    // Validate inputs
    validateLoginInputs(email, password);

    // Find admin
    const user: User | null = await userModel.findOne({ email, role: 'admin' });
    if (!user) {
      throw new Error('Unauthorized: Admin access required');
    }

    // Check verification status
    if (!user.isVerified) {
      throw new Error('Please verify your email before logging in');
    }

    // Verify password
    const isMatch = await bcrypt.compare(password, user.password || '');
    if (!isMatch) {
      throw new Error('Invalid password');
    }

    // Generate tokens
    const accessToken = createAccessToken(user._id.toString());
    const refreshToken = createRefreshToken(user._id.toString());

    // Update refresh token
    await userModel.findByIdAndUpdate(user._id, { refreshToken });
    logger.info(`Admin ${email} logged in successfully`);

    res.json({
      success: true,
      message: 'Admin logged in successfully',
      accessToken,
      refreshToken,
    });
  } catch (error: any) {
    logger.error('Error in adminLogin', { error: error.message });
    res.status(error.message.includes('Invalid') || error.message.includes('Unauthorized') ? 401 : 403).json({
      success: false,
      message: error.message,
    });
  }
};

// Get user profile
export const getUserProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    logger.debug('Processing getUserProfile', { userId: req.authUser?._id });

    // Validate auth user
    if (!req.authUser || !req.authUser._id) {
      throw new Error('Unauthorized: User ID not found');
    }

    // Fetch user
    const user = await userModel
      .findById(req.authUser._id)
      .select('-password -refreshToken -verificationToken');
    if (!user) {
      throw new Error('User not found');
    }

    logger.info(`Profile fetched successfully for user ${user.email}`);
    res.json({ success: true, user });
  } catch (error: any) {
    logger.error('Error in getUserProfile', { error: error.message });
    res.status(error.message.includes('Unauthorized') ? 401 : 404).json({
      success: false,
      message: error.message,
    });
  }
};

// Logout user
export const logout = async (req: Request<{}, {}, { refreshToken?: string }>, res: Response): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const accessToken = authHeader && authHeader.startsWith('Bearer ') ? authHeader.replace('Bearer ', '') : null;
    const providedRefreshToken = req.body.refreshToken || null;
    logger.debug('Processing logout', { hasAccessToken: !!accessToken, hasRefreshToken: !!providedRefreshToken });

    let userId: string | null = null;

    // Validate access token
    if (accessToken) {
      try {
        validateEnv();
        const decoded = jwt.verify(accessToken, process.env.JWT_SECRET_KEY!) as { id: string };
        userId = decoded.id;
      } catch (error) {}
    }

    // Validate refresh token
    if (!userId && providedRefreshToken) {
      try {
        validateEnv();
        const decoded = jwt.verify(providedRefreshToken, process.env.JWT_REFRESH_SECRET_KEY!) as { id: string };
        userId = decoded.id;
      } catch (error) {
        throw new Error('Invalid refresh token');
      }
    }

    if (!userId) {
      throw new Error('Unauthorized: No valid token provided');
    }

    // Clear refresh token
    const user = await userModel.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    await userModel.findByIdAndUpdate(userId, { refreshToken: null });
    logger.info(`User ${user.email} logged out successfully`);

    res.json({
      success: true,
      message: 'User logged out successfully',
      action: 'clear_tokens',
    });
  } catch (error: any) {
    logger.error('Error in logout', { error: error.message });
    res.status(error.message.includes('Invalid') || error.message.includes('Unauthorized') ? 401 : 500).json({
      success: false,
      message: error.message,
    });
  }
};

// Refresh access token
export const refreshToken = async (req: Request<{}, {}, { refreshToken: string }>, res: Response): Promise<void> => {
  try {
    const { refreshToken } = req.body;
    logger.debug('Processing refreshToken');

    if (!refreshToken) {
      throw new Error('Refresh token required');
    }

    // Verify refresh token
    validateEnv();
    let decoded;
    try {
      decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET_KEY!) as { id: string };
    } catch (error: any) {
      throw new Error(error.name === 'TokenExpiredError' ? 'Refresh token has expired' : 'Invalid refresh token');
    }

    // Validate user and token
    const user = await userModel.findOne({ _id: decoded.id, refreshToken });
    if (!user) {
      throw new Error('Invalid or revoked refresh token');
    }

    // Generate new tokens
    const accessToken = createAccessToken(user._id.toString());
    const newRefreshToken = createRefreshToken(user._id.toString());

    // Update refresh token
    await userModel.findByIdAndUpdate(user._id, { refreshToken: newRefreshToken });
    logger.info(`Token refreshed successfully for user ${user.email}`);

    res.json({
      success: true,
      message: 'Token refreshed successfully',
      accessToken,
      refreshToken: newRefreshToken,
    });
  } catch (error: any) {
    logger.error('Error in refreshToken', { error: error.message });
    res.status(error.message.includes('Invalid') || error.message.includes('expired') ? 401 : 500).json({
      success: false,
      message: error.message,
    });
  }
};

// Forgot password
export const forgotPassword = async (req: Request<{}, {}, { email: string }>, res: Response): Promise<void> => {
  try {
    const { email } = req.body;
    logger.debug('Processing forgotPassword', { email });

    if (!email) {
      throw new Error('Email is required');
    }

    // Find user
    const user = await userModel.findOne({ email });
    if (!user) {
      throw new Error('User with this email does not exist');
    }

    // Check if Google OAuth-only
    if (user.googleId && !user.password) {
      throw new Error('This account uses Google OAuth. Please log in with Google.');
    }

    // Generate reset token
    validateEnv();
    const resetToken = jwt.sign({ email }, process.env.JWT_SECRET_KEY!, { expiresIn: '1h' });
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

    // Store reset token and expiry in the database
    const updatedUser = await userModel.findByIdAndUpdate(
      user._id,
      { resetPasswordToken: resetToken, resetPasswordExpires: expiresAt },
      { new: true }
    );
    if (!updatedUser) {
      logger.error(`Failed to store reset token for user ${email}`);
      throw new Error('Failed to store reset token');
    }
    logger.debug(`Token: ${resetToken} for user ${email}, expires at: ${expiresAt}`);

    // Send reset email
    try {
      await sendVerificationEmail(email, resetToken, 'reset-password');
      logger.info(`Password reset email sent to ${email}`);
      res.json({
        success: true,
        message: 'Password reset email sent. Check your inbox.',
      });
    } catch (emailError: any) {
      // Optional: Skip rollback to keep token for debugging
      logger.warn(`Failed to send email, token will remain stored for user ${email}`);
      throw new Error('Failed to send password reset email');
    }
  } catch (error: any) {
    logger.error('Error in forgotPassword', { error: error.message });
    res.status(error.message.includes('Invalid') || error.message.includes('not exist') ? 400 : 500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get all users
export const getAllUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    const { search = '', role, page = '1', limit = '10' } = req.query;
    logger.debug('Processing getAllUsers', { search, role, page, limit });

    // Build query
    const query: any = {};
    if (search) {
      query.$or = [
        { name: { $regex: String(search), $options: 'i' } },
        { email: { $regex: String(search), $options: 'i' } },
      ];
    }
    if (role && role !== 'all') {
      query.role = role;
    }

    // Validate pagination
    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    if (isNaN(pageNum) || pageNum < 1 || isNaN(limitNum) || limitNum < 1) {
      throw new Error('Invalid page or limit');
    }
    const skip = (pageNum - 1) * limitNum;

    // Fetch users
    const users = await userModel
      .find(query)
      .select('-password -refreshToken -verificationToken')
      .skip(skip)
      .limit(limitNum)
      .lean();
    const total = await userModel.countDocuments(query);

    logger.info('Fetched users', { userCount: users.length, total, page: pageNum });
    res.json({
      success: true,
      users,
      pagination: {
        total,
        page: pageNum,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error: any) {
    logger.error('Error in getAllUsers', { error: error.message });
    res.status(error.message.includes('Invalid') ? 400 : 500).json({
      success: false,
      message: 'Server error while fetching users',
    });
  }
};

// Create admin
export const createAdmin = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    logger.debug('Processing createAdmin', { adminEmail: req.authUser?.email });

    // Validate current user
    if (!req.authUser || !req.authUser._id) {
      throw new Error('Unauthorized');
    }
    const currentUser = await userModel.findById(req.authUser._id);
    if (!currentUser || currentUser.role !== 'admin') {
      throw new Error('Unauthorized: Admin access required');
    }

    const { name, email, password, confirmPassword } = req.body;

    // Validate inputs
    validateRegisterInputs({ name, email, password, confirmPassword });

    // Check if user exists
    const exists: User | null = await userModel.findOne({ email });
    if (exists) {
      throw new Error('User with this email already exists');
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create verification token
    validateEnv();
    const verificationToken = jwt.sign({ email }, process.env.JWT_SECRET_KEY!, { expiresIn: '24h' });

    // Create admin
    const newAdmin = new userModel({
      name,
      email,
      password: hashedPassword,
      role: 'admin',
      isVerified: false,
    });
    const admin = await newAdmin.save();

    // Send verification email
    try {
      await sendVerificationEmail(email, verificationToken);
      logger.info(`Admin ${email} created successfully, verification email sent`);
      res.status(201).json({
        success: true,
        message: 'Admin created successfully. Please check the email to verify the account.',
      });
    } catch (emailError: any) {
      await userModel.findByIdAndDelete(admin._id);
      logger.error(`Failed to send verification email to ${email}`, { error: emailError.message });
      throw new Error('Failed to send verification email. Please try creating the admin again.');
    }
  } catch (error: any) {
    logger.error('Error in createAdmin', { error: error.message });
    res.status(error.message.includes('Invalid') || error.message.includes('exists') || error.message.includes('weak') ? 400 : 500).json({
      success: false,
      message: error.message,
    });
  }
};

// Delete user
export const deleteUser = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    logger.debug('Processing deleteUser', { adminEmail: req.authUser?.email });

    // Validate current user
    if (!req.authUser || !req.authUser._id) {
      throw new Error('Unauthorized');
    }
    const currentUser = await userModel.findById(req.authUser._id);
    if (!currentUser || currentUser.role !== 'admin') {
      throw new Error('Unauthorized: Admin access required');
    }

    const { userId } = req.body;

    // Validate user ID
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      throw new Error('User ID is required and must be valid');
    }

    // Find user to delete
    const userToDelete = await userModel.findById(userId);
    if (!userToDelete) {
      throw new Error('User not found');
    }

    // Prevent self-deletion or admin deletion
    if (userToDelete._id.toString() === req.authUser._id.toString()) {
      throw new Error('Cannot delete your own account');
    }
    if (userToDelete.role === 'admin') {
      throw new Error('Cannot delete another admin account');
    }

    // Delete user
    await userModel.findByIdAndDelete(userId);
    logger.info(`User with ID ${userId} deleted successfully by ${req.authUser.email}`);

    res.json({
      success: true,
      message: 'User deleted successfully',
    });
  } catch (error: any) {
    logger.error('Error in deleteUser', { error: error.message });
    res.status(error.message.includes('Invalid') || error.message.includes('not found') || error.message.includes('Cannot') ? 400 : 500).json({
      success: false,
      message: error.message,
    });
  }
};

// Update password
export const updatePassword = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { oldPassword, newPassword, confirmNewPassword } = req.body;

    if (!req.authUser) {
      logger.warn("Update password failed: Unauthorized");
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    if (!oldPassword || !newPassword || !confirmNewPassword) {
      logger.warn("Update password failed: Missing fields");
      res.status(400).json({
        success: false,
        message:
          "Old password, new password, and confirm password are required",
      });
      return;
    }

    if (newPassword !== confirmNewPassword) {
      logger.warn("Update password failed: Passwords do not match");
      res
        .status(400)
        .json({ success: false, message: "New passwords do not match" });
      return;
    }

    const passwordStrength = zxcvbn(newPassword);
    if (passwordStrength.score < 3) {
      logger.warn("Update password failed: Weak password");
      res.status(400).json({
        success: false,
        message:
          "New password is too weak. It must include uppercase, lowercase, numbers, and special characters.",
      });
      return;
    }

    const user = await userModel.findById(req.authUser._id);
    if (!user) {
      logger.warn("Update password failed: User not found");
      res.status(404).json({ success: false, message: "User not found" });
      return;
    }

    if (!user.password) {
      logger.warn("Update password failed: No password set for user");
      res.status(400).json({
        success: false,
        message: "No password set. Use set-password to create a password.",
      });
      return;
    }

    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) {
      logger.warn("Update password failed: Invalid old password");
      res.status(401).json({ success: false, message: "Invalid old password" });
      return;
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    await userModel.findByIdAndUpdate(req.authUser._id, {
      password: hashedPassword,
    });

    logger.info(`Password updated successfully for user ${req.authUser.email}`);
    res.json({ success: true, message: "Password updated successfully" });
  } catch (error: any) {
    logger.error(`Update password error: ${error.message}`);
    res
      .status(500)
      .json({ success: false, message: "Server error during password update" });
  }
};

// Reset password
export const resetPassword = async (
  req: Request<
    {},
    {},
    { token: string; password: string; confirmPassword: string }
  >,
  res: Response
): Promise<void> => {
  try {
    const { token, password, confirmPassword } = req.body;

    if (!token || !password || !confirmPassword) {
      logger.warn("Reset password failed: Missing fields");
      res.status(400).json({
        success: false,
        message: "Token, password, and confirmPassword are required",
      });
      return;
    }

    if (password !== confirmPassword) {
      logger.warn("Reset password failed: Passwords do not match");
      res
        .status(400)
        .json({ success: false, message: "Passwords do not match" });
      return;
    }

    const passwordStrength = zxcvbn(password);
    if (passwordStrength.score < 3) {
      logger.warn("Reset password failed: Weak password");
      res.status(400).json({
        success: false,
        message:
          "Password is too weak. It must include uppercase, lowercase, numbers, and special characters.",
      });
      return;
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET_KEY!) as {
        email: string;
      };
    } catch (error: any) {
      logger.warn("Reset password failed: Invalid or expired token");
      res
        .status(401)
        .json({ success: false, message: "Invalid or expired reset token" });
      return;
    }

    const user = await userModel.findOne({
      email: decoded.email,
      resetPasswordToken: token,
    });
    if (!user) {
      logger.warn(
        `Reset password failed: User not found or token invalid for ${decoded.email}`
      );
      res
        .status(404)
        .json({ success: false, message: "User not found or token invalid" });
      return;
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    await userModel.findByIdAndUpdate(user._id, {
      password: hashedPassword,
      resetPasswordToken: null,
    });

    logger.info(`Password reset successfully for ${decoded.email}`);
    res.json({ success: true, message: "Password reset successfully" });
  } catch (error: any) {
    logger.error(`Reset password error: ${error.message}`);
    res
      .status(500)
      .json({ success: false, message: "Server error during password reset" });
  }
};;