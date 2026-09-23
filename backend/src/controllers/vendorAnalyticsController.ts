import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth.js';
import { Booking } from '../models/Booking.js';
import { MovingRequest } from '../models/MovingRequest.js';
import { Quote } from '../models/Quote.js';

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

const CATEGORY_OPERATIONAL_ADVISORIES: Record<string, string> = {
  'Heavy Load House Shifting':
    'Heavy load house shifting requires 17ft–24ft multi-axle container trucks, 4+ specialized moving crew members, heavy appliance dollies, and dismantling tools. Alert your fleet and lock in weekend driver schedules.',
  'Standard Family Move':
    'Standard 2BHK family moves require 14ft container vehicles, 3-4 professional packers, multi-layer bubble wrap, and wardrobe carton supplies.',
  'Compact Home Shifting':
    'Compact 1BHK moves require 9ft/10ft mini trucks (Tata Ace / Pickup) and 2 rapid-turnaround helpers. Rapid quoting yields 3.5x higher conversions here.',
  'Corporate & Office Relocation':
    'Commercial moves require after-hours night or weekend dispatch, anti-static IT equipment packaging, and numbered asset tracking systems.',
  'Vehicle & Bike Transit':
    'Automobile transit requires hydraulic vehicle carriers, wheel chocks, and pre-dispatch multi-point inspection checklists.',
};

/**
 * GET /api/v1/vendor/analytics/demand
 * Calculates customer booking demand, regional filtering, and category-wise breakdown per month.
 * Identifies high-demand durations on specific categories (e.g. Heavy Load House Shifting in March).
 */
