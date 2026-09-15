"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { fetchApi } from "@/lib/api";
import PageHeader from "@/app/admin/components/PageHeader";
import StatusBadge from "@/app/admin/components/StatusBadge";
import {
  UserCog,
  Plus,
  Search,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Phone,
  Mail,
  Shield,
  KeyRound,
  Copy,
  Check,
  MessageCircle,
  X,
  Edit2,
  Trash2,
  Building,
  ArrowRight,
  Sparkles,
  Lock,
  Layers,
  ShieldCheck,
} from "lucide-react";

interface AdminEmployee {
  _id: string;
  displayName: string;
  phone: string;
  username?: string;
  email?: string;
  role: string;
  adminRole?: string;
  roleName?: string;
  adminDepartment?: string;
  department?: string;
  permissions?: string[];
  resolvedPermissions?: string[];
  accountStatus: "active" | "suspended" | "deleted";
  mustChangePassword?: boolean;
  plainTempPassword?: string;
  createdAt: string;
}

interface AdminRole {
  id: string;
  code: string;
  name: string;
  description: string;
  department: string;
  permissions: string[];
  isSystem?: boolean;
  userCount?: number;
}

interface PermissionItem {
  id: string;
  name: string;
  module: string;
  description: string;
}

interface CreatedCredentialsModal {
  employeeName: string;
  phone: string;
  username: string;
  email: string;
  defaultPassword: string;
  whatsappUrl?: string | null;
}

