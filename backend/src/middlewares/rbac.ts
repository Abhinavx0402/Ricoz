import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth.js';
import { UserRole } from '../models/User.js';

export function requireRole(...allowedRoles: UserRole[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
      });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: `Forbidden: role '${req.user.role}' lacks permission for this action`,
        },
      });
      return;
    }

    next();
  };
}

export function enforceStoreScope(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
    });
    return;
  }

  // Admins have cross-store access
  if (req.user.role === 'ADMIN') {
    return next();
  }

  // Non-admins must have an assigned store
  if (!req.user.storeId) {
    res.status(403).json({
      success: false,
      error: { code: 'NO_STORE_ASSIGNED', message: 'User is not assigned to any physical store location' },
    });
    return;
  }

  // If query or body specifies storeId, it must match user's assigned storeId
  const requestedStoreId = req.query.storeId || req.body.storeId;
  if (requestedStoreId && requestedStoreId.toString() !== req.user.storeId.toString()) {
    res.status(403).json({
      success: false,
      error: { code: 'CROSS_STORE_FORBIDDEN', message: 'Access to data from another store is forbidden' },
    });
    return;
  }

  next();
}
