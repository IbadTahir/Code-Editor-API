import { Request, Response, NextFunction, RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import { appConfig } from '../config/appConfig';
import { AppError } from './errorHandler';

export interface UserPayload {
  userId: string;
  role: 'student' | 'instructor' | 'librarian' | 'admin';
  email: string;
}

export interface AuthRequest extends Request {
  user: UserPayload;
}

export const auth: RequestHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      throw new AppError(401, 'Authentication required', 'AUTH_REQUIRED');
    }    try {
      const decoded = jwt.verify(token, appConfig.jwtSecret) as UserPayload;
      (req as AuthRequest).user = decoded;
      next();
    } catch (err) {
      if (err instanceof jwt.TokenExpiredError) {
        throw new AppError(401, 'Token expired', 'TOKEN_EXPIRED');
      } else {
        throw new AppError(401, 'Invalid token', 'INVALID_TOKEN');
      }
    }
  } catch (error) {
    next(error);
  }
};

export const authorize = (...roles: string[]): RequestHandler => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const authReq = req as AuthRequest;
    if (!authReq.user || !roles.includes(authReq.user.role)) {
      next(new AppError(403, 'Not authorized to access this resource', 'FORBIDDEN', [{
        requiredRoles: roles,
        userRole: authReq.user?.role
      }]));
      return;
    }
    next();
  };
};
