"use client";

import { useState, useEffect } from "react";
import { fetchApi } from "@/lib/api";
import PageHeader from "../components/PageHeader";
import StatusBadge from "../components/StatusBadge";
import {
  Search,
  UserPlus,
  Loader2,
  AlertCircle,
  Edit2,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";

interface UserItem {
  _id: string;
  phone: string;
  displayName: string;
  role: "customer" | "vendor" | "worker" | "admin";
  accountStatus: "active" | "suspended" | "deleted";
  language: string;
  createdAt: string;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserItem | null>(null);

  // Form states
  const [formPhone, setFormPhone] = useState("");
  const [formDisplayName, setFormDisplayName] = useState("");
  const [formRole, setFormRole] = useState<string>("customer");
  const [formStatus, setFormStatus] = useState<string>("active");
  const [formLang, setFormLang] = useState<string>("en");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const loadUsers = async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "10",
        search,
        role: roleFilter,
        status: statusFilter,
        sortBy,
        sortOrder,
      });
      const res = await fetchApi<{
        users: UserItem[];
        pagination: { total: number; totalPages: number };
      }>(`/admin/users?${params.toString()}`);
      setUsers(res.users);
      setTotalPages(res.pagination.totalPages || 1);
      setTotalCount(res.pagination.total || 0);
    } catch (err: any) {
      setError(err.message || "Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("asc");
    }
    setPage(1);
  };

  useEffect(() => {
    loadUsers();
  }, [page, roleFilter, statusFilter, sortBy, sortOrder]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadUsers();
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formPhone.trim()) {
      setFormError("Phone number is required");
      return;
    }

    setSubmitting(true);
    setFormError("");

    try {
      await fetchApi("/admin/users", {
        method: "POST",
        body: JSON.stringify({
          phone: formPhone,
          displayName: formDisplayName,
          role: formRole,
          accountStatus: formStatus,
          language: formLang,
        }),
      });

      setShowCreateModal(false);
      setFormPhone("");
      setFormDisplayName("");
      setFormRole("customer");
      setFormStatus("active");
      loadUsers();
    } catch (err: any) {
      setFormError(err.message || "Failed to create user");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    setSubmitting(true);
    setFormError("");

    try {
      await fetchApi(`/admin/users/${selectedUser._id}`, {
        method: "PATCH",
        body: JSON.stringify({
          displayName: formDisplayName,
          role: formRole,
          accountStatus: formStatus,
          language: formLang,
        }),
      });

      setShowEditModal(false);
      setSelectedUser(null);
      loadUsers();
    } catch (err: any) {
      setFormError(err.message || "Failed to update user");
    } finally {
      setSubmitting(false);
    }
  };

  const openEditModal = (u: UserItem) => {
    setSelectedUser(u);
    setFormDisplayName(u.displayName || "");
    setFormRole(u.role);
    setFormStatus(u.accountStatus);
    setFormLang(u.language || "en");
    setFormError("");
    setShowEditModal(true);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <PageHeader
        title="User Management"
        description="Search, view, and administer marketplace accounts"
      >
        <button
          onClick={() => {
            setFormPhone("");
            setFormDisplayName("");
            setFormRole("customer");
            setFormStatus("active");
            setFormLang("en");
            setFormError("");
            setShowCreateModal(true);
          }}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 neu-btn-primary text-white rounded-md text-xs font-medium shadow-neu-flat-sm transition cursor-pointer"
        >
          <UserPlus size={14} />
          <span>Create User</span>
        </button>
      </PageHeader>

      {/* Toolbar: Search, Filters, Sort Reset */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#EEF2F6] p-3 rounded-lg border border-[#D9E2EC]/70">
        <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-80">
          <Search size={14} className="absolute inset-y-0 left-2.5 my-auto text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by phone or name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-md border border-[#D9E2EC]/80 bg-[#EEF2F6] placeholder-slate-400 focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] transition"
          />
        </form>

        <div className="flex items-center flex-wrap gap-2 w-full sm:w-auto">
          <select
            value={roleFilter}
            onChange={(e) => {
              setRoleFilter(e.target.value);
              setPage(1);
            }}
            className="text-xs border border-[#D9E2EC]/80 rounded-md px-2.5 py-1.5 bg-[#EEF2F6] text-slate-700 focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]"
          >
            <option value="all">All Roles</option>
            <option value="customer">Customer</option>
            <option value="vendor">Vendor</option>
            <option value="worker">Worker</option>
            <option value="admin">Admin</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="text-xs border border-[#D9E2EC]/80 rounded-md px-2.5 py-1.5 bg-[#EEF2F6] text-slate-700 focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
            <option value="deleted">Deleted</option>
          </select>

          {(search || roleFilter !== "all" || statusFilter !== "all") && (
            <button
              onClick={() => {
                setSearch("");
                setRoleFilter("all");
                setStatusFilter("all");
                setPage(1);
              }}
              className="inline-flex items-center gap-1 px-2 py-1.5 text-xs text-slate-500 hover:text-slate-900 border border-[#D9E2EC]/70 rounded-md hover:bg-[#EEF2F6] transition cursor-pointer"
            >
              <X size={12} />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-md flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertCircle size={15} className="shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
          <button
            onClick={() => loadUsers()}
            className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded text-xs font-medium transition cursor-pointer shrink-0"
          >
            Retry
          </button>
        </div>
      )}


      {/* Single Enterprise Table Container */}
      <div className="bg-[#EEF2F6] rounded-2xl shadow-neu-flat border border-white/80 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#EEF2F6]/75 text-slate-500 font-semibold border-b border-[#D9E2EC]/70">
              <tr>
                <th
                  className="px-4 py-2.5 cursor-pointer hover:text-slate-900 transition select-none"
                  onClick={() => handleSort("displayName")}
                >
                  <div className="flex items-center gap-1">
                    <span>User</span>
                    <span className="text-[10px] text-slate-400">
                      {sortBy === "displayName" ? (sortOrder === "asc" ? "▲" : "▼") : "↕"}
                    </span>
                  </div>
                </th>
                <th
                  className="px-4 py-2.5 cursor-pointer hover:text-slate-900 transition select-none"
                  onClick={() => handleSort("phone")}
                >
                  <div className="flex items-center gap-1">
                    <span>Phone</span>
                    <span className="text-[10px] text-slate-400">
                      {sortBy === "phone" ? (sortOrder === "asc" ? "▲" : "▼") : "↕"}
                    </span>
                  </div>
                </th>
                <th
                  className="px-4 py-2.5 cursor-pointer hover:text-slate-900 transition select-none"
                  onClick={() => handleSort("role")}
                >
                  <div className="flex items-center gap-1">
                    <span>Role</span>
                    <span className="text-[10px] text-slate-400">
                      {sortBy === "role" ? (sortOrder === "asc" ? "▲" : "▼") : "↕"}
                    </span>
                  </div>
                </th>
                <th
                  className="px-4 py-2.5 cursor-pointer hover:text-slate-900 transition select-none"
                  onClick={() => handleSort("accountStatus")}
                >
                  <div className="flex items-center gap-1">
                    <span>Status</span>
                    <span className="text-[10px] text-slate-400">
                      {sortBy === "accountStatus" ? (sortOrder === "asc" ? "▲" : "▼") : "↕"}
                    </span>
                  </div>
                </th>
                <th className="px-4 py-2.5">Language</th>
                <th
                  className="px-4 py-2.5 cursor-pointer hover:text-slate-900 transition select-none"
                  onClick={() => handleSort("createdAt")}
                >
                  <div className="flex items-center gap-1">
                    <span>Joined</span>
                    <span className="text-[10px] text-slate-400">
                      {sortBy === "createdAt" ? (sortOrder === "asc" ? "▲" : "▼") : "↕"}
                    </span>
                  </div>
                </th>
                <th className="px-4 py-2.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#D9E2EC]/70">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <Loader2 size={20} className="animate-spin text-slate-600 mx-auto mb-2" />
                    <span>Loading user accounts...</span>
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No users match the selected query.
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u._id} className="hover:bg-[#EEF2F6]/50 transition-colors">
                    <td className="px-4 py-2.5">
                      <p className="font-medium text-slate-900">
                        {u.displayName || "—"}
                      </p>
                    </td>
                    <td className="px-4 py-2.5 font-mono text-slate-600">
                      {u.phone}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="capitalize font-medium text-slate-700">
                        {u.role}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <StatusBadge status={u.accountStatus} />
                    </td>
                    <td className="px-4 py-2.5 text-slate-500 uppercase">
                      {u.language || "en"}
                    </td>
                    <td className="px-4 py-2.5 text-slate-500">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <button
                        onClick={() => openEditModal(u)}
                        className="p-1 text-slate-400 hover:text-[#2563EB] rounded transition cursor-pointer"
                        title="Edit User"
                      >
                        <Edit2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="px-4 py-3 border-t border-[#D9E2EC]/70 flex items-center justify-between text-xs text-slate-500">
          <span>
            Showing {users.length} of {totalCount} users
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-2 py-1 rounded border border-[#D9E2EC]/70 hover:bg-[#EEF2F6] hover:text-[#2563EB] disabled:opacity-40 transition cursor-pointer"
            >
              <ChevronLeft size={14} />
            </button>
            <span className="px-2 font-medium text-slate-700">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="px-2 py-1 rounded border border-[#D9E2EC]/70 hover:bg-[#EEF2F6] hover:text-[#2563EB] disabled:opacity-40 transition cursor-pointer"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Create User Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40">
          <div className="w-full max-w-md bg-[#EEF2F6] rounded-2xl shadow-neu-flat border border-white/80 overflow-hidden shadow-lg">
            <div className="px-5 py-3.5 border-b border-[#D9E2EC]/70 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900">Create New Account</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded transition cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="p-5 space-y-3.5 text-xs">
              {formError && (
                <div className="p-2.5 rounded bg-rose-50 border border-rose-200 text-rose-700">
                  {formError}
                </div>
              )}

              <div className="space-y-1">
                <label className="font-medium text-slate-700">Phone Number *</label>
                <input
                  type="tel"
                  placeholder="+919876543210"
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                  required
                  className="w-full px-3 py-1.5 border border-[#D9E2EC]/80 rounded-md focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="font-medium text-slate-700">Display Name</label>
                <input
                  type="text"
                  placeholder="Full Name / Operational Alias"
                  value={formDisplayName}
                  onChange={(e) => setFormDisplayName(e.target.value)}
                  className="w-full px-3 py-1.5 border border-[#D9E2EC]/80 rounded-md focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-medium text-slate-700">Role</label>
                  <select
                    value={formRole}
                    onChange={(e) => setFormRole(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-[#D9E2EC]/80 rounded-md bg-[#EEF2F6] text-slate-700 focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]"
                  >
                    <option value="customer">Customer</option>
                    <option value="vendor">Vendor</option>
                    <option value="worker">Worker</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-medium text-slate-700">Initial Status</label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-[#D9E2EC]/80 rounded-md bg-[#EEF2F6] text-slate-700 focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]"
                  >
                    <option value="active">Active</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-medium text-slate-700">Preferred Language</label>
                <select
                  value={formLang}
                  onChange={(e) => setFormLang(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-[#D9E2EC]/80 rounded-md bg-[#EEF2F6] text-slate-700 focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]"
                >
                  <option value="en">English (en)</option>
                  <option value="ta">Tamil (ta)</option>
                  <option value="hi">Hindi (hi)</option>
                </select>
              </div>

              <div className="pt-3 border-t border-[#D9E2EC]/70 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3 py-1.5 border border-[#D9E2EC]/80 text-slate-700 hover:bg-[#EEF2F6] rounded-md transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-3 py-1.5 neu-btn-primary text-white rounded-md shadow-neu-flat-sm transition cursor-pointer disabled:opacity-50 font-medium"
                >
                  {submitting ? "Creating..." : "Create Account"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {showEditModal && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40">
          <div className="w-full max-w-md bg-[#EEF2F6] rounded-2xl shadow-neu-flat border border-white/80 overflow-hidden shadow-lg">
            <div className="px-5 py-3.5 border-b border-[#D9E2EC]/70 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Edit User Account</h3>
                <p className="text-[11px] font-mono text-slate-500">{selectedUser.phone}</p>
              </div>
              <button
                onClick={() => setShowEditModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded transition cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleUpdateUser} className="p-5 space-y-3.5 text-xs">
              {formError && (
                <div className="p-2.5 rounded bg-rose-50 border border-rose-200 text-rose-700">
                  {formError}
                </div>
              )}

              <div className="space-y-1">
                <label className="font-medium text-slate-700">Display Name</label>
                <input
                  type="text"
                  value={formDisplayName}
                  onChange={(e) => setFormDisplayName(e.target.value)}
                  className="w-full px-3 py-1.5 border border-[#D9E2EC]/80 rounded-md focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-medium text-slate-700">Role</label>
                  <select
                    value={formRole}
                    onChange={(e) => setFormRole(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-[#D9E2EC]/80 rounded-md bg-[#EEF2F6] text-slate-700 focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]"
                  >
                    <option value="customer">Customer</option>
                    <option value="vendor">Vendor</option>
                    <option value="worker">Worker</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-medium text-slate-700">Account Status</label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-[#D9E2EC]/80 rounded-md bg-[#EEF2F6] text-slate-700 focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]"
                  >
                    <option value="active">Active</option>
                    <option value="suspended">Suspended</option>
                    <option value="deleted">Deleted</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-medium text-slate-700">Preferred Language</label>
                <select
                  value={formLang}
                  onChange={(e) => setFormLang(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-[#D9E2EC]/80 rounded-md bg-[#EEF2F6] text-slate-700 focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]"
                >
                  <option value="en">English (en)</option>
                  <option value="ta">Tamil (ta)</option>
                  <option value="hi">Hindi (hi)</option>
                </select>
              </div>

              <div className="pt-3 border-t border-[#D9E2EC]/70 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-3 py-1.5 border border-[#D9E2EC]/80 text-slate-700 hover:bg-[#EEF2F6] rounded-md transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-3 py-1.5 neu-btn-primary text-white rounded-md shadow-neu-flat-sm transition cursor-pointer disabled:opacity-50 font-medium"
                >
                  {submitting ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
