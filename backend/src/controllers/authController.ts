import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { config } from '../config/env.js';
import { AuthenticatedRequest } from '../middlewares/auth.js';

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

  let user = await User.findOne({ phone });
  if (!user) {
    user = await User.create({
      phone,
      role,
      accountStatus: 'active',
      verifiedAt: new Date(),
    });
  }

  const token = jwt.sign(
    { id: user._id.toString(), phone: user.phone, role: user.role },
    config.jwtSecret,
    { expiresIn: '7d' }
  );

  res.status(200).json({
    token,
    user: {
      id: user._id,
      phone: user.phone,
      displayName: user.displayName,
      role: user.role,
      language: user.language,
    },
  });
};

export const getMe = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } });
    return;
  }

  const user = await User.findById(req.user.id);
  if (!user) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'User not found' } });
    return;
  }

  res.status(200).json({ user });
};
