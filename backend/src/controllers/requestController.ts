import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth.js';
import { MovingRequest } from '../models/MovingRequest.js';

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
