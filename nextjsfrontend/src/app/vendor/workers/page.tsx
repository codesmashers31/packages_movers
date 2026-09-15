"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { fetchApi } from "@/lib/api";
import PageHeader from "@/app/admin/components/PageHeader";
import {
  HardHat,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  CalendarCheck,
  Search,
  Plus,
  ArrowRight,
} from "lucide-react";

interface WorkerItem {
  _id: string;
  displayName: string;
  phone: string;
  employeeRole: string;
  skills: string[];
  accountStatus: string;
  availability: "AVAILABLE" | "ON_MOVE";
  activeBookingId?: string | null;
  createdAt: string;
}

export default function VendorWorkersPage() {
  const [workers, setWorkers] = useState<WorkerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("ALL");

  const fetchWorkers = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetchApi<{ workers: WorkerItem[] }>("/vendor/workers");
      setWorkers(res.workers || []);
    } catch (err: any) {
      setError(err.message || "Failed to load vendor workers");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkers();
  }, []);

  const filteredWorkers = workers.filter((w) => {
    const matchesSearch =
      w.displayName.toLowerCase().includes(search.toLowerCase()) ||
      w.phone.includes(search);
    const matchesFilter =
      filter === "ALL"
        ? true
        : filter === "AVAILABLE"
        ? w.availability === "AVAILABLE"
        : w.availability === "ON_MOVE";
    return matchesSearch && matchesFilter;
  });

  const availableCount = workers.filter((w) => w.availability === "AVAILABLE").length;
  const onMoveCount = workers.filter((w) => w.availability === "ON_MOVE").length;

  return (
    <div className="space-y-6 font-sans text-slate-900">
      {/* Header */}
      <PageHeader
        title="Crew Workers & Field Operators"
        description="Monitor real-time worker availability and assignment across live moving operations."
      >
        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchWorkers}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200/80 shadow-2xs transition cursor-pointer disabled:opacity-50"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            <span>Refresh</span>
          </button>

          <Link
            href="/vendor/employees"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-xs transition cursor-pointer"
          >
            <Plus size={15} />
            <span>Manage Crew</span>
          </Link>
        </div>
      </PageHeader>

      {/* Error alert */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center justify-between gap-3 text-rose-700 text-xs shadow-2xs">
          <div className="flex items-center gap-2.5">
            <AlertCircle size={17} className="shrink-0 text-rose-600" />
            <span className="font-medium">{error}</span>
          </div>
          <button onClick={fetchWorkers} className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold cursor-pointer">
            Retry
          </button>
        </div>
      )}

      {/* Summary Badges */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Field Crew</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{workers.length}</p>
          <p className="text-[11px] text-slate-500 mt-0.5">Registered company workers</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Available for Moves</p>
          <p className="text-2xl font-bold text-emerald-600 mt-1">{availableCount}</p>
          <p className="text-[11px] text-emerald-600 font-medium mt-0.5">Ready for immediate dispatch</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Currently On Move</p>
          <p className="text-2xl font-bold text-sky-600 mt-1">{onMoveCount}</p>
          <p className="text-[11px] text-sky-600 font-medium mt-0.5">Assigned to active bookings</p>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3.5">
        <div className="relative w-full sm:w-80">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search workers by name or phone..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200/80 rounded-xl focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 text-xs text-slate-800 outline-none font-medium transition"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setFilter("ALL")}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
              filter === "ALL"
                ? "bg-blue-600 text-white shadow-xs"
                : "bg-slate-50 text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200/60"
            }`}
          >
            All ({workers.length})
          </button>

          <button
            onClick={() => setFilter("AVAILABLE")}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
              filter === "AVAILABLE"
                ? "bg-emerald-600 text-white shadow-xs"
                : "bg-slate-50 text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200/60"
            }`}
          >
            Available ({availableCount})
          </button>

          <button
            onClick={() => setFilter("ON_MOVE")}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
              filter === "ON_MOVE"
                ? "bg-sky-600 text-white shadow-xs"
                : "bg-slate-50 text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200/60"
            }`}
          >
            On Move ({onMoveCount})
          </button>
        </div>
      </div>

      {/* Workers Cards / Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-xs text-slate-500">
            <RefreshCw size={24} className="animate-spin mx-auto mb-2 text-blue-600" />
            <span>Calculating live crew availability...</span>
          </div>
        ) : filteredWorkers.length === 0 ? (
          <div className="py-16 text-center text-xs text-slate-500 space-y-2">
            <HardHat size={36} className="mx-auto text-slate-300 stroke-1" />
            <p className="text-sm font-bold text-slate-900">No workers match current criteria</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 font-bold text-[11px] uppercase tracking-wider bg-slate-50/70">
                  <th className="py-3.5 px-6">Worker Name</th>
                  <th className="py-3.5 px-4">Contact Phone</th>
                  <th className="py-3.5 px-4">Skill Certifications</th>
                  <th className="py-3.5 px-4">Live Availability</th>
                  <th className="py-3.5 px-4">Current Move Assignment</th>
                  <th className="py-3.5 px-6 text-right">Dispatch</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredWorkers.map((w) => (
                  <tr key={w._id} className="hover:bg-slate-50/60 transition">
                    <td className="py-3.5 px-6">
                      <div className="flex items-center gap-2.5">
                        <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-2xs shrink-0">
                          {w.displayName.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-bold text-slate-900">{w.displayName}</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 font-mono font-medium text-slate-500">{w.phone}</td>

                    <td className="py-3.5 px-4">
                      <div className="flex flex-wrap gap-1">
                        {w.skills.map((s, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 rounded-lg bg-slate-100 text-[10px] font-semibold text-slate-700 border border-slate-200/60"
                          >
                            {s}
                          </span>
                        ))}
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      {w.availability === "AVAILABLE" ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          <span>Available</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-sky-50 text-sky-700 border border-sky-200/80">
                          <span className="h-1.5 w-1.5 rounded-full bg-sky-500" />
                          <span>On Move</span>
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 font-medium">
                      {w.activeBookingId ? (
                        <Link
                          href={`/vendor/bookings/${w.activeBookingId}`}
                          className="text-blue-600 hover:underline font-mono text-xs flex items-center gap-1"
                        >
                          <span>Move #{w.activeBookingId.slice(-6).toUpperCase()}</span>
                          <ArrowRight size={11} />
                        </Link>
                      ) : (
                        <span className="text-slate-400">Unassigned</span>
                      )}
                    </td>

                    <td className="py-3.5 px-6 text-right">
                      {w.availability === "AVAILABLE" ? (
                        <Link
                          href="/vendor/bookings"
                          className="inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-blue-50 hover:bg-blue-100 text-xs font-semibold text-blue-700 border border-blue-200/80 transition"
                        >
                          <span>Assign Job</span>
                        </Link>
                      ) : (
                        <span className="text-[11px] text-slate-400 font-medium">Busy</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
