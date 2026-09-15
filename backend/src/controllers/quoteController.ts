import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth.js';
import { Quote } from '../models/Quote.js';
import { Vendor } from '../models/Vendor.js';
import { MovingRequest } from '../models/MovingRequest.js';
import { User } from '../models/User.js';

/**
 * Submit a quotation for a moving request or create a direct client quotation.
 * Can be called via POST /requests/:requestId/quotes OR POST /vendor/quotations
 */
export const submitQuote = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    let requestId = (req.params.requestId || req.body.requestId) as string | undefined;
    const {
      customerName,
      customerPhone,
      pickupAddress,
      destinationAddress,
      preferredDate,
      preferredTimeSlot,
      items,
      requestedServices,
      category,
      totalAmountMinorUnits,
      totalAmount,
      currency = 'INR',
      vehicleType,
      vehicleSpecs,
      crewCount,
      crewRoles,
      splitCharges,
      itemizedServices,
      inclusions,
      exclusions,
      assumptions,
      validUntil,
    } = req.body;

    // Resolve vendor context
    let vendor = req.vendor;
    if (!vendor) {
      vendor = await Vendor.findOne({ ownerId: req.user?.id });
    }
    if (!vendor) {
      res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Vendor profile not found or unauthorized' } });
      return;
    }

    let movingRequest: any = null;

    if (requestId) {
      movingRequest = await MovingRequest.findById(requestId);
      if (!movingRequest || movingRequest.status !== 'OPEN') {
        res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'Request is not open for quotations' } });
        return;
      }

      // Check if vendor has already submitted an active quote for this request
      const existingQuote = await Quote.findOne({
        requestId,
        vendorId: vendor._id,
        status: { $in: ['SUBMITTED', 'ACCEPTED'] },
      });

      if (existingQuote) {
        res.status(400).json({
          error: {
            code: 'DUPLICATE_QUOTE',
            message: 'You have already submitted an active quotation for this moving request',
          },
        });
        return;
      }
    } else {
      // Direct / Walk-in Customer Quotation creation
      if (!pickupAddress || !destinationAddress) {
        res.status(400).json({
          error: {
            code: 'BAD_REQUEST',
            message: 'Pickup address and destination address are required to create a direct quotation',
          },
        });
        return;
      }

      const phoneToUse = customerPhone && String(customerPhone).trim() ? String(customerPhone).trim() : `+91${Date.now().toString().slice(-10)}`;
      let customer = await User.findOne({ phone: phoneToUse });
      if (!customer) {
        customer = await User.create({
          phone: phoneToUse,
          displayName: (customerName && String(customerName).trim()) || 'Walk-in Client',
          role: 'customer',
          accountStatus: 'active',
        });
      }

      const formattedPickup = typeof pickupAddress === 'string'
        ? { street: pickupAddress, city: 'Origin City', postalCode: '560001', floor: 0, hasLift: false, parkingDistanceMeters: 10 }
        : {
            street: pickupAddress.street || 'Pickup Street',
            city: pickupAddress.city || 'Bangalore',
            postalCode: pickupAddress.postalCode || '560001',
            floor: Number(pickupAddress.floor) || 0,
            hasLift: Boolean(pickupAddress.hasLift),
            parkingDistanceMeters: Number(pickupAddress.parkingDistanceMeters) || 10,
          };

      const formattedDest = typeof destinationAddress === 'string'
        ? { street: destinationAddress, city: 'Destination City', postalCode: '560001', floor: 0, hasLift: false, parkingDistanceMeters: 10 }
        : {
            street: destinationAddress.street || 'Drop Street',
            city: destinationAddress.city || 'Destination City',
            postalCode: destinationAddress.postalCode || '560001',
            floor: Number(destinationAddress.floor) || 0,
            hasLift: Boolean(destinationAddress.hasLift),
            parkingDistanceMeters: Number(destinationAddress.parkingDistanceMeters) || 10,
          };

      movingRequest = await MovingRequest.create({
        customerId: customer._id,
        pickupAddress: formattedPickup,
        destinationAddress: formattedDest,
        preferredDate: preferredDate ? new Date(preferredDate) : new Date(Date.now() + 48 * 3600 * 1000),
        preferredTimeSlot: preferredTimeSlot || 'Morning (8:00 AM - 12:00 PM)',
        items: Array.isArray(items) && items.length > 0 ? items : [{ name: 'Household Moving Inventory', quantity: 1 }],
        requestedServices: Array.isArray(requestedServices) && requestedServices.length > 0 ? requestedServices : ['Packers and Movers', 'Loading & Doorstep Unloading'],
        category: category || 'Heavy Load House Shifting',
        revision: 1,
        status: 'OPEN',
      });

      requestId = movingRequest._id.toString();
    }

    // Process split charges if provided
    let processedSplit: any = undefined;
    let sumFromSplitMinor = 0;
    if (splitCharges && typeof splitCharges === 'object') {
      const toMinor = (val: any) => {
        const num = parseFloat(val);
        return isNaN(num) ? 0 : Math.round(num * 100);
      };

      processedSplit = {
        freightMinorUnits: splitCharges.freightMinorUnits !== undefined ? Number(splitCharges.freightMinorUnits) : toMinor(splitCharges.freight || splitCharges.baseFreight),
        packingMaterialsMinorUnits: splitCharges.packingMaterialsMinorUnits !== undefined ? Number(splitCharges.packingMaterialsMinorUnits) : toMinor(splitCharges.packingMaterials || splitCharges.packing),
        loadingUnloadingMinorUnits: splitCharges.loadingUnloadingMinorUnits !== undefined ? Number(splitCharges.loadingUnloadingMinorUnits) : toMinor(splitCharges.loadingUnloading || splitCharges.loading),
        dismantlingAssemblyMinorUnits: splitCharges.dismantlingAssemblyMinorUnits !== undefined ? Number(splitCharges.dismantlingAssemblyMinorUnits) : toMinor(splitCharges.dismantlingAssembly || splitCharges.assembly),
        insuranceMinorUnits: splitCharges.insuranceMinorUnits !== undefined ? Number(splitCharges.insuranceMinorUnits) : toMinor(splitCharges.insurance),
        taxGstMinorUnits: splitCharges.taxGstMinorUnits !== undefined ? Number(splitCharges.taxGstMinorUnits) : toMinor(splitCharges.taxGst || splitCharges.gst),
        otherMinorUnits: splitCharges.otherMinorUnits !== undefined ? Number(splitCharges.otherMinorUnits) : toMinor(splitCharges.other || splitCharges.handling),
      };

      sumFromSplitMinor =
        processedSplit.freightMinorUnits +
        processedSplit.packingMaterialsMinorUnits +
        processedSplit.loadingUnloadingMinorUnits +
        processedSplit.dismantlingAssemblyMinorUnits +
        processedSplit.insuranceMinorUnits +
        processedSplit.taxGstMinorUnits +
        processedSplit.otherMinorUnits;
    }

    // Resolve total amount in minor units (Paise)
    let amountMinor = totalAmountMinorUnits;
    if (amountMinor === undefined && totalAmount !== undefined) {
      amountMinor = Math.round(Number(totalAmount) * 100);
    }
    if ((amountMinor === undefined || amountMinor <= 0) && sumFromSplitMinor > 0) {
      amountMinor = sumFromSplitMinor;
    }

    if (!amountMinor || isNaN(amountMinor) || amountMinor <= 0) {
      res.status(400).json({ error: { code: 'INVALID_AMOUNT', message: 'A valid total quotation amount is required' } });
      return;
    }

    // Format itemized services (if not provided, generate from split charges)
    let formattedServices: any[] = [];
    if (Array.isArray(itemizedServices) && itemizedServices.length > 0) {
      formattedServices = itemizedServices.map((s: any) => ({
        serviceName: s.serviceName || s.name || 'Service',
        amountMinorUnits: s.amountMinorUnits || (s.amount ? Math.round(Number(s.amount) * 100) : 0),
      }));
    } else if (processedSplit) {
      if (processedSplit.freightMinorUnits > 0) {
        formattedServices.push({ serviceName: `Freight & Vehicle Transit (${vehicleType || 'Transport'})`, amountMinorUnits: processedSplit.freightMinorUnits });
      }
      if (processedSplit.packingMaterialsMinorUnits > 0) {
        formattedServices.push({ serviceName: 'Professional Packing Materials & Packaging', amountMinorUnits: processedSplit.packingMaterialsMinorUnits });
      }
      if (processedSplit.loadingUnloadingMinorUnits > 0) {
        formattedServices.push({ serviceName: `Loading & Doorstep Unloading (${crewCount || 3} Crew)`, amountMinorUnits: processedSplit.loadingUnloadingMinorUnits });
      }
      if (processedSplit.dismantlingAssemblyMinorUnits > 0) {
        formattedServices.push({ serviceName: 'Furniture Dismantling & Reassembly', amountMinorUnits: processedSplit.dismantlingAssemblyMinorUnits });
      }
      if (processedSplit.insuranceMinorUnits > 0) {
        formattedServices.push({ serviceName: 'Transit Protection & Insurance', amountMinorUnits: processedSplit.insuranceMinorUnits });
      }
      if (processedSplit.taxGstMinorUnits > 0) {
        formattedServices.push({ serviceName: 'Applicable Taxes & GST', amountMinorUnits: processedSplit.taxGstMinorUnits });
      }
      if (processedSplit.otherMinorUnits > 0) {
        formattedServices.push({ serviceName: 'Handling & Incidental Charges', amountMinorUnits: processedSplit.otherMinorUnits });
      }
    }

    const quote = await Quote.create({
      requestId,
      vendorId: vendor._id,
      requestRevision: movingRequest.revision,
      quoteRevision: 1,
      totalAmountMinorUnits: amountMinor,
      currency,
      vehicleType: vehicleType || 'Standard Closed Container Truck',
      vehicleSpecs: vehicleSpecs || '',
      crewCount: crewCount ? Number(crewCount) : 3,
      crewRoles: crewRoles || '1 Driver & Supervisor, 2 Professional Packers/Loaders',
      splitCharges: processedSplit,
      itemizedServices: formattedServices,
      inclusions: Array.isArray(inclusions) ? inclusions : [],
      exclusions: Array.isArray(exclusions) ? exclusions : [],
      assumptions: Array.isArray(assumptions) ? assumptions : [],
      validUntil: validUntil ? new Date(validUntil) : new Date(Date.now() + 48 * 60 * 60 * 1000), // 48h validity
      status: 'SUBMITTED',
    });

    const populatedQuote = await Quote.findById(quote._id).populate({
      path: 'requestId',
      select: 'pickupAddress destinationAddress preferredDate preferredTimeSlot items requestedServices status commonRejectionFeedback revision createdAt customerId',
      populate: {
        path: 'customerId',
        select: 'displayName phone email',
      },
    });

    res.status(201).json({
      message: 'Quotation submitted successfully',
      quote: populatedQuote || quote,
    });
  } catch (error) {
    console.error('[submitQuote] Error:', error);
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to submit quote' } });
  }
};

