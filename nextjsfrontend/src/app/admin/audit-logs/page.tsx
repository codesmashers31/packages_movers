"use client";

import { useState, useEffect } from "react";
import { fetchApi } from "@/lib/api";
import PageHeader from "../components/PageHeader";
import {
  Loader2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
} from "lucide-react";

interface AuditLogItem {
  _id: string;
  actorId?: { displayName?: string; phone?: string; role?: string };
  actorPhone?: string;
  action: string;
  targetType: string;
  targetId?: string;
  reason?: string;
  details?: Record<string, any>;
  createdAt: string;
}

export default function AdminAuditLogsPage() {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [targetTypeFilter, setTargetTypeFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const loadLogs = async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "15",
        targetType: targetTypeFilter,
      });
      const res = await fetchApi<{
        logs?: AuditLogItem[];
        auditLogs?: AuditLogItem[];
        pagination?: { total: number; totalPages: number };
      }>(`/admin/audit-logs?${params.toString()}`);
      setLogs(res.auditLogs || res.logs || []);
      setTotalPages(res.pagination?.totalPages || 1);
      setTotalCount(res.pagination?.total || 0);
    } catch (err: any) {
      setError(err.message || "Failed to load audit logs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, [page, targetTypeFilter]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <PageHeader
        title="Audit Trail"
        description="Chronological log of administrative actions, compliance reviews, and system modifications"
      >
        <button
          onClick={loadLogs}
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
          <label className="text-xs text-slate-500 font-medium">Entity Filter:</label>
          <select
            value={targetTypeFilter}
            onChange={(e) => {
              setTargetTypeFilter(e.target.value);
              setPage(1);
            }}
            className="text-xs border border-[#D9E2EC]/80 rounded-md px-2.5 py-1.5 bg-[#EEF2F6] text-slate-700 focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]"
          >
            <option value="all">All Targets</option>
            <option value="Vendor">Vendor</option>
            <option value="User">User</option>
            <option value="Booking">Booking</option>
            <option value="ServicePackage">Service Package</option>
            <option value="Category">Category</option>
            <option value="PlatformSetting">Settings</option>
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
            onClick={() => loadLogs()}
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
                <th className="px-4 py-2.5">Timestamp</th>
                <th className="px-4 py-2.5">Operator</th>
                <th className="px-4 py-2.5">Action</th>
                <th className="px-4 py-2.5">Target</th>
                <th className="px-4 py-2.5">Recorded Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#D9E2EC]/70">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    <Loader2 size={20} className="animate-spin text-slate-600 mx-auto mb-2" />
                    <span>Loading audit stream...</span>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    No audit records match the selected filter.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log._id} className="hover:bg-[#EEF2F6]/50 transition-colors">
                    <td className="px-4 py-2.5 text-slate-600 font-mono text-[11px] whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-2.5">
                      <p className="font-medium text-slate-900">
                        {log.actorId?.displayName || log.actorPhone || "System Admin"}
                      </p>
                      <p className="text-[10px] text-slate-500 font-mono">
                        {log.actorId?.phone || log.actorPhone || "admin"}
                      </p>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="inline-flex px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-blue-50/80/80 text-orange-950 border border-blue-200/70">
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="px-1.5 py-0.5 rounded bg-[#EEF2F6] border border-[#D9E2EC]/70 text-slate-700 text-[11px] font-medium mr-1.5">
                        {log.targetType}
                      </span>
                      {log.targetId && (
                        <span className="font-mono text-slate-500 text-[11px]">
                          #{log.targetId.slice(-6).toUpperCase()}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-slate-600 max-w-sm">
                      {log.reason || "—"}
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
            Showing {logs.length} of {totalCount} events
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
    </div>
  );
}
