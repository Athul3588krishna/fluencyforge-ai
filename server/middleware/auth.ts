import crypto from 'crypto';
import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';

const FALLBACK_SECRET = crypto
  .createHash('sha256')
  .update(process.cwd() + ':fluencyforge-jwt-dev-secret')
  .digest('hex');

function getJwtSecret(): string {
  return process.env.JWT_SECRET?.trim() || FALLBACK_SECRET;
}

export interface AuthenticatedRequest extends Request {
  userId?: string;
}

export function signAuthToken(userId: string): string {
  return jwt.sign({ sub: userId }, getJwtSecret(), { expiresIn: '14d' });
}

export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authentication required. Please sign in.' });
    return;
  }

  const token = header.slice('Bearer '.length).trim();
  try {
    const decoded = jwt.verify(token, getJwtSecret()) as { sub?: string };
    if (!decoded?.sub) {
      res.status(401).json({ error: 'Invalid authentication token.' });
      return;
    }
    req.userId = decoded.sub;
    next();
  } catch {
    res.status(401).json({ error: 'Your session has expired. Please log in again.' });
  }
}
