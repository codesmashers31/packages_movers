import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { User } from '../models/User.js';
import { Vendor } from '../models/Vendor.js';
import { config } from '../config/env.js';
import { AuthenticatedRequest } from '../middlewares/auth.js';
import { STANDARD_VENDOR_ROLES } from './vendorController.js';
import { STANDARD_ADMIN_ROLES } from './adminController.js';

export const resolveUserPermissions = async (user: any): Promise<string[]> => {
  // 1. Administrative Users & Staff
  if (user.role === 'admin') {
    if (user.phone === '+919876543210' || user.adminRole === 'super_admin' || !user.adminRole) {
      return ['*'];
    }

    // Direct user-specific permission override
    if (Array.isArray(user.permissions)) {
      return user.permissions;
    }

    // Check custom roles in PlatformSetting
    try {
      const { PlatformSetting } = await import('../models/PlatformSetting.js');
      const customSetting = await PlatformSetting.findOne({ key: 'custom_admin_roles' });
      if (customSetting && Array.isArray(customSetting.value)) {
        const customRole = customSetting.value.find(
          (r: any) => (r.id || '').toLowerCase() === (user.adminRole || '').toLowerCase()
        );
        if (customRole && Array.isArray(customRole.permissions)) {
          return customRole.permissions;
        }
      }
    } catch (e) {
      console.warn('[resolveUserPermissions] Could not fetch custom admin roles:', e);
    }

    // Check standard admin roles
    const standardRole = STANDARD_ADMIN_ROLES.find(
      (r) => r.id.toLowerCase() === (user.adminRole || '').toLowerCase()
    );
    if (standardRole && Array.isArray(standardRole.permissions)) {
      return standardRole.permissions;
    }

    // Role-name fallback heuristics
    const aRole = (user.adminRole || '').toLowerCase();
    if (aRole.includes('compliance')) {
      return ['vendors:view', 'vendors:approve', 'vendors:suspend', 'documents:view', 'documents:verify', 'audit:view'];
    }
    if (aRole.includes('operation')) {
      return [
        'bookings:view',
        'bookings:manage',
        'vendors:view',
        'vendors:approve',
        'vendors:suspend',
        'documents:view',
        'documents:verify',
        'disputes:view',
        'disputes:manage',
        'reports:view',
        'audit:view',
      ];
    }
    if (aRole.includes('dispute') || aRole.includes('claim')) {
      return ['disputes:view', 'disputes:manage', 'bookings:view', 'users:view'];
    }
    if (aRole.includes('catalog') || aRole.includes('pricing')) {
      return ['packages:manage', 'service_areas:manage', 'settings:manage'];
    }
    if (aRole.includes('hr') || aRole.includes('staff')) {
      return ['staff:view', 'staff:manage', 'permissions:manage', 'audit:view'];
    }

    return ['*'];
  }

  // 2. Vendor Administrator
  if (user.role === 'vendor') {
    return ['*'];
  }

  // Direct user-specific permission override for vendor employees/staff
  if (Array.isArray(user.permissions)) {
    return user.permissions;
  }

  if (!user.vendorId) {
    return [];
  }

  try {
    const vendor = await Vendor.findById(user.vendorId);
    if (!vendor) return [];

    const norm = (s: string) => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const empRole = (user.employeeRole || user.role || '').toLowerCase();
    const empRoleNorm = norm(user.employeeRole || user.role);
    if (!empRoleNorm) return [];

    // 1. Check custom roles configured dynamically by this vendor
    const customRole = (vendor.customRoles || []).find(
      (r: any) =>
        norm(r.id) === empRoleNorm ||
        norm(r.name) === empRoleNorm
    );

    if (customRole && Array.isArray(customRole.permissions)) {
      return customRole.permissions;
    }

    // 2. Check standard system vendor roles
    const standardRole = STANDARD_VENDOR_ROLES.find(
      (r) =>
        norm(r.id) === empRoleNorm ||
        norm(r.name) === empRoleNorm
    );

    if (standardRole && Array.isArray(standardRole.permissions)) {
      return standardRole.permissions;
    }

    // 3. Fallbacks based on common role keywords
    if (empRole.includes('estimate') || empRole.includes('quote') || empRole.includes('sales')) {
      return [
        'Review Available Customer Leads',
        'Create & Submit Formal Quotations',
        'Quotation Performance & Insights',
      ];
    }

    if (empRole.includes('hr') || empRole.includes('talent')) {
      return [
        'Manage Employees & Crew',
        'Reports & Performance Analytics',
        'Operational Audit Logs',
      ];
    }

    if (empRole.includes('fleet') || empRole.includes('transport')) {
      return [
        'Fleet & Vehicle Operations',
        'Assign Transport Trucks to Moves',
        'Vehicle Inspection & Maintenance Tracking',
      ];
    }

    // Default crew worker
    return [
      'Update Move Progression Milestones',
      'Enter Recipient Delivery Verification Code',
      'Vehicle Inspection & Maintenance Tracking',
    ];
  } catch (err) {
    console.error('[resolveUserPermissions] Error:', err);
    return [];
  }
};

