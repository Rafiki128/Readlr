import { Request, Response } from 'express';
import { OAuth2Client } from 'google-auth-library';
import { AuthService } from './auth.service.js';
import { LoginRequest, RegisterRequest, AuthResponse } from './auth.types.js';
import { registrationRole } from './adminInvitation.js';
import { createLimiter } from '../../middleware/rateLimit.js';
import { isStrongPassword, PASSWORD_RULES_MESSAGE } from './passwordPolicy.js';

export const CONSENT_VERSION = 'guardian-consent-v1';
// Five wrong passwords lock account deletion for 15 minutes.
export const deletePasswordLimit = createLimiter(5, 15 * 60_000, 'Too many wrong passwords. Please wait 15 minutes.');

function getFacebookCallbackUrl(): string {
  const callbackUrl = process.env.FACEBOOK_CALLBACK_URL;
  if (callbackUrl) return callbackUrl.replace(/\/+$/, '');
  if (process.env.NODE_ENV === 'production') {
    throw new Error('FACEBOOK_CALLBACK_URL is required in production.');
  }
  return 'http://localhost:3000/api/auth/facebook/callback';
}

function getBackendUrl(req: Request): string {
  const backendUrl = process.env.BACKEND_URL;
  if (backendUrl) return backendUrl.replace(/\/+$/, '');
  if (process.env.NODE_ENV === 'production') {
    throw new Error('BACKEND_URL is required in production.');
  }
  const forwardedProto = req.get('x-forwarded-proto')?.split(',')[0].trim();
  const protocol = forwardedProto || req.protocol;
  const forwardedHost = req.get('x-forwarded-host')?.split(',')[0].trim();
  const host = forwardedHost || req.get('host') || 'localhost:3000';
  return `${protocol}://${host}`.replace(/\/+$/, '');
}

