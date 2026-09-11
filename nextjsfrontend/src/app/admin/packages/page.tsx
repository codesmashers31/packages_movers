"use client";

import { useState, useEffect } from "react";
import { fetchApi } from "@/lib/api";
import PageHeader from "../components/PageHeader";
import StatusBadge from "../components/StatusBadge";
import {
  Plus,
  Edit2,
  Loader2,
  AlertCircle,
  X,
  RefreshCw,
  Check,
  Ban,
} from "lucide-react";

interface ServicePackageItem {
  _id: string;
  name: string;
  code: string;
  description: string;
  category: string;
  isActive: boolean;
  basePriceEstimate?: number;
  inclusions: string[];
  createdAt: string;
}

export default function AdminPackagesPage() {
  const [packages, setPackages] = useState<ServicePackageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedPkg, setSelectedPkg] = useState<ServicePackageItem | null>(null);

  // Form states
  const [formName, setFormName] = useState("");
  const [formCode, setFormCode] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formCategory, setFormCategory] = useState("General");
  const [formPrice, setFormPrice] = useState("");
  const [formInclusions, setFormInclusions] = useState("");
  const [formActive, setFormActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const loadPackages = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetchApi<{ packages: ServicePackageItem[] }>("/admin/packages");
      setPackages(res.packages || []);
    } catch (err: any) {
      setError(err.message || "Failed to load packages");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPackages();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formCode.trim()) {
      setFormError("Package name and unique code are required.");
      return;
    }

    setSubmitting(true);
    setFormError("");

    try {
      await fetchApi("/admin/packages", {
        method: "POST",
        body: JSON.stringify({
          name: formName,
          code: formCode,
          description: formDescription,
          category: formCategory,
          basePriceEstimate: Number(formPrice) || 0,
          inclusions: formInclusions.split(",").map((s) => s.trim()).filter(Boolean),
          isActive: formActive,
        }),
      });

      setShowCreateModal(false);
      loadPackages();
    } catch (err: any) {
      setFormError(err.message || "Failed to create package");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPkg) return;

    setSubmitting(true);
    setFormError("");

    try {
      await fetchApi(`/admin/packages/${selectedPkg._id}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: formName,
          description: formDescription,
          category: formCategory,
          basePriceEstimate: Number(formPrice) || 0,
          inclusions: formInclusions.split(",").map((s) => s.trim()).filter(Boolean),
          isActive: formActive,
        }),
      });

      setShowEditModal(false);
      setSelectedPkg(null);
      loadPackages();
    } catch (err: any) {
      setFormError(err.message || "Failed to update package");
    } finally {
      setSubmitting(false);
    }
  };

  const openEdit = (pkg: ServicePackageItem) => {
    setSelectedPkg(pkg);
    setFormName(pkg.name);
    setFormCode(pkg.code);
    setFormDescription(pkg.description || "");
    setFormCategory(pkg.category || "General");
    setFormPrice(pkg.basePriceEstimate?.toString() || "");
    setFormInclusions(pkg.inclusions?.join(", ") || "");
    setFormActive(pkg.isActive);
    setFormError("");
    setShowEditModal(true);
  };

  const toggleStatus = async (pkg: ServicePackageItem) => {
    try {
      await fetchApi(`/admin/packages/${pkg._id}`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: !pkg.isActive }),
      });
      loadPackages();
    } catch (err: any) {
      setError(err.message || "Failed to update package status");
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <PageHeader
        title="Service Packages"
        description="Standardized marketplace moving services available for customer requests and quotes"
      >
        <button
          onClick={() => {
            setFormName("");
            setFormCode("");
            setFormDescription("");
            setFormCategory("Packing");
            setFormPrice("");
            setFormInclusions("");
            setFormActive(true);
            setFormError("");
            setShowCreateModal(true);
          }}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 neu-btn-primary text-white rounded-md text-xs font-medium shadow-neu-flat-sm transition cursor-pointer"
        >
          <Plus size={14} />
          <span>Add Package</span>
        </button>
      </PageHeader>

      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-md flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertCircle size={15} className="shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
          <button
            onClick={() => loadPackages()}
            className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded text-xs font-medium transition cursor-pointer shrink-0"
          >
            Retry
          </button>
        </div>
      )}

      {/* Single Enterprise Table */}
      <div className="bg-[#EEF2F6] rounded-2xl shadow-neu-flat border border-white/80 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#EEF2F6]/75 text-slate-500 font-semibold border-b border-[#D9E2EC]/70 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="px-4 py-2.5">Code</th>
                <th className="px-4 py-2.5">Package Name</th>
                <th className="px-4 py-2.5">Category</th>
                <th className="px-4 py-2.5">Guide Estimate</th>
                <th className="px-4 py-2.5">Inclusions</th>
                <th className="px-4 py-2.5">Status</th>
                <th className="px-4 py-2.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#D9E2EC]/70">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <Loader2 size={20} className="animate-spin text-slate-600 mx-auto mb-2" />
                    <span>Loading service packages...</span>
                  </td>
                </tr>
              ) : packages.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No service packages configured.
                  </td>
                </tr>
              ) : (
                packages.map((pkg) => (
                  <tr key={pkg._id} className="hover:bg-[#EEF2F6]/50 transition-colors">
                    <td className="px-4 py-2.5 font-mono text-slate-600 font-medium">
                      {pkg.code}
                    </td>
                    <td className="px-4 py-2.5">
                      <p className="font-medium text-slate-900">{pkg.name}</p>
                      {pkg.description && (
                        <p className="text-[11px] text-slate-500 truncate max-w-sm">
                          {pkg.description}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="px-2 py-0.5 rounded bg-[#EEF2F6] text-slate-700 text-[11px] font-medium">
                        {pkg.category}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 font-mono font-medium text-slate-900">
                      ₹{(pkg.basePriceEstimate || 0).toLocaleString()}
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {pkg.inclusions?.length ? (
                          pkg.inclusions.map((inc, i) => (
                            <span
                              key={i}
                              className="px-1.5 py-0.5 rounded bg-[#EEF2F6] border border-[#D9E2EC]/70 text-slate-600 text-[10px]"
                            >
                              {inc}
                            </span>
                          ))
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">None specified</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-2.5">
                      <StatusBadge
                        status={pkg.isActive ? "active" : "suspended"}
                        label={pkg.isActive ? "Active" : "Disabled"}
                      />
                    </td>
                    <td className="px-4 py-2.5 text-right space-x-1">
                      <button
                        onClick={() => openEdit(pkg)}
                        className="p-1 text-slate-400 hover:text-[#2563EB] rounded transition cursor-pointer"
                        title="Edit Package"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={() => toggleStatus(pkg)}
                        className={`p-1 rounded transition cursor-pointer ${
                          pkg.isActive
                            ? "text-slate-400 hover:text-rose-600"
                            : "text-slate-400 hover:text-[#14B8A6]"
                        }`}
                        title={pkg.isActive ? "Disable Package" : "Activate Package"}
                      >
                        {pkg.isActive ? <Ban size={14} /> : <Check size={14} />}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="px-4 py-3 border-t border-[#D9E2EC]/70 text-xs text-slate-500">
          Showing {packages.length} standardized service packages
        </div>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40">
          <div className="w-full max-w-md bg-[#EEF2F6] rounded-2xl shadow-neu-flat border border-white/80 overflow-hidden shadow-lg">
            <div className="px-5 py-3.5 border-b border-[#D9E2EC]/70 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900">Add Service Package</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded transition cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreate} className="p-5 space-y-3.5 text-xs">
              {formError && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-md">
                  {formError}
                </div>
              )}

              <div className="space-y-1">
                <label className="font-medium text-slate-700">Package Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Standard 2BHK Relocation"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3 py-1.5 border border-[#D9E2EC]/80 rounded-md focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-medium text-slate-700">Unique Code *</label>
                  <input
                    type="text"
                    required
                    placeholder="PKG_2BHK_STD"
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value.toUpperCase())}
                    className="w-full px-3 py-1.5 border border-[#D9E2EC]/80 rounded-md uppercase font-mono focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-medium text-slate-700">Category</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-[#D9E2EC]/80 rounded-md bg-[#EEF2F6] text-slate-700 focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]"
                  >
                    <option value="Residential">Residential</option>
                    <option value="Commercial">Commercial</option>
                    <option value="Packing">Packing</option>
                    <option value="Labor">Labor</option>
                    <option value="General">General</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-medium text-slate-700">Guide Base Estimate (₹)</label>
                <input
                  type="number"
                  placeholder="3500"
                  value={formPrice}
                  onChange={(e) => setFormPrice(e.target.value)}
                  className="w-full px-3 py-1.5 border border-[#D9E2EC]/80 rounded-md focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="font-medium text-slate-700">Scope Description</label>
                <textarea
                  rows={2}
                  placeholder="Detailed description of the service deliverables..."
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full px-3 py-1.5 border border-[#D9E2EC]/80 rounded-md focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]"
                />
              </div>

              <div className="space-y-1">
                <label className="font-medium text-slate-700">Inclusions (comma-separated)</label>
                <input
                  type="text"
                  placeholder="Bubble wrap, Corrugated boxes, Tape, Loading crew"
                  value={formInclusions}
                  onChange={(e) => setFormInclusions(e.target.value)}
                  className="w-full px-3 py-1.5 border border-[#D9E2EC]/80 rounded-md focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="pkgActiveCreate"
                  checked={formActive}
                  onChange={(e) => setFormActive(e.target.checked)}
                  className="rounded border-[#D9E2EC]/80 text-[#2563EB] focus:ring-[#2563EB] h-4 w-4"
                />
                <label htmlFor="pkgActiveCreate" className="font-medium text-slate-700 cursor-pointer">
                  Active in Marketplace Catalog
                </label>
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
                  {submitting ? "Saving..." : "Create Package"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && selectedPkg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40">
          <div className="w-full max-w-md bg-[#EEF2F6] rounded-2xl shadow-neu-flat border border-white/80 overflow-hidden shadow-lg">
            <div className="px-5 py-3.5 border-b border-[#D9E2EC]/70 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Edit Package</h3>
                <p className="text-[11px] font-mono text-slate-500">{selectedPkg.code}</p>
              </div>
              <button
                onClick={() => setShowEditModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded transition cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleEdit} className="p-5 space-y-3.5 text-xs">
              {formError && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-md">
                  {formError}
                </div>
              )}

              <div className="space-y-1">
                <label className="font-medium text-slate-700">Package Name *</label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3 py-1.5 border border-[#D9E2EC]/80 rounded-md focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-medium text-slate-700">Category</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-[#D9E2EC]/80 rounded-md bg-[#EEF2F6] text-slate-700 focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]"
                  >
                    <option value="Residential">Residential</option>
                    <option value="Commercial">Commercial</option>
                    <option value="Packing">Packing</option>
                    <option value="Labor">Labor</option>
                    <option value="General">General</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="font-medium text-slate-700">Guide Base Estimate (₹)</label>
                  <input
                    type="number"
                    value={formPrice}
                    onChange={(e) => setFormPrice(e.target.value)}
                    className="w-full px-3 py-1.5 border border-[#D9E2EC]/80 rounded-md focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-medium text-slate-700">Scope Description</label>
                <textarea
                  rows={2}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full px-3 py-1.5 border border-[#D9E2EC]/80 rounded-md focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]"
                />
              </div>

              <div className="space-y-1">
                <label className="font-medium text-slate-700">Inclusions</label>
                <input
                  type="text"
                  value={formInclusions}
                  onChange={(e) => setFormInclusions(e.target.value)}
                  className="w-full px-3 py-1.5 border border-[#D9E2EC]/80 rounded-md focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="pkgActiveEdit"
                  checked={formActive}
                  onChange={(e) => setFormActive(e.target.checked)}
                  className="rounded border-[#D9E2EC]/80 text-[#2563EB] focus:ring-[#2563EB] h-4 w-4"
                />
                <label htmlFor="pkgActiveEdit" className="font-medium text-slate-700 cursor-pointer">
                  Active in Marketplace Catalog
                </label>
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
