"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { fetchApi } from "@/lib/api";
import PageHeader from "@/app/admin/components/PageHeader";
import StatusBadge from "@/app/admin/components/StatusBadge";
import {
  CalendarCheck,
  HardHat,
  Car,
  CheckCircle2,
  RefreshCw,
  Loader2,
  AlertCircle,
  ArrowRight,
  ShieldAlert,
  BarChart3,
  Truck,
  ChevronRight,
  Box,
  AlertTriangle,
  Activity,
  TrendingUp,
  FileText,
  HelpCircle,
  DollarSign,
  Layers,
  Sparkles,
  Clock,
  User,
  MapPin,
  Check,
  Eye,
  Compass,
} from "lucide-react";

interface DashboardData {
  stats: {
    totalBookings: number;
    activeBookings: number;
    completedBookings: number;
    totalWorkers: number;
    availableWorkers: number;
    busyWorkers: number;
    totalVehicles: number;
    availableVehicles: number;
    busyVehicles: number;
    documentStatus: string;
  };
  distributions: Record<string, number>;
  recentBookings: Array<{
    _id: string;
    customerId?: { displayName?: string; phone?: string };
    requestId?: {
      pickupAddress?: { city?: string; street?: string };
      destinationAddress?: { city?: string; street?: string };
      preferredDate?: string;
    };
    status: string;
    scheduledDate?: string;
    createdAt: string;
    assignedVehicleId?: string;
    assignedWorkers?: any[];
  }>;
  vendor: {
    _id?: string;
    businessName: string;
    contactPhone: string;
    contactEmail?: string;
    status: string;
    serviceAreas: string[];
    servicesOffered: string[];
  };
}

interface VendorQuoteItem {
  _id: string;
  requestId?: {
    _id?: string;
    pickupAddress?: { city?: string; street?: string };
    destinationAddress?: { city?: string; street?: string };
    preferredDate?: string;
    customerId?: { displayName?: string; phone?: string };
    category?: string;
  };
  status: string;
  totalAmountMinorUnits: number;
  createdAt: string;
  validUntil?: string;
  vehicleType?: string;
  crewCount?: number;
}

interface AvailableRequestItem {
  _id: string;
  pickupAddress?: { city?: string; street?: string };
  destinationAddress?: { city?: string; street?: string };
  preferredDate?: string;
  category?: string;
  items?: string[];
  createdAt: string;
  status: string;
  hasQuoted?: boolean;
}

