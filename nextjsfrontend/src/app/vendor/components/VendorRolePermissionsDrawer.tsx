"use client";

import React, { useState, useMemo, useEffect } from "react";
import {
  X,
  ShieldCheck,
  CheckCircle2,
  Lock,
  Search,
  RefreshCw,
  Store,
  Building,
  Sparkles,
  Info,
} from "lucide-react";
import { fetchApi } from "@/lib/api";

export interface VendorPermissionDefinition {
  key: string;
  name: string;
  category: string;
  canDoDescription: string;
  cannotDoDescription: string;
}

export const ALL_VENDOR_PERMISSIONS: VendorPermissionDefinition[] = [
  // 1. Staff & Crew Management
  {
    key: "Manage Employees & Crew",
    name: "Manage Employees & Crew",
    category: "Staff & Workforce",
    canDoDescription: "Add, edit, and manage staff accounts and active availability status across the company.",
    cannotDoDescription: "Cannot create, edit, or manage employee accounts.",
  },
  {
    key: "Assign Available Workers & Crew",
    name: "Assign Available Workers & Crew",
    category: "Staff & Workforce",
    canDoDescription: "Assign drivers, supervisors, and movers to confirmed customer moves.",
    cannotDoDescription: "Cannot assign workforce crew members to moves.",
  },
  {
    key: "View Crew Attendance & Performance",
    name: "View Crew Attendance & Performance",
    category: "Staff & Workforce",
    canDoDescription: "View completed moves, customer feedback, and job history for each crew member.",
    cannotDoDescription: "Cannot view crew performance metrics or attendance history.",
  },

  // 2. Trucks & Fleet
  {
    key: "Fleet & Vehicle Operations",
    name: "Fleet & Vehicle Operations",
    category: "Fleet Operations",
    canDoDescription: "Register trucks and manage RC, fitness certificate, and commercial insurance records.",
    cannotDoDescription: "Cannot register or modify fleet transport vehicles.",
  },
  {
    key: "Assign Transport Trucks to Moves",
    name: "Assign Transport Trucks to Moves",
    category: "Fleet Operations",
    canDoDescription: "Assign moving trucks, containers, and carriers to scheduled customer moves.",
    cannotDoDescription: "Cannot assign transport trucks to customer moves.",
  },
  {
    key: "Vehicle Inspection & Maintenance Tracking",
    name: "Vehicle Inspection & Maintenance Tracking",
    category: "Fleet Operations",
    canDoDescription: "Record pre-trip truck inspections, odometer logs, and vehicle maintenance checkups.",
    cannotDoDescription: "Cannot log vehicle inspections or maintenance updates.",
  },

  // 3. Bookings & Moving Jobs
  {
    key: "View & Dispatch Bookings",
    name: "View & Dispatch Bookings",
    category: "Move Operations",
    canDoDescription: "View confirmed moves, pickup/delivery addresses, customer contacts, and schedules.",
    cannotDoDescription: "Cannot view confirmed customer move dispatches.",
  },
  {
    key: "Update Move Progression Milestones",
    name: "Update Move Progression Milestones",
    category: "Move Operations",
    canDoDescription: "Advance move progression: En Route to Pickup, Packing, In Transit, Unloading, Completed.",
    cannotDoDescription: "Cannot update transit milestones or move status.",
  },
  {
    key: "Enter Recipient Delivery Verification Code",
    name: "Enter Recipient Delivery Verification Code",
    category: "Move Operations",
    canDoDescription: "Enter customer delivery verification OTP to verify dropoff and finalize fulfillment.",
    cannotDoDescription: "Cannot verify recipient delivery completion codes.",
  },

  // 4. Quotes & Customer Leads
  {
    key: "Review Available Customer Leads",
    name: "Review Available Customer Leads",
    category: "Quotations & Sales",
    canDoDescription: "Browse new customer moving requests and inventory lists in authorized service areas.",
    cannotDoDescription: "Cannot browse customer moving leads.",
  },
  {
    key: "Create & Submit Formal Quotations",
    name: "Create & Submit Formal Quotations",
    category: "Quotations & Sales",
    canDoDescription: "Formulate price quotes, specify vehicle types, crew counts, and dispatch bids.",
    cannotDoDescription: "Cannot submit formal quotations to customer requests.",
  },
  {
    key: "Quotation Performance & Insights",
    name: "Quotation Performance & Insights",
    category: "Quotations & Sales",
    canDoDescription: "Review accepted and rejected bids, competitor price benchmarks, and conversion win rates.",
    cannotDoDescription: "Cannot view quotation performance statistics.",
  },

  // 5. Services & Coverage Areas
  {
    key: "Service Catalog Configuration",
    name: "Service Catalog Configuration",
    category: "Catalog & Coverage",
    canDoDescription: "Manage moving packages (home, office, vehicle relocation) and base pricing rules.",
    cannotDoDescription: "Cannot configure company moving packages or base pricing.",
  },
  {
    key: "Custom Specialized Services",
    name: "Custom Specialized Services",
    category: "Catalog & Coverage",
    canDoDescription: "Add specialized add-on services (e.g., piano moving, wooden crating, pet relocation).",
    cannotDoDescription: "Cannot configure specialized add-on services.",
  },
  {
    key: "Coverage Areas Configuration",
    name: "Coverage Areas Configuration",
    category: "Catalog & Coverage",
    canDoDescription: "Select active dispatch cities and postal code corridors served by your fleet.",
    cannotDoDescription: "Cannot modify operational geographic coverage areas.",
  },

  // 6. Business Documents & Verification
  {
    key: "Document Submissions",
    name: "Document Submissions",
    category: "Compliance & Legal",
    canDoDescription: "Upload GST registration, transport permits, PAN cards, and fleet insurance files.",
    cannotDoDescription: "Cannot submit or update regulatory compliance documents.",
  },
  {
    key: "Regulatory Status Monitoring",
    name: "Regulatory Status Monitoring",
    category: "Compliance & Legal",
    canDoDescription: "Monitor admin verification, compliance approval statuses, and dossier audit trails.",
    cannotDoDescription: "Cannot inspect regulatory compliance status.",
  },

  // 7. Reports & Governance
  {
    key: "Reports & Performance Analytics",
    name: "Reports & Performance Analytics",
    category: "Business Intelligence",
    canDoDescription: "View revenue earnings, completed move telemetry, and business growth trends.",
    cannotDoDescription: "Cannot view carrier revenue analytics or financial reports.",
  },
  {
    key: "Operational Audit Logs",
    name: "Operational Audit Logs",
    category: "Business Intelligence",
    canDoDescription: "Inspect security trails, employee actions, and quote modifications across the company.",
    cannotDoDescription: "Cannot view company operational audit logs.",
  },
  {
    key: "Customer Support Coordination",
    name: "Customer Support Coordination",
    category: "Customer Support",
    canDoDescription: "Reply to customer messages, coordinate inquiries, and resolve move escalations.",
    cannotDoDescription: "Cannot coordinate customer support communications.",
  },
];

