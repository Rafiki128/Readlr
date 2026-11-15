import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { supabase, unwrap } from '../../database/db.js';
import { DecodedToken } from './auth.types.js';
import { getJwtSecret } from '../../config/jwt.js';
import crypto from 'crypto';
import nodemailer from 'nodemailer';

const JWT_SECRET = getJwtSecret();
const JWT_EXPIRY = '7d';

export class AuthService {
  /**
   * Register a new user
   */
  async register(
    email: string,
    password: string,
    role: 'learner' | 'teacher' | 'admin',
    consentVersion: string | null
  ): Promise<{ id: number; email: string; role: string; name: string }> {
    // Check if user exists
    const existingUser = unwrap(await supabase.from('users').select('id').eq('email', email).maybeSingle());
    if (existingUser) {
      throw new Error('User already exists');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user
    const consent = consentVersion ? { consent_at: new Date().toISOString(), consent_version: consentVersion } : {};
    const user = unwrap(await supabase.from('users').insert({ email, password_hash: passwordHash, role, ...consent }).select('id, email, role').single());
    if (!user) {
      throw new Error('Failed to create user');
    }

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      name: email.split('@')[0],
    };
  }

  /**
   * Check the account password before an adult-only action
   */
  async verifyPassword(userId: number, password: string): Promise<boolean> {
    const user = unwrap(await supabase.from('users').select('password_hash').eq('id', userId).maybeSingle());
    return user ? bcrypt.compare(password, user.password_hash) : false;
  }

  /**
   * Login user
   */
  async login(email: string, password: string): Promise<{ id: number; email: string; role: string; name: string; authVersion: number }> {
    const user = unwrap(await supabase.from('users').select('*').eq('email', email).maybeSingle());

    if (!user) {
      throw new Error('Invalid email or password');
    }

    // Compare password
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      throw new Error('Invalid email or password');
    }

