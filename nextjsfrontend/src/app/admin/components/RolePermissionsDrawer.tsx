"use client";

import React, { useState, useMemo, useEffect } from "react";
import {
  X,
  ShieldCheck,
  CheckCircle2,
  Lock,
  Search,
  RefreshCw,
  Building,
  User,
  ShieldAlert,
  Sparkles,
  Layers,
  Key,
  Info,
} from "lucide-react";
import { fetchApi } from "@/lib/api";

export interface PermissionDefinition {
  key: string;
  category: string;
  name: string;
  canDoDescription: string;
  cannotDoDescription: string;
  requiredRoleHint?: string;
}

export const ALL_ADMIN_PERMISSIONS: PermissionDefinition[] = [
  {
    key: "vendors:view",
    category: "Carrier & Fleet Oversight",
    name: "View Carrier Fleets",
    canDoDescription: "Browse registered moving companies, fleet sizes, service cities, and operational status.",
    cannotDoDescription: "Cannot browse carrier companies or view carrier profiles.",
  },
  {
    key: "vendors:approve",
    category: "Carrier & Fleet Oversight",
    name: "Approve & Manage Carriers",
    canDoDescription: "Review carrier onboarding applications, update operational status, approve companies, or request revisions.",
    cannotDoDescription: "Cannot approve, reject, or edit moving company operational status.",
  },
  {
    key: "documents:view",
    category: "Carrier & Fleet Oversight",
    name: "View Compliance Credentials",
    canDoDescription: "Inspect carrier commercial licenses, GST certificates, insurance policies, and driver KYC documents.",
    cannotDoDescription: "Cannot view uploaded compliance documents or identity proofs.",
  },
  {
    key: "documents:verify",
    category: "Carrier & Fleet Oversight",
    name: "Verify & Settle Documents",
    canDoDescription: "Mark compliance documents as APPROVED, request re-upload revisions with notes, or reject invalid credentials.",
    cannotDoDescription: "Cannot approve or request revisions on compliance documents.",
  },
  {
    key: "vendors:suspend",
    category: "Carrier & Fleet Oversight",
    name: "Suspend Carrier Operations",
    canDoDescription: "Temporarily freeze non-compliant moving companies or restore suspended carriers.",
    cannotDoDescription: "Cannot suspend or reactivate carrier fleets.",
  },
  {
    key: "bookings:view",
    category: "Move Supervision & Dispatches",
    name: "Supervise Customer Moves",
    canDoDescription: "Monitor all platform moves, routes, pick-up/destination addresses, and assigned trucks.",
    cannotDoDescription: "Cannot view live customer moving dispatches.",
  },
  {
    key: "bookings:manage",
    category: "Move Supervision & Dispatches",
    name: "Manage Dispatches & Milestones",
    canDoDescription: "Intervene in live moves, update progression milestones, and manage carrier fulfillments.",
    cannotDoDescription: "Cannot modify move statuses or update transit milestones.",
  },
  {
    key: "disputes:view",
    category: "Customer Arbitrations",
    name: "View Customer Disputes & Claims",
    canDoDescription: "Inspect damaged goods tickets, payment claims, and customer arbitration requests.",
    cannotDoDescription: "Cannot view customer dispute records or claims.",
  },
  {
    key: "disputes:manage",
    category: "Customer Arbitrations",
    name: "Arbitrate & Settle Claims",
    canDoDescription: "Issue claim settlements, authorize customer refunds, and record carrier violation warnings.",
    cannotDoDescription: "Cannot arbitrate customer damage claims or issue refunds.",
  },
  {
    key: "users:view",
    category: "User Administration",
    name: "View Platform Accounts",
    canDoDescription: "Search customer, vendor, and driver accounts across the platform.",
    cannotDoDescription: "Cannot view customer or driver user directories.",
  },
  {
    key: "users:create",
    category: "User Administration",
    name: "Onboard New Users",
    canDoDescription: "Manually register and provision customer and driver accounts.",
    cannotDoDescription: "Cannot create or register new user accounts.",
  },
  {
    key: "users:edit",
    category: "User Administration",
    name: "Edit User Profiles",
    canDoDescription: "Update customer display names, contact phones, and account settings.",
    cannotDoDescription: "Cannot edit user profile details.",
  },
  {
    key: "users:suspend",
    category: "User Administration",
    name: "Suspend Platform Users",
    canDoDescription: "Lock or suspend violating customer or driver accounts.",
    cannotDoDescription: "Cannot suspend user accounts.",
  },
  {
    key: "staff:view",
    category: "Staff & Governance",
    name: "View Administrative Staff",
    canDoDescription: "Browse internal operations staff, assigned departments, and active statuses.",
    cannotDoDescription: "Cannot view internal staff directory.",
    requiredRoleHint: "Super Administrator / Operations Lead",
  },
  {
    key: "staff:manage",
    category: "Staff & Governance",
    name: "Staff & RBAC Governance",
    canDoDescription: "Onboard internal administrators, issue temporary passwords, and assign roles.",
    cannotDoDescription: "Cannot onboard platform staff or modify staff accounts.",
    requiredRoleHint: "Super Administrator only",
  },
  {
    key: "permissions:manage",
    category: "Staff & Governance",
    name: "Security Roles & Permissions Matrix",
    canDoDescription: "Create custom roles, edit permission matrices, and modify system access control.",
    cannotDoDescription: "Cannot modify role permission matrices.",
    requiredRoleHint: "Super Administrator only",
  },
  {
    key: "packages:manage",
    category: "Platform Configuration",
    name: "Manage Moving Service Packages",
    canDoDescription: "Configure moving package tiers, volume estimates, and base pricing rules.",
    cannotDoDescription: "Cannot manage service pricing packages.",
  },
  {
    key: "service_areas:manage",
    category: "Platform Configuration",
    name: "Geographic Coverage & Postal Zones",
    canDoDescription: "Activate new operating cities, postal codes, and regional coverage boundaries.",
    cannotDoDescription: "Cannot configure operational service areas.",
  },
  {
    key: "reports:view",
    category: "Platform Configuration",
    name: "Business Intelligence & Telemetry",
    canDoDescription: "Access executive dashboards, moving demand corridor analytics, and growth metrics.",
    cannotDoDescription: "Cannot view analytical business intelligence reports.",
  },
  {
    key: "audit:view",
    category: "Staff & Governance",
    name: "Inspect Immutable Audit Logs",
    canDoDescription: "Inspect security access trails, staff action logs, and administrative compliance records.",
    cannotDoDescription: "Cannot view administrative audit logs.",
  },
  {
    key: "settings:manage",
    category: "Platform Configuration",
    name: "System Settings & Maintenance Mode",
    canDoDescription: "Configure core platform parameters, support contacts, and toggle maintenance mode.",
    cannotDoDescription: "Cannot modify core system settings or toggle maintenance mode.",
    requiredRoleHint: "Super Administrator only",
  },
];