function getFrontendUrl(): string {
  const frontendUrl = process.env.FRONTEND_URL;
  if (frontendUrl) return frontendUrl.replace(/\/+$/, '');
  if (process.env.NODE_ENV === 'production') {
    throw new Error('FRONTEND_URL is required in production.');
  }
  const corsOrigin = process.env.CORS_ORIGIN?.split(',')[0].trim();
  return (corsOrigin || 'http://localhost:5173').replace(/\/+$/, '');
}

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

  requestPasswordReset = async (req: Request, res: Response): Promise<void> => {
    try {
      const { email } = req.body;

      if (!email) {
        res.status(400).json({ success: false, message: 'Email address is required' });
        return;
      }

      const normalizedEmail = email.trim().toLowerCase();
      const redirectTo = `${req.headers.origin || 'http://localhost:5173'}/reset-password`;

      // Delegates to the auth service to create the reset token and email the link.
      await this.authService.requestPasswordReset(normalizedEmail, redirectTo);

      res.status(200).json({
        success: true,
        message: 'Password reset email sent successfully. Please check your inbox.',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to send reset email';
      res.status(500).json({ success: false, message });
    }
  };

  resetPasswordConfirm = async (req: Request, res: Response): Promise<void> => {
    try {
      const { token, password } = req.body;

      if (!token || !password) {
        res.status(400).json({ success: false, message: 'Token and new password are required' });
        return;
      }

      await this.authService.resetPasswordWithToken(token, password);

      res.status(200).json({
        success: true,
        message: 'Password successfully updated.',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to reset password';
      res.status(400).json({ success: false, message });
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
    let frontendUrl: string;
    try {
      frontendUrl = getFrontendUrl();
    } catch (error) {
      console.error('Google OAuth configuration error:', error);
      res.status(500).send('Google sign-in is not configured correctly.');
      return;
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
      console.error('Google OAuth Error: GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET is missing.');
      res.redirect(`${frontendUrl}?error=GoogleAuthNotConfigured`);
      return;
    }

    let redirectUri: string;
    try {
      redirectUri = `${getBackendUrl(req)}/api/auth/google/callback`;
    } catch (error) {
      console.error('Google OAuth configuration error:', error);
      res.status(500).send('Google sign-in is not configured correctly.');
      return;
    }

    const googleClient = new OAuth2Client(
      clientId,
      clientSecret,
      redirectUri
    );

    const url = googleClient.generateAuthUrl({
      access_type: 'offline',
      scope: ['email', 'profile'],
      prompt: 'consent'
    });
    res.redirect(url);
  };

  googleAuthCallback = async (req: Request, res: Response): Promise<void> => {
    const code = typeof req.query.code === 'string' ? req.query.code : '';
    let frontendUrl: string;
    try {
      frontendUrl = getFrontendUrl();
    } catch (error) {
      console.error('Google OAuth configuration error:', error);
      res.status(500).send('Google sign-in is not configured correctly.');
      return;
    }

    if (!code) {
      res.redirect(`${frontendUrl}?error=GoogleAuthFailed`);
      return;
    }

    try {
      const clientId = process.env.GOOGLE_CLIENT_ID;
      const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
      if (!clientId || !clientSecret) {
        throw new Error('Google OAuth credentials are missing on the server.');
      }

      const redirectUri = `${getBackendUrl(req)}/api/auth/google/callback`;
      const googleClient = new OAuth2Client(
        clientId,
        clientSecret,
        redirectUri
      );

      const { tokens } = await googleClient.getToken(code);
      if (!tokens.id_token) throw new Error('Google did not return an ID token.');

      const ticket = await googleClient.verifyIdToken({
        idToken: tokens.id_token,
        audience: clientId,
      });

      const payload = ticket.getPayload();
      if (!payload || !payload.email) throw new Error("No valid payload found");

      const email = payload.email.trim().toLowerCase();
      const name = payload.name || email.split('@')[0];

      const user = await this.authService.findOrCreateGoogleUser(email, name);
      const token = this.authService.generateToken(user.id, user.email, user.role, user.authVersion);

      res.redirect(`${frontendUrl}?token=${token}`);
    } catch (error) {
      console.error('Google OAuth Error:', error);
      res.redirect(`${frontendUrl}?error=AuthenticationFailed`);
    }
  };

  // --- FACEBOOK OAUTH METHODS ---

  facebookAuthTrigger = (req: Request, res: Response): void => {
    let frontendUrl: string;
    try {
      frontendUrl = getFrontendUrl();
    } catch (error) {
      console.error('Facebook OAuth configuration error:', error);
      res.status(500).send('Facebook sign-in is not configured correctly.');
      return;
    }

    const clientId = process.env.FACEBOOK_APP_ID;
    if (!clientId) {
      console.error('Facebook OAuth Error: FACEBOOK_APP_ID is missing.');
      res.redirect(`${frontendUrl}?error=FacebookAuthNotConfigured`);
      return;
    }

    let redirectUri: string;
    try {
      redirectUri = getFacebookCallbackUrl();
    } catch (error) {
      console.error('Facebook OAuth configuration error:', error);
      res.status(500).send('Facebook sign-in is not configured correctly.');
      return;
    }

    const url = new URL('https://www.facebook.com/v19.0/dialog/oauth');
    url.search = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: 'email,public_profile',
    }).toString();
    res.redirect(url.toString());
  };

  facebookAuthCallback = async (req: Request, res: Response): Promise<void> => {
    const code = typeof req.query.code === 'string' ? req.query.code : '';
    let frontendUrl: string;
    try {
      frontendUrl = getFrontendUrl();
    } catch (error) {
      console.error('Facebook OAuth configuration error:', error);
      res.status(500).send('Facebook sign-in is not configured correctly.');
      return;
    }

    if (!code) {
      res.redirect(`${frontendUrl}?error=FacebookAuthFailed`);
      return;
    }

    try {
      const clientId = process.env.FACEBOOK_APP_ID;
      const clientSecret = process.env.FACEBOOK_APP_SECRET;
      if (!clientId || !clientSecret) {
        throw new Error('Facebook credentials are missing on the server.');
      }
      const redirectUri = getFacebookCallbackUrl();

      const tokenUrl = new URL('https://graph.facebook.com/v19.0/oauth/access_token');
      tokenUrl.search = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        client_secret: clientSecret,
        code,
      }).toString();
      const tokenResponse = await fetch(tokenUrl);
      if (!tokenResponse.ok) throw new Error('Facebook token exchange failed.');
      const tokenData: unknown = await tokenResponse.json();

      if (
        !tokenData ||
        typeof tokenData !== 'object' ||
        !('access_token' in tokenData) ||
        typeof tokenData.access_token !== 'string' ||
        !tokenData.access_token
      ) {
        throw new Error('No access token received from Facebook.');
      }

      const profileUrl = new URL('https://graph.facebook.com/me');
      profileUrl.search = new URLSearchParams({
        fields: 'id,name,email',
        access_token: tokenData.access_token,
      }).toString();
      const profileResponse = await fetch(profileUrl);
      if (!profileResponse.ok) throw new Error('Facebook profile lookup failed.');
      const profileData: unknown = await profileResponse.json();

      if (
        !profileData ||
        typeof profileData !== 'object' ||
        !('email' in profileData) ||
        typeof profileData.email !== 'string' ||
        !profileData.email.trim()
      ) {
        res.redirect(`${frontendUrl}?error=NoEmailAttachedToFacebook`);
        return;
      }

      const email = profileData.email.trim().toLowerCase();
      const name = 'name' in profileData && typeof profileData.name === 'string' && profileData.name.trim()
        ? profileData.name.trim()
        : email.split('@')[0];

      const user = await this.authService.findOrCreateFacebookUser(email, name);
      const token = this.authService.generateToken(user.id, user.email, user.role, user.authVersion);

      res.redirect(`${frontendUrl}?token=${token}`);
    } catch (error) {
      console.error('Facebook OAuth Error:', error);
      res.redirect(`${frontendUrl}?error=AuthenticationFailed`);
    }
  };
}