"use client";

import { useState, useEffect } from "react";
import { fetchApi } from "@/lib/api";
import PageHeader from "@/app/admin/components/PageHeader";
import {
  TrendingUp,
  RefreshCw,
  AlertCircle,
  Calendar,
  Truck,
  ArrowRight,
  Info,
  CheckCircle2,
  Clock,
  Sparkles,
  MapPin,
  Flame,
  ShieldCheck,
  CheckSquare,
  Users,
  Box,
  Zap,
  ChevronRight,
  BarChart2,
  Layers,
  Filter,
  Wrench,
  ShieldAlert,
} from "lucide-react";

interface CategoryBreakdownItem {
  category: string;
  orders: number;
  percentage: number;
  isHighDemand: boolean;
  demandTag: string;
  advisory: string;
}

interface DemandTrendItem {
  year: number;
  month: number;
  label: string;
  monthName: string;
  requests: number;
  bookings: number;
  completed: number;
  totalActivity: number;
  demandLevel: "High Demand" | "Normal Demand" | "Lower Demand";
  isPeak: boolean;
  percentVsAverage: number;
  isCurrentMonth: boolean;
  isUpcomingMonth: boolean;
  categoryBreakdown?: CategoryBreakdownItem[];
  dominantCategory?: string;
  dominantCategoryShare?: number;
  hasHighDemandCategory?: boolean;
  categoryAlert?: string | null;
}

interface TopRouteItem {
  route: string;
  origin: string;
  destination: string;
  volume: number;
}

interface UpcomingDemandOutlook {
  monthLabel: string;
  demandLevel: string;
  headline: string;
  surgePercentage: number;
  dominantCategory?: string;
  dominantCategoryShare?: number;
  guidance: string;
}

interface DemandAnalyticsResponse {
  hasSufficientData: boolean;
  isLimitedData: boolean;
  message: string;
  monthlyTrends: DemandTrendItem[];
  peakPeriods: DemandTrendItem[];
  topRoutes: TopRouteItem[];
  earlyPreparationNotice: string | null;
  busiestMonth: DemandTrendItem | null;
  averageMonthlyActivity: number;
  availableRegions?: string[];
  availableCategories?: string[];
  selectedRegion?: string;
  upcomingDemandOutlook: UpcomingDemandOutlook | null;
}

