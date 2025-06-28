import { Response } from 'express';

/**
 * Custom application error class for operational errors
 * @class AppError
 * @extends Error
 */
export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public code?: string,
    public isOperational = true
  ) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Error response interface
 */
interface ErrorResponse {
  status: 'error';
  message: string;
  code?: string;
  stack?: string;
}

/**
 * Global error handler
 * @param {Error} error - Error object
 * @param {Response} res - Express response object
 * @returns {Response} Error response
 */
export const handleError = (error: Error, res: Response) => {
  // Development vs Production error response
  const isDevelopment = process.env.NODE_ENV === 'development';

  if (error instanceof AppError && error.isOperational) {
    const errorResponse: ErrorResponse = {
      status: 'error',
      message: error.message,
    };

    if (error.code) {
      errorResponse.code = error.code;
    }

    // Include stack trace in development
    if (isDevelopment) {
      errorResponse.stack = error.stack;
    }

    return res.status(error.statusCode).json(errorResponse);
  }
  
  // Programming or unknown errors
  console.error('ERROR 💥', error);

  const errorResponse: ErrorResponse = {
    status: 'error',
    message: isDevelopment ? error.message : 'Something went wrong!',
  };

  // Include stack trace in development
  if (isDevelopment) {
    errorResponse.stack = error.stack;
  }

  return res.status(500).json(errorResponse);
};

/**
 * Common error factory methods
 */
export const createError = {
  badRequest: (message: string, code?: string) => 
    new AppError(400, message, code),
  
  unauthorized: (message: string, code?: string) => 
    new AppError(401, message, code),
  
  forbidden: (message: string, code?: string) => 
    new AppError(403, message, code),
  
  notFound: (message: string, code?: string) => 
    new AppError(404, message, code),
  
  conflict: (message: string, code?: string) => 
    new AppError(409, message, code),
  
  tooMany: (message: string, code?: string) => 
    new AppError(429, message, code),
  
  internal: (message: string, code?: string) => 
    new AppError(500, message, code),
}; 