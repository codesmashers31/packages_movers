import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth.js';
import { Quote } from '../models/Quote.js';
import { Vendor } from '../models/Vendor.js';
import { MovingRequest } from '../models/MovingRequest.js';

export const submitQuote = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const requestId = req.params.requestId as string;
    const { totalAmountMinorUnits, currency = 'INR', itemizedServices, inclusions, exclusions, assumptions, validUntil } = req.body;

    const movingRequest = await MovingRequest.findById(requestId);
    if (!movingRequest || movingRequest.status !== 'OPEN') {
      res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'Invalid or closed request' } });
      return;
    }

    const vendor = await Vendor.findOne({ ownerId: req.user?.id });
    if (!vendor) {
      res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Vendor profile not found or not approved' } });
      return;
    }

    const quote = await Quote.create({
      requestId,
      vendorId: vendor._id,
      requestRevision: movingRequest.revision,
      quoteRevision: 1,
      totalAmountMinorUnits,
      currency,
      itemizedServices: itemizedServices || [],
      inclusions: inclusions || [],
      exclusions: exclusions || [],
      assumptions: assumptions || [],
      validUntil: validUntil || new Date(Date.now() + 48 * 60 * 60 * 1000), // 48h validity
      status: 'SUBMITTED',
    });

    res.status(201).json({ quote });
  } catch (error) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to submit quote' } });
  }
};

export const getQuotesForRequest = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const requestId = req.params.requestId as string;
    const quotes = await Quote.find({ requestId, status: 'SUBMITTED' }).populate('vendorId', 'businessName contactPhone');
    res.status(200).json({ quotes });
  } catch (error) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to fetch quotes' } });
  }
};
