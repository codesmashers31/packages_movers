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
  permissions: string[];
  status: "Active" | "Inactive";
  isCustom?: boolean;
  isSystemRoot?: boolean;
  createdAt?: string;
}

interface PermissionItem {
  id: string;
  description: string;
}

interface PermissionDomain {
  domain: string;
  icon: string;
  permissions: PermissionItem[];
}

// Fallback permission domains in case backend response needs client fallback
const DEFAULT_PERMISSION_DOMAINS: PermissionDomain[] = [
  {
    domain: "Staff & Crew Management",
    icon: "Users",
    permissions: [
      { id: "Manage Employees & Crew", description: "Add, edit, and manage staff accounts and active status" },
      { id: "Assign Available Workers & Crew", description: "Assign drivers, supervisors, and movers to confirmed moves" },
      { id: "View Crew Attendance & Performance", description: "View completed moves, customer feedback, and job history" },
    ],
  },
  {
    domain: "Trucks & Fleet",
    icon: "Truck",
    permissions: [
      { id: "Fleet & Vehicle Operations", description: "Register trucks and manage RC, fitness, and insurance records" },
      { id: "Assign Transport Trucks to Moves", description: "Assign moving trucks and carriers to customer moves" },
      { id: "Vehicle Inspection & Maintenance Tracking", description: "Record pre-trip truck inspections and mileage checkups" },
    ],
  },
  {
    domain: "Bookings & Moving Jobs",
    icon: "Package",
    permissions: [
      { id: "View & Dispatch Bookings", description: "View confirmed moves, customer addresses, and job schedules" },
      { id: "Update Move Progression Milestones", description: "Update move status: on the way, packing, in transit, delivered" },
      { id: "Enter Recipient Delivery Verification Code", description: "Enter customer delivery OTP to complete and verify dropoff" },
    ],
  },
  {
    domain: "Quotes & Customer Leads",
    icon: "Calculator",
    permissions: [
      { id: "Review Available Customer Leads", description: "View new customer moving requests in your service areas" },
      { id: "Create & Submit Formal Quotations", description: "Create price estimates with truck type and crew count" },
      { id: "Quotation Performance & Insights", description: "See accepted and rejected quotes and conversion stats" },
    ],
  },
  {
    domain: "Services & Service Areas",
    icon: "Layers",
    permissions: [
      { id: "Service Catalog Configuration", description: "Manage moving packages (home, office, vehicle) and pricing" },
      { id: "Custom Specialized Services", description: "Add specialized add-on services (e.g. piano moving, storage)" },
      { id: "Coverage Areas Configuration", description: "Choose which cities and pin code areas your company serves" },
    ],
  },
  {
    domain: "Business Documents & Verification",
    icon: "ShieldCheck",
    permissions: [
      { id: "Document Submissions", description: "Upload GST, business licenses, and company insurance files" },
      { id: "Regulatory Status Monitoring", description: "Check admin verification and approval status of documents" },
    ],
  },
  {
    domain: "Reports & Customer Support",
    icon: "BarChart3",
    permissions: [
      { id: "Reports & Performance Analytics", description: "View revenue earnings, booking counts, and business trends" },
      { id: "Operational Audit Logs", description: "See activity logs of changes made by your team members" },
      { id: "Customer Support Coordination", description: "Reply to customer messages and help resolve move issues" },
    ],
  },
];

