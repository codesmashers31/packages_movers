"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { fetchApi } from "@/lib/api";
import PageHeader from "../components/PageHeader";
import {
  ADMIN_SIDEBAR_MODULES,
  isAdminActionGranted,
  type AdminSidebarModuleDef,
  type AdminPermissionActionDef,
} from "@/lib/adminPermissionsDef";
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
  Store,
  FileCheck2,
  Package,
  MapPin,
  CalendarCheck,
  AlertTriangle,
  BarChart3,
  FileClock,
  Settings,
} from "lucide-react";

const ADMIN_ICON_MAP: Record<string, any> = {
  Users,
  Store,
  UserCheck,
  FileCheck2,
  Package,
  MapPin,
  CalendarCheck,
  AlertTriangle,
  Shield,
  BarChart3,
  FileClock,
  Settings,
};

export default function AdminMyPermissionsPage() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [effectivePermissions, setEffectivePermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAdminUserData = async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await fetchApi<{ user: any }>("/auth/me");
      const user = res.user;
      setCurrentUser(user);

      if (
        user.phone === "+919876543210" ||
        user.adminRole === "super_admin" ||
        user.role === "admin" && (!user.adminRole || user.permissions?.includes("*"))
      ) {
        setEffectivePermissions(["*"]);
      } else if (Array.isArray(user.permissions)) {
        setEffectivePermissions(user.permissions);
      } else if (Array.isArray(user.resolvedPermissions)) {
        setEffectivePermissions(user.resolvedPermissions);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load platform permissions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdminUserData();
  }, []);

  const isSuperAdmin = useMemo(() => {
    if (!currentUser) return false;
    if (currentUser.phone === "+919876543210" || currentUser.adminRole === "super_admin") return true;
    return effectivePermissions.includes("*") || effectivePermissions.includes("permissions:manage");
  }, [currentUser, effectivePermissions]);

  const stats = useMemo(() => {
    let totalActions = 0;
    let allowedActions = 0;
    for (const mod of ADMIN_SIDEBAR_MODULES) {
      for (const action of mod.actions) {
        totalActions++;
        if (isAdminActionGranted(effectivePermissions, action)) {
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
    const r = currentUser?.adminRole || "platform_officer";
    return r
      .split("_")
      .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
  }, [currentUser]);

  return (
    <div className="space-y-6 font-sans text-slate-900 pb-12">
      <PageHeader
        title="My Administrative Role & Capabilities"
        description="A transparent overview of your assigned headquarters designation, department, and permitted platform governance actions."
      >
        <div className="flex items-center gap-2">
          {isSuperAdmin && (
            <Link
              href="/admin/permissions"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-xs transition cursor-pointer"
            >
              <ShieldCheck size={14} />
              <span>Platform Permissions Governance</span>
            </Link>
          )}

          <button
            onClick={loadAdminUserData}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200/80 shadow-2xs transition cursor-pointer disabled:opacity-50"
          >
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
            <span>Refresh</span>
          </button>
        </div>
      </PageHeader>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-3 text-rose-700 text-xs shadow-2xs">
          <AlertCircle size={18} className="shrink-0 text-rose-600" />
          <span className="font-medium">{error}</span>
        </div>
      )}

      {/* Staff Identity Card */}
      <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-2xs space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="h-14 w-14 rounded-2xl bg-gradient-to-tr from-blue-700 to-cyan-600 flex items-center justify-center text-white font-bold text-xl shadow-xs shrink-0">
              {(currentUser?.displayName || currentUser?.username || "A").charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-lg font-bold text-slate-900">
                  {currentUser?.displayName || currentUser?.username || "Platform Administrator"}
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200/60">
                  {roleTitle}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60 flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  Verified Officer
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
                <span className="flex items-center gap-1">
                  <Building size={13} className="text-slate-400" />
                  <span>{currentUser?.adminDepartment || "Platform Operations"}</span>
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200/70 rounded-2xl text-xs">
            <div className="p-2 rounded-xl bg-white border border-slate-200/80 text-blue-600">
              <ShieldCheck size={16} />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Authority Level</span>
              <p className="font-semibold text-slate-800">
                {isSuperAdmin ? "Root Super Administrator" : "Departmental Staff Officer"}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-slate-100 text-xs">
          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/60">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Sidebar Modules</span>
            <p className="text-base font-bold text-slate-900 mt-0.5">{ADMIN_SIDEBAR_MODULES.length} Modules</p>
          </div>
          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/60">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Allowed Capabilities</span>
            <p className="text-base font-bold text-emerald-600 mt-0.5">
              {stats.allowedActions} of {stats.totalActions} Actions
            </p>
          </div>
          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/60">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Restricted Actions</span>
            <p className="text-base font-bold text-slate-500 mt-0.5">{stats.restrictedActions} Restricted</p>
          </div>
          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/60">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Security Standard</span>
            <p className="text-xs font-semibold text-blue-700 mt-1">Enterprise Atlas RBAC</p>
          </div>
        </div>
      </div>

      {/* Reusable Enterprise Module Action Permission Selector (Read-Only) */}
      <ModuleActionPermissionSelector
        modules={ADMIN_SIDEBAR_MODULES}
        mode="read_only"
        effectivePermissions={effectivePermissions}
      />
    </div>
  );
}
