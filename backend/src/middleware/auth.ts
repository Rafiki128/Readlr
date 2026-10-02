import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { supabase, unwrap } from '../database/db.js';

function getJwtSecret(): string {
  if (process.env.JWT_SECRET) return process.env.JWT_SECRET;
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET is required in production');
  }
  return 'readlr-development-secret';
}

const JWT_SECRET = getJwtSecret();

export interface AuthenticatedRequest extends Request {
  userId?: number;
  userEmail?: string;
  userRole?: string;
}

export async function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ success: false, message: 'Missing or invalid authorization header' });
      return;
    }

    const token = authHeader.substring(7);

    const decoded = jwt.verify(token, JWT_SECRET) as any;
    const user = unwrap(await supabase.from('users').select('auth_version').eq('id',decoded.id).maybeSingle());
    if (!user || user.auth_version !== (decoded.authVersion ?? 0)) {
      res.status(401).json({success:false,message:'Your session ended. Please sign in again.'}); return;
    }
    req.userId = decoded.id;
    req.userEmail = decoded.email;
    req.userRole = decoded.role;

    next();
  } catch (error) {
    res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
}

export function requireRole(...roles: string[]) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    // Recheck stored roles so a revoked admin token cannot retain staff access.
    try {
      const user = unwrap(await supabase.from('users').select('role').eq('id',req.userId).maybeSingle());
      req.userRole = user?.role;
    } catch { res.status(503).json({success:false,message:'Could not verify access'}); return; }
    if (!req.userRole || !roles.includes(req.userRole)) {
      res.status(403).json({ success: false, message: 'Access denied' });
      return;
    }
    next();
  };
}