    // Get name based on role
    let name = email.split('@')[0]; // Default fallback
    if (user.role === 'learner') {
      const learnerProfile = unwrap(await supabase.from('learner_profiles').select('name').eq('user_id', user.id).maybeSingle());
      if (learnerProfile) {
        name = learnerProfile.name;
      }
    }

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      name,
      authVersion: user.auth_version || 0,
    };
  }

  /**
   * Request a password reset token and email it through Gmail SMTP.
   */
  async requestPasswordReset(email: string, redirectTo: string): Promise<void> {
    const user = unwrap(await supabase.from('users').select('id, email').eq('email', email).maybeSingle());

    if (!user) {
      return;
    }

    const gmailUser = process.env.GMAIL_USER;
    const gmailAppPassword = process.env.GMAIL_APP_PASSWORD;
    if (!gmailUser || !gmailAppPassword) {
      throw new Error('Gmail email delivery is not configured.');
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetExpiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    const { error: updateError } = await supabase
      .from('users')
      .update({ reset_token: resetToken, reset_expires_at: resetExpiresAt })
      .eq('id', user.id);

    if (updateError) {
      throw new Error('Failed to generate password reset request');
    }

    let validRedirect = redirectTo || 'http://localhost:5173/reset-password';
    if (!validRedirect.includes('/reset-password')) {
      validRedirect = validRedirect.endsWith('/')
        ? `${validRedirect}reset-password`
        : `${validRedirect}/reset-password`;
    }
    const resetLink = `${validRedirect}?token=${resetToken}&email=${encodeURIComponent(email)}`;
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: gmailUser, pass: gmailAppPassword },
    });

    await transporter.sendMail({
      from: { name: 'Readlr', address: gmailUser },
      to: email,
      subject: 'Reset your Readlr password',
      text: `Use this link to reset your Readlr password: ${resetLink}`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 24px; max-width: 600px; margin: 0 auto; background-color: #f8fafc; border-radius: 12px; border: 1px solid #e2e8f0;">
          <h2 style="color: #5b21b6; margin-bottom: 16px;">Reset Your Readlr Password</h2>
          <p style="color: #334155; font-size: 15px; line-height: 1.5;">You requested a password reset for your Readlr account.</p>
          <p style="color: #334155; font-size: 15px; line-height: 1.5;">Click the button below to set a new password. This secure link expires in 1 hour:</p>
          <a href="${resetLink}" style="background: linear-gradient(135deg, #5b21b6, #0ea5e9); color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block; margin: 20px 0; font-weight: bold; text-align: center;">Reset Password</a>
          <p style="color: #64748b; font-size: 13px; margin-top: 24px; border-top: 1px solid #e2e8f0; padding-top: 16px;">If you didn't request this, you can safely ignore this email.</p>
        </div>
      `,
    });
  }
  /**
   * Reset password using token verification
   */
  async resetPasswordWithToken(token: string, newPassword: string): Promise<void> {
    const user = unwrap(
      await supabase
        .from('users')
        .select('id, reset_expires_at')
        .eq('reset_token', token)
        .maybeSingle()
    );

    if (!user || !user.reset_expires_at || new Date() > new Date(user.reset_expires_at)) {
      throw new Error('Invalid or expired password reset token');
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    const { error } = await supabase
      .from('users')
      .update({
        password_hash: passwordHash,
        reset_token: null,
        reset_expires_at: null,
        auth_version: (user as any).auth_version ? (user as any).auth_version + 1 : 1,
      })
      .eq('id', user.id);

    if (error) {
      throw new Error('Failed to update password');
    }
  }

  /**
   * Find or create a user logging in via Google OAuth
   */
  async findOrCreateGoogleUser(email: string, _name: string): Promise<{ id: number; email: string; role: string; name: string; authVersion: number }> {
    let user = unwrap(await supabase.from('users').select('*').eq('email', email).maybeSingle());

    if (!user) {
      const randomPassword = crypto.randomBytes(32).toString('hex');
      const passwordHash = await bcrypt.hash(randomPassword, 10);

      const newUser = unwrap(await supabase.from('users').insert({ 
        email, 
        password_hash: passwordHash, 
        role: 'learner',
        consent_at: new Date().toISOString(),
        consent_version: 'guardian-consent-v1'
      }).select('*').single());

      if (!newUser) {
        throw new Error('Failed to create OAuth user');
      }
      user = newUser;
    }

    let displayName = email.split('@')[0]; 
    if (user.role === 'learner') {
      const learnerProfile = unwrap(await supabase.from('learner_profiles').select('name').eq('user_id', user.id).maybeSingle());
      if (learnerProfile) {
        displayName = learnerProfile.name;
      }
    }

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      name: displayName,
      authVersion: user.auth_version || 0,
    };
  }

  /**
   * Find or create a user logging in via Facebook OAuth
   */
  async findOrCreateFacebookUser(email: string, _name: string): Promise<{ id: number; email: string; role: string; name: string; authVersion: number }> {
    let user = unwrap(await supabase.from('users').select('*').eq('email', email).maybeSingle());

    if (!user) {
      const randomPassword = crypto.randomBytes(32).toString('hex');
      const passwordHash = await bcrypt.hash(randomPassword, 10);

      const newUser = unwrap(await supabase.from('users').insert({ 
        email, 
        password_hash: passwordHash, 
        role: 'learner',
        consent_at: new Date().toISOString(),
        consent_version: 'guardian-consent-v1'
      }).select('*').single());

      if (!newUser) {
        throw new Error('Failed to create OAuth user');
      }
      user = newUser;
    }

    let displayName = email.split('@')[0]; 
    if (user.role === 'learner') {
      const learnerProfile = unwrap(await supabase.from('learner_profiles').select('name').eq('user_id', user.id).maybeSingle());
      if (learnerProfile) {
        displayName = learnerProfile.name;
      }
    }

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      name: displayName,
      authVersion: user.auth_version || 0,
    };
  }

  /**
   * Generate JWT token
   */
  generateToken(userId: number, email: string, role: string, authVersion = 0): string {
    return jwt.sign(
      {
        id: userId,
        email,
        role,
        authVersion,
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRY }
    );
  }

  /**
   * Verify JWT token
   */
  verifyToken(token: string): DecodedToken {
    try {
      return jwt.verify(token, JWT_SECRET) as DecodedToken;
    } catch (error) {
      throw new Error('Invalid or expired token');
    }
  }

  /**
   * Permanently delete a user account and all associated data.
   */
  async deleteAccount(userId: number): Promise<void> {
    unwrap(await supabase.from('users').delete().eq('id', userId));
  }

  /**
   * Get user by ID
   */
  async getUserById(userId: number) {
    const user = unwrap(await supabase.from('users').select('id, email, role').eq('id', userId).maybeSingle());

    if (!user) {
      return null;
    }

    let name = user.email.split('@')[0]; 
    if (user.role === 'learner') {
      const learnerProfile = unwrap(await supabase.from('learner_profiles').select('name').eq('user_id', userId).maybeSingle());
      if (learnerProfile) {
        name = learnerProfile.name;
      }
    }

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      name,
    };
  }
}