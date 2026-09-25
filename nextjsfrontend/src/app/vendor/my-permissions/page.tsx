"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { fetchApi } from "@/lib/api";
import PageHeader from "@/app/admin/components/PageHeader";
import {
  VENDOR_SIDEBAR_MODULES,
  isActionGranted,
  type VendorSidebarModuleDef,
  type PermissionActionDef,
} from "@/lib/vendorPermissionsDef";
import ModuleActionPermissionSelector from "@/components/permissions/ModuleActionPermissionSelector";
import {
  Shield,
  ShieldCheck,
  CheckCircle2,
  Lock,
  Users,
  Building,
  Phone,
  RefreshCw,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  UserCheck,
  TrendingUp,
  FileText,
  CalendarCheck,
  Truck,
  HardHat,
  Car,
  Layers,
  Package,
  MapPin,
  FileCheck,
  BarChart3,
  FileClock,
  Sparkles,
} from "lucide-react";

const ICON_MAP: Record<string, any> = {
  TrendingUp,
  FileText,
  CalendarCheck,
  Truck,
  HardHat,
  Car,
  Layers,
  Package,
  MapPin,
  FileCheck,
  Users,
  Shield,
  BarChart3,
  FileClock,
};

export default function VendorMyPermissionsPage() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [employeeDetail, setEmployeeDetail] = useState<any>(null);
  const [roleDef, setRoleDef] = useState<any>(null);
  const [effectivePermissions, setEffectivePermissions] = useState<string[]>([]);
  const [assignedVehicles, setAssignedVehicles] = useState<any[]>([]);
  const [assignedCrew, setAssignedCrew] = useState<any[]>([]);
  const [assignedMoves, setAssignedMoves] = useState<any[]>([]);
  const [scopeData, setScopeData] = useState<{ isCompanyWide?: boolean } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadUserData = async () => {
    try {
      setLoading(true);
      setError(null);

      // 1. Fetch current authenticated user
      const meRes = await fetchApi<{ user: any }>("/auth/me");
      const user = meRes.user;
      setCurrentUser(user);

      // If user is vendor owner, has wildcard access
      if (user.role === "vendor" || user.permissions?.includes("*")) {
        setEffectivePermissions(["*"]);
      } else if (Array.isArray(user.permissions)) {
        setEffectivePermissions(user.permissions);
      } else if (Array.isArray(user.resolvedPermissions)) {
        setEffectivePermissions(user.resolvedPermissions);
      }

      // 2. Fetch rich employee & scope details from /vendor/employees/:id
      const targetId = user?._id || user?.id;
      if (targetId) {
        try {
          const detailRes = await fetchApi<{
            employee: any;
            roleDef: any;
            effectivePermissions: string[];
            permissionOverrides: any;
            scope?: { isCompanyWide?: boolean };
            assignedVehicles?: any[];
            assignedCrew?: any[];
            assignedMoves?: any[];
          }>(`/vendor/employees/${targetId}`);
          if (detailRes?.employee) {
            setEmployeeDetail(detailRes.employee);
            if (detailRes.roleDef) {
              setRoleDef(detailRes.roleDef);
            }
            if (Array.isArray(detailRes.effectivePermissions) && detailRes.effectivePermissions.length > 0) {
              setEffectivePermissions(detailRes.effectivePermissions);
            }
            if (detailRes.scope) {
              setScopeData(detailRes.scope);
            }
            if (Array.isArray(detailRes.assignedVehicles)) {
              setAssignedVehicles(detailRes.assignedVehicles);
            }
            if (Array.isArray(detailRes.assignedCrew)) {
              setAssignedCrew(detailRes.assignedCrew);
            }
            if (Array.isArray(detailRes.assignedMoves)) {
              setAssignedMoves(detailRes.assignedMoves);
            }
          }
        } catch {
          // Employee detail optional fallback
        }

        // Secondary custom role lookup if not resolved from employee
        fetchApi<{ roles: any[] }>("/vendor/roles")
          .then((rRes) => {
            if (rRes?.roles) {
              const norm = (s: string) => (s || "").toLowerCase().replace(/[^a-z0-9]/g, "");
              const match = rRes.roles.find(
                (r) =>
                  (r.id && norm(r.id) === norm(user.employeeRole)) ||
                  (r.name && norm(r.name) === norm(user.employeeRole))
              );
              if (match) {
                setRoleDef((prev: any) => prev || match);
              }
            }
          })
          .catch(() => {});
      }
    } catch (err: any) {
      setError(err.message || "Failed to load role and permissions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUserData();
  }, []);

  const isOwnerOrManager = useMemo(() => {
    if (!currentUser) return false;
    if (currentUser.role === "vendor" || currentUser.role === "admin") return true;
    if (effectivePermissions.includes("*")) return true;
    const r = (currentUser.employeeRole || "").toLowerCase();
    return r === "manager" || r === "operational_manager" || effectivePermissions.includes("Manage Employees & Crew");
  }, [currentUser, effectivePermissions]);

  // Calculate total allowed actions across all modules
  const stats = useMemo(() => {
    let totalActions = 0;
    let allowedActions = 0;
    for (const mod of VENDOR_SIDEBAR_MODULES) {
      for (const action of mod.actions) {
        totalActions++;
        if (isActionGranted(effectivePermissions, action)) {
          allowedActions++;
        }
      }
    }
    return {
      totalActions,
      allowedActions,
      restrictedActions: totalActions - allowedActions,
    };
  }, [effectivePermissions]);

  const roleTitle = useMemo(() => {
    if (currentUser?.role === "vendor") return "Company Owner / Managing Director";
    if (roleDef?.name) return roleDef.name;
    if (employeeDetail?.roleName) return employeeDetail.roleName;
    const r = currentUser?.employeeRole || "Staff Member";
    return r
      .split("_")
      .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
  }, [currentUser, roleDef, employeeDetail]);

  return (
    <div className="space-y-6 font-sans text-slate-900 pb-12">
      {/* Page Header */}
      <PageHeader
        title="My Role & Operational Permissions"
        description="A transparent summary of your official company role, working scope, and permitted capabilities."
      >
        <div className="flex items-center gap-2">
          {isOwnerOrManager && (
            <Link
              href="/vendor/permissions"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-xs transition cursor-pointer"
            >
              <ShieldCheck size={14} />
              <span>Manage Company Permissions</span>
            </Link>
          )}

          <button
            onClick={loadUserData}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200/80 shadow-2xs transition cursor-pointer disabled:opacity-50"
          >
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
            <span>Refresh</span>
          </button>
        </div>
      </PageHeader>

      {/* Alert Error */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-3 text-rose-700 text-xs shadow-2xs">
          <AlertCircle size={18} className="shrink-0 text-rose-600" />
          <span className="font-medium">{error}</span>
        </div>
      )}

      {/* Company Verification Gate Status Banner */}
      {(currentUser?.companyVerificationAccess === "RESTRICTED" || currentUser?.vendorStatus !== "APPROVED") && (
        <div className="p-5 bg-amber-50/90 border border-amber-200 rounded-3xl flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs shadow-2xs">
          <div className="flex items-start gap-3.5">
            <div className="p-2.5 rounded-2xl bg-amber-100 text-amber-800 shrink-0">
              <Lock size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-sm text-amber-950">Company Access: RESTRICTED</span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-200 text-amber-900 uppercase tracking-wider">
                  Verification Status: {(currentUser?.companyVerificationStatus || currentUser?.vendorStatus || "PENDING_REVIEW").replace("_", " ")}
                </span>
              </div>
              <p className="text-amber-800 text-xs mt-1 leading-relaxed">
                Your assigned operational permissions (
                <strong className="text-slate-900">{effectivePermissions.includes("*") ? "All Access" : `${stats.allowedActions} Permitted Actions`}</strong>
                ) remain intact and preserved in the system, but operational modules are currently locked pending company document verification.
              </p>
              {currentUser?.companyVerification?.blockingItem && (
                <p className="text-amber-900 font-bold text-xs mt-1">
                  Blocking Item: {currentUser.companyVerification.blockingItem}
                </p>
              )}
              {currentUser?.companyVerification?.reason && (
                <p className="text-slate-600 italic text-xs mt-0.5">
                  Reason: "{currentUser.companyVerification.reason}"
                </p>
              )}
            </div>
          </div>
          <Link
            href="/vendor/company-profile"
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shrink-0 whitespace-nowrap transition shadow-xs self-end md:self-center"
          >
            Review Company Profile &rarr;
          </Link>
        </div>
      )}

      {/* Employee Identity & Governance Capsule */}
      <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-2xs space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="h-14 w-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-xl shadow-xs shrink-0">
              {(currentUser?.displayName || currentUser?.username || "V").charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-lg font-bold text-slate-900">
                  {currentUser?.displayName || currentUser?.username || "Employee"}
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200/60">
                  {roleTitle}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60 flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  Active On Duty
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 mt-2">
                {currentUser?.phone && (
                  <span className="flex items-center gap-1">
                    <Phone size={13} className="text-slate-400" />
                    <span>{currentUser.phone}</span>
                  </span>
                )}
                {currentUser?.corporateEmail && (
                  <span>
                    Email: <strong>{currentUser.corporateEmail}</strong>
                  </span>
                )}
                {(employeeDetail?.department || currentUser?.department) && (
                  <span className="flex items-center gap-1">
                    <Building size={13} className="text-slate-400" />
                    <span>{employeeDetail?.department || currentUser?.department}</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Supervisor Card */}
          <div className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200/70 rounded-2xl text-xs">
            <div className="p-2 rounded-xl bg-white border border-slate-200/80 text-blue-600">
              <UserCheck size={16} />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Reports To</span>
              <p className="font-semibold text-slate-800">
                {employeeDetail?.reportsTo?.displayName || employeeDetail?.reportsTo?.username || currentUser?.reportsTo?.displayName || currentUser?.reportsTo?.username || "Not configured"}
              </p>
            </div>
          </div>
        </div>

        {/* Resource Operational Scope Card */}
        <div className="p-4 bg-slate-50/70 rounded-2xl border border-slate-200/60 space-y-3 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Truck size={14} className="text-blue-600" />
              <span>Assigned Operational Scope</span>
            </span>
            <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-600">
              {scopeData?.isCompanyWide
                ? "Unrestricted Scope"
                : !scopeData && !employeeDetail
                ? "Scope information unavailable"
                : assignedVehicles.length === 0 && assignedCrew.length === 0 && assignedMoves.length === 0
                ? "No resources currently assigned"
                : "Assigned Scope"}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            <div className="p-3 bg-white rounded-xl border border-slate-200/70">
              <div className="flex items-center justify-between text-slate-500 mb-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Vehicles</span>
                <Car size={13} className="text-slate-400" />
              </div>
              <p className="font-semibold text-slate-800">
                {scopeData?.isCompanyWide
                  ? "Unrestricted Scope"
                  : assignedVehicles.length > 0
                  ? `${assignedVehicles.length} Vehicle${assignedVehicles.length > 1 ? "s" : ""} Assigned`
                  : !scopeData && !employeeDetail
                  ? "Scope information unavailable"
                  : "No resources currently assigned"}
              </p>
              {assignedVehicles.length > 0 && !scopeData?.isCompanyWide && (
                <p className="text-[10px] text-slate-500 truncate mt-0.5">
                  {assignedVehicles.map((v) => v.registrationNumber || v.name).join(", ")}
                </p>
              )}
            </div>

            <div className="p-3 bg-white rounded-xl border border-slate-200/70">
              <div className="flex items-center justify-between text-slate-500 mb-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Crew Members</span>
                <HardHat size={13} className="text-slate-400" />
              </div>
              <p className="font-semibold text-slate-800">
                {scopeData?.isCompanyWide
                  ? "Unrestricted Scope"
                  : assignedCrew.length > 0
                  ? `${assignedCrew.length} Crew Member${assignedCrew.length > 1 ? "s" : ""} Assigned`
                  : !scopeData && !employeeDetail
                  ? "Scope information unavailable"
                  : "No resources currently assigned"}
              </p>
              {assignedCrew.length > 0 && !scopeData?.isCompanyWide && (
                <p className="text-[10px] text-slate-500 truncate mt-0.5">
                  {assignedCrew.map((c) => c.displayName || c.username).join(", ")}
                </p>
              )}
            </div>

            <div className="p-3 bg-white rounded-xl border border-slate-200/70">
              <div className="flex items-center justify-between text-slate-500 mb-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Active Moves</span>
                <CalendarCheck size={13} className="text-slate-400" />
              </div>
              <p className="font-semibold text-slate-800">
                {scopeData?.isCompanyWide
                  ? "Unrestricted Scope"
                  : assignedMoves.length > 0
                  ? `${assignedMoves.length} Active Move${assignedMoves.length > 1 ? "s" : ""}`
                  : !scopeData && !employeeDetail
                  ? "Scope information unavailable"
                  : "No resources currently assigned"}
              </p>
            </div>
          </div>
        </div>

        {/* Quick Capability Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-slate-100 text-xs">
          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/60">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Sidebar Modules</span>
            <p className="text-base font-bold text-slate-900 mt-0.5">{VENDOR_SIDEBAR_MODULES.length} Modules</p>
          </div>
          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/60">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Granted Capabilities</span>
            <p className="text-base font-bold text-emerald-600 mt-0.5">
              {stats.allowedActions} of {stats.totalActions} Actions
            </p>
          </div>
          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/60">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Restricted Actions</span>
            <p className="text-base font-bold text-slate-500 mt-0.5">{stats.restrictedActions} Restricted</p>
          </div>
          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/60">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Access Type</span>
            <p className="text-xs font-semibold text-blue-700 mt-1">
              {effectivePermissions.includes("*") ? "Full Enterprise Wildcard" : "Role-Based Security"}
            </p>
          </div>
        </div>
      </div>

      {/* Notice for Regular Employees */}
      {!isOwnerOrManager && (
        <div className="p-4 bg-blue-50 border border-blue-200/80 rounded-2xl text-xs text-blue-800 flex items-start gap-3">
          <Shield size={16} className="text-blue-600 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <p className="font-semibold">Role-Governed Employee Account</p>
            <p className="text-blue-700 text-[11px]">
              Your operational capabilities are determined by company administration based on your role. If you require
              access to an additional module or action, please contact your Operations Manager or Company Admin.
            </p>
          </div>
        </div>
      )}

      {/* Reusable Enterprise Module Action Permission Selector (Read-Only) */}
      <ModuleActionPermissionSelector
        modules={VENDOR_SIDEBAR_MODULES}
        mode="read_only"
        effectivePermissions={effectivePermissions}
      />
    </div>
  );
}
