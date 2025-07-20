import express from 'express';
import { userLogin, registerUser, getUserProfile, logout, refreshToken, forgotPassword, updatePassword, getAllUsers, createAdmin, deleteUser , resetPassword} from '../controllers/userController';
import { verifyEmail } from '../controllers/verifyEmail';
import userAuth from '../middleware/userAuth';
import adminAuth from '../middleware/adminAuth';
import verifyEmailMiddleware from '../middleware/verifyEmail';
import { loginLimiter, passwordResetLimiter, registerLimiter } from '../middleware/rateLimiter';
import { registerValidation, loginValidation, refreshTokenValidation } from '../validations/userValidation';
import { RequestHandler } from 'express';

const userRouter = express.Router();


const typedRegisterUser: RequestHandler = registerUser as RequestHandler;
const typedUserLogin: RequestHandler = userLogin as RequestHandler;
const typedAdminLogin: RequestHandler = userLogin as RequestHandler;
const typedVerifyEmail: RequestHandler = verifyEmail as RequestHandler;
const typedGetUserProfile: RequestHandler = getUserProfile as unknown as RequestHandler;
const typedLogout: RequestHandler = logout as RequestHandler;
const typedRefreshToken: RequestHandler = refreshToken as RequestHandler;
const typedForgotPassword: RequestHandler = forgotPassword as RequestHandler;
const typedUpdatePassword: RequestHandler = updatePassword as unknown as RequestHandler;
const typedGetAllUsers: RequestHandler = getAllUsers as RequestHandler;
const typedCreateAdmin: RequestHandler = createAdmin as unknown as RequestHandler;
const typedDeleteUser: RequestHandler = deleteUser as unknown as RequestHandler;
const typedResetPassword: RequestHandler = resetPassword as RequestHandler;


userRouter.post('/register', registerLimiter, registerValidation, typedRegisterUser);
userRouter.post('/login', loginLimiter, loginValidation, typedUserLogin);
userRouter.post('/admin', loginLimiter, loginValidation, typedAdminLogin);
userRouter.get('/verify-email', typedVerifyEmail);
userRouter.post('/profile', userAuth, verifyEmailMiddleware, typedGetUserProfile);
userRouter.post('/logout', typedLogout);
userRouter.post('/refresh-token', refreshTokenValidation, typedRefreshToken);
userRouter.post('/forgot-password', passwordResetLimiter, typedForgotPassword);
userRouter.post('/update-password', passwordResetLimiter, userAuth, verifyEmailMiddleware, typedUpdatePassword);
userRouter.get('/users', adminAuth, typedGetAllUsers);
userRouter.post('/create-admin', adminAuth, registerValidation, typedCreateAdmin);
userRouter.delete('/delete-user', adminAuth, typedDeleteUser);
userRouter.post('/reset-password', passwordResetLimiter, typedResetPassword); 

export default userRouter;