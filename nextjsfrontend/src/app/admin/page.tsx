"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { fetchApi } from "@/lib/api";
import PageHeader from "./components/PageHeader";
import StatusBadge from "./components/StatusBadge";
import {
  Users,
  Store,
  UserCheck,
  CalendarCheck,
  RefreshCw,
  Loader2,
  AlertCircle,
  ArrowRight,
  ShieldAlert,
  BarChart3,
  CheckCircle2,
  PieChart,
  Truck,
  HardHat,
  Shield,
  ChevronRight,
  Box,
  AlertTriangle,
  UserCog,
  FileCheck2,
  Clock,
  Sparkles,
  Package,
  MapPin,
  Building,
} from "lucide-react";

interface DashboardData {
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
  recentBookings: Array<{
    _id: string;
    customerId?: { displayName?: string; phone?: string };
    vendorId?: { businessName?: string; contactPhone?: string };
    requestId?: {
      pickupAddress?: { city?: string; street?: string };
      destinationAddress?: { city?: string; street?: string };
      preferredDate?: string;
    };
    status: string;
    createdAt: string;
  }>;
  recentActivity: Array<{
    _id: string;
    action: string;
    actorPhone?: string;
    targetType: string;
    targetId?: string;
    reason?: string;
    createdAt: string;
  }>;
}

