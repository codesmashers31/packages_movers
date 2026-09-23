"use client";

import { useState, useEffect } from "react";
import { fetchApi } from "@/lib/api";
import PageHeader from "../components/PageHeader";
import StatusBadge from "../components/StatusBadge";
import {
  BarChart3,
  TrendingUp,
  Users,
  Store,
  CalendarCheck,
  ShieldCheck,
  RefreshCw,
  Loader2,
  AlertCircle,
  FileText,
  DollarSign,
  MapPin,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";

interface ReportsData {
  stats: {
    totalUsers: number;
    totalVendors: number;
    pendingVendorRequests: number;
    approvedVendors: number;
    totalBookings: number;
    activeBookings: number;
    completedBookings: number;
    pendingDisputes: number;
    totalPackages?: number;
    serviceAreasCount?: number;
  };
  distributions?: {
    bookingStatus?: Record<string, number>;
    userRoles?: Record<string, number>;
    vendorStatus?: Record<string, number>;
  };
  bookingsSummary?: {
    totalValueInr: number;
    averageValueInr: number;
    statusCounts: Record<string, number>;
  };
}

export default function AdminReportsPage() {
  const [data, setData] = useState<ReportsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadReports = async () => {
    setLoading(true);
    setError("");
    try {
      // 1. Fetch live platform stats & distributions
      const statsRes = await fetchApi<any>("/admin/dashboard/stats");

      // 2. Fetch live bookings to compute accurate transaction valuation
      const bookingsRes = await fetchApi<{ bookings: any[] }>("/admin/bookings?limit=100");
      const bookings = bookingsRes.bookings || [];

      let totalVal = 0;
      let countWithVal = 0;
      const statusCounts: Record<string, number> = {};

      bookings.forEach((b) => {
        const val = b.quoteSnapshot?.totalAmountMinorUnits;
        if (typeof val === "number" && val > 0) {
          totalVal += val / 100;
          countWithVal++;
        }
        const st = b.status || "UNKNOWN";
        statusCounts[st] = (statusCounts[st] || 0) + 1;
      });

      const avgVal = countWithVal > 0 ? Math.round(totalVal / countWithVal) : 0;

      setData({
        stats: statsRes.stats,
        distributions: statsRes.distributions,
        bookingsSummary: {
          totalValueInr: Math.round(totalVal),
          averageValueInr: avgVal,
          statusCounts,
        },
      });
    } catch (err: any) {
      setError(err.message || "Failed to load operational reports");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Operational Reports"
        description="Comprehensive analytics and performance metrics derived directly from real MongoDB Atlas records"
      >
        <button
          onClick={loadReports}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-[#EEF2F6] border border-[#D9E2EC]/80 rounded-md hover:bg-[#EEF2F6] transition cursor-pointer disabled:opacity-50"
        >
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
          <span>Refresh Data</span>
        </button>
      </PageHeader>

      {error && (
        <div className="p-3 rounded-md bg-rose-50 border border-rose-200 flex items-start gap-2.5 text-xs text-rose-700">
          <AlertCircle size={15} className="shrink-0 text-rose-600 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold">Unable to aggregate analytics</p>
            <p className="mt-0.5 text-slate-600">{error}</p>
          </div>
          <button
            onClick={loadReports}
            className="font-semibold underline hover:no-underline text-rose-800 shrink-0 cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {loading && !data ? (
        <div className="py-20 flex flex-col items-center justify-center text-slate-400">
          <Loader2 size={24} className="animate-spin text-orange-500 mb-2" />
          <p className="text-xs font-medium text-slate-500">Aggregating live platform database records...</p>
        </div>
      ) : data ? (
        <>
          {/* Executive Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 bg-[#EEF2F6] rounded-2xl shadow-neu-flat border border-white/80">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span className="font-medium">Gross Move Value</span>
                <span className="font-mono text-[#2563EB] font-bold">INR</span>
              </div>
              <p className="text-2xl font-semibold text-slate-900 mt-2">
                ₹{data.bookingsSummary?.totalValueInr.toLocaleString() || "0"}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Avg ₹{data.bookingsSummary?.averageValueInr.toLocaleString() || "0"} per quote
              </p>
            </div>

            <div className="p-4 bg-[#EEF2F6] rounded-2xl shadow-neu-flat border border-white/80">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span className="font-medium">Move Fulfillment Rate</span>
                <CheckCircle2 size={15} className="text-[#14B8A6]" />
              </div>
              <p className="text-2xl font-semibold text-slate-900 mt-2">
                {data.stats.totalBookings > 0
                  ? `${Math.round((data.stats.completedBookings / data.stats.totalBookings) * 100)}%`
                  : "—"}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {data.stats.completedBookings} of {data.stats.totalBookings} fulfilled
              </p>
            </div>

            <div className="p-4 bg-[#EEF2F6] rounded-2xl shadow-neu-flat border border-white/80">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span className="font-medium">Vendor Utilization</span>
                <Store size={15} className="text-orange-500" />
              </div>
              <p className="text-2xl font-semibold text-slate-900 mt-2">
                {data.stats.totalVendors > 0
                  ? `${Math.round((data.stats.approvedVendors / data.stats.totalVendors) * 100)}%`
                  : "—"}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {data.stats.approvedVendors} approved / {data.stats.totalVendors} total
              </p>
            </div>

            <div className="p-4 bg-[#EEF2F6] rounded-2xl shadow-neu-flat border border-white/80">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span className="font-medium">Coverage Zones</span>
                <MapPin size={15} className="text-amber-500" />
              </div>
              <p className="text-2xl font-semibold text-slate-900 mt-2">
                {data.stats.serviceAreasCount ?? 0}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Active municipal territories
              </p>
            </div>
          </div>

          {/* Section 1: Detailed Booking Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="bg-[#EEF2F6] rounded-2xl shadow-neu-flat border border-white/80 overflow-hidden">
              <div className="px-4 py-3 border-b border-[#D9E2EC]/70 flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-slate-900 text-sm">Move Volume by Status</h3>
                  <p className="text-xs text-slate-500">Real-time status tallies from Bookings collection</p>
                </div>
                <span className="text-xs font-semibold text-slate-700 bg-[#EEF2F6] px-2 py-0.5 rounded">
                  {data.stats.totalBookings} Total Moves
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#EEF2F6]/75 text-slate-500 font-semibold border-b border-[#D9E2EC]/70 uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="px-4 py-2.5">Lifecycle Stage</th>
                      <th className="px-4 py-2.5 text-right">Count</th>
                      <th className="px-4 py-2.5 text-right">Share (%)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#D9E2EC]/70">
                    {data.bookingsSummary?.statusCounts && Object.keys(data.bookingsSummary.statusCounts).length > 0 ? (
                      Object.entries(data.bookingsSummary.statusCounts).map(([status, count]) => {
                        const pct = data.stats.totalBookings > 0 ? Math.round((count / data.stats.totalBookings) * 100) : 0;
                        return (
                          <tr key={status} className="hover:bg-[#EEF2F6]/50">
                            <td className="px-4 py-2.5">
                              <StatusBadge status={status} />
                            </td>
                            <td className="px-4 py-2.5 text-right font-mono font-medium text-slate-900">
                              {count}
                            </td>
                            <td className="px-4 py-2.5 text-right text-slate-500 font-mono">
                              {pct}%
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={3} className="px-4 py-6 text-center text-slate-400">
                          No booking records recorded.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Section 2: Fleet Partner Network Breakdown */}
            <div className="bg-[#EEF2F6] rounded-2xl shadow-neu-flat border border-white/80 overflow-hidden">
              <div className="px-4 py-3 border-b border-[#D9E2EC]/70 flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-slate-900 text-sm">Fleet Compliance & Onboarding</h3>
                  <p className="text-xs text-slate-500">Live vendor distribution from Vendor collection</p>
                </div>
                <span className="text-xs font-semibold text-slate-700 bg-[#EEF2F6] px-2 py-0.5 rounded">
                  {data.stats.totalVendors} Companies
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#EEF2F6]/75 text-slate-500 font-semibold border-b border-[#D9E2EC]/70 uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="px-4 py-2.5">Compliance State</th>
                      <th className="px-4 py-2.5 text-right">Companies</th>
                      <th className="px-4 py-2.5 text-right">Proportion</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#D9E2EC]/70">
                    <tr className="hover:bg-[#EEF2F6]/50">
                      <td className="px-4 py-2.5">
                        <StatusBadge status="APPROVED" label="Approved & Active" />
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono font-medium text-slate-900">
                        {data.stats.approvedVendors}
                      </td>
                      <td className="px-4 py-2.5 text-right text-slate-500 font-mono">
                        {data.stats.totalVendors > 0 ? Math.round((data.stats.approvedVendors / data.stats.totalVendors) * 100) : 0}%
                      </td>
                    </tr>
                    <tr className="hover:bg-[#EEF2F6]/50">
                      <td className="px-4 py-2.5">
                        <StatusBadge status="PENDING_REVIEW" label="Pending Review" />
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono font-medium text-slate-900">
                        {data.stats.pendingVendorRequests}
                      </td>
                      <td className="px-4 py-2.5 text-right text-slate-500 font-mono">
                        {data.stats.totalVendors > 0 ? Math.round((data.stats.pendingVendorRequests / data.stats.totalVendors) * 100) : 0}%
                      </td>
                    </tr>
                    <tr className="hover:bg-[#EEF2F6]/50">
                      <td className="px-4 py-2.5">
                        <StatusBadge status="SUSPENDED" label="Suspended" />
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono font-medium text-slate-900">
                        {data.distributions?.vendorStatus?.SUSPENDED || 0}
                      </td>
                      <td className="px-4 py-2.5 text-right text-slate-500 font-mono">
                        {data.stats.totalVendors > 0 ? Math.round(((data.distributions?.vendorStatus?.SUSPENDED || 0) / data.stats.totalVendors) * 100) : 0}%
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Section 3: Account Roles & Demographics */}
          <div className="bg-[#EEF2F6] rounded-2xl shadow-neu-flat border border-white/80 overflow-hidden">
            <div className="px-4 py-3 border-b border-[#D9E2EC]/70 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-slate-900 text-sm">Account Allocation by Platform Role</h3>
                <p className="text-xs text-slate-500">Live demographics from MongoDB User collection</p>
              </div>
              <span className="text-xs font-semibold text-slate-700 bg-[#EEF2F6] px-2 py-0.5 rounded">
                {data.stats.totalUsers} Total Accounts
              </span>
            </div>
            <div className="p-4 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
              <div className="p-3 bg-[#EEF2F6] border border-[#D9E2EC]/70 rounded-md">
                <span className="text-slate-500 font-medium">Customer Accounts</span>
                <p className="text-xl font-bold text-slate-900 mt-1">
                  {data.distributions?.userRoles?.customer ?? 0}
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">End-client shippers</p>
              </div>

              <div className="p-3 bg-blue-50/80/70 border border-blue-200/80 rounded-md">
                <span className="text-orange-950 font-medium">Vendor Accounts</span>
                <p className="text-xl font-bold text-orange-950 mt-1">
                  {data.stats.totalVendors}
                </p>
                <p className="text-[11px] text-[#1E40AF]/80 mt-0.5">Moving companies</p>
              </div>

              <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-md">
                <span className="text-amber-950 font-medium">Worker Accounts</span>
                <p className="text-xl font-bold text-amber-950 mt-1">
                  {data.distributions?.userRoles?.worker ?? 0}
                </p>
                <p className="text-[11px] text-amber-800/80 mt-0.5">Field crew & loaders</p>
              </div>

              <div className="p-3 bg-[#EEF2F6] border border-[#D9E2EC]/70 rounded-md">
                <span className="text-slate-700 font-medium">Super Administrators</span>
                <p className="text-xl font-bold text-slate-900 mt-1">
                  {data.distributions?.userRoles?.admin ?? 0}
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">Platform operators</p>
              </div>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
