import rateLimit from 'express-rate-limit';
import { appConfig } from '../config/appConfig';
import { AppError } from './errorHandler';

// General API rate limiting
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

// More strict limiting for authentication endpoints
export const authLimiter = rateLimit({  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 login attempts per windowMs
  handler: (_req, _res, next) => {
    next(new AppError(429, 'Too many login attempts, please try again later.', 'RATE_LIMIT_EXCEEDED'));
  }
});

// Account creation limiter
export const createAccountLimiter = rateLimit({  windowMs: 60 * 60 * 1000, // 1 hour window
  max: 3, // start blocking after 3 requests
  handler: (_req, _res, next) => {
    next(new AppError(429, 'Too many accounts created from this IP, please try again later.', 'RATE_LIMIT_EXCEEDED'));
  }
});
