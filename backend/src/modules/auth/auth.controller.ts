import { Request, Response } from 'express';
import { AuthService } from './auth.service.js';
import { LoginRequest, RegisterRequest, AuthResponse } from './auth.types.js';

export class AuthController {
  private authService: AuthService;

  constructor(authService: AuthService) {
    this.authService = authService;
  }

  register = async (req: Request, res: Response): Promise<void> => {
    try {
      const { email, password, confirmPassword, role, name }: RegisterRequest = req.body;

      // Validation
      if (!email || !password || !confirmPassword || !role || !name) {
        res.status(400).json({ success: false, message: 'Missing required fields' });
        return;
      }

      if (password !== confirmPassword) {
        res.status(400).json({ success: false, message: 'Passwords do not match' });
        return;
      }

      if (password.length < 6) {
        res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
        return;
      }

      // Public registration can create learner accounts only. Staff roles are
      // assigned by an administrator directly in the database.
      if (role !== 'learner') {
        res.status(403).json({ success: false, message: 'Staff accounts are invitation-only' });
        return;
      }

      // Register user
      const user = await this.authService.register(email, password, role as 'learner' | 'teacher', name);

      // Generate token
      const token = this.authService.generateToken(user.id, user.email, user.role);

      const response: AuthResponse = {
        success: true,
        message: 'Registration successful',
        token,
        user: {
          id: user.id,
          email: user.email,
          role: user.role as 'learner' | 'teacher',
          name: user.name,
        },
      };

      res.status(201).json(response);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Registration failed';
      res.status(400).json({ success: false, message });
    }
  };

  login = async (req: Request, res: Response): Promise<void> => {
    try {
      const { email, password }: LoginRequest = req.body;

      // Validation
      if (!email || !password) {
        res.status(400).json({ success: false, message: 'Email and password are required' });
        return;
      }

      // Login user
      const user = await this.authService.login(email, password);

      // Generate token
      const token = this.authService.generateToken(user.id, user.email, user.role);

      const response: AuthResponse = {
        success: true,
        message: 'Login successful',
        token,
        user: {
          id: user.id,
          email: user.email,
          role: user.role as 'learner' | 'teacher',
          name: user.name,
        },
      };

      res.json(response);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Login failed';
      res.status(401).json({ success: false, message });
    }
  };

  getProfile = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as any).userId;

      if (!userId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const user = await this.authService.getUserById(userId);

      if (!user) {
        res.status(404).json({ success: false, message: 'User not found' });
        return;
      }

      res.json({
        success: true,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          name: user.name,
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to get profile';
      res.status(500).json({ success: false, message });
    }
  };
}
