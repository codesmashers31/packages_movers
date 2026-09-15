"use client";

import { useState, useEffect } from "react";
import { fetchApi } from "@/lib/api";
import PageHeader from "@/app/admin/components/PageHeader";
import {
  FileClock,
  RefreshCw,
  Search,
  AlertCircle,
  Clock,
  Shield,
  User,
  Layers,
  ChevronDown,
  ChevronUp,
  X,
  FileCode,
  HardHat,
  Truck,
} from "lucide-react";

interface AuditLogItem {
  _id: string;
  actorId?: string;
  actorPhone?: string;
  action: string;
  targetType: string;
  targetId: string;
  reason?: string;
  details?: Record<string, any>;
  createdAt: string;
}

export default function VendorAuditLogsPage() {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterAction, setFilterAction] = useState("ALL");
  const [selectedLog, setSelectedLog] = useState<AuditLogItem | null>(null);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetchApi<{ logs: AuditLogItem[] }>("/vendor/audit-logs");
      setLogs(res.logs || []);
    } catch (err: any) {
      setError(err.message || "Failed to load vendor activity log");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const actionCategories = [
    { key: "ALL", label: "All Events" },
    { key: "RESOURCE", label: "Resource Dispatches" },
    { key: "STATUS", label: "Status & Milestones" },
    { key: "FLEET", label: "Fleet & Vehicles" },
    { key: "COMPLIANCE", label: "Compliance & Docs" },
  ];

  const filteredLogs = logs.filter((log) => {
    // Action category filter
    if (filterAction === "RESOURCE" && !log.action.includes("RESOURCE")) return false;
    if (filterAction === "STATUS" && !log.action.includes("STATUS")) return false;
    if (filterAction === "FLEET" && !log.action.includes("VEHICLE")) return false;
    if (filterAction === "COMPLIANCE" && !log.action.includes("DOCUMENT")) return false;

    // Search filter
    if (!search.trim()) return true;
    const s = search.toLowerCase();
    return (
      log.action.toLowerCase().includes(s) ||
      (log.reason && log.reason.toLowerCase().includes(s)) ||
      log.targetId.toLowerCase().includes(s) ||
      (log.actorPhone && log.actorPhone.includes(s))
    );
  });

  const getActionBadge = (action: string) => {
    if (action.includes("STATUS")) {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-sky-50 text-sky-800 border border-sky-200">
          {action}
        </span>
      );
    }
    if (action.includes("RESOURCE") || action.includes("ASSIGN")) {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-800 border border-blue-200">
          {action}
        </span>
      );
    }
    if (action.includes("DOCUMENT")) {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
          {action}
        </span>
      );
    }
    if (action.includes("VEHICLE") || action.includes("EMPLOYEE")) {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-teal-50 text-teal-800 border border-teal-200">
          {action}
        </span>
      );
    }
    return (
      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-800 border border-slate-200">
        {action}
      </span>
    );
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-6 font-sans text-slate-800">
      {/* Header */}
      <PageHeader
        title="Vendor Activity & Audit Trail"
        description="Immutable chronological record of all operational actions, resource dispatches, and administrative updates."
      >
        <button
          onClick={fetchLogs}
          disabled={loading}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 shadow-2xs cursor-pointer disabled:opacity-50 transition"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          <span>Refresh Audit Trail</span>
        </button>
      </PageHeader>

      {/* Error alert */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center justify-between gap-3 text-rose-700 text-xs shadow-xs">
          <div className="flex items-center gap-2.5">
            <AlertCircle size={16} className="shrink-0 text-rose-600" />
            <span className="font-medium">{error}</span>
          </div>
          <button
            onClick={fetchLogs}
            className="text-xs font-bold underline hover:text-rose-900 cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* Filter and Search Bar Card */}
      <div className="p-3 rounded-2xl bg-white shadow-xs border border-slate-200/80 flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Filter Pills */}
        <div className="flex items-center gap-1 overflow-x-auto bg-slate-100 p-1 rounded-xl border border-slate-200/60 pb-1 md:pb-1 scrollbar-none">
          {actionCategories.map((cat) => {
            const isActive = filterAction === cat.key;
            return (
              <button
                key={cat.key}
                onClick={() => setFilterAction(cat.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                  isActive
                    ? "bg-white text-blue-600 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* Search */}
        <div className="relative w-full md:w-72">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by action, target or reason..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 rounded-xl text-xs text-slate-800 placeholder-slate-400 border border-slate-200 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 outline-none transition"
          />
        </div>
      </div>

      {/* Audit Log Table Card */}
      <div className="rounded-2xl bg-white shadow-xs border border-slate-200/80 overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileClock size={16} className="text-blue-600" />
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Activity Events ({filteredLogs.length})
            </h3>
          </div>
          <span className="text-[11px] text-slate-500 font-medium">Real DB Audit Trail</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider bg-slate-50/70">
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Action Event</th>
                <th className="py-3 px-4">Actor</th>
                <th className="py-3 px-4">Target Entity</th>
                <th className="py-3 px-4">Operational Summary</th>
                <th className="py-3 px-4 text-right">Payload</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <RefreshCw size={22} className="animate-spin text-blue-600" />
                      <p className="font-semibold text-xs text-slate-900">Loading activity events...</p>
                    </div>
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Layers size={28} className="text-slate-300" />
                      <p className="font-bold text-xs text-slate-900">No activity events found</p>
                      <p className="text-[11px] text-slate-500 max-w-sm">
                        {filterAction !== "ALL" || search
                          ? "No audit events match the selected filter or search term."
                          : "No activity logs recorded yet."}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredLogs.map((item) => (
                  <tr key={item._id} className="hover:bg-slate-50/60 transition-colors group">
                    {/* Timestamp */}
                    <td className="py-3.5 px-4 whitespace-nowrap text-slate-500">
                      <div className="flex items-center gap-1.5 text-[11px]">
                        <Clock size={12} className="shrink-0 text-blue-600" />
                        <span>{formatDate(item.createdAt)}</span>
                      </div>
                    </td>

                    {/* Action */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {getActionBadge(item.action)}
                    </td>

                    {/* Actor */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 text-xs font-medium text-slate-800">
                        <User size={12} className="text-slate-400" />
                        <span>{item.actorPhone || "Authorized Vendor"}</span>
                      </div>
                    </td>

                    {/* Target Entity */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="font-mono text-[11px] text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                        {item.targetType}: #{item.targetId.slice(-6)}
                      </span>
                    </td>

                    {/* Summary / Reason */}
                    <td className="py-3.5 px-4">
                      <p className="text-xs text-slate-800 max-w-md truncate">
                        {item.reason || "Operational update recorded"}
                      </p>
                    </td>

                    {/* Details button */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      {item.details && Object.keys(item.details).length > 0 ? (
                        <button
                          onClick={() => setSelectedLog(item)}
                          className="px-2.5 py-1 rounded-lg text-[11px] font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 shadow-2xs cursor-pointer transition"
                        >
                          View Details
                        </button>
                      ) : (
                        <span className="text-[11px] text-slate-400">None</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Details JSON Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl border border-slate-200 p-6 space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <FileCode size={16} className="text-blue-600" />
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Event Payload Details
                </h3>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 transition cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-bold text-slate-900">{selectedLog.action}</p>
              <p className="text-xs text-slate-500">{selectedLog.reason}</p>
              <div className="p-3.5 rounded-xl bg-slate-900 text-sky-300 font-mono text-[11px] overflow-x-auto max-h-60 border border-slate-800">
                <pre>{JSON.stringify(selectedLog.details, null, 2)}</pre>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200/80 transition cursor-pointer"
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
