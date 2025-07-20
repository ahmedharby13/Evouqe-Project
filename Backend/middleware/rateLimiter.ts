import rateLimit from "express-rate-limit";

// Rate limiter for login endpoints
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 16, // Max 16 requests per IP
  message: { success: false, message: "Too many login attempts, please try again later" },
});

// Rate limiter for registration endpoints
export const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 16, // Max 16 requests per IP
  message: { success: false, message: "Too many registration attempts, please try again later" },
});

// Rate limiter for password reset endpoints
export const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 16, // Max 16 requests per IP
  message: { success: false, message: "Too many password reset attempts, please try again later" },
});