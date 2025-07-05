import { Router, Request, Response, NextFunction, RequestHandler } from 'express';
import { check } from 'express-validator';
import { auth, authorize } from '../middleware/auth';
// import { apiLimiter } from '../middleware/rateLimiter'; // Disabled for easier testing
import {
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  updateUserRole
} from '../controllers/userController';
import { AppError } from '../middleware/errorHandler';

const router = Router();

// Apply rate limiting
// router.use(apiLimiter); // Disabled for easier testing

// Wrapper to handle async route handlers
const asyncHandler = (fn: RequestHandler): RequestHandler => (
  req: Request,
  res: Response,
  next: NextFunction
) => Promise.resolve(fn(req, res, next)).catch(next);

// Routes with proper error handling and validation
router.get('/', [auth, authorize('admin')], asyncHandler(getAllUsers));

router.get('/:id', [
  auth,
  authorize('admin'),
  check('id').isUUID().withMessage('Invalid user ID')
], asyncHandler(getUserById));

router.put('/:id', [
  auth,
  authorize('admin'),
  check('id').isUUID().withMessage('Invalid user ID'),
  check('name', 'Name is required').optional().trim().notEmpty(),
  check('email', 'Please include a valid email').optional().trim().isEmail().normalizeEmail(),
], asyncHandler(updateUser));

router.patch('/:id/role', [
  auth,
  authorize('admin'),
  check('id').isUUID().withMessage('Invalid user ID'),
  check('role', 'Invalid role')
    .isIn(['student', 'instructor', 'librarian', 'admin'])
    .withMessage('Invalid role. Must be one of: student, instructor, librarian, admin')
], asyncHandler(updateUserRole));

router.delete('/:id', [
  auth,
  authorize('admin'),
  check('id').isUUID().withMessage('Invalid user ID')
], asyncHandler(deleteUser));

export default router;