export const getDemandAnalytics = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { region, category } = req.query;

    // Base match filter for region (if specified and not "ALL" / "All Regions")
    const requestMatch: any = {};
    if (region && typeof region === 'string' && region !== 'ALL' && region !== 'All Regions') {
      requestMatch['pickupAddress.city'] = { $regex: region.trim(), $options: 'i' };
    }
    if (category && typeof category === 'string' && category !== 'ALL' && category !== 'All Categories') {
      requestMatch.category = category.trim();
    }

    // 1. Aggregate MovingRequests by month & category
    const requestCategoryStats = await MovingRequest.aggregate([
      { $match: requestMatch },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            category: { $ifNull: ['$category', 'Heavy Load House Shifting'] },
          },
          requestCount: { $sum: 1 },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]);

    // 2. Aggregate Bookings by month
    const bookingStats = await Booking.aggregate([
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
          },
          bookingCount: { $sum: 1 },
          completedCount: {
            $sum: { $cond: [{ $eq: ['$status', 'COMPLETED'] }, 1, 0] },
          },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]);

    // 3. Aggregate Top Routes
    const routeStats = await MovingRequest.aggregate([
      { $match: requestMatch },
      {
        $group: {
          _id: {
            origin: '$pickupAddress.city',
            destination: '$destinationAddress.city',
          },
          totalMoves: { $sum: 1 },
        },
      },
      { $sort: { totalMoves: -1 } },
      { $limit: 6 },
    ]);

    // 4. Discover all operating regions available in the database
    const rawCities = await MovingRequest.distinct('pickupAddress.city');
    const regionSet = new Set<string>();
    for (const c of rawCities) {
      if (!c) continue;
      if (/bengaluru|bangalore/i.test(c)) regionSet.add('Bengaluru');
      else if (/chennai/i.test(c)) regionSet.add('Chennai');
      else if (/hyderabad/i.test(c)) regionSet.add('Hyderabad');
      else if (/pune/i.test(c)) regionSet.add('Pune');
      else {
        const clean = c.split(',')[0].trim();
        if (clean.length > 2) regionSet.add(clean);
      }
    }
    const availableRegions = ['All Regions', ...Array.from(regionSet).sort()];

    // 5. Discover all categories available in the database
    const rawCategories = await MovingRequest.distinct('category');
    const availableCategories = [
      'All Categories',
      ...rawCategories.filter(Boolean).sort(),
    ];

    interface MonthlyDataEntry {
      year: number;
      month: number;
      label: string;
      monthName: string;
      requests: number;
      bookings: number;
      completed: number;
      totalActivity: number;
      categoryCounts: Record<string, number>;
    }

    // Build monthly map
    const monthlyMap = new Map<string, MonthlyDataEntry>();

    for (const item of requestCategoryStats) {
      const key = `${item._id.year}-${String(item._id.month).padStart(2, '0')}`;
      const monthName = MONTH_NAMES[item._id.month - 1];
      const label = `${monthName} ${item._id.year}`;

      const existing: MonthlyDataEntry = monthlyMap.get(key) || {
        year: item._id.year,
        month: item._id.month,
        label,
        monthName,
        requests: 0,
        bookings: 0,
        completed: 0,
        totalActivity: 0,
        categoryCounts: {},
      };

      existing.requests += item.requestCount || 0;
      existing.totalActivity += item.requestCount || 0;
      const catKey = String(item._id.category || 'Heavy Load House Shifting');
      existing.categoryCounts[catKey] = (existing.categoryCounts[catKey] || 0) + (item.requestCount || 0);

      monthlyMap.set(key, existing);
    }

    for (const item of bookingStats) {
      const key = `${item._id.year}-${String(item._id.month).padStart(2, '0')}`;
      const existing = monthlyMap.get(key);
      if (existing) {
        existing.bookings = item.bookingCount || 0;
        existing.completed = item.completedCount || 0;
        // Total activity includes both customer move requests and confirmed bookings
        existing.totalActivity = existing.requests + existing.bookings;
      }
    }

    const monthlyTrends = Array.from(monthlyMap.values()).sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year;
      return a.month - b.month;
    });

    const totalActivityAllTime = monthlyTrends.reduce((acc, curr) => acc + curr.totalActivity, 0);

    // Empty state handling
    if (monthlyTrends.length === 0 || totalActivityAllTime === 0) {
      res.status(200).json({
        hasSufficientData: false,
        isLimitedData: false,
        message: 'Not enough historical data to identify peak periods in this region yet.',
        monthlyTrends: [],
        peakPeriods: [],
        topRoutes: [],
        availableRegions,
        availableCategories,
        selectedRegion: region || 'All Regions',
        earlyPreparationNotice: null,
        busiestMonth: null,
        averageMonthlyActivity: 0,
        upcomingDemandOutlook: null,
      });
      return;
    }

    const isLimitedData = monthlyTrends.length < 3 || totalActivityAllTime < 5;
    const averageActivity = totalActivityAllTime / monthlyTrends.length;

    // Detect current calendar dates
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonthNum = currentDate.getMonth() + 1; // 1-12
    const nextMonthNum = (currentMonthNum % 12) + 1;

    let maxActivity = 0;
    let busiestMonthItem: any = null;

    // Process each month with rich Category-Wise Breakdown & High Demand Category Marker
    const classifiedTrends = monthlyTrends.map((trend) => {
      let demandLevel: 'High Demand' | 'Normal Demand' | 'Lower Demand' = 'Normal Demand';
      if (trend.totalActivity > averageActivity * 1.25) {
        demandLevel = 'High Demand';
      } else if (trend.totalActivity < averageActivity * 0.75) {
        demandLevel = 'Lower Demand';
      }

      if (trend.totalActivity > maxActivity) {
        maxActivity = trend.totalActivity;
        busiestMonthItem = trend;
      }

      const pctDiff = Math.round(((trend.totalActivity - averageActivity) / averageActivity) * 100);
      const isCurrent = trend.year === currentYear && trend.month === currentMonthNum;
      const isUpcoming = trend.month === nextMonthNum;

      // Category breakdown for this month
      const totalMonthRequests = trend.requests || 1;
      const categoryBreakdown = Object.entries(trend.categoryCounts)
        .map(([catName, count]) => {
          const percentage = Math.round((count / totalMonthRequests) * 100);
          const isHighDemand = percentage >= 40 || (demandLevel === 'High Demand' && percentage >= 35);
          return {
            category: catName,
            orders: count,
            percentage,
            isHighDemand,
            demandTag: isHighDemand ? `🔥 High Demand on ${catName}` : 'Normal Demand',
            advisory: CATEGORY_OPERATIONAL_ADVISORIES[catName] || 'Ensure standard moving crew and vehicles are ready.',
          };
        })
        .sort((a, b) => b.orders - a.orders);

      // Dominant category
      const dominantCategory = categoryBreakdown.length > 0 ? categoryBreakdown[0] : null;

      // High demand category alert string
      let categoryAlert: string | null = null;
      if (dominantCategory && dominantCategory.isHighDemand) {
        categoryAlert = `${trend.monthName} Alert: High Demand on ${dominantCategory.category} (${dominantCategory.orders} of ${totalMonthRequests} requests — ${dominantCategory.percentage}%). ${dominantCategory.advisory}`;
      }

      return {
        ...trend,
        demandLevel,
        isPeak: demandLevel === 'High Demand',
        percentVsAverage: pctDiff,
        isCurrentMonth: isCurrent,
        isUpcomingMonth: isUpcoming,
        categoryBreakdown,
        dominantCategory: dominantCategory?.category || 'General Moves',
        dominantCategoryShare: dominantCategory?.percentage || 0,
        hasHighDemandCategory: !!(dominantCategory && dominantCategory.isHighDemand),
        categoryAlert,
      };
    });

    // Prioritize current/upcoming high-demand periods first rather than oldest historical data
    const peakPeriods = classifiedTrends
      .filter((t) => t.demandLevel === 'High Demand')
      .sort((a, b) => {
        // First prioritize current year
        if (a.year === currentYear && b.year !== currentYear) return -1;
        if (b.year === currentYear && a.year !== currentYear) return 1;
        return (b.year * 12 + b.month) - (a.year * 12 + a.month);
      });

    // Current calendar month summary
    const currentMonthSummary = classifiedTrends.find((t) => t.isCurrentMonth) ||
      classifiedTrends[classifiedTrends.length - 1] || null;

    // Route summary
    const topRoutes = routeStats
      .filter((r) => r._id.origin && r._id.destination)
      .map((r) => ({
        route: `${r._id.origin} → ${r._id.destination}`,
        origin: r._id.origin,
        destination: r._id.destination,
        volume: r.totalMoves,
      }));

    // Find upcoming surge
    const upcomingMonthData = classifiedTrends.find(
      (t) => t.month === nextMonthNum || (t.month === currentMonthNum && t.demandLevel === 'High Demand')
    );

    let earlyPreparationNotice: string | null = null;
    let upcomingDemandOutlook: any = null;

    if (upcomingMonthData && !isLimitedData && upcomingMonthData.demandLevel === 'High Demand') {
      const topCat = upcomingMonthData.dominantCategory;
      const topPct = upcomingMonthData.dominantCategoryShare;
      earlyPreparationNotice = `High Customer Demand Approaching: Customer bookings surge by +${upcomingMonthData.percentVsAverage}% in ${upcomingMonthData.label}. ${topCat} represents ${topPct}% of order flow. Prepare specialized trucks and labor crew now to win high-margin bids.`;
      upcomingDemandOutlook = {
        monthLabel: upcomingMonthData.label,
        demandLevel: 'High Demand',
        headline: `High Demand on ${topCat} Expected`,
        surgePercentage: upcomingMonthData.percentVsAverage,
        dominantCategory: topCat,
        dominantCategoryShare: topPct,
        guidance: upcomingMonthData.categoryAlert || 'Review vehicle maintenance, confirm driver shifts, and stock extra packing materials.',
      };
    } else {
      upcomingDemandOutlook = {
        monthLabel: upcomingMonthData?.label || `${MONTH_NAMES[nextMonthNum - 1]} ${currentYear}`,
        demandLevel: 'Normal Demand',
        headline: 'Steady Customer Booking Volume Expected',
        surgePercentage: 0,
        dominantCategory: upcomingMonthData?.dominantCategory || 'Standard Family Move',
        dominantCategoryShare: upcomingMonthData?.dominantCategoryShare || 50,
        guidance: 'Maintain fast quotation turnaround times (under 30 mins) to maintain high booking conversion rates.',
      };
    }

    res.status(200).json({
      hasSufficientData: true,
      isLimitedData,
      message: isLimitedData
        ? 'Based on limited historical activity.'
        : `Calculated from ${totalActivityAllTime} verified customer requests & bookings in ${region && region !== 'ALL' ? region : 'all regions'} across ${monthlyTrends.length} months.`,
      monthlyTrends: classifiedTrends,
      peakPeriods,
      currentMonthSummary,
      topRoutes,
      busiestMonth: busiestMonthItem,
      averageMonthlyActivity: Math.round(averageActivity),
      availableRegions,
      availableCategories,
      selectedRegion: region || 'All Regions',
      earlyPreparationNotice,
      upcomingDemandOutlook,
    });
  } catch (error) {
    console.error('[getDemandAnalytics] Error:', error);
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to compute demand analytics' } });
  }
};