/**
 * GET /api/v1/requests/:requestId/quotes
 * Customer / Admin views active quotes submitted for a request.
 */
export const getQuotesForRequest = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const requestId = req.params.requestId as string;
    const quotes = await Quote.find({ requestId, status: 'SUBMITTED' })
      .populate('vendorId', 'businessName contactPhone contactEmail rating')
      .sort({ createdAt: -1 });

    res.status(200).json({ quotes });
  } catch (error) {
    console.error('[getQuotesForRequest] Error:', error);
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to fetch quotes' } });
  }
};

/**
 * GET /api/v1/vendor/quotations
 * Fetch all quotations submitted by this vendor with request details and status.
 */
export const getVendorQuotations = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    let vendor = req.vendor;
    if (!vendor) {
      vendor = await Vendor.findOne({ ownerId: req.user?.id });
    }
    if (!vendor) {
      res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Vendor context required' } });
      return;
    }

    const { status, search, page = '1', limit = '20' } = req.query;
    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(limit as string, 10) || 20));

    const filter: any = { vendorId: vendor._id };

    if (status) {
      if (status === 'REJECTED') {
        filter.status = { $in: ['NOT_SELECTED', 'REJECTED'] };
      } else {
        filter.status = status;
      }
    }

    const total = await Quote.countDocuments(filter);

    const quotations = await Quote.find(filter)
      .populate({
        path: 'requestId',
        select: 'pickupAddress destinationAddress preferredDate preferredTimeSlot items requestedServices status commonRejectionFeedback revision createdAt customerId',
        populate: {
          path: 'customerId',
          select: 'displayName phone email',
        },
      })
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum);

    // Filter by search query if provided (matching city, customer name, phone, or request ID)
    let filteredList = quotations;
    if (search && typeof search === 'string') {
      const q = search.toLowerCase();
      filteredList = quotations.filter((item: any) => {
        const reqDoc = item.requestId;
        if (!reqDoc) return false;
        const pickupCity = reqDoc.pickupAddress?.city?.toLowerCase() || '';
        const destCity = reqDoc.destinationAddress?.city?.toLowerCase() || '';
        const idStr = reqDoc._id?.toString().toLowerCase() || '';
        const quoteIdStr = item._id?.toString().toLowerCase() || '';
        const customerName = (reqDoc.customerId as any)?.displayName?.toLowerCase() || '';
        const customerPhone = (reqDoc.customerId as any)?.phone?.toLowerCase() || '';
        return pickupCity.includes(q) || destCity.includes(q) || idStr.includes(q) || quoteIdStr.includes(q) || customerName.includes(q) || customerPhone.includes(q);
      });
    }

    // Ensure Vendor NEVER sees competitor data in the response
    const sanitizedQuotes = filteredList.map((item: any) => {
      const obj = item.toObject ? item.toObject() : item;
      const isRejected = obj.status === 'NOT_SELECTED' || obj.status === 'REJECTED';
      
      // Only attach customer common rejection feedback if quote was rejected
      if (obj.requestId && typeof obj.requestId === 'object' && !isRejected) {
        delete (obj.requestId as any).commonRejectionFeedback;
      }
      return obj;
    });

    res.status(200).json({
      quotations: sanitizedQuotes,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
    });
  } catch (error) {
    console.error('[getVendorQuotations] Error:', error);
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to fetch vendor quotations' } });
  }
};