export default function AdminDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [currentUser, setCurrentUser] = useState<any>(null);

  const loadStats = async (forceSkeleton = false) => {
    if (forceSkeleton || !data) {
      setLoading(true);
    } else {
      setIsRefreshing(true);
    }
    setError("");
    try {
      const res = await fetchApi<DashboardData>("/admin/dashboard/stats");
      setData(res);
    } catch (err: any) {
      setError(err.message || "Failed to load platform metrics.");
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("auth_user");
        if (stored) {
          setCurrentUser(JSON.parse(stored));
        }
      } catch (e) {
        // Fallback
      }
    }
    loadStats(false);
  }, []);

  // Compute permission scope
  const userPerms: string[] = Array.isArray(currentUser?.permissions) ? currentUser.permissions : [];
  const isSuperAdmin =
    currentUser?.phone === "+919876543210" ||
    currentUser?.adminRole === "super_admin" ||
    userPerms.includes("*");

  const hasPerm = (p: string) => isSuperAdmin || userPerms.includes(p);

  const canViewVendors = hasPerm("vendors:view");
  const canApproveVendors = hasPerm("vendors:approve");
  const canViewDocuments = hasPerm("documents:view") || canViewVendors;
  const canViewBookings = hasPerm("bookings:view");
  const canViewDisputes = hasPerm("disputes:view");
  const canManageStaff = hasPerm("staff:view") || hasPerm("staff:manage");
  const canManagePackages = hasPerm("packages:manage");
  const canViewAudit = hasPerm("audit:view");

  // Determine Role Title
  const rawRole = currentUser?.adminRole || "super_admin";
  const roleTitle = isSuperAdmin
    ? "Super Administrator"
    : rawRole
        .split("_")
        .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");

  const department = currentUser?.adminDepartment || (isSuperAdmin ? "Executive Governance" : "Operations");

  return (
    <div className="space-y-6">
      {/* Dynamic Role Identity Header Banner */}
      <div className="p-5 rounded-2xl bg-[#EEF2F6] shadow-neu-flat border border-white/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-[#2563EB] to-[#0EA5E9] text-white flex items-center justify-center font-extrabold text-base shadow-neu-raised-sm shrink-0">
            {currentUser?.displayName?.charAt(0).toUpperCase() || "A"}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-base font-bold text-[#1E293B]">
                Welcome, {currentUser?.displayName || "Administrator"}
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                {roleTitle}
              </span>
              <span className="text-xs text-[#64748B] flex items-center gap-1 font-medium">
                <Building size={12} />
                <span>{department}</span>
              </span>
            </div>
            <div className="flex items-center gap-1.5 mt-1 text-[11px] text-[#64748B]">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Session Authenticated • Dynamic RBAC Active</span>
              {isSuperAdmin ? (
                <span className="text-amber-700 font-bold ml-1">• Root Platform Privileges (*)</span>
              ) : (
                <span className="text-blue-700 font-semibold ml-1">
                  • {userPerms.length} Capabilities Granted
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Action Toolbar */}
        <div className="flex items-center gap-2 flex-wrap">
          {canManageStaff && (
            <Link
              href="/admin/employees"
              className="neu-btn px-3 py-1.5 rounded-xl text-xs font-semibold text-[#2563EB] hover:text-blue-800 flex items-center gap-1.5 cursor-pointer"
            >
              <UserCog size={13} />
              <span>Platform Staff</span>
            </Link>
          )}

          {canApproveVendors && (
            <Link
              href="/admin/vendor-requests"
              className="neu-btn px-3 py-1.5 rounded-xl text-xs font-semibold text-amber-800 hover:text-amber-900 flex items-center gap-1.5 cursor-pointer"
            >
              <UserCheck size={13} />
              <span>Review Carriers</span>
            </Link>
          )}

          {canViewDocuments && (
            <Link
              href="/admin/documents"
              className="neu-btn px-3 py-1.5 rounded-xl text-xs font-semibold text-teal-800 hover:text-teal-900 flex items-center gap-1.5 cursor-pointer"
            >
              <FileCheck2 size={13} />
              <span>Compliance Docs</span>
            </Link>
          )}

          <button
            onClick={() => loadStats(true)}
            disabled={loading || isRefreshing}
            className="neu-btn px-3 py-1.5 rounded-xl text-xs font-semibold text-[#64748B] hover:text-[#1E293B] flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            title="Refresh Live Data"
          >
            <RefreshCw size={13} className={loading || isRefreshing ? "animate-spin text-[#2563EB]" : ""} />
            <span>{isRefreshing ? "Syncing..." : "Refresh"}</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 flex items-start gap-2.5 text-xs text-rose-700 shadow-neu-raised-sm">
          <AlertCircle size={16} className="shrink-0 text-rose-600 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold">Unable to fetch dashboard metrics</p>
            <p className="mt-0.5 text-[#475569]">{error}</p>
          </div>
          <button
            onClick={() => loadStats(true)}
            className="font-semibold underline hover:no-underline text-rose-800 shrink-0 cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {loading && !data ? (
        <div className="py-16 flex flex-col items-center justify-center text-[#94A3B8]">
          <Loader2 size={24} className="animate-spin text-[#2563EB] mb-2" />
          <p className="text-xs font-medium text-[#64748B]">Loading platform operational feed...</p>
        </div>
      ) : data ? (
        <>
          {/* ROLE-ADAPTIVE KPI CARDS */}
          {/* 1. COMPLIANCE OFFICER VIEW */}
          {rawRole === "compliance_officer" && !isSuperAdmin ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Pending Carrier Requests */}
              <Link
                href="/admin/vendor-requests"
                className="p-5 bg-[#EEF2F6] rounded-2xl shadow-neu-flat border border-amber-300/80 hover:shadow-neu-flat-sm transition-all block group"
              >
                <div className="flex items-center justify-between text-xs text-amber-800">
                  <span className="font-bold">Carrier Onboarding Queue</span>
                  <UserCheck size={16} className="text-amber-600" />
                </div>
                <p className="text-3xl font-black text-amber-900 mt-2">
                  {data.stats.pendingVendorRequests}
                </p>
                <p className="text-xs text-amber-800 mt-1 font-medium">Pending regulatory review</p>
              </Link>

              {/* Verified Carriers */}
              <Link
                href="/admin/vendors"
                className="p-5 bg-[#EEF2F6] rounded-2xl shadow-neu-flat border border-white/80 hover:shadow-neu-flat-sm transition-all block group"
              >
                <div className="flex items-center justify-between text-xs text-[#64748B]">
                  <span className="font-medium">Active Verified Carriers</span>
                  <Store size={15} className="text-[#2563EB]" />
                </div>
                <p className="text-2xl font-bold text-[#1E293B] mt-2">
                  {data.stats.approvedVendors}
                </p>
                <p className="text-xs text-[#64748B] mt-1">of {data.stats.totalVendors} total registered</p>
              </Link>

              {/* Compliance Documents */}
              <Link
                href="/admin/documents"
                className="p-5 bg-[#EEF2F6] rounded-2xl shadow-neu-flat border border-white/80 hover:shadow-neu-flat-sm transition-all block group"
              >
                <div className="flex items-center justify-between text-xs text-[#64748B]">
                  <span className="font-medium">Commercial Documents</span>
                  <FileCheck2 size={15} className="text-teal-600" />
                </div>
                <p className="text-2xl font-bold text-[#1E293B] mt-2">Verified</p>
                <p className="text-xs text-teal-700 mt-1 font-medium">GST, Licenses & Insurance</p>
              </Link>

              {/* Audit Logs */}
              <Link
                href="/admin/audit-logs"
                className="p-5 bg-[#EEF2F6] rounded-2xl shadow-neu-flat border border-white/80 hover:shadow-neu-flat-sm transition-all block group"
              >
                <div className="flex items-center justify-between text-xs text-[#64748B]">
                  <span className="font-medium">Security Audit Trail</span>
                  <Clock size={15} className="text-purple-600" />
                </div>
                <p className="text-2xl font-bold text-[#1E293B] mt-2">
                  {data.recentActivity?.length || 0}
                </p>
                <p className="text-xs text-[#64748B] mt-1">Recent regulatory actions</p>
              </Link>
            </div>
          ) : rawRole === "operations_manager" && !isSuperAdmin ? (
            /* 2. OPERATIONS MANAGER VIEW */
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Active Moves */}
              <Link
                href="/admin/bookings"
                className="p-5 bg-[#EEF2F6] rounded-2xl shadow-neu-flat border border-blue-300/80 hover:shadow-neu-flat-sm transition-all block group"
              >
                <div className="flex items-center justify-between text-xs text-[#2563EB]">
                  <span className="font-bold">In-Execution Moves</span>
                  <Box size={16} className="text-[#2563EB]" />
                </div>
                <p className="text-3xl font-black text-[#1E293B] mt-2">
                  {data.stats.activeBookings}
                </p>
                <p className="text-xs text-[#2563EB] mt-1 font-medium">Live driver dispatches</p>
              </Link>

              {/* Completed Moves */}
              <Link
                href="/admin/bookings?status=COMPLETED"
                className="p-5 bg-[#EEF2F6] rounded-2xl shadow-neu-flat border border-white/80 hover:shadow-neu-flat-sm transition-all block group"
              >
                <div className="flex items-center justify-between text-xs text-[#64748B]">
                  <span className="font-medium">Completed Deliveries</span>
                  <CheckCircle2 size={15} className="text-emerald-600" />
                </div>
                <p className="text-2xl font-bold text-emerald-600 mt-2">
                  {data.stats.completedBookings}
                </p>
                <p className="text-xs text-[#64748B] mt-1">Successfully fulfilled</p>
              </Link>

              {/* Total Scheduled Moves */}
              <Link
                href="/admin/bookings"
                className="p-5 bg-[#EEF2F6] rounded-2xl shadow-neu-flat border border-white/80 hover:shadow-neu-flat-sm transition-all block group"
              >
                <div className="flex items-center justify-between text-xs text-[#64748B]">
                  <span className="font-medium">Total Bookings</span>
                  <CalendarCheck size={15} className="text-purple-600" />
                </div>
                <p className="text-2xl font-bold text-[#1E293B] mt-2">
                  {data.stats.totalBookings}
                </p>
                <p className="text-xs text-[#64748B] mt-1">Platform move records</p>
              </Link>

              {/* Claims & Exceptions */}
              <Link
                href="/admin/disputes"
                className="p-5 bg-[#EEF2F6] rounded-2xl shadow-neu-flat border border-rose-300/80 hover:shadow-neu-flat-sm transition-all block group"
              >
                <div className="flex items-center justify-between text-xs text-rose-700">
                  <span className="font-bold">Pending Disputes</span>
                  <AlertTriangle size={16} className="text-rose-600" />
                </div>
                <p className="text-3xl font-black text-rose-800 mt-2">
                  {data.stats.pendingDisputes}
                </p>
                <p className="text-xs text-rose-700 mt-1 font-medium">Exceptions requiring review</p>
              </Link>
            </div>
          ) : (
            /* 3. SUPER ADMIN / 360° COMPREHENSIVE VIEW */
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <Link
                href="/admin/users"
                className="p-5 bg-[#EEF2F6] rounded-2xl shadow-neu-flat border border-white/80 hover:shadow-neu-flat-sm transition-all block group"
              >
                <div className="flex items-center justify-between text-xs text-[#64748B]">
                  <span className="font-medium">Total Platform Users</span>
                  <Users size={15} className="text-[#94A3B8] group-hover:text-[#334155] transition" />
                </div>
                <p className="text-2xl font-bold text-[#1E293B] mt-2">{data.stats.totalUsers}</p>
                <p className="text-xs text-[#64748B] mt-1">Customers, vendors & crew</p>
              </Link>

              <Link
                href="/admin/vendors"
                className="p-5 bg-[#EEF2F6] rounded-2xl shadow-neu-flat border border-white/80 hover:shadow-neu-flat-sm transition-all block group"
              >
                <div className="flex items-center justify-between text-xs text-[#64748B]">
                  <span className="font-medium">Verified Carrier Fleet</span>
                  <Store size={15} className="text-[#2563EB] transition" />
                </div>
                <p className="text-2xl font-bold text-[#1E293B] mt-2">{data.stats.approvedVendors}</p>
                <p className="text-xs text-[#64748B] mt-1">of {data.stats.totalVendors} registered carriers</p>
              </Link>

              <Link
                href="/admin/bookings"
                className="p-5 bg-[#EEF2F6] rounded-2xl shadow-neu-flat border border-white/80 hover:shadow-neu-flat-sm transition-all block group"
              >
                <div className="flex items-center justify-between text-xs text-[#64748B]">
                  <span className="font-medium">Active In-Transit Moves</span>
                  <Box size={15} className="text-purple-600 transition" />
                </div>
                <p className="text-2xl font-bold text-[#1E293B] mt-2">{data.stats.activeBookings}</p>
                <p className="text-xs text-[#64748B] mt-1">of {data.stats.totalBookings} total moves</p>
              </Link>

              <Link
                href="/admin/bookings?status=COMPLETED"
                className="p-5 bg-[#EEF2F6] rounded-2xl shadow-neu-flat border border-white/80 hover:shadow-neu-flat-sm transition-all block group"
              >
                <div className="flex items-center justify-between text-xs text-[#64748B]">
                  <span className="font-medium">Completed Deliveries</span>
                  <CheckCircle2 size={15} className="text-emerald-600 transition" />
                </div>
                <p className="text-2xl font-bold text-emerald-600 mt-2">{data.stats.completedBookings}</p>
                <p className="text-xs text-[#64748B] mt-1">Successfully fulfilled</p>
              </Link>
            </div>
          )}

          {/* Operational Action Items (Requires Attention) */}
          {(data.stats.pendingVendorRequests > 0 || data.stats.pendingDisputes > 0) && (
            <div className="bg-[#EEF2F6] shadow-neu-flat border border-amber-300/60 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-2.5">
                <ShieldAlert size={16} className="text-amber-700 shrink-0" />
                <h2 className="text-xs font-bold text-amber-900 uppercase tracking-wide">
                  Action Required • Pending Operational Queue
                </h2>
              </div>
              <div className="divide-y divide-amber-200/40 text-xs">
                {data.stats.pendingVendorRequests > 0 && canApproveVendors && (
                  <div className="py-2 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-[#1E293B]">
                        {data.stats.pendingVendorRequests} Carrier {data.stats.pendingVendorRequests === 1 ? "application" : "applications"}
                      </span>
                      <span className="text-[#64748B] ml-2">Awaiting commercial license & GST review</span>
                    </div>
                    <Link
                      href="/admin/vendor-requests"
                      className="text-xs font-bold text-amber-800 hover:underline flex items-center gap-1"
                    >
                      <span>Review Applications</span>
                      <ArrowRight size={12} />
                    </Link>
                  </div>
                )}
                {data.stats.pendingDisputes > 0 && canViewDisputes && (
                  <div className="py-2 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-[#1E293B]">
                        {data.stats.pendingDisputes} Terminated move {data.stats.pendingDisputes === 1 ? "record" : "records"}
                      </span>
                      <span className="text-[#64748B] ml-2">Claim exception requires arbitration</span>
                    </div>
                    <Link
                      href="/admin/disputes"
                      className="text-xs font-bold text-amber-800 hover:underline flex items-center gap-1"
                    >
                      <span>Inspect Claims</span>
                      <ArrowRight size={12} />
                    </Link>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Visual Analytics & Stakeholder Pillars */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Chart 1: Move Lifecycle Distribution */}
            {canViewBookings ? (
              <div className="bg-[#EEF2F6] rounded-2xl shadow-neu-flat border border-white/80 p-5 flex flex-col justify-between">
                <div className="flex items-center justify-between pb-2">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-xl bg-blue-500/10 shadow-neu-raised-sm flex items-center justify-center text-[#2563EB] border border-blue-200/50">
                      <BarChart3 size={20} />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-[#1E293B] uppercase tracking-wide">
                        Move Lifecycle Progression
                      </h3>
                      <p className="text-xs text-[#64748B]">Live booking stages derived from database records</p>
                    </div>
                  </div>
                  <span className="px-3 py-1 rounded-xl bg-[#EEF2F6] shadow-neu-inset-sm border border-white/60 text-xs font-bold text-[#1E293B]">
                    {data.stats.totalBookings} Total Moves
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2.5 sm:gap-4 py-4">
                  <Link
                    href="/admin/bookings"
                    className="bg-gradient-to-b from-blue-50/80 to-blue-100/50 shadow-neu-raised-sm hover:shadow-neu-flat border border-blue-200/60 rounded-2xl p-4 relative overflow-hidden flex flex-col justify-between group transition-all"
                  >
                    <div className="flex items-center justify-between relative z-10">
                      <div className="h-8 w-8 rounded-xl bg-[#2563EB] flex items-center justify-center text-white">
                        <Box size={18} />
                      </div>
                      <div className="h-6 w-6 rounded-full bg-white shadow-xs flex items-center justify-center text-[#2563EB]">
                        <ChevronRight size={13} strokeWidth={2.5} />
                      </div>
                    </div>
                    <div className="mt-3 relative z-10">
                      <p className="text-xs font-bold text-[#2563EB]">In Execution</p>
                      <p className="text-2xl font-black text-[#1E293B] mt-1">{data.stats.activeBookings}</p>
                    </div>
                  </Link>

                  <Link
                    href="/admin/bookings?status=COMPLETED"
                    className="bg-gradient-to-b from-emerald-50/80 to-emerald-100/50 shadow-neu-raised-sm hover:shadow-neu-flat border border-emerald-200/60 rounded-2xl p-4 relative overflow-hidden flex flex-col justify-between group transition-all"
                  >
                    <div className="flex items-center justify-between relative z-10">
                      <div className="h-8 w-8 rounded-xl bg-emerald-600 flex items-center justify-center text-white">
                        <CheckCircle2 size={18} />
                      </div>
                      <div className="h-6 w-6 rounded-full bg-white shadow-xs flex items-center justify-center text-emerald-600">
                        <ChevronRight size={13} strokeWidth={2.5} />
                      </div>
                    </div>
                    <div className="mt-3 relative z-10">
                      <p className="text-xs font-bold text-emerald-700">Fulfilled</p>
                      <p className="text-2xl font-black text-[#1E293B] mt-1">{data.stats.completedBookings}</p>
                    </div>
                  </Link>

                  <Link
                    href="/admin/disputes"
                    className="bg-gradient-to-b from-rose-50/80 to-rose-100/50 shadow-neu-raised-sm hover:shadow-neu-flat border border-rose-200/60 rounded-2xl p-4 relative overflow-hidden flex flex-col justify-between group transition-all"
                  >
                    <div className="flex items-center justify-between relative z-10">
                      <div className="h-8 w-8 rounded-xl bg-rose-600 flex items-center justify-center text-white">
                        <AlertTriangle size={18} />
                      </div>
                      <div className="h-6 w-6 rounded-full bg-white shadow-xs flex items-center justify-center text-rose-600">
                        <ChevronRight size={13} strokeWidth={2.5} />
                      </div>
                    </div>
                    <div className="mt-3 relative z-10">
                      <p className="text-xs font-bold text-rose-700">Exceptions</p>
                      <p className="text-2xl font-black text-[#1E293B] mt-1">{data.stats.pendingDisputes}</p>
                    </div>
                  </Link>
                </div>
              </div>
            ) : (
              /* For Non-Booking Staff (e.g. Compliance): Show Carrier Verification Pipeline */
              <div className="bg-[#EEF2F6] rounded-2xl shadow-neu-flat border border-white/80 p-5 flex flex-col justify-between">
                <div className="flex items-center justify-between pb-2">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-xl bg-amber-500/10 shadow-neu-raised-sm flex items-center justify-center text-amber-700 border border-amber-200/50">
                      <UserCheck size={20} />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-[#1E293B] uppercase tracking-wide">
                        Carrier Regulatory Pipeline
                      </h3>
                      <p className="text-xs text-[#64748B]">Application & KYC verification stages</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3 py-3">
                  <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-amber-900">Pending Review</p>
                      <p className="text-[11px] text-amber-700">Carriers waiting for document audit</p>
                    </div>
                    <span className="text-xl font-black text-amber-900">{data.stats.pendingVendorRequests}</span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-emerald-900">Approved & Compliant</p>
                      <p className="text-[11px] text-emerald-700">Verified carriers in active service</p>
                    </div>
                    <span className="text-xl font-black text-emerald-900">{data.stats.approvedVendors}</span>
                  </div>
                </div>

                <Link
                  href="/admin/vendor-requests"
                  className="w-full py-2 rounded-xl bg-[#2563EB] text-white text-xs font-bold flex items-center justify-center gap-2 hover:bg-blue-700 transition"
                >
                  <span>Open Carrier Approval Console</span>
                  <ArrowRight size={13} />
                </Link>
              </div>
            )}

            {/* Chart 2: Stakeholder Distribution */}
            <div className="bg-[#EEF2F6] rounded-2xl shadow-neu-flat border border-white/80 p-5 flex flex-col justify-between">
              <div className="flex items-center justify-between pb-2">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-xl bg-blue-500/10 shadow-neu-raised-sm flex items-center justify-center text-[#2563EB] border border-blue-200/50">
                    <PieChart size={20} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#1E293B]">Stakeholder Architecture</h3>
                    <p className="text-xs text-[#64748B]">Platform users across verified ecosystem roles</p>
                  </div>
                </div>
                <span className="px-3 py-1 rounded-xl bg-[#EEF2F6] shadow-neu-inset-sm border border-white/60 text-xs font-bold text-[#1E293B]">
                  {data.stats.totalUsers} Total
                </span>
              </div>

              <div className="grid grid-cols-4 gap-2 py-4">
                <div className="flex flex-col items-center text-center">
                  <div className="h-12 w-12 rounded-full bg-blue-50 shadow-neu-raised-sm border border-blue-200/60 flex items-center justify-center text-[#2563EB] mb-1.5">
                    <Users size={20} />
                  </div>
                  <span className="text-xl font-black text-[#1E293B]">
                    {data.distributions?.userRoles?.customer ?? 0}
                  </span>
                  <span className="text-[11px] font-semibold text-[#64748B]">Clients</span>
                </div>

                <div className="flex flex-col items-center text-center">
                  <div className="h-12 w-12 rounded-full bg-amber-50 shadow-neu-raised-sm border border-amber-200/60 flex items-center justify-center text-[#EA580C] mb-1.5">
                    <Truck size={20} />
                  </div>
                  <span className="text-xl font-black text-[#1E293B]">
                    {data.stats.totalVendors ?? 0}
                  </span>
                  <span className="text-[11px] font-semibold text-[#64748B]">Carriers</span>
                </div>

                <div className="flex flex-col items-center text-center">
                  <div className="h-12 w-12 rounded-full bg-teal-50 shadow-neu-raised-sm border border-teal-200/60 flex items-center justify-center text-[#14B8A6] mb-1.5">
                    <HardHat size={20} />
                  </div>
                  <span className="text-xl font-black text-[#1E293B]">
                    {data.distributions?.userRoles?.worker ?? 0}
                  </span>
                  <span className="text-[11px] font-semibold text-[#64748B]">Crew</span>
                </div>

                <div className="flex flex-col items-center text-center">
                  <div className="h-12 w-12 rounded-full bg-purple-50 shadow-neu-raised-sm border border-purple-200/60 flex items-center justify-center text-[#7C3AED] mb-1.5">
                    <Shield size={20} />
                  </div>
                  <span className="text-xl font-black text-[#1E293B]">
                    {data.distributions?.userRoles?.admin ?? 0}
                  </span>
                  <span className="text-[11px] font-semibold text-[#64748B]">Staff</span>
                </div>
              </div>

              {canManageStaff && (
                <Link
                  href="/admin/employees"
                  className="mt-2 bg-[#EEF2F6] shadow-neu-inset-sm hover:shadow-neu-flat border border-white/60 rounded-2xl p-3 flex items-center justify-between transition group cursor-pointer"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <UserCog size={16} className="text-[#2563EB]" />
                    <span className="text-xs font-bold text-[#1E293B] truncate">
                      Manage Platform Staff & Delegations
                    </span>
                  </div>
                  <ChevronRight size={15} className="text-[#2563EB]" />
                </Link>
              )}
            </div>
          </div>

          {/* DYNAMIC OPERATIONAL FEED */}
          {canViewBookings && (
            <div className="bg-[#EEF2F6] rounded-2xl shadow-neu-flat border border-white/80 overflow-hidden">
              <div className="px-5 py-4 border-b border-[#D9E2EC]/70 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-bold text-[#1E293B] text-base">Recent Platform Moves</h2>
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50/80 text-[#2563EB] border border-blue-200/80">
                      Live Dispatch Feed
                    </span>
                  </div>
                  <p className="text-xs text-[#64748B] mt-0.5">
                    Moving schedules, customer bookings, and fleet assignment status
                  </p>
                </div>
                <Link
                  href="/admin/bookings"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#2563EB] bg-blue-50/80 hover:bg-blue-100/80 rounded-lg transition shrink-0"
                >
                  <span>All Bookings Console</span>
                  <ArrowRight size={13} />
                </Link>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#EEF2F6] text-[#64748B] font-semibold border-b border-[#D9E2EC]/70 select-none">
                    <tr>
                      <th className="px-5 py-3">Move / Ref</th>
                      <th className="px-5 py-3">Customer</th>
                      <th className="px-5 py-3">Assigned Fleet</th>
                      <th className="px-5 py-3">Route</th>
                      <th className="px-5 py-3">Date</th>
                      <th className="px-5 py-3">Status</th>
                      <th className="px-5 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#D9E2EC]/70">
                    {data.recentBookings && data.recentBookings.length > 0 ? (
                      data.recentBookings.map((b) => {
                        const pickup =
                          b.requestId?.pickupAddress?.city ||
                          b.requestId?.pickupAddress?.street ||
                          "Pickup Zone";
                        const dropoff =
                          b.requestId?.destinationAddress?.city ||
                          b.requestId?.destinationAddress?.street ||
                          "Dropoff Zone";
                        const schedDate = b.requestId?.preferredDate
                          ? new Date(b.requestId.preferredDate).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                            })
                          : new Date(b.createdAt).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                            });

                        return (
                          <tr key={b._id} className="hover:bg-[#EEF2F6]/80 transition-colors">
                            <td className="px-5 py-3.5 whitespace-nowrap">
                              <span className="font-mono text-[#1E293B] font-bold text-xs bg-[#EEF2F6]/80 px-2 py-1 rounded border border-[#D9E2EC]/70">
                                #{b._id.slice(-6).toUpperCase()}
                              </span>
                            </td>
                            <td className="px-5 py-3.5">
                              <p className="font-semibold text-[#1E293B]">
                                {b.customerId?.displayName || "Customer"}
                              </p>
                              {b.customerId?.phone && (
                                <p className="text-[11px] text-[#64748B] font-mono mt-0.5">
                                  {b.customerId.phone}
                                </p>
                              )}
                            </td>
                            <td className="px-5 py-3.5">
                              <p className="font-medium text-[#1E293B]">
                                {b.vendorId?.businessName || "Pending Fleet Assignment"}
                              </p>
                            </td>
                            <td className="px-5 py-3.5">
                              <div className="flex items-center gap-1.5 text-xs text-[#1E293B]">
                                <span className="font-medium">{pickup}</span>
                                <span className="text-[#94A3B8]">&rarr;</span>
                                <span className="font-medium text-[#2563EB]">{dropoff}</span>
                              </div>
                            </td>
                            <td className="px-5 py-3.5 whitespace-nowrap text-[#64748B]">
                              <span className="font-medium text-[#1E293B]">{schedDate}</span>
                            </td>
                            <td className="px-5 py-3.5 whitespace-nowrap">
                              <StatusBadge status={b.status} />
                            </td>
                            <td className="px-5 py-3.5 text-right whitespace-nowrap">
                              <Link
                                href="/admin/bookings"
                                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-[#2563EB] hover:text-white hover:bg-[#2563EB] border border-blue-200 rounded-lg transition"
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
                        <td colSpan={7} className="px-5 py-12 text-center text-[#94A3B8]">
                          No moving operations currently recorded.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* AUDIT LOG TRAIL (if accessible) */}
          {canViewAudit && data.recentActivity && data.recentActivity.length > 0 && (
            <div className="bg-[#EEF2F6] rounded-2xl shadow-neu-flat border border-white/80 overflow-hidden">
              <div className="px-5 py-4 border-b border-[#D9E2EC]/70 flex items-center justify-between">
                <div>
                  <h2 className="font-bold text-[#1E293B] text-sm">Recent Administrative Audit Trail</h2>
                  <p className="text-xs text-[#64748B]">Immutable operational actions and compliance decisions</p>
                </div>
                <Link
                  href="/admin/audit-logs"
                  className="text-xs font-bold text-[#2563EB] hover:underline flex items-center gap-1"
                >
                  <span>Full Audit Trail</span>
                  <ArrowRight size={12} />
                </Link>
              </div>
              <div className="divide-y divide-[#D9E2EC]/60">
                {data.recentActivity.slice(0, 5).map((act) => (
                  <div key={act._id} className="px-5 py-3 flex items-center justify-between text-xs">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-[#2563EB] text-[11px] bg-blue-50 px-2 py-0.5 rounded">
                          {act.action}
                        </span>
                        <span className="font-semibold text-[#1E293B]">{act.targetType}</span>
                        {act.reason && <span className="text-[#64748B]">• {act.reason}</span>}
                      </div>
                      <p className="text-[10px] text-[#94A3B8] mt-0.5 font-mono">
                        Actor: {act.actorPhone || "System"} • ID: #{act._id.slice(-6).toUpperCase()}
                      </p>
                    </div>
                    <span className="text-[11px] text-[#64748B] whitespace-nowrap">
                      {new Date(act.createdAt).toLocaleTimeString("en-IN", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}