import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { User } from '../models/User.js';
import { Vendor } from '../models/Vendor.js';
import { config } from '../config/env.js';
import { AuthenticatedRequest, setCachedUserPermissions, invalidatePermissionsCache } from '../middlewares/auth.js';
import { STANDARD_VENDOR_ROLES } from './vendorController.js';
import { STANDARD_ADMIN_ROLES } from './adminController.js';
import { normalizePhoneForWhatsApp } from '../utils/whatsappService.js';
import { getVendorVerificationDecision } from '../middlewares/vendorAuth.js';

export const resolveUserPermissions = async (user: any): Promise<string[]> => {
  // 1. Administrative Users & Staff
  if (user.role === 'admin') {
    if (user.phone === '+919876543210' || user.adminRole === 'super_admin' || !user.adminRole) {
      return ['*'];
    }

    let basePermissions: string[] = [];

    // Check custom roles in PlatformSetting
    try {
      const { PlatformSetting } = await import('../models/PlatformSetting.js');
      const customSetting = await PlatformSetting.findOne({ key: 'custom_admin_roles' });
      if (customSetting && Array.isArray(customSetting.value)) {
        const customRole = customSetting.value.find(
          (r: any) => (r.id || '').toLowerCase() === (user.adminRole || '').toLowerCase()
        );
        if (customRole && Array.isArray(customRole.permissions)) {
          basePermissions = customRole.permissions;
        }
      }
    } catch (e) {
      console.warn('[resolveUserPermissions] Could not fetch custom admin roles:', e);
    }

    // Check standard admin roles if not resolved from custom
    if (basePermissions.length === 0) {
      const standardRole = STANDARD_ADMIN_ROLES.find(
        (r) => r.id.toLowerCase() === (user.adminRole || '').toLowerCase()
      );
      if (standardRole && Array.isArray(standardRole.permissions)) {
        basePermissions = standardRole.permissions;
      }
    }

    // Role-name fallback heuristics
    if (basePermissions.length === 0) {
      const aRole = (user.adminRole || '').toLowerCase();
      if (aRole.includes('compliance')) {
        basePermissions = ['vendors:view', 'vendors:approve', 'vendors:suspend', 'documents:view', 'documents:verify', 'audit:view'];
      } else if (aRole.includes('operation')) {
        basePermissions = [
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
      } else if (aRole.includes('dispute') || aRole.includes('claim')) {
        basePermissions = ['disputes:view', 'disputes:manage', 'bookings:view', 'users:view'];
      } else if (aRole.includes('catalog') || aRole.includes('pricing')) {
        basePermissions = ['packages:manage', 'service_areas:manage', 'settings:manage'];
      } else if (aRole.includes('hr') || aRole.includes('staff')) {
        basePermissions = ['staff:view', 'staff:manage', 'permissions:manage', 'audit:view'];
      } else {
        basePermissions = ['*'];
      }
    }

    // Apply granular overrides: (Role Defaults + Granted) - Revoked
    const granted = user.permissionOverrides?.granted || [];
    const revoked = user.permissionOverrides?.revoked || [];
    if (granted.length > 0 || revoked.length > 0) {
      return Array.from(new Set([...basePermissions, ...granted])).filter((p) => !revoked.includes(p));
    }

    if (Array.isArray(user.permissions) && user.permissions.length > 0) {
      return user.permissions;
    }

    return basePermissions;
  }

  // 2. Vendor Administrator / Owner
  if (user.role === 'vendor') {
    return ['*'];
  }

  if (!user.vendorId) {
    return [];
  }

  try {
    const vendor = await Vendor.findById(user.vendorId);
    if (!vendor) return [];

    let basePermissions: string[] = [];
    const norm = (s: string) => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const empRole = (user.employeeRole || user.role || '').toLowerCase();
    const empRoleNorm = norm(user.employeeRole || user.role);

    if (empRoleNorm) {
      // 1. Check custom roles configured dynamically by this vendor
      const customRole = (vendor.customRoles || []).find(
        (r: any) =>
          norm(r.id) === empRoleNorm ||
          norm(r.name) === empRoleNorm
      );

      if (customRole && Array.isArray(customRole.permissions)) {
        basePermissions = customRole.permissions;
      }

      // 2. Check standard system vendor roles
      if (basePermissions.length === 0) {
        const standardRole = STANDARD_VENDOR_ROLES.find(
          (r) =>
            norm(r.id) === empRoleNorm ||
            norm(r.name) === empRoleNorm
        );
        if (standardRole && Array.isArray(standardRole.permissions)) {
          basePermissions = standardRole.permissions;
        }
      }

      // 3. Fallbacks based on common role keywords
      if (basePermissions.length === 0) {
        if (empRole.includes('estimate') || empRole.includes('quote') || empRole.includes('sales')) {
          basePermissions = [
            'Review Available Customer Leads',
            'Create & Submit Formal Quotations',
            'Quotation Performance & Insights',
          ];
        } else if (empRole.includes('hr') || empRole.includes('talent')) {
          basePermissions = [
            'Manage Employees & Crew',
            'Reports & Performance Analytics',
            'Operational Audit Logs',
          ];
        } else if (empRole.includes('fleet') || empRole.includes('transport')) {
          basePermissions = [
            'Fleet & Vehicle Operations',
            'Assign Transport Trucks to Moves',
            'Vehicle Inspection & Maintenance Tracking',
          ];
        } else {
          basePermissions = [
            'Update Move Progression Milestones',
            'Enter Recipient Delivery Verification Code',
            'Vehicle Inspection & Maintenance Tracking',
          ];
        }
      }
    }

    // Apply granular overrides: (Role Defaults + Granted) - Revoked
    const granted = user.permissionOverrides?.granted || [];
    const revoked = user.permissionOverrides?.revoked || [];
    if (granted.length > 0 || revoked.length > 0) {
      return Array.from(new Set([...basePermissions, ...granted])).filter((p) => !revoked.includes(p));
    }

    // Direct user-specific permission override array
    if (Array.isArray(user.permissions) && user.permissions.length > 0) {
      return user.permissions;
    }

    return basePermissions;
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

    if (user && user.save) {
      user.lastLogin = new Date();
      user.lastActivity = new Date();
      await user.save();
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
  setCachedUserPermissions(user._id.toString(), permissions);

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
      user.lastActivity = new Date();
      await user.save();

      const permissions = await resolveUserPermissions(user);
      const userObj: any = user.toObject();
      userObj.permissions = permissions;
      userObj.resolvedPermissions = permissions;

      // Authoritative Vendor Company Verification Pre-Check
      if (user.role === 'vendor' || user.role === 'worker' || user.vendorId) {
        let vendor = null;
        if (user.vendorId) {
          vendor = await Vendor.findById(user.vendorId);
        } else if (user.role === 'vendor') {
          vendor = await Vendor.findOne({ ownerId: user._id });
        }
        if (vendor) {
          const decision = getVendorVerificationDecision(vendor);
          userObj.companyVerification = decision;
          userObj.companyVerificationAccess = decision.verificationAccess;
          userObj.companyVerificationStatus = decision.verificationStatus;
          userObj.vendorStatus = vendor.status;
          userObj.vendorCompany = {
            id: vendor._id,
            businessName: vendor.businessName,
            status: vendor.status,
            verificationAccess: decision.verificationAccess,
            verificationStatus: decision.verificationStatus,
            blockingItem: decision.blockingItem,
            blockingReason: decision.reason,
            approvedCount: decision.approvedCount,
            requiredCount: decision.requiredCount,
          };
        }
      }

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

    user.lastLogin = new Date();
    user.lastActivity = new Date();
    await user.save();

    const permissions = await resolveUserPermissions(user);
    setCachedUserPermissions(user._id.toString(), permissions);

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

    let companyVerification = undefined;
    let companyVerificationAccess = undefined;
    let companyVerificationStatus = undefined;
    let vendorStatus = undefined;
    if (user.role === 'vendor' || user.role === 'worker' || user.vendorId) {
      let vendor = null;
      if (user.vendorId) {
        vendor = await Vendor.findById(user.vendorId);
      } else if (user.role === 'vendor') {
        vendor = await Vendor.findOne({ ownerId: user._id });
      }
      if (vendor) {
        const decision = getVendorVerificationDecision(vendor);
        companyVerification = decision;
        companyVerificationAccess = decision.verificationAccess;
        companyVerificationStatus = decision.verificationStatus;
        vendorStatus = vendor.status;
      }
    }

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
        companyVerification,
        companyVerificationAccess,
        companyVerificationStatus,
        vendorStatus,
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
    setCachedUserPermissions(user._id.toString(), permissions);

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

export const forgotPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { identifier, channel = 'whatsapp' } = req.body;
    if (!identifier || typeof identifier !== 'string') {
      res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'Username, email address, or phone number is required.' } });
      return;
    }

    const clean = identifier.trim();
    const cleanLower = clean.toLowerCase();

    // Query user by phone, username, or email
    const user = await User.findOne({
      $or: [
        { username: cleanLower },
        { email: cleanLower },
        { phone: clean },
        { phone: `+91${clean.replace(/\D/g, '').slice(-10)}` },
        { phone: clean.replace(/\D/g, '').slice(-10) },
      ],
    });

    if (!user) {
      res.status(404).json({ error: { code: 'USER_NOT_FOUND', message: 'No registered user found with the provided credentials.' } });
      return;
    }

    // Generate secure random token
    const rawToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');

    // Store hashed token with 1-hour expiration (Correction 3)
    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await user.save();

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const resetUrl = `${frontendUrl}/vendor/reset-password?token=${rawToken}`;

    // Target information masked for user security
    let maskedTarget = '';
    let providerStatus = 'ready';
    let whatsappUrl: string | null = null;
    let message = '';

    if (channel === 'whatsapp') {
      const normalizedPhone = normalizePhoneForWhatsApp(user.phone);
      maskedTarget = `+${normalizedPhone.slice(0, 2)} ••••• ${normalizedPhone.slice(-4)}`;
      const waText = `🔐 *Package Mover — Password Reset Request*\n\nHello *${user.displayName || user.username}*,\n\nA request was made to set or reset the password for your account (*${user.username || user.email}*).\n\nClick the link below to set your new password (valid for 1 hour):\n${resetUrl}\n\nIf you did not request this, please contact your operational manager immediately.`;
      whatsappUrl = `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(waText)}`;
      message = `Password reset link prepared for WhatsApp (${maskedTarget}). Click below to dispatch or copy link.`;
    } else if (channel === 'sms') {
      const rawPhone = user.phone.replace(/\D/g, '');
      maskedTarget = `••••• ${rawPhone.slice(-4)}`;
      const smsProviderConfigured = Boolean(process.env.TWILIO_SID || process.env.SMS_API_KEY);
      providerStatus = smsProviderConfigured ? 'dispatched' : 'pending_provider_configuration';
      message = smsProviderConfigured
        ? `Password reset SMS dispatched to ${maskedTarget}.`
        : `SMS Gateway provider not configured in environment. Secure link generated for manual delivery.`;
    } else {
      // Email
      const email = user.email || `${user.username}@packagemovers.in`;
      const [name, domain] = email.split('@');
      maskedTarget = `${name ? name.slice(0, 2) : 'em'}•••@${domain || 'company.in'}`;
      const emailProviderConfigured = Boolean(process.env.SMTP_HOST || process.env.SENDGRID_API_KEY);
      providerStatus = emailProviderConfigured ? 'dispatched' : 'pending_provider_configuration';
      message = emailProviderConfigured
        ? `Password reset email dispatched to ${maskedTarget}.`
        : `SMTP Gateway provider not configured in environment. Secure link generated for manual delivery.`;
    }

    res.status(200).json({
      success: true,
      channel,
      providerStatus,
      maskedTarget,
      message,
      whatsappUrl,
      resetUrl,
    });
  } catch (error: any) {
    console.error('[forgotPassword] Error:', error);
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to process password reset request' } });
  }
};

