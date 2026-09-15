import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth.js';
import { MovingRequest } from '../models/MovingRequest.js';
import { Quote } from '../models/Quote.js';

export const createRequest = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const customerId = req.user?.id;
    const { pickupAddress, destinationAddress, preferredDate, preferredTimeSlot, items, requestedServices } = req.body;

    if (!pickupAddress || !destinationAddress || !preferredDate) {
      res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'Missing required request fields' } });
      return;
    }

    const movingRequest = await MovingRequest.create({
      customerId,
      pickupAddress,
      destinationAddress,
      preferredDate,
      preferredTimeSlot,
      items: items || [],
      requestedServices: requestedServices || ['packing', 'loading', 'transport', 'unloading'],
      status: 'OPEN',
      revision: 1,
    });

    res.status(201).json({ request: movingRequest });
  } catch (error) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to create request' } });
  }
};

export const getRequests = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userRole = req.user?.role;
    let query: any = {};

    if (userRole === 'customer') {
      query.customerId = req.user?.id;
    } else if (userRole === 'vendor') {
      // Vendors see open requests in their service area (simplified: all OPEN for basic setup)
      query.status = 'OPEN';
    }

    const requests = await MovingRequest.find(query).sort({ createdAt: -1 });
    res.status(200).json({ requests });
  } catch (error) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to fetch requests' } });
  }
};

export const getRequestById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const movingRequest = await MovingRequest.findById(id);

    if (!movingRequest) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Request not found' } });
      return;
    }

    res.status(200).json({ request: movingRequest });
  } catch (error) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to fetch request' } });
  }
};

/**
 * POST /api/v1/requests/:id/reject-all
 * Customer rejects all submitted vendor quotations for this request and optionally provides
 * ONE COMMON rejection reason / feedback that is shared with participating vendors.
 * Feedback is NEVER mandatory; [Skip Feedback] simply leaves feedback empty.
 */
export const rejectAllQuotesAndCloseRequest = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { reasons, comment } = req.body;

    const movingRequest = await MovingRequest.findById(id);
    if (!movingRequest) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Request not found' } });
      return;
    }

    // Ownership check (only customer who created or admin)
    if (req.user?.role === 'customer' && movingRequest.customerId.toString() !== req.user.id) {
      res.status(403).json({ error: { code: 'FORBIDDEN', message: 'You do not own this moving request' } });
      return;
    }

    if (movingRequest.status !== 'OPEN') {
      res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'Request is not currently open for quotations' } });
      return;
    }

    // Mark all active submitted quotes as NOT_SELECTED
    await Quote.updateMany(
      { requestId: movingRequest._id, status: 'SUBMITTED' },
      { status: 'NOT_SELECTED' }
    );

    // If customer provided optional feedback, store it centrally on MovingRequest
    if ((Array.isArray(reasons) && reasons.length > 0) || (typeof comment === 'string' && comment.trim())) {
      movingRequest.commonRejectionFeedback = {
        reasons: Array.isArray(reasons) ? reasons : [],
        comment: typeof comment === 'string' && comment.trim() ? comment.trim() : undefined,
        submittedAt: new Date(),
      };
    }

    movingRequest.status = 'CLOSED';
    await movingRequest.save();

    res.status(200).json({
      message: 'All quotations rejected and moving request closed successfully',
      request: movingRequest,
    });
  } catch (error) {
    console.error('[rejectAllQuotesAndCloseRequest] Error:', error);
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to reject quotations' } });
  }
};