export const requestOtp = async (req: Request, res: Response): Promise<void> => {
  const { phone } = req.body;
  if (!phone) {
    res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'Phone number is required' } });
    return;
  }

  // MVP Mock OTP Generation (in production, use SMS Gateway / OTP Provider)
  const mockOtp = '123456';
  console.log(`[OTP] Generated mock OTP for ${phone}: ${mockOtp}`);

  res.status(200).json({
    success: true,
    message: 'OTP sent successfully (Development mock OTP: 123456)',
    phone,
  });
};

export const verifyOtp = async (req: Request, res: Response): Promise<void> => {
  const { phone, otp, role = 'customer' } = req.body;

  if (!phone || !otp) {
    res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'Phone and OTP are required' } });
    return;
  }

  if (otp !== '123456') {
    res.status(400).json({ error: { code: 'INVALID_OTP', message: 'Invalid OTP code' } });
    return;
  }

  let user: any = null;
  try {
    user = await User.findOne({ phone });
    if (!user) {
      user = await User.create({
        phone,
        role: phone === '+919876543210' ? 'admin' : role,
        accountStatus: 'active',
        verifiedAt: new Date(),
        displayName: phone === '+919876543210' ? 'System Administrator' : undefined,
      });
    }
  } catch (dbErr) {
    console.warn('[Auth] Database offline or query failed, using development fallback session:', dbErr);
    user = {
      _id: '675000000000000000000001',
      phone,
      role: phone === '+919876543210' || role === 'admin' ? 'admin' : role,
      displayName: phone === '+919876543210' ? 'System Administrator' : 'Demo User',
      language: 'en',
    };
  }

  const permissions = await resolveUserPermissions(user);

  const token = jwt.sign(
    {
      id: user._id.toString(),
      phone: user.phone,
      displayName: user.displayName || user.username || user.phone,
      username: user.username,
      role: user.role,
      adminRole: user.adminRole,
      adminDepartment: user.adminDepartment,
      permissions,
      employeeRole: user.employeeRole,
      vendorId: user.vendorId?.toString(),
      mustChangePassword: Boolean(user.mustChangePassword),
    },
    config.jwtSecret,
    { expiresIn: '7d' }
  );

  res.status(200).json({
    token,
    mustChangePassword: Boolean(user.mustChangePassword),
    user: {
      id: user._id,
      phone: user.phone,
      username: user.username,
      email: user.email,
      displayName: user.displayName || 'Administrator',
      role: user.role,
      adminRole: user.adminRole,
      adminDepartment: user.adminDepartment,
      employeeRole: user.employeeRole,
      vendorId: user.vendorId,
      language: user.language || 'en',
      mustChangePassword: Boolean(user.mustChangePassword),
      permissions,
    },
  });
};

export const getMe = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } });
    return;
  }

  try {
    const user = await User.findById(req.user.id).select('-password -plainTempPassword');
    if (user) {
      const permissions = await resolveUserPermissions(user);
      const userObj: any = user.toObject();
      userObj.permissions = permissions;
      userObj.resolvedPermissions = permissions;
      res.status(200).json({ user: userObj });
      return;
    }
  } catch (err) {
    // fallback if DB offline
  }

  res.status(200).json({
    user: {
      id: req.user.id,
      phone: req.user.phone,
      role: req.user.role,
      displayName: req.user.role === 'admin' ? 'System Administrator' : 'User',
      language: 'en',
      permissions: req.user.role === 'admin' || req.user.role === 'vendor' ? ['*'] : [],
    },
  });
};

