import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { User, IUser } from '../models/User.js';
import { Store } from '../models/Store.js';
import { AuthenticatedRequest } from '../middlewares/auth.js';
import { AuditLog } from '../models/AuditLog.js';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-ricozpos-jwt-key-change-in-production-min-32-chars';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '8h';

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const pinLoginSchema = z.object({
  pin: z.string().min(4, 'PIN must be at least 4 digits').max(8),
  storeId: z.string().optional(),
});

function generateToken(user: IUser): string {
  return jwt.sign(
    {
      userId: user._id,
      role: user.role,
      storeId: user.storeId?.toString(),
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN as any }
  );
}

export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user || !user.active) {
      res.status(401).json({
        success: false,
        error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' },
      });
      return;
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      res.status(401).json({
        success: false,
        error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' },
      });
      return;
    }

    const token = generateToken(user);
    const store = user.storeId ? await Store.findById(user.storeId) : null;

    res.json({
      success: true,
      data: {
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          storeId: user.storeId,
          store: store ? { id: store._id, name: store.name, code: store.code, taxRate: store.taxRate, currency: store.currency } : null,
        },
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function pinLogin(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { pin, storeId } = req.body;
    const query: any = { active: true, pin: { $exists: true, $ne: null } };
    if (storeId) {
      query.storeId = storeId;
    }

    const users = await User.find(query);
    let matchedUser: IUser | null = null;

    for (const u of users) {
      if (await u.comparePin(pin)) {
        matchedUser = u;
        break;
      }
    }

    if (!matchedUser) {
      res.status(401).json({
        success: false,
        error: { code: 'INVALID_PIN', message: 'Invalid cashier PIN' },
      });
      return;
    }

    const token = generateToken(matchedUser);
    const store = matchedUser.storeId ? await Store.findById(matchedUser.storeId) : null;

    res.json({
      success: true,
      data: {
        token,
        user: {
          id: matchedUser._id,
          name: matchedUser.name,
          email: matchedUser.email,
          role: matchedUser.role,
          storeId: matchedUser.storeId,
          store: store ? { id: store._id, name: store.name, code: store.code, taxRate: store.taxRate, currency: store.currency } : null,
        },
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function getMe(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = req.user!;
    const store = user.storeId ? await Store.findById(user.storeId) : null;

    res.json({
      success: true,
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        storeId: user.storeId,
        store: store ? { id: store._id, name: store.name, code: store.code, taxRate: store.taxRate, currency: store.currency } : null,
      },
    });
  } catch (err) {
    next(err);
  }
}
