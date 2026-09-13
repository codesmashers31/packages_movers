"use client";

import { useState, useEffect } from "react";
import { fetchApi } from "@/lib/api";
import PageHeader from "../components/PageHeader";
import StatusBadge from "../components/StatusBadge";
import {
  Calendar,
  Phone,
  Loader2,
  AlertCircle,
  Eye,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  X,
  KeyRound,
  ArrowRight,
} from "lucide-react";

interface BookingItem {
  _id: string;
  customerId?: { displayName?: string; phone?: string };
  vendorId?: { businessName?: string; contactPhone?: string; contactEmail?: string };
  requestId?: {
    pickupAddress?: { street?: string; city?: string; postalCode?: string };
    destinationAddress?: { street?: string; city?: string; postalCode?: string };
    preferredDate?: string;
    items?: Array<{ name: string; quantity: number }>;
  };
  quoteSnapshot?: {
    totalAmountMinorUnits?: number;
    currency?: string;
    itemizedServices?: Array<{ serviceName: string; amountMinorUnits: number }>;
  };
  scheduledDate: string;
  status: string;
  deliveryCode?: string;
  version: number;
  createdAt: string;
}

export default function AdminBookingsPage() {
  const [bookings, setBookings] = useState<BookingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Inspect Modal
  const [inspectBooking, setInspectBooking] = useState<BookingItem | null>(null);
  const [statusUpdate, setStatusUpdate] = useState("");
  const [statusReason, setStatusReason] = useState("");
  const [statusSubmitting, setStatusSubmitting] = useState(false);
  const [statusError, setStatusError] = useState("");

  const loadBookings = async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "10",
        status: statusFilter,
        sortBy,
        sortOrder,
      });
      const res = await fetchApi<{
        bookings: BookingItem[];
        pagination: { total: number; totalPages: number };
      }>(`/admin/bookings?${params.toString()}`);
      setBookings(res.bookings || []);
      setTotalPages(res.pagination?.totalPages || 1);
      setTotalCount(res.pagination?.total || 0);
    } catch (err: any) {
      setError(err.message || "Failed to load bookings");
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("asc");
    }
    setPage(1);
  };

  const openInspectBooking = (b: BookingItem) => {
    setInspectBooking(b);
    setStatusUpdate(b.status);
    setStatusReason("");
    setStatusError("");
  };

  const handleBookingStatusChange = async () => {
    if (!inspectBooking || !statusUpdate) return;
    if (statusUpdate === inspectBooking.status) return;

    setStatusSubmitting(true);
    setStatusError("");
    try {
      await fetchApi(`/admin/bookings/${inspectBooking._id}/status`, {
        method: "PATCH",
        body: JSON.stringify({
          status: statusUpdate,
          reason: statusReason || `Admin manual status change to ${statusUpdate}`,
        }),
      });

      setInspectBooking(null);
      loadBookings();
    } catch (err: any) {
      setStatusError(err.message || "Failed to update booking status");
    } finally {
      setStatusSubmitting(false);
    }
  };

  useEffect(() => {
    loadBookings();
  }, [page, statusFilter, sortBy, sortOrder]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <PageHeader
        title="Move Bookings"
        description="End-to-end supervision of confirmed moves, transit milestones, and delivery authorizations"
      >
        <button
          onClick={loadBookings}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-[#EEF2F6] border border-[#D9E2EC]/80 rounded-md hover:bg-[#EEF2F6] transition cursor-pointer disabled:opacity-50"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          <span>Refresh</span>
        </button>
      </PageHeader>

      {/* Toolbar: Filters */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#EEF2F6] p-3 rounded-lg border border-[#D9E2EC]/70">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <label className="text-xs text-slate-500 font-medium">Status Filter:</label>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="text-xs border border-[#D9E2EC]/80 rounded-md px-2.5 py-1.5 bg-[#EEF2F6] text-slate-700 focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]"
          >
            <option value="all">All Move Statuses</option>
            <option value="CONFIRMED">Confirmed</option>
            <option value="ASSIGNED">Assigned</option>
            <option value="IN_TRANSIT">In Transit</option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELLED">Cancelled</option>
            <option value="TERMINATED">Terminated</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-md flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertCircle size={15} className="shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
          <button
            onClick={() => loadBookings()}
            className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded text-xs font-medium transition cursor-pointer shrink-0"
          >
            Retry
          </button>
        </div>
      )}

      {/* Single Enterprise Table */}
      <div className="bg-[#EEF2F6] rounded-2xl shadow-neu-flat border border-white/80 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#EEF2F6]/75 text-slate-500 font-semibold border-b border-[#D9E2EC]/70 uppercase tracking-wider text-[11px]">
              <tr>
                <th
                  className="px-4 py-2.5 cursor-pointer hover:text-slate-900 transition select-none"
                  onClick={() => handleSort("createdAt")}
                >
                  <div className="flex items-center gap-1">
                    <span>Booking ID</span>
                    <span className="text-[10px] text-slate-400">
                      {sortBy === "createdAt" ? (sortOrder === "asc" ? "▲" : "▼") : "↕"}
                    </span>
                  </div>
                </th>
                <th
                  className="px-4 py-2.5 cursor-pointer hover:text-slate-900 transition select-none"
                  onClick={() => handleSort("scheduledDate")}
                >
                  <div className="flex items-center gap-1">
                    <span>Scheduled Date</span>
                    <span className="text-[10px] text-slate-400">
                      {sortBy === "scheduledDate" ? (sortOrder === "asc" ? "▲" : "▼") : "↕"}
                    </span>
                  </div>
                </th>
                <th className="px-4 py-2.5">Customer</th>
                <th className="px-4 py-2.5">Assigned Vendor</th>
                <th className="px-4 py-2.5">Route</th>
                <th className="px-4 py-2.5 text-right">Quote Total</th>
                <th
                  className="px-4 py-2.5 cursor-pointer hover:text-slate-900 transition select-none"
                  onClick={() => handleSort("status")}
                >
                  <div className="flex items-center gap-1">
                    <span>Status</span>
                    <span className="text-[10px] text-slate-400">
                      {sortBy === "status" ? (sortOrder === "asc" ? "▲" : "▼") : "↕"}
                    </span>
                  </div>
                </th>
                <th className="px-4 py-2.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#D9E2EC]/70">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <Loader2 size={20} className="animate-spin text-slate-600 mx-auto mb-2" />
                    <span>Loading booking records...</span>
                  </td>
                </tr>
              ) : bookings.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    No booking records found matching criteria.
                  </td>
                </tr>
              ) : (
                bookings.map((b) => (
                  <tr key={b._id} className="hover:bg-[#EEF2F6]/50 transition-colors">
                    <td className="px-4 py-2.5 font-mono font-medium text-slate-900">
                      #{b._id.slice(-6).toUpperCase()}
                    </td>
                    <td className="px-4 py-2.5 text-slate-600">
                      <div className="flex items-center gap-1">
                        <Calendar size={12} className="text-slate-400 shrink-0" />
                        <span>{new Date(b.scheduledDate || b.createdAt).toLocaleDateString()}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5">
                      <p className="font-medium text-slate-900">{b.customerId?.displayName || "Customer"}</p>
                      <p className="text-[11px] font-mono text-slate-500">{b.customerId?.phone || "—"}</p>
                    </td>
                    <td className="px-4 py-2.5">
                      <p className="font-medium text-slate-900">{b.vendorId?.businessName || "Unassigned"}</p>
                      <p className="text-[11px] font-mono text-slate-500">{b.vendorId?.contactPhone || "—"}</p>
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-1 text-slate-800 font-medium">
                        <span>{b.requestId?.pickupAddress?.city || "Origin"}</span>
                        <ArrowRight size={11} className="text-slate-400 shrink-0" />
                        <span>{b.requestId?.destinationAddress?.city || "Destination"}</span>
                      </div>
                      <p className="text-[11px] text-slate-400 truncate max-w-xs">
                        {b.requestId?.pickupAddress?.street || "—"}
                      </p>
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono font-medium text-slate-900">
                      {b.quoteSnapshot?.totalAmountMinorUnits
                        ? `₹${((b.quoteSnapshot.totalAmountMinorUnits || 0) / 100).toLocaleString()}`
                        : "—"}
                    </td>
                    <td className="px-4 py-2.5">
                      <StatusBadge status={b.status} />
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <button
                        onClick={() => openInspectBooking(b)}
                        className="p-1 text-slate-400 hover:text-[#2563EB] rounded transition cursor-pointer"
                        title="View Details"
                      >
                        <Eye size={14} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="px-4 py-3 border-t border-[#D9E2EC]/70 flex items-center justify-between text-xs text-slate-500">
          <span>
            Showing {bookings.length} of {totalCount} bookings
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-2 py-1 rounded border border-[#D9E2EC]/70 hover:bg-[#EEF2F6] hover:text-[#2563EB] disabled:opacity-40 transition cursor-pointer"
            >
              <ChevronLeft size={14} />
            </button>
            <span className="px-2 font-medium text-slate-700">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="px-2 py-1 rounded border border-[#D9E2EC]/70 hover:bg-[#EEF2F6] hover:text-[#2563EB] disabled:opacity-40 transition cursor-pointer"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Inspect Booking Modal */}
      {inspectBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-[#EEF2F6] rounded-2xl shadow-neu-flat border border-white/80 overflow-hidden shadow-lg flex flex-col max-h-[90vh]">
            <div className="px-5 py-3.5 border-b border-[#D9E2EC]/70 flex items-center justify-between bg-[#EEF2F6] shrink-0">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setInspectBooking(null)}
                  className="p-1.5 text-slate-500 hover:text-slate-700 bg-white/50 hover:bg-white rounded-lg shadow-sm border border-[#D9E2EC]/70 transition cursor-pointer"
                  title="Go Back"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>
                </button>
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">
                    Booking #{inspectBooking._id.slice(-6).toUpperCase()}
                  </h3>
                  <p className="text-[11px] font-mono text-slate-500">{inspectBooking._id}</p>
                </div>
              </div>
            </div>

            <div className="p-5 space-y-4 text-xs overflow-y-auto min-h-0">
              <div className="grid grid-cols-2 gap-3 pb-3 border-b border-slate-200">
                <div>
                  <span className="text-slate-500 block mb-0.5">Status</span>
                  <StatusBadge status={inspectBooking.status} />
                </div>
                <div>
                  <span className="text-slate-500 block mb-0.5">Scheduled Date</span>
                  <span className="font-medium text-slate-700">
                    {new Date(inspectBooking.scheduledDate).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Delivery Code Pill */}
              {inspectBooking.deliveryCode && (
                <div className="p-3 bg-white rounded-xl shadow-sm border border-[#D9E2EC]/70 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="font-medium text-slate-900 flex items-center gap-1.5 text-sm">
                      <KeyRound size={14} className="text-slate-500" />
                      Delivery Authorization Code
                    </span>
                    <p className="text-[11px] text-slate-500">
                      Presented by customer upon physical dropoff verification
                    </p>
                  </div>
                  <span className="font-mono text-sm font-bold bg-[#EEF2F6] px-3 py-1.5 rounded-lg border border-[#D9E2EC]/80 text-slate-900 shadow-sm">
                    {inspectBooking.deliveryCode}
                  </span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-slate-500 block mb-1">Customer</span>
                  <p className="font-medium text-slate-900">{inspectBooking.customerId?.displayName || "Customer"}</p>
                  <p className="text-slate-600 font-mono">{inspectBooking.customerId?.phone}</p>
                </div>
                <div>
                  <span className="text-slate-500 block mb-1">Assigned Vendor</span>
                  <p className="font-medium text-slate-900">{inspectBooking.vendorId?.businessName || "Unassigned"}</p>
                  <p className="text-slate-600 font-mono">{inspectBooking.vendorId?.contactPhone}</p>
                </div>
              </div>

              <div className="pt-2">
                <span className="text-slate-500 block mb-1.5 font-medium border-b border-[#D9E2EC]/70 pb-1">Move Route</span>
                <div className="space-y-2 mt-2">
                  <div className="p-3 bg-white rounded-xl shadow-sm border border-[#D9E2EC]/70 space-y-2">
                    <div className="flex items-start gap-2">
                      <div className="mt-0.5 h-2 w-2 rounded-full bg-blue-500 shrink-0"></div>
                      <p className="text-slate-800 leading-tight">
                        <strong className="text-slate-500 font-medium block text-[10px] uppercase tracking-wider mb-0.5">Pickup</strong>
                        {inspectBooking.requestId?.pickupAddress?.street},{" "}
                        {inspectBooking.requestId?.pickupAddress?.city}
                        {inspectBooking.requestId?.pickupAddress?.postalCode ? ` - ${inspectBooking.requestId?.pickupAddress?.postalCode}` : ""}
                      </p>
                    </div>
                    <div className="flex items-start gap-2">
                      <div className="mt-0.5 h-2 w-2 rounded-full bg-emerald-500 shrink-0"></div>
                      <p className="text-slate-800 leading-tight">
                        <strong className="text-slate-500 font-medium block text-[10px] uppercase tracking-wider mb-0.5">Dropoff</strong>
                        {inspectBooking.requestId?.destinationAddress?.street},{" "}
                        {inspectBooking.requestId?.destinationAddress?.city}
                        {inspectBooking.requestId?.destinationAddress?.postalCode ? ` - ${inspectBooking.requestId?.destinationAddress?.postalCode}` : ""}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {inspectBooking.quoteSnapshot && (
                <div className="pt-2 border-t border-[#D9E2EC]/70">
                  <span className="text-slate-500 block mb-2 font-medium">Agreed Quote Snapshot</span>
                  <div className="p-3 bg-white rounded-xl shadow-sm border border-[#D9E2EC]/70 flex justify-between items-center">
                    <span className="text-slate-600 font-medium">Total Contract Value:</span>
                    <span className="font-bold text-base text-slate-900 font-mono">
                      ₹{((inspectBooking.quoteSnapshot.totalAmountMinorUnits || 0) / 100).toLocaleString()}
                    </span>
                  </div>
                </div>
              )}

              {/* Operational Status Transition */}
              <div className="pt-3 border-t border-[#D9E2EC]/70 space-y-2 mt-2">
                <div className="flex items-center justify-between">
                  <span className="text-slate-800 font-semibold text-xs">Operational Status Transition</span>
                  {statusError && <span className="text-rose-600 text-[11px] font-medium px-2 py-0.5 bg-rose-50 rounded border border-rose-100">{statusError}</span>}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-white p-3 rounded-xl border border-[#D9E2EC]/70 shadow-sm">
                  <div>
                    <label className="text-[11px] text-slate-500 block mb-1.5 font-medium">New Lifecycle State</label>
                    <select
                      value={statusUpdate}
                      onChange={(e) => setStatusUpdate(e.target.value)}
                      className="w-full text-xs border border-[#D9E2EC]/80 rounded-lg px-2.5 py-1.5 bg-[#EEF2F6] text-slate-700 focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] shadow-inner"
                    >
                      <option value="PENDING_PAYMENT">PENDING_PAYMENT</option>
                      <option value="CONFIRMED">CONFIRMED</option>
                      <option value="ASSIGNED">ASSIGNED</option>
                      <option value="EN_ROUTE_PICKUP">EN_ROUTE_PICKUP</option>
                      <option value="ARRIVED_PICKUP">ARRIVED_PICKUP</option>
                      <option value="PACKING">PACKING</option>
                      <option value="LOADING">LOADING</option>
                      <option value="IN_TRANSIT">IN_TRANSIT</option>
                      <option value="ARRIVED_DROPOFF">ARRIVED_DROPOFF</option>
                      <option value="UNLOADING">UNLOADING</option>
                      <option value="AWAITING_CONFIRMATION">AWAITING_CONFIRMATION</option>
                      <option value="COMPLETED">COMPLETED</option>
                      <option value="CANCELLED">CANCELLED</option>
                      <option value="TERMINATED">TERMINATED</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-500 block mb-1.5 font-medium">Audit Log Note</label>
                    <input
                      type="text"
                      placeholder="Reason for change..."
                      value={statusReason}
                      onChange={(e) => setStatusReason(e.target.value)}
                      className="w-full text-xs border border-[#D9E2EC]/80 rounded-lg px-2.5 py-1.5 bg-[#EEF2F6] text-slate-700 focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] shadow-inner"
                    />
                  </div>
                </div>
                <div className="flex justify-end pt-2">
                  <button
                    onClick={handleBookingStatusChange}
                    disabled={statusSubmitting || statusUpdate === inspectBooking.status}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium shadow-sm transition cursor-pointer disabled:opacity-50"
                  >
                    {statusSubmitting ? "Updating..." : "Update Move Status"}
                  </button>
                </div>
              </div>
            </div>

            <div className="px-5 py-3.5 bg-[#EEF2F6] border-t border-[#D9E2EC]/70 flex justify-end shrink-0">
              <button
                onClick={() => setInspectBooking(null)}
                className="px-4 py-2 bg-white text-slate-700 hover:bg-slate-50 font-medium rounded-lg transition cursor-pointer shadow-sm border border-slate-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