/**
 * GET /api/v1/vendor/quotations/:id
 * Detailed view of a single vendor quotation. Strictly isolated to the owning vendor.
 */
export const getVendorQuoteById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    let vendor = req.vendor;
    if (!vendor) {
      vendor = await Vendor.findOne({ ownerId: req.user?.id });
    }
    if (!vendor) {
      res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Vendor context required' } });
      return;
    }

    const { id } = req.params;
    const quote = await Quote.findOne({ _id: id, vendorId: vendor._id }).populate({
      path: 'requestId',
      select: 'pickupAddress destinationAddress preferredDate preferredTimeSlot items requestedServices status commonRejectionFeedback revision createdAt customerId',
      populate: {
        path: 'customerId',
        select: 'displayName phone email',
      },
    });

    if (!quote) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Quotation not found' } });
      return;
    }

    const obj = quote.toObject();
    const isRejected = obj.status === 'NOT_SELECTED' || obj.status === 'REJECTED';
    if (obj.requestId && typeof obj.requestId === 'object' && !isRejected) {
      delete (obj.requestId as any).commonRejectionFeedback;
    }

    res.status(200).json({ quotation: obj });
  } catch (error) {
    console.error('[getVendorQuoteById] Error:', error);
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to fetch quotation' } });
  }
};

