"use client";

import { useState, useEffect } from "react";
import { fetchApi } from "@/lib/api";
import PageHeader from "@/app/admin/components/PageHeader";
import {
  Layers,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Save,
  Sparkles,
  Plus,
  X,
  Trash2,
  Truck,
  Shield,
  Clock,
  Box,
} from "lucide-react";

interface ServiceItem {
  id: string;
  name: string;
  description: string;
  category?: string;
  isActive: boolean;
  isCustom?: boolean;
}

const SERVICE_PRESETS = [
  {
    name: "Pet Relocation & Vet Care",
    category: "Specialized Handling",
    description: "Air-conditioned pet transit with veterinary-approved kennels, regular feeding stops, and certified handlers.",
  },
  {
    name: "Piano & Heavy Safe Hoisting",
    category: "Specialized Handling",
    description: "Hydraulic crane lifting, heavy appliance dollies, and multi-point harness rigging for heavy or oversized goods.",
  },
  {
    name: "Climate-Controlled Storage",
    category: "Storage & Warehousing",
    description: "24/7 CCTV-monitored, moisture-proof, temperature-regulated warehousing facility with flexible monthly leases.",
  },
  {
    name: "Vehicle & Two-Wheeler Transit",
    category: "Vehicle Transit",
    description: "Enclosed hydraulic car carrier and specialized bike transport with wheel-locking chocks and transit insurance.",
  },
  {
    name: "Corporate IT & Server Relocation",
    category: "Commercial Relocation",
    description: "Anti-static bubble wrap, numbered IT asset tracking, server rack handling, and expedited overnight corporate transfers.",
  },
];