export default function VendorDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [demandSummary, setDemandSummary] = useState<any>(null);
  const [quotePerfSummary, setQuotePerfSummary] = useState<any>(null);
  const [vendorQuotes, setVendorQuotes] = useState<VendorQuoteItem[]>([]);
  const [availableRequests, setAvailableRequests] = useState<AvailableRequestItem[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userPermissions, setUserPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Load authenticated user profile and permissions
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const storedUser = localStorage.getItem("auth_user");
        if (storedUser) {
          const u = JSON.parse(storedUser);
          setCurrentUser(u);
          if (Array.isArray(u.permissions)) {
            setUserPermissions(u.permissions);
          }
        }
      } catch (e) {
        // Fallback
      }

      // Proactively refresh authenticated profile to guarantee immediate permissions sync
      fetchApi<{ user: any }>("/auth/me")
        .then((res) => {
          if (res?.user) {
            setCurrentUser(res.user);
            if (Array.isArray(res.user.permissions)) {
              setUserPermissions(res.user.permissions);
            }
          }
        })
        .catch(() => null);
    }
  }, []);

  // Granular capability flags based on MongoDB permissions
  const hasAll = useMemo(() => {
    if (!currentUser) return false;
    return (
      currentUser.role === "admin" ||
      currentUser.role === "vendor" ||
      userPermissions.includes("*")
    );
  }, [currentUser, userPermissions]);

  const canViewDemand = useMemo(() => {
    return (
      hasAll ||
      userPermissions.some((p) =>
        p.includes("Leads") || p.includes("Demand") || p.includes("Market")
      )
    );
  }, [hasAll, userPermissions]);

  const canViewQuotations = useMemo(() => {
    return (
      hasAll ||
      userPermissions.some((p) =>
        p.includes("Quotation") || p.includes("Quote")
      )
    );
  }, [hasAll, userPermissions]);

  const canViewBookings = useMemo(() => {
    return (
      hasAll ||
      userPermissions.some((p) =>
        p.includes("Bookings") ||
        p.includes("Dispatch") ||
        p.includes("Milestones") ||
        p.includes("Verification Code")
      )
    );
  }, [hasAll, userPermissions]);

  const canViewFleet = useMemo(() => {
    return (
      hasAll ||
      userPermissions.some((p) =>
        p.includes("Fleet") || p.includes("Vehicle") || p.includes("Transport")
      )
    );
  }, [hasAll, userPermissions]);

  const canViewCrew = useMemo(() => {
    return (
      hasAll ||
      userPermissions.some((p) =>
        p.includes("Employees") || p.includes("Crew") || p.includes("Workers")
      )
    );
  }, [hasAll, userPermissions]);

  const canViewDocuments = useMemo(() => {
    return (
      hasAll ||
      userPermissions.some((p) =>
        p.includes("Document") ||
        p.includes("Regulatory") ||
        p.includes("Compliance")
      )
    );
  }, [hasAll, userPermissions]);

  // Feed table tab state for users with multi-operational permissions
  const [feedTab, setFeedTab] = useState<"dispatches" | "quotations">("dispatches");

  useEffect(() => {
    if (!canViewBookings && canViewQuotations) {
      setFeedTab("quotations");
    } else {
      setFeedTab("dispatches");
    }
  }, [canViewBookings, canViewQuotations]);
  const loadStats = async () => {
    setLoading(true);
    setError("");
    try {
      const [res, demandRes, perfRes, quotesRes, requestsRes] = await Promise.all([
        fetchApi<DashboardData>("/vendor/dashboard/stats"),
        fetchApi<any>("/vendor/analytics/demand").catch(() => null),
        fetchApi<any>("/vendor/analytics/quote-performance").catch(() => null),
        fetchApi<{ quotations: VendorQuoteItem[] }>("/vendor/quotations").catch(() => ({ quotations: [] })),
        fetchApi<{ requests: AvailableRequestItem[] }>("/vendor/requests/available").catch(() => ({ requests: [] })),
      ]);

      setData(res);
      setDemandSummary(demandRes);
      setQuotePerfSummary(perfRes);
      setVendorQuotes(quotesRes?.quotations || []);
      setAvailableRequests(requestsRes?.requests || []);

      if (typeof window !== "undefined" && res.vendor) {
        if ((res.vendor as any)._id) {
          localStorage.setItem("active_vendor_id", (res.vendor as any)._id);
        }
        if (res.vendor.businessName) {
          localStorage.setItem("active_vendor_name", res.vendor.businessName);
        }
      }
    } catch (err: any) {
      setError(err.message || "Failed to load platform metrics.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  // Calculated Real-Time Metrics for Estimators & Quotations
  const openInquiriesCount = useMemo(() => {
    return availableRequests.filter((r) => !r.hasQuoted).length;
  }, [availableRequests]);

  const quotesCount = useMemo(() => vendorQuotes.length, [vendorQuotes]);

  const acceptedQuotes = useMemo(() => {
    return vendorQuotes.filter((q) => q.status === "ACCEPTED");
  }, [vendorQuotes]);

  const pendingQuotes = useMemo(() => {
    return vendorQuotes.filter((q) => q.status === "SUBMITTED");
  }, [vendorQuotes]);

  const declinedQuotes = useMemo(() => {
    return vendorQuotes.filter((q) => q.status === "NOT_SELECTED" || q.status === "REJECTED");
  }, [vendorQuotes]);

  const totalQuotedRupees = useMemo(() => {
    return Math.round(vendorQuotes.reduce((sum, q) => sum + (q.totalAmountMinorUnits || 0), 0) / 100);
  }, [vendorQuotes]);

  const acceptedRupees = useMemo(() => {
    return Math.round(acceptedQuotes.reduce((sum, q) => sum + (q.totalAmountMinorUnits || 0), 0) / 100);
  }, [acceptedQuotes]);

  const winRatePercentage = useMemo(() => {
    if (vendorQuotes.length > 0) {
      return Math.round((acceptedQuotes.length / vendorQuotes.length) * 100);
    }
    return quotePerfSummary?.metrics?.acceptanceRate || 0;
  }, [vendorQuotes, acceptedQuotes, quotePerfSummary]);

  // Clean role display string
  const roleDisplayLabel = useMemo(() => {
    if (!currentUser) return "Vendor Staff";
    if (currentUser.role === "admin") return "Platform Administrator";
    if (currentUser.role === "vendor") return "Primary Vendor Owner";
    const r = currentUser.employeeRole || currentUser.role || "Staff";
    return r
      .replace(/_/g, " ")
      .split(" ")
      .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(" ");
  }, [currentUser]);

  // Is this user specialized primarily in Quotations & Leads (e.g. Darvin)?
  const isQuotationSpecialist = !canViewBookings && !canViewFleet && !canViewCrew && canViewQuotations;

  return (
    <div className="space-y-6 font-sans text-slate-900">
      {/* Top Header */}
      <PageHeader
        title="Dashboard"
        description={
          isQuotationSpecialist
            ? `Marketplace customer demand, open inquiries, and quotation performance for ${data?.vendor?.businessName || "your company"}`
            : "Marketplace operational overview, fleet readiness, and active moving operations"
        }
      >
        <button
          onClick={loadStats}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200/80 rounded-xl shadow-xs transition cursor-pointer disabled:opacity-50"
        >
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
          <span>Refresh</span>
        </button>
      </PageHeader>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-3 text-xs text-rose-700 shadow-xs">
          <AlertCircle size={16} className="shrink-0 text-rose-600 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold">Unable to fetch dashboard metrics</p>
            <p className="mt-0.5 text-rose-600/80">{error}</p>
          </div>
          <button
            onClick={loadStats}
            className="font-semibold underline hover:no-underline text-rose-800 shrink-0 cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {loading && !data ? (
        <div className="py-20 flex flex-col items-center justify-center text-slate-400">
          <Loader2 size={28} className="animate-spin text-blue-600 mb-2" />
          <p className="text-xs font-medium text-slate-500">Loading dynamic operational overview...</p>
        </div>
      ) : data ? (
        <>
          {/* Active Company Overview Banner */}
          {data.vendor && (
            <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
              <div className="flex items-center gap-4 min-w-0">
                <div className="h-14 w-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-black text-xl shadow-xs ring-1 ring-blue-600/20 shrink-0">
                  {(data.vendor.businessName || "PM").charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <h2 className="text-lg font-bold text-slate-900 tracking-tight truncate">
                      {data.vendor.businessName || "Moving Carrier Partner"}
                    </h2>
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
                      <CheckCircle2 size={12} className="text-emerald-600" />
                      <span>{data.vendor.status === "APPROVED" ? "Verified Carrier Partner" : data.vendor.status}</span>
                    </span>

                    {/* Active User Role Badge */}
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200/80">
                      <User size={11} className="text-blue-600" />
                      <span>
                        {currentUser?.displayName || currentUser?.username || "Staff"} • {roleDisplayLabel}
                      </span>
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                    {data.vendor.contactPhone && (
                      <span className="flex items-center gap-1.5 font-mono">
                        <span className="text-slate-400">Phone:</span> {data.vendor.contactPhone}
                      </span>
                    )}
                    {data.vendor.contactEmail && (
                      <span className="flex items-center gap-1.5 font-mono text-blue-600">
                        <span className="text-slate-400">Email:</span> {data.vendor.contactEmail}
                      </span>
                    )}
                    {data.vendor.serviceAreas && data.vendor.serviceAreas.length > 0 && (
                      <span className="flex items-center gap-1 text-[11px] bg-slate-50 text-slate-700 px-2 py-0.5 rounded-md border border-slate-200/70">
                        <span>📍</span> {data.vendor.serviceAreas.slice(0, 3).join(", ")}
                        {data.vendor.serviceAreas.length > 3 && ` +${data.vendor.serviceAreas.length - 3}`}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Dynamic Action Buttons: Only show permitted buttons */}
              <div className="flex flex-wrap items-center gap-2.5 self-end md:self-center shrink-0">
                {canViewDocuments && (
                  <Link
                    href="/vendor/documents"
                    className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200/80 shadow-xs transition"
                  >
                    <FileText size={14} className="text-blue-600" />
                    <span>Compliance Docs</span>
                  </Link>
                )}
                {canViewDemand && (
                  <Link
                    href="/vendor/demand"
                    className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200/80 shadow-xs transition"
                  >
                    <Compass size={14} className="text-sky-600" />
                    <span>Review Customer Leads ({openInquiriesCount})</span>
                  </Link>
                )}
                {canViewQuotations && (
                  <Link
                    href="/vendor/quotations"
                    className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200/80 shadow-xs transition"
                  >
                    <FileText size={14} className="text-indigo-600" />
                    <span>View Quote History ({quotesCount})</span>
                  </Link>
                )}
                {canViewQuotations && (
                  <Link
                    href="/vendor/quotations"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-xs transition"
                  >
                    <TrendingUp size={14} />
                    <span>Create Quotation</span>
                  </Link>
                )}
              </div>
            </div>
          )}

          {/* DYNAMIC KPI CARDS: ROLE-TAILORED */}
          {isQuotationSpecialist ? (
            /* Tailored KPI Cards for Lead Estimators / Quotation Specialists (e.g. Darvin) */
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {/* 1. Open Inquiries Ready for Quotation */}
              <Link
                href="/vendor/demand"
                className="p-5 bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:border-sky-300 hover:shadow-sm transition-all duration-200 block group"
              >
                <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                  <span>Active Customer Leads</span>
                  <div className="h-8 w-8 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center group-hover:bg-sky-600 group-hover:text-white transition">
                    <Compass size={16} />
                  </div>
                </div>
                <p className="text-2xl sm:text-3xl font-bold text-slate-900 mt-2">{openInquiriesCount}</p>
                <p className="text-xs text-slate-500 mt-1">Active customer requests to quote</p>
              </Link>

              {/* 2. Quotes Submitted */}
              <Link
                href="/vendor/quotations"
                className="p-5 bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:border-blue-300 hover:shadow-sm transition-all duration-200 block group"
              >
                <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                  <span>Quotes Submitted</span>
                  <div className="h-8 w-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition">
                    <FileText size={16} />
                  </div>
                </div>
                <p className="text-2xl sm:text-3xl font-bold text-slate-900 mt-2">{quotesCount}</p>
                <p className="text-xs text-slate-500 mt-1">
                  {pendingQuotes.length} pending client decision
                </p>
              </Link>

              {/* 3. Quotation Win Rate */}
              <Link
                href="/vendor/quotations"
                className="p-5 bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:border-teal-300 hover:shadow-sm transition-all duration-200 block group"
              >
                <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                  <span>Quotation Win Rate</span>
                  <div className="h-8 w-8 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center group-hover:bg-teal-600 group-hover:text-white transition">
                    <TrendingUp size={16} />
                  </div>
                </div>
                <p className="text-2xl sm:text-3xl font-bold text-teal-600 mt-2">{winRatePercentage}%</p>
                <p className="text-xs text-slate-500 mt-1">
                  {acceptedQuotes.length} of {quotesCount} bids accepted
                </p>
              </Link>

              {/* 4. Total Quoted Pipeline Value */}
              <Link
                href="/vendor/quotations"
                className="p-5 bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:border-indigo-300 hover:shadow-sm transition-all duration-200 block group"
              >
                <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                  <span>Pipeline Value</span>
                  <div className="h-8 w-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition">
                    <DollarSign size={16} />
                  </div>
                </div>
                <p className="text-2xl sm:text-3xl font-bold text-slate-900 mt-2">
                  ₹{totalQuotedRupees.toLocaleString("en-IN")}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  {acceptedQuotes.length > 0
                    ? `₹${acceptedRupees.toLocaleString("en-IN")} accepted bookings`
                    : "Active submitted bids"}
                </p>
              </Link>
            </div>
          ) : (
            /* Multi-Operational KPI Cards for Owners & Operations Managers */
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {canViewBookings && (
                <Link
                  href="/vendor/bookings?status=ACTIVE"
                  className="p-5 bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:border-blue-200 hover:shadow-sm transition-all duration-200 block group"
                >
                  <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                    <span>Active Moves</span>
                    <div className="h-8 w-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition">
                      <CalendarCheck size={16} />
                    </div>
                  </div>
                  <p className="text-2xl sm:text-3xl font-bold text-slate-900 mt-2">{data.stats.activeBookings}</p>
                  <p className="text-xs text-slate-500 mt-1">Moves currently in execution</p>
                </Link>
              )}

              {canViewCrew && (
                <Link
                  href="/vendor/workers"
                  className="p-5 bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:border-teal-200 hover:shadow-sm transition-all duration-200 block group"
                >
                  <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                    <span>Crew Readiness</span>
                    <div className="h-8 w-8 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center group-hover:bg-teal-600 group-hover:text-white transition">
                      <HardHat size={16} />
                    </div>
                  </div>
                  <p className="text-2xl sm:text-3xl font-bold text-slate-900 mt-2">
                    {data.stats.availableWorkers} <span className="text-sm font-semibold text-slate-400">/ {data.stats.totalWorkers}</span>
                  </p>
                  <p className="text-xs text-slate-500 mt-1">{data.stats.busyWorkers} currently deployed</p>
                </Link>
              )}

              {canViewFleet && (
                <Link
                  href="/vendor/vehicles"
                  className="p-5 bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:border-sky-200 hover:shadow-sm transition-all duration-200 block group"
                >
                  <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                    <span>Fleet Readiness</span>
                    <div className="h-8 w-8 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center group-hover:bg-sky-600 group-hover:text-white transition">
                      <Car size={16} />
                    </div>
                  </div>
                  <p className="text-2xl sm:text-3xl font-bold text-slate-900 mt-2">
                    {data.stats.availableVehicles} <span className="text-sm font-semibold text-slate-400">/ {data.stats.totalVehicles}</span>
                  </p>
                  <p className="text-xs text-slate-500 mt-1">{data.stats.busyVehicles} dispatched on road</p>
                </Link>
              )}

              {canViewDocuments && (
                <Link
                  href="/vendor/documents"
                  className="p-5 bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:border-slate-300 hover:shadow-sm transition-all duration-200 block group"
                >
                  <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                    <span>Carrier Status</span>
                    <div className="h-8 w-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition">
                      <CheckCircle2 size={16} />
                    </div>
                  </div>
                  <div className="mt-2.5 flex items-center gap-2">
                    <StatusBadge status={data.vendor?.status || "APPROVED"} />
                  </div>
                  <p className="text-xs text-slate-500 mt-1 truncate">
                    {data.vendor?.status === "APPROVED" ? "Full dispatch permissions" : "Compliance review in progress"}
                  </p>
                </Link>
              )}
            </div>
          )}

          {/* Operational Action Items: Requires Attention */}
          {canViewDocuments && data.vendor?.status !== "APPROVED" && (
            <div className="bg-amber-50/80 border border-amber-200 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <ShieldAlert size={16} className="text-amber-700 shrink-0" />
                <h2 className="text-xs font-semibold text-amber-900 uppercase tracking-wide">
                  Requires Immediate Attention
                </h2>
              </div>
              <div className="divide-y divide-amber-200/50 text-xs">
                <div className="py-2 flex items-center justify-between">
                  <div>
                    <span className="font-medium text-slate-800">KYC & Verification Documents</span>
                    <span className="text-slate-500 ml-2">Compliance review required for full dispatch capabilities</span>
                  </div>
                  <Link
                    href="/vendor/documents"
                    className="text-xs font-semibold text-amber-800 hover:underline flex items-center gap-1"
                  >
                    <span>Manage Documents</span>
                    <ArrowRight size={12} />
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* Business & Market Intelligence (Only shown if user has Demand or Quotations permissions) */}
          {(canViewDemand || canViewQuotations) && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-blue-600" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                    Business & Market Intelligence
                  </h3>
                </div>
                <span className="text-xs text-slate-400 font-medium">Real-time marketplace telemetry</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {/* Demand & Seasonality */}
                {canViewDemand && (
                  <div className="p-5 bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:border-slate-300 hover:shadow-sm transition-all duration-200 flex flex-col justify-between space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                        <span>Active Market Demand</span>
                        <div className="h-7 w-7 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center">
                          <TrendingUp size={15} />
                        </div>
                      </div>
                      <div>
                        <p className="text-lg font-bold text-slate-900">
                          {demandSummary?.currentMonthSummary?.label ||
                            demandSummary?.peakPeriods?.[0]?.label ||
                            "Current Period (2026)"}
                        </p>
                        <p className="text-xs text-amber-700 font-medium mt-0.5">
                          {demandSummary?.currentMonthSummary?.dominantCategory
                            ? `High Demand on ${demandSummary.currentMonthSummary.dominantCategory}`
                            : "Heavy Load Relocation Surge"}
                        </p>
                      </div>
                    </div>
                    <Link
                      href="/vendor/demand"
                      className="inline-flex items-center justify-between text-xs font-semibold text-blue-600 hover:text-blue-700 pt-3 border-t border-slate-100"
                    >
                      <span>Explore Market Trends ({openInquiriesCount} Leads)</span>
                      <ArrowRight size={12} />
                    </Link>
                  </div>
                )}

                {/* Quotation Win Rate */}
                {canViewQuotations && (
                  <div className="p-5 bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:border-slate-300 hover:shadow-sm transition-all duration-200 flex flex-col justify-between space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                        <span>Quotation Win Rate</span>
                        <div className="h-7 w-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                          <FileText size={15} />
                        </div>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-blue-600">
                          {winRatePercentage}%
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {acceptedQuotes.length} of {quotesCount} quotes booked
                        </p>
                      </div>
                    </div>
                    <Link
                      href="/vendor/quotations"
                      className="inline-flex items-center justify-between text-xs font-semibold text-blue-600 hover:text-blue-700 pt-3 border-t border-slate-100"
                    >
                      <span>View Quotations Console</span>
                      <ArrowRight size={12} />
                    </Link>
                  </div>
                )}

                {/* Customer Feedback */}
                {canViewQuotations && (
                  <div className="p-5 bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:border-slate-300 hover:shadow-sm transition-all duration-200 flex flex-col justify-between space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                        <span>Customer Decision Feedback</span>
                        <div className="h-7 w-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                          <HelpCircle size={15} />
                        </div>
                      </div>
                      {quotePerfSummary?.hasFeedbackData && quotePerfSummary?.commonRejectionReasons?.length > 0 ? (
                        <div>
                          <p className="text-xs font-semibold text-slate-900 truncate">
                            Top: "{quotePerfSummary.commonRejectionReasons[0].reason}"
                          </p>
                          <p className="text-xs text-slate-500 mt-0.5">
                            Cited in {quotePerfSummary.commonRejectionReasons[0].count} unselected quote(s)
                          </p>
                        </div>
                      ) : (
                        <p className="text-xs text-slate-500">
                          {declinedQuotes.length === 0
                            ? "All recent client proposals converted successfully"
                            : "Evaluating customer quotation decisions"}
                        </p>
                      )}
                    </div>
                    <Link
                      href="/vendor/quotations"
                      className="inline-flex items-center justify-between text-xs font-semibold text-blue-600 hover:text-blue-700 pt-3 border-t border-slate-100"
                    >
                      <span>View Detailed Feedback</span>
                      <ArrowRight size={12} />
                    </Link>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* OPERATIONAL VISUAL ANALYTICS: MOVE LIFECYCLE & RESOURCE READINESS */}
          {(canViewBookings || canViewCrew || canViewFleet) && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* Move Lifecycle Distribution */}
              {canViewBookings && (
                <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 flex flex-col justify-between">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
                        <BarChart3 size={18} />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                          Move Lifecycle Distribution
                        </h3>
                        <p className="text-xs text-slate-500">Live booking stages derived from database records</p>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200/70 text-xs font-bold text-slate-700">
                      {data.stats.totalBookings} Total Moves
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-3 py-4">
                    <Link
                      href="/vendor/tracking"
                      className="bg-slate-50/80 hover:bg-white border border-slate-200/70 hover:border-blue-200 hover:shadow-xs rounded-xl p-3.5 flex flex-col justify-between group transition-all"
                    >
                      <div className="flex items-center justify-between">
                        <div className="h-8 w-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                          <Box size={16} />
                        </div>
                        <ChevronRight size={13} className="text-slate-400 group-hover:text-blue-600 transition" />
                      </div>
                      <div className="mt-3">
                        <p className="text-[11px] font-semibold text-slate-500">In Execution</p>
                        <p className="text-xl font-bold text-slate-900 mt-0.5 leading-none">
                          {data.stats.activeBookings}
                        </p>
                        <p className="text-[10px] font-medium text-blue-600 mt-1">
                          {data.stats.totalBookings > 0
                            ? `${Math.round((data.stats.activeBookings / data.stats.totalBookings) * 100)}% of moves`
                            : "0%"}
                        </p>
                      </div>
                    </Link>

                    <Link
                      href="/vendor/bookings"
                      className="bg-slate-50/80 hover:bg-white border border-slate-200/70 hover:border-teal-200 hover:shadow-xs rounded-xl p-3.5 flex flex-col justify-between group transition-all"
                    >
                      <div className="flex items-center justify-between">
                        <div className="h-8 w-8 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
                          <CheckCircle2 size={16} />
                        </div>
                        <ChevronRight size={13} className="text-slate-400 group-hover:text-teal-600 transition" />
                      </div>
                      <div className="mt-3">
                        <p className="text-[11px] font-semibold text-slate-500">Completed</p>
                        <p className="text-xl font-bold text-slate-900 mt-0.5 leading-none">
                          {data.stats.completedBookings}
                        </p>
                        <p className="text-[10px] font-medium text-teal-700 mt-1">
                          {data.stats.totalBookings > 0
                            ? `${Math.round((data.stats.completedBookings / data.stats.totalBookings) * 100)}% of moves`
                            : "0%"}
                        </p>
                      </div>
                    </Link>

                    <Link
                      href="/vendor/bookings"
                      className="bg-slate-50/80 hover:bg-white border border-slate-200/70 hover:border-rose-200 hover:shadow-xs rounded-xl p-3.5 flex flex-col justify-between group transition-all"
                    >
                      <div className="flex items-center justify-between">
                        <div className="h-8 w-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
                          <AlertTriangle size={16} />
                        </div>
                        <ChevronRight size={13} className="text-slate-400 group-hover:text-rose-600 transition" />
                      </div>
                      <div className="mt-3">
                        <p className="text-[11px] font-semibold text-slate-500">Exceptions</p>
                        <p className="text-xl font-bold text-slate-900 mt-0.5 leading-none">
                          {Math.max(
                            0,
                            (data.distributions?.["CANCELLED"] || 0) +
                              (data.distributions?.["TERMINATED"] || 0)
                          )}
                        </p>
                        <p className="text-[10px] font-medium text-slate-400 mt-1">
                          {data.stats.totalBookings > 0
                            ? `${Math.round(
                                (Math.max(
                                  0,
                                  (data.distributions?.["CANCELLED"] || 0) +
                                    (data.distributions?.["TERMINATED"] || 0)
                                ) /
                                  data.stats.totalBookings) *
                                  100
                              )}% of moves`
                            : "0%"}
                        </p>
                      </div>
                    </Link>
                  </div>

                  <Link
                    href="/vendor/tracking"
                    className="mt-2 bg-slate-50 hover:bg-blue-50/50 border border-slate-200/70 hover:border-blue-200 rounded-xl p-3 flex items-center justify-between transition-all group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-9 w-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                        <Truck size={18} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-900 truncate">
                          Real-time telemetry and active route tracking
                        </p>
                        <p className="text-[11px] text-slate-500 truncate">
                          From dispatch to destination, monitor all vehicles live.
                        </p>
                      </div>
                    </div>
                    <ChevronRight size={15} className="text-slate-400 group-hover:text-blue-600 transition shrink-0 ml-2" />
                  </Link>
                </div>
              )}

              {/* Resource Deployment & Readiness */}
              {(canViewCrew || canViewFleet) && (
                <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 flex flex-col justify-between">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
                        <Activity size={18} />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-900">
                          Resource Deployment & Readiness
                        </h3>
                        <p className="text-xs text-slate-500">Live crew personnel & fleet allocation</p>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200/70 text-xs font-bold text-slate-700">
                      {data.stats.totalWorkers + data.stats.totalVehicles} Units
                    </span>
                  </div>

                  <div className="grid grid-cols-4 gap-2 sm:gap-3 py-4">
                    <Link href="/vendor/workers" className="flex flex-col items-center text-center group cursor-pointer">
                      <div className="h-12 w-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mb-1.5 transition-transform group-hover:scale-105">
                        <HardHat size={20} />
                      </div>
                      <span className="text-xl font-bold text-slate-900 leading-none">
                        {data.stats.busyWorkers}
                      </span>
                      <span className="text-[11px] font-medium text-slate-500 mt-1">Active Crew</span>
                    </Link>

                    <Link href="/vendor/workers" className="flex flex-col items-center text-center group cursor-pointer">
                      <div className="h-12 w-12 rounded-full bg-teal-50 text-teal-600 flex items-center justify-center mb-1.5 transition-transform group-hover:scale-105">
                        <CheckCircle2 size={20} />
                      </div>
                      <span className="text-xl font-bold text-slate-900 leading-none">
                        {data.stats.availableWorkers}
                      </span>
                      <span className="text-[11px] font-medium text-slate-500 mt-1">Ready Crew</span>
                    </Link>

                    <Link href="/vendor/vehicles" className="flex flex-col items-center text-center group cursor-pointer">
                      <div className="h-12 w-12 rounded-full bg-sky-50 text-sky-600 flex items-center justify-center mb-1.5 transition-transform group-hover:scale-105">
                        <Truck size={20} />
                      </div>
                      <span className="text-xl font-bold text-slate-900 leading-none">
                        {data.stats.busyVehicles}
                      </span>
                      <span className="text-[11px] font-medium text-slate-500 mt-1">On Road</span>
                    </Link>

                    <Link href="/vendor/vehicles" className="flex flex-col items-center text-center group cursor-pointer">
                      <div className="h-12 w-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mb-1.5 transition-transform group-hover:scale-105">
                        <Car size={20} />
                      </div>
                      <span className="text-xl font-bold text-slate-900 leading-none">
                        {data.stats.availableVehicles}
                      </span>
                      <span className="text-[11px] font-medium text-slate-500 mt-1">Depot Fleet</span>
                    </Link>
                  </div>

                  <Link
                    href="/vendor/bookings"
                    className="mt-2 bg-slate-50 hover:bg-emerald-50/50 border border-slate-200/70 hover:border-emerald-200 rounded-xl p-3 flex items-center justify-between transition-all group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-9 w-9 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center shrink-0">
                        <CalendarCheck size={18} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-900 truncate">
                          Optimal resource allocation drives on-time delivery
                        </p>
                        <p className="text-[11px] text-slate-500 truncate">
                          Dispatch available drivers & trucks to incoming relocations.
                        </p>
                      </div>
                    </div>
                    <ChevronRight size={15} className="text-slate-400 group-hover:text-teal-600 transition shrink-0 ml-2" />
                  </Link>
                </div>
              )}
            </div>
          )}

          {/* COMMERCIAL & MARKETPLACE ANALYTICS: QUOTATIONS & REGIONAL CORRIDORS */}
          {(canViewQuotations || canViewDemand) && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* 1. Quotation Pipeline Conversion */}
              {canViewQuotations && (
                <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 flex flex-col justify-between">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
                        <BarChart3 size={18} />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                          Quotation Conversion Pipeline
                        </h3>
                        <p className="text-xs text-slate-500">Live proposal progression & booking conversions</p>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200/70 text-xs font-bold text-slate-700">
                      {quotesCount} Total Quotes
                    </span>
                  </div>

                  {/* Visual conversion progress bar */}
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden flex my-2">
                    <div
                      style={{ width: `${winRatePercentage}%` }}
                      className="bg-emerald-500 h-full transition-all duration-500"
                      title={`Accepted: ${winRatePercentage}%`}
                    />
                    <div
                      style={{
                        width: `${quotesCount > 0 ? Math.round((pendingQuotes.length / quotesCount) * 100) : 0}%`,
                      }}
                      className="bg-amber-400 h-full transition-all duration-500"
                      title="In Review"
                    />
                    <div
                      style={{
                        width: `${quotesCount > 0 ? Math.round((declinedQuotes.length / quotesCount) * 100) : 0}%`,
                      }}
                      className="bg-slate-300 h-full transition-all duration-500"
                      title="Declined"
                    />
                  </div>

                  {/* 3 Pipeline Cards */}
                  <div className="grid grid-cols-3 gap-3 py-2">
                    {/* Accepted */}
                    <div className="bg-emerald-50/60 border border-emerald-200/70 rounded-xl p-3.5 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-emerald-800 uppercase">Accepted</span>
                          <Check size={14} className="text-emerald-600" />
                        </div>
                        <p className="text-2xl font-bold text-emerald-700 mt-2 leading-none">
                          {acceptedQuotes.length}
                        </p>
                      </div>
                      <p className="text-[11px] font-semibold text-emerald-800 mt-2 font-mono">
                        ₹{acceptedRupees.toLocaleString("en-IN")}
                      </p>
                    </div>

                    {/* Pending Decision */}
                    <div className="bg-amber-50/60 border border-amber-200/70 rounded-xl p-3.5 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-amber-800 uppercase">In Review</span>
                          <Clock size={14} className="text-amber-600" />
                        </div>
                        <p className="text-2xl font-bold text-amber-700 mt-2 leading-none">
                          {pendingQuotes.length}
                        </p>
                      </div>
                      <p className="text-[11px] font-semibold text-amber-800 mt-2">
                        {quotesCount > 0 ? `${Math.round((pendingQuotes.length / quotesCount) * 100)}% of quotes` : "0%"}
                      </p>
                    </div>

                    {/* Unselected */}
                    <div className="bg-slate-50 border border-slate-200/70 rounded-xl p-3.5 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-slate-600 uppercase">Declined</span>
                          <AlertCircle size={14} className="text-slate-400" />
                        </div>
                        <p className="text-2xl font-bold text-slate-700 mt-2 leading-none">
                          {declinedQuotes.length}
                        </p>
                      </div>
                      <p className="text-[11px] font-medium text-slate-500 mt-2">
                        {quotesCount > 0 ? `${Math.round((declinedQuotes.length / quotesCount) * 100)}% of quotes` : "0%"}
                      </p>
                    </div>
                  </div>

                  <Link
                    href="/vendor/quotations"
                    className="bg-slate-50 hover:bg-blue-50/50 border border-slate-200/70 hover:border-blue-200 rounded-xl p-3 flex items-center justify-between transition-all group mt-2"
                  >
                    <div className="flex items-center gap-2.5 text-xs text-slate-700">
                      <Sparkles size={14} className="text-blue-600 shrink-0" />
                      <span>Competitive itemized bids increase client acceptance by over 40%</span>
                    </div>
                    <ChevronRight size={14} className="text-slate-400 group-hover:text-blue-600 transition shrink-0" />
                  </Link>
                </div>
              )}

              {/* 2. Top Regional Demand Corridors */}
              {canViewDemand && (
                <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 flex flex-col justify-between">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center border border-sky-100">
                        <Compass size={18} />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                          High-Demand Moving Categories & Corridors
                        </h3>
                        <p className="text-xs text-slate-500">Live relocation demand in your operational zone</p>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-lg bg-sky-50 border border-sky-200/70 text-xs font-bold text-sky-700">
                      Live Corridors
                    </span>
                  </div>

                  {/* Dominant Category Surge Tag */}
                  {demandSummary?.currentMonthSummary?.dominantCategory && (
                    <div className="my-2.5 p-2.5 rounded-xl bg-amber-50/80 border border-amber-200/80 flex items-center justify-between">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-xs">🔥</span>
                        <span className="text-[11px] font-bold text-amber-900 truncate">
                          Surge: {demandSummary.currentMonthSummary.dominantCategory}
                        </span>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white border border-amber-200 text-amber-800 shrink-0">
                        {demandSummary.currentMonthSummary.dominantCategoryShare}% share
                      </span>
                    </div>
                  )}

                  <div className="space-y-2.5 py-1">
                    {demandSummary?.topRoutes && demandSummary.topRoutes.length > 0 ? (
                      demandSummary.topRoutes.slice(0, 3).map((r: any, idx: number) => (
                        <div
                          key={idx}
                          className="p-3 rounded-xl bg-slate-50/80 border border-slate-200/70 flex items-center justify-between"
                        >
                          <div className="flex items-center gap-2 text-xs font-medium text-slate-800">
                            <span className="h-5 w-5 rounded-full bg-white border border-slate-200 text-slate-600 text-[10px] font-bold flex items-center justify-center shrink-0">
                              {idx + 1}
                            </span>
                            <span>{r.route || `${r.origin} → ${r.destination}`}</span>
                          </div>
                          <span className="text-xs font-bold text-blue-600 font-mono">
                            {r.volume} Move Inquiries
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className="py-6 text-center text-xs text-slate-400">
                        Gathering regional corridor demand telemetry...
                      </div>
                    )}
                  </div>

                  <Link
                    href="/vendor/demand"
                    className="bg-slate-50 hover:bg-sky-50/50 border border-slate-200/70 hover:border-sky-200 rounded-xl p-3 flex items-center justify-between transition-all group"
                  >
                    <div className="flex items-center gap-2.5 text-xs text-slate-700">
                      <MapPin size={14} className="text-sky-600 shrink-0" />
                      <span>View all active regional moving demand and customer inventories</span>
                    </div>
                    <ChevronRight size={14} className="text-slate-400 group-hover:text-sky-600 transition shrink-0" />
                  </Link>
                </div>
              )}
            </div>
          )}

          {/* DYNAMIC ACTIVITY FEED TABLE: CONDITIONAL TABS OR DEDICATED VIEW */}
          {(canViewBookings || canViewQuotations) && (
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="font-bold text-slate-900 text-base">
                        {feedTab === "quotations" ? "Recent Quotations & Inquiries" : "Recent Moving Dispatches"}
                      </h2>
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200/70">
                        {feedTab === "quotations" ? "Live Quotes" : "Live Feed"}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {feedTab === "quotations"
                        ? "Itemized customer proposals, assigned fleet & crew estimations, and status tracking"
                        : "Real-time moving schedule, customer bookings, and fleet assignment status"}
                    </p>
                  </div>

                  {/* Segmented Tab Selector when user has permissions to both Bookings and Quotations */}
                  {canViewBookings && canViewQuotations && (
                    <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200/70 shrink-0 mt-2 sm:mt-0">
                      <button
                        type="button"
                        onClick={() => setFeedTab("dispatches")}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                          feedTab === "dispatches"
                            ? "bg-white text-slate-900 shadow-xs"
                            : "text-slate-600 hover:text-slate-900"
                        }`}
                      >
                        Moving Dispatches ({data.recentBookings?.length || 0})
                      </button>
                      <button
                        type="button"
                        onClick={() => setFeedTab("quotations")}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                          feedTab === "quotations"
                            ? "bg-white text-slate-900 shadow-xs"
                            : "text-slate-600 hover:text-slate-900"
                        }`}
                      >
                        Quotations & Inquiries ({vendorQuotes.length})
                      </button>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {feedTab === "quotations" ? (
                    <>
                      <Link
                        href="/vendor/demand"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200/80 rounded-xl transition"
                      >
                        <Compass size={13} />
                        <span>View Market Leads</span>
                      </Link>
                      <Link
                        href="/vendor/quotations"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100/80 rounded-xl transition"
                      >
                        <span>All Quotations Console</span>
                        <ArrowRight size={13} />
                      </Link>
                    </>
                  ) : (
                    <Link
                      href="/vendor/bookings"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100/80 rounded-xl transition shrink-0"
                    >
                      <span>All Bookings Console</span>
                      <ArrowRight size={13} />
                    </Link>
                  )}
                </div>
              </div>

              {/* RENDER ACTIVE FEED TABLE */}
              {feedTab === "quotations" ? (
                /* Recent Quotations Table */
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50/80 text-slate-500 font-semibold border-b border-slate-200/70 select-none">
                      <tr>
                        <th className="px-6 py-3">Quote / Ref</th>
                        <th className="px-6 py-3">Customer Client</th>
                        <th className="px-6 py-3">Allocated Fleet & Crew</th>
                        <th className="px-6 py-3">Route (Origin &rarr; Destination)</th>
                        <th className="px-6 py-3">Quoted Amount</th>
                        <th className="px-6 py-3">Status</th>
                        <th className="px-6 py-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {vendorQuotes && vendorQuotes.length > 0 ? (
                        vendorQuotes.slice(0, 6).map((q) => {
                          const pickup = q.requestId?.pickupAddress?.city || "Pickup City";
                          const dropoff = q.requestId?.destinationAddress?.city || "Dropoff City";
                          const amountRupees = Math.round((q.totalAmountMinorUnits || 0) / 100);

                          return (
                            <tr key={q._id} className="hover:bg-slate-50/70 transition-colors">
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className="font-mono text-slate-800 font-bold text-xs bg-slate-100 px-2 py-1 rounded-md border border-slate-200">
                                  #{q._id.slice(-6).toUpperCase()}
                                </span>
                              </td>
                              <td className="px-6 py-4">
                                <p className="font-semibold text-slate-900">
                                  {q.requestId?.customerId?.displayName || "Direct Client"}
                                </p>
                                {q.requestId?.customerId?.phone && (
                                  <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                                    {q.requestId.customerId.phone}
                                  </p>
                                )}
                              </td>
                              <td className="px-6 py-4">
                                <div className="space-y-0.5">
                                  <span className="font-semibold text-slate-800 block text-xs truncate max-w-[180px]">
                                    {q.vehicleType || "Dedicated Truck"}
                                  </span>
                                  <span className="text-[11px] text-slate-500">
                                    {q.crewCount ? `${q.crewCount} Dedicated Crew` : "Standard Crew"}
                                  </span>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-1.5 text-xs text-slate-800">
                                  <span className="font-medium">{pickup}</span>
                                  <span className="text-slate-400">&rarr;</span>
                                  <span className="font-medium text-blue-600">{dropoff}</span>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className="font-bold text-slate-900 text-sm">
                                  ₹{amountRupees.toLocaleString("en-IN")}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                {q.status === "ACCEPTED" && (
                                  <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                    ACCEPTED
                                  </span>
                                )}
                                {q.status === "SUBMITTED" && (
                                  <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                    IN REVIEW
                                  </span>
                                )}
                                {(q.status === "NOT_SELECTED" || q.status === "REJECTED") && (
                                  <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                    DECLINED
                                  </span>
                                )}
                              </td>
                              <td className="px-6 py-4 text-right whitespace-nowrap">
                                <Link
                                  href="/vendor/quotations"
                                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-blue-600 hover:text-white hover:bg-blue-600 border border-blue-200 rounded-lg transition"
                                >
                                  <Eye size={12} />
                                  <span>View Quote</span>
                                </Link>
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                            <p className="font-semibold text-slate-600 text-sm">No quotations submitted yet</p>
                            <p className="text-xs text-slate-400 mt-1">
                              Browse available customer inquiries and submit competitive quotations.
                            </p>
                            <Link
                              href="/vendor/demand"
                              className="inline-flex items-center gap-1.5 mt-3 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold shadow-xs hover:bg-blue-700 transition"
                            >
                              <Compass size={14} />
                              <span>Browse Available Leads ({openInquiriesCount})</span>
                            </Link>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              ) : (
                /* Recent Moving Dispatches Table */
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50/80 text-slate-500 font-semibold border-b border-slate-200/70 select-none">
                      <tr>
                        <th className="px-6 py-3">Move / Ref</th>
                        <th className="px-6 py-3">Customer</th>
                        <th className="px-6 py-3">Assigned Fleet & Crew</th>
                        <th className="px-6 py-3">Route (Origin &rarr; Destination)</th>
                        <th className="px-6 py-3">Scheduled Date</th>
                        <th className="px-6 py-3">Move Status</th>
                        <th className="px-6 py-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {data.recentBookings && data.recentBookings.length > 0 ? (
                        data.recentBookings.map((b) => {
                          const pickup = b.requestId?.pickupAddress?.city || b.requestId?.pickupAddress?.street || "Pickup Zone";
                          const dropoff = b.requestId?.destinationAddress?.city || b.requestId?.destinationAddress?.street || "Dropoff Zone";
                          const schedDate = b.scheduledDate
                            ? new Date(b.scheduledDate).toLocaleDateString("en-IN", {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              })
                            : b.requestId?.preferredDate
                            ? new Date(b.requestId.preferredDate).toLocaleDateString("en-IN", {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              })
                            : new Date(b.createdAt).toLocaleDateString("en-IN", {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              });

                          return (
                            <tr key={b._id} className="hover:bg-slate-50/70 transition-colors">
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className="font-mono text-slate-800 font-bold text-xs bg-slate-100 px-2 py-1 rounded-md border border-slate-200">
                                  #{b._id.slice(-6).toUpperCase()}
                                </span>
                              </td>
                              <td className="px-6 py-4">
                                <p className="font-semibold text-slate-900">
                                  {b.customerId?.displayName || "Customer"}
                                </p>
                                {b.customerId?.phone && (
                                  <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                                    {b.customerId.phone}
                                  </p>
                                )}
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-2 text-[11px]">
                                  {b.assignedVehicleId ? (
                                    <span className="font-mono text-blue-700 font-bold bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                                      {b.assignedVehicleId}
                                    </span>
                                  ) : (
                                    <span className="text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded text-[10px] font-medium border border-amber-200">
                                      Unassigned
                                    </span>
                                  )}
                                  <span className="text-slate-500 font-medium">
                                    {(b.assignedWorkers?.length || 0)} crew
                                  </span>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-1.5 text-xs text-slate-800">
                                  <span className="font-medium">{pickup}</span>
                                  <span className="text-slate-400">&rarr;</span>
                                  <span className="font-medium text-blue-600">{dropoff}</span>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-slate-600">
                                <span className="font-medium text-slate-800">{schedDate}</span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <StatusBadge status={b.status} />
                              </td>
                              <td className="px-6 py-4 text-right whitespace-nowrap">
                                <Link
                                  href={`/vendor/bookings/${b._id}`}
                                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-blue-600 hover:text-white hover:bg-blue-600 border border-blue-200 rounded-lg transition"
                                >
                                  <span>Manage</span>
                                  <ArrowRight size={12} />
                                </Link>
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                            No moving operations currently recorded.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}