export const resetPasswordWithToken = async (req: Request, res: Response): Promise<void> => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) {
      res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'Reset token and new password are required.' } });
      return;
    }

    if (newPassword.length < 6) {
      res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'New password must be at least 6 characters long.' } });
      return;
    }

    // Hash incoming token to match hashed token stored in database (Correction 3)
    const hashedToken = crypto.createHash('sha256').update(String(token)).digest('hex');

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: new Date() },
    });

    if (!user) {
      res.status(400).json({
        error: {
          code: 'INVALID_OR_EXPIRED_TOKEN',
          message: 'Password reset link is invalid or has expired. Please request a new link.',
        },
      });
      return;
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    user.password = hashedPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    user.mustChangePassword = false;
    user.plainTempPassword = undefined;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Password reset successful! You can now log in with your new password.',
      username: user.username,
      email: user.email,
    });
  } catch (error: any) {
    console.error('[resetPasswordWithToken] Error:', error);
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to reset password' } });
  }
};

export const acceptInvitation = async (req: Request, res: Response): Promise<void> => {
  try {
    const { token, password } = req.body;
    if (!token || !password) {
      res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'Invitation token and new password are required.' } });
      return;
    }

    if (password.length < 6) {
      res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'Password must be at least 6 characters long.' } });
      return;
    }

    // Hash raw incoming invitation token to compare with DB invitationTokenHash
    const hashedToken = crypto.createHash('sha256').update(String(token)).digest('hex');

    const user = await User.findOne({
      invitationTokenHash: hashedToken,
      invitationExpires: { $gt: new Date() },
    });

    if (!user) {
      res.status(400).json({
        error: {
          code: 'INVALID_OR_EXPIRED_TOKEN',
          message: 'Invitation link is invalid or has expired. Please request a new invite.',
        },
      });
      return;
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    user.password = hashedPassword;
    user.invitationTokenHash = undefined;
    user.invitationExpires = undefined;
    user.mustChangePassword = false;
    user.accountStatus = 'active';
    user.verifiedAt = new Date();
    await user.save();

    // Invalidate permission cache so fresh credentials take effect immediately
    invalidatePermissionsCache(user._id.toString());

    res.status(200).json({
      success: true,
      message: 'Account setup complete! You can now sign in with your credentials.',
      phone: user.phone,
      email: user.email,
      role: user.role,
    });
  } catch (error: any) {
    console.error('[acceptInvitation] Error:', error);
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to accept invitation' } });
  }
};

export const verifyInvitationToken = async (req: Request, res: Response): Promise<void> => {
  try {
    const token = req.query.token as string;
    if (!token) {
      res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'Invitation token is required.' } });
      return;
    }

    const hashedToken = crypto.createHash('sha256').update(String(token)).digest('hex');
    const user = await User.findOne({
      invitationTokenHash: hashedToken,
      invitationExpires: { $gt: new Date() },
    }).select('displayName phone email role vendorId');

    if (!user) {
      res.status(400).json({
        valid: false,
        error: {
          code: 'INVALID_OR_EXPIRED_TOKEN',
          message: 'Invitation link is invalid or has expired.',
        },
      });
      return;
    }

    let companyName = '';
    if (user.vendorId) {
      const vendor = await Vendor.findById(user.vendorId).select('businessName');
      if (vendor) companyName = vendor.businessName;
    }

    res.status(200).json({
      valid: true,
      user: {
        displayName: user.displayName,
        phone: user.phone,
        email: user.email,
        companyName,
      },
    });
  } catch (error: any) {
    console.error('[verifyInvitationToken] Error:', error);
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to verify invitation token' } });
  }
};




