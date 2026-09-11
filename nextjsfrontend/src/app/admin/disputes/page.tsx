"use client";

import { useState, useEffect } from "react";
import { fetchApi } from "@/lib/api";
import PageHeader from "../components/PageHeader";
import StatusBadge from "../components/StatusBadge";
import {
  Calendar,
  Phone,
  AlertCircle,
  Loader2,
  RefreshCw,
  Eye,
  X,
  Info,
} from "lucide-react";

interface DisputeBooking {
  _id: string;
  customerId?: { displayName?: string; phone?: string };
  vendorId?: { businessName?: string; contactPhone?: string };
  requestId?: {
    pickupAddress?: { street?: string; city?: string };
    destinationAddress?: { street?: string; city?: string };
  };
  scheduledDate: string;
  status: string;
  cancellationReason?: string;
  createdAt: string;
}

export default function AdminDisputesPage() {
  const [disputes, setDisputes] = useState<DisputeBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedDispute, setSelectedDispute] = useState<DisputeBooking | null>(null);

  const loadDisputes = async () => {
    setLoading(true);
    setError("");
    try {
      const resCancelled = await fetchApi<{ bookings: DisputeBooking[] }>("/admin/bookings?status=CANCELLED&limit=50");
      const resTerminated = await fetchApi<{ bookings: DisputeBooking[] }>("/admin/bookings?status=TERMINATED&limit=50");
      
      const allBookings = [...(resCancelled.bookings || []), ...(resTerminated.bookings || [])];
      const seen = new Set<string>();
      const uniqueBookings = allBookings.filter((item) => {
        if (!item?._id || seen.has(item._id)) return false;
        seen.add(item._id);
        return item.status === "CANCELLED" || item.status === "TERMINATED";
      });
      setDisputes(uniqueBookings);
    } catch (err: any) {
      setError(err.message || "Failed to load dispute records");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDisputes();
  }, []);

  return (
    <div className="space-y-4">
      {/* Header */}
      <PageHeader
        title="Disputes & Exceptions"
        description="Supervise terminated bookings, failed moves, and review cancellation audit trails"
      >
        <button
          onClick={loadDisputes}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-[#EEF2F6] border border-[#D9E2EC]/80 rounded-md hover:bg-[#EEF2F6] transition cursor-pointer disabled:opacity-50"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          <span>Refresh</span>
        </button>
      </PageHeader>

      {/* Enterprise Policy Guideline Pill */}
      <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-lg text-xs text-amber-900 flex items-start gap-2.5">
        <Info size={15} className="text-amber-600 shrink-0 mt-0.5" />
        <p className="leading-relaxed text-amber-800/90">
          <strong className="text-amber-950 font-semibold">Operational Policy:</strong> After work execution commences, customer self-service cancellation is disabled. Any exception is recorded with actor timestamps and reason details before refund or compensation determination.
        </p>
      </div>

      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-md flex items-center gap-2">
          <AlertCircle size={15} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Single Enterprise Table */}
      <div className="bg-[#EEF2F6] rounded-2xl shadow-neu-flat border border-white/80 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#EEF2F6]/75 text-slate-500 font-semibold border-b border-[#D9E2EC]/70 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="px-4 py-2.5">Booking ID</th>
                <th className="px-4 py-2.5">Scheduled Date</th>
                <th className="px-4 py-2.5">Customer</th>
                <th className="px-4 py-2.5">Vendor</th>
                <th className="px-4 py-2.5">Status</th>
                <th className="px-4 py-2.5">Recorded Reason</th>
                <th className="px-4 py-2.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#D9E2EC]/70">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <Loader2 size={20} className="animate-spin text-slate-600 mx-auto mb-2" />
                    <span>Loading exceptions...</span>
                  </td>
                </tr>
              ) : disputes.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No active disputes or cancelled bookings requiring administrative intervention.
                  </td>
                </tr>
              ) : (
                disputes.map((d, index) => (
                  <tr key={d._id ? `${d._id}-${index}` : `dispute-${index}`} className="hover:bg-[#EEF2F6]/50 transition-colors">
                    <td className="px-4 py-2.5 font-mono font-medium text-slate-900">
                      #{d._id.slice(-6).toUpperCase()}
                    </td>
                    <td className="px-4 py-2.5 text-slate-600">
                      <div className="flex items-center gap-1">
                        <Calendar size={12} className="text-slate-400 shrink-0" />
                        <span>{new Date(d.scheduledDate || d.createdAt).toLocaleDateString()}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5">
                      <p className="font-medium text-slate-900">{d.customerId?.displayName || "Customer"}</p>
                      <p className="text-[11px] font-mono text-slate-500">{d.customerId?.phone || "—"}</p>
                    </td>
                    <td className="px-4 py-2.5">
                      <p className="font-medium text-slate-900">{d.vendorId?.businessName || "Vendor"}</p>
                      <p className="text-[11px] font-mono text-slate-500">{d.vendorId?.contactPhone || "—"}</p>
                    </td>
                    <td className="px-4 py-2.5">
                      <StatusBadge status={d.status} />
                    </td>
                    <td className="px-4 py-2.5 text-slate-600">
                      {d.cancellationReason || "Status: " + d.status}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <button
                        onClick={() => setSelectedDispute(d)}
                        className="p-1 text-slate-400 hover:text-[#2563EB] rounded transition cursor-pointer"
                        title="View Exception Details"
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

        <div className="px-4 py-3 border-t border-[#D9E2EC]/70 text-xs text-slate-500">
          Showing {disputes.length} exception records
        </div>
      </div>

      {/* Exception Detail Modal */}
      {selectedDispute && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40">
          <div className="w-full max-w-md bg-[#EEF2F6] rounded-2xl shadow-neu-flat border border-white/80 overflow-hidden shadow-lg">
            <div className="px-5 py-3.5 border-b border-[#D9E2EC]/70 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                  Exception: #{selectedDispute._id.slice(-6).toUpperCase()}
                </h3>
                <p className="text-[11px] font-mono text-slate-500">{selectedDispute._id}</p>
              </div>
              <button
                onClick={() => setSelectedDispute(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded transition cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-5 space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3 pb-3 border-b border-slate-100">
                <div>
                  <span className="text-slate-500 block mb-0.5">Status</span>
                  <StatusBadge status={selectedDispute.status} />
                </div>
                <div>
                  <span className="text-slate-500 block mb-0.5">Scheduled Date</span>
                  <span className="font-medium text-slate-700">
                    {new Date(selectedDispute.scheduledDate).toLocaleString()}
                  </span>
                </div>
              </div>

              <div>
                <span className="text-slate-500 block mb-1">Customer Details</span>
                <p className="font-medium text-slate-900">{selectedDispute.customerId?.displayName || "Customer"}</p>
                <p className="text-slate-600 font-mono">{selectedDispute.customerId?.phone}</p>
              </div>

              <div>
                <span className="text-slate-500 block mb-1">Vendor Details</span>
                <p className="font-medium text-slate-900">{selectedDispute.vendorId?.businessName || "Vendor"}</p>
                <p className="text-slate-600 font-mono">{selectedDispute.vendorId?.contactPhone}</p>
              </div>

              <div>
                <span className="text-slate-500 block mb-1">Reason / Notes</span>
                <div className="p-3 bg-[#EEF2F6] rounded-md border border-[#D9E2EC]/70 text-slate-700">
                  {selectedDispute.cancellationReason || "No custom reason recorded upon status transition."}
                </div>
              </div>
            </div>

            <div className="px-5 py-3 bg-[#EEF2F6] border-t border-[#D9E2EC]/70 flex justify-end">
              <button
                onClick={() => setSelectedDispute(null)}
                className="px-3 py-1.5 border border-[#D9E2EC]/80 text-slate-700 hover:bg-[#EEF2F6] rounded-md transition cursor-pointer text-xs"
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
