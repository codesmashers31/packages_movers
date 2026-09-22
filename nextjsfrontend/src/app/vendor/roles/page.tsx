"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { fetchApi } from "@/lib/api";
import PageHeader from "@/app/admin/components/PageHeader";
import {
  Shield,
  Users,
  CheckCircle2,
  RefreshCw,
  AlertCircle,
  Sparkles,
  Plus,
  KeyRound,
  Edit2,
  Trash2,
  Check,
  X,
  Search,
  Sliders,
  HelpCircle,
  Truck,
  Package,
  Calculator,
  Layers,
  ShieldCheck,
  BarChart3,
  ChevronRight,
  Info,
} from "lucide-react";

interface RoleDef {
  id: string;
  name: string;
  purpose: string;
  accessLevel: string;
  responsibleFor?: string[];
  canAccess?: string[];
  canPerform?: string[];
  cannotAccess?: string[];
  permissions: string[];
  status: "Active" | "Inactive";
  isCustom?: boolean;
  isSystemRoot?: boolean;
  assignedStaffCount?: number;
  createdAt?: string;
}

const getRoleResponsibilities = (role: RoleDef): string[] => {
  if (role.responsibleFor && role.responsibleFor.length > 0) return role.responsibleFor;
  return role.permissions.slice(0, 4);
};

const getRoleCanAccess = (role: RoleDef): string[] => {
  if (role.canAccess && role.canAccess.length > 0) return role.canAccess;
  return ["Assigned moves & dispatches", "Assigned team members", "Fleet vehicles"];
};

const getRoleCanPerform = (role: RoleDef): string[] => {
  if (role.canPerform && role.canPerform.length > 0) return role.canPerform;
  return ["Update assigned job status", "Contact assigned crew", "Record operational logs"];
};

const getRoleCannotAccess = (role: RoleDef): string[] => {
  if (role.cannotAccess && role.cannotAccess.length > 0) return role.cannotAccess;
  return ["Company financial accounts", "Vendor KYC and regulatory documents"];
};

import { VENDOR_SIDEBAR_MODULES } from "@/lib/vendorPermissionsDef";
import ModuleActionPermissionSelector from "@/components/permissions/ModuleActionPermissionSelector";

