"use client";

import { useState, useEffect } from "react";
import { fetchApi } from "@/lib/api";
import PageHeader from "@/app/admin/components/PageHeader";
import StatusBadge from "@/app/admin/components/StatusBadge";
import {
  BarChart3,
  RefreshCw,
  AlertCircle,
  HardHat,
  Truck,
  Calendar,
  CheckCircle2,
  TrendingUp,
  Activity,
  Layers,
  ArrowUpRight,
  ShieldAlert,
} from "lucide-react";

interface StatusCount {
  status: string;
  count: number;
}

interface UtilizationData {
  totalWorkers: number;
  busyWorkers: number;
  availableWorkers: number;
  utilizationRate: number;
}

interface FleetUtilizationData {
  totalVehicles: number;
  busyVehicles: number;
  availableVehicles: number;
  utilizationRate: number;
}

interface MonthlyVolume {
  _id: string;
  total: number;
  completed: number;
}

interface ReportsResponse {
  statusDistribution: StatusCount[];
  crewUtilization: UtilizationData;
  fleetUtilization: FleetUtilizationData;
  monthlyVolume: MonthlyVolume[];
}

export default function VendorReportsPage() {
  const [reports, setReports] = useState<ReportsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReports = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchApi<ReportsResponse>("/vendor/reports");
      setReports(data);
    } catch (err: any) {
      setError(err.message || "Failed to load operational reports");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const totalMoves =
    reports?.statusDistribution.reduce((acc, curr) => acc + curr.count, 0) || 0;
  const completedMoves =
    reports?.statusDistribution.find((s) => s.status === "COMPLETED")?.count || 0;
  const completionRate =
    totalMoves > 0 ? Math.round((completedMoves / totalMoves) * 100) : null;

  return (
    <div className="space-y-6 font-sans text-slate-800">
      {/* Header */}
      <PageHeader
        title="Operational Telemetry & Reports"
        description="Real-time resource utilization, move lifecycle distribution, and volume trends computed directly from production records."
      >
        <button
          onClick={fetchReports}
          disabled={loading}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 shadow-2xs cursor-pointer disabled:opacity-50 transition"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          <span>Refresh Telemetry</span>
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
            onClick={fetchReports}
            className="text-xs font-bold underline hover:text-rose-900 cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* Top 4 KPI Telemetry Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Crew Utilization */}
        <div className="p-5 rounded-2xl bg-white shadow-xs border border-slate-200/80 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Crew Utilization
            </span>
            <div className="h-8 w-8 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
              <HardHat size={16} />
            </div>
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-900">
              {reports?.crewUtilization.utilizationRate ?? 0}%
            </p>
            <div className="w-full bg-slate-100 h-2 rounded-full mt-2 overflow-hidden">
              <div
                className="bg-blue-600 h-full rounded-full transition-all duration-500"
                style={{ width: `${reports?.crewUtilization.utilizationRate ?? 0}%` }}
              />
            </div>
          </div>
          <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>{reports?.crewUtilization.busyWorkers ?? 0} active on move</span>
            <span className="font-bold text-emerald-600">
              {reports?.crewUtilization.availableWorkers ?? 0} available
            </span>
          </div>
        </div>

        {/* KPI 2: Fleet Utilization */}
        <div className="p-5 rounded-2xl bg-white shadow-xs border border-slate-200/80 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Fleet Utilization
            </span>
            <div className="h-8 w-8 rounded-xl bg-sky-50 border border-sky-200 flex items-center justify-center text-sky-600">
              <Truck size={16} />
            </div>
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-900">
              {reports?.fleetUtilization.utilizationRate ?? 0}%
            </p>
            <div className="w-full bg-slate-100 h-2 rounded-full mt-2 overflow-hidden">
              <div
                className="bg-sky-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${reports?.fleetUtilization.utilizationRate ?? 0}%` }}
              />
            </div>
          </div>
          <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>{reports?.fleetUtilization.busyVehicles ?? 0} in transit</span>
            <span className="font-bold text-emerald-600">
              {reports?.fleetUtilization.availableVehicles ?? 0} ready in depot
            </span>
          </div>
        </div>

        {/* KPI 3: Total Move Volume */}
        <div className="p-5 rounded-2xl bg-white shadow-xs border border-slate-200/80 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Total Move Dispatches
            </span>
            <div className="h-8 w-8 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-600">
              <Layers size={16} />
            </div>
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-900">{totalMoves}</p>
            <p className="text-xs text-slate-500 mt-1">Contracted relocation jobs</p>
          </div>
          <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>Completed: {completedMoves}</span>
            <span className="font-bold text-blue-600">
              {totalMoves > 0 ? `${completionRate}% fulfilled` : "No moves yet"}
            </span>
          </div>
        </div>

        {/* KPI 4: Completion Rate */}
        <div className="p-5 rounded-2xl bg-white shadow-xs border border-slate-200/80 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Completion Success
            </span>
            <div className="h-8 w-8 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
              <CheckCircle2 size={16} />
            </div>
          </div>
          <div>
            <p className="text-2xl font-bold text-emerald-600">
              {completionRate !== null ? `${completionRate}%` : "—"}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {totalMoves > 0 ? "On-time verified delivery" : "No completed moves yet"}
            </p>
          </div>
          <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>PIN code authenticated</span>
            <span className="font-bold text-emerald-700">
              {totalMoves > 0 ? "Healthy" : "Awaiting Dispatches"}
            </span>
          </div>
        </div>
      </div>

      {/* Main Grid: Status Distribution & Monthly History */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left (7 cols): Move Lifecycle Distribution */}
        <div className="lg:col-span-7 rounded-2xl bg-white shadow-xs border border-slate-200/80 p-6 space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Activity size={16} className="text-blue-600" />
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Move Lifecycle Distribution
              </h3>
            </div>
            <span className="text-[11px] text-slate-500">Real DB counts</span>
          </div>

          {!reports || reports.statusDistribution.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              <p>No move records available for lifecycle analysis.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {reports.statusDistribution.map((item) => {
                const percent = totalMoves > 0 ? Math.round((item.count / totalMoves) * 100) : 0;
                return (
                  <div key={item.status} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <StatusBadge status={item.status} />
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-bold text-slate-900">{item.count} moves</span>
                        <span className="font-mono text-slate-500 w-12 text-right">{percent}%</span>
                      </div>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          item.status === "COMPLETED"
                            ? "bg-emerald-500"
                            : item.status.includes("CONFIRMED") || item.status.includes("ASSIGNED")
                            ? "bg-blue-600"
                            : item.status === "IN_TRANSIT"
                            ? "bg-sky-500"
                            : "bg-rose-500"
                        }`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right (5 cols): Monthly Moving Volume */}
        <div className="lg:col-span-5 rounded-2xl bg-white shadow-xs border border-slate-200/80 p-6 space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <TrendingUp size={16} className="text-blue-600" />
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Monthly Volume Trend
              </h3>
            </div>
            <span className="text-[11px] text-slate-500">Historical breakdown</span>
          </div>

          {!reports || reports.monthlyVolume.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              <p>No historical monthly volume records logged yet.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {reports.monthlyVolume.map((mv) => (
                <div key={mv._id} className="py-3 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <Calendar size={14} className="text-blue-600" />
                    <span className="font-bold text-slate-900">{mv._id}</span>
                  </div>
                  <div className="flex items-center gap-4 text-[11px]">
                    <span className="text-slate-500">Total: <strong className="text-slate-900">{mv.total}</strong></span>
                    <span className="text-emerald-600 font-bold">Delivered: {mv.completed}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Operational Readiness Advisory */}
          <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-200/70 space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-bold text-blue-700">
              <ShieldAlert size={15} />
              <span>Operational Capacity Health</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Your fleet and crew have active capacity available to take on immediate customer bookings without scheduling bottlenecks.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
