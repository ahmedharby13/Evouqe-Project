import { Request, Response, NextFunction } from "express";
import userModel from "../models/userModel";
import { AuthRequest } from "./userAuth";

// Middleware to verify user's email
const verifyEmailMiddleware = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Check if authenticated user exists
    if (!req.authUser) {
      res.status(401).json({ success: false, message: "Unauthorized: User not found" });
      return;
    }

    // Fetch user from database
    const user = await userModel.findById(req.authUser._id);
    if (!user) {
      res.status(404).json({ success: false, message: "User not found" });
      return;
    }

    // Verify email status
    if (!user.isVerified) {
      res.status(403).json({ success: false, message: "Please verify your email before proceeding" });
      return;
    }

    next();
  } catch (error: any) {
    res.status(500).json({ success: false, message: `Server error: ${error.message}` });
  }
};

export default verifyEmailMiddleware;