export const loginWithPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
      res.status(400).json({
        error: { code: 'BAD_REQUEST', message: 'Username/Email/Phone and Password are required' },
      });
      return;
    }

    const cleanIdentifier = String(identifier).trim();

    // Search user by username, email, or phone
    const user = await User.findOne({
      $or: [
        { username: cleanIdentifier.toLowerCase() },
        { email: cleanIdentifier.toLowerCase() },
        { phone: cleanIdentifier },
      ],
    });

    if (!user) {
      res.status(401).json({
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'No account found with this username, email, or phone number.',
        },
      });
      return;
    }

    if (user.accountStatus === 'suspended' || user.accountStatus === 'deleted') {
      res.status(403).json({
        error: {
          code: 'ACCOUNT_SUSPENDED',
          message: 'Your account has been deactivated or suspended. Please contact your company administrator.',
        },
      });
      return;
    }

    if (!user.password) {
      res.status(400).json({
        error: {
          code: 'PASSWORD_NOT_CONFIGURED',
          message: 'Password has not been configured for this account. Please log in using Phone OTP or contact your administrator.',
        },
      });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      res.status(401).json({
        error: { code: 'INVALID_CREDENTIALS', message: 'Incorrect password entered. Please try again.' },
      });
      return;
    }

    const permissions = await resolveUserPermissions(user);

    const token = jwt.sign(
      {
        id: user._id.toString(),
        phone: user.phone,
        displayName: user.displayName || user.username || user.phone,
        username: user.username,
        role: user.role,
        adminRole: user.adminRole,
        adminDepartment: user.adminDepartment,
        permissions,
        employeeRole: user.employeeRole,
        vendorId: user.vendorId?.toString(),
        mustChangePassword: Boolean(user.mustChangePassword),
      },
      config.jwtSecret,
      { expiresIn: '7d' }
    );

    res.status(200).json({
      token,
      mustChangePassword: Boolean(user.mustChangePassword),
      user: {
        id: user._id,
        phone: user.phone,
        username: user.username,
        email: user.email,
        displayName: user.displayName || user.username || 'Team Member',
        role: user.role,
        adminRole: user.adminRole,
        adminDepartment: user.adminDepartment,
        employeeRole: user.employeeRole,
        vendorId: user.vendorId,
        language: user.language || 'en',
        mustChangePassword: Boolean(user.mustChangePassword),
        permissions,
      },
    });
  } catch (err: any) {
    console.error('[loginWithPassword] Error:', err);
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Authentication failed due to server error' } });
  }
};

export const changePassword = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } });
      return;
    }

    const { oldPassword, newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      res.status(400).json({
        error: { code: 'BAD_REQUEST', message: 'New password must be at least 6 characters long.' },
      });
      return;
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      res.status(404).json({ error: { code: 'USER_NOT_FOUND', message: 'User account not found' } });
      return;
    }

    // If user has a password and is not flagged mustChangePassword, verify oldPassword
    if (user.password && !user.mustChangePassword && oldPassword) {
      const isOldMatch = await bcrypt.compare(oldPassword, user.password);
      if (!isOldMatch) {
        res.status(400).json({ error: { code: 'INVALID_OLD_PASSWORD', message: 'Current password is incorrect.' } });
        return;
      }
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    user.password = hashedPassword;
    user.mustChangePassword = false;
    user.plainTempPassword = undefined;
    await user.save();

    const permissions = await resolveUserPermissions(user);

    // Reissue refreshed JWT token
    const token = jwt.sign(
      {
        id: user._id.toString(),
        phone: user.phone,
        displayName: user.displayName || user.username || user.phone,
        username: user.username,
        role: user.role,
        adminRole: user.adminRole,
        adminDepartment: user.adminDepartment,
        permissions,
        employeeRole: user.employeeRole,
        vendorId: user.vendorId?.toString(),
        mustChangePassword: false,
      },
      config.jwtSecret,
      { expiresIn: '7d' }
    );

    res.status(200).json({
      success: true,
      message: 'Password successfully updated! You can now use your new password.',
      token,
      user: {
        id: user._id,
        phone: user.phone,
        username: user.username,
        email: user.email,
        displayName: user.displayName,
        role: user.role,
        employeeRole: user.employeeRole,
        vendorId: user.vendorId,
        mustChangePassword: false,
        permissions,
      },
    });
  } catch (err: any) {
    console.error('[changePassword] Error:', err);
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to update password' } });
  }
};