const DOMAINS = [
  "All Domains",
  "Staff & Workforce",
  "Fleet Operations",
  "Move Operations",
  "Quotations & Sales",
  "Catalog & Coverage",
  "Compliance & Legal",
  "Business Intelligence",
  "Customer Support",
];

interface VendorRolePermissionsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: any;
  vendorCompany?: any;
  onUserRefreshed?: (user: any) => void;
}

export default function VendorRolePermissionsDrawer({
  isOpen,
  onClose,
  currentUser,
  vendorCompany,
  onUserRefreshed,
}: VendorRolePermissionsDrawerProps) {
  const [activeTab, setActiveTab] = useState<"all" | "can" | "cannot">("all");
  const [selectedDomain, setSelectedDomain] = useState<string>("All Domains");
  const [search, setSearch] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [lastSynced, setLastSynced] = useState<string>("");

  const userPerms: string[] = useMemo(() => {
    return Array.isArray(currentUser?.permissions)
      ? currentUser.permissions
      : Array.isArray(currentUser?.resolvedPermissions)
      ? currentUser.resolvedPermissions
      : [];
  }, [currentUser]);

  const isVendorOwner = currentUser?.role === "vendor" || userPerms.includes("*");

  const hasPerm = (item: VendorPermissionDefinition) => {
    if (isVendorOwner) return true;
    const norm = (s: string) => (s || "").toLowerCase().replace(/[^a-z0-9]/g, "");
    const kNorm = norm(item.key);
    const nNorm = norm(item.name);
    return userPerms.some((p) => {
      const pNorm = norm(p);
      return (
        pNorm === kNorm ||
        pNorm === nNorm ||
        pNorm.includes(kNorm) ||
        kNorm.includes(pNorm) ||
        pNorm.includes(nNorm) ||
        nNorm.includes(pNorm)
      );
    });
  };

  const roleTitle = isVendorOwner
    ? "Carrier Managing Director (Owner)"
    : (currentUser?.employeeRole || "Operations Staff")
        .split("_")
        .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");

  const handleSyncPermissions = async () => {
    try {
      setRefreshing(true);
      const res = await fetchApi<{ user: any }>("/auth/me");
      if (res?.user) {
        localStorage.setItem("auth_user", JSON.stringify(res.user));
        if (onUserRefreshed) onUserRefreshed(res.user);
        const now = new Date();
        setLastSynced(now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
      }
    } catch (err) {
      console.error("Failed to re-sync vendor permissions:", err);
    } finally {
      setRefreshing(false);
    }
  };

  // Prevent background scrolling when modal is open
  useEffect(() => {
    if (isOpen) {
      handleSyncPermissions();
      const prevBodyOverflow = document.body.style.overflow;
      const prevHtmlOverflow = document.documentElement.style.overflow;
      document.body.style.overflow = "hidden";
      document.documentElement.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prevBodyOverflow;
        document.documentElement.style.overflow = prevHtmlOverflow;
      };
    }
  }, [isOpen]);

  const filteredItems = useMemo(() => {
    const term = search.trim().toLowerCase();

    return ALL_VENDOR_PERMISSIONS.filter((item) => {
      const allowed = hasPerm(item);
      if (activeTab === "can" && !allowed) return false;
      if (activeTab === "cannot" && allowed) return false;

      if (selectedDomain !== "All Domains" && item.category !== selectedDomain) {
        return false;
      }

      if (!term) return true;
      return (
        item.name.toLowerCase().includes(term) ||
        item.key.toLowerCase().includes(term) ||
        item.category.toLowerCase().includes(term) ||
        item.canDoDescription.toLowerCase().includes(term) ||
        item.cannotDoDescription.toLowerCase().includes(term)
      );
    });
  }, [activeTab, selectedDomain, search, userPerms, isVendorOwner]);

  const allowedCount = isVendorOwner
    ? ALL_VENDOR_PERMISSIONS.length
    : ALL_VENDOR_PERMISSIONS.filter((i) => hasPerm(i)).length;

  const restrictedCount = ALL_VENDOR_PERMISSIONS.length - allowedCount;

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[99999] overflow-y-auto bg-slate-950/85 backdrop-blur-md flex flex-col items-center justify-start p-3 sm:p-5 pt-3 sm:pt-6 animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Centered Classic Modal Box */}
      <div className="w-full max-w-5xl my-auto bg-white rounded-3xl shadow-2xl border border-slate-200/90 flex flex-col max-h-[88vh] overflow-hidden animate-scaleIn">
        
        {/* Top Header Bar */}
        <div className="px-5 sm:px-6 py-3.5 border-b border-slate-200/80 bg-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-blue-50 border border-blue-200/60 flex items-center justify-center text-blue-600 shrink-0">
              <ShieldCheck size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-[10px] font-extrabold tracking-wider uppercase px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                  Carrier Access Control Matrix
                </span>
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  MongoDB Synchronized
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight leading-snug">
                Carrier Role & Operational Capabilities
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSyncPermissions}
              disabled={refreshing}
              className="px-3 py-1.5 rounded-xl border border-slate-200/90 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
              title="Sync fresh permissions directly from MongoDB Atlas"
            >
              <RefreshCw size={13} className={refreshing ? "animate-spin text-blue-600" : "text-slate-500"} />
              <span className="hidden sm:inline">Sync Live</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              title="Close Matrix"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Hero Identity & Real-Time Stats Banner */}
        <div className="px-5 sm:px-6 py-3.5 bg-gradient-to-r from-slate-50 via-blue-50/30 to-slate-50 border-b border-slate-200/80 flex flex-col md:flex-row md:items-center justify-between gap-3.5 shrink-0">
          {/* User Details */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-slate-800 to-slate-900 text-white font-black text-lg flex items-center justify-center shadow-md ring-2 ring-slate-800/20 shrink-0">
              {currentUser?.displayName?.charAt(0).toUpperCase() || "C"}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm sm:text-base font-extrabold text-slate-900 truncate">
                  {currentUser?.displayName || "Carrier Staff"}
                </h3>
                <span className="px-2 py-0.5 rounded-lg text-[11px] font-bold bg-blue-600 text-white shadow-xs">
                  {roleTitle}
                </span>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-slate-600 mt-0.5 flex-wrap font-medium">
                <span className="flex items-center gap-1 text-slate-700 font-semibold">
                  <Store size={12} className="text-blue-600" />
                  {vendorCompany?.businessName || currentUser?.vendorName || "Carrier Partner"}
                </span>
                <span className="text-slate-300">•</span>
                <span className="font-mono text-[11px] text-slate-500">
                  {currentUser?.phone || currentUser?.email || "No contact on record"}
                </span>
                {lastSynced && (
                  <>
                    <span className="text-slate-300">•</span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      Synced {lastSynced}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Metric KPIs */}
          <div className="grid grid-cols-3 gap-2 sm:gap-2.5 shrink-0">
            <div className="px-3 py-1.5 rounded-xl bg-white border border-slate-200/90 shadow-xs flex flex-col justify-center">
              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">
                Total Scope
              </span>
              <span className="text-xs sm:text-sm font-extrabold text-slate-900">
                {ALL_VENDOR_PERMISSIONS.length} Capabilities
              </span>
            </div>

            <div className="px-3 py-1.5 rounded-xl bg-emerald-50/90 border border-emerald-200/80 shadow-xs flex flex-col justify-center">
              <div className="flex items-center gap-1 text-emerald-700">
                <CheckCircle2 size={11} className="text-emerald-600" />
                <span className="text-[9px] font-bold uppercase tracking-wider block">
                  Authorized
                </span>
              </div>
              <span className="text-xs sm:text-sm font-black text-emerald-800">
                {allowedCount} Active
              </span>
            </div>

            <div className="px-3 py-1.5 rounded-xl bg-slate-100/90 border border-slate-200 shadow-xs flex flex-col justify-center">
              <div className="flex items-center gap-1 text-slate-600">
                <Lock size={11} className="text-slate-500" />
                <span className="text-[9px] font-bold uppercase tracking-wider block">
                  Restricted
                </span>
              </div>
              <span className="text-xs sm:text-sm font-black text-slate-800">
                {restrictedCount} Actions
              </span>
            </div>
          </div>
        </div>

        {/* Toolbar: Segmented Tabs, Instant Search & Domain Selector */}
        <div className="px-5 sm:px-6 py-2.5 border-b border-slate-200/80 bg-white space-y-2 shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            {/* Segmented Filter Pills */}
            <div className="inline-flex p-1 rounded-xl bg-slate-100 border border-slate-200/70 text-xs shrink-0">
              <button
                onClick={() => setActiveTab("all")}
                className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer text-xs ${
                  activeTab === "all"
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                All Matrix ({ALL_VENDOR_PERMISSIONS.length})
              </button>
              <button
                onClick={() => setActiveTab("can")}
                className={`px-3 py-1 rounded-lg font-bold transition flex items-center gap-1.5 cursor-pointer text-xs ${
                  activeTab === "can"
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "text-slate-600 hover:text-emerald-700"
                }`}
              >
                <CheckCircle2 size={12} />
                <span>What You Can Do ({allowedCount})</span>
              </button>
              <button
                onClick={() => setActiveTab("cannot")}
                className={`px-3 py-1 rounded-lg font-bold transition flex items-center gap-1.5 cursor-pointer text-xs ${
                  activeTab === "cannot"
                    ? "bg-slate-800 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Lock size={12} />
                <span>Restricted ({restrictedCount})</span>
              </button>
            </div>

            {/* Instant Search Bar */}
            <div className="relative w-full sm:w-64 md:w-72 shrink-0">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search carrier capability or keyword..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8.5 pr-8 py-1.5 bg-slate-50 hover:bg-white focus:bg-white rounded-xl border border-slate-200 text-xs text-slate-900 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500/30 transition"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          </div>

          {/* Domain Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none text-[11px]">
            {DOMAINS.map((domain) => (
              <button
                key={domain}
                onClick={() => setSelectedDomain(domain)}
                className={`px-2.5 py-1 rounded-lg font-semibold whitespace-nowrap transition cursor-pointer text-[11px] ${
                  selectedDomain === domain
                    ? "bg-blue-600 text-white shadow-xs"
                    : "bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200/80"
                }`}
              >
                {domain}
              </button>
            ))}
          </div>
        </div>

        {/* Scrollable Capabilities Grid */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 bg-slate-50/50 space-y-4 scrollbar-thin">
          {isVendorOwner && (
            <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-600/10 via-indigo-600/10 to-transparent border border-blue-200/80 text-blue-950 flex items-start gap-3 shadow-xs">
              <Sparkles size={18} className="text-blue-600 mt-0.5 shrink-0" />
              <div className="min-w-0">
                <h4 className="text-xs font-black uppercase tracking-wider text-blue-900">
                  Carrier Account Owner Full Access
                </h4>
                <p className="text-xs text-blue-900/90 leading-relaxed mt-0.5">
                  As the verified registered carrier owner, you hold full operational authority over all dispatch dispatches, fleet additions, bids, crew assignments, and company settings.
                </p>
              </div>
            </div>
          )}

          {filteredItems.length === 0 ? (
            <div className="py-14 text-center text-slate-500 space-y-2">
              <Info size={32} className="mx-auto text-slate-400 mb-1" />
              <p className="font-bold text-slate-700 text-sm">No carrier capabilities match your active filter.</p>
              <p className="text-xs text-slate-500">Try adjusting your search query, domain filter, or tab selection.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {filteredItems.map((item) => {
                const allowed = hasPerm(item);

                return (
                  <div
                    key={item.key}
                    className={`p-4 rounded-2xl border transition-all duration-150 flex flex-col justify-between ${
                      allowed
                        ? "bg-white border-emerald-200/80 shadow-xs hover:border-emerald-300 hover:shadow-sm"
                        : "bg-white/70 border-slate-200/80 opacity-80 hover:opacity-100"
                    }`}
                  >
                    <div>
                      {/* Card Header Row */}
                      <div className="flex items-start justify-between gap-2.5">
                        <div className="flex items-start gap-3 min-w-0">
                          <div
                            className={`h-8 w-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                              allowed
                                ? "bg-emerald-100/80 text-emerald-700 border border-emerald-200"
                                : "bg-slate-100 text-slate-500 border border-slate-200"
                            }`}
                          >
                            {allowed ? <CheckCircle2 size={16} /> : <Lock size={15} />}
                          </div>

                          <div className="min-w-0">
                            <h4 className="text-xs font-extrabold text-slate-900 leading-snug">
                              {item.name}
                            </h4>
                            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                              <span className="text-[10px] text-slate-400 font-medium">
                                {item.category}
                              </span>
                            </div>
                          </div>
                        </div>

                        <span
                          className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full shrink-0 ${
                            allowed
                              ? "bg-emerald-100/90 text-emerald-800 border border-emerald-200"
                              : "bg-slate-100 text-slate-600 border border-slate-200"
                          }`}
                        >
                          {allowed ? "✓ Authorized" : "🔒 Restricted"}
                        </span>
                      </div>

                      {/* Operational Description */}
                      <div className="mt-3 text-xs leading-relaxed">
                        {allowed ? (
                          <div className="p-2.5 rounded-xl bg-emerald-50/50 border border-emerald-100/80 text-slate-700">
                            <span className="font-bold text-emerald-800 block text-[11px] mb-0.5">
                              What You Can Do:
                            </span>
                            {item.canDoDescription}
                          </div>
                        ) : (
                          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/70 text-slate-500">
                            <span className="font-bold text-slate-700 block text-[11px] mb-0.5">
                              Restricted Capability:
                            </span>
                            {item.cannotDoDescription}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer Bar */}
        <div className="px-5 sm:px-6 py-3 border-t border-slate-200/80 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          <p className="text-xs text-slate-500 font-medium">
            Staff permissions and assignments are managed via <span className="font-bold text-slate-700">Team & Access Control</span>.
          </p>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-xs transition cursor-pointer self-end sm:self-auto"
          >
            Close Matrix
          </button>
        </div>
      </div>
    </div>
  );
}
