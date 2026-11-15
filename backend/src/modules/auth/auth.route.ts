import express, { Router } from 'express';
import { AuthController } from './auth.controller.js';
import { authMiddleware } from '../../middleware/auth.js';
import { createLimiter } from '../../middleware/rateLimit.js';

// Generous per-IP limits because a classroom often shares one public IP.
export const loginLimit = createLimiter(60, 60_000);
export const registerLimit = createLimiter(10, 10 * 60_000, 'Too many sign-ups from this network. Please wait 10 minutes.');
export const resetLimit = createLimiter(5, 15 * 60_000, 'Too many password reset requests. Please try again later.');

export function createAuthRouter(authController: AuthController): Router {
  const router = express.Router();

  // Standard Auth
  router.post('/register', registerLimit.middleware, authController.register);
  router.post('/login', loginLimit.middleware, authController.login);
  
  // Google OAuth Auth
  router.get('/google', authController.googleAuthTrigger);
  router.get('/google/callback', authController.googleAuthCallback);

  // Facebook OAuth Auth
  router.get('/facebook', authController.facebookAuthTrigger);
  router.get('/facebook/callback', authController.facebookAuthCallback);

  // Direct Password Reset
  router.post('/reset-password', resetLimit.middleware, authController.requestPasswordReset);
  
  // Confirm Password Reset (Receives token & new password from frontend)
  router.post('/reset-password/confirm', resetLimit.middleware, authController.resetPasswordConfirm);
  
  // Profile & Account Management
  router.get('/profile', authMiddleware, authController.getProfile);
  router.delete('/me', authMiddleware, authController.deleteAccount);

  return router;
}