import { Request, Response, NextFunction } from 'express';
import { validationResult, ValidationChain } from 'express-validator';

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
    // Run all validations
    await Promise.all(validations.map(validation => validation.run(req)));

    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    next();
  };
}; 