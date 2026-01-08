import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { sendError } from '../utils/response';
import { Role } from '../entities/User';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Extend Express Request to include user info
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        role: Role;
        restaurantId?: string;
      };
    }
  }
}

export const authenticate = (req: any, res: any, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    console.log('[Auth] ❌ No Authorization header provided');
    return sendError(res, 'No token provided', 401);
  }

  const token = authHeader.split(' ')[1]; // Bearer <token>

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    req.user = decoded;
    // console.log(`[Auth] ✅ Authenticated user: ${decoded.userId} (${decoded.role})`);
    next();
  } catch (error) {
    console.error('[Auth] ❌ Token verification failed:', error);
    return sendError(res, 'Invalid token', 401);
  }
};

export const authorize = (roles: Role[]) => {
  return (req: any, res: any, next: NextFunction) => {
    if (!req.user) {
      return sendError(res, 'Unauthorized', 401);
    }

    if (!roles.includes(req.user.role)) {
      return sendError(res, 'Forbidden', 403);
    }

    next();
  };
};
