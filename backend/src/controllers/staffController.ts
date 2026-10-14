import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { User, UserRole } from '../models/User.js';
import { AuthenticatedRequest } from '../middlewares/auth.js';
import { AuditLog } from '../models/AuditLog.js';

export const createStaffSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Valid email required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  pin: z.string().min(4).max(8).optional(),
  role: z.enum(['ADMIN', 'MANAGER', 'CASHIER']),
  storeId: z.string().optional(),
});

export const updateStaffSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email().optional(),
  password: z.string().min(6).optional(),
  pin: z.string().min(4).max(8).optional(),
  role: z.enum(['ADMIN', 'MANAGER', 'CASHIER']).optional(),
  storeId: z.string().nullable().optional(),
  active: z.boolean().optional(),
});

export async function listStaff(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const query: any = {};
    if (req.user?.role !== 'ADMIN' && req.user?.storeId) {
      query.storeId = req.user.storeId;
    }

    const staff = await User.find(query)
      .select('-password -pin')
      .populate('storeId', 'name code')
      .sort({ createdAt: -1 });

    res.json({ success: true, data: staff });
  } catch (err) {
    next(err);
  }
}

export async function createStaff(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { name, email, password, pin, role, storeId } = req.body;

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      res.status(409).json({
        success: false,
        error: { code: 'DUPLICATE_EMAIL', message: 'A user with this email already exists' },
      });
      return;
    }

    const user = new User({
      name,
      email: email.toLowerCase(),
      password,
      pin: pin || undefined,
      role,
      storeId: storeId || null,
      active: true,
    });

    await user.save();

    await AuditLog.create({
      userId: req.user?._id,
      userEmail: req.user?.email,
      action: 'STAFF_CREATED',
      entityType: 'User',
      entityId: user._id.toString(),
      details: { email: user.email, role: user.role, storeId: user.storeId },
      ipAddress: req.ip,
    });

    res.status(201).json({
      success: true,
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        storeId: user.storeId,
        active: user.active,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function updateStaff(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const targetUser = await User.findById(id);

    if (!targetUser) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Staff member not found' },
      });
      return;
    }

    // Protection rule: Prevent deactivating or demoting the last active administrator
    if (targetUser.role === 'ADMIN' && (req.body.active === false || (req.body.role && req.body.role !== 'ADMIN'))) {
      const activeAdminCount = await User.countDocuments({ role: 'ADMIN', active: true });
      if (activeAdminCount <= 1) {
        res.status(400).json({
          success: false,
          error: {
            code: 'LAST_ADMIN_PROTECTED',
            message: 'Cannot de-escalate or deactivate the last remaining administrator account.',
          },
        });
        return;
      }
    }

    if (req.body.name) targetUser.name = req.body.name;
    if (req.body.email) targetUser.email = req.body.email.toLowerCase();
    if (req.body.password) targetUser.password = req.body.password;
    if (req.body.pin !== undefined) targetUser.pin = req.body.pin || undefined;
    if (req.body.role) targetUser.role = req.body.role;
    if (req.body.storeId !== undefined) targetUser.storeId = req.body.storeId || null;
    if (req.body.active !== undefined) targetUser.active = req.body.active;

    await targetUser.save();

    await AuditLog.create({
      userId: req.user?._id,
      userEmail: req.user?.email,
      action: 'STAFF_UPDATED',
      entityType: 'User',
      entityId: targetUser._id.toString(),
      details: req.body,
      ipAddress: req.ip,
    });

    res.json({
      success: true,
      data: {
        id: targetUser._id,
        name: targetUser.name,
        email: targetUser.email,
        role: targetUser.role,
        storeId: targetUser.storeId,
        active: targetUser.active,
      },
    });
  } catch (err) {
    next(err);
  }
}
