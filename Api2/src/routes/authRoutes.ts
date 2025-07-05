import { Router, Request, Response, NextFunction, RequestHandler } from 'express';
import { check } from 'express-validator';
import { auth } from '../middleware/auth';
// import { authLimiter, createAccountLimiter } from '../middleware/rateLimiter'; // Disabled for easier testing
import { 
  register, 
  login, 
  getCurrentUser, 
  logout,
  refreshToken,
  requestPasswordReset,
  resetPassword,
  verifyEmail
} from '../controllers/authController';

// Wrapper to handle async route handlers
const asyncHandler = (fn: any): RequestHandler => (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  return Promise.resolve(fn(req, res, next)).catch(next);
};

const router = Router();

// Rate limit authentication routes
// router.use(authLimiter); // Disabled for easier testing

// Register user with stricter validation
router.post(
  '/register',
  // createAccountLimiter, // Disabled for easier testing
  [
    check('name', 'Name is required').trim().notEmpty(),
    check('email', 'Please include a valid email').trim().isEmail().normalizeEmail(),
    check('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters long')
      .matches(/[A-Z]/)
      .withMessage('Password must contain at least one uppercase letter')
      .matches(/[0-9]/)
      .withMessage('Password must contain at least one number')
      .matches(/[!@#$%^&*]/)
      .withMessage('Password must contain at least one special character'),
    check('role')
      .optional()
      .isIn(['student', 'instructor', 'librarian', 'admin'])
      .withMessage('Invalid role')
  ],  asyncHandler(register)
);

// Login with email verification check
router.post(
  '/login',
  [
    check('email', 'Please include a valid email').isEmail(),
    check('password', 'Password is required').exists()
  ],
  asyncHandler(login)
);

// Protected routes
router.get('/me', auth, asyncHandler(getCurrentUser));
router.post('/logout', auth, asyncHandler(logout));
router.post('/refresh-token', asyncHandler(refreshToken));

// Email verification
router.get('/verify-email/:token', asyncHandler(verifyEmail));

// Password reset
router.post(
  '/request-reset',
  [check('email', 'Please include a valid email').isEmail()],
  asyncHandler(requestPasswordReset)
);

router.post(
  '/reset-password',
  [
    check('token', 'Reset token is required').trim().notEmpty(),
    check('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters long')
      .matches(/[A-Z]/)
      .withMessage('Password must contain at least one uppercase letter')
      .matches(/[0-9]/)
      .withMessage('Password must contain at least one number')
      .matches(/[!@#$%^&*]/)
      .withMessage('Password must contain at least one special character'),
  ],
  asyncHandler(resetPassword)
);

export default router;
