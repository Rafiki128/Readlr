import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { supabase, unwrap } from '../../database/db.js';
import { DecodedToken } from './auth.types.js';
import { getJwtSecret } from '../../config/jwt.js';
import crypto from 'crypto';

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

    // Create user; the child profile is created later by the guardian in child setup.
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
      authVersion: user.auth_version,
    };
  }

  /**
   * Find or create a user logging in via Google OAuth
   */
  async findOrCreateGoogleUser(email: string, _name: string): Promise<{ id: number; email: string; role: string; name: string; authVersion: number }> {
    let user = unwrap(await supabase.from('users').select('*').eq('email', email).maybeSingle());

    // If user doesn't exist, create a new learner account
    if (!user) {
      // Generate a strong random password for the OAuth user since they log in via Google
      const randomPassword = crypto.randomBytes(32).toString('hex');
      const passwordHash = await bcrypt.hash(randomPassword, 10);

      const newUser = unwrap(await supabase.from('users').insert({ 
        email, 
        password_hash: passwordHash, 
        role: 'learner',
        consent_at: new Date().toISOString(), // Implicit consent via OAuth
        consent_version: 'guardian-consent-v1' // Implicit consent via OAuth
      }).select('*').single());

      if (!newUser) {
        throw new Error('Failed to create OAuth user');
      }
      user = newUser;
    }

    // Determine display name
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

    // If user doesn't exist, create a new learner account
    if (!user) {
      // Generate a strong random password for the OAuth user since they log in via Meta
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

    // Determine display name
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