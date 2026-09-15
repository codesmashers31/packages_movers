"use client";

import { useState, useEffect } from "react";
import { fetchApi } from "@/lib/api";
import PageHeader from "@/app/admin/components/PageHeader";
import { KeyRound, RefreshCw, AlertCircle, Check, X as XIcon, Eye, Sliders } from "lucide-react";

interface MatrixItem {
  module: string;
  description: string;
  manager: string;
  operations: string;
  worker: string;
}

export default function VendorPermissionsPage() {
  const [matrix, setMatrix] = useState<MatrixItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPermissions = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetchApi<{ matrix: MatrixItem[] }>("/vendor/permissions");
      setMatrix(res.matrix || []);
    } catch (err: any) {
      setError(err.message || "Failed to load permissions matrix");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPermissions();
  }, []);

  const renderBadge = (level: string) => {
    const l = level.toLowerCase();
    if (l.includes("manage") || l.includes("full")) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
          <Check size={12} className="text-emerald-600" />
          <span>{level}</span>
        </span>
      );
    }
    if (l.includes("view") || l.includes("only") || l.includes("assigned")) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-sky-50 text-sky-700 border border-sky-200/80">
          <Eye size={12} className="text-sky-600" />
          <span>{level}</span>
        </span>
      );
    }
    if (l.includes("update")) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200/80">
          <Sliders size={12} className="text-amber-600" />
          <span>{level}</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-slate-50 text-slate-400 border border-slate-200/60">
        <XIcon size={12} />
        <span>Restricted</span>
      </span>
    );
  };

  return (
    <div className="space-y-6 font-sans text-slate-900">
      {/* Header */}
      <PageHeader
        title="Role Access & Permissions Matrix"
        description="Granular access controls across company bookings, workforce, fleet, and compliance modules."
      >
        <button
          onClick={fetchPermissions}
          disabled={loading}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200/80 shadow-2xs transition cursor-pointer disabled:opacity-50"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          <span>Refresh</span>
        </button>
      </PageHeader>

      {/* Error alert */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center justify-between gap-3 text-rose-700 text-xs shadow-2xs">
          <div className="flex items-center gap-2.5">
            <AlertCircle size={17} className="shrink-0 text-rose-600" />
            <span className="font-medium">{error}</span>
          </div>
          <button onClick={fetchPermissions} className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold cursor-pointer">
            Retry
          </button>
        </div>
      )}

      {/* Permissions Matrix Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 font-bold text-[11px] uppercase tracking-wider bg-slate-50/70">
                <th className="py-4 px-6 min-w-[220px]">Operational Capability</th>
                <th className="py-4 px-4 text-center">Manager</th>
                <th className="py-4 px-4 text-center">Operations Staff</th>
                <th className="py-4 px-4 text-center">Crew Worker</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {matrix.map((row, idx) => (
                <tr key={idx} className="hover:bg-slate-50/60 transition">
                  <td className="py-4 px-6">
                    <p className="font-bold text-slate-900 text-xs">{row.module}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">{row.description}</p>
                  </td>

                  <td className="py-4 px-4 text-center">
                    {renderBadge(row.manager)}
                  </td>

                  <td className="py-4 px-4 text-center">
                    {renderBadge(row.operations)}
                  </td>

                  <td className="py-4 px-4 text-center">
                    {renderBadge(row.worker)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
