import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import bcrypt from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';
import crypto from 'crypto';
import { UserService } from '../services/userService';
import { AppError } from '../middleware/errorHandler';
import { appConfig } from '../config/appConfig';
import { User } from '../entity/User';
import { AuthRequest } from '../interfaces/auth.interface';

// Helper function to get user ID
const getUserId = (user: User): string => {
  return user.id;
};

// Generate tokens
const generateTokens = (user: User): { accessToken: string; refreshToken: string } => {
  const accessToken = jwt.sign(
    { 
      userId: user.id, 
      role: user.role, 
      email: user.email 
    },
    appConfig.jwtSecret,
    { expiresIn: appConfig.security.tokenExpiresIn } as SignOptions
  );

  const refreshToken = jwt.sign(
    { userId: user.id },
    appConfig.jwtSecret,
    { expiresIn: appConfig.security.refreshTokenExpiresIn } as SignOptions
  );

  return { accessToken, refreshToken };
};

// Register a new user
export const register = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new AppError(400, 'Validation Error', 'VALIDATION_ERROR', errors.array());
    }

    const { name, email, password, role } = req.body;
    const userService = UserService.getInstance();

    // Check if user already exists
    let user = await userService.findByEmail(email, false);
    if (user) {
      throw new AppError(400, 'User already exists', 'USER_EXISTS');
    }

    // Create verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');

    // Create new user
    user = await userService.create({
      name,
      email,
      password,
      role: role || 'student',
      emailVerificationToken: verificationToken,
      emailVerified: false
    });

    const { accessToken, refreshToken } = generateTokens(user);

    // TODO: Send verification email

    res.status(201).json({
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        emailVerified: false
      }
    });
  } catch (error) {
    next(error);
  }
};

// Login user
export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;
    const userService = UserService.getInstance();

    // Find user
    const user = await userService.findByEmail(email, true);
    if (!user) {
      throw new AppError(401, 'Invalid credentials', 'INVALID_CREDENTIALS');
    }

    // Check if account is locked
    const now = new Date();
    if (user.lockUntil && user.lockUntil > now) {
      throw new AppError(423, 'Account is locked', 'ACCOUNT_LOCKED', [{
        lockUntil: user.lockUntil
      }]);
    }

    // Reset lock if it's expired
    if (user.lockUntil && user.lockUntil <= now) {
      user.loginAttempts = 0;
      user.lockUntil = undefined;
      await userService.saveUser(user);
    }

    // Verify password
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      // Increment login attempts
      user.loginAttempts = (user.loginAttempts || 0) + 1;
      
      // Lock account if max attempts exceeded
      if (user.loginAttempts >= appConfig.security.maxLoginAttempts) {
        user.lockUntil = new Date(Date.now() + appConfig.security.lockoutDuration);
      }
      
      await userService.saveUser(user);
      
      throw new AppError(401, 'Invalid credentials', 'INVALID_CREDENTIALS');
    }

    // Reset login attempts on successful login
    user.loginAttempts = 0;
    user.lockUntil = undefined;
    user.lastLogin = new Date();
    await userService.saveUser(user);

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user);

    res.json({
      accessToken,
      refreshToken,
      user: {
        id: getUserId(user),
        name: user.name,
        email: user.email,
        role: user.role,
        emailVerified: user.emailVerified
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get current user
export const getCurrentUser = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new AppError(401, 'Authentication required', 'AUTH_REQUIRED');
    }
    const userService = UserService.getInstance();
    const user = await userService.findById(req.user.userId);
    
    if (!user) {
      throw new AppError(404, 'User not found', 'USER_NOT_FOUND');
    }
    
    res.json(user);
  } catch (error) {
    next(error);
  }
};

// Refresh token
export const refreshToken = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      throw new AppError(400, 'Refresh token is required', 'REFRESH_TOKEN_REQUIRED');
    }

    const decoded = jwt.verify(refreshToken, appConfig.jwtSecret) as { userId: string };
    const userService = UserService.getInstance();
    const user = await userService.findById(decoded.userId);

    if (!user) {
      throw new AppError(404, 'User not found', 'USER_NOT_FOUND');
    }    if (!user.id || !user.role || !user.email) {
      throw new AppError(500, 'Invalid user data', 'INVALID_USER_DATA');
    }
    const tokens = generateTokens(user as User);
    res.json(tokens);
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      next(new AppError(401, 'Invalid refresh token', 'INVALID_REFRESH_TOKEN'));
    } else {
      next(error);
    }
  }
};

// Request password reset
export const requestPasswordReset = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email } = req.body;
    const userService = UserService.getInstance();
    
    const user = await userService.findByEmail(email);
    if (!user) {
      // Return success even if user not found to prevent email enumeration
      return res.json({ message: 'If an account exists, a reset link will be sent.' });
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 3600000); // 1 hour
    
    await userService.updateResetToken(user.id, token, expires);
    
    // TODO: Send reset email with token
    // For now, return token in response (only in development)
    if (process.env.NODE_ENV === 'development') {
      return res.json({ resetToken: token });
    }
    
    res.json({ message: 'If an account exists, a reset link will be sent.' });
  } catch (error) {
    next(error);
  }
};

// Reset password
export const resetPassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { token, password } = req.body;
    const userService = UserService.getInstance();
    
    const user = await userService.findByResetToken(token);
    if (!user) {
      throw new AppError(400, 'Invalid or expired reset token', 'INVALID_RESET_TOKEN');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await userService.resetPassword(user.id, hashedPassword);
    
    res.json({ message: 'Password successfully reset' });
  } catch (error) {
    next(error);
  }
};

// Verify email
export const verifyEmail = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { token } = req.params;
    const userService = UserService.getInstance();
    
    const user = await userService.findByVerificationToken(token);
    if (!user) {
      throw new AppError(400, 'Invalid verification token', 'INVALID_VERIFICATION_TOKEN');
    }

    await userService.verifyEmail(user.id);
    
    res.json({ message: 'Email successfully verified' });
  } catch (error) {
    next(error);
  }
};

// Logout (token invalidation handled on client side)
export const logout = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    next(error);
  }
};
