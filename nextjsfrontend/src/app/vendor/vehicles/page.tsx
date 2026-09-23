"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { fetchApi } from "@/lib/api";
import PageHeader from "@/app/admin/components/PageHeader";
import {
  Car,
  Plus,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Trash2,
  Edit2,
  X,
  Search,
  ArrowRight,
  ShieldAlert,
} from "lucide-react";

interface VehicleItem {
  _id: string;
  name: string;
  registrationNumber: string;
  vehicleType: string;
  capacity: string;
  isActive: boolean;
  notes?: string;
  availability: "AVAILABLE" | "ON_MOVE" | "MAINTENANCE";
  activeBookingId?: string | null;
}

export default function VendorVehiclesPage() {
  const [vehicles, setVehicles] = useState<VehicleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("ALL");

  // Add / Edit Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<VehicleItem | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    registrationNumber: "",
    vehicleType: "Medium Truck",
    capacity: "2.5 Ton",
    notes: "",
    isActive: true,
  });

  const fetchVehicles = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetchApi<{ vehicles: VehicleItem[] }>("/vendor/vehicles");
      setVehicles(res.vehicles || []);
    } catch (err: any) {
      setError(err.message || "Failed to load fleet vehicles");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVehicles();
  }, []);

  const handleOpenAdd = () => {
    setEditingVehicle(null);
    setFormData({
      name: "",
      registrationNumber: "",
      vehicleType: "Medium Truck",
      capacity: "2.5 Ton",
      notes: "",
      isActive: true,
    });
    setModalOpen(true);
  };

  const handleOpenEdit = (v: VehicleItem) => {
    setEditingVehicle(v);
    setFormData({
      name: v.name,
      registrationNumber: v.registrationNumber,
      vehicleType: v.vehicleType,
      capacity: v.capacity,
      notes: v.notes || "",
      isActive: v.isActive,
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      setError(null);

      if (editingVehicle) {
        await fetchApi(`/vendor/vehicles/${editingVehicle._id}`, {
          method: "PATCH",
          body: JSON.stringify(formData),
        });
        setSuccess(`Vehicle ${formData.name} updated successfully.`);
      } else {
        await fetchApi("/vendor/vehicles", {
          method: "POST",
          body: JSON.stringify(formData),
        });
        setSuccess(`Vehicle ${formData.name} registered to fleet.`);
      }

      setModalOpen(false);
      fetchVehicles();
      setTimeout(() => setSuccess(null), 4000);
    } catch (err: any) {
      setError(err.message || "Failed to save vehicle");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (v: VehicleItem) => {
    if (!confirm(`Are you sure you want to delete vehicle ${v.name} (${v.registrationNumber})?`)) return;

    try {
      setError(null);
      await fetchApi(`/vendor/vehicles/${v._id}`, {
        method: "DELETE",
      });
      setSuccess(`Vehicle ${v.registrationNumber} deleted.`);
      fetchVehicles();
      setTimeout(() => setSuccess(null), 4000);
    } catch (err: any) {
      setError(err.message || "Failed to delete vehicle");
    }
  };

  const filtered = vehicles.filter((v) => {
    const matchesSearch =
      v.name.toLowerCase().includes(search.toLowerCase()) ||
      v.registrationNumber.toLowerCase().includes(search.toLowerCase());
    const matchesFilter =
      filter === "ALL"
        ? true
        : filter === "AVAILABLE"
        ? v.availability === "AVAILABLE"
        : filter === "ON_MOVE"
        ? v.availability === "ON_MOVE"
        : v.availability === "MAINTENANCE";
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="space-y-6 font-sans text-slate-900">
      {/* Header */}
      <PageHeader
        title="Fleet Logistics & Transport Vehicles"
        description="Monitor transport trucks, pickups, loading capacities, and active dispatch assignments."
      >
        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchVehicles}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200/80 shadow-2xs transition cursor-pointer disabled:opacity-50"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            <span>Refresh</span>
          </button>

          <button
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-xs transition cursor-pointer"
          >
            <Plus size={15} />
            <span>Add Vehicle</span>
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
          <button onClick={fetchVehicles} className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold cursor-pointer">
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

      {/* Search & Filter Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3.5">
        <div className="relative w-full sm:w-80">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by vehicle name or plate..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200/80 rounded-xl focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 text-xs text-slate-800 outline-none font-medium transition"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setFilter("ALL")}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
              filter === "ALL"
                ? "bg-blue-600 text-white shadow-xs"
                : "bg-slate-50 text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200/60"
            }`}
          >
            All Fleet ({vehicles.length})
          </button>

          <button
            onClick={() => setFilter("AVAILABLE")}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
              filter === "AVAILABLE"
                ? "bg-emerald-600 text-white shadow-xs"
                : "bg-slate-50 text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200/60"
            }`}
          >
            Available ({vehicles.filter((v) => v.availability === "AVAILABLE").length})
          </button>

          <button
            onClick={() => setFilter("ON_MOVE")}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
              filter === "ON_MOVE"
                ? "bg-sky-600 text-white shadow-xs"
                : "bg-slate-50 text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200/60"
            }`}
          >
            On Move ({vehicles.filter((v) => v.availability === "ON_MOVE").length})
          </button>
        </div>
      </div>

      {/* Fleet Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-xs text-slate-500">
            <RefreshCw size={24} className="animate-spin mx-auto mb-2 text-blue-600" />
            <span>Loading fleet data...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-xs text-slate-500 space-y-2">
            <Car size={36} className="mx-auto text-slate-300 stroke-1" />
            <p className="text-sm font-bold text-slate-900">No vehicles registered</p>
            <p className="max-w-xs mx-auto text-slate-500">
              Add your transport vehicles and trucks to enable dispatch assignment on incoming bookings.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 font-bold text-[11px] uppercase tracking-wider bg-slate-50/70">
                  <th className="py-3.5 px-6">Vehicle Name</th>
                  <th className="py-3.5 px-4">Registration</th>
                  <th className="py-3.5 px-4">Classification</th>
                  <th className="py-3.5 px-4">Payload Capacity</th>
                  <th className="py-3.5 px-4">Fleet Status</th>
                  <th className="py-3.5 px-4">Current Move</th>
                  <th className="py-3.5 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((v) => (
                  <tr key={v._id} className="hover:bg-slate-50/60 transition">
                    <td className="py-3.5 px-6">
                      <div className="flex items-center gap-2.5">
                        <div className="h-8 w-8 rounded-xl bg-blue-50 text-blue-600 border border-blue-200/60 flex items-center justify-center shrink-0">
                          <Car size={16} />
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">{v.name}</p>
                          {v.notes && <p className="text-[10px] text-slate-500 truncate max-w-[180px]">{v.notes}</p>}
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 font-mono font-bold text-blue-600">{v.registrationNumber}</td>

                    <td className="py-3.5 px-4 font-medium text-slate-800">{v.vehicleType}</td>

                    <td className="py-3.5 px-4 font-semibold text-slate-800">{v.capacity}</td>

                    <td className="py-3.5 px-4">
                      {v.availability === "AVAILABLE" ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          <span>Available</span>
                        </span>
                      ) : v.availability === "ON_MOVE" ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-sky-50 text-sky-700 border border-sky-200/80">
                          <span className="h-1.5 w-1.5 rounded-full bg-sky-500" />
                          <span>On Move</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200/80">
                          <span>Maintenance</span>
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 font-medium">
                      {v.activeBookingId ? (
                        <Link
                          href={`/vendor/bookings/${v.activeBookingId}`}
                          className="text-blue-600 hover:underline font-mono text-xs flex items-center gap-1"
                        >
                          <span>Move #{v.activeBookingId.slice(-6).toUpperCase()}</span>
                          <ArrowRight size={11} />
                        </Link>
                      ) : (
                        <span className="text-slate-400">In Yard</span>
                      )}
                    </td>

                    <td className="py-3.5 px-6 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          onClick={() => handleOpenEdit(v)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 border border-slate-200/60 transition cursor-pointer"
                          title="Edit Vehicle"
                        >
                          <Edit2 size={13} />
                        </button>

                        <button
                          onClick={() => handleDelete(v)}
                          disabled={v.availability === "ON_MOVE"}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 border border-slate-200/60 transition cursor-pointer disabled:opacity-40"
                          title="Delete Vehicle"
                        >
                          <Trash2 size={13} />
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

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-6 sm:p-7 max-w-md w-full space-y-5 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-blue-50 text-blue-600 border border-blue-200/60 flex items-center justify-center">
                  <Car size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    {editingVehicle ? "Edit Fleet Vehicle" : "Register Fleet Vehicle"}
                  </h3>
                  <p className="text-xs text-slate-500">Scoped to your company logistics fleet</p>
                </div>
              </div>

              <button onClick={() => setModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-800 mb-1.5">Vehicle Model / Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Tata 407 Heavy Hauler"
                  className="w-full px-3.5 py-2.5 bg-slate-50 rounded-xl border border-slate-200 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 outline-none font-medium text-xs transition text-slate-800"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1.5">License Registration Plate</label>
                <input
                  type="text"
                  required
                  disabled={Boolean(editingVehicle)}
                  value={formData.registrationNumber}
                  onChange={(e) => setFormData({ ...formData, registrationNumber: e.target.value.toUpperCase() })}
                  placeholder="e.g. KA-01-EA-4491"
                  className="w-full px-3.5 py-2.5 bg-slate-50 rounded-xl border border-slate-200 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 outline-none font-mono uppercase font-bold text-xs transition text-slate-800 disabled:opacity-60"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-800 mb-1.5">Vehicle Type</label>
                  <select
                    value={formData.vehicleType}
                    onChange={(e) => setFormData({ ...formData, vehicleType: e.target.value })}
                    className="w-full px-3 py-2.5 bg-slate-50 rounded-xl border border-slate-200 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 outline-none font-medium text-xs transition text-slate-800 cursor-pointer"
                  >
                    <option value="Small Pickup">Small Pickup (1.5T)</option>
                    <option value="Medium Truck">Medium Truck (3.5T)</option>
                    <option value="Large Freight Truck">Large Freight Truck (5T+)</option>
                    <option value="Mini Van">Mini Cargo Van</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-800 mb-1.5">Payload Capacity</label>
                  <input
                    type="text"
                    required
                    value={formData.capacity}
                    onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                    placeholder="e.g. 3.5 Ton"
                    className="w-full px-3.5 py-2.5 bg-slate-50 rounded-xl border border-slate-200 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 outline-none font-medium text-xs transition text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1.5">Operational Notes (Optional)</label>
                <input
                  type="text"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="e.g. Hydraulic lift gate, GPS tracking enabled"
                  className="w-full px-3.5 py-2.5 bg-slate-50 rounded-xl border border-slate-200 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 outline-none font-medium text-xs transition text-slate-800"
                />
              </div>

              {editingVehicle && (
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="rounded border-slate-300 text-blue-600 focus:ring-0 cursor-pointer"
                  />
                  <label htmlFor="isActive" className="font-semibold text-xs text-slate-800 cursor-pointer">
                    Vehicle is active in operational service
                  </label>
                </div>
              )}

              <div className="pt-3 flex items-center justify-end gap-2.5 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-xs transition cursor-pointer disabled:opacity-50"
                >
                  {submitting ? "Saving..." : editingVehicle ? "Update Vehicle" : "Register Vehicle"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
