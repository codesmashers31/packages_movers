"use client";

import { useState, useEffect, useMemo } from "react";
import { fetchApi } from "@/lib/api";
import PageHeader from "@/app/admin/components/PageHeader";
import {
  Package,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  IndianRupee,
  Layers,
  Sparkles,
  Search,
  Building2,
  Truck,
  Zap,
  Home,
  Check,
  Eye,
  X,
  ShieldCheck,
  Info,
} from "lucide-react";

interface ServicePkg {
  _id: string;
  name: string;
  code: string;
  description: string;
  category: string;
  basePriceEstimate?: number;
  inclusions: string[];
  isActive: boolean;
  isOfferedByVendor?: boolean;
}

export default function VendorPackagesPage() {
  const [packages, setPackages] = useState<ServicePkg[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [inspectPkg, setInspectPkg] = useState<ServicePkg | null>(null);

  const fetchPackages = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetchApi<{ packages: ServicePkg[] }>("/vendor/packages");
      setPackages(res.packages || []);
    } catch (err: any) {
      setError(err.message || "Failed to load moving packages");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPackages();
  }, []);

  // Filtered packages
  const filteredPackages = useMemo(() => {
    return packages.filter((pkg) => {
      const matchesSearch =
        search.trim() === "" ||
        pkg.name.toLowerCase().includes(search.toLowerCase()) ||
        pkg.code.toLowerCase().includes(search.toLowerCase()) ||
        (pkg.description && pkg.description.toLowerCase().includes(search.toLowerCase())) ||
        pkg.inclusions.some((inc) => inc.toLowerCase().includes(search.toLowerCase()));

      const matchesCat =
        selectedCategory === "all" ||
        pkg.category.toLowerCase() === selectedCategory.toLowerCase();

      return matchesSearch && matchesCat;
    });
  }, [packages, search, selectedCategory]);

  // Category counts
  const categories = useMemo(() => {
    const cats = [
      { id: "all", label: "All Packages", count: packages.length, icon: Layers },
      {
        id: "Residential",
        label: "Residential",
        count: packages.filter((p) => p.category.toLowerCase() === "residential").length,
        icon: Home,
      },
      {
        id: "Commercial",
        label: "Commercial",
        count: packages.filter((p) => p.category.toLowerCase() === "commercial").length,
        icon: Building2,
      },
      {
        id: "Vehicle Transit",
        label: "Vehicle Transit",
        count: packages.filter((p) => p.category.toLowerCase() === "vehicle transit").length,
        icon: Truck,
      },
      {
        id: "Express Move",
        label: "Express Move",
        count: packages.filter((p) => p.category.toLowerCase() === "express move").length,
        icon: Zap,
      },
    ];
    return cats;
  }, [packages]);

  return (
    <div className="space-y-6 font-sans text-[#1E293B]">
      {/* Header */}
      <PageHeader
        title="Moving Packages & Service Tiers"
        description="Standard moving packages, inclusions, and base pricing structures supported on the platform."
      >
        <button
          onClick={fetchPackages}
          disabled={loading}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 shadow-xs cursor-pointer disabled:opacity-50"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          <span>Refresh</span>
        </button>
      </PageHeader>

      {/* Error alert */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center justify-between gap-3 text-rose-700 text-xs shadow-xs">
          <div className="flex items-center gap-2.5">
            <AlertCircle size={17} className="shrink-0 text-rose-600" />
            <span className="font-medium">{error}</span>
          </div>
          <button
            onClick={fetchPackages}
            className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* Stats Summary Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white shadow-xs border border-slate-200/80">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Platform Packages</span>
          <p className="text-xl font-bold text-slate-900 mt-1">{packages.length}</p>
          <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1 mt-0.5">
            <CheckCircle2 size={11} /> Verified Standard Tiers
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-white shadow-xs border border-slate-200/80">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Residential Moves</span>
          <p className="text-xl font-bold text-blue-600 mt-1">
            {packages.filter((p) => p.category.toLowerCase() === "residential").length}
          </p>
          <span className="text-[11px] text-slate-500 mt-0.5 block">1BHK, 2BHK, 3BHK White Glove</span>
        </div>

        <div className="p-4 rounded-2xl bg-white shadow-xs border border-slate-200/80">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Commercial & Office</span>
          <p className="text-xl font-bold text-slate-900 mt-1">
            {packages.filter((p) => p.category.toLowerCase() === "commercial").length}
          </p>
          <span className="text-[11px] text-slate-500 mt-0.5 block">IT Servers & Workstations</span>
        </div>

        <div className="p-4 rounded-2xl bg-white shadow-xs border border-slate-200/80">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Specialized Transport</span>
          <p className="text-xl font-bold text-slate-900 mt-1">
            {packages.filter((p) => ["vehicle transit", "express move"].includes(p.category.toLowerCase())).length}
          </p>
          <span className="text-[11px] text-slate-500 mt-0.5 block">Automobiles & Single Room Express</span>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="p-3 rounded-2xl bg-white shadow-xs border border-slate-200/80 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        {/* Category Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto w-full md:w-auto bg-slate-100 p-1 rounded-xl border border-slate-200/60 scrollbar-none">
          {categories.map((cat) => {
            const Icon = cat.icon;
            const isSelected = selectedCategory.toLowerCase() === cat.id.toLowerCase();
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                  isSelected
                    ? "bg-blue-600 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Icon size={13} />
                <span>{cat.label}</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                    isSelected ? "bg-white/20 text-white" : "bg-white text-slate-600 border border-slate-200"
                  }`}
                >
                  {cat.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-72">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search packages or inclusions..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-8 py-2 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 outline-none transition"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
            >
              <X size={12} />
            </button>
          )}
        </div>
      </div>

      {/* Loading Skeleton */}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="bg-white rounded-2xl shadow-xs border border-slate-200/80 p-6 space-y-4 animate-pulse"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-slate-100" />
                  <div className="space-y-1.5">
                    <div className="h-4 w-32 bg-slate-200 rounded" />
                    <div className="h-3 w-16 bg-slate-200 rounded" />
                  </div>
                </div>
                <div className="h-5 w-16 bg-slate-100 rounded-full" />
              </div>
              <div className="h-10 bg-slate-100 rounded-xl" />
              <div className="h-12 bg-slate-50 rounded-xl" />
              <div className="space-y-2 pt-2">
                <div className="h-3 w-24 bg-slate-200 rounded" />
                <div className="h-3 w-full bg-slate-100 rounded" />
                <div className="h-3 w-5/6 bg-slate-100 rounded" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && filteredPackages.length === 0 && (
        <div className="bg-white rounded-2xl shadow-xs border border-slate-200/80 p-12 text-center space-y-4">
          <div className="h-14 w-14 rounded-2xl bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center mx-auto">
            <Package size={28} />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">No Moving Packages Found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
              {search
                ? `No packages match your search "${search}". Try searching another keyword or resetting filters.`
                : "No service packages available in this category."}
            </p>
          </div>
          <button
            onClick={() => {
              setSearch("");
              setSelectedCategory("all");
              fetchPackages();
            }}
            className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-xs cursor-pointer transition"
          >
            Reset Filters
          </button>
        </div>
      )}

      {/* Packages Grid */}
      {!loading && filteredPackages.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPackages.map((pkg) => (
            <div
              key={pkg._id}
              className="bg-white rounded-2xl shadow-xs border border-slate-200/80 p-5 flex flex-col justify-between space-y-4 transition hover:shadow-md hover:border-slate-300"
            >
              <div className="space-y-3.5">
                {/* Card Header */}
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-blue-50 text-blue-600 border border-blue-200/60 flex items-center justify-center shrink-0">
                      <Package size={20} />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm font-bold text-slate-900 truncate">{pkg.name}</h3>
                      <p className="text-[11px] font-mono text-blue-600 font-bold">{pkg.code}</p>
                    </div>
                  </div>

                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-teal-50 text-teal-700 border border-teal-200/80 shrink-0">
                    {pkg.category}
                  </span>
                </div>

                {/* Description */}
                <p className="text-xs text-slate-600 leading-relaxed min-h-[36px]">
                  {pkg.description || "Standard platform package offering with guaranteed dispatch."}
                </p>

                {/* Pricing Estimate */}
                {pkg.basePriceEstimate !== undefined && pkg.basePriceEstimate > 0 && (
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/60 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                        Base Price Estimate
                      </span>
                      <span className="text-[10px] text-slate-400">Standard city perimeter</span>
                    </div>
                    <span className="text-base font-extrabold text-slate-900 flex items-center font-mono">
                      <IndianRupee size={15} />
                      <span>{pkg.basePriceEstimate.toLocaleString("en-IN")}</span>
                    </span>
                  </div>
                )}

                {/* Inclusions */}
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2 flex items-center justify-between">
                    <span>Package Inclusions ({pkg.inclusions?.length || 0})</span>
                    <span className="text-[9px] text-emerald-600 font-semibold">Standard Scope</span>
                  </p>
                  <div className="space-y-1.5">
                    {pkg.inclusions && pkg.inclusions.length > 0 ? (
                      pkg.inclusions.slice(0, 4).map((inc, idx) => (
                        <div key={idx} className="flex items-start gap-2 text-xs text-slate-800">
                          <CheckCircle2 size={13} className="text-emerald-600 shrink-0 mt-0.5" />
                          <span className="font-medium text-[11px] leading-tight">{inc}</span>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-slate-400">Standard transport inclusions</p>
                    )}
                    {pkg.inclusions && pkg.inclusions.length > 4 && (
                      <button
                        onClick={() => setInspectPkg(pkg)}
                        className="text-[10px] text-blue-600 font-bold hover:underline pt-0.5 block cursor-pointer"
                      >
                        +{pkg.inclusions.length - 4} more inclusions...
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Card Footer */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-700 text-[11px]">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  Offered by Company
                </span>

                <button
                  onClick={() => setInspectPkg(pkg)}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 shadow-2xs flex items-center gap-1 cursor-pointer transition"
                >
                  <Eye size={12} className="text-blue-600" />
                  <span>View Scope</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Package Inclusions Inspection Modal */}
      {inspectPkg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden animate-scaleUp">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-white">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-blue-50 text-blue-600 border border-blue-200/60 flex items-center justify-center">
                  <Package size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">{inspectPkg.name}</h3>
                  <p className="text-[11px] font-mono text-blue-600 font-bold">{inspectPkg.code}</p>
                </div>
              </div>
              <button
                onClick={() => setInspectPkg(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl transition cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/60 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Category</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-50 text-teal-700 border border-teal-200">
                    {inspectPkg.category}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Base Estimate</span>
                  <span className="font-mono font-bold text-slate-900 text-sm flex items-center">
                    <IndianRupee size={13} />
                    {inspectPkg.basePriceEstimate?.toLocaleString("en-IN") || "Quote On Request"}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase block mb-0.5">Package Scope</span>
                  <p className="text-xs text-slate-800">{inspectPkg.description}</p>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-xs uppercase tracking-wide text-slate-900 mb-2.5 flex items-center gap-1.5">
                  <ShieldCheck size={14} className="text-emerald-600" />
                  <span>Full Inclusions Checklist</span>
                </h4>
                <div className="space-y-2 p-3.5 bg-slate-50 rounded-xl border border-slate-200/60">
                  {inspectPkg.inclusions.map((inc, i) => (
                    <div key={i} className="flex items-start gap-2.5 text-xs text-slate-800">
                      <CheckCircle2 size={14} className="text-emerald-600 shrink-0 mt-0.5" />
                      <span className="font-medium text-[11px] leading-relaxed">{inc}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <span className="text-[11px] text-slate-500">Platform Standard Package</span>
              <button
                onClick={() => setInspectPkg(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-xs transition cursor-pointer"
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
