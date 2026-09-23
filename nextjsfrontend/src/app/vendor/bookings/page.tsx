"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { fetchApi } from "@/lib/api";
import PageHeader from "@/app/admin/components/PageHeader";
import StatusBadge from "@/app/admin/components/StatusBadge";
import {
  CalendarCheck,
  Search,
  RefreshCw,
  AlertCircle,
  Clock,
  ArrowRight,
  User,
  Phone,
  Truck,
  HardHat,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Package,
  Layers,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";

interface BookingItem {
  _id: string;
  customerId?: {
    _id: string;
    displayName: string;
    phone: string;
  };
  requestId?: {
    _id: string;
    pickupAddress?: {
      street?: string;
      city?: string;
      postalCode?: string;
      floor?: number;
      hasLift?: boolean;
    };
    destinationAddress?: {
      street?: string;
      city?: string;
      postalCode?: string;
      floor?: number;
      hasLift?: boolean;
    };
    preferredDate?: string;
    preferredTimeSlot?: string;
    items?: Array<{ name: string; quantity: number; isFragile?: boolean }>;
    requestedServices?: string[];
  };
  quoteSnapshot?: {
    totalAmountMinorUnits?: number;
    currency?: string;
    packageCode?: string;
  };
  assignedWorkers?: Array<{
    _id: string;
    displayName: string;
    phone: string;
    employeeRole?: string;
  }>;
  assignedVehicleId?: string;
  scheduledDate: string;
  status: string;
  deliveryCode?: string;
  version: number;
  createdAt: string;
}

export default function VendorBookingsPage() {
  const [bookings, setBookings] = useState<BookingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "10",
        ...(statusFilter !== "ALL" ? { status: statusFilter } : {}),
        ...(search.trim() ? { search: search.trim() } : {}),
      });

      const res = await fetchApi<{
        bookings: BookingItem[];
        total: number;
        page: number;
        totalPages: number;
      }>(`/vendor/bookings?${params.toString()}`);

      setBookings(res.bookings || []);
      setTotalPages(res.totalPages || 1);
      setTotalCount(res.total || 0);
    } catch (err: any) {
      setError(err.message || "Failed to load move bookings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, [page, statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchBookings();
  };

  // Status Filter Options
  const filterTabs = [
    { key: "ALL", label: "All Moves" },
    { key: "CONFIRMED", label: "Confirmed" },
    { key: "ASSIGNED", label: "Assigned" },
    { key: "IN_TRANSIT", label: "In Transit" },
    { key: "COMPLETED", label: "Completed" },
    { key: "CANCELLED", label: "Cancelled" },
  ];

  // Helper to format currency
  const formatPrice = (minorUnits?: number) => {
    if (minorUnits === undefined || minorUnits === null) return "—";
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(minorUnits / 100);
  };

  // Helper to format date
  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-6 font-sans text-slate-800">
      {/* Header */}
      <PageHeader
        title="Move Operations & Bookings"
        description="Manage scheduled relocations, track live delivery milestones, and dispatch operational crew and fleet."
      >
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => {
              setPage(1);
              fetchBookings();
            }}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 shadow-2xs cursor-pointer disabled:opacity-50 transition"
          >
            <RefreshCw size={14} className={loading ? "animate-spin text-slate-500" : "text-slate-500"} />
            <span>Refresh</span>
          </button>
          <Link
            href="/vendor/tracking"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-xs cursor-pointer transition"
          >
            <Truck size={14} />
            <span>Live Tracking Board</span>
          </Link>
        </div>
      </PageHeader>

      {/* Error alert */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center justify-between gap-3 text-rose-700 text-xs shadow-xs">
          <div className="flex items-center gap-2.5">
            <AlertCircle size={16} className="shrink-0 text-rose-600" />
            <span className="font-medium">{error}</span>
          </div>
          <button
            onClick={() => fetchBookings()}
            className="text-xs font-bold underline hover:text-rose-900 cursor-pointer"
          >
            Try again
          </button>
        </div>
      )}

      {/* Filter and Search Bar Card */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Status Filter Pills */}
        <div className="flex items-center gap-1 bg-slate-100/80 p-1 rounded-xl border border-slate-200/60 overflow-x-auto scrollbar-none">
          {filterTabs.map((tab) => {
            const isActive = statusFilter === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => {
                  setStatusFilter(tab.key);
                  setPage(1);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition cursor-pointer ${
                  isActive
                    ? "bg-white text-blue-600 shadow-2xs font-semibold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Search Input */}
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 w-full md:w-72">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by ID or Delivery Code..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
            />
          </div>
          <button
            type="submit"
            className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 shadow-2xs shrink-0 cursor-pointer transition"
          >
            Search
          </button>
        </form>
      </div>

      {/* Bookings Table Card */}
      <div className="rounded-2xl bg-white border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2">
            <CalendarCheck size={16} className="text-blue-600" />
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Move Operations Roster ({totalCount})
            </h3>
          </div>
          <span className="text-[11px] font-medium text-slate-500">
            Showing page {page} of {totalPages || 1}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider bg-slate-50">
                <th className="py-3.5 px-5">Move Ref & Date</th>
                <th className="py-3.5 px-4">Customer</th>
                <th className="py-3.5 px-4">Origin / Destination</th>
                <th className="py-3.5 px-4">Assigned Crew & Fleet</th>
                <th className="py-3.5 px-4">Package / Quote</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <RefreshCw size={22} className="animate-spin text-blue-600" />
                      <p className="font-semibold text-xs text-slate-800">Loading move operations...</p>
                    </div>
                  </td>
                </tr>
              ) : bookings.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Layers size={28} className="text-slate-300" />
                      <p className="font-bold text-xs text-slate-800">No bookings found</p>
                      <p className="text-[11px] text-slate-500 max-w-sm">
                        {statusFilter !== "ALL" || search
                          ? "No bookings match the selected filters or search query."
                          : "Your company has no scheduled or active move bookings currently registered."}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                bookings.map((booking) => {
                  const pickup = booking.requestId?.pickupAddress;
                  const dropoff = booking.requestId?.destinationAddress;
                  const crewCount = booking.assignedWorkers?.length || 0;
                  const vehicleId = booking.assignedVehicleId;

                  return (
                    <tr
                      key={booking._id}
                      className="hover:bg-slate-50/70 transition-colors group"
                    >
                      {/* Move Ref & Date */}
                      <td className="py-3.5 px-5">
                        <div className="flex flex-col">
                          <span className="font-mono font-bold text-blue-600 text-xs">
                            #{booking._id.slice(-6).toUpperCase()}
                          </span>
                          <div className="flex items-center gap-1 text-[11px] text-slate-500 mt-0.5">
                            <Clock size={11} className="shrink-0" />
                            <span>{formatDate(booking.scheduledDate)}</span>
                          </div>
                          {booking.requestId?.preferredTimeSlot && (
                            <span className="text-[10px] text-slate-400">
                              {booking.requestId.preferredTimeSlot}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Customer */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col">
                          <span className="font-semibold text-slate-900">
                            {booking.customerId?.displayName || "Private Customer"}
                          </span>
                          <span className="text-[11px] text-slate-500">
                            {booking.customerId?.phone || "—"}
                          </span>
                        </div>
                      </td>

                      {/* Route */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col max-w-xs space-y-1">
                          <div className="flex items-center gap-1.5 text-[11px] text-slate-800 font-medium truncate">
                            <span className="h-1.5 w-1.5 rounded-full bg-blue-600 shrink-0" />
                            <span className="truncate">
                              {pickup?.street ? `${pickup.street}, ` : ""}{pickup?.city || "Origin"}
                            </span>
                            {pickup?.floor !== undefined && (
                              <span className="text-[10px] text-slate-500">
                                (Fl {pickup.floor}{pickup.hasLift ? ", Lift" : ""})
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 truncate">
                            <span className="h-1.5 w-1.5 rounded-full bg-teal-500 shrink-0" />
                            <span className="truncate">
                              {dropoff?.street ? `${dropoff.street}, ` : ""}{dropoff?.city || "Destination"}
                            </span>
                            {dropoff?.floor !== undefined && (
                              <span className="text-[10px] text-slate-400">
                                (Fl {dropoff.floor}{dropoff.hasLift ? ", Lift" : ""})
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Assigned Resources */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-1.5">
                            <HardHat size={12} className={crewCount > 0 ? "text-blue-600" : "text-slate-400"} />
                            {crewCount > 0 ? (
                              <span className="text-[11px] font-semibold text-slate-800">
                                {crewCount} {crewCount === 1 ? "Crew Worker" : "Crew Workers"}
                              </span>
                            ) : (
                              <span className="text-[10px] font-medium text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                                Needs Crew
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Truck size={12} className={vehicleId ? "text-sky-600" : "text-slate-400"} />
                            {vehicleId ? (
                              <span className="text-[11px] font-mono text-slate-800">
                                {vehicleId}
                              </span>
                            ) : (
                              <span className="text-[10px] font-medium text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                                Needs Vehicle
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Package / Quote */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col">
                          <span className="font-semibold text-slate-900">
                            {formatPrice(booking.quoteSnapshot?.totalAmountMinorUnits)}
                          </span>
                          <span className="text-[10px] font-mono text-slate-500">
                            {booking.quoteSnapshot?.packageCode || "Custom Service"}
                          </span>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        <StatusBadge status={booking.status} />
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-5 text-right">
                        <Link
                          href={`/vendor/bookings/${booking._id}`}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-blue-600 hover:text-blue-700 hover:bg-blue-50 border border-blue-200/80 bg-white transition cursor-pointer"
                        >
                          <span>Inspect / Assign</span>
                          <ArrowRight size={13} />
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="px-5 py-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 bg-slate-50/50">
            <p>
              Page <span className="font-bold text-slate-800">{page}</span> of{" "}
              <span className="font-bold text-slate-800">{totalPages}</span>
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1 || loading}
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 disabled:opacity-40 cursor-pointer shadow-2xs transition"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages || loading}
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 disabled:opacity-40 cursor-pointer shadow-2xs transition"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
