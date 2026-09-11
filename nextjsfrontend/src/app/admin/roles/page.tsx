"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { fetchApi } from "@/lib/api";
import PageHeader from "../components/PageHeader";
import { Shield, RefreshCw, Loader2, AlertCircle, KeyRound } from "lucide-react";

interface RoleItem {
  id: string;
  name: string;
  code: string;
  description: string;
  userCount: number;
  permissions: string[];
}

export default function AdminRolesPage() {
  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadRoles = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetchApi<{ roles: RoleItem[] }>("/admin/roles");
      setRoles(res.roles || []);
    } catch (err: any) {
      setError(err.message || "Failed to load roles");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRoles();
  }, []);

  return (
    <div className="space-y-4">
      {/* Header */}
      <PageHeader
        title="System Roles"
        description="Marketplace role definitions, authorization boundaries, and current account allocations"
      >
        <Link
          href="/admin/permissions"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md neu-btn-primary text-white text-xs font-medium shadow-neu-flat-sm transition cursor-pointer"
        >
          <KeyRound size={14} />
          <span>Permissions Matrix</span>
        </Link>
        <button
          onClick={loadRoles}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-[#EEF2F6] border border-[#D9E2EC]/80 rounded-md hover:bg-[#EEF2F6] transition cursor-pointer disabled:opacity-50"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          <span>Refresh</span>
        </button>
      </PageHeader>

      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-md flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertCircle size={15} className="shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
          <button
            onClick={() => loadRoles()}
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
            <thead className="bg-[#EEF2F6]/75 text-slate-500 font-semibold border-b border-[#D9E2EC]/70">
              <tr>
                <th className="px-4 py-2.5">Role Code</th>
                <th className="px-4 py-2.5">Display Name & Scope</th>
                <th className="px-4 py-2.5">Mapped Capabilities</th>
                <th className="px-4 py-2.5 text-right">Active Accounts</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#D9E2EC]/70">
              {loading ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-slate-400">
                    <Loader2 size={20} className="animate-spin text-slate-600 mx-auto mb-2" />
                    <span>Loading platform roles...</span>
                  </td>
                </tr>
              ) : roles.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-slate-400">
                    No roles defined.
                  </td>
                </tr>
              ) : (
                roles.map((r) => (
                  <tr key={r.id} className="hover:bg-[#EEF2F6]/50 transition-colors">
                    <td className="px-4 py-3 font-mono font-medium text-slate-900">
                      {r.code || r.id.toUpperCase()}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900">{r.name}</p>
                      <p className="text-[11px] text-slate-500 mt-0.5 max-w-md">
                        {r.description}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1 max-w-lg">
                        {(r.permissions && r.permissions.length > 0) ? (
                          r.permissions.map((perm) => (
                            <span
                              key={perm}
                              className="inline-flex items-center px-1.5 py-0.5 rounded bg-blue-50/80/70 border border-blue-200/50 text-orange-900 text-[10px]"
                            >
                              {perm}
                            </span>
                          ))
                        ) : (
                          <span className="text-slate-400 text-[11px] italic">No active permissions</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-medium text-slate-900">
                      {r.userCount} users
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="px-4 py-3 border-t border-[#D9E2EC]/70 text-xs text-slate-500">
          Showing {roles.length} core platform roles
        </div>
      </div>
    </div>
  );
}
