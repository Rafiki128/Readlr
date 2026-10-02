import express, { Router } from 'express';
import { AuthController } from './auth.controller.js';
import { authMiddleware } from '../../middleware/auth.js';
import { requestRecovery, recoveryStatus, completeRecovery, recoveryLimit } from './recovery.controller.js';

export function createAuthRouter(authController: AuthController): Router {
  const router = express.Router();

  router.post('/register', authController.register);
  router.post('/login', authController.login);
  router.post('/recovery/request', recoveryLimit, requestRecovery);
  router.post('/recovery/status', recoveryLimit, recoveryStatus);
  router.post('/recovery/complete', recoveryLimit, completeRecovery);
  router.get('/profile', authMiddleware, authController.getProfile);
  router.delete('/me', authMiddleware, authController.deleteAccount);

  return router;
}