export default function VendorServicesPage() {
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Add Service Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newServiceName, setNewServiceName] = useState("");
  const [newServiceCategory, setNewServiceCategory] = useState("Specialized Handling");
  const [newServiceDescription, setNewServiceDescription] = useState("");
  const [newServiceActive, setNewServiceActive] = useState(true);
  const [modalSubmitting, setModalSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Delete State
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchServices = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetchApi<{ services: ServiceItem[]; currentOffered: string[] }>("/vendor/services");
      setServices(res.services || []);
    } catch (err: any) {
      setError(err.message || "Failed to load vendor services");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServices();
  }, []);

  const toggleService = (id: string) => {
    setServices((prev) =>
      prev.map((s) => (s.id === id ? { ...s, isActive: !s.isActive } : s))
    );
  };

  const handleSaveServices = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const offeredNames = services.filter((s) => s.isActive).map((s) => s.name);

      await fetchApi("/vendor/services", {
        method: "PUT",
        body: JSON.stringify({ servicesOffered: offeredNames }),
      });

      setSuccess("Operational services updated and synced with MongoDB Atlas successfully.");
      setTimeout(() => setSuccess(null), 4000);
    } catch (err: any) {
      setError(err.message || "Failed to save services");
    } finally {
      setSaving(false);
    }
  };

  const handleApplyPreset = (preset: typeof SERVICE_PRESETS[0]) => {
    setNewServiceName(preset.name);
    setNewServiceCategory(preset.category);
    setNewServiceDescription(preset.description);
  };

  const handleCreateService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newServiceName.trim()) {
      setModalError("Please enter a service name.");
      return;
    }
    if (!newServiceDescription.trim()) {
      setModalError("Please enter a service description.");
      return;
    }

    try {
      setModalSubmitting(true);
      setModalError(null);

      const res = await fetchApi<{ service: ServiceItem; message: string }>("/vendor/services", {
        method: "POST",
        body: JSON.stringify({
          name: newServiceName.trim(),
          category: newServiceCategory.trim(),
          description: newServiceDescription.trim(),
          isActive: newServiceActive,
        }),
      });

      // Update state with newly created service
      setServices((prev) => [...prev, res.service]);
      setSuccess(`"${res.service.name}" added to your operational services catalog successfully.`);
      setTimeout(() => setSuccess(null), 4000);

      // Reset & Close Modal
      setIsAddModalOpen(false);
      setNewServiceName("");
      setNewServiceDescription("");
      setNewServiceCategory("Specialized Handling");
      setNewServiceActive(true);
    } catch (err: any) {
      setModalError(err.message || "Failed to create service");
    } finally {
      setModalSubmitting(false);
    }
  };

  const handleDeleteService = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to remove "${name}" from your services?`)) {
      return;
    }

    try {
      setDeletingId(id);
      await fetchApi(`/vendor/services/${id}`, { method: "DELETE" });
      setServices((prev) => prev.filter((s) => s.id !== id));
      setSuccess(`Service "${name}" removed successfully.`);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || "Failed to remove service");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6 font-sans text-slate-800">
      {/* Header */}
      <PageHeader
        title="Moving & Relocation Services"
        description="Select the specialized handling and logistics services your company provides to customer bookings."
      >
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={fetchServices}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 shadow-2xs cursor-pointer disabled:opacity-50 transition"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            <span>Refresh</span>
          </button>

          {/* Add New Service Button */}
          <button
            onClick={() => {
              setModalError(null);
              setIsAddModalOpen(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-xs cursor-pointer transition"
          >
            <Plus size={15} />
            <span>Add New Service</span>
          </button>

          <button
            onClick={handleSaveServices}
            disabled={saving || loading}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-xs cursor-pointer disabled:opacity-50 transition"
          >
            <Save size={15} />
            <span>{saving ? "Saving..." : "Save Services"}</span>
          </button>
        </div>
      </PageHeader>

      {/* Notifications */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center justify-between gap-3 text-rose-700 text-xs shadow-xs">
          <div className="flex items-center gap-2.5">
            <AlertCircle size={17} className="shrink-0 text-rose-600" />
            <span className="font-medium">{error}</span>
          </div>
          <button
            onClick={fetchServices}
            className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold cursor-pointer transition"
          >
            Retry
          </button>
        </div>
      )}

      {success && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-2.5 text-emerald-800 text-xs shadow-xs">
          <CheckCircle2 size={17} className="shrink-0 text-emerald-600" />
          <span className="font-semibold">{success}</span>
        </div>
      )}

      {/* Services Grid */}
      {loading ? (
        <div className="p-16 text-center text-xs font-semibold text-slate-500 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <RefreshCw className="animate-spin mx-auto mb-3 text-blue-600" size={24} />
          Loading company services from MongoDB...
        </div>
      ) : services.length === 0 ? (
        <div className="p-16 text-center rounded-2xl bg-white shadow-xs border border-slate-200 space-y-4">
          <div className="h-14 w-14 rounded-2xl bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center mx-auto">
            <Layers size={28} />
          </div>
          <h3 className="text-base font-bold text-slate-900">No Services Configured Yet</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Click "Add New Service" to define customized handling or moving offerings for your business.
          </p>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-xs cursor-pointer transition"
          >
            <Plus size={15} />
            <span>Create First Service</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {services.map((service) => (
            <div
              key={service.id}
              onClick={() => toggleService(service.id)}
              className={`rounded-2xl p-5 space-y-3.5 border transition cursor-pointer select-none relative group ${
                service.isActive
                  ? "bg-white shadow-xs border-slate-200/80 hover:shadow-md hover:border-slate-300"
                  : "bg-slate-50/70 shadow-2xs border-slate-200/50 opacity-75 hover:opacity-100"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div
                    className={`h-10 w-10 rounded-xl flex items-center justify-center transition ${
                      service.isActive
                        ? "bg-emerald-50 text-emerald-600 border border-emerald-200/60 shadow-xs"
                        : "bg-slate-100 text-slate-400 border border-slate-200"
                    }`}
                  >
                    {service.isCustom ? <Sparkles size={18} /> : <Layers size={20} />}
                  </div>

                  {service.isCustom && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                      Custom
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {/* Delete Button for Custom Services */}
                  {service.isCustom && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteService(service.id, service.name);
                      }}
                      disabled={deletingId === service.id}
                      title="Remove custom service"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                    >
                      <Trash2 size={15} className={deletingId === service.id ? "animate-spin text-rose-500" : ""} />
                    </button>
                  )}

                  {/* Clean Modern Switch */}
                  <div
                    className={`w-11 h-6 flex items-center rounded-full p-1 transition duration-200 ${
                      service.isActive ? "bg-emerald-500" : "bg-slate-300"
                    }`}
                  >
                    <div
                      className={`bg-white w-4 h-4 rounded-full shadow-xs transform transition duration-200 ${
                        service.isActive ? "translate-x-5" : ""
                      }`}
                    />
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <span>{service.name}</span>
                </h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed line-clamp-3">
                  {service.description}
                </p>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px]">
                <span className="text-slate-500">
                  {service.category || "Company Offering"}
                </span>
                <span
                  className={`font-bold ${
                    service.isActive ? "text-emerald-600" : "text-slate-400"
                  }`}
                >
                  {service.isActive ? "Active on Marketplace" : "Disabled"}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ========================================================================= */}
      {/* ADD NEW SERVICE MODAL */}
      {/* ========================================================================= */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="max-w-lg w-full rounded-2xl bg-white border border-slate-200 shadow-2xl p-6 sm:p-7 space-y-4">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-blue-50 text-blue-600 border border-blue-200/60 flex items-center justify-center">
                  <Sparkles size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Add New Moving Service</h3>
                  <p className="text-xs text-slate-500">
                    Define a specialized relocation offering for your company profile
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Error in Modal */}
            {modalError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-rose-700 text-xs">
                <AlertCircle size={15} className="shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            {/* 1-Click Popular Presets */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-bold text-slate-500 block">
                Popular Suggestions (Click to fill):
              </span>
              <div className="flex flex-wrap gap-1.5">
                {SERVICE_PRESETS.map((preset, pIdx) => (
                  <button
                    key={pIdx}
                    type="button"
                    onClick={() => handleApplyPreset(preset)}
                    className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 transition cursor-pointer"
                  >
                    + {preset.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleCreateService} className="space-y-3.5">
              {/* Service Name */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-800">
                  Service Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newServiceName}
                  onChange={(e) => setNewServiceName(e.target.value)}
                  placeholder="e.g. Pet Relocation & Vet Care"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 text-xs font-medium text-slate-900 border border-slate-200 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 outline-none transition"
                />
              </div>

              {/* Category */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-800">Category / Type</label>
                <select
                  value={newServiceCategory}
                  onChange={(e) => setNewServiceCategory(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 text-xs font-medium text-slate-900 border border-slate-200 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 outline-none transition cursor-pointer"
                >
                  <option value="Specialized Handling">Specialized Handling</option>
                  <option value="Vehicle & Bike Transit">Vehicle & Bike Transit</option>
                  <option value="Storage & Warehousing">Storage & Warehousing</option>
                  <option value="Commercial Relocation">Commercial Relocation</option>
                  <option value="Packing & Assembly">Packing & Assembly</option>
                  <option value="Premium White-Glove">Premium White-Glove</option>
                </select>
              </div>

              {/* Description */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-800">
                  Service Description <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={newServiceDescription}
                  onChange={(e) => setNewServiceDescription(e.target.value)}
                  placeholder="Detail crew qualifications, packing methods, protective equipment, and handling process..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 text-xs font-medium text-slate-900 border border-slate-200 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 outline-none transition leading-relaxed resize-none"
                />
              </div>

              {/* Initial Active Toggle */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-800 block">Marketplace Availability</span>
                  <span className="text-[11px] text-slate-500">
                    Enable this service immediately on customer booking requests
                  </span>
                </div>

                <div
                  onClick={() => setNewServiceActive(!newServiceActive)}
                  className={`w-11 h-6 flex items-center rounded-full p-1 transition duration-200 cursor-pointer ${
                    newServiceActive ? "bg-emerald-500" : "bg-slate-300"
                  }`}
                >
                  <div
                    className={`bg-white w-4 h-4 rounded-full shadow-xs transform transition duration-200 ${
                      newServiceActive ? "translate-x-5" : ""
                    }`}
                  />
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  disabled={modalSubmitting}
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200/80 transition cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={modalSubmitting}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-xs cursor-pointer transition disabled:opacity-50"
                >
                  {modalSubmitting ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" />
                      <span>Creating...</span>
                    </>
                  ) : (
                    <>
                      <Plus size={15} />
                      <span>Create & Publish Service</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
