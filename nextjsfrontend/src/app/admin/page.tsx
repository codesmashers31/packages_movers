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
  Layers,
  PieChart,
  Truck,
  HardHat,
  Shield,
  ChevronRight,
  Box,
  AlertTriangle,
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
  const [error, setError] = useState("");

  const loadStats = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetchApi<DashboardData>("/admin/dashboard/stats");
      setData(res);
    } catch (err: any) {
      setError(err.message || "Failed to load platform metrics.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <PageHeader
        title="Dashboard"
        description="Marketplace operational overview and pending administrative tasks"
      >
        <button
          onClick={loadStats}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-[#334155] bg-[#EEF2F6] shadow-neu-flat border border-white/80 rounded-md hover:bg-[#EEF2F6] transition cursor-pointer disabled:opacity-50"
        >
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
          <span>Refresh</span>
        </button>
      </PageHeader>

      {error && (
        <div className="p-3 rounded-md bg-rose-50 border border-rose-200 flex items-start gap-2.5 text-xs text-rose-700">
          <AlertCircle size={15} className="shrink-0 text-rose-600 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold">Unable to fetch dashboard metrics</p>
            <p className="mt-0.5 text-[#475569]">{error}</p>
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
        <div className="py-16 flex flex-col items-center justify-center text-[#94A3B8]">
          <Loader2 size={24} className="animate-spin text-[#475569] mb-2" />
          <p className="text-xs font-medium text-[#64748B]">Loading marketplace overview...</p>
        </div>
      ) : data ? (
        <>
          {/* 4 Compact Operational KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Users */}
            <Link
              href="/admin/users"
              className="p-5 bg-[#EEF2F6] rounded-2xl shadow-neu-flat border border-white/80 hover:shadow-neu-flat-sm transition-all duration-200 block group"
            >
              <div className="flex items-center justify-between text-xs text-[#64748B]">
                <span className="font-medium">Total Users</span>
                <Users size={15} className="text-[#94A3B8] group-hover:text-[#334155] transition" />
              </div>
              <p className="text-2xl font-semibold text-[#1E293B] mt-2">{data.stats.totalUsers}</p>
              <p className="text-xs text-[#64748B] mt-1">Platform accounts</p>
            </Link>

            {/* Active Vendors */}
            <Link
              href="/admin/vendors"
              className="p-5 bg-[#EEF2F6] rounded-2xl shadow-neu-flat border border-white/80 hover:shadow-neu-flat-sm transition-all duration-200 block group"
            >
              <div className="flex items-center justify-between text-xs text-[#64748B]">
                <span className="font-medium">Verified Vendors</span>
                <Store size={15} className="text-[#94A3B8] group-hover:text-[#334155] transition" />
              </div>
              <p className="text-2xl font-semibold text-[#1E293B] mt-2">{data.stats.approvedVendors}</p>
              <p className="text-xs text-[#64748B] mt-1">of {data.stats.totalVendors} registered</p>
            </Link>

            {/* Active Bookings */}
            <Link
              href="/admin/bookings"
              className="p-5 bg-[#EEF2F6] rounded-2xl shadow-neu-flat border border-white/80 hover:shadow-neu-flat-sm transition-all duration-200 block group"
            >
              <div className="flex items-center justify-between text-xs text-[#64748B]">
                <span className="font-medium">Active Bookings</span>
                <CalendarCheck size={15} className="text-[#94A3B8] group-hover:text-[#334155] transition" />
              </div>
              <p className="text-2xl font-semibold text-[#1E293B] mt-2">{data.stats.activeBookings}</p>
              <p className="text-xs text-[#64748B] mt-1">{data.stats.completedBookings} completed</p>
            </Link>

            {/* Completed Moves */}
            <Link
              href="/admin/bookings?status=COMPLETED"
              className="p-5 bg-[#EEF2F6] rounded-2xl shadow-neu-flat border border-white/80 hover:shadow-neu-flat-sm transition-all duration-200 block group"
            >
              <div className="flex items-center justify-between text-xs text-[#64748B]">
                <span className="font-medium">Completed Moves</span>
                <CheckCircle2 size={15} className="text-[#14B8A6] group-hover:text-teal-700 transition" />
              </div>
              <p className="text-2xl font-semibold text-[#1E293B] mt-2">{data.stats.completedBookings}</p>
              <p className="text-xs text-[#64748B] mt-1">Successfully fulfilled</p>
            </Link>
          </div>

          {/* Operational Action Items: Requires Attention */}
          {(data.stats.pendingVendorRequests > 0 || data.stats.pendingDisputes > 0) && (
            <div className="bg-[#EEF2F6] shadow-neu-flat-sm border border-amber-300/50 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-2.5">
                <ShieldAlert size={16} className="text-amber-700 shrink-0" />
                <h2 className="text-xs font-semibold text-amber-900 uppercase tracking-wide">
                  Requires Immediate Attention
                </h2>
              </div>
              <div className="divide-y divide-amber-200/40 text-xs">
                {data.stats.pendingVendorRequests > 0 && (
                  <div className="py-2 flex items-center justify-between">
                    <div>
                      <span className="font-medium text-[#1E293B]">
                        {data.stats.pendingVendorRequests} Vendor {data.stats.pendingVendorRequests === 1 ? "application" : "applications"}
                      </span>
                      <span className="text-[#64748B] ml-2">Pending compliance review</span>
                    </div>
                    <Link
                      href="/admin/vendor-requests"
                      className="text-xs font-medium text-amber-800 hover:underline flex items-center gap-1"
                    >
                      <span>Review Queue</span>
                      <ArrowRight size={12} />
                    </Link>
                  </div>
                )}
                {data.stats.pendingDisputes > 0 && (
                  <div className="py-2 flex items-center justify-between">
                    <div>
                      <span className="font-medium text-[#1E293B]">
                        {data.stats.pendingDisputes} Terminated move {data.stats.pendingDisputes === 1 ? "record" : "records"}
                      </span>
                      <span className="text-[#64748B] ml-2">Exception requires review</span>
                    </div>
                    <Link
                      href="/admin/disputes"
                      className="text-xs font-medium text-amber-800 hover:underline flex items-center gap-1"
                    >
                      <span>Inspect Exceptions</span>
                      <ArrowRight size={12} />
                    </Link>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Real Operational Visual Analytics */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Chart 1: Move Lifecycle Distribution (Modern Look per Image 2) */}
            <div className="bg-[#EEF2F6] rounded-2xl shadow-neu-flat border border-white/80 p-5 flex flex-col justify-between">
              {/* Header */}
              <div className="flex items-center justify-between pb-2">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-xl bg-blue-500/10 shadow-neu-raised-sm flex items-center justify-center text-[#2563EB] border border-blue-200/50">
                    <BarChart3 size={20} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#1E293B] uppercase tracking-wide">
                      Move Lifecycle Distribution
                    </h3>
                    <p className="text-xs text-[#64748B]">Live booking stages derived from database records</p>
                  </div>
                </div>
                <span className="px-3 py-1 rounded-xl bg-[#EEF2F6] shadow-neu-inset-sm border border-white/60 text-xs font-bold text-[#1E293B]">
                  {data.stats.totalBookings} Total Moves
                </span>
              </div>

              {/* 3 Modern KPI Cards Grid */}
              <div className="grid grid-cols-3 gap-2.5 sm:gap-4 py-4">
                {/* 1. In Execution */}
                <Link
                  href="/admin/bookings"
                  className="bg-gradient-to-b from-blue-50/80 to-blue-100/50 shadow-neu-raised-sm hover:shadow-neu-flat active:shadow-neu-pressed border border-blue-200/60 rounded-2xl p-4 relative overflow-hidden flex flex-col justify-between group transition-all"
                >
                  <div className="flex items-center justify-between relative z-10">
                    <div className="h-9 w-9 rounded-xl bg-[#2563EB] shadow-xs flex items-center justify-center text-white">
                      <Box size={20} className="text-white" />
                    </div>
                    <div className="h-7 w-7 rounded-full bg-white shadow-xs group-hover:shadow-neu-raised-sm flex items-center justify-center text-[#2563EB] transition-transform group-hover:translate-x-0.5">
                      <ChevronRight size={15} strokeWidth={2.5} />
                    </div>
                  </div>

                  <div className="mt-4 relative z-10">
                    <p className="text-xs font-bold text-[#2563EB]">In Execution</p>
                    <p className="text-2xl sm:text-3xl font-black text-[#1E293B] mt-1 leading-none">
                      {data.stats.activeBookings}
                    </p>
                    <p className="text-[11px] font-medium text-[#2563EB] mt-1.5">
                      {data.stats.totalBookings > 0
                        ? `${Math.round((data.stats.activeBookings / data.stats.totalBookings) * 100)}% of moves`
                        : "0%"}
                    </p>
                  </div>

                  {/* Organic Wave Graphic at Bottom */}
                  <svg
                    className="absolute bottom-0 left-0 right-0 w-full h-8 text-blue-300/40 pointer-events-none"
                    viewBox="0 0 100 25"
                    preserveAspectRatio="none"
                    fill="currentColor"
                  >
                    <path d="M0,15 C25,5 50,22 75,10 C88,4 95,18 100,14 L100,25 L0,25 Z" opacity="0.5" />
                    <path d="M0,19 C30,12 60,24 100,13 L100,25 L0,25 Z" opacity="0.7" />
                  </svg>
                </Link>

                {/* 2. Completed */}
                <Link
                  href="/admin/bookings?status=COMPLETED"
                  className="bg-gradient-to-b from-teal-50/80 to-teal-100/50 shadow-neu-raised-sm hover:shadow-neu-flat active:shadow-neu-pressed border border-teal-200/60 rounded-2xl p-4 relative overflow-hidden flex flex-col justify-between group transition-all"
                >
                  <div className="flex items-center justify-between relative z-10">
                    <div className="h-9 w-9 rounded-xl bg-[#14B8A6] shadow-xs flex items-center justify-center text-white">
                      <CheckCircle2 size={20} className="text-white" />
                    </div>
                    <div className="h-7 w-7 rounded-full bg-white shadow-xs group-hover:shadow-neu-raised-sm flex items-center justify-center text-[#14B8A6] transition-transform group-hover:translate-x-0.5">
                      <ChevronRight size={15} strokeWidth={2.5} />
                    </div>
                  </div>

                  <div className="mt-4 relative z-10">
                    <p className="text-xs font-bold text-[#14B8A6]">Completed</p>
                    <p className="text-2xl sm:text-3xl font-black text-[#1E293B] mt-1 leading-none">
                      {data.stats.completedBookings}
                    </p>
                    <p className="text-[11px] font-medium text-teal-700 mt-1.5">
                      {data.stats.totalBookings > 0
                        ? `${Math.round((data.stats.completedBookings / data.stats.totalBookings) * 100)}% of moves`
                        : "0%"}
                    </p>
                  </div>

                  {/* Organic Wave Graphic at Bottom */}
                  <svg
                    className="absolute bottom-0 left-0 right-0 w-full h-8 text-teal-300/40 pointer-events-none"
                    viewBox="0 0 100 25"
                    preserveAspectRatio="none"
                    fill="currentColor"
                  >
                    <path d="M0,15 C25,5 50,22 75,10 C88,4 95,18 100,14 L100,25 L0,25 Z" opacity="0.5" />
                    <path d="M0,19 C30,12 60,24 100,13 L100,25 L0,25 Z" opacity="0.7" />
                  </svg>
                </Link>

                {/* 3. Exceptions */}
                <Link
                  href="/admin/disputes"
                  className="bg-gradient-to-b from-rose-50/80 to-rose-100/50 shadow-neu-raised-sm hover:shadow-neu-flat active:shadow-neu-pressed border border-rose-200/60 rounded-2xl p-4 relative overflow-hidden flex flex-col justify-between group transition-all"
                >
                  <div className="flex items-center justify-between relative z-10">
                    <div className="h-9 w-9 rounded-xl bg-rose-500 shadow-xs flex items-center justify-center text-white">
                      <AlertTriangle size={20} className="text-white" />
                    </div>
                    <div className="h-7 w-7 rounded-full bg-white shadow-xs group-hover:shadow-neu-raised-sm flex items-center justify-center text-rose-600 transition-transform group-hover:translate-x-0.5">
                      <ChevronRight size={15} strokeWidth={2.5} />
                    </div>
                  </div>

                  <div className="mt-4 relative z-10">
                    <p className="text-xs font-bold text-rose-600">Exceptions</p>
                    <p className="text-2xl sm:text-3xl font-black text-[#1E293B] mt-1 leading-none">
                      {data.stats.pendingDisputes}
                    </p>
                    <p className="text-[11px] font-medium text-rose-600 mt-1.5">
                      {data.stats.totalBookings > 0
                        ? `${Math.round((data.stats.pendingDisputes / data.stats.totalBookings) * 100)}% of moves`
                        : "0%"}
                    </p>
                  </div>

                  {/* Organic Wave Graphic at Bottom */}
                  <svg
                    className="absolute bottom-0 left-0 right-0 w-full h-8 text-rose-300/40 pointer-events-none"
                    viewBox="0 0 100 25"
                    preserveAspectRatio="none"
                    fill="currentColor"
                  >
                    <path d="M0,15 C25,5 50,22 75,10 C88,4 95,18 100,14 L100,25 L0,25 Z" opacity="0.5" />
                    <path d="M0,19 C30,12 60,24 100,13 L100,25 L0,25 Z" opacity="0.7" />
                  </svg>
                </Link>
              </div>

              {/* Bottom Callout Banner */}
              <Link
                href="/admin/bookings"
                className="mt-2 bg-[#EEF2F6] shadow-neu-inset-sm hover:shadow-neu-flat border border-white/60 rounded-2xl p-3 sm:p-3.5 flex items-center justify-between transition-all group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-10 w-10 sm:h-11 sm:w-11 rounded-xl bg-blue-500/10 shadow-neu-raised-sm border border-blue-200/60 flex items-center justify-center text-[#2563EB] shrink-0">
                    <Truck size={20} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm font-bold text-[#1E293B] truncate">
                      Monitor each stage to keep your moves on track.
                    </p>
                    <p className="text-[11px] text-[#64748B] font-medium truncate">
                      From pickup to delivery, every move matters.
                    </p>
                  </div>
                </div>
                <div className="h-8 w-8 rounded-full bg-[#EEF2F6] shadow-neu-raised-sm group-hover:shadow-neu-flat active:shadow-neu-pressed border border-white/80 flex items-center justify-center text-[#2563EB] transition shrink-0 ml-2">
                  <ChevronRight size={16} strokeWidth={2.5} />
                </div>
              </Link>
            </div>

            {/* Chart 2: Stakeholder Distribution (Redesigned with Neumorphism per Image 2) */}
            <div className="bg-[#EEF2F6] rounded-2xl shadow-neu-flat border border-white/80 p-5 flex flex-col justify-between">
              {/* Header */}
              <div className="flex items-center justify-between pb-2">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-xl bg-blue-500/10 shadow-neu-raised-sm flex items-center justify-center text-[#2563EB] border border-blue-200/50">
                    <PieChart size={20} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#1E293B]">
                      Stakeholder Distribution
                    </h3>
                    <p className="text-xs text-[#64748B]">Live roles across the platform</p>
                  </div>
                </div>
                <span className="px-3 py-1 rounded-xl bg-[#EEF2F6] shadow-neu-inset-sm border border-white/60 text-xs font-bold text-[#1E293B]">
                  {data.stats.totalUsers} Accounts
                </span>
              </div>

              {/* 4 Pillars Grid */}
              <div className="grid grid-cols-4 gap-2 sm:gap-3 py-4">
                {/* 1. Customers */}
                <div className="flex flex-col items-center text-center">
                  <div className="h-13 w-13 sm:h-14 sm:w-14 rounded-full bg-blue-50 shadow-neu-raised-sm border border-blue-200/60 flex items-center justify-center text-[#2563EB] mb-2 transition-transform hover:scale-105">
                    <Users size={22} />
                  </div>
                  <span className="text-xl sm:text-2xl font-black text-[#1E293B] leading-none">
                    {data.distributions?.userRoles?.customer ?? 3}
                  </span>
                  <span className="text-xs font-semibold text-[#1E293B] mt-1">Customers</span>
                  <div className="w-12 sm:w-14 h-1.5 bg-[#D9E2EC]/70 shadow-neu-inset-sm rounded-full overflow-hidden mt-2.5">
                    <div
                      style={{
                        width: `${Math.min(100, Math.max(15, (((data.distributions?.userRoles?.customer ?? 3) / (data.stats.totalUsers || 1)) * 100)))}%`,
                      }}
                      className="h-full bg-[#2563EB] rounded-full"
                    />
                  </div>
                </div>

                {/* 2. Vendors */}
                <div className="flex flex-col items-center text-center">
                  <div className="h-13 w-13 sm:h-14 sm:w-14 rounded-full bg-amber-50 shadow-neu-raised-sm border border-amber-200/60 flex items-center justify-center text-[#EA580C] mb-2 transition-transform hover:scale-105">
                    <Truck size={22} />
                  </div>
                  <span className="text-xl sm:text-2xl font-black text-[#1E293B] leading-none">
                    {data.stats.totalVendors ?? 3}
                  </span>
                  <span className="text-xs font-semibold text-[#1E293B] mt-1">Vendors</span>
                  <div className="w-12 sm:w-14 h-1.5 bg-[#D9E2EC]/70 shadow-neu-inset-sm rounded-full overflow-hidden mt-2.5">
                    <div
                      style={{
                        width: `${Math.min(100, Math.max(15, (((data.stats.totalVendors ?? 3) / (data.stats.totalUsers || 1)) * 100)))}%`,
                      }}
                      className="h-full bg-[#EA580C] rounded-full"
                    />
                  </div>
                </div>

                {/* 3. Field Crew */}
                <div className="flex flex-col items-center text-center">
                  <div className="h-13 w-13 sm:h-14 sm:w-14 rounded-full bg-teal-50 shadow-neu-raised-sm border border-teal-200/60 flex items-center justify-center text-[#14B8A6] mb-2 transition-transform hover:scale-105">
                    <HardHat size={22} />
                  </div>
                  <span className="text-xl sm:text-2xl font-black text-[#1E293B] leading-none">
                    {data.distributions?.userRoles?.worker ?? 2}
                  </span>
                  <span className="text-xs font-semibold text-[#1E293B] mt-1">Field Crew</span>
                  <div className="w-12 sm:w-14 h-1.5 bg-[#D9E2EC]/70 shadow-neu-inset-sm rounded-full overflow-hidden mt-2.5">
                    <div
                      style={{
                        width: `${Math.min(100, Math.max(15, (((data.distributions?.userRoles?.worker ?? 2) / (data.stats.totalUsers || 1)) * 100)))}%`,
                      }}
                      className="h-full bg-[#14B8A6] rounded-full"
                    />
                  </div>
                </div>

                {/* 4. Admins */}
                <div className="flex flex-col items-center text-center">
                  <div className="h-13 w-13 sm:h-14 sm:w-14 rounded-full bg-purple-50 shadow-neu-raised-sm border border-purple-200/60 flex items-center justify-center text-[#7C3AED] mb-2 transition-transform hover:scale-105">
                    <Shield size={20} />
                  </div>
                  <span className="text-xl sm:text-2xl font-black text-[#1E293B] leading-none">
                    {data.distributions?.userRoles?.admin ?? 1}
                  </span>
                  <span className="text-xs font-semibold text-[#1E293B] mt-1">Admins</span>
                  <div className="w-12 sm:w-14 h-1.5 bg-[#D9E2EC]/70 shadow-neu-inset-sm rounded-full overflow-hidden mt-2.5">
                    <div
                      style={{
                        width: `${Math.min(100, Math.max(15, (((data.distributions?.userRoles?.admin ?? 1) / (data.stats.totalUsers || 1)) * 100)))}%`,
                      }}
                      className="h-full bg-[#7C3AED] rounded-full"
                    />
                  </div>
                </div>
              </div>

              {/* Bottom Callout Banner */}
              <Link
                href="/admin/users"
                className="mt-2 bg-[#EEF2F6] shadow-neu-inset-sm hover:shadow-neu-flat border border-white/60 rounded-2xl p-3 sm:p-3.5 flex items-center justify-between transition-all group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-10 w-10 sm:h-11 sm:w-11 rounded-xl bg-amber-500/10 shadow-neu-raised-sm border border-amber-200/60 flex items-center justify-center text-xl shrink-0">
                    📦
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm font-bold text-[#1E293B] truncate">
                      {data.stats.totalUsers} accounts working together
                    </p>
                    <p className="text-[11px] text-[#2563EB] font-medium truncate">
                      for a better delivery experience.
                    </p>
                  </div>
                </div>
                <div className="h-8 w-8 rounded-full bg-[#EEF2F6] shadow-neu-raised-sm group-hover:shadow-neu-flat active:shadow-neu-pressed border border-white/80 flex items-center justify-center text-[#2563EB] transition shrink-0 ml-2">
                  <ChevronRight size={16} strokeWidth={2.5} />
                </div>
              </Link>
            </div>
          </div>

          {/* Full Width Executive Table: Recent Platform Moves */}
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
                  Real-time moving schedule, customer bookings, and fleet assignment status
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
                    <th className="px-5 py-3">Route (Origin &rarr; Destination)</th>
                    <th className="px-5 py-3">Scheduled Date</th>
                    <th className="px-5 py-3">Move Status</th>
                    <th className="px-5 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#D9E2EC]/70">
                  {data.recentBookings && data.recentBookings.length > 0 ? (
                    data.recentBookings.map((b) => {
                      const pickup = b.requestId?.pickupAddress?.city || b.requestId?.pickupAddress?.street || "Pickup Zone";
                      const dropoff = b.requestId?.destinationAddress?.city || b.requestId?.destinationAddress?.street || "Dropoff Zone";
                      const schedDate = b.requestId?.preferredDate
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
                            {b.vendorId?.contactPhone && (
                              <p className="text-[11px] text-[#64748B] font-mono mt-0.5">
                                {b.vendorId.contactPhone}
                              </p>
                            )}
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
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-[#2563EB] hover:text-white hover:bg-[#2563EB] border border-blue-200 rounded-lg transition shadow-neu-inset-sm"
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
        </>
      ) : null}
    </div>
  );
}