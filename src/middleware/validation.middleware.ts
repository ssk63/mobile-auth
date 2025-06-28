import { Request, Response, NextFunction } from 'express';
import { validationResult, ValidationChain, body } from 'express-validator';
import { createError } from '../utils/error';

/**
 * Creates a validation middleware using express-validator chains
 * @param {ValidationChain[]} validations - Array of express-validator validation chains
 * @returns {(req: Request, res: Response, next: NextFunction) => Promise<void | Response>} Express middleware function
 * 
 * @example
 * // Usage in routes
 * router.post('/user',
 *   validate([
 *     body('email').isEmail(),
 *     body('password').isLength({ min: 6 })
 *   ]),
 *   userController.create
 * );
 */
export const validate = (validations: ValidationChain[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Run all validations
      await Promise.all(validations.map(validation => validation.run(req)));

      // Check for validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw createError.badRequest(
          'Validation failed',
          'VALIDATION_ERROR'
        );
      }

      next();
    } catch (error) {
      // Pass error to global error handler
      next(error);
    }
  };
};

export const emailVerificationRules = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
];

export const verifyCodeRules = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  body('code')
    .isLength({ min: 6, max: 6 })
    .isNumeric()
    .withMessage('Please provide a valid 6-digit verification code'),
]; 