export default function VendorRolesPage() {
  const [roles, setRoles] = useState<RoleDef[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<"ALL" | "CUSTOM" | "STANDARD" | "ACTIVE">("ALL");

  // Add Role Modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [addForm, setAddForm] = useState({
    name: "",
    roleKey: "",
    purpose: "",
    accessLevel: "Operations & Moving Jobs",
    permissions: [] as string[],
    status: "Active" as "Active" | "Inactive",
  });

  // Edit Role Modal state
  const [editingRole, setEditingRole] = useState<RoleDef | null>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    purpose: "",
    accessLevel: "",
    permissions: [] as string[],
    status: "Active" as "Active" | "Inactive",
  });

  // Delete Role state
  const [deletingRole, setDeletingRole] = useState<RoleDef | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const userStr = localStorage.getItem("auth_user");
      if (userStr) {
        try {
          setCurrentUser(JSON.parse(userStr));
        } catch {}
      }
    }
    fetchApi<{ user: any }>("/auth/me")
      .then((res) => {
        if (res?.user) setCurrentUser(res.user);
      })
      .catch(() => {});
  }, []);

  const canManageRoles = useMemo(() => {
    if (!currentUser) return false;
    if (currentUser.role === "vendor" || currentUser.role === "admin") return true;
    const perms = Array.isArray(currentUser.permissions) ? currentUser.permissions : [];
    return perms.includes("*") || perms.includes("roles:manage") || perms.includes("Manage Company Roles");
  }, [currentUser]);

  const fetchRoles = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetchApi<{ roles: RoleDef[] }>(
        `/vendor/roles?_t=${Date.now()}`,
        { cache: "no-store" }
      );
      const rawRoles = res.roles || [];
      const uniqueRoles = Array.from(new Map(rawRoles.map((r: any) => [r.id, r])).values());
      setRoles(uniqueRoles);
    } catch (err: any) {
      setError(err.message || "Failed to load vendor roles");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoles();
  }, []);

  // Submit Add Role
  const handleCreateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addForm.name.trim() || !addForm.purpose.trim()) {
      setNotification({ type: "error", message: "Role Name and Operational Purpose are required." });
      return;
    }
    if (addForm.permissions.length === 0) {
      setNotification({ type: "error", message: "Please assign at least one capability permission." });
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await fetchApi<{ role: RoleDef; message: string }>("/vendor/roles", {
        method: "POST",
        body: JSON.stringify(addForm),
      });

      setNotification({ type: "success", message: res.message || `Role "${addForm.name}" created successfully!` });
      setIsAddModalOpen(false);
      setAddForm({
        name: "",
        roleKey: "",
        purpose: "",
        accessLevel: "Operations & Moving Jobs",
        permissions: [],
        status: "Active",
      });
      fetchRoles();
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("vendor-roles-updated"));
      }
    } catch (err: any) {
      setNotification({ type: "error", message: err.message || "Failed to create role." });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open Edit Modal
  const handleOpenEdit = (role: RoleDef) => {
    setEditingRole(role);
    setEditForm({
      name: role.name,
      purpose: role.purpose,
      accessLevel: role.accessLevel,
      permissions: [...role.permissions],
      status: role.status,
    });
  };

  // Submit Edit Role
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRole) return;
    if (!editForm.name.trim() || !editForm.purpose.trim()) {
      setNotification({ type: "error", message: "Role Name and Operational Purpose are required." });
      return;
    }
    if (editForm.permissions.length === 0) {
      setNotification({ type: "error", message: "Please assign at least one capability permission." });
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await fetchApi<{ role: RoleDef; message: string }>(`/vendor/roles/${editingRole.id}`, {
        method: "PUT",
        body: JSON.stringify(editForm),
      });

      setNotification({ type: "success", message: res.message || `Role "${editForm.name}" updated successfully!` });
      setEditingRole(null);
      fetchRoles();
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("vendor-roles-updated"));
      }
    } catch (err: any) {
      setNotification({ type: "error", message: err.message || "Failed to update role." });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit Delete Role
  const handleDeleteRole = async () => {
    if (!deletingRole) return;
    try {
      setIsSubmitting(true);
      const res = await fetchApi<{ message: string }>(`/vendor/roles/${deletingRole.id}`, {
        method: "DELETE",
      });

      setNotification({ type: "success", message: res.message || `Role "${deletingRole.name}" removed.` });
      setDeletingRole(null);
      fetchRoles();
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("vendor-roles-updated"));
      }
    } catch (err: any) {
      setNotification({ type: "error", message: err.message || "Failed to delete role." });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filtered roles list
  const filteredRoles = useMemo(() => {
    return roles.filter((r) => {
      const matchesSearch =
        r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.purpose.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.accessLevel.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      if (filterType === "CUSTOM") return r.isCustom === true;
      if (filterType === "STANDARD") return r.isCustom !== true;
      if (filterType === "ACTIVE") return r.status === "Active";
      return true;
    });
  }, [roles, searchQuery, filterType]);

  const customCount = roles.filter((r) => r.isCustom).length;
  const standardCount = roles.filter((r) => !r.isCustom).length;

  return (
    <div className="space-y-6 font-sans text-slate-900">
      {/* Header */}
      <PageHeader
        title="Staff Roles & Permissions"
        description="Create roles for your team and choose exactly what each staff member can view and do."
      >
        <div className="flex flex-wrap items-center gap-2.5">
          {canManageRoles && (
            <Link
              href="/vendor/permissions"
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold text-blue-600 hover:text-blue-700 bg-white hover:bg-slate-50 border border-slate-200/80 shadow-2xs transition cursor-pointer"
            >
              <KeyRound size={14} className="text-blue-600" />
              <span>Permissions Guide</span>
            </Link>
          )}

          {canManageRoles && (
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-xs transition cursor-pointer"
            >
              <Plus size={15} />
              <span>Add New Role</span>
            </button>
          )}

          <button
            onClick={fetchRoles}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200/80 shadow-2xs transition cursor-pointer disabled:opacity-50"
            title="Refresh roles"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            <span>Refresh</span>
          </button>
        </div>
      </PageHeader>

      {/* Notifications */}
      {notification && (
        <div
          className={`p-4 rounded-2xl flex items-center justify-between gap-3 text-xs shadow-2xs ${
            notification.type === "success"
              ? "bg-emerald-50 border border-emerald-200 text-emerald-800"
              : "bg-rose-50 border border-rose-200 text-rose-700"
          }`}
        >
          <div className="flex items-center gap-2.5">
            {notification.type === "success" ? (
              <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle size={16} className="text-rose-600 shrink-0" />
            )}
            <span className="font-semibold">{notification.message}</span>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="text-slate-400 hover:text-slate-700 text-xs font-bold p-1 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Vendor Admin Role Overview Banner */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
            <ShieldCheck size={20} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              How Staff Roles Work
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-50 text-blue-700 border border-blue-200/80">
                Admin Control
              </span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Default roles (<code className="font-semibold text-slate-800">Manager</code>,{" "}
              <code className="font-semibold text-slate-800">Operations Staff</code>,{" "}
              <code className="font-semibold text-slate-800">Crew Worker</code>) come ready to use out of the box.
              As the vendor admin, you can also create custom roles with specific permissions tailored to your team&apos;s workflow.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-slate-100 text-xs">
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/70">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Roles</span>
            <p className="text-xl font-black text-slate-900 mt-0.5">{roles.length}</p>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/70">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Default Roles</span>
            <p className="text-xl font-black text-blue-600 mt-0.5">{standardCount}</p>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/70">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Your Custom Roles</span>
            <p className="text-xl font-black text-purple-600 mt-0.5">{customCount}</p>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/70">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Access Scope</span>
            <p className="text-xs font-bold text-emerald-700 mt-1.5">Your Entire Company</p>
          </div>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search roles by name or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200/80 text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          {(
            [
              { key: "ALL", label: "All Roles" },
              { key: "CUSTOM", label: `Custom Roles (${customCount})` },
              { key: "STANDARD", label: `Default Roles (${standardCount})` },
              { key: "ACTIVE", label: "Active Only" },
            ] as const
          ).map((t) => (
            <button
              key={t.key}
              onClick={() => setFilterType(t.key)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                filterType === t.key
                  ? "bg-blue-600 text-white shadow-xs"
                  : "bg-slate-50 text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200/60"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Roles Cards Grid */}
      {loading ? (
        <div className="p-16 text-center text-xs text-slate-500 space-y-2">
          <RefreshCw size={24} className="animate-spin text-blue-600 mx-auto" />
          <p>Loading company roles and permission scopes...</p>
        </div>
      ) : filteredRoles.length === 0 ? (
        <div className="p-16 text-center rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-3">
          <Shield size={36} className="text-slate-300 mx-auto" />
          <h4 className="text-sm font-bold text-slate-900">No roles matched your search criteria</h4>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Try adjusting your search filter or click &ldquo;Add New Role&rdquo; to establish a new operational role.
          </p>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Plus size={14} /> Add New Role
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredRoles.map((role) => {
            const responsibilities = getRoleResponsibilities(role);
            const canAccess = getRoleCanAccess(role);
            const canPerform = getRoleCanPerform(role);
            const cannotAccess = getRoleCannotAccess(role);
            const staffCount = role.assignedStaffCount ?? 0;

            return (
              <div
                key={role.id}
                className={`bg-white rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-sm p-6 flex flex-col justify-between space-y-5 transition relative ${
                  role.isCustom ? "border-t-4 border-t-purple-500" : "border-t-4 border-t-blue-600"
                }`}
              >
                <div className="space-y-4">
                  {/* Container Header */}
                  <div className="flex items-start justify-between border-b border-slate-100 pb-3.5 gap-2">
                    <div className="flex items-center gap-3">
                      <div
                        className={`h-11 w-11 rounded-2xl flex items-center justify-center shrink-0 border ${
                          role.isCustom
                            ? "bg-purple-50 text-purple-600 border-purple-200/70"
                            : "bg-blue-50 text-blue-600 border-blue-200/60"
                        }`}
                      >
                        {role.isCustom ? <Sparkles size={20} /> : <Shield size={20} />}
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-900">{role.name}</h3>
                        <p className="text-[11px] text-blue-600 font-semibold mt-0.5">{role.accessLevel}</p>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          role.status === "Active"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-slate-100 text-slate-700 border-slate-200"
                        }`}
                      >
                        {role.status}
                      </span>
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                        {role.isCustom ? "Custom" : "Standard"}
                      </span>
                    </div>
                  </div>

                  {/* Purpose Statement */}
                  <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/60">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                      Operational Purpose
                    </span>
                    <p className="text-xs text-slate-700 leading-relaxed">{role.purpose}</p>
                  </div>

                  {/* Assigned Scope Metrics */}
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-blue-50/50 border border-blue-100 text-xs">
                    <div className="flex items-center gap-2">
                      <Users size={15} className="text-blue-600" />
                      <span className="font-semibold text-slate-700">Assigned Staff:</span>
                    </div>
                    <span className="font-bold font-mono px-2 py-0.5 rounded bg-blue-100/80 text-blue-800 text-[11px]">
                      {staffCount} {staffCount === 1 ? "Employee" : "Employees"}
                    </span>
                  </div>

                  {/* Responsible For Bullets */}
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      Core Responsibilities
                    </span>
                    <div className="space-y-1">
                      {responsibilities.slice(0, 3).map((item, idx) => (
                        <div key={idx} className="flex items-start gap-2 text-xs text-slate-700">
                          <CheckCircle2 size={13} className="text-emerald-600 shrink-0 mt-0.5" />
                          <span className="leading-tight">{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Access & Actions Breakdown */}
                  <div className="grid grid-cols-1 gap-2 pt-1">
                    <div className="p-2.5 rounded-xl bg-emerald-50/40 border border-emerald-100/80 space-y-1 text-xs">
                      <span className="text-[10px] font-bold text-emerald-800 uppercase block">Can Access & Perform</span>
                      <p className="text-[11px] text-emerald-900 leading-tight">
                        {canPerform.slice(0, 2).join(" • ")}
                      </p>
                    </div>

                    <div className="p-2.5 rounded-xl bg-rose-50/40 border border-rose-100/80 space-y-1 text-xs">
                      <span className="text-[10px] font-bold text-rose-800 uppercase block">Restricted Boundaries</span>
                      <p className="text-[11px] text-rose-900 leading-tight">
                        {cannotAccess.slice(0, 2).join(" • ")}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Bottom Footer Actions */}
                <div className="pt-3.5 border-t border-slate-100 flex items-center justify-between text-xs">
                  <Link
                    href={`/vendor/employees?role=${role.id}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-2xs transition"
                  >
                    <Users size={13} />
                    <span>Assigned Staff ({staffCount}) →</span>
                  </Link>

                  {role.isCustom && canManageRoles ? (
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleOpenEdit(role)}
                        className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 border border-blue-200/60 transition cursor-pointer"
                        title="Edit role"
                      >
                        <Edit2 size={13} />
                      </button>
                      <button
                        onClick={() => setDeletingRole(role)}
                        className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 border border-rose-200/60 transition cursor-pointer"
                        title="Delete role"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ) : (
                    <span className="text-[10px] font-semibold text-slate-400 flex items-center gap-1">
                      <Shield size={11} className="text-blue-500" /> {role.isCustom ? "Custom Role" : "Standard"}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================================= */}
      {/* ADD NEW ROLE MODAL                                                        */}
      {/* ========================================================================= */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fadeIn">
          <div className="max-w-5xl w-full max-h-[92vh] overflow-y-auto p-6 sm:p-7 rounded-2xl bg-white shadow-xl border border-slate-200 space-y-6 animate-scaleUp">
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-4 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-blue-50 text-blue-700 border border-blue-200 uppercase tracking-wider">
                    New Staff Role
                  </span>
                </div>
                <h3 className="text-lg font-bold text-slate-900 mt-1">Create Staff Role</h3>
                <p className="text-xs text-slate-500">
                  Enter a role name, pick a category, and choose what this staff member can do.
                </p>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleCreateRole} className="space-y-5">
              {/* Row 1: Role Name and Category */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Role Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Quotation Coordinator, Inventory Clerk"
                    value={addForm.name}
                    onChange={(e) => {
                      const nameVal = e.target.value;
                      setAddForm({
                        ...addForm,
                        name: nameVal,
                        roleKey: nameVal.toLowerCase().replace(/[^a-z0-9_]/g, "_"),
                      });
                    }}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 font-semibold transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Role Category <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={addForm.accessLevel}
                    onChange={(e) => setAddForm({ ...addForm, accessLevel: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 font-semibold focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition cursor-pointer"
                  >
                    <option value="Management (Full Access)">Management (Full Access)</option>
                    <option value="Supervisor & Dispatch">Supervisor & Dispatch</option>
                    <option value="Operations & Moving Jobs">Operations & Moving Jobs</option>
                    <option value="Billing & Quotations">Billing & Quotations</option>
                    <option value="Quality & Inspection">Quality & Inspection</option>
                    <option value="Field Crew & Drivers">Field Crew & Drivers</option>
                    <option value="Custom Role">Custom Role</option>
                  </select>
                </div>
              </div>

              {/* Row 2: Status */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">Status</label>
                <div className="flex items-center gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => setAddForm({ ...addForm, status: "Active" })}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                      addForm.status === "Active"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200 shadow-xs"
                        : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    Active
                  </button>
                  <button
                    type="button"
                    onClick={() => setAddForm({ ...addForm, status: "Inactive" })}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                      addForm.status === "Inactive"
                        ? "bg-slate-200 text-slate-800 border-slate-300 shadow-xs"
                        : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    Inactive
                  </button>
                </div>
              </div>

              {/* Purpose */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Role Description / Duties <span className="text-rose-500">*</span>
                </label>
                <p className="text-[11px] text-slate-500 mb-1.5">
                  Briefly explain what this person will do (e.g. prepares quotes, coordinates moves, or inspects items).
                </p>
                <textarea
                  required
                  rows={2}
                  placeholder="e.g. Responsible for reviewing inventory, preparing price quotes, and assisting customer calls..."
                  value={addForm.purpose}
                  onChange={(e) => setAddForm({ ...addForm, purpose: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 font-medium transition"
                />
              </div>

              {/* Permissions Section: Two-Column Module Action Selector */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                      Role Permissions Matrix ({addForm.permissions.length} selected)
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Select modules and toggle actions permitted for staff assigned to this role.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const allKeys = VENDOR_SIDEBAR_MODULES.flatMap((m) => m.actions.map((a) => a.key));
                        setAddForm((prev) => ({ ...prev, permissions: allKeys }));
                      }}
                      className="text-[11px] font-semibold text-blue-600 hover:underline cursor-pointer"
                    >
                      Select All
                    </button>
                    <span className="text-slate-300">|</span>
                    <button
                      type="button"
                      onClick={() => setAddForm((prev) => ({ ...prev, permissions: [] }))}
                      className="text-[11px] font-semibold text-slate-500 hover:underline cursor-pointer"
                    >
                      Clear All
                    </button>
                  </div>
                </div>

                <ModuleActionPermissionSelector
                  modules={VENDOR_SIDEBAR_MODULES}
                  mode="role"
                  selectedPermissions={addForm.permissions}
                  onTogglePermission={(key, nextChecked) => {
                    setAddForm((prev) => ({
                      ...prev,
                      permissions: nextChecked
                        ? [...prev.permissions.filter((p) => p !== key), key]
                        : prev.permissions.filter((p) => p !== key),
                    }));
                  }}
                  onSelectAllModule={(moduleId) => {
                    const mod = VENDOR_SIDEBAR_MODULES.find((m) => m.id === moduleId);
                    if (!mod) return;
                    const modKeys = mod.actions.map((a) => a.key);
                    setAddForm((prev) => ({
                      ...prev,
                      permissions: Array.from(new Set([...prev.permissions, ...modKeys])),
                    }));
                  }}
                  onClearModule={(moduleId) => {
                    const mod = VENDOR_SIDEBAR_MODULES.find((m) => m.id === moduleId);
                    if (!mod) return;
                    const modKeys = new Set(mod.actions.map((a) => a.key));
                    setAddForm((prev) => ({
                      ...prev,
                      permissions: prev.permissions.filter((k) => !modKeys.has(k)),
                    }));
                  }}
                  compact={true}
                />
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" />
                      <span>Saving Role...</span>
                    </>
                  ) : (
                    <>
                      <Check size={14} />
                      <span>Save Role</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* EDIT ROLE MODAL                                                           */}
      {/* ========================================================================= */}
      {editingRole && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fadeIn">
          <div className="max-w-5xl w-full max-h-[92vh] overflow-y-auto p-6 sm:p-7 rounded-2xl bg-white shadow-xl border border-slate-200 space-y-6 animate-scaleUp">
            <div className="flex items-start justify-between pb-4 border-b border-slate-100">
              <div>
                <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-purple-50 text-purple-700 border border-purple-200 uppercase tracking-wider">
                  Edit Role
                </span>
                <h3 className="text-lg font-bold text-slate-900 mt-1">Edit Role: {editingRole.name}</h3>
                <p className="text-xs text-slate-500">Update role name, category, description, and permissions.</p>
              </div>
              <button
                onClick={() => setEditingRole(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">Role Name</label>
                  <input
                    type="text"
                    required
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 font-semibold transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">Role Category</label>
                  <select
                    value={editForm.accessLevel}
                    onChange={(e) => setEditForm({ ...editForm, accessLevel: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 font-semibold focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition cursor-pointer"
                  >
                    <option value="Management (Full Access)">Management (Full Access)</option>
                    <option value="Supervisor & Dispatch">Supervisor & Dispatch</option>
                    <option value="Operations & Moving Jobs">Operations & Moving Jobs</option>
                    <option value="Billing & Quotations">Billing & Quotations</option>
                    <option value="Quality & Inspection">Quality & Inspection</option>
                    <option value="Field Crew & Drivers">Field Crew & Drivers</option>
                    <option value="Custom Role">Custom Role</option>
                    {!["Management (Full Access)", "Supervisor & Dispatch", "Operations & Moving Jobs", "Billing & Quotations", "Quality & Inspection", "Field Crew & Drivers", "Custom Role"].includes(editForm.accessLevel) && (
                      <option value={editForm.accessLevel}>{editForm.accessLevel}</option>
                    )}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">Status</label>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setEditForm({ ...editForm, status: "Active" })}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                      editForm.status === "Active"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200 shadow-xs"
                        : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    Active
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditForm({ ...editForm, status: "Inactive" })}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                      editForm.status === "Inactive"
                        ? "bg-slate-200 text-slate-800 border-slate-300 shadow-xs"
                        : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    Inactive
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">Role Description / Duties</label>
                <textarea
                  required
                  rows={2}
                  value={editForm.purpose}
                  onChange={(e) => setEditForm({ ...editForm, purpose: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 font-medium transition"
                />
              </div>

              {/* Permissions Section: Two-Column Module Action Selector */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Role Permissions Matrix ({editForm.permissions.length} selected)
                  </h4>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const allKeys = VENDOR_SIDEBAR_MODULES.flatMap((m) => m.actions.map((a) => a.key));
                        setEditForm((prev) => ({ ...prev, permissions: allKeys }));
                      }}
                      className="text-[11px] font-semibold text-purple-600 hover:underline cursor-pointer"
                    >
                      Select All
                    </button>
                    <span className="text-slate-300">|</span>
                    <button
                      type="button"
                      onClick={() => setEditForm((prev) => ({ ...prev, permissions: [] }))}
                      className="text-[11px] font-semibold text-slate-500 hover:underline cursor-pointer"
                    >
                      Clear All
                    </button>
                  </div>
                </div>

                <ModuleActionPermissionSelector
                  modules={VENDOR_SIDEBAR_MODULES}
                  mode="role"
                  selectedPermissions={editForm.permissions}
                  onTogglePermission={(key, nextChecked) => {
                    setEditForm((prev) => ({
                      ...prev,
                      permissions: nextChecked
                        ? [...prev.permissions.filter((p) => p !== key), key]
                        : prev.permissions.filter((p) => p !== key),
                    }));
                  }}
                  onSelectAllModule={(moduleId) => {
                    const mod = VENDOR_SIDEBAR_MODULES.find((m) => m.id === moduleId);
                    if (!mod) return;
                    const modKeys = mod.actions.map((a) => a.key);
                    setEditForm((prev) => ({
                      ...prev,
                      permissions: Array.from(new Set([...prev.permissions, ...modKeys])),
                    }));
                  }}
                  onClearModule={(moduleId) => {
                    const mod = VENDOR_SIDEBAR_MODULES.find((m) => m.id === moduleId);
                    if (!mod) return;
                    const modKeys = new Set(mod.actions.map((a) => a.key));
                    setEditForm((prev) => ({
                      ...prev,
                      permissions: prev.permissions.filter((k) => !modKeys.has(k)),
                    }));
                  }}
                  compact={true}
                />
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingRole(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold shadow-xs transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Check size={14} />
                      <span>Save Changes</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* DELETE CONFIRMATION MODAL                                                 */}
      {/* ========================================================================= */}
      {deletingRole && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fadeIn">
          <div className="max-w-md w-full p-6 rounded-2xl bg-white shadow-xl border border-slate-200 space-y-4 animate-scaleUp">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="h-10 w-10 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center">
                <AlertCircle size={20} />
              </div>
              <h3 className="text-sm font-bold text-slate-900">Delete Role</h3>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to delete the role <strong className="text-slate-900">{deletingRole.name}</strong>?
            </p>

            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-800 font-medium leading-relaxed">
              ⚠️ Note: Any staff members assigned to this role will lose these permissions until you reassign them to a new role.
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeletingRole(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteRole}
                disabled={isSubmitting}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? <RefreshCw size={13} className="animate-spin" /> : <Trash2 size={13} />}
                <span>Delete Role</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
