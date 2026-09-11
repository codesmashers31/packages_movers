"use client";

import { useEffect, useState, useCallback } from "react";
import { fetchApi } from "@/lib/api";
import PageHeader from "../components/PageHeader";
import {
  MapPin,
  Search,
  Plus,
  Filter,
  CheckCircle2,
  XCircle,
  Edit2,
  Trash2,
  RefreshCw,
  AlertCircle,
  ArrowUpDown,
} from "lucide-react";

interface ServiceArea {
  id: string;
  name: string;
  code: string;
  city: string;
  state: string;
  active: boolean;
}

export default function ServiceAreasPage() {
  const [areas, setAreas] = useState<ServiceArea[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedArea, setSelectedArea] = useState<ServiceArea | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    city: "",
    state: "",
    active: true,
  });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchServiceAreas = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const query = new URLSearchParams({
        search,
        status: statusFilter,
        sortBy,
        sortOrder,
      });

      const data = await fetchApi<{ serviceAreas: ServiceArea[] }>(
        `/admin/service-areas?${query.toString()}`
      );
      setAreas(data.serviceAreas || []);
    } catch (err: any) {
      setError(err.message || "Failed to load service areas from MongoDB");
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, sortBy, sortOrder]);

  useEffect(() => {
    fetchServiceAreas();
  }, [fetchServiceAreas]);

  const handleCreateArea = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.code || !formData.city || !formData.state) {
      setFormError("All fields are required");
      return;
    }

    try {
      setSubmitting(true);
      setFormError(null);
      await fetchApi("/admin/service-areas", {
        method: "POST",
        body: JSON.stringify(formData),
      });

      setIsAddModalOpen(false);
      setFormData({ name: "", code: "", city: "", state: "", active: true });
      await fetchServiceAreas();
    } catch (err: any) {
      setFormError(err.message || "Failed to create area");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateArea = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedArea) return;

    try {
      setSubmitting(true);
      setFormError(null);
      await fetchApi(`/admin/service-areas/${selectedArea.id}`, {
        method: "PATCH",
        body: JSON.stringify(formData),
      });

      setIsEditModalOpen(false);
      setSelectedArea(null);
      await fetchServiceAreas();
    } catch (err: any) {
      setFormError(err.message || "Failed to update area");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (area: ServiceArea) => {
    try {
      await fetchApi(`/admin/service-areas/${area.id}`, {
        method: "PATCH",
        body: JSON.stringify({ active: !area.active }),
      });
      await fetchServiceAreas();
    } catch (err: any) {
      alert(err.message || "Action failed");
    }
  };

  const handleDeleteArea = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete coverage for "${name}"?`)) return;

    try {
      await fetchApi(`/admin/service-areas/${id}`, {
        method: "DELETE",
      });
      await fetchServiceAreas();
    } catch (err: any) {
      alert(err.message || "Deletion failed");
    }
  };

  const openEditModal = (area: ServiceArea) => {
    setSelectedArea(area);
    setFormData({
      name: area.name,
      code: area.code,
      city: area.city,
      state: area.state,
      active: area.active,
    });
    setFormError(null);
    setIsEditModalOpen(true);
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Service Areas & Coverage"
        description="Define geographic coverage zones, postal codes, and city territories where Package Mover operates."
      >
        <button
          onClick={() => {
            setFormData({ name: "", code: "", city: "", state: "", active: true });
            setFormError(null);
            setIsAddModalOpen(true);
          }}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 neu-btn-primary text-white rounded-md text-xs font-medium shadow-neu-flat-sm transition cursor-pointer"
        >
          <Plus size={14} />
          <span>Add Coverage Area</span>
        </button>
      </PageHeader>

      {/* Toolbar: Search, Filter, Sort */}
      <div className="bg-[#EEF2F6] p-3 rounded-lg border border-[#D9E2EC]/70 shadow-neu-flat-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 text-slate-400" size={14} />
          <input
            type="text"
            placeholder="Search area name, city, code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-[#EEF2F6] border border-[#D9E2EC]/70 rounded-md focus:outline-none focus:ring-1 focus:ring-[#2563EB] focus:border-[#2563EB] focus:bg-[#EEF2F6] text-slate-900 placeholder:text-slate-400"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <div className="flex items-center gap-1.5 text-xs text-slate-600">
            <Filter size={13} className="text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="py-1.5 px-2 bg-[#EEF2F6] border border-[#D9E2EC]/70 rounded-md text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#2563EB] focus:border-[#2563EB]"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-slate-600">
            <ArrowUpDown size={13} className="text-slate-400" />
            <select
              value={`${sortBy}-${sortOrder}`}
              onChange={(e) => {
                const [field, order] = e.target.value.split("-");
                setSortBy(field);
                setSortOrder(order as "asc" | "desc");
              }}
              className="py-1.5 px-2 bg-[#EEF2F6] border border-[#D9E2EC]/70 rounded-md text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#2563EB] focus:border-[#2563EB]"
            >
              <option value="name-asc">Name (A-Z)</option>
              <option value="name-desc">Name (Z-A)</option>
              <option value="city-asc">City (A-Z)</option>
              <option value="code-asc">Code (A-Z)</option>
            </select>
          </div>

          <button
            onClick={fetchServiceAreas}
            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-[#EEF2F6] rounded-md transition cursor-pointer"
            title="Refresh List"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-center justify-between gap-3 text-rose-700 text-xs">
          <div className="flex items-center gap-2.5">
            <AlertCircle size={15} className="shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
          <button
            onClick={() => fetchServiceAreas()}
            className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded text-xs font-medium transition cursor-pointer shrink-0"
          >
            Retry
          </button>
        </div>
      )}


      {/* Table-First Layout */}
      <div className="bg-[#EEF2F6] rounded-2xl shadow-neu-flat border border-white/80 shadow-neu-flat-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#EEF2F6]/80 border-b border-[#D9E2EC]/70 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                <th className="py-2.5 px-4">Area Name</th>
                <th className="py-2.5 px-4">Zone Code</th>
                <th className="py-2.5 px-4">City</th>
                <th className="py-2.5 px-4">State</th>
                <th className="py-2.5 px-4">Status</th>
                <th className="py-2.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#D9E2EC]/70 text-slate-700">
              {loading && areas.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <RefreshCw size={18} className="animate-spin mx-auto mb-2 text-slate-300" />
                    Loading operational coverage areas...
                  </td>
                </tr>
              ) : areas.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    No coverage areas found matching your filters.
                  </td>
                </tr>
              ) : (
                areas.map((area) => (
                  <tr key={area.id} className="hover:bg-[#EEF2F6]/60 transition-colors">
                    <td className="py-2.5 px-4 font-semibold text-slate-900">
                      {area.name}
                    </td>
                    <td className="py-2.5 px-4 font-mono font-medium text-slate-700">
                      <span className="bg-[#EEF2F6] px-1.5 py-0.5 rounded text-[11px] border border-[#D9E2EC]/70">
                        {area.code}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-slate-800">{area.city}</td>
                    <td className="py-2.5 px-4 text-slate-600">{area.state}</td>
                    <td className="py-2.5 px-4">
                      {area.active ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-teal-50 text-teal-700 border border-emerald-200">
                          <CheckCircle2 size={11} className="text-[#14B8A6]" />
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#EEF2F6] text-slate-600 border border-[#D9E2EC]/70">
                          <XCircle size={11} className="text-slate-400" />
                          Inactive
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleToggleStatus(area)}
                          className={`px-2 py-1 rounded text-[10px] font-medium transition cursor-pointer border ${
                            area.active
                              ? "bg-[#EEF2F6] hover:bg-[#EEF2F6] text-slate-600 border-[#D9E2EC]/70"
                              : "bg-teal-50 hover:bg-emerald-100 text-teal-700 border-emerald-200"
                          }`}
                        >
                          {area.active ? "Deactivate" : "Activate"}
                        </button>
                        <button
                          onClick={() => openEditModal(area)}
                          className="p-1 text-slate-500 hover:text-[#2563EB] hover:bg-blue-50/80 rounded transition cursor-pointer"
                          title="Edit Area"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          onClick={() => handleDeleteArea(area.id, area.name)}
                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition cursor-pointer"
                          title="Delete Area"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="px-4 py-2 bg-[#EEF2F6] border-t border-[#D9E2EC]/70 flex items-center justify-between text-[11px] text-slate-500">
          <span>Showing {areas.length} coverage zones</span>
          <span>Total Active: {areas.filter((a) => a.active).length}</span>
        </div>
      </div>

      {/* Add Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#EEF2F6] rounded-lg shadow-xl border border-[#D9E2EC]/70 max-w-md w-full p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-sm">Add New Coverage Area</h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            {formError && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 rounded text-rose-700 text-xs">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateArea} className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Area Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Bangalore South"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-1.5 border border-[#D9E2EC]/70 rounded-md focus:outline-none focus:ring-1 focus:ring-[#2563EB] focus:border-[#2563EB] text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Zone Code *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. BLR-STH"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-1.5 border border-[#D9E2EC]/70 rounded-md focus:outline-none focus:ring-1 focus:ring-[#2563EB] focus:border-[#2563EB] text-slate-900 font-mono uppercase"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">City *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Bengaluru"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full px-3 py-1.5 border border-[#D9E2EC]/70 rounded-md focus:outline-none focus:ring-1 focus:ring-[#2563EB] focus:border-[#2563EB] text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">State / Province *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Karnataka"
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  className="w-full px-3 py-1.5 border border-[#D9E2EC]/70 rounded-md focus:outline-none focus:ring-1 focus:ring-[#2563EB] focus:border-[#2563EB] text-slate-900"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="activeCheck"
                  checked={formData.active}
                  onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                  className="rounded border-[#D9E2EC]/80 text-[#2563EB] focus:ring-[#2563EB] h-4 w-4"
                />
                <label htmlFor="activeCheck" className="text-slate-700 font-medium cursor-pointer">
                  Activate coverage immediately
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-3 py-1.5 rounded-md border border-[#D9E2EC]/70 text-slate-600 hover:bg-[#EEF2F6] font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-1.5 rounded-md neu-btn-primary text-white font-medium shadow-neu-flat-sm disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? "Creating..." : "Save Area"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {isEditModalOpen && selectedArea && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#EEF2F6] rounded-lg shadow-xl border border-[#D9E2EC]/70 max-w-md w-full p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-sm">Edit Coverage Area</h3>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            {formError && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 rounded text-rose-700 text-xs">
                {formError}
              </div>
            )}

            <form onSubmit={handleUpdateArea} className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Area Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-1.5 border border-[#D9E2EC]/70 rounded-md focus:outline-none focus:ring-1 focus:ring-[#2563EB] focus:border-[#2563EB] text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Zone Code *</label>
                  <input
                    type="text"
                    required
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-1.5 border border-[#D9E2EC]/70 rounded-md focus:outline-none focus:ring-1 focus:ring-[#2563EB] focus:border-[#2563EB] text-slate-900 font-mono uppercase"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">City *</label>
                  <input
                    type="text"
                    required
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full px-3 py-1.5 border border-[#D9E2EC]/70 rounded-md focus:outline-none focus:ring-1 focus:ring-[#2563EB] focus:border-[#2563EB] text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">State / Province *</label>
                <input
                  type="text"
                  required
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  className="w-full px-3 py-1.5 border border-[#D9E2EC]/70 rounded-md focus:outline-none focus:ring-1 focus:ring-[#2563EB] focus:border-[#2563EB] text-slate-900"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="editActiveCheck"
                  checked={formData.active}
                  onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                  className="rounded border-[#D9E2EC]/80 text-[#2563EB] focus:ring-[#2563EB] h-4 w-4"
                />
                <label htmlFor="editActiveCheck" className="text-slate-700 font-medium cursor-pointer">
                  Active Coverage Area
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-3 py-1.5 rounded-md border border-[#D9E2EC]/70 text-slate-600 hover:bg-[#EEF2F6] font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-1.5 rounded-md neu-btn-primary text-white font-medium shadow-neu-flat-sm disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? "Updating..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
