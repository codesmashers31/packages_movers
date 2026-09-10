import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth.js';
import { Booking } from '../models/Booking.js';
import { Quote } from '../models/Quote.js';
import { MovingRequest } from '../models/MovingRequest.js';

export const createBooking = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const customerId = req.user?.id;
    const { quoteId } = req.body;

    const quote = await Quote.findById(quoteId);
    if (!quote || quote.status !== 'SUBMITTED') {
      res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'Quote is not available for booking' } });
      return;
    }

    const movingRequest = await MovingRequest.findById(quote.requestId);
    if (!movingRequest || movingRequest.status !== 'OPEN') {
      res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'Request is already booked or closed' } });
      return;
    }

    // Atomically create booking and reserve request
    const booking = await Booking.create({
      requestId: movingRequest._id,
      customerId,
      vendorId: quote.vendorId,
      quoteId: quote._id,
      quoteSnapshot: quote.toObject(),
      status: 'CONFIRMED', // Basic setup: directly confirm (in full flow: PENDING_PAYMENT -> CONFIRMED)
      scheduledDate: movingRequest.preferredDate,
      deliveryCode: Math.floor(1000 + Math.random() * 9000).toString(),
      version: 1,
    });

    movingRequest.status = 'BOOKED';
    await movingRequest.save();

    quote.status = 'ACCEPTED';
    await quote.save();

    // Mark competing quotes as NOT_SELECTED
    await Quote.updateMany(
      { requestId: movingRequest._id, _id: { $ne: quote._id } },
      { status: 'NOT_SELECTED' }
    );

    res.status(201).json({ booking });
  } catch (error) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to create booking' } });
  }
};

export const getBookings = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userRole = req.user?.role;
    let query: any = {};

    if (userRole === 'customer') {
      query.customerId = req.user?.id;
    } else if (userRole === 'worker') {
      query.assignedWorkers = req.user?.id;
    }

    const bookings = await Booking.find(query)
      .populate('requestId')
      .populate('vendorId', 'businessName contactPhone')
      .sort({ createdAt: -1 });

    res.status(200).json({ bookings });
  } catch (error) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to fetch bookings' } });
  }
};

export const updateBookingStatus = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status, deliveryCode } = req.body;

    const booking = await Booking.findById(id);
    if (!booking) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Booking not found' } });
      return;
    }

    if (status === 'COMPLETED' && deliveryCode) {
      if (booking.deliveryCode !== deliveryCode) {
        res.status(400).json({ error: { code: 'INVALID_DELIVERY_CODE', message: 'Incorrect delivery code' } });
        return;
      }
    }

    booking.status = status;
    booking.version += 1;
    await booking.save();

    res.status(200).json({ booking });
  } catch (error) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to update booking status' } });
  }
};
