import { Request, Response, NextFunction, ErrorRequestHandler } from 'express';
import { ValidationError } from 'express-validator';
import { JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken';
import { QueryFailedError } from 'typeorm';

interface ValidationErrorWithArray extends Error {
  errors?: Array<{
    type: string;
    value: any;
    msg: string;
    path: string;
    location: string;
  }>;
}

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code?: string;
  public readonly errors?: any[];

  constructor(statusCode: number, message: string, code?: string, errors?: any[]) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.errors = errors;
    Error.captureStackTrace(this, this.constructor);
  }
}

export const errorHandler: ErrorRequestHandler = (
  error: unknown,
  _req: Request,
  res: Response,
  next: NextFunction
) => {
  // Handle AppError instances
  if (error instanceof AppError) {
    res.status(error.statusCode).json({
      error: error.message,
      code: error.code,
      ...(error.errors && { errors: error.errors })
    });
    return;
  }

  // Handle express-validator ValidationError
  if (error instanceof Error) {
    if ('errors' in error && Array.isArray((error as ValidationErrorWithArray).errors)) {
      const validationError = error as ValidationErrorWithArray;
      res.status(400).json({
        error: 'Validation Error',
        code: 'VALIDATION_ERROR',
        errors: validationError.errors
      });
      return;
    }

    // Handle JWT errors
    if (error instanceof JsonWebTokenError) {
      res.status(401).json({
        error: 'Invalid token',
        code: 'INVALID_TOKEN'
      });
      return;
    }

    if (error instanceof TokenExpiredError) {
      res.status(401).json({
        error: 'Token expired',
        code: 'TOKEN_EXPIRED'
      });
      return;
    }

    // Handle TypeORM unique constraint errors
    if (error instanceof QueryFailedError && (error as any).driverError.code === 'SQLITE_CONSTRAINT') {
      res.status(409).json({
        error: 'Duplicate resource',
        code: 'DUPLICATE_ERROR'
      });
      return;
    }

    // Log unknown errors
    console.error('Unhandled error:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    });
  } else {
    // Log non-Error objects
    console.error('Unknown error object:', error);
  }

  // Send generic error for everything else
  res.status(500).json({
    error: 'Internal Server Error',
    code: 'INTERNAL_ERROR'
  });
};