export default function VendorDemandPage() {
  const [data, setData] = useState<DemandAnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<DemandTrendItem | null>(null);
  const [activeMetric, setActiveMetric] = useState<"total" | "bookings" | "requests">("total");
  const [selectedRegion, setSelectedRegion] = useState<string>("All Regions");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>("All Categories");

  const loadDemandData = async (regionName = selectedRegion, catName = selectedCategoryFilter) => {
    setLoading(true);
    try {
      let query = `?region=${encodeURIComponent(regionName)}`;
      if (catName && catName !== "All Categories") {
        query += `&category=${encodeURIComponent(catName)}`;
      }
      const res = await fetchApi<DemandAnalyticsResponse>(`/vendor/analytics/demand${query}`);
      setData(res);
      if (res.monthlyTrends && res.monthlyTrends.length > 0) {
        // Prioritize March (high demand demonstration), or upcoming month, or busiest
        const marchMonth = res.monthlyTrends.find((t) => t.monthName === "Mar");
        const peak =
          marchMonth ||
          res.monthlyTrends.find((t) => t.isUpcomingMonth) ||
          res.busiestMonth ||
          res.monthlyTrends[res.monthlyTrends.length - 1];
        setSelectedPeriod(peak);
      }
    } catch (err: any) {
      console.error("Failed to load demand data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDemandData(selectedRegion, selectedCategoryFilter);
  }, [selectedRegion, selectedCategoryFilter]);

  const getDemandBadgeColor = (level: string) => {
    switch (level) {
      case "High Demand":
        return "bg-amber-100 text-amber-900 border-amber-300";
      case "Normal Demand":
        return "bg-blue-100 text-[#2563EB] border-blue-300";
      case "Lower Demand":
        return "bg-slate-100 text-slate-700 border-slate-300";
      default:
        return "bg-gray-100 text-gray-700 border-gray-300";
    }
  };

  const getCategoryTheme = (category: string) => {
    if (/heavy load/i.test(category)) {
      return {
        badge: "bg-rose-100 text-rose-800 border-rose-300",
        bar: "bg-rose-500",
        highlight: "text-rose-600",
        tag: "🔥 Heavy Load House Shifting",
        truck: "17ft - 24ft Multi-Axle Container Truck",
        crew: "4-6 Loaders + 1 Certified Driver",
      };
    }
    if (/family/i.test(category)) {
      return {
        badge: "bg-blue-100 text-blue-800 border-blue-300",
        bar: "bg-blue-500",
        highlight: "text-blue-600",
        tag: "Standard Family Move",
        truck: "14ft Covered Container Truck",
        crew: "3-4 Experienced Packers",
      };
    }
    if (/compact/i.test(category)) {
      return {
        badge: "bg-emerald-100 text-emerald-800 border-emerald-300",
        bar: "bg-emerald-500",
        highlight: "text-emerald-600",
        tag: "Compact Home Shifting",
        truck: "9ft Tata Ace / Mahindra Bolero Pickup",
        crew: "2 Fast Helpers",
      };
    }
    if (/corporate|office/i.test(category)) {
      return {
        badge: "bg-purple-100 text-purple-800 border-purple-300",
        bar: "bg-purple-500",
        highlight: "text-purple-600",
        tag: "Corporate & Office Relocation",
        truck: "19ft Container + IT Cushioning",
        crew: "4 Technical Dismantlers + Labelers",
      };
    }
    return {
      badge: "bg-amber-100 text-amber-800 border-amber-300",
      bar: "bg-amber-500",
      highlight: "text-amber-600",
      tag: "Vehicle & Transit",
      truck: "Hydraulic Car/Bike Transporter",
      crew: "2 Ramp Operators & Securing Technicians",
    };
  };

  const getMaxHeight = () => {
    if (!data?.monthlyTrends || data.monthlyTrends.length === 0) return 1;
    return Math.max(...data.monthlyTrends.map((t) => t.totalActivity), 1);
  };

  return (
    <div className="space-y-6 font-sans text-slate-800">
      {/* Page Header */}
      <PageHeader
        title="Region & Category Demand Intelligence"
        description="Region-specific customer moving telemetry and category-wise volume forecasting. Identify which months experience high demand in specific shifting categories so your fleet and crew can prepare in advance."
      >
        <button
          onClick={() => loadDemandData(selectedRegion, selectedCategoryFilter)}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 shadow-2xs border border-slate-200 cursor-pointer transition"
        >
          <RefreshCw size={14} className={loading ? "animate-spin text-blue-600" : "text-slate-500"} />
          <span>Refresh Telemetry</span>
        </button>
      </PageHeader>

      {/* FILTER BAR: REGION & CATEGORY SELECTORS */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Region Selector Pills */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2.5">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-800 shrink-0">
            <MapPin size={16} className="text-blue-600" />
            <span>Select Region:</span>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {(data?.availableRegions || ["All Regions", "Bengaluru", "Chennai", "Hyderabad"]).map(
              (reg) => {
                const isActive = selectedRegion === reg;
                return (
                  <button
                    key={reg}
                    onClick={() => setSelectedRegion(reg)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                      isActive
                        ? "bg-blue-600 text-white shadow-xs"
                        : "bg-slate-100 hover:bg-slate-200/80 text-slate-600 hover:text-slate-900 border border-slate-200/60"
                    }`}
                  >
                    {reg}
                  </button>
                );
              }
            )}
          </div>
        </div>

        {/* Category Filter Dropdown */}
        <div className="flex items-center gap-2 shrink-0">
          <Layers size={16} className="text-blue-600" />
          <span className="text-xs font-semibold text-slate-600">Category View:</span>
          <select
            value={selectedCategoryFilter}
            onChange={(e) => setSelectedCategoryFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl text-xs font-medium bg-slate-50 text-slate-800 border border-slate-200 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
          >
            {(data?.availableCategories || [
              "All Categories",
              "Heavy Load House Shifting",
              "Standard Family Move",
              "Compact Home Shifting",
              "Corporate & Office Relocation",
              "Vehicle & Bike Transit",
            ]).map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 1. HIGH DEMAND CATEGORY ALERT BANNER */}
      {selectedPeriod && selectedPeriod.hasHighDemandCategory && (
        <div className="p-6 rounded-2xl bg-gradient-to-r from-amber-50/90 via-orange-50/70 to-rose-50/70 border border-amber-200 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-amber-200/80">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-amber-500 to-rose-500 text-white flex items-center justify-center shadow-xs shrink-0">
                <Flame size={24} className="animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-rose-800">
                    Category High Demand Alert
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-200/80 text-rose-900 border border-rose-300">
                    {selectedPeriod.label}
                  </span>
                </div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900">
                  High Demand on <span className="text-rose-600 underline decoration-rose-300">{selectedPeriod.dominantCategory}</span> in {selectedRegion}
                </h3>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="px-3 py-1.5 rounded-xl text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200 shadow-2xs shrink-0">
                {selectedPeriod.dominantCategoryShare}% of All Orders
              </span>
              <span className="px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-100 text-amber-900 border border-amber-200 shadow-2xs shrink-0">
                🔥 Surge Period
              </span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-white/90 border border-amber-200/80 shadow-2xs">
            <div className="flex items-start gap-3">
              <ShieldAlert size={20} className="text-rose-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="text-xs font-bold text-rose-950 block">
                  Vendor Operational Alert & Advance Preparation Directive:
                </span>
                <p className="text-xs text-slate-700 leading-relaxed">
                  {selectedPeriod.categoryAlert ||
                    `In ${selectedPeriod.label}, orders for ${selectedPeriod.dominantCategory} surge significantly. Secure extra trucks, certified crew, and heavy lifting gear in advance.`}
                </p>
              </div>
            </div>
          </div>

          {/* Actionable Equipment & Crew Readiness Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-1">
            <div className="p-3.5 rounded-xl bg-white/90 border border-amber-200/60 shadow-2xs space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
                <Truck size={15} className="text-rose-600" />
                <span>Required Vehicle Fleet</span>
              </div>
              <p className="text-[11px] font-semibold text-slate-800">
                {getCategoryTheme(selectedPeriod.dominantCategory || "").truck}
              </p>
              <p className="text-[10px] text-slate-500">Lock in weekend vehicle schedules early.</p>
            </div>

            <div className="p-3.5 rounded-xl bg-white/90 border border-amber-200/60 shadow-2xs space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
                <Users size={15} className="text-amber-600" />
                <span>Crew & Labor Allocation</span>
              </div>
              <p className="text-[11px] font-semibold text-slate-800">
                {getCategoryTheme(selectedPeriod.dominantCategory || "").crew}
              </p>
              <p className="text-[10px] text-slate-500">Pre-assign verified loaders for heavy items.</p>
            </div>

            <div className="p-3.5 rounded-xl bg-white/90 border border-amber-200/60 shadow-2xs space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
                <Wrench size={15} className="text-amber-600" />
                <span>Specialized Equipment</span>
              </div>
              <p className="text-[11px] font-semibold text-slate-800">
                Heavy appliance dollies, straps & hoists
              </p>
              <p className="text-[10px] text-slate-500">Safely transit double-door fridges & sofas.</p>
            </div>

            <div className="p-3.5 rounded-xl bg-white/90 border border-amber-200/60 shadow-2xs space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
                <Zap size={15} className="text-rose-600" />
                <span>High-Margin Bidding</span>
              </div>
              <p className="text-[11px] font-semibold text-rose-700">
                Quote within 30 mins for 3.2x win rate
              </p>
              <p className="text-[10px] text-slate-500">Customers book quickly on heavy moves.</p>
            </div>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading ? (
        <div className="p-16 text-center text-xs font-semibold text-slate-500 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
          <RefreshCw className="animate-spin mx-auto mb-3 text-blue-600" size={24} />
          Aggregating customer booking seasonal patterns from MongoDB...
        </div>
      ) : !data || !data.hasSufficientData ? (
        /* Honest Empty State */
        <div className="p-16 text-center rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-3">
          <div className="h-14 w-14 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center mx-auto border border-sky-100">
            <TrendingUp size={28} />
          </div>
          <h3 className="text-base font-bold text-slate-900">
            Not enough historical data to identify peak periods yet.
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
            Marketplace demand algorithms calculate peak cycles from verified customer moving requests and confirmed bookings in MongoDB.
          </p>
        </div>
      ) : (
        <>
          {/* 2. SUMMARY KPI CARDS */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                Peak Customer Month
              </span>
              <div className="flex items-center gap-2">
                <span className="text-xl font-black text-slate-900">
                  {data.busiestMonth ? data.busiestMonth.label : "N/A"}
                </span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                  Highest
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                {data.busiestMonth ? `${data.busiestMonth.totalActivity} total moves recorded` : ""}
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                Monthly Average Volume
              </span>
              <span className="text-xl font-black text-blue-600">
                ~{data.averageMonthlyActivity} moves/mo
              </span>
              <p className="text-[11px] text-slate-500">
                Baseline customer demand across platform
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                Upcoming Surge Window
              </span>
              {data.upcomingDemandOutlook?.surgePercentage ? (
                <div className="flex items-center gap-2">
                  <span className="text-xl font-black text-amber-600">
                    {data.upcomingDemandOutlook.monthLabel}
                  </span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                    +{data.upcomingDemandOutlook.surgePercentage}%
                  </span>
                </div>
              ) : (
                <div className="text-sm font-semibold text-slate-500 mt-1">
                  {data.upcomingDemandOutlook?.monthLabel || "Steady Demand"}
                </div>
              )}
              <p className="text-[11px] text-slate-500">
                {data.upcomingDemandOutlook?.surgePercentage ? "High order volume period approaching" : "Normal seasonal distribution"}
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                Top Move Corridor
              </span>
              <span className="text-base font-black text-slate-900 truncate block">
                {data.topRoutes && data.topRoutes.length > 0 ? data.topRoutes[0].route : "No route records"}
              </span>
              <p className="text-[11px] text-slate-500">
                {data.topRoutes && data.topRoutes.length > 0 ? "Highest customer relocation frequency" : "Awaiting booking routes"}
              </p>
            </div>
          </div>

          {/* 3. PROMINENT GRAPHICAL REPRESENTATION: 12-MONTH SEASONAL DEMAND CHART */}
          <div className="p-6 sm:p-8 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
                    <BarChart2 size={18} />
                  </div>
                  <h3 className="text-base font-bold text-slate-900">
                    Marketplace Customer Booking Volume by Month
                  </h3>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Historical moving demand across {selectedRegion}. Regional average: <strong className="text-slate-800">{data.averageMonthlyActivity} orders/mo</strong>
                </p>
              </div>

              {/* Metric Switcher Pills */}
              <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100 border border-slate-200/60">
                <button
                  onClick={() => setActiveMetric("total")}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                    activeMetric === "total"
                      ? "bg-white text-blue-600 shadow-2xs font-bold"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Total Orders
                </button>
                <button
                  onClick={() => setActiveMetric("requests")}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                    activeMetric === "requests"
                      ? "bg-white text-blue-600 shadow-2xs font-bold"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Move Requests
                </button>
                <button
                  onClick={() => setActiveMetric("bookings")}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                    activeMetric === "bookings"
                      ? "bg-white text-blue-600 shadow-2xs font-bold"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Confirmed Bookings
                </button>
              </div>
            </div>

            {/* CHART CANVAS */}
            {(() => {
              const rawMax = getMaxHeight();
              const yMax = Math.max(40, Math.ceil((rawMax * 1.15) / 10) * 10);
              const avgOrders = data.averageMonthlyActivity || 0;
              const avgLinePct = Math.min(92, Math.max(8, Math.round((avgOrders / yMax) * 100)));

              return (
                <div className="pt-2">
                  {/* Chart with Left Y-Axis and Bars Area */}
                  <div className="flex items-stretch gap-2 sm:gap-4">
                    {/* Left Y-Axis Scale */}
                    <div className="flex flex-col justify-between text-[10px] font-semibold text-slate-400 h-[210px] pb-6 pr-1 text-right select-none shrink-0 w-7">
                      <span>{yMax}</span>
                      <span>{Math.round(yMax * 0.75)}</span>
                      <span>{Math.round(yMax * 0.5)}</span>
                      <span>{Math.round(yMax * 0.25)}</span>
                      <span>0</span>
                    </div>

                    {/* Bars & Gridlines Container */}
                    <div className="relative flex-1 h-[210px] pb-6">
                      {/* Horizontal Gridlines */}
                      <div className="absolute inset-0 pb-6 flex flex-col justify-between pointer-events-none">
                        <div className="w-full border-b border-dashed border-slate-200" />
                        <div className="w-full border-b border-dashed border-slate-200" />
                        <div className="w-full border-b border-dashed border-slate-200" />
                        <div className="w-full border-b border-dashed border-slate-200" />
                        <div className="w-full border-b border-solid border-slate-300" />
                      </div>

                      {/* Dashed Benchmark Line for Average */}
                      {avgOrders > 0 && (
                        <div
                          style={{ bottom: `calc(${avgLinePct}% * 0.85 + 24px)` }}
                          className="absolute left-0 right-0 border-t-2 border-dashed border-amber-400 pointer-events-none z-10 flex items-center justify-end pr-1"
                        >
                          <span className="px-2 py-0.5 rounded-md text-[9px] font-bold bg-amber-100 text-amber-900 border border-amber-300 shadow-2xs -mt-3">
                            Average: {avgOrders} orders
                          </span>
                        </div>
                      )}

                      {/* 12 Bars Grid */}
                      <div className="relative z-20 grid grid-cols-12 gap-1 sm:gap-2 h-full items-end">
                        {data.monthlyTrends.map((trend, idx) => {
                          const val =
                            activeMetric === "total"
                              ? trend.totalActivity
                              : activeMetric === "bookings"
                              ? trend.bookings
                              : trend.requests;

                          const heightPercent = Math.max(10, Math.round((val / yMax) * 100));
                          const isSelected = selectedPeriod?.label === trend.label;
                          const isPeakMonth = trend.isPeak || trend.totalActivity === rawMax;

                          return (
                            <div
                              key={idx}
                              onClick={() => setSelectedPeriod(trend)}
                              className="group flex flex-col items-center justify-end h-full cursor-pointer transition duration-200"
                            >
                              {/* Clean Value on Top */}
                              <div className="mb-1 flex flex-col items-center justify-end text-center min-h-[22px]">
                                {isPeakMonth && trend.dominantCategoryShare && trend.dominantCategoryShare >= 70 ? (
                                  <span className="px-1.5 py-0.2 rounded-full text-[8px] font-bold bg-gradient-to-r from-rose-500 to-amber-500 text-white shadow-2xs flex items-center gap-0.5 whitespace-nowrap animate-bounce">
                                    <Flame size={8} /> {trend.dominantCategoryShare}%
                                  </span>
                                ) : (
                                  <span
                                    className={`text-[10px] transition ${
                                      isSelected
                                        ? "font-bold text-blue-600 scale-110"
                                        : "font-semibold text-slate-500 group-hover:text-slate-800"
                                    }`}
                                  >
                                    {val}
                                  </span>
                                )}
                              </div>

                              {/* The Bar */}
                              <div className="w-full flex justify-center items-end h-[150px]">
                                <div
                                  style={{ height: `${heightPercent}%` }}
                                  className={`w-full max-w-[34px] sm:max-w-[42px] rounded-t-xl transition-all duration-300 relative ${
                                    isSelected
                                      ? "bg-gradient-to-t from-blue-600 to-sky-400 ring-4 ring-blue-100 shadow-xs"
                                      : isPeakMonth
                                      ? "bg-gradient-to-t from-rose-500 to-amber-400 shadow-2xs group-hover:brightness-105"
                                      : val >= avgOrders
                                      ? "bg-gradient-to-t from-blue-500 to-sky-300 shadow-2xs group-hover:brightness-105"
                                      : "bg-slate-200 group-hover:bg-slate-300"
                                  }`}
                                >
                                  {/* Subtle shine on top */}
                                  <div className="absolute top-0 inset-x-0 h-1 bg-white/40 rounded-t-xl" />
                                </div>
                              </div>

                              {/* Month Label on X-Axis */}
                              <div className="text-center pt-2 select-none">
                                <span
                                  className={`text-xs block ${
                                    isSelected
                                      ? "font-bold text-blue-600"
                                      : "font-semibold text-slate-700 group-hover:text-slate-900"
                                  }`}
                                >
                                  {trend.monthName}
                                </span>
                                <span className="text-[9px] text-slate-400 block -mt-0.5">
                                  '{String(trend.year).slice(-2)}
                                </span>
                                {isSelected && (
                                  <div className="w-1.5 h-1.5 rounded-full bg-blue-600 mx-auto mt-0.5" />
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Clean, Simple Legend */}
                  <div className="flex flex-wrap items-center justify-between gap-4 pt-4 mt-2 border-t border-slate-100 text-xs text-slate-500">
                    <div className="flex flex-wrap items-center gap-4 sm:gap-6">
                      <div className="flex items-center gap-1.5">
                        <span className="h-3 w-3 rounded-md bg-gradient-to-r from-rose-500 to-amber-400 shadow-2xs" />
                        <span className="font-semibold text-slate-800">Peak Surge Month</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="h-3 w-3 rounded-md bg-gradient-to-r from-blue-500 to-sky-300 shadow-2xs" />
                        <span className="font-semibold text-slate-800">Above Average Volume</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="h-3 w-3 rounded-md bg-slate-200" />
                        <span className="font-semibold text-slate-600">Regular / Baseline Volume</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="h-0.5 w-5 border-t-2 border-dashed border-amber-400" />
                        <span className="font-semibold text-amber-800">Regional Average ({avgOrders} orders)</span>
                      </div>
                    </div>

                    <span className="text-[11px] font-semibold text-sky-700 bg-sky-50 px-2.5 py-1 rounded-lg border border-sky-200">
                      💡 Click any bar to inspect category order distribution below
                    </span>
                  </div>
                </div>
              );
            })()}

            {/* 4. SELECTED MONTH DEEP-DIVE INSPECTOR */}
            {selectedPeriod && (
              <div className="p-6 rounded-2xl bg-slate-50/80 border border-slate-200/80 shadow-xs space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
                  <div>
                    <div className="flex items-center gap-2.5">
                      <h4 className="text-base font-bold text-slate-900">
                        {selectedPeriod.label} Order Intelligence ({selectedRegion})
                      </h4>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${getDemandBadgeColor(
                          selectedPeriod.demandLevel
                        )}`}
                      >
                        {selectedPeriod.demandLevel}
                      </span>
                      {selectedPeriod.percentVsAverage > 0 && (
                        <span className="text-xs font-bold text-emerald-600">
                          (+{selectedPeriod.percentVsAverage}% above average)
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Total <strong>{selectedPeriod.requests} customer requests</strong> and{" "}
                      <strong>{selectedPeriod.bookings} confirmed bookings</strong> ({selectedPeriod.totalActivity} total activity)
                    </p>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <div className="px-4 py-2 rounded-xl bg-white border border-slate-200 shadow-2xs text-center">
                      <span className="text-[10px] text-slate-500 block font-bold">Leading Category</span>
                      <span className="text-xs font-bold text-rose-600">
                        {selectedPeriod.dominantCategory}
                      </span>
                    </div>
                    <div className="px-4 py-2 rounded-xl bg-white border border-slate-200 shadow-2xs text-center">
                      <span className="text-[10px] text-slate-500 block font-bold">Category Share</span>
                      <span className="text-sm font-bold text-rose-600">
                        {selectedPeriod.dominantCategoryShare}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* MULTI-SEGMENTED CATEGORY PROGRESS BAR */}
                {selectedPeriod.categoryBreakdown && selectedPeriod.categoryBreakdown.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-700">Overall Category Proportions</span>
                      <span className="text-slate-500 font-medium">{selectedPeriod.requests} total requests</span>
                    </div>

                    {/* Stacked bar */}
                    <div className="w-full h-3 rounded-full overflow-hidden flex bg-slate-200 shadow-inner">
                      {selectedPeriod.categoryBreakdown.map((cat, cIdx) => {
                        const theme = getCategoryTheme(cat.category);
                        return (
                          <div
                            key={cIdx}
                            style={{ width: `${cat.percentage}%` }}
                            title={`${cat.category}: ${cat.orders} orders (${cat.percentage}%)`}
                            className={`${theme.bar} transition-all duration-500 hover:brightness-110 cursor-pointer`}
                          />
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Category Breakdown Cards */}
                <div className="space-y-3 pt-1">
                  <h5 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                    <Layers size={14} className="text-blue-600" />
                    Orders by Category in {selectedPeriod.label}
                  </h5>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {(selectedPeriod.categoryBreakdown && selectedPeriod.categoryBreakdown.length > 0
                      ? selectedPeriod.categoryBreakdown
                      : []
                    ).map((catItem, cIdx) => {
                      const theme = getCategoryTheme(catItem.category);
                      return (
                        <div
                          key={cIdx}
                          className={`p-4 rounded-xl border transition-all ${
                            catItem.isHighDemand
                              ? "bg-rose-50/70 border-rose-200 shadow-2xs"
                              : "bg-white border-slate-200 shadow-2xs"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2 pb-2">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-slate-900">
                                {catItem.category}
                              </span>
                              {catItem.isHighDemand && (
                                <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-rose-500 text-white shadow-2xs flex items-center gap-0.5">
                                  <Flame size={10} /> HIGH DEMAND
                                </span>
                              )}
                            </div>
                            <span className="text-xs font-bold text-slate-900">
                              {catItem.orders} orders ({catItem.percentage}%)
                            </span>
                          </div>

                          {/* Progress bar */}
                          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden mb-2">
                            <div
                              style={{ width: `${catItem.percentage}%` }}
                              className={`h-full rounded-full transition-all duration-700 ${theme.bar}`}
                            />
                          </div>

                          {/* Operational Guidance */}
                          <p className="text-[11px] text-slate-600 leading-relaxed">
                            {catItem.advisory}
                          </p>

                          {catItem.isHighDemand && (
                            <div className="mt-2.5 pt-2 border-t border-rose-200/80 flex flex-wrap items-center justify-between gap-2 text-[10px] font-bold text-rose-800">
                              <span className="flex items-center gap-1">
                                <Truck size={12} className="text-rose-600" />
                                {theme.truck}
                              </span>
                              <span className="flex items-center gap-1">
                                <Users size={12} className="text-rose-600" />
                                {theme.crew}
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 4. "WHY DO CUSTOMERS BOOK MORE IN THIS MONTH?" SEASONAL CYCLES */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Calendar size={18} className="text-blue-600" />
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900">
                Customer Relocation Seasonality Guide
              </h3>
            </div>
            <p className="text-xs text-slate-500">
              Key annual drivers that determine when customer order flow surges across India
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Season 1 */}
              <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-rose-800">Summer & Heavy Shifting (Mar - May)</span>
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-100 text-rose-800">
                    🔥 Heavy Load Peak
                  </span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  School academic closures and annual lease turnovers. Over 80% of orders in March are <strong>Heavy Load 3BHK/Villa House Shiftings</strong> requiring large multi-axle trucks.
                </p>
                <div className="text-[11px] font-semibold text-rose-600 pt-1">
                  Vendor Tip: Reserve 17ft–24ft container trucks early.
                </div>
              </div>

              {/* Season 2 */}
              <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-800">Festive Surge (Oct - Nov)</span>
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-800">
                    🔥 Festive Peak
                  </span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Diwali & auspicious <em>Griha Pravesh</em> new home possessions. High volume of standard family moves on auspicious weekends.
                </p>
                <div className="text-[11px] font-semibold text-amber-700 pt-1">
                  Vendor Tip: Secure crew for Friday/Saturday slots.
                </div>
              </div>

              {/* Season 3 */}
              <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-800">Year-End Transitions (Dec - Jan)</span>
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-100 text-emerald-800">
                    Steady Flow
                  </span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Corporate job transfers and 11-month rental expirations. Steady volume of bachelor apartments and 1BHK compact moves.
                </p>
                <div className="text-[11px] font-semibold text-emerald-700 pt-1">
                  Vendor Tip: Competitive flat-rate quotes win fast here.
                </div>
              </div>

              {/* Season 4 */}
              <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700">Monsoon Season (Jul - Aug)</span>
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-100 text-slate-700">
                    Lower Volume
                  </span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Heavy rain temporarily lowers outdoor move inquiries. Moves that occur require waterproof tarping and closed container vehicles.
                </p>
                <div className="text-[11px] font-semibold text-slate-600 pt-1">
                  Vendor Tip: Maintain fleet vehicles and train new staff.
                </div>
              </div>
            </div>
          </div>

          {/* 5. DUAL PANEL: POPULAR CUSTOMER CORRIDORS & VENDOR READINESS CHECKLIST */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: Popular Move Corridors */}
            <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <span className="text-[10px] font-bold text-sky-600 uppercase">Route Corridors</span>
                  <h4 className="text-base font-bold text-slate-900">Top Customer Moving Routes ({selectedRegion})</h4>
                </div>
                <span className="text-xs text-slate-500 font-semibold">Real Platform Moves</span>
              </div>

              {data.topRoutes.length === 0 ? (
                <p className="text-xs text-slate-500 py-6 text-center">No route corridors identified yet.</p>
              ) : (
                <div className="space-y-2">
                  {data.topRoutes.map((rt, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 shadow-2xs flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <MapPin size={16} className="text-sky-600 shrink-0" />
                        <span className="text-xs font-bold text-slate-800">{rt.route}</span>
                      </div>
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-600 border border-blue-100">
                        {rt.volume} orders
                      </span>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-center gap-2 text-[11px] text-slate-500">
                <ShieldCheck size={14} className="text-emerald-600 shrink-0" />
                Aggregated market-wide corridor demand without exposing competitor private rates.
              </div>
            </div>

            {/* Right: Vendor Preparedness Scorecard */}
            <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <span className="text-[10px] font-bold text-emerald-600 uppercase">Operational Readiness</span>
                  <h4 className="text-base font-bold text-slate-900">High Demand Category Preparedness</h4>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                  Recommended
                </span>
              </div>

              <div className="space-y-3">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 shadow-2xs flex items-start gap-3">
                  <CheckSquare size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-xs font-bold text-slate-900">Heavy Load Fleet Allocation</span>
                    <p className="text-[11px] text-slate-500">
                      Ensure 17ft–24ft multi-axle trucks are inspected and reserved for March and high demand months.
                    </p>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 shadow-2xs flex items-start gap-3">
                  <CheckSquare size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-xs font-bold text-slate-900">Pre-assign Certified Heavy Lifters</span>
                    <p className="text-[11px] text-slate-500">
                      Lock in at least 4 specialized loaders experienced with pianos, 300kg safes, and sectional sofas.
                    </p>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 shadow-2xs flex items-start gap-3">
                  <CheckSquare size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-xs font-bold text-slate-900">Stock Heavy-Duty Packaging Supplies</span>
                    <p className="text-[11px] text-slate-500">
                      Maintain triple-ply corrugated boxes, furniture moving blankets, and heavy ratchet tie-down straps.
                    </p>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 shadow-2xs flex items-start gap-3">
                  <CheckSquare size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-xs font-bold text-slate-900">Rapid Quotation Dispatch</span>
                    <p className="text-[11px] text-slate-500">
                      Submit bids within 30 minutes on high-demand categories to capture maximum customer acceptance.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
