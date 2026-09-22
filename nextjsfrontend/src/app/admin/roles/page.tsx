"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { fetchApi } from "@/lib/api";
import PageHeader from "../components/PageHeader";
import { ADMIN_SIDEBAR_MODULES } from "@/lib/adminPermissionsDef";
import ModuleActionPermissionSelector from "@/components/permissions/ModuleActionPermissionSelector";
import {
  Shield,
  RefreshCw,
  Loader2,
  AlertCircle,
  KeyRound,
  Plus,
  X,
  Sparkles,
  Building,
  CheckCircle2,
  Trash2,
  Lock,
} from "lucide-react";

interface AdminRoleItem {
  id: string;
  code: string;
  name: string;
  description: string;
  department: string;
  permissions: string[];
  isSystem?: boolean;
  userCount?: number;
}

interface GenericRoleItem {
  id: string;
  name: string;
  code: string;
  description: string;
  userCount: number;
  permissions: string[];
}

interface PermissionItem {
  id: string;
  name: string;
  module: string;
  description: string;
}

export default function AdminRolesPage() {
  const [tab, setTab] = useState<"admin" | "system">("admin");
  const [adminRoles, setAdminRoles] = useState<AdminRoleItem[]>([]);
  const [systemRoles, setSystemRoles] = useState<GenericRoleItem[]>([]);
  const [permissionsList, setPermissionsList] = useState<PermissionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Create Custom Role Modal
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState("");
  const [newRoleData, setNewRoleData] = useState({
    name: "",
    description: "",
    department: "Operations",
    permissions: [] as string[],
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [adminRes, sysRes] = await Promise.all([
        fetchApi<{ roles: AdminRoleItem[]; permissionsList: PermissionItem[] }>("/admin/admin-roles"),
        fetchApi<{ roles: GenericRoleItem[] }>("/admin/roles"),
      ]);

      const rawAdminRoles = adminRes.roles || [];
      const uniqueAdminRoles = Array.from(new Map(rawAdminRoles.map((r: any) => [r.id, r])).values());
      const rawSysRoles = sysRes.roles || [];
      const uniqueSysRoles = Array.from(new Map(rawSysRoles.map((r: any) => [r.id, r])).values());

      setAdminRoles(uniqueAdminRoles);
      setPermissionsList(adminRes.permissionsList || []);
      setSystemRoles(uniqueSysRoles);
    } catch (err: any) {
      setError(err.message || "Failed to load roles and permissions");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoleData.name.trim() || newRoleData.permissions.length === 0) {
      setModalError("Please provide role name and select at least one permission.");
      return;
    }

    setSubmitting(true);
    setModalError("");

    try {
      await fetchApi("/admin/roles", {
        method: "POST",
        body: JSON.stringify({
          name: newRoleData.name.trim(),
          description: newRoleData.description.trim(),
          department: newRoleData.department.trim(),
          permissions: newRoleData.permissions,
        }),
      });

      setCreateModalOpen(false);
      setNewRoleData({
        name: "",
        description: "",
        department: "Operations",
        permissions: [],
      });
      setSuccess("Custom administrative role created successfully.");
      loadData();
    } catch (err: any) {
      setModalError(err.message || "Failed to create custom role.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteCustomRole = async (roleId: string, roleName: string) => {
    if (!window.confirm(`Are you sure you want to delete custom role "${roleName}"? Any staff with this role will be reassigned to Operations Manager.`)) {
      return;
    }

    try {
      await fetchApi(`/admin/roles/${roleId}`, { method: "DELETE" });
      setSuccess(`Role "${roleName}" deleted.`);
      loadData();
    } catch (err: any) {
      setError(err.message || "Failed to delete role.");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <PageHeader
            title="Platform Roles & RBAC Matrix"
            description="Configure granular capability grants, departmental assignments, and role definitions."
          />
        </div>
        <div className="flex items-center gap-2.5">
          <Link
            href="/admin/employees"
            className="neu-btn px-3 py-2 rounded-xl text-xs font-semibold text-[#2563EB] hover:text-blue-800 flex items-center gap-1.5 cursor-pointer"
          >
            <span>Platform Staff</span>
          </Link>
          <Link
            href="/admin/permissions"
            className="neu-btn px-3 py-2 rounded-xl text-xs font-semibold text-[#64748B] hover:text-[#1E293B] flex items-center gap-1.5 cursor-pointer"
          >
            <KeyRound size={13} />
            <span>Permissions Matrix</span>
          </Link>
          <button
            onClick={loadData}
            disabled={loading}
            className="neu-btn px-3 py-2 rounded-xl text-xs font-semibold text-[#64748B] hover:text-[#1E293B] flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw size={13} className={loading ? "animate-spin text-[#2563EB]" : ""} />
            <span>Refresh</span>
          </button>
          {tab === "admin" && (
            <button
              onClick={() => {
                setModalError("");
                setCreateModalOpen(true);
              }}
              className="neu-btn-primary px-4 py-2 rounded-xl text-xs font-bold text-white flex items-center gap-1.5 cursor-pointer"
            >
              <Plus size={14} />
              <span>Create Custom Role</span>
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-[#EEF2F6] shadow-neu-inset-sm border border-white/60 max-w-md text-xs">
        <button
          onClick={() => setTab("admin")}
          className={`flex-1 py-2 rounded-xl font-bold transition cursor-pointer flex items-center justify-center gap-2 ${
            tab === "admin"
              ? "bg-[#EEF2F6] shadow-neu-raised-sm text-[#2563EB] border border-white/80"
              : "text-[#64748B] hover:text-[#1E293B]"
          }`}
        >
          <Shield size={13} />
          <span>Administrative Staff Roles ({adminRoles.length})</span>
        </button>
        <button
          onClick={() => setTab("system")}
          className={`flex-1 py-2 rounded-xl font-bold transition cursor-pointer flex items-center justify-center gap-2 ${
            tab === "system"
              ? "bg-[#EEF2F6] shadow-neu-raised-sm text-[#2563EB] border border-white/80"
              : "text-[#64748B] hover:text-[#1E293B]"
          }`}
        >
          <span>System Actor Roles ({systemRoles.length})</span>
        </button>
      </div>

      {error && (
        <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start gap-2 shadow-neu-raised-sm">
          <AlertCircle size={16} className="shrink-0 mt-0.5 text-rose-600" />
          <span className="flex-1">{error}</span>
          <button onClick={() => setError("")} className="text-rose-500 hover:text-rose-800">
            <X size={14} />
          </button>
        </div>
      )}

      {success && (
        <div className="p-3.5 rounded-2xl bg-teal-50 border border-teal-200 text-xs text-teal-800 flex items-start gap-2 shadow-neu-raised-sm">
          <CheckCircle2 size={16} className="shrink-0 mt-0.5 text-[#14B8A6]" />
          <span className="flex-1">{success}</span>
          <button onClick={() => setSuccess("")} className="text-teal-600 hover:text-teal-900">
            <X size={14} />
          </button>
        </div>
      )}

      {/* TAB 1: Administrative Staff Roles */}
      {tab === "admin" && (
        <div className="rounded-2xl bg-[#EEF2F6] shadow-neu-flat border border-white/80 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-[#1E293B]">
              <thead className="bg-[#EEF2F6] border-b border-[#D9E2EC]/70 text-[10px] uppercase font-bold text-[#64748B] tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">Role Designation</th>
                  <th className="py-3.5 px-4">Department & Scope</th>
                  <th className="py-3.5 px-4">Mapped Capabilities</th>
                  <th className="py-3.5 px-4 text-right">Active Staff</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D9E2EC]/60">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-xs text-[#64748B]">
                      <Loader2 size={20} className="animate-spin text-[#2563EB] mx-auto mb-2" />
                      <span>Loading administrative roles...</span>
                    </td>
                  </tr>
                ) : (
                  adminRoles.map((r) => {
                    const isSuper = r.id === "super_admin" || (r.permissions || []).includes("*");
                    return (
                      <tr key={r.id} className="hover:bg-white/40 transition">
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2.5">
                            <div className="h-8 w-8 rounded-xl bg-[#EEF2F6] shadow-neu-raised-sm text-[#2563EB] flex items-center justify-center shrink-0">
                              <Shield size={15} />
                            </div>
                            <div>
                              <p className="font-bold text-[#1E293B]">{r.name}</p>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="font-mono text-[10px] text-[#64748B]">{r.code}</span>
                                {r.isSystem ? (
                                  <span className="px-1.5 py-0.2 rounded text-[9px] font-semibold bg-gray-100 text-gray-700">
                                    Built-in
                                  </span>
                                ) : (
                                  <span className="px-1.5 py-0.2 rounded text-[9px] font-semibold bg-blue-100 text-blue-700">
                                    Custom Role
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="space-y-0.5">
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#1E293B]">
                              <Building size={11} className="text-[#64748B]" />
                              <span>{r.department}</span>
                            </span>
                            <p className="text-[11px] text-[#64748B] max-w-sm leading-relaxed">{r.description}</p>
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="flex flex-wrap gap-1 max-w-md">
                            {isSuper ? (
                              <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 font-bold text-[10px]">
                                Root Administrator Authority (*)
                              </span>
                            ) : (
                              r.permissions?.map((p) => (
                                <span
                                  key={p}
                                  className="px-1.5 py-0.5 rounded bg-blue-100/70 text-blue-800 font-mono text-[10px]"
                                >
                                  {p}
                                </span>
                              ))
                            )}
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-right font-mono font-bold text-[#1E293B]">
                          {r.userCount || 0} staff
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          {r.isSystem ? (
                            <span className="text-[11px] text-[#94A3B8] italic flex items-center justify-end gap-1">
                              <Lock size={12} />
                              <span>System Protected</span>
                            </span>
                          ) : (
                            <button
                              onClick={() => handleDeleteCustomRole(r.id, r.name)}
                              className="p-1.5 rounded-lg text-rose-600 hover:text-rose-800 bg-[#EEF2F6] shadow-neu-raised-sm hover:shadow-neu-flat border border-white/80 transition cursor-pointer"
                              title="Delete Custom Role"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: System Actor Roles */}
      {tab === "system" && (
        <div className="rounded-2xl bg-[#EEF2F6] shadow-neu-flat border border-white/80 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-[#1E293B]">
              <thead className="bg-[#EEF2F6] border-b border-[#D9E2EC]/70 text-[10px] uppercase font-bold text-[#64748B] tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">Role Code</th>
                  <th className="py-3.5 px-4">Display Name & Scope</th>
                  <th className="py-3.5 px-4">Mapped Capabilities</th>
                  <th className="py-3.5 px-4 text-right">Active Accounts</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D9E2EC]/60">
                {systemRoles.map((r) => (
                  <tr key={r.id} className="hover:bg-white/40 transition">
                    <td className="py-3.5 px-4 font-mono font-bold text-[#1E293B]">
                      {r.code || r.id.toUpperCase()}
                    </td>
                    <td className="py-3.5 px-4">
                      <p className="font-bold text-[#1E293B]">{r.name}</p>
                      <p className="text-[11px] text-[#64748B] mt-0.5 max-w-sm leading-relaxed">{r.description}</p>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex flex-wrap gap-1 max-w-md">
                        {r.permissions && r.permissions.length > 0 ? (
                          r.permissions.map((p) => (
                            <span
                              key={p}
                              className="px-1.5 py-0.5 rounded bg-blue-100/70 text-blue-800 font-mono text-[10px]"
                            >
                              {p}
                            </span>
                          ))
                        ) : (
                          <span className="text-[11px] text-[#94A3B8] italic">No active permissions</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-[#1E293B]">
                      {r.userCount} users
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create Custom Role Modal */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="max-w-5xl w-full max-h-[92vh] overflow-y-auto bg-[#EEF2F6] rounded-3xl p-6 sm:p-8 shadow-neu-raised border border-white/90 my-8">
            <div className="flex items-center justify-between pb-4 border-b border-[#D9E2EC]/70">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-blue-100 text-[#2563EB] flex items-center justify-center shadow-neu-raised-sm">
                  <Shield size={18} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#1E293B]">Create Custom Admin Role</h3>
                  <p className="text-[11px] text-[#64748B]">Define unique departmental capabilities</p>
                </div>
              </div>
              <button
                onClick={() => setCreateModalOpen(false)}
                className="p-1.5 rounded-lg text-[#64748B] hover:text-[#1E293B]"
              >
                <X size={16} />
              </button>
            </div>

            {modalError && (
              <div className="mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start gap-2">
                <AlertCircle size={15} className="shrink-0 mt-0.5" />
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleCreateRole} className="mt-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[#1E293B]">Role Name *</label>
                  <input
                    type="text"
                    required
                    value={newRoleData.name}
                    onChange={(e) => setNewRoleData({ ...newRoleData, name: e.target.value })}
                    placeholder="e.g. Senior Claims Arbitrator"
                    className="w-full px-3 py-2 rounded-xl bg-[#EEF2F6] shadow-neu-inset text-xs text-[#1E293B] outline-none border border-transparent focus:border-[#2563EB]/50"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[#1E293B]">Department *</label>
                  <input
                    type="text"
                    required
                    value={newRoleData.department}
                    onChange={(e) => setNewRoleData({ ...newRoleData, department: e.target.value })}
                    placeholder="e.g. Legal & Mediation"
                    className="w-full px-3 py-2 rounded-xl bg-[#EEF2F6] shadow-neu-inset text-xs text-[#1E293B] outline-none border border-transparent focus:border-[#2563EB]/50"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#1E293B]">Description *</label>
                <textarea
                  required
                  rows={2}
                  value={newRoleData.description}
                  onChange={(e) => setNewRoleData({ ...newRoleData, description: e.target.value })}
                  placeholder="Summarize the core operational scope and governance limits..."
                  className="w-full px-3 py-2 rounded-xl bg-[#EEF2F6] shadow-neu-inset text-xs text-[#1E293B] outline-none border border-transparent focus:border-[#2563EB]/50 resize-none"
                />
              </div>

              {/* Two-Column Module Action Permission Selector */}
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between border-b border-[#D9E2EC]/70 pb-2">
                  <label className="text-xs font-semibold text-[#1E293B]">
                    Assigned Capability Grants ({newRoleData.permissions.length} selected)
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const allKeys = ADMIN_SIDEBAR_MODULES.flatMap((m) => m.actions.map((a) => a.key));
                        setNewRoleData((prev) => ({ ...prev, permissions: allKeys }));
                      }}
                      className="text-[10px] text-[#2563EB] hover:underline font-semibold cursor-pointer"
                    >
                      Select All
                    </button>
                    <span className="text-slate-300">|</span>
                    <button
                      type="button"
                      onClick={() => setNewRoleData((prev) => ({ ...prev, permissions: [] }))}
                      className="text-[10px] text-[#64748B] hover:underline cursor-pointer"
                    >
                      Clear All
                    </button>
                  </div>
                </div>

                <ModuleActionPermissionSelector
                  modules={ADMIN_SIDEBAR_MODULES}
                  mode="role"
                  selectedPermissions={newRoleData.permissions}
                  onTogglePermission={(key, nextChecked) => {
                    setNewRoleData((prev) => ({
                      ...prev,
                      permissions: nextChecked
                        ? [...prev.permissions.filter((p) => p !== key), key]
                        : prev.permissions.filter((p) => p !== key),
                    }));
                  }}
                  onSelectAllModule={(moduleId) => {
                    const mod = ADMIN_SIDEBAR_MODULES.find((m) => m.id === moduleId);
                    if (!mod) return;
                    const modKeys = mod.actions.map((a) => a.key);
                    setNewRoleData((prev) => ({
                      ...prev,
                      permissions: Array.from(new Set([...prev.permissions, ...modKeys])),
                    }));
                  }}
                  onClearModule={(moduleId) => {
                    const mod = ADMIN_SIDEBAR_MODULES.find((m) => m.id === moduleId);
                    if (!mod) return;
                    const modKeys = new Set(mod.actions.map((a) => a.key));
                    setNewRoleData((prev) => ({
                      ...prev,
                      permissions: prev.permissions.filter((k) => !modKeys.has(k)),
                    }));
                  }}
                  compact={true}
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-[#64748B] hover:text-[#1E293B]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="neu-btn-primary px-5 py-2 rounded-xl text-xs font-bold text-white flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
                >
                  {submitting ? <span>Creating...</span> : <span>Save Custom Role</span>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
