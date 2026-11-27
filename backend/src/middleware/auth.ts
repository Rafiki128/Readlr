import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { supabase, unwrap } from '../database/db.js';
import { getJwtSecret } from '../config/jwt.js';

const JWT_SECRET = getJwtSecret();
const verifiedRole = Symbol('verifiedRole');

export interface AuthenticatedRequest extends Request {
  userId?: number;
  userEmail?: string;
  userRole?: string;
  [verifiedRole]?: true;
}

export async function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  let decoded: {id:number;email?:string;authVersion?:number};
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ success: false, message: 'Missing or invalid authorization header' });
      return;
    }

    const token = authHeader.substring(7);

    decoded = jwt.verify(token, JWT_SECRET) as typeof decoded;
    if(!Number.isSafeInteger(decoded.id)||decoded.id<1)throw new Error('Invalid user');
  } catch {
    res.status(401).json({ success: false, message: 'Invalid or expired token' });
    return;
  }
  try {
    const user = unwrap(await supabase.from('users').select('auth_version,role').eq('id',decoded.id).maybeSingle());
    if (!user || user.auth_version !== (decoded.authVersion ?? 0)) {
      res.status(401).json({success:false,message:'Your session ended. Please sign in again.'}); return;
    }
    req.userId = decoded.id;
    req.userEmail = decoded.email;
    req.userRole = user.role;
    req[verifiedRole] = true;
  } catch {
    res.status(503).json({success:false,message:'Could not verify your session'});
    return;
  }
  next();
}

export function requireRole(...roles: string[]) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    // Auth already checked the stored role for this request; never trust a role from the token.
    if(!req[verifiedRole]){
      try {
        const user = unwrap(await supabase.from('users').select('role').eq('id',req.userId).maybeSingle());
        req.userRole = user?.role;
      } catch { res.status(503).json({success:false,message:'Could not verify access'}); return; }
    }
    if (!req.userRole || !roles.includes(req.userRole)) {
      res.status(403).json({ success: false, message: 'Access denied' });
      return;
    }
    next();
  };
}