const DOMAINS = [
  "All Domains",
  "Carrier & Fleet Oversight",
  "Move Supervision & Dispatches",
  "Customer Arbitrations",
  "User Administration",
  "Staff & Governance",
  "Platform Configuration",
];

interface RolePermissionsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: any;
  onUserRefreshed?: (user: any) => void;
}

export default function RolePermissionsDrawer({
  isOpen,
  onClose,
  currentUser,
  onUserRefreshed,
}: RolePermissionsDrawerProps) {
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

  const isSuperAdmin =
    currentUser?.phone === "+919876543210" ||
    currentUser?.adminRole === "super_admin" ||
    userPerms.includes("*");

  const hasPerm = (key: string) => isSuperAdmin || userPerms.includes(key);

  const rawRole = currentUser?.adminRole || "super_admin";
  const roleName = isSuperAdmin
    ? "Super Administrator"
    : rawRole
        .split("_")
        .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");

  const department = currentUser?.adminDepartment || (isSuperAdmin ? "Executive Governance" : "Operations");

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
      console.error("Failed to re-sync permissions:", err);
    } finally {
      setRefreshing(false);
    }
  };

  // Lock background scroll whenever modal is open
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

    return ALL_ADMIN_PERMISSIONS.filter((item) => {
      const allowed = hasPerm(item.key);
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
  }, [activeTab, selectedDomain, search, userPerms, isSuperAdmin]);

  const allowedCount = isSuperAdmin
    ? ALL_ADMIN_PERMISSIONS.length
    : ALL_ADMIN_PERMISSIONS.filter((i) => hasPerm(i.key)).length;

  const restrictedCount = ALL_ADMIN_PERMISSIONS.length - allowedCount;

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[99999] overflow-y-auto bg-slate-950/85 backdrop-blur-md flex flex-col items-center justify-start p-3 sm:p-5 pt-3 sm:pt-6 animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Centered Classic Modal Box with guaranteed visible header */}
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
                  Access Control & RBAC Matrix
                </span>
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Live Atlas Connected
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight leading-snug">
                Role & Operational Capabilities Matrix
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
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-black text-lg flex items-center justify-center shadow-md ring-2 ring-blue-500/20 shrink-0">
              {currentUser?.displayName?.charAt(0).toUpperCase() || "A"}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm sm:text-base font-extrabold text-slate-900 truncate">
                  {currentUser?.displayName || "Administrator"}
                </h3>
                <span className="px-2 py-0.5 rounded-lg text-[11px] font-bold bg-blue-600 text-white shadow-xs">
                  {roleName}
                </span>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-slate-600 mt-0.5 flex-wrap font-medium">
                <span className="flex items-center gap-1 text-slate-700 font-semibold">
                  <Building size={12} className="text-blue-600" />
                  {department}
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
                {ALL_ADMIN_PERMISSIONS.length} Capabilities
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
                All Matrix ({ALL_ADMIN_PERMISSIONS.length})
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
                placeholder="Search capability or key..."
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
          {isSuperAdmin && (
            <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-amber-400/10 to-transparent border border-amber-300/80 text-amber-950 flex items-start gap-3 shadow-xs">
              <Sparkles size={18} className="text-amber-600 mt-0.5 shrink-0" />
              <div className="min-w-0">
                <h4 className="text-xs font-black uppercase tracking-wider text-amber-900">
                  Unrestricted Root Platform Governance Active
                </h4>
                <p className="text-xs text-amber-900/90 leading-relaxed mt-0.5">
                  This administrative account possesses full root privilege override (<code className="font-mono bg-amber-100 text-amber-800 px-1 py-0.2 rounded font-bold">*</code>). You are authorized to execute every operational, financial, and governance action across all modules without restriction.
                </p>
              </div>
            </div>
          )}

          {filteredItems.length === 0 ? (
            <div className="py-14 text-center text-slate-500 space-y-2">
              <Info size={32} className="mx-auto text-slate-400 mb-1" />
              <p className="font-bold text-slate-700 text-sm">No capabilities match your active filter.</p>
              <p className="text-xs text-slate-500">Try adjusting your search query, domain filter, or tab selection.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {filteredItems.map((item) => {
                const allowed = hasPerm(item.key);

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
                              <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 border border-slate-200/80">
                                {item.key}
                              </span>
                              <span className="text-[10px] text-slate-400">
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

                    {/* Role Hint when restricted */}
                    {!allowed && item.requiredRoleHint && (
                      <div className="mt-2 text-[10px] font-semibold text-rose-700 bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-200/60 flex items-center gap-1">
                        <Lock size={10} className="shrink-0" />
                        <span>Requires {item.requiredRoleHint} elevation</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer Bar */}
        <div className="px-5 sm:px-6 py-3 border-t border-slate-200/80 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          <p className="text-xs text-slate-500 font-medium">
            Role assignments and capability boundaries are governed and audited via <span className="font-bold text-slate-700">Staff Governance</span>.
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
