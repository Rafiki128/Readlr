import { Request, Response } from 'express';
import { OAuth2Client } from 'google-auth-library';
import { AuthService } from './auth.service.js';
import { LoginRequest, RegisterRequest, AuthResponse, FacebookTokenResponse, FacebookProfileResponse } from './auth.types.js';
import { registrationRole } from './adminInvitation.js';
import { createLimiter } from '../../middleware/rateLimit.js';
import { isStrongPassword, PASSWORD_RULES_MESSAGE } from './passwordPolicy.js';

export const CONSENT_VERSION = 'guardian-consent-v1';
// Five wrong passwords lock account deletion for 15 minutes.
export const deletePasswordLimit = createLimiter(5, 15 * 60_000, 'Too many wrong passwords. Please wait 15 minutes.');

export class AuthController {
  private authService: AuthService;

  constructor(authService: AuthService) {
    this.authService = authService;
  }

  // --- STANDARD AUTH METHODS ---

  register = async (req: Request, res: Response): Promise<void> => {
    try {
      const { email, password, confirmPassword, role, guardianConfirmed, consent, consentVersion }: RegisterRequest = req.body;

      if (!email || !password || !confirmPassword || !role) {
        res.status(400).json({ success: false, message: 'Missing required fields' });
        return;
      }
      if (password !== confirmPassword) {
        res.status(400).json({ success: false, message: 'Passwords do not match' });
        return;
      }
      if (!isStrongPassword(password)) {
        res.status(400).json({ success: false, message: PASSWORD_RULES_MESSAGE });
        return;
      }
      if (role !== 'learner') {
        res.status(403).json({ success: false, message: 'Staff accounts are invitation-only' });
        return;
      }

      const normalizedEmail = email.trim().toLowerCase();
      const assignedRole = registrationRole(normalizedEmail, req.body.adminInvitation);
      const consented = guardianConfirmed === true && consent === true && consentVersion === CONSENT_VERSION;
      
      if (assignedRole === 'learner' && !consented) {
        res.status(400).json({ success: false, message: 'Please confirm you are the guardian and agree to the privacy notice.' });
        return;
      }
      
      const user = await this.authService.register(normalizedEmail, password, assignedRole, assignedRole === 'learner' ? CONSENT_VERSION : null);
      const token = this.authService.generateToken(user.id, user.email, user.role);

      const response: AuthResponse = {
        success: true,
        message: 'Registration successful',
        token,
        user: {
          id: user.id,
          email: user.email,
          role: user.role as 'learner' | 'teacher' | 'admin',
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

      if (!email || !password) {
        res.status(400).json({ success: false, message: 'Email and password are required' });
        return;
      }

      const user = await this.authService.login(email.trim().toLowerCase(), password);
      const token = this.authService.generateToken(user.id, user.email, user.role, user.authVersion);

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

  deleteAccount = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as any).userId;

      if (!userId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const { confirmation, password } = req.body ?? {};
      if (confirmation !== 'DELETE' || typeof password !== 'string' || !password) {
        res.status(400).json({ success: false, message: 'Type DELETE and enter the guardian password.' });
        return;
      }

      const limitKey = `user:${userId}`;
      if (deletePasswordLimit.blocked(limitKey)) {
        res.status(429).json({ success: false, message: 'Too many wrong passwords. Please wait 15 minutes.' });
        return;
      }
      if (!(await this.authService.verifyPassword(userId, password))) {
        deletePasswordLimit.hit(limitKey);
        res.status(403).json({ success: false, message: 'The password is not correct.' });
        return;
      }

      deletePasswordLimit.clear(limitKey);
      await this.authService.deleteAccount(userId);

      res.json({ success: true, message: 'Account deleted' });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete account';
      res.status(500).json({ success: false, message });
    }
  };

  // --- OAUTH METHODS ---

  googleAuthTrigger = (req: Request, res: Response): void => {
    const googleClient = new OAuth2Client(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      'http://localhost:3000/api/auth/google/callback'
    );

    console.log("Checking Client ID:", process.env.GOOGLE_CLIENT_ID);

    const url = googleClient.generateAuthUrl({
      access_type: 'offline',
      scope: ['email', 'profile'],
      prompt: 'consent'
    });
    res.redirect(url);
  };

  googleAuthCallback = async (req: Request, res: Response): Promise<void> => {
    const code = req.query.code as string;
    const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
  
    if (!code) {
      res.redirect(`${FRONTEND_URL}?error=GoogleAuthFailed`);
      return;
    }
  
    try {
      const googleClient = new OAuth2Client(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        'http://localhost:3000/api/auth/google/callback'
      );

      const { tokens } = await googleClient.getToken(code);
      
      const ticket = await googleClient.verifyIdToken({
        idToken: tokens.id_token!,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      
      const payload = ticket.getPayload();
      if (!payload || !payload.email) throw new Error("No valid payload found");
      
      const email = payload.email.trim().toLowerCase();
      const name = payload.name || email.split('@')[0];
  
      const user = await this.authService.findOrCreateGoogleUser(email, name);
      const token = this.authService.generateToken(user.id, user.email, user.role, user.authVersion);
  
      res.redirect(`${FRONTEND_URL}?token=${token}`);
    } catch (error) {
      console.error('Google OAuth Error:', error);
      res.redirect(`${FRONTEND_URL}?error=AuthenticationFailed`);
    }
  };

  // --- FACEBOOK OAUTH METHODS ---

  facebookAuthTrigger = (req: Request, res: Response): void => {
    const clientId = process.env.FACEBOOK_APP_ID;
    const redirectUri = 'http://localhost:3000/api/auth/facebook/callback';
    
    const url = `https://www.facebook.com/v19.0/dialog/oauth?client_id=${clientId}&redirect_uri=${redirectUri}&scope=email,public_profile`;
    res.redirect(url);
  };

  facebookAuthCallback = async (req: Request, res: Response): Promise<void> => {
    const code = req.query.code as string;
    const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

    if (!code) {
      res.redirect(`${FRONTEND_URL}?error=FacebookAuthFailed`);
      return;
    }

    try {
      const clientId = process.env.FACEBOOK_APP_ID;
      const clientSecret = process.env.FACEBOOK_APP_SECRET;
      const redirectUri = 'http://localhost:3000/api/auth/facebook/callback';

      // 1. Exchange the code for an access token
      const tokenUrl = `https://graph.facebook.com/v19.0/oauth/access_token?client_id=${clientId}&redirect_uri=${redirectUri}&client_secret=${clientSecret}&code=${code}`;
      const tokenResponse = await fetch(tokenUrl);
      const tokenData = (await tokenResponse.json()) as FacebookTokenResponse;

      if (!tokenData.access_token) throw new Error("No access token received from Facebook");

      // 2. Fetch the user's profile and email
      const profileUrl = `https://graph.facebook.com/me?fields=id,name,email&access_token=${tokenData.access_token}`;
      const profileResponse = await fetch(profileUrl);
      const profileData = (await profileResponse.json()) as FacebookProfileResponse;

      if (!profileData.email) {
        res.redirect(`${FRONTEND_URL}?error=NoEmailAttachedToFacebook`);
        return;
      }

      const email = profileData.email.trim().toLowerCase();
      const name = profileData.name || email.split('@')[0];

      // 3. Log them in using the service method
      const user = await this.authService.findOrCreateFacebookUser(email, name);
      const token = this.authService.generateToken(user.id, user.email, user.role, user.authVersion);

      res.redirect(`${FRONTEND_URL}?token=${token}`);
    } catch (error) {
      console.error('Facebook OAuth Error:', error);
      res.redirect(`${FRONTEND_URL}?error=AuthenticationFailed`);
    }
  };
}