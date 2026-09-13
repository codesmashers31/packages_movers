"use client";

import { useEffect, useState, useCallback, Fragment } from "react";
import Link from "next/link";
import { fetchApi } from "@/lib/api";
import PageHeader from "../components/PageHeader";
import {
  KeyRound,
  Shield,
  Check,
  X,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Lock,
  Info,
} from "lucide-react";

interface PermissionItem {
  id: string;
  name: string;
  module: string;
  description: string;
}

export default function AdminPermissionsPage() {
  const [permissions, setPermissions] = useState<PermissionItem[]>([]);
  const [rolePermissions, setRolePermissions] = useState<Record<string, string[]>>({
    admin: [],
    operations_manager: [],
    operations_executive: [],
    customer: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [updatingKey, setUpdatingKey] = useState<string | null>(null);

  const roles = [
    { id: "admin", label: "Admin", badge: "Supervisory" },
    { id: "operations_manager", label: "Ops Manager", badge: "Management" },
    { id: "operations_executive", label: "Ops Executive", badge: "Execution" },
    { id: "customer", label: "Customer", badge: "Client" },
  ];

  const fetchPermissions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchApi<{
        permissionsList: PermissionItem[];
        rolePermissions: Record<string, string[]>;
      }>("/admin/permissions");

      setPermissions(data.permissionsList || []);
      setRolePermissions(data.rolePermissions || {});
    } catch (err: any) {
      setError(err.message || "Failed to load permissions from MongoDB");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPermissions();
  }, [fetchPermissions]);

  const handleTogglePermission = async (role: string, permissionKey: string, currentlyGranted: boolean) => {
    // Prevent admin lockout
    if (role === "admin" && permissionKey === "permissions:manage" && currentlyGranted) {
      alert("Administrator role must retain permission management authority to prevent lockout.");
      return;
    }

    const stateKey = `${role}:${permissionKey}`;
    try {
      setUpdatingKey(stateKey);
      setError(null);

      // Optimistic update
      setRolePermissions((prev) => {
        const currentList = prev[role] || [];
        const nextList = currentlyGranted
          ? currentList.filter((p) => p !== permissionKey)
          : [...currentList, permissionKey];
        return { ...prev, [role]: nextList };
      });

      const resData = await fetchApi<{
        success: boolean;
        rolePermissions: Record<string, string[]>;
      }>("/admin/permissions", {
        method: "PATCH",
        body: JSON.stringify({
          role,
          permissionKey,
          granted: !currentlyGranted,
        }),
      });

      if (resData.rolePermissions) {
        setRolePermissions(resData.rolePermissions);
      }

      setToastMessage(
        `${!currentlyGranted ? "Granted" : "Revoked"} '${permissionKey}' for ${role.toUpperCase()}`
      );
      setTimeout(() => setToastMessage(null), 3500);
    } catch (err: any) {
      setError(err.message || "Action failed");
      // Revert from server
      fetchPermissions();
    } finally {
      setUpdatingKey(null);
    }
  };

  // Group by module
  const modules = Array.from(new Set(permissions.map((p) => p.module)));

  return (
    <div className="space-y-4">
      <PageHeader
        title="Role & Permission Matrix"
        description="Live authorization matrix enforced by backend API middleware. Toggling values immediately updates MongoDB."
      >
        <Link
          href="/admin/roles"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#EEF2F6] border border-[#D9E2EC]/70 hover:bg-[#EEF2F6] text-slate-700 rounded-md text-xs font-medium shadow-neu-flat-sm transition"
        >
          <Shield size={14} className="text-slate-500" />
          <span>Role Demographics</span>
        </Link>
        <button
          onClick={fetchPermissions}
          className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-[#EEF2F6] rounded-md transition cursor-pointer"
          title="Reload Permissions"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
        </button>
      </PageHeader>

      {/* Informational Guidance Banner */}
      <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-lg flex items-start gap-2.5 text-xs text-amber-900">
        <Info size={16} className="text-amber-600 shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <span className="font-semibold">Backend Middleware Enforcement Active</span>
          <p className="text-[11px] text-amber-800/90">
            When a permission is toggled to <strong>Restricted</strong>, any API call from that role attempting that action is rejected with <code className="bg-amber-100/80 px-1 py-0.5 rounded text-amber-900 font-mono text-[10px]">HTTP 403 Forbidden</code>.
          </p>
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-center justify-between gap-3 text-rose-700 text-xs">
          <div className="flex items-center gap-2.5">
            <AlertCircle size={16} className="shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
          <button
            onClick={() => fetchPermissions()}
            className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded text-xs font-medium transition cursor-pointer shrink-0"
          >
            Retry
          </button>
        </div>
      )}

      {toastMessage && (
        <div className="p-3 bg-teal-50 border border-emerald-200 rounded-lg flex items-center gap-2.5 text-teal-700 text-xs shadow-neu-flat-sm">
          <CheckCircle2 size={16} className="shrink-0 text-[#14B8A6]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Matrix Table */}
      <div className="bg-[#EEF2F6] rounded-xl border border-[#D9E2EC]/70 shadow-neu-inset-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#EEF2F6] border-b border-[#D9E2EC]/70 text-[#64748B] text-[11px] uppercase tracking-wider">
                <th className="py-3 px-4 font-semibold w-72">Operational Capability</th>
                <th className="py-3 px-4 font-semibold hidden md:table-cell">Security Scope & Boundary</th>
                {roles.map((r) => (
                  <th key={r.id} className="py-3 px-3 font-semibold text-center w-28">
                    <div className="text-[#1E293B]">{r.label}</div>
                    <span className="text-[9px] font-normal text-[#64748B] block tracking-normal normal-case">{r.badge}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#D9E2EC]/70">
              {loading && permissions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-[#64748B]">
                    <RefreshCw size={22} className="animate-spin mx-auto mb-2 text-[#2563EB]" />
                    <span className="text-xs font-medium">Loading permission matrix from MongoDB...</span>
                  </td>
                </tr>
              ) : (
                modules.map((moduleName) => {
                  const modulePerms = permissions.filter((p) => p.module === moduleName);
                  return (
                    <Fragment key={moduleName}>
                      {/* Module header row */}
                      <tr className="bg-[#EEF2F6] border-y border-[#D9E2EC]/70">
                        <td
                          colSpan={6}
                          className="py-2 px-4 text-[11px] font-bold uppercase tracking-wider text-[#1E293B]"
                        >
                          {moduleName}
                        </td>
                      </tr>

                      {modulePerms.map((perm) => (
                        <tr key={perm.id} className="hover:bg-[#EEF2F6]/70 transition-colors">
                          <td className="py-2.5 px-4">
                            <div className="font-semibold text-[#1E293B]">{perm.name}</div>
                            <code className="text-[10px] text-[#64748B] font-mono">{perm.id}</code>
                          </td>
                          <td className="py-2.5 px-4 text-[#64748B] hidden md:table-cell text-[11px]">
                            {perm.description}
                          </td>

                          {roles.map((role) => {
                            const isGranted = (rolePermissions[role.id] || []).includes(perm.id);
                            const isUpdating = updatingKey === `${role.id}:${perm.id}`;
                            const isLocked = role.id === "admin" && perm.id === "permissions:manage";

                            return (
                              <td key={role.id} className="py-2.5 px-3 text-center align-middle">
                                {isLocked ? (
                                  <span
                                    className="inline-flex items-center justify-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-teal-50 text-teal-800 border border-teal-200/80 cursor-not-allowed"
                                    title="Root administrator privilege (Locked)"
                                  >
                                    <Lock size={10} className="text-[#14B8A6]" />
                                    Allowed
                                  </span>
                                ) : (
                                  <button
                                    onClick={() => handleTogglePermission(role.id, perm.id, isGranted)}
                                    disabled={isUpdating}
                                    className={`inline-flex items-center justify-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-medium transition cursor-pointer border ${
                                      isGranted
                                        ? "bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100 font-semibold"
                                        : "bg-rose-50 text-rose-600 border-rose-200 hover:bg-rose-100 font-semibold"
                                    } ${isUpdating ? "opacity-50 pointer-events-none" : ""}`}
                                    title={`Click to ${isGranted ? "revoke" : "grant"} permission for ${role.label}`}
                                  >
                                    {isUpdating ? (
                                      <RefreshCw size={10} className={`animate-spin ${isGranted ? "text-emerald-600" : "text-rose-600"}`} />
                                    ) : isGranted ? (
                                      <Check size={11} className="text-emerald-600" />
                                    ) : (
                                      <X size={11} className="text-rose-600" />
                                    )}
                                    <span>{isGranted ? "Allowed" : "Restricted"}</span>
                                  </button>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="px-5 py-3 bg-[#EEF2F6] border-t border-[#D9E2EC]/70 flex items-center justify-between text-[11px] text-[#64748B]">
          <span>Total Operational Permissions: <strong className="text-[#1E293B]">{permissions.length}</strong></span>
          <span>Security Model: Dynamic Role-Based Access Control (RBAC)</span>
        </div>
      </div>
    </div>
  );
}