export default function AdminEmployeesPage() {
  const [employees, setEmployees] = useState<AdminEmployee[]>([]);
  const [availableRoles, setAvailableRoles] = useState<AdminRole[]>([]);
  const [permissionsList, setPermissionsList] = useState<PermissionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Credentials dialog
  const [createdCredentials, setCreatedCredentials] = useState<CreatedCredentialsModal | null>(null);
  const [copied, setCopied] = useState(false);

  // Filters
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [departmentFilter, setDepartmentFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Modals
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<AdminEmployee | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Form State for Add
  const [formData, setFormData] = useState({
    displayName: "",
    phone: "",
    email: "",
    adminRole: "operations_manager",
    adminDepartment: "Operations",
    permissions: [] as string[],
  });

  // Edit Form State
  const [editFormData, setEditFormData] = useState({
    displayName: "",
    adminRole: "operations_manager",
    adminDepartment: "Operations",
    permissions: [] as string[],
    accountStatus: "active" as "active" | "suspended",
  });

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [empRes, rolesRes] = await Promise.all([
        fetchApi<{ employees: AdminEmployee[] }>("/admin/employees"),
        fetchApi<{ roles: AdminRole[]; permissionsList: PermissionItem[] }>("/admin/admin-roles"),
      ]);

      setEmployees(empRes.employees || []);
      setAvailableRoles(rolesRes.roles || []);
      setPermissionsList(rolesRes.permissionsList || []);
    } catch (err: any) {
      console.error("Failed to load platform staff:", err);
      setError(err.message || "Failed to load platform staff. Verify backend is running.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handle Role selection change in Add Modal -> prefill default permissions & department
  const handleRoleSelectChange = (roleId: string) => {
    const selected = availableRoles.find((r) => r.id === roleId);
    if (selected) {
      setFormData((prev) => ({
        ...prev,
        adminRole: roleId,
        adminDepartment: selected.department || prev.adminDepartment,
        permissions: selected.permissions || [],
      }));
    } else {
      setFormData((prev) => ({ ...prev, adminRole: roleId }));
    }
  };

  // Handle Create Admin Staff
  const handleCreateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setModalError(null);

    try {
      const res = await fetchApi<{
        employee: AdminEmployee;
        credentials: {
          username: string;
          email: string;
          defaultPassword: string;
          whatsappUrl: string | null;
          whatsappDispatched: boolean;
        };
      }>("/admin/employees", {
        method: "POST",
        body: JSON.stringify({
          displayName: formData.displayName.trim(),
          phone: formData.phone.trim(),
          email: formData.email.trim() || undefined,
          adminRole: formData.adminRole,
          adminDepartment: formData.adminDepartment.trim(),
          permissions: formData.permissions,
        }),
      });

      setAddModalOpen(false);
      setFormData({
        displayName: "",
        phone: "",
        email: "",
        adminRole: "operations_manager",
        adminDepartment: "Operations",
        permissions: [],
      });

      // Show Credentials Dialog
      if (res.credentials) {
        setCreatedCredentials({
          employeeName: res.employee.displayName,
          phone: res.employee.phone,
          username: res.credentials.username,
          email: res.credentials.email,
          defaultPassword: res.credentials.defaultPassword,
          whatsappUrl: res.credentials.whatsappUrl,
        });
      }

      setSuccess(`Platform staff member ${res.employee.displayName} onboarded successfully.`);
      fetchData();
    } catch (err: any) {
      setModalError(err.message || "Failed to onboard administrative employee.");
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Edit Admin Staff
  const handleUpdateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEmployee) return;

    setSubmitting(true);
    setModalError(null);

    try {
      await fetchApi(`/admin/employees/${editingEmployee._id}`, {
        method: "PATCH",
        body: JSON.stringify({
          displayName: editFormData.displayName.trim(),
          adminRole: editFormData.adminRole,
          adminDepartment: editFormData.adminDepartment.trim(),
          permissions: editFormData.permissions,
          accountStatus: editFormData.accountStatus,
        }),
      });

      setEditingEmployee(null);
      setSuccess(`Updated administrative profile for ${editFormData.displayName}.`);
      fetchData();
    } catch (err: any) {
      setModalError(err.message || "Failed to update staff member.");
    } finally {
      setSubmitting(false);
    }
  };

  // Resend Credentials
  const handleResendCredentials = async (emp: AdminEmployee) => {
    try {
      const res = await fetchApi<{
        success: boolean;
        message: string;
        credentials: {
          username: string;
          email: string;
          defaultPassword: string;
          whatsappUrl: string;
        };
      }>(`/admin/employees/${emp._id}/resend-credentials`, {
        method: "POST",
      });

      setCreatedCredentials({
        employeeName: emp.displayName,
        phone: emp.phone,
        username: res.credentials.username,
        email: res.credentials.email,
        defaultPassword: res.credentials.defaultPassword,
        whatsappUrl: res.credentials.whatsappUrl,
      });

      setSuccess(`Credentials regenerated for ${emp.displayName}.`);
    } catch (err: any) {
      setError(err.message || "Failed to resend credentials.");
    }
  };

  // Remove Admin Staff
  const handleDeleteEmployee = async (emp: AdminEmployee) => {
    if (!window.confirm(`Are you sure you want to remove ${emp.displayName} from the administrative staff?`)) {
      return;
    }

    try {
      await fetchApi(`/admin/employees/${emp._id}`, { method: "DELETE" });
      setSuccess(`Removed ${emp.displayName} from platform staff.`);
      fetchData();
    } catch (err: any) {
      setError(err.message || "Failed to remove staff member.");
    }
  };

  // Toggle Suspend / Active
  const handleToggleStatus = async (emp: AdminEmployee) => {
    const newStatus = emp.accountStatus === "active" ? "suspended" : "active";
    try {
      await fetchApi(`/admin/employees/${emp._id}`, {
        method: "PATCH",
        body: JSON.stringify({ accountStatus: newStatus }),
      });
      setSuccess(`Account status updated to ${newStatus} for ${emp.displayName}.`);
      fetchData();
    } catch (err: any) {
      setError(err.message || "Failed to change account status.");
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Filter Employees
  const filteredEmployees = employees.filter((emp) => {
    const q = search.toLowerCase().trim();
    const matchesSearch =
      !q ||
      emp.displayName.toLowerCase().includes(q) ||
      (emp.username && emp.username.toLowerCase().includes(q)) ||
      emp.phone.includes(q) ||
      (emp.email && emp.email.toLowerCase().includes(q)) ||
      (emp.department && emp.department.toLowerCase().includes(q));

    const matchesRole =
      roleFilter === "ALL" ||
      emp.adminRole === roleFilter ||
      (roleFilter === "super_admin" && (emp.phone === "+919876543210" || emp.adminRole === "super_admin"));

    const matchesDept =
      departmentFilter === "ALL" ||
      (emp.department || emp.adminDepartment || "General Administration") === departmentFilter;

    const matchesStatus =
      statusFilter === "ALL" || emp.accountStatus === statusFilter;

    return matchesSearch && matchesRole && matchesDept && matchesStatus;
  });

  // Calculate unique departments
  const allDepartments = Array.from(
    new Set(employees.map((e) => e.department || e.adminDepartment || "General Administration"))
  ).filter(Boolean);

  const totalStaff = employees.length;
  const activeStaff = employees.filter((e) => e.accountStatus === "active").length;
  const superAdminCount = employees.filter((e) => e.phone === "+919876543210" || e.adminRole === "super_admin").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <PageHeader
            title="Platform Administrative Staff"
            description="Manage internal operations team, assign RBAC permissions, and issue individual credentials."
          />
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchData}
            disabled={loading}
            className="neu-btn px-3 py-2 rounded-xl text-xs font-semibold text-[#64748B] hover:text-[#1E293B] flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            title="Refresh Staff List"
          >
            <RefreshCw size={13} className={loading ? "animate-spin text-[#2563EB]" : ""} />
            <span>Refresh</span>
          </button>
          <button
            onClick={() => {
              setModalError(null);
              // Set default to operations_manager
              const defaultRole = availableRoles.find((r) => r.id === "operations_manager") || availableRoles[1];
              setFormData({
                displayName: "",
                phone: "",
                email: "",
                adminRole: defaultRole?.id || "operations_manager",
                adminDepartment: defaultRole?.department || "Operations",
                permissions: defaultRole?.permissions || [],
              });
              setAddModalOpen(true);
            }}
            className="neu-btn-primary px-4 py-2 rounded-xl text-xs font-bold text-white flex items-center gap-1.5 cursor-pointer"
          >
            <Plus size={14} />
            <span>Onboard Admin Staff</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-[#EEF2F6] shadow-neu-flat border border-white/80">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">Total Staff</p>
            <div className="h-7 w-7 rounded-lg bg-blue-100/80 text-[#2563EB] flex items-center justify-center shadow-neu-inset-sm">
              <UserCog size={14} />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-[#1E293B] mt-2">{totalStaff}</p>
          <p className="text-[10px] text-[#64748B] mt-0.5">Platform team members</p>
        </div>

        <div className="p-4 rounded-2xl bg-[#EEF2F6] shadow-neu-flat border border-white/80">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">Active Staff</p>
            <div className="h-7 w-7 rounded-lg bg-emerald-100/80 text-emerald-600 flex items-center justify-center shadow-neu-inset-sm">
              <CheckCircle2 size={14} />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-emerald-600 mt-2">{activeStaff}</p>
          <p className="text-[10px] text-[#64748B] mt-0.5">Authorized for console login</p>
        </div>

        <div className="p-4 rounded-2xl bg-[#EEF2F6] shadow-neu-flat border border-white/80">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">Departments</p>
            <div className="h-7 w-7 rounded-lg bg-purple-100/80 text-purple-600 flex items-center justify-center shadow-neu-inset-sm">
              <Building size={14} />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-[#1E293B] mt-2">{allDepartments.length}</p>
          <p className="text-[10px] text-[#64748B] mt-0.5">Operating units</p>
        </div>

        <div className="p-4 rounded-2xl bg-[#EEF2F6] shadow-neu-flat border border-white/80">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">Super Admins</p>
            <div className="h-7 w-7 rounded-lg bg-amber-100/80 text-amber-600 flex items-center justify-center shadow-neu-inset-sm">
              <Shield size={14} />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-amber-600 mt-2">{superAdminCount}</p>
          <p className="text-[10px] text-[#64748B] mt-0.5">Root governance access</p>
        </div>
      </div>

      {/* Feedback Alerts */}
      {error && (
        <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start gap-2 shadow-neu-raised-sm">
          <AlertCircle size={16} className="shrink-0 mt-0.5 text-rose-600" />
          <span className="flex-1">{error}</span>
          <button onClick={() => setError(null)} className="text-rose-500 hover:text-rose-800">
            <X size={14} />
          </button>
        </div>
      )}

      {success && (
        <div className="p-3.5 rounded-2xl bg-teal-50 border border-teal-200 text-xs text-teal-800 flex items-start gap-2 shadow-neu-raised-sm">
          <CheckCircle2 size={16} className="shrink-0 mt-0.5 text-[#14B8A6]" />
          <span className="flex-1">{success}</span>
          <button onClick={() => setSuccess(null)} className="text-teal-600 hover:text-teal-900">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-[#EEF2F6] shadow-neu-flat border border-white/80 flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#94A3B8]">
            <Search size={14} />
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search staff by name, username, phone, email, or department..."
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#EEF2F6] shadow-neu-inset text-xs text-[#1E293B] placeholder:text-[#94A3B8] outline-none border border-transparent focus:border-[#2563EB]/40"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto flex-wrap">
          {/* Department Filter */}
          <select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-[#EEF2F6] shadow-neu-raised-sm text-xs font-semibold text-[#1E293B] outline-none border border-white/80 cursor-pointer"
          >
            <option value="ALL">All Departments</option>
            {allDepartments.map((dept) => (
              <option key={dept} value={dept}>
                {dept}
              </option>
            ))}
          </select>

          {/* Role Filter */}
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-[#EEF2F6] shadow-neu-raised-sm text-xs font-semibold text-[#1E293B] outline-none border border-white/80 cursor-pointer"
          >
            <option value="ALL">All Staff Roles</option>
            {availableRoles.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-[#EEF2F6] shadow-neu-raised-sm text-xs font-semibold text-[#1E293B] outline-none border border-white/80 cursor-pointer"
          >
            <option value="ALL">All Statuses</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
          </select>
        </div>
      </div>

      {/* Staff Roster Table */}
      <div className="rounded-2xl bg-[#EEF2F6] shadow-neu-flat border border-white/80 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-[#1E293B]">
            <thead className="bg-[#EEF2F6] border-b border-[#D9E2EC]/70 text-[10px] uppercase font-bold text-[#64748B] tracking-wider">
              <tr>
                <th className="py-3.5 px-4">Employee / Contact</th>
                <th className="py-3.5 px-4">Role & Department</th>
                <th className="py-3.5 px-4">Capabilities Granted</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#D9E2EC]/60">
              {loading && employees.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-xs text-[#64748B]">
                    <div className="flex flex-col items-center gap-2">
                      <RefreshCw size={20} className="animate-spin text-[#2563EB]" />
                      <span>Loading platform administrative staff...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-xs text-[#64748B]">
                    No administrative employees found matching your criteria.
                  </td>
                </tr>
              ) : (
                filteredEmployees.map((emp) => {
                  const isRootAdmin = emp.phone === "+919876543210";
                  const resolvedPerms = emp.resolvedPermissions || emp.permissions || [];
                  const isSuper = isRootAdmin || emp.adminRole === "super_admin" || resolvedPerms.includes("*");

                  return (
                    <tr key={emp._id} className="hover:bg-white/40 transition">
                      {/* Name & Contact */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-full bg-gradient-to-br from-[#2563EB] to-[#0EA5E9] flex items-center justify-center text-white font-extrabold text-xs shadow-neu-raised-sm shrink-0">
                            {emp.displayName?.charAt(0).toUpperCase() || "A"}
                          </div>
                          <div>
                            <p className="font-bold text-[#1E293B]">{emp.displayName}</p>
                            <div className="flex items-center gap-2 mt-0.5 text-[11px] text-[#64748B]">
                              <span className="font-mono">{emp.phone}</span>
                              {emp.username && (
                                <>
                                  <span>•</span>
                                  <span className="font-mono text-[#2563EB]">@{emp.username}</span>
                                </>
                              )}
                            </div>
                            {emp.email && (
                              <p className="text-[10px] text-[#94A3B8] truncate max-w-[220px]">{emp.email}</p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Role & Department */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-1">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-lg text-[11px] font-bold shadow-neu-raised-sm border ${
                              isSuper
                                ? "bg-amber-50 text-amber-800 border-amber-200"
                                : "bg-blue-50 text-blue-800 border-blue-200"
                            }`}
                          >
                            {emp.roleName || (isSuper ? "Super Administrator" : emp.adminRole)}
                          </span>
                          <p className="text-[11px] text-[#64748B] flex items-center gap-1">
                            <Building size={11} />
                            <span>{emp.department || emp.adminDepartment || "General Administration"}</span>
                          </p>
                        </div>
                      </td>

                      {/* Capabilities */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-wrap gap-1 max-w-[280px]">
                          {isSuper ? (
                            <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 font-bold text-[10px]">
                              Full Root Authority (*)
                            </span>
                          ) : resolvedPerms.length > 0 ? (
                            <>
                              {resolvedPerms.slice(0, 3).map((p) => (
                                <span
                                  key={p}
                                  className="px-1.5 py-0.5 rounded bg-blue-100/70 text-blue-800 font-mono text-[10px]"
                                >
                                  {p}
                                </span>
                              ))}
                              {resolvedPerms.length > 3 && (
                                <span className="px-1.5 py-0.5 rounded bg-gray-200/80 text-gray-700 text-[10px] font-semibold">
                                  +{resolvedPerms.length - 3} more
                                </span>
                              )}
                            </>
                          ) : (
                            <span className="text-[10px] text-[#94A3B8] italic">No active permissions</span>
                          )}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        <StatusBadge
                          status={emp.accountStatus === "active" ? "ACTIVE" : "SUSPENDED"}
                        />
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Resend / View Credentials */}
                          <button
                            onClick={() => handleResendCredentials(emp)}
                            title="View / Dispatch WhatsApp Credentials"
                            className="p-1.5 rounded-lg bg-[#EEF2F6] shadow-neu-raised-sm hover:shadow-neu-flat text-[#2563EB] hover:text-blue-800 border border-white/80 transition cursor-pointer"
                          >
                            <KeyRound size={14} />
                          </button>

                          {/* Edit Employee */}
                          <button
                            onClick={() => {
                              setModalError(null);
                              setEditingEmployee(emp);
                              setEditFormData({
                                displayName: emp.displayName,
                                adminRole: emp.adminRole || "operations_manager",
                                adminDepartment: emp.department || emp.adminDepartment || "Operations",
                                permissions: emp.permissions || emp.resolvedPermissions || [],
                                accountStatus: emp.accountStatus === "suspended" ? "suspended" : "active",
                              });
                            }}
                            title="Edit Role & Permissions"
                            className="p-1.5 rounded-lg bg-[#EEF2F6] shadow-neu-raised-sm hover:shadow-neu-flat text-[#64748B] hover:text-[#1E293B] border border-white/80 transition cursor-pointer"
                          >
                            <Edit2 size={14} />
                          </button>

                          {/* Toggle Active/Suspend */}
                          {!isRootAdmin && (
                            <button
                              onClick={() => handleToggleStatus(emp)}
                              title={emp.accountStatus === "active" ? "Suspend Account" : "Activate Account"}
                              className={`px-2 py-1 rounded-lg text-[10px] font-bold shadow-neu-raised-sm border transition cursor-pointer ${
                                emp.accountStatus === "active"
                                  ? "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100"
                                  : "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                              }`}
                            >
                              {emp.accountStatus === "active" ? "Suspend" : "Activate"}
                            </button>
                          )}

                          {/* Delete */}
                          {!isRootAdmin && (
                            <button
                              onClick={() => handleDeleteEmployee(emp)}
                              title="Delete Account"
                              className="p-1.5 rounded-lg bg-[#EEF2F6] shadow-neu-raised-sm hover:shadow-neu-flat text-rose-600 hover:text-rose-800 border border-white/80 transition cursor-pointer"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL 1: Onboard Admin Employee */}
      {addModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="max-w-xl w-full bg-[#EEF2F6] rounded-3xl p-6 sm:p-8 shadow-neu-raised border border-white/90 my-8">
            <div className="flex items-center justify-between pb-4 border-b border-[#D9E2EC]/70">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-blue-100 text-[#2563EB] flex items-center justify-center shadow-neu-raised-sm">
                  <UserCog size={18} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#1E293B]">Onboard Platform Staff Member</h3>
                  <p className="text-[11px] text-[#64748B]">Assign role, department, and granular capability grants</p>
                </div>
              </div>
              <button
                onClick={() => setAddModalOpen(false)}
                className="p-1.5 rounded-lg text-[#64748B] hover:text-[#1E293B] hover:bg-white/60 transition cursor-pointer"
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

            <form onSubmit={handleCreateEmployee} className="mt-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[#1E293B]">Full Legal Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.displayName}
                    onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                    placeholder="e.g. Priya Sharma"
                    className="w-full px-3 py-2 rounded-xl bg-[#EEF2F6] shadow-neu-inset text-xs text-[#1E293B] outline-none border border-transparent focus:border-[#2563EB]/50"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[#1E293B]">Mobile Phone Number *</label>
                  <input
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+91 98888 00001"
                    className="w-full px-3 py-2 rounded-xl bg-[#EEF2F6] shadow-neu-inset text-xs text-[#1E293B] outline-none border border-transparent focus:border-[#2563EB]/50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[#1E293B]">Administrative Role *</label>
                  <select
                    value={formData.adminRole}
                    onChange={(e) => handleRoleSelectChange(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#EEF2F6] shadow-neu-raised-sm text-xs font-semibold text-[#1E293B] outline-none border border-white/80 cursor-pointer"
                  >
                    {availableRoles.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[#1E293B]">Department *</label>
                  <input
                    type="text"
                    required
                    value={formData.adminDepartment}
                    onChange={(e) => setFormData({ ...formData, adminDepartment: e.target.value })}
                    placeholder="e.g. Regulatory Compliance"
                    className="w-full px-3 py-2 rounded-xl bg-[#EEF2F6] shadow-neu-inset text-xs text-[#1E293B] outline-none border border-transparent focus:border-[#2563EB]/50"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#1E293B]">
                  Corporate Email (Optional — auto-generated if empty)
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="e.g. priya.compliance@packagemovers.in"
                  className="w-full px-3 py-2 rounded-xl bg-[#EEF2F6] shadow-neu-inset text-xs text-[#1E293B] outline-none border border-transparent focus:border-[#2563EB]/50"
                />
              </div>

              {/* Granular Capabilities Matrix */}
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-[#1E293B]">
                    Assigned Capability Grants ({formData.permissions.length} selected)
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setFormData({
                          ...formData,
                          permissions: permissionsList.map((p) => p.id),
                        })
                      }
                      className="text-[10px] text-[#2563EB] hover:underline font-semibold"
                    >
                      Select All
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, permissions: [] })}
                      className="text-[10px] text-[#64748B] hover:underline"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                <div className="max-h-48 overflow-y-auto p-3 rounded-2xl bg-[#EEF2F6] shadow-neu-inset space-y-2 border border-white/60">
                  {permissionsList.map((p) => {
                    const checked = formData.permissions.includes(p.id);
                    return (
                      <label
                        key={p.id}
                        className="flex items-start gap-2 text-xs text-[#1E293B] hover:bg-white/40 p-1 rounded-lg cursor-pointer transition"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormData({
                                ...formData,
                                permissions: [...formData.permissions, p.id],
                              });
                            } else {
                              setFormData({
                                ...formData,
                                permissions: formData.permissions.filter((x) => x !== p.id),
                              });
                            }
                          }}
                          className="mt-0.5 rounded text-[#2563EB] cursor-pointer"
                        />
                        <div className="min-w-0">
                          <p className="font-semibold text-xs leading-tight">{p.name}</p>
                          <p className="text-[10px] text-[#64748B] leading-tight">{p.description}</p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-[#64748B] hover:text-[#1E293B]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="neu-btn-primary px-5 py-2 rounded-xl text-xs font-bold text-white flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
                >
                  {submitting ? (
                    <span>Onboarding Staff...</span>
                  ) : (
                    <>
                      <Sparkles size={14} />
                      <span>Issue Credentials & Onboard</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Edit Admin Employee */}
      {editingEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="max-w-xl w-full bg-[#EEF2F6] rounded-3xl p-6 sm:p-8 shadow-neu-raised border border-white/90 my-8">
            <div className="flex items-center justify-between pb-4 border-b border-[#D9E2EC]/70">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-blue-100 text-[#2563EB] flex items-center justify-center shadow-neu-raised-sm">
                  <Edit2 size={18} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#1E293B]">Modify Platform Staff Member</h3>
                  <p className="text-[11px] text-[#64748B]">{editingEmployee.displayName} • {editingEmployee.phone}</p>
                </div>
              </div>
              <button
                onClick={() => setEditingEmployee(null)}
                className="p-1.5 rounded-lg text-[#64748B] hover:text-[#1E293B] hover:bg-white/60 transition cursor-pointer"
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

            <form onSubmit={handleUpdateEmployee} className="mt-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[#1E293B]">Full Legal Name</label>
                  <input
                    type="text"
                    required
                    value={editFormData.displayName}
                    onChange={(e) => setEditFormData({ ...editFormData, displayName: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-[#EEF2F6] shadow-neu-inset text-xs text-[#1E293B] outline-none border border-transparent focus:border-[#2563EB]/50"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[#1E293B]">Department</label>
                  <input
                    type="text"
                    required
                    value={editFormData.adminDepartment}
                    onChange={(e) => setEditFormData({ ...editFormData, adminDepartment: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-[#EEF2F6] shadow-neu-inset text-xs text-[#1E293B] outline-none border border-transparent focus:border-[#2563EB]/50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[#1E293B]">Assigned Role</label>
                  <select
                    value={editFormData.adminRole}
                    onChange={(e) => {
                      const selected = availableRoles.find((r) => r.id === e.target.value);
                      setEditFormData({
                        ...editFormData,
                        adminRole: e.target.value,
                        adminDepartment: selected?.department || editFormData.adminDepartment,
                        permissions: selected?.permissions || editFormData.permissions,
                      });
                    }}
                    className="w-full px-3 py-2 rounded-xl bg-[#EEF2F6] shadow-neu-raised-sm text-xs font-semibold text-[#1E293B] outline-none border border-white/80 cursor-pointer"
                  >
                    {availableRoles.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[#1E293B]">Account Status</label>
                  <select
                    value={editFormData.accountStatus}
                    onChange={(e) =>
                      setEditFormData({
                        ...editFormData,
                        accountStatus: e.target.value as "active" | "suspended",
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-[#EEF2F6] shadow-neu-raised-sm text-xs font-semibold text-[#1E293B] outline-none border border-white/80 cursor-pointer"
                  >
                    <option value="active">Active (Access Granted)</option>
                    <option value="suspended">Suspended (Access Revoked)</option>
                  </select>
                </div>
              </div>

              {/* Granular Capabilities Matrix */}
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-[#1E293B]">
                    Assigned Capability Grants ({editFormData.permissions.length} selected)
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setEditFormData({
                          ...editFormData,
                          permissions: permissionsList.map((p) => p.id),
                        })
                      }
                      className="text-[10px] text-[#2563EB] hover:underline font-semibold"
                    >
                      Select All
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditFormData({ ...editFormData, permissions: [] })}
                      className="text-[10px] text-[#64748B] hover:underline"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                <div className="max-h-48 overflow-y-auto p-3 rounded-2xl bg-[#EEF2F6] shadow-neu-inset space-y-2 border border-white/60">
                  {permissionsList.map((p) => {
                    const checked = editFormData.permissions.includes(p.id);
                    return (
                      <label
                        key={p.id}
                        className="flex items-start gap-2 text-xs text-[#1E293B] hover:bg-white/40 p-1 rounded-lg cursor-pointer transition"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setEditFormData({
                                ...editFormData,
                                permissions: [...editFormData.permissions, p.id],
                              });
                            } else {
                              setEditFormData({
                                ...editFormData,
                                permissions: editFormData.permissions.filter((x) => x !== p.id),
                              });
                            }
                          }}
                          className="mt-0.5 rounded text-[#2563EB] cursor-pointer"
                        />
                        <div className="min-w-0">
                          <p className="font-semibold text-xs leading-tight">{p.name}</p>
                          <p className="text-[10px] text-[#64748B] leading-tight">{p.description}</p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setEditingEmployee(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-[#64748B] hover:text-[#1E293B]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="neu-btn-primary px-5 py-2 rounded-xl text-xs font-bold text-white flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
                >
                  {submitting ? <span>Saving Changes...</span> : <span>Update Profile</span>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Credentials & WhatsApp Dispatch Dialog */}
      {createdCredentials && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="max-w-md w-full bg-[#EEF2F6] rounded-3xl p-6 sm:p-8 shadow-neu-raised border border-white/90 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="h-10 w-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center shadow-neu-raised-sm">
                  <ShieldCheck size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#1E293B]">Staff Credentials Ready</h3>
                  <p className="text-xs text-[#64748B]">Official platform administrative access</p>
                </div>
              </div>
              <button
                onClick={() => setCreatedCredentials(null)}
                className="p-1 rounded-lg text-[#64748B] hover:text-[#1E293B]"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-[#EEF2F6] shadow-neu-inset space-y-2.5 text-xs text-[#1E293B]">
              <div className="flex justify-between items-center pb-2 border-b border-[#D9E2EC]/70">
                <span className="text-[#64748B]">Employee:</span>
                <span className="font-bold text-[#1E293B]">{createdCredentials.employeeName}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#64748B]">Username:</span>
                <span className="font-mono font-bold text-[#2563EB]">{createdCredentials.username}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#64748B]">Email:</span>
                <span className="font-mono text-[#1E293B]">{createdCredentials.email}</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-[#D9E2EC]/70">
                <span className="text-[#64748B]">Default Password:</span>
                <span className="font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                  {createdCredentials.defaultPassword}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#64748B]">Login Portal:</span>
                <span className="font-mono text-[11px] text-[#2563EB]">/admin/login</span>
              </div>
            </div>

            <div className="space-y-2">
              <button
                onClick={() => {
                  const payload = `Package Mover Admin Console Access\nName: ${createdCredentials.employeeName}\nUsername: ${createdCredentials.username}\nEmail: ${createdCredentials.email}\nDefault Password: ${createdCredentials.defaultPassword}\nLogin Portal: http://localhost:3000/admin/login`;
                  copyToClipboard(payload);
                }}
                className="neu-btn w-full py-2.5 rounded-xl text-xs font-bold text-[#2563EB] flex items-center justify-center gap-2 cursor-pointer"
              >
                {copied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                <span>{copied ? "Credentials Copied to Clipboard!" : "Copy Login Credentials"}</span>
              </button>

              {createdCredentials.whatsappUrl && (
                <a
                  href={createdCredentials.whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2.5 rounded-xl text-xs font-bold bg-[#25D366] text-white hover:bg-[#20bd5a] shadow-neu-raised flex items-center justify-center gap-2 transition cursor-pointer"
                >
                  <MessageCircle size={14} />
                  <span>Share Credentials via WhatsApp</span>
                </a>
              )}
            </div>

            <p className="text-[11px] text-[#64748B] text-center">
              Staff will be prompted to change their temporary password upon their first sign-in.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
