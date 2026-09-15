"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { fetchApi } from "@/lib/api";
import PageHeader from "@/app/admin/components/PageHeader";
import StatusBadge from "@/app/admin/components/StatusBadge";
import {
  Users,
  Plus,
  Search,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Phone,
  HardHat,
  X,
  Edit2,
  Shield,
  Clock,
  Sparkles,
  MessageCircle,
  Copy,
  Check,
  Mail,
  KeyRound,
  Share2,
} from "lucide-react";

interface Employee {
  _id: string;
  displayName: string;
  phone: string;
  username?: string;
  email?: string;
  employeeRole: string;
  skills?: string[];
  accountStatus: "active" | "suspended";
  availability: "AVAILABLE" | "ON_MOVE";
  activeBookingId?: string | null;
  mustChangePassword?: boolean;
  createdAt: string;
}

interface RoleOption {
  id: string;
  name: string;
  isCustom?: boolean;
  status?: string;
}

interface CreatedCredentialsModal {
  employeeName: string;
  phone: string;
  username: string;
  email: string;
  defaultPassword: string;
  whatsappUrl?: string | null;
}

export default function VendorEmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [availableRoles, setAvailableRoles] = useState<RoleOption[]>([
    { id: "worker", name: "Crew Worker / Driver", isCustom: false },
    { id: "operations", name: "Operations Staff", isCustom: false },
    { id: "manager", name: "Manager", isCustom: false },
  ]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Credentials & WhatsApp Notification Modal
  const [createdCredentials, setCreatedCredentials] = useState<CreatedCredentialsModal | null>(null);
  const [copied, setCopied] = useState(false);

  // Filters
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Modals
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    displayName: "",
    phone: "",
    employeeRole: "worker",
    skills: "Packing, Heavy Lifting",
    accountStatus: "active" as "active" | "suspended",
  });

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      setError(null);
      const queryParams = new URLSearchParams();
      if (search) queryParams.append("search", search);
      if (roleFilter !== "ALL") queryParams.append("role", roleFilter);
      if (statusFilter !== "ALL") queryParams.append("status", statusFilter);

      const res = await fetchApi<{ employees: Employee[] }>(`/vendor/employees?${queryParams.toString()}`);
      setEmployees(res.employees || []);
    } catch (err: any) {
      setError(err.message || "Failed to load vendor employees");
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableRoles = useCallback(async () => {
    try {
      const res = await fetchApi<{ roles: RoleOption[] }>(`/vendor/roles?_t=${Date.now()}`, {
        cache: "no-store",
      });
      if (res && res.roles && res.roles.length > 0) {
        // Only active roles for assignment
        const activeRoles = res.roles.filter((r) => r.status !== "Inactive");
        setAvailableRoles(
          activeRoles.map((r) => ({
            id: r.id,
            name: r.name,
            isCustom: Boolean(r.isCustom),
            status: r.status || "Active",
          }))
        );
      }
    } catch (err) {
      console.warn("Could not load vendor roles:", err);
    }
  }, []);

  useEffect(() => {
    fetchAvailableRoles();

    const onRolesUpdated = () => {
      fetchAvailableRoles();
    };

    window.addEventListener("vendor-roles-updated", onRolesUpdated);
    window.addEventListener("focus", onRolesUpdated);

    return () => {
      window.removeEventListener("vendor-roles-updated", onRolesUpdated);
      window.removeEventListener("focus", onRolesUpdated);
    };
  }, [fetchAvailableRoles]);

  useEffect(() => {
    if (addModalOpen || editingEmployee) {
      fetchAvailableRoles();
    }
  }, [addModalOpen, editingEmployee, fetchAvailableRoles]);

  useEffect(() => {
    fetchEmployees();
  }, [roleFilter, statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchEmployees();
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      setModalError(null);
      setError(null);

      const skillsArray = formData.skills
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      const res = await fetchApi<{ employee: Employee; credentials?: any }>("/vendor/employees", {
        method: "POST",
        body: JSON.stringify({
          displayName: formData.displayName,
          phone: formData.phone,
          employeeRole: formData.employeeRole,
          skills: skillsArray,
        }),
      });

      setSuccess(`Employee ${formData.displayName} added successfully with system login credentials.`);
      setAddModalOpen(false);
      setModalError(null);

      if (res.credentials) {
        setCreatedCredentials({
          employeeName: formData.displayName,
          phone: formData.phone,
          username: res.credentials.username,
          email: res.credentials.email,
          defaultPassword: res.credentials.defaultPassword,
          whatsappUrl: res.credentials.whatsappUrl,
        });
      }

      setFormData({ displayName: "", phone: "", employeeRole: "worker", skills: "Packing, Heavy Lifting", accountStatus: "active" });
      fetchEmployees();
      setTimeout(() => setSuccess(null), 5000);
    } catch (err: any) {
      setModalError(err.message || "Failed to add employee");
    } finally {
      setSubmitting(false);
    }
  };

  const handleResendWhatsApp = async (emp: Employee) => {
    try {
      setLoading(true);
      const res = await fetchApi<{ credentials?: any; message?: string }>(
        `/vendor/employees/${emp._id}/resend-credentials`,
        { method: "POST" }
      );
      if (res.credentials) {
        setCreatedCredentials({
          employeeName: emp.displayName,
          phone: emp.phone,
          username: res.credentials.username,
          email: res.credentials.email,
          defaultPassword: res.credentials.defaultPassword,
          whatsappUrl: res.credentials.whatsappUrl,
        });
      }
      setSuccess(`WhatsApp credentials generated for ${emp.displayName}`);
      setTimeout(() => setSuccess(null), 4000);
    } catch (err: any) {
      setError(err.message || "Failed to prepare WhatsApp credentials");
    } finally {
      setLoading(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEmployee) return;

    try {
      setSubmitting(true);
      setModalError(null);
      setError(null);

      const skillsArray = formData.skills
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      await fetchApi(`/vendor/employees/${editingEmployee._id}`, {
        method: "PATCH",
        body: JSON.stringify({
          displayName: formData.displayName,
          employeeRole: formData.employeeRole,
          skills: skillsArray,
          accountStatus: formData.accountStatus,
        }),
      });

      setSuccess(`Employee ${formData.displayName} updated successfully.`);
      setEditingEmployee(null);
      setModalError(null);
      fetchEmployees();
      setTimeout(() => setSuccess(null), 4000);
    } catch (err: any) {
      setModalError(err.message || "Failed to update employee");
    } finally {
      setSubmitting(false);
    }
  };

  const openEditModal = (emp: Employee) => {
    fetchAvailableRoles();
    setModalError(null);
    setEditingEmployee(emp);
    setFormData({
      displayName: emp.displayName,
      phone: emp.phone,
      employeeRole: emp.employeeRole,
      skills: (emp.skills || []).join(", "),
      accountStatus: emp.accountStatus,
    });
  };

  return (
    <div className="space-y-6 font-sans text-slate-900">
      {/* Header */}
      <PageHeader
        title="Crew & Employee Management"
        description="Manage logistics operators, drivers, and supervisory staff belonging to your company."
      >
        <div className="flex items-center gap-2.5">
          <Link
            href="/vendor/roles"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200/80 shadow-2xs transition cursor-pointer"
            title="Configure Roles & Rules"
          >
            <Shield size={14} className="text-blue-600" />
            <span className="hidden md:inline">Roles & Rules</span>
          </Link>
          <Link
            href="/vendor/permissions"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200/80 shadow-2xs transition cursor-pointer"
            title="Permissions Matrix"
          >
            <KeyRound size={14} className="text-sky-600" />
            <span className="hidden md:inline">Permissions</span>
          </Link>
          <button
            onClick={() => {
              fetchEmployees();
              fetchAvailableRoles();
            }}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200/80 shadow-2xs transition cursor-pointer disabled:opacity-50"
            title="Reload list"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          <button
            onClick={() => {
              fetchAvailableRoles();
              setModalError(null);
              setError(null);
              setFormData({
                displayName: "",
                phone: "",
                employeeRole: availableRoles[0]?.id || "worker",
                skills: "Packing, Heavy Lifting",
                accountStatus: "active",
              });
              setAddModalOpen(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-xs transition cursor-pointer"
          >
            <Plus size={15} />
            <span>Add Crew Member</span>
          </button>
        </div>
      </PageHeader>

      {/* Notifications */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center justify-between gap-3 text-rose-700 text-xs shadow-2xs">
          <div className="flex items-center gap-2.5">
            <AlertCircle size={17} className="shrink-0 text-rose-600" />
            <span className="font-medium">{error}</span>
          </div>
          <button onClick={fetchEmployees} className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold cursor-pointer">
            Retry
          </button>
        </div>
      )}

      {success && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-2.5 text-emerald-800 text-xs shadow-2xs">
          <CheckCircle2 size={17} className="shrink-0 text-emerald-600" />
          <span className="font-semibold">{success}</span>
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3.5">
        <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-80">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or phone..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200/80 rounded-xl focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 text-xs text-slate-800 outline-none font-medium transition"
          />
        </form>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-semibold text-slate-800 outline-none cursor-pointer focus:bg-white focus:border-blue-500 transition"
          >
            <option value="ALL">All Roles</option>
            {availableRoles.filter((r) => !r.isCustom).length > 0 && (
              <optgroup label="Standard Roles">
                {availableRoles
                  .filter((r) => !r.isCustom)
                  .map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
              </optgroup>
            )}
            {availableRoles.filter((r) => r.isCustom).length > 0 && (
              <optgroup label="Custom Roles">
                {availableRoles
                  .filter((r) => r.isCustom)
                  .map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
              </optgroup>
            )}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-semibold text-slate-800 outline-none cursor-pointer focus:bg-white focus:border-blue-500 transition"
          >
            <option value="ALL">All Statuses</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
          </select>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-xs text-slate-500">
            <RefreshCw size={24} className="animate-spin mx-auto mb-2 text-blue-600" />
            <span>Loading company employees...</span>
          </div>
        ) : employees.length === 0 ? (
          <div className="py-16 text-center text-xs text-slate-500 space-y-2">
            <HardHat size={36} className="mx-auto text-slate-300 stroke-1" />
            <p className="text-sm font-bold text-slate-900">No employees found</p>
            <p className="max-w-xs mx-auto text-slate-500">
              Add drivers, packers, and operators to your company fleet to assign them to incoming moving jobs.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 font-bold text-[11px] uppercase tracking-wider bg-slate-50/70">
                  <th className="py-3.5 px-5">Employee & Phone</th>
                  <th className="py-3.5 px-4">Portal Credentials</th>
                  <th className="py-3.5 px-4">Role Designation</th>
                  <th className="py-3.5 px-4">Skills</th>
                  <th className="py-3.5 px-4">Live Availability</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {employees.map((emp) => (
                  <tr key={emp._id} className="hover:bg-slate-50/60 transition">
                    <td className="py-3.5 px-5">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-2xs shrink-0">
                          {emp.displayName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">{emp.displayName}</p>
                          <p className="text-[11px] text-slate-500 font-mono">{emp.phone}</p>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      {emp.username ? (
                        <div className="space-y-0.5">
                          <p className="font-mono font-bold text-slate-900 text-[11px]">@{emp.username}</p>
                          <p className="text-[10px] text-blue-600 truncate max-w-[170px]" title={emp.email}>
                            {emp.email || `${emp.username}@packagemovers.in`}
                          </p>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-[11px]">Phone OTP Access</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 font-semibold text-slate-800">
                      {(() => {
                        const r = availableRoles.find(
                          (role) =>
                            role.id === emp.employeeRole ||
                            role.name.toLowerCase() === (emp.employeeRole || "").toLowerCase()
                        );
                        return r ? (
                          <span className="inline-flex items-center gap-1.5">
                            <span>{r.name}</span>
                            {r.isCustom && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                                Custom
                              </span>
                            )}
                          </span>
                        ) : (
                          emp.employeeRole || "Crew Worker"
                        );
                      })()}
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex flex-wrap gap-1 max-w-[200px]">
                        {emp.skills && emp.skills.length > 0 ? (
                          emp.skills.map((s, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-0.5 rounded-lg bg-slate-100 text-[10px] font-semibold text-slate-700 border border-slate-200/60"
                            >
                              {s}
                            </span>
                          ))
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      {emp.availability === "AVAILABLE" ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          <span>Available</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-sky-50 text-sky-700 border border-sky-200/80">
                          <span className="h-1.5 w-1.5 rounded-full bg-sky-500" />
                          <span>On Move</span>
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      <StatusBadge status={emp.accountStatus} />
                    </td>

                    <td className="py-3.5 px-5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleResendWhatsApp(emp)}
                          className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 border border-emerald-200/60 transition cursor-pointer"
                          title="View / Send Credentials to WhatsApp"
                        >
                          <MessageCircle size={14} />
                        </button>
                        <button
                          onClick={() => openEditModal(emp)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 border border-slate-200/60 transition cursor-pointer"
                          title="Edit Employee"
                        >
                          <Edit2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Modal */}
      {(addModalOpen || editingEmployee) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-6 sm:p-7 max-w-md w-full space-y-5 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-blue-50 text-blue-600 border border-blue-200/60 flex items-center justify-center">
                  <HardHat size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    {editingEmployee ? "Edit Employee Profile" : "Register New Crew Member"}
                  </h3>
                  <p className="text-xs text-slate-500">Assigned strictly to your company roster</p>
                </div>
              </div>

              <button
                onClick={() => {
                  setAddModalOpen(false);
                  setEditingEmployee(null);
                  setModalError(null);
                }}
                className="p-1 text-slate-400 hover:text-slate-600 transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* In-Modal Alert Banner */}
            {modalError && (
              <div className="p-3.5 bg-rose-50 border border-rose-300 rounded-2xl flex items-start gap-3 text-rose-800 text-xs shadow-2xs animate-fadeIn">
                <div className="h-7 w-7 rounded-lg bg-rose-100 border border-rose-200 flex items-center justify-center shrink-0 text-rose-600 mt-0.5">
                  <AlertCircle size={16} />
                </div>
                <div className="flex-1 space-y-0.5">
                  <p className="font-bold text-rose-900">
                    {modalError.toLowerCase().includes("phone") ? "Phone Number Conflict" : "Registration Error"}
                  </p>
                  <p className="text-[11px] text-rose-700 leading-relaxed font-medium">{modalError}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setModalError(null)}
                  className="p-1 text-rose-400 hover:text-rose-700 rounded-lg transition cursor-pointer"
                  title="Dismiss error"
                >
                  <X size={15} />
                </button>
              </div>
            )}

            <form onSubmit={editingEmployee ? handleEditSubmit : handleAddSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-800 mb-1.5">Full Name</label>
                <input
                  type="text"
                  required
                  value={formData.displayName}
                  onChange={(e) => {
                    setFormData({ ...formData, displayName: e.target.value });
                    if (modalError) setModalError(null);
                  }}
                  placeholder="e.g. Ramesh Kumar"
                  className="w-full px-3.5 py-2.5 bg-slate-50 rounded-xl border border-slate-200 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 outline-none font-medium text-xs transition text-slate-800"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block font-bold text-slate-800">Phone Number</label>
                  {modalError && modalError.toLowerCase().includes("phone") && (
                    <span className="text-[10px] font-bold text-rose-600 flex items-center gap-1 bg-rose-100/70 px-2 py-0.5 rounded-md border border-rose-200">
                      <AlertCircle size={11} /> Already registered
                    </span>
                  )}
                </div>
                <input
                  type="tel"
                  required
                  disabled={Boolean(editingEmployee)}
                  value={formData.phone}
                  onChange={(e) => {
                    setFormData({ ...formData, phone: e.target.value });
                    if (modalError) setModalError(null);
                  }}
                  placeholder="+91 98765 00000"
                  className={`w-full px-3.5 py-2.5 bg-slate-50 rounded-xl border outline-none font-medium text-xs transition ${
                    modalError && modalError.toLowerCase().includes("phone")
                      ? "border-rose-400 focus:border-rose-500 bg-rose-50/30 text-rose-900 ring-2 ring-rose-300/40"
                      : "border-slate-200 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 text-slate-800"
                  } disabled:opacity-60`}
                />
                {modalError && modalError.toLowerCase().includes("phone") ? (
                  <p className="text-[11px] text-rose-600 font-semibold mt-1.5 flex items-center gap-1.5">
                    <span>* Please enter a unique mobile number not registered to any other user.</span>
                  </p>
                ) : editingEmployee ? (
                  <p className="text-[10px] text-slate-500 mt-1">Phone number is the primary account identifier.</p>
                ) : null}
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block font-bold text-slate-800">Role Designation</label>
                  <Link
                    href="/vendor/roles"
                    className="text-[11px] font-bold text-blue-600 hover:underline flex items-center gap-1"
                    title="Manage roles & permissions"
                  >
                    + Manage Roles
                  </Link>
                </div>
                <select
                  value={formData.employeeRole}
                  onChange={(e) => setFormData({ ...formData, employeeRole: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 rounded-xl border border-slate-200 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 outline-none font-medium text-xs transition text-slate-800 cursor-pointer"
                >
                  {availableRoles.filter((r) => !r.isCustom).length > 0 && (
                    <optgroup label="Standard Roles">
                      {availableRoles
                        .filter((r) => !r.isCustom)
                        .map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.name}
                          </option>
                        ))}
                    </optgroup>
                  )}
                  {availableRoles.filter((r) => r.isCustom).length > 0 && (
                    <optgroup label="Your Custom Roles">
                      {availableRoles
                        .filter((r) => r.isCustom)
                        .map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.name}
                          </option>
                        ))}
                    </optgroup>
                  )}
                  {formData.employeeRole &&
                    !availableRoles.some(
                      (r) =>
                        r.id === formData.employeeRole ||
                        r.name.toLowerCase() === formData.employeeRole.toLowerCase()
                    ) && (
                      <option value={formData.employeeRole}>{formData.employeeRole}</option>
                    )}
                </select>
                <p className="text-[10px] text-slate-500 mt-1">
                  Assign this employee to a standard role or a custom role you created in Roles & Permissions.
                </p>
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1.5">Operational Skills (comma separated)</label>
                <input
                  type="text"
                  value={formData.skills}
                  onChange={(e) => setFormData({ ...formData, skills: e.target.value })}
                  placeholder="Packing, Heavy Lifting, Driver, Assembly"
                  className="w-full px-3.5 py-2.5 bg-slate-50 rounded-xl border border-slate-200 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 outline-none font-medium text-xs transition text-slate-800"
                />
              </div>

              {editingEmployee && (
                <div>
                  <label className="block font-bold text-slate-800 mb-1.5">Account Status</label>
                  <select
                    value={formData.accountStatus}
                    onChange={(e) =>
                      setFormData({ ...formData, accountStatus: e.target.value as "active" | "suspended" })
                    }
                    className="w-full px-3.5 py-2.5 bg-slate-50 rounded-xl border border-slate-200 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 outline-none font-medium text-xs transition text-slate-800 cursor-pointer"
                  >
                    <option value="active">Active (Eligible for Moves)</option>
                    <option value="suspended">Suspended (Cannot be Assigned)</option>
                  </select>
                </div>
              )}

              <div className="pt-3 flex items-center justify-end gap-2.5 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => {
                    setAddModalOpen(false);
                    setEditingEmployee(null);
                    setModalError(null);
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-xs transition cursor-pointer disabled:opacity-50"
                >
                  {submitting ? "Saving..." : editingEmployee ? "Update Employee" : "Add Employee"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Generated Credentials & WhatsApp Delivery Dialog */}
      {createdCredentials && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-6 sm:p-7 max-w-lg w-full space-y-5 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-200">
                  <MessageCircle size={22} className="text-emerald-600" />
                </div>
                <div>
                  <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-[10px] font-bold text-emerald-800 mb-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span>WhatsApp Notification Prepared</span>
                  </div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Employee Access Credentials
                  </h3>
                </div>
              </div>
              <button
                onClick={() => setCreatedCredentials(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg transition cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              Login credentials for <strong className="text-slate-900">{createdCredentials.employeeName}</strong> have been created. The notification is ready to send to their registered phone <strong className="font-mono text-slate-900">{createdCredentials.phone}</strong>.
            </p>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2.5 text-xs font-mono">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-sans">Username:</span>
                <span className="font-bold text-slate-900 select-all">{createdCredentials.username}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-sans">Corporate Email:</span>
                <span className="font-bold text-blue-600 select-all">{createdCredentials.email}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-sans">Default Password:</span>
                <span className="font-bold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded select-all">
                  {createdCredentials.defaultPassword}
                </span>
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-slate-200 text-[11px] font-sans text-slate-500">
                <span>First Sign-in Rule:</span>
                <span className="text-amber-700 font-semibold">User must choose new password on first login</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-2">
              {createdCredentials.whatsappUrl && (
                <a
                  href={createdCredentials.whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full sm:flex-1 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs flex items-center justify-center gap-2 transition cursor-pointer"
                >
                  <MessageCircle size={15} />
                  <span>Send via WhatsApp</span>
                </a>
              )}

              <button
                type="button"
                onClick={() => {
                  const credText = `Package Mover Credentials\nUsername: ${createdCredentials.username}\nEmail: ${createdCredentials.email}\nDefault Password: ${createdCredentials.defaultPassword}\nLogin Portal: http://localhost:3000/vendor/login`;
                  navigator.clipboard.writeText(credText);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2500);
                }}
                className="w-full sm:w-auto py-2.5 px-4 rounded-xl bg-white hover:bg-slate-50 text-slate-800 font-bold text-xs border border-slate-200 shadow-2xs flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                {copied ? (
                  <>
                    <Check size={14} className="text-emerald-600" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy size={14} />
                    <span>Copy Credentials</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setCreatedCredentials(null)}
                className="w-full sm:w-auto py-2.5 px-4 rounded-xl hover:bg-slate-100 text-slate-600 font-semibold text-xs transition cursor-pointer"
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
