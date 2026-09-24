import express, { Router } from 'express';
import { AuthController } from './auth.controller.js';
import { authMiddleware } from '../../middleware/auth.js';

export function createAuthRouter(authController: AuthController): Router {
  const router = express.Router();

  router.post('/register', authController.register);
  router.post('/login', authController.login);
  router.get('/profile', authMiddleware, authController.getProfile);
  router.delete('/me', authMiddleware, authController.deleteAccount);

  return router;
}
