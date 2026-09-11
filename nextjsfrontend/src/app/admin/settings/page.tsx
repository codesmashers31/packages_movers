"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { fetchApi } from "@/lib/api";
import PageHeader from "../components/PageHeader";
import {
  Settings,
  Save,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Phone,
  Mail,
  Clock,
  ShieldAlert,
  MapPin,
  Store,
  Truck,
  Sparkles,
  ShieldCheck,
  Activity,
  Headphones,
  RotateCcw,
  Sliders,
  ChevronRight,
} from "lucide-react";

interface SystemSettings {
  platformName: string;
  supportPhone: string;
  supportEmail: string;
  operatingHours: string;
  minAdvanceNoticeHours: number;
  maintenanceMode: boolean;
}

const DEFAULT_SETTINGS: SystemSettings = {
  platformName: "Package Mover",
  supportPhone: "+91 80 4000 1234",
  supportEmail: "support@packagemovers.in",
  operatingHours: "06:00 - 22:00 IST",
  minAdvanceNoticeHours: 4,
  maintenanceMode: false,
};

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<SystemSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchApi<{ settings?: Partial<SystemSettings> }>("/admin/settings");

      if (data.settings) {
        setSettings({
          platformName: data.settings.platformName || DEFAULT_SETTINGS.platformName,
          supportPhone: data.settings.supportPhone || DEFAULT_SETTINGS.supportPhone,
          supportEmail: data.settings.supportEmail || DEFAULT_SETTINGS.supportEmail,
          operatingHours: data.settings.operatingHours || DEFAULT_SETTINGS.operatingHours,
          minAdvanceNoticeHours:
            data.settings.minAdvanceNoticeHours !== undefined
              ? data.settings.minAdvanceNoticeHours
              : DEFAULT_SETTINGS.minAdvanceNoticeHours,
          maintenanceMode: Boolean(data.settings.maintenanceMode),
        });
      }
    } catch (err: any) {
      setError(err.message || "Failed to load system settings from MongoDB");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      await fetchApi("/admin/settings", {
        method: "PUT",
        body: JSON.stringify(settings),
      });

      setSuccess("System settings saved and synced with MongoDB Atlas successfully.");
      setTimeout(() => setSuccess(null), 4000);
    } catch (err: any) {
      setError(err.message || "Failed to save settings to MongoDB");
    } finally {
      setSaving(false);
    }
  };

  const handleResetDefaults = () => {
    setSettings(DEFAULT_SETTINGS);
  };

  return (
    <div className="space-y-6 font-sans text-[#1E293B]">
      {/* Header */}
      <PageHeader
        title="Platform Configuration & Governance"
        description="Configure marketplace brand identity, customer escalation hotlines, dispatch lead times, and system availability."
      >
        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchSettings}
            disabled={loading}
            className="neu-btn inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold text-[#1E293B] cursor-pointer disabled:opacity-50"
            title="Reload settings"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </PageHeader>

      {/* Notifications */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center justify-between gap-3 text-rose-700 text-xs shadow-neu-raised-sm animate-fadeIn">
          <div className="flex items-center gap-2.5">
            <AlertCircle size={17} className="shrink-0 text-rose-600" />
            <span className="font-medium">{error}</span>
          </div>
          <button
            type="button"
            onClick={fetchSettings}
            className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold shadow-xs transition cursor-pointer shrink-0"
          >
            Retry
          </button>
        </div>
      )}

      {success && (
        <div className="p-4 bg-teal-50 border border-teal-200 rounded-2xl flex items-center gap-2.5 text-teal-800 text-xs shadow-neu-raised-sm animate-fadeIn">
          <CheckCircle2 size={17} className="shrink-0 text-[#14B8A6]" />
          <span className="font-semibold">{success}</span>
        </div>
      )}

      {/* Top 4 Quick Telemetry & Status Badges */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. System Status */}
        <div className="bg-[#EEF2F6] p-4 rounded-2xl shadow-neu-flat border border-white/80 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#64748B]">Platform State</p>
            <p className="text-sm font-bold text-[#1E293B] mt-1 flex items-center gap-1.5">
              <span
                className={`h-2 w-2 rounded-full ${
                  settings.maintenanceMode ? "bg-rose-500 animate-pulse" : "bg-[#14B8A6] animate-pulse"
                }`}
              />
              {settings.maintenanceMode ? "Maintenance Active" : "Operational & Live"}
            </p>
            <p className="text-[11px] text-[#64748B] mt-0.5">
              {settings.maintenanceMode ? "Bookings paused" : "Accepting new bookings"}
            </p>
          </div>
          <div
            className={`h-10 w-10 rounded-xl shadow-neu-raised-sm flex items-center justify-center shrink-0 ${
              settings.maintenanceMode
                ? "bg-rose-50 text-rose-600 border border-rose-200/60"
                : "bg-teal-50 text-[#14B8A6] border border-teal-200/60"
            }`}
          >
            <Activity size={18} />
          </div>
        </div>

        {/* 2. Platform Brand */}
        <div className="bg-[#EEF2F6] p-4 rounded-2xl shadow-neu-flat border border-white/80 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#64748B]">Public Brand</p>
            <p className="text-sm font-bold text-[#1E293B] mt-1 truncate max-w-[140px]">
              {settings.platformName}
            </p>
            <p className="text-[11px] text-[#2563EB] font-medium mt-0.5">Customer Facing</p>
          </div>
          <div className="h-10 w-10 rounded-xl bg-blue-50 text-[#2563EB] border border-blue-200/60 shadow-neu-raised-sm flex items-center justify-center shrink-0">
            <Store size={18} />
          </div>
        </div>

        {/* 3. Operating Hours */}
        <div className="bg-[#EEF2F6] p-4 rounded-2xl shadow-neu-flat border border-white/80 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#64748B]">Operating Window</p>
            <p className="text-sm font-bold text-[#1E293B] mt-1 truncate max-w-[140px]">
              {settings.operatingHours}
            </p>
            <p className="text-[11px] text-[#0EA5E9] font-medium mt-0.5">Active Dispatch</p>
          </div>
          <div className="h-10 w-10 rounded-xl bg-sky-50 text-[#0EA5E9] border border-sky-200/60 shadow-neu-raised-sm flex items-center justify-center shrink-0">
            <Clock size={18} />
          </div>
        </div>

        {/* 4. Support Hotline */}
        <div className="bg-[#EEF2F6] p-4 rounded-2xl shadow-neu-flat border border-white/80 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#64748B]">Customer Helpline</p>
            <p className="text-sm font-bold text-[#1E293B] mt-1 font-mono truncate max-w-[140px]">
              {settings.supportPhone}
            </p>
            <p className="text-[11px] text-[#14B8A6] font-medium mt-0.5">Voice Escalations</p>
          </div>
          <div className="h-10 w-10 rounded-xl bg-teal-50 text-[#14B8A6] border border-teal-200/60 shadow-neu-raised-sm flex items-center justify-center shrink-0">
            <Headphones size={18} />
          </div>
        </div>
      </div>

      {/* Main 2-Column Layout */}
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column (7 cols): Marketplace Identity & Dispatch Rules */}
          <div className="lg:col-span-7 space-y-6">
            {/* Card 1: Marketplace Identity */}
            <div className="bg-[#EEF2F6] rounded-3xl shadow-neu-flat border border-white/80 p-6 space-y-5">
              <div className="flex items-center justify-between border-b border-[#D9E2EC]/70 pb-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-2xl bg-blue-50 shadow-neu-raised-sm border border-blue-200/60 flex items-center justify-center text-[#2563EB]">
                    <Store size={20} />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-[#1E293B]">Marketplace Identity & Working Hours</h2>
                    <p className="text-xs text-[#64748B]">Public brand name and booking schedule window broadcast to apps</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4 text-xs">
                <div>
                  <label className="block font-bold text-[#1E293B] mb-1.5 flex items-center gap-1.5">
                    <Sparkles size={13} className="text-[#2563EB]" />
                    <span>Platform Brand Name</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={settings.platformName}
                    onChange={(e) => setSettings({ ...settings, platformName: e.target.value })}
                    placeholder="e.g. Package Mover"
                    className="w-full bg-[#EEF2F6] shadow-neu-inset rounded-2xl border border-transparent focus:border-[#2563EB]/50 px-4 py-3 text-xs text-[#1E293B] outline-none transition font-medium"
                  />
                  <p className="text-[11px] text-[#64748B] mt-1.5">
                    Rendered in customer confirmation emails, invoice headers, and dispatch notifications.
                  </p>
                </div>

                <div>
                  <label className="block font-bold text-[#1E293B] mb-1.5 flex items-center gap-1.5">
                    <Clock size={13} className="text-[#0EA5E9]" />
                    <span>Daily Operating Window</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={settings.operatingHours}
                    onChange={(e) => setSettings({ ...settings, operatingHours: e.target.value })}
                    placeholder="e.g. 06:00 - 22:00 IST"
                    className="w-full bg-[#EEF2F6] shadow-neu-inset rounded-2xl border border-transparent focus:border-[#2563EB]/50 px-4 py-3 text-xs text-[#1E293B] outline-none transition font-medium"
                  />
                  <p className="text-[11px] text-[#64748B] mt-1.5">
                    Users can only schedule pickup times within this operational window.
                  </p>
                </div>
              </div>
            </div>

            {/* Card 2: Dispatch & Fulfillment Rules */}
            <div className="bg-[#EEF2F6] rounded-3xl shadow-neu-flat border border-white/80 p-6 space-y-5">
              <div className="flex items-center justify-between border-b border-[#D9E2EC]/70 pb-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-2xl bg-sky-50 shadow-neu-raised-sm border border-sky-200/60 flex items-center justify-center text-[#0EA5E9]">
                    <Truck size={20} />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-[#1E293B]">Dispatch Lead Times & Fulfillment Rules</h2>
                    <p className="text-xs text-[#64748B]">Scheduling policies and dropoff verification handshakes</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4 text-xs">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="font-bold text-[#1E293B] flex items-center gap-1.5">
                      <Sliders size={13} className="text-[#0EA5E9]" />
                      <span>Minimum Advance Notice Required</span>
                    </label>
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-[#2563EB] border border-blue-200/60 shadow-neu-inset-sm font-mono">
                      {settings.minAdvanceNoticeHours} Hours Notice
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      min="1"
                      max="72"
                      required
                      value={settings.minAdvanceNoticeHours}
                      onChange={(e) => setSettings({ ...settings, minAdvanceNoticeHours: Number(e.target.value) })}
                      className="w-28 bg-[#EEF2F6] shadow-neu-inset rounded-2xl border border-transparent focus:border-[#2563EB]/50 px-4 py-3 text-xs text-[#1E293B] font-mono font-bold outline-none text-center"
                    />
                    {/* Quick Preset Buttons */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {[2, 4, 8, 12, 24].map((h) => (
                        <button
                          key={h}
                          type="button"
                          onClick={() => setSettings({ ...settings, minAdvanceNoticeHours: h })}
                          className={`px-3 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
                            settings.minAdvanceNoticeHours === h
                              ? "bg-[#2563EB] text-white shadow-neu-raised-sm"
                              : "neu-btn text-[#64748B] hover:text-[#1E293B]"
                          }`}
                        >
                          {h}h
                        </button>
                      ))}
                    </div>
                  </div>
                  <p className="text-[11px] text-[#64748B] mt-1.5">
                    Earliest available time slot presented to customers during the online booking flow.
                  </p>
                </div>

                {/* Proof of Delivery Banner */}
                <div className="p-4 bg-[#EEF2F6] shadow-neu-inset-sm border border-white/60 rounded-2xl flex items-start gap-3.5">
                  <div className="h-9 w-9 rounded-xl bg-teal-50 shadow-neu-raised-sm border border-teal-200/60 flex items-center justify-center text-[#14B8A6] shrink-0 mt-0.5">
                    <ShieldCheck size={18} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-[#1E293B]">
                      4-Digit Recipient Confirmation Code Enforcement
                    </p>
                    <p className="text-[11px] text-[#64748B] mt-1 leading-relaxed">
                      Active database safety rule: Field crews must collect and input the unique 4-digit code generated for the customer at dropoff. Moves cannot be marked COMPLETED without this cryptographic handshake.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column (5 cols): Support Endpoints & Maintenance Control */}
          <div className="lg:col-span-5 space-y-6">
            {/* Card 3: Customer Support Contacts */}
            <div className="bg-[#EEF2F6] rounded-3xl shadow-neu-flat border border-white/80 p-6 space-y-5">
              <div className="flex items-center justify-between border-b border-[#D9E2EC]/70 pb-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-2xl bg-teal-50 shadow-neu-raised-sm border border-teal-200/60 flex items-center justify-center text-[#14B8A6]">
                    <Headphones size={20} />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-[#1E293B]">Support & Escalations</h2>
                    <p className="text-xs text-[#64748B]">Channels displayed to clients during active moves</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4 text-xs">
                <div>
                  <label className="block font-bold text-[#1E293B] mb-1.5 flex items-center gap-1.5">
                    <Phone size={13} className="text-[#14B8A6]" />
                    <span>Helpline Phone Number</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={settings.supportPhone}
                    onChange={(e) => setSettings({ ...settings, supportPhone: e.target.value })}
                    placeholder="+91 80 4000 1234"
                    className="w-full bg-[#EEF2F6] shadow-neu-inset rounded-2xl border border-transparent focus:border-[#2563EB]/50 px-4 py-3 text-xs text-[#1E293B] font-mono outline-none transition font-medium"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#1E293B] mb-1.5 flex items-center gap-1.5">
                    <Mail size={13} className="text-[#0EA5E9]" />
                    <span>Support Email Address</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={settings.supportEmail}
                    onChange={(e) => setSettings({ ...settings, supportEmail: e.target.value })}
                    placeholder="support@packagemovers.in"
                    className="w-full bg-[#EEF2F6] shadow-neu-inset rounded-2xl border border-transparent focus:border-[#2563EB]/50 px-4 py-3 text-xs text-[#1E293B] outline-none transition font-medium"
                  />
                </div>
              </div>
            </div>

            {/* Card 4: Maintenance Mode Control */}
            <div className="bg-[#EEF2F6] rounded-3xl shadow-neu-flat border border-white/80 p-6 space-y-5">
              <div className="flex items-center justify-between border-b border-[#D9E2EC]/70 pb-4">
                <div className="flex items-center gap-3">
                  <div
                    className={`h-10 w-10 rounded-2xl shadow-neu-raised-sm flex items-center justify-center ${
                      settings.maintenanceMode
                        ? "bg-rose-50 text-rose-600 border border-rose-200/60"
                        : "bg-amber-50 text-[#F59E0B] border border-amber-200/60"
                    }`}
                  >
                    <ShieldAlert size={20} />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-[#1E293B]">Maintenance & Availability</h2>
                    <p className="text-xs text-[#64748B]">Emergency freeze on new customer booking submissions</p>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-[#EEF2F6] shadow-neu-inset-sm border border-white/60 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-[#1E293B]">Maintenance Mode</p>
                    <p className="text-[11px] text-[#64748B]">
                      {settings.maintenanceMode ? "New bookings currently restricted" : "Platform operating normally"}
                    </p>
                  </div>

                  {/* Neumorphic Switch */}
                  <button
                    type="button"
                    onClick={() => setSettings({ ...settings, maintenanceMode: !settings.maintenanceMode })}
                    className={`relative inline-flex h-8 w-16 items-center rounded-full transition-colors cursor-pointer p-1 shadow-neu-inset ${
                      settings.maintenanceMode ? "bg-rose-500" : "bg-[#D9E2EC]/80"
                    }`}
                  >
                    <span
                      className={`inline-block h-6 w-6 transform rounded-full bg-white shadow-neu-raised-sm transition-transform ${
                        settings.maintenanceMode ? "translate-x-8" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>

                <p className="text-[11px] text-[#64748B] leading-relaxed pt-1 border-t border-[#D9E2EC]/60">
                  When enabled, customer and vendor portals present a graceful maintenance message. Administrative console functions remain 100% active.
                </p>
              </div>
            </div>

            {/* Card 5: Service Areas Link */}
            <div className="bg-[#EEF2F6] rounded-3xl shadow-neu-flat border border-white/80 p-5 flex items-center justify-between group">
              <div className="flex items-center gap-3.5">
                <div className="h-11 w-11 rounded-2xl bg-teal-50 shadow-neu-raised-sm border border-teal-200/60 flex items-center justify-center text-[#14B8A6] shrink-0">
                  <MapPin size={20} />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-[#1E293B]">Operational Service Areas</h3>
                  <p className="text-[11px] text-[#64748B] mt-0.5">
                    Configure operational cities and postal zone codes
                  </p>
                </div>
              </div>
              <Link
                href="/admin/service-areas"
                className="h-9 w-9 rounded-full bg-[#EEF2F6] shadow-neu-raised-sm group-hover:shadow-neu-flat active:shadow-neu-pressed border border-white/80 flex items-center justify-center text-[#2563EB] transition shrink-0 ml-2"
                title="Manage Service Areas"
              >
                <ChevronRight size={18} strokeWidth={2.5} />
              </Link>
            </div>
          </div>
        </div>

        {/* Anchored Bottom Actions Bar */}
        <div className="mt-8 bg-[#EEF2F6] rounded-3xl shadow-neu-flat border border-white/80 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2.5 text-xs text-[#64748B]">
            <ShieldCheck size={16} className="text-[#14B8A6] shrink-0" />
            <span>Parameters persist directly into MongoDB Atlas <code className="text-[#2563EB] font-mono">PlatformSetting</code> collection.</span>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={handleResetDefaults}
              disabled={saving}
              className="neu-btn inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold text-[#64748B] hover:text-[#1E293B] cursor-pointer transition disabled:opacity-50"
            >
              <RotateCcw size={14} />
              <span>Reset Defaults</span>
            </button>

            <button
              type="submit"
              disabled={saving || loading}
              className="neu-btn-primary inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold text-white shadow-neu-raised-sm hover:shadow-neu-flat active:shadow-neu-pressed cursor-pointer transition disabled:opacity-50"
            >
              <Save size={15} />
              <span>{saving ? "Saving Changes..." : "Save Platform Settings"}</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}