/**
 * GET /api/v1/vendor/requests/available
 * Fetch moving requests available for this vendor to quote.
 */
export const getAvailableRequestsForVendor = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    let vendor = req.vendor;
    if (!vendor) {
      vendor = await Vendor.findOne({ ownerId: req.user?.id });
    }
    if (!vendor) {
      res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Vendor context required' } });
      return;
    }

    const { search, city, unquotedOnly, page = '1', limit = '20' } = req.query;
    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(limit as string, 10) || 20));

    // Find all quotes submitted by this vendor
    const vendorQuotes = await Quote.find({ vendorId: vendor._id }).select('requestId status');
    const quotedRequestIds = new Set(vendorQuotes.map((q) => q.requestId.toString()));

    const query: any = { status: 'OPEN' };

    if (city && typeof city === 'string') {
      query.$or = [
        { 'pickupAddress.city': { $regex: city, $options: 'i' } },
        { 'destinationAddress.city': { $regex: city, $options: 'i' } },
      ];
    }

    if (search && typeof search === 'string') {
      const s = search.trim();
      query.$or = [
        { 'pickupAddress.city': { $regex: s, $options: 'i' } },
        { 'destinationAddress.city': { $regex: s, $options: 'i' } },
        { 'pickupAddress.street': { $regex: s, $options: 'i' } },
        { 'destinationAddress.street': { $regex: s, $options: 'i' } },
      ];
    }

    let requests = await MovingRequest.find(query)
      .sort({ preferredDate: 1, createdAt: -1 })
      .lean();

    // Attach hasQuoted and existingQuoteStatus
    let enriched = requests.map((r: any) => {
      const q = vendorQuotes.find((vq) => vq.requestId.toString() === r._id.toString());
      return {
        ...r,
        hasQuoted: !!q,
        quoteStatus: q ? q.status : null,
      };
    });

    if (unquotedOnly === 'true') {
      enriched = enriched.filter((r) => !r.hasQuoted);
    }

    const total = enriched.length;
    const paginated = enriched.slice((pageNum - 1) * limitNum, pageNum * limitNum);

    res.status(200).json({
      requests: paginated,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
    });
  } catch (error) {
    console.error('[getAvailableRequestsForVendor] Error:', error);
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to fetch available requests' } });
  }
};

/**
 * POST /api/v1/requests/:requestId/quotes/:quoteId/reject
 * Customer rejects an individual quotation.
 */
export const rejectQuote = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { requestId, quoteId } = req.params;
    const quote = await Quote.findOne({ _id: quoteId, requestId });
    if (!quote) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Quote not found' } });
      return;
    }

    quote.status = 'NOT_SELECTED';
    await quote.save();

    // Check if there are any remaining SUBMITTED quotes for this request
    const remainingQuotes = await Quote.countDocuments({ requestId, status: 'SUBMITTED' });

    res.status(200).json({
      message: 'Quotation rejected successfully',
      quote,
      allQuotesRejected: remainingQuotes === 0,
    });
  } catch (error) {
    console.error('[rejectQuote] Error:', error);
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to reject quotation' } });
  }
};
