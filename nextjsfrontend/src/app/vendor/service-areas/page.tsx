"use client";

import { useState, useEffect } from "react";
import { fetchApi } from "@/lib/api";
import PageHeader from "@/app/admin/components/PageHeader";
import { MapPin, Plus, RefreshCw, AlertCircle, CheckCircle2, Trash2, X, ArrowRight, Globe } from "lucide-react";

interface ServiceArea {
  code: string;
  name: string;
  city: string;
  state: string;
  route: string;
  status: string;
}

interface AvailableArea {
  zoneCode: string;
  name: string;
  city: string;
  state: string;
}

export default function VendorServiceAreasPage() {
  const [serviceAreas, setServiceAreas] = useState<ServiceArea[]>([]);
  const [availableAreas, setAvailableAreas] = useState<AvailableArea[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [addModalOpen, setAddModalOpen] = useState(false);
  const [selectedZoneCode, setSelectedZoneCode] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchServiceAreas = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetchApi<{ serviceAreas: ServiceArea[]; availableAreas: AvailableArea[] }>("/vendor/service-areas");
      setServiceAreas(res.serviceAreas || []);
      setAvailableAreas(res.availableAreas || []);
      if (res.availableAreas && res.availableAreas.length > 0) {
        setSelectedZoneCode(res.availableAreas[0].zoneCode);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load operational service areas");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServiceAreas();
  }, []);

  const handleAddArea = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedZoneCode) return;

    try {
      setSubmitting(true);
      setError(null);

      await fetchApi("/vendor/service-areas", {
        method: "POST",
        body: JSON.stringify({ zoneCode: selectedZoneCode }),
      });

      setSuccess(`Service coverage zone ${selectedZoneCode} added successfully.`);
      setAddModalOpen(false);
      fetchServiceAreas();
      setTimeout(() => setSuccess(null), 4000);
    } catch (err: any) {
      setError(err.message || "Failed to add service area");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveArea = async (code: string) => {
    if (!confirm(`Are you sure you want to remove coverage zone ${code}?`)) return;

    try {
      setError(null);
      await fetchApi(`/vendor/service-areas/${code}`, {
        method: "DELETE",
      });

      setSuccess(`Coverage zone ${code} removed.`);
      fetchServiceAreas();
      setTimeout(() => setSuccess(null), 4000);
    } catch (err: any) {
      setError(err.message || "Failed to remove service area");
    }
  };

  return (
    <div className="space-y-6 font-sans text-slate-800">
      {/* Header */}
      <PageHeader
        title="Operational Service Areas & Corridors"
        description="Define geographic zones and inter-city corridors where your fleet provides moving services."
      >
        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchServiceAreas}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 shadow-2xs cursor-pointer disabled:opacity-50 transition"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            <span>Refresh</span>
          </button>

          <button
            onClick={() => setAddModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-xs cursor-pointer transition"
          >
            <Plus size={15} />
            <span>Add Service Area</span>
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
          <button onClick={fetchServiceAreas} className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold cursor-pointer transition">
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

      {/* Service Areas Table */}
      <div className="bg-white rounded-2xl shadow-xs border border-slate-200/80 overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-xs text-slate-500">
            <RefreshCw size={24} className="animate-spin mx-auto mb-2 text-blue-600" />
            <span>Loading service areas...</span>
          </div>
        ) : serviceAreas.length === 0 ? (
          <div className="py-16 text-center text-xs text-slate-500 space-y-2">
            <MapPin size={36} className="mx-auto text-slate-300 stroke-1" />
            <p className="text-sm font-bold text-slate-900">No operational service areas configured</p>
            <p className="max-w-xs mx-auto">
              Add your city coverage zones to start receiving customer booking dispatches.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 font-bold text-[11px] uppercase tracking-wider bg-slate-50/70">
                  <th className="py-3.5 px-6">Coverage Zone</th>
                  <th className="py-3.5 px-4">Primary City</th>
                  <th className="py-3.5 px-4">State / Region</th>
                  <th className="py-3.5 px-4">Operational Corridor</th>
                  <th className="py-3.5 px-4">Dispatch Status</th>
                  <th className="py-3.5 px-6 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {serviceAreas.map((area) => (
                  <tr key={area.code} className="hover:bg-slate-50/60 transition">
                    <td className="py-3.5 px-6">
                      <div className="flex items-center gap-2.5">
                        <div className="h-8 w-8 rounded-xl bg-blue-50 text-blue-600 border border-blue-200/60 flex items-center justify-center shrink-0">
                          <MapPin size={15} />
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">{area.name}</p>
                          <p className="text-[10px] font-mono text-blue-600 font-bold">{area.code}</p>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 font-semibold text-slate-900">{area.city}</td>

                    <td className="py-3.5 px-4 text-slate-500 font-medium">{area.state}</td>

                    <td className="py-3.5 px-4 font-medium text-slate-800">
                      {area.route}
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span>Active Coverage</span>
                      </span>
                    </td>

                    <td className="py-3.5 px-6 text-right">
                      <button
                        onClick={() => handleRemoveArea(area.code)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                        title="Remove coverage zone"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Modal */}
      {addModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl p-6 sm:p-7 max-w-md w-full space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-blue-50 text-blue-600 border border-blue-200/60 flex items-center justify-center">
                  <MapPin size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Add Operational Service Area</h3>
                  <p className="text-xs text-slate-500">Activate dispatch in a designated city zone</p>
                </div>
              </div>

              <button onClick={() => setAddModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-700 rounded-lg transition cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddArea} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-800 mb-1.5">Select Coverage Zone</label>
                <select
                  value={selectedZoneCode}
                  onChange={(e) => setSelectedZoneCode(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs font-medium text-slate-900 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 outline-none transition cursor-pointer"
                >
                  {availableAreas.map((a) => (
                    <option key={a.zoneCode} value={a.zoneCode}>
                      {a.name} ({a.city}, {a.state}) — [{a.zoneCode}]
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-500 mt-1.5">
                  Platform approved zones for household and commercial moves.
                </p>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2.5 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl font-semibold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200/80 transition cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-xs cursor-pointer disabled:opacity-50 transition"
                >
                  {submitting ? "Adding..." : "Add Coverage Zone"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