export default function VendorRolesPage() {
  const [roles, setRoles] = useState<RoleDef[]>([]);
  const [permissionDomains, setPermissionDomains] = useState<PermissionDomain[]>(DEFAULT_PERMISSION_DOMAINS);
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

  const fetchRoles = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetchApi<{ roles: RoleDef[]; permissionDomains?: PermissionDomain[] }>(
        `/vendor/roles?_t=${Date.now()}`,
        { cache: "no-store" }
      );
      setRoles(res.roles || []);
      if (res.permissionDomains && res.permissionDomains.length > 0) {
        setPermissionDomains(res.permissionDomains);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load vendor roles");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoles();
  }, []);

  const handleTogglePermission = (permId: string, formType: "add" | "edit") => {
    if (formType === "add") {
      setAddForm((prev) => ({
        ...prev,
        permissions: prev.permissions.includes(permId)
          ? prev.permissions.filter((p) => p !== permId)
          : [...prev.permissions, permId],
      }));
    } else {
      setEditForm((prev) => ({
        ...prev,
        permissions: prev.permissions.includes(permId)
          ? prev.permissions.filter((p) => p !== permId)
          : [...prev.permissions, permId],
      }));
    }
  };

  const handleToggleDomain = (domainPerms: PermissionItem[], formType: "add" | "edit") => {
    const domainIds = domainPerms.map((p) => p.id);
    const targetPerms = formType === "add" ? addForm.permissions : editForm.permissions;
    const allSelected = domainIds.every((id) => targetPerms.includes(id));

    if (allSelected) {
      if (formType === "add") {
        setAddForm((prev) => ({ ...prev, permissions: prev.permissions.filter((id) => !domainIds.includes(id)) }));
      } else {
        setEditForm((prev) => ({ ...prev, permissions: prev.permissions.filter((id) => !domainIds.includes(id)) }));
      }
    } else {
      const toAdd = domainIds.filter((id) => !targetPerms.includes(id));
      if (formType === "add") {
        setAddForm((prev) => ({ ...prev, permissions: [...prev.permissions, ...toAdd] }));
      } else {
        setEditForm((prev) => ({ ...prev, permissions: [...prev.permissions, ...toAdd] }));
      }
    }
  };

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
          <Link
            href="/vendor/permissions"
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold text-blue-600 hover:text-blue-700 bg-white hover:bg-slate-50 border border-slate-200/80 shadow-2xs transition cursor-pointer"
          >
            <KeyRound size={14} className="text-blue-600" />
            <span>Permissions Guide</span>
          </Link>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-xs transition cursor-pointer"
          >
            <Plus size={15} />
            <span>Add New Role</span>
          </button>

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
          {filteredRoles.map((role) => (
            <div
              key={role.id}
              className={`bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:border-slate-300 hover:shadow-sm p-6 flex flex-col justify-between space-y-5 transition relative ${
                role.isCustom ? "border-l-4 border-l-purple-500" : "border-l-4 border-l-blue-500"
              }`}
            >
              <div className="space-y-4">
                {/* Top header */}
                <div className="flex items-start justify-between border-b border-slate-100 pb-3.5 gap-2">
                  <div className="flex items-center gap-3">
                    <div
                      className={`h-11 w-11 rounded-xl flex items-center justify-center shrink-0 border ${
                        role.isCustom
                          ? "bg-purple-50 text-purple-600 border-purple-200/70"
                          : "bg-blue-50 text-blue-600 border-blue-200/60"
                      }`}
                    >
                      {role.isCustom ? <Sparkles size={20} /> : <Shield size={20} />}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h3 className="text-sm font-bold text-slate-900">{role.name}</h3>
                      </div>
                      <p className="text-[11px] text-blue-600 font-semibold mt-0.5">{role.accessLevel}</p>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                        role.status === "Active"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "bg-slate-100 text-slate-700 border-slate-200"
                      }`}
                    >
                      {role.status}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                        role.isCustom
                          ? "bg-purple-50 text-purple-700 border border-purple-200"
                          : "bg-slate-100 text-slate-600 border border-slate-200"
                      }`}
                    >
                      {role.isCustom ? "Custom Role" : "Default Role"}
                    </span>
                  </div>
                </div>

                {/* Purpose */}
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Description</p>
                  <p className="text-xs text-slate-700 leading-relaxed font-normal">{role.purpose}</p>
                </div>

                {/* Capabilities list */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Allowed Permissions ({role.permissions.length})
                    </p>
                  </div>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {role.permissions.map((perm, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-xs text-slate-800 p-1.5 rounded-lg bg-slate-50 border border-slate-100">
                        <CheckCircle2 size={13} className="text-teal-600 shrink-0 mt-0.5" />
                        <span className="font-medium text-[11px] leading-tight">{perm}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Bottom Card Footer */}
              <div className="pt-3.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                <div className="flex items-center gap-1.5">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200/60">
                    {role.isCustom ? "Custom Role" : "Default Role"}
                  </span>
                </div>

                {role.isCustom ? (
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleOpenEdit(role)}
                      className="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 text-[11px] font-semibold border border-blue-200/60 flex items-center gap-1 cursor-pointer transition"
                      title="Edit role"
                    >
                      <Edit2 size={12} />
                      <span>Edit</span>
                    </button>
                    <button
                      onClick={() => setDeletingRole(role)}
                      className="px-2 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 text-[11px] font-semibold border border-rose-200/60 flex items-center gap-1 cursor-pointer transition"
                      title="Delete role"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ) : (
                  <span className="text-[10px] font-semibold text-slate-400 flex items-center gap-1">
                    <Shield size={11} className="text-blue-500" /> Default System Role
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ========================================================================= */}
      {/* ADD NEW ROLE MODAL                                                        */}
      {/* ========================================================================= */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fadeIn">
          <div className="max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6 sm:p-7 rounded-2xl bg-white shadow-xl border border-slate-200 space-y-6 animate-scaleUp">
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
                    placeholder="e.g. Quotation Specialist, Shift Supervisor, Driver"
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

              {/* Permissions Section */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                      Permissions — What can this role do? ({addForm.permissions.length} selected)
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Check the boxes for each feature or task this role is allowed to access.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const allIds = permissionDomains.flatMap((d) => d.permissions.map((p) => p.id));
                        setAddForm({ ...addForm, permissions: allIds });
                      }}
                      className="text-[11px] font-semibold text-blue-600 hover:underline cursor-pointer"
                    >
                      Select All
                    </button>
                    <span className="text-slate-300">|</span>
                    <button
                      type="button"
                      onClick={() => setAddForm({ ...addForm, permissions: [] })}
                      className="text-[11px] font-semibold text-slate-500 hover:underline cursor-pointer"
                    >
                      Clear All
                    </button>
                  </div>
                </div>

                <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                  {permissionDomains.map((domain, dIdx) => {
                    const domainIds = domain.permissions.map((p) => p.id);
                    const allSelected = domainIds.every((id) => addForm.permissions.includes(id));

                    return (
                      <div key={dIdx} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full bg-blue-600 inline-block" />
                            {domain.domain}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleToggleDomain(domain.permissions, "add")}
                            className="text-[10px] font-semibold text-blue-600 hover:underline cursor-pointer"
                          >
                            {allSelected ? "Uncheck All" : "Check All"}
                          </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {domain.permissions.map((perm) => {
                            const isChecked = addForm.permissions.includes(perm.id);
                            return (
                              <label
                                key={perm.id}
                                className={`p-2.5 rounded-xl border flex items-start gap-2.5 cursor-pointer transition select-none ${
                                  isChecked
                                    ? "bg-blue-50/80 border-blue-300"
                                    : "bg-white border-slate-200 hover:bg-slate-100/50"
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => handleTogglePermission(perm.id, "add")}
                                  className="mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                />
                                <div>
                                  <p className="text-xs font-bold text-slate-900 leading-tight">{perm.id}</p>
                                  <p className="text-[10px] text-slate-500 mt-0.5">{perm.description}</p>
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
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
          <div className="max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6 sm:p-7 rounded-2xl bg-white shadow-xl border border-slate-200 space-y-6 animate-scaleUp">
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

              {/* Permissions */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Permissions — What can this role do? ({editForm.permissions.length} selected)
                  </h4>
                </div>

                <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                  {permissionDomains.map((domain, dIdx) => {
                    const domainIds = domain.permissions.map((p) => p.id);
                    const allSelected = domainIds.every((id) => editForm.permissions.includes(id));

                    return (
                      <div key={dIdx} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full bg-purple-600 inline-block" />
                            {domain.domain}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleToggleDomain(domain.permissions, "edit")}
                            className="text-[10px] font-semibold text-blue-600 hover:underline cursor-pointer"
                          >
                            {allSelected ? "Uncheck All" : "Check All"}
                          </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {domain.permissions.map((perm) => {
                            const isChecked = editForm.permissions.includes(perm.id);
                            return (
                              <label
                                key={perm.id}
                                className={`p-2.5 rounded-xl border flex items-start gap-2.5 cursor-pointer transition select-none ${
                                  isChecked
                                    ? "bg-purple-50/80 border-purple-300"
                                    : "bg-white border-slate-200 hover:bg-slate-100/50"
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => handleTogglePermission(perm.id, "edit")}
                                  className="mt-0.5 rounded border-slate-300 text-purple-600 focus:ring-purple-500 cursor-pointer"
                                />
                                <div>
                                  <p className="text-xs font-bold text-slate-900 leading-tight">{perm.id}</p>
                                  <p className="text-[10px] text-slate-500 mt-0.5">{perm.description}</p>
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
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
