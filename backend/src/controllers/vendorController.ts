import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth.js';
import { Vendor } from '../models/Vendor.js';

export const registerVendor = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const ownerId = req.user?.id;
    const { businessName, contactPhone, contactEmail, serviceAreas, servicesOffered } = req.body;

    if (!businessName || !contactPhone) {
      res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'Business name and contact phone are required' } });
      return;
    }

    const vendor = await Vendor.create({
      ownerId,
      businessName,
      contactPhone,
      contactEmail,
      serviceAreas: serviceAreas || [],
      servicesOffered: servicesOffered || ['packing', 'loading', 'transport', 'unloading'],
      status: 'APPROVED', // Basic setup: auto-approve for testing (full setup: PENDING_REVIEW -> admin approval)
    });

    res.status(201).json({ vendor });
  } catch (error) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to register vendor' } });
  }
};

export const getVendorProfile = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const vendor = await Vendor.findOne({ ownerId: req.user?.id });
    if (!vendor) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Vendor profile not found' } });
      return;
    }
    res.status(200).json({ vendor });
  } catch (error) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to fetch vendor profile' } });
  }
};
