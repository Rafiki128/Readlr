import express, { Router } from 'express';
import { AuthController } from './auth.controller.js';
import { authMiddleware } from '../../middleware/auth.js';
import { requestRecovery, recoveryStatus, completeRecovery, recoveryLimit } from './recovery.controller.js';
import { createLimiter } from '../../middleware/rateLimit.js';

// Generous per-IP limits because a classroom often shares one public IP.
export const loginLimit = createLimiter(60, 60_000);
export const registerLimit = createLimiter(10, 10 * 60_000, 'Too many sign-ups from this network. Please wait 10 minutes.');

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

  // Recovery
  router.post('/recovery/request', recoveryLimit, requestRecovery);
  router.post('/recovery/status', recoveryLimit, recoveryStatus);
  router.post('/recovery/complete', recoveryLimit, completeRecovery);
  
  // Profile & Account Management
  router.get('/profile', authMiddleware, authController.getProfile);
  router.delete('/me', authMiddleware, authController.deleteAccount);

  return router;
}