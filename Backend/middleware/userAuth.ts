import jwt from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";
import userModel, { User } from "../models/userModel";

// Extend Request interface to include authUser
interface JwtPayload {
  id: string;
}

export interface AuthRequest extends Request {
  authUser?: User;
}

// Middleware to authenticate JWT token
const userAuth = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Check for authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({ success: false, message: "Unauthorized: No token provided" });
      return;
    }

    // Extract and verify token
    const token = authHeader.replace("Bearer ", "");
    let decoded: JwtPayload;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET_KEY!) as JwtPayload;
    } catch (error: any) {
      res.status(401).json({ success: false, message: "Unauthorized: Invalid token" });
      return;
    }

    // Fetch user from database
    const user = await userModel.findById(decoded.id);
    if (!user) {
      res.status(401).json({ success: false, message: "Unauthorized: User not found" });
      return;
    }

    // Attach user to request object
    req.authUser = user;
    next();
  } catch (error: any) {
    res.status(401).json({ success: false, message: `Unauthorized: Invalid token - ${error.message}` });
  }
};

export default userAuth;