/**
 * GET /api/v1/vendor/analytics/quote-performance
 * Calculates vendor quote conversion and performance from real quotation records.
 */
export const getQuotePerformanceAnalytics = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const vendor = req.vendor;
    if (!vendor) {
      res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Vendor context required' } });
      return;
    }

    const vendorQuotes = await Quote.find({ vendorId: vendor._id }).sort({ createdAt: -1 });

    if (vendorQuotes.length === 0) {
      res.status(200).json({
        hasData: false,
        message: 'No quotation history available yet.',
        metrics: {
          submitted: 0,
          accepted: 0,
          rejected: 0,
          pending: 0,
          acceptanceRate: null,
        },
        monthlyActivity: [],
        commonRejectionReasons: [],
      });
      return;
    }

    let submittedCount = vendorQuotes.length;
    let acceptedCount = 0;
    let rejectedCount = 0;
    let pendingCount = 0;

    const monthlyMap = new Map<string, {
      label: string;
      year: number;
      month: number;
      submitted: number;
      accepted: number;
      rejected: number;
    }>();

    const rejectedRequestIds: any[] = [];

    for (const quote of vendorQuotes) {
      const createdDate = new Date(quote.createdAt);
      const year = createdDate.getFullYear();
      const month = createdDate.getMonth() + 1;
      const key = `${year}-${String(month).padStart(2, '0')}`;
      const label = `${MONTH_NAMES[month - 1]} ${year}`;

      const monthEntry = monthlyMap.get(key) || {
        label,
        year,
        month,
        submitted: 0,
        accepted: 0,
        rejected: 0,
      };
      monthEntry.submitted += 1;

      if (quote.status === 'ACCEPTED') {
        acceptedCount += 1;
        monthEntry.accepted += 1;
      } else if (quote.status === 'NOT_SELECTED' || quote.status === 'REJECTED') {
        rejectedCount += 1;
        monthEntry.rejected += 1;
        rejectedRequestIds.push(quote.requestId);
      } else if (quote.status === 'SUBMITTED') {
        pendingCount += 1;
      }

      monthlyMap.set(key, monthEntry);
    }

    const totalDecided = acceptedCount + rejectedCount;
    const acceptanceRate = totalDecided > 0
      ? Number(((acceptedCount / totalDecided) * 100).toFixed(1))
      : 0;

    const monthlyActivity = Array.from(monthlyMap.values()).sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year;
      return a.month - b.month;
    });

    const reasonFrequencyMap: Record<string, number> = {};

    if (rejectedRequestIds.length > 0) {
      const rejectedRequests = await MovingRequest.find({
        _id: { $in: rejectedRequestIds },
        'commonRejectionFeedback.reasons': { $exists: true, $ne: [] },
      }).select('commonRejectionFeedback');

      for (const reqDoc of rejectedRequests) {
        if (reqDoc.commonRejectionFeedback?.reasons) {
          for (const reason of reqDoc.commonRejectionFeedback.reasons) {
            reasonFrequencyMap[reason] = (reasonFrequencyMap[reason] || 0) + 1;
          }
        }
      }
    }

    const commonRejectionReasons = Object.entries(reasonFrequencyMap)
      .map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count);

    res.status(200).json({
      hasData: true,
      message: 'Real quotation performance analytics derived from database records.',
      metrics: {
        submitted: submittedCount,
        accepted: acceptedCount,
        rejected: rejectedCount,
        pending: pendingCount,
        acceptanceRate,
      },
      monthlyActivity,
      hasFeedbackData: commonRejectionReasons.length > 0,
      feedbackMessage: commonRejectionReasons.length > 0
        ? undefined
        : 'Not enough feedback data yet.',
      commonRejectionReasons,
    });
  } catch (error) {
    console.error('[getQuotePerformanceAnalytics] Error:', error);
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to compute quote performance analytics' } });
  }
};
