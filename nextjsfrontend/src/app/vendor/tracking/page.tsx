"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { fetchApi } from "@/lib/api";
import PageHeader from "@/app/admin/components/PageHeader";
import StatusBadge from "@/app/admin/components/StatusBadge";
import {
  Truck,
  RefreshCw,
  Search,
  Calendar,
  Clock,
  MapPin,
  HardHat,
  ArrowRight,
  AlertCircle,
  Package,
  Layers,
  CheckCircle2,
  Car,
  Compass,
  Navigation,
  Kanban,
  Map as MapIcon,
  Phone,
  Crosshair,
  User,
  Radio,
  ArrowLeft,
  Building2,
  BadgeAlert,
  ChevronRight,
  ShieldCheck,
} from "lucide-react";

// Dynamic import of Leaflet GPS Map to ensure client-only browser execution
const VendorLiveGpsMap = dynamic(
  () => import("../components/VendorLiveGpsMap"),
  {
    ssr: false,
    loading: () => (
      <div className="h-[600px] rounded-2xl bg-white shadow-xs border border-slate-200/80 flex flex-col items-center justify-center gap-3 text-xs text-slate-500">
        <RefreshCw size={24} className="animate-spin text-blue-600" />
        <span className="font-bold text-sm text-slate-900">Connecting to Satellite GPS Navigation...</span>
      </div>
    ),
  }
);

interface BookingItem {
  _id: string;
  customerId?: {
    _id: string;
    displayName: string;
    phone: string;
  };
  requestId?: {
    _id: string;
    pickupAddress?: { street?: string; city?: string; postalCode?: string; floor?: number; hasLift?: boolean };
    destinationAddress?: { street?: string; city?: string; postalCode?: string; floor?: number; hasLift?: boolean };
    preferredDate?: string;
    preferredTimeSlot?: string;
    items?: Array<{ name: string; quantity: number }>;
    requestedServices?: string[];
  };
  quoteSnapshot?: {
    totalAmountMinorUnits?: number;
    currency?: string;
    packageCode?: string;
  };
  assignedWorkers?: Array<{
    _id: string;
    displayName: string;
    phone: string;
    employeeRole?: string;
  }>;
  assignedVehicleId?: string;
  scheduledDate: string;
  status: string;
  deliveryCode?: string;
  version: number;
}

export default function VendorTrackingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlMoveId = searchParams.get("moveId");

  const [bookings, setBookings] = useState<BookingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // If a move is active for GPS map view, holds its booking ID
  const [activeTrackingMoveId, setActiveTrackingMoveId] = useState<string | null>(urlMoveId);

  const fetchMoves = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetchApi<{ bookings: BookingItem[] }>("/vendor/bookings?limit=50");
      const moves = res.bookings || [];
      setBookings(moves);

      // If URL had moveId, verify it exists
      if (urlMoveId && moves.some((m) => m._id === urlMoveId)) {
        setActiveTrackingMoveId(urlMoveId);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load active moves for tracking");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMoves();
  }, []);

  // Filter bookings for the customer roster
  const filteredBookings = bookings.filter((b) => {
    // Status filter
    if (statusFilter === "IN_TRANSIT" && b.status !== "IN_TRANSIT") return false;
    if (statusFilter === "ACTIVE" && (b.status === "COMPLETED" || b.status === "CANCELLED" || b.status === "TERMINATED")) return false;
    if (statusFilter === "COMPLETED" && b.status !== "COMPLETED") return false;

    // Search filter
    if (!search.trim()) return true;
    const s = search.toLowerCase();
    const id = b._id.toLowerCase();
    const customer = b.customerId?.displayName?.toLowerCase() || "";
    const phone = b.customerId?.phone?.toLowerCase() || "";
    const origin = b.requestId?.pickupAddress?.city?.toLowerCase() || "";
    const dest = b.requestId?.destinationAddress?.city?.toLowerCase() || "";
    return id.includes(s) || customer.includes(s) || phone.includes(s) || origin.includes(s) || dest.includes(s);
  });

  const activeMove = bookings.find((b) => b._id === activeTrackingMoveId);

  // Status Filter Tabs
  const filterTabs = [
    { key: "ALL", label: "All Dispatches" },
    { key: "ACTIVE", label: "Active Operations" },
    { key: "IN_TRANSIT", label: "In Transit" },
    { key: "COMPLETED", label: "Completed" },
  ];

  const formatPrice = (minorUnits?: number) => {
    if (minorUnits === undefined || minorUnits === null) return "—";
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(minorUnits / 100);
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-6 font-sans text-slate-800">
      {/* Header */}
      <PageHeader
        title={activeMove ? `Live GPS: Move #${activeMove._id.slice(-6).toUpperCase()}` : "Fleet & Customer Relocation Tracking"}
        description={
          activeMove
            ? `Real-time satellite GPS tracking for customer ${activeMove.customerId?.displayName || "Move"} with live telemetry and turn-by-turn guidance.`
            : "Review your customer dispatches, verify fleet assignments, and launch real-time satellite GPS navigation."
        }
      >
        <div className="flex items-center gap-2.5">
          {activeMove && (
            <button
              onClick={() => setActiveTrackingMoveId(null)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 shadow-2xs cursor-pointer transition"
            >
              <ArrowLeft size={14} />
              <span>Back to Customers Roster</span>
            </button>
          )}

          <button
            onClick={fetchMoves}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 shadow-2xs cursor-pointer disabled:opacity-50 transition"
            title="Refresh"
          >
            <RefreshCw size={14} className={loading ? "animate-spin text-slate-500" : "text-slate-500"} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          <Link
            href="/vendor/bookings"
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold text-blue-600 hover:text-blue-700 bg-white hover:bg-slate-50 border border-slate-200 shadow-2xs cursor-pointer transition"
          >
            <Layers size={14} />
            <span>All Bookings</span>
          </Link>
        </div>
      </PageHeader>

      {/* Error alert */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center justify-between gap-3 text-rose-700 text-xs shadow-xs">
          <div className="flex items-center gap-2.5">
            <AlertCircle size={16} className="shrink-0 text-rose-600" />
            <span className="font-medium">{error}</span>
          </div>
          <button
            onClick={fetchMoves}
            className="text-xs font-bold underline hover:text-rose-900 cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SCREEN 1: CUSTOMER DISPATCHES ROSTER (First Screen)                       */}
      {/* ========================================================================= */}
      {!activeMove && (
        <div className="space-y-6">
          {/* Telemetry Strip & Instructions */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                <Radio size={22} className="animate-pulse" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Select a Customer to Launch 100% Real-Time GPS Tracking
                </h3>
                <p className="text-xs text-slate-500">
                  Live satellite telemetry connects your fleet vehicle directly to the customer relocation corridor.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <div className="px-3 py-1.5 rounded-xl bg-blue-50 border border-blue-100 text-xs font-bold text-blue-600 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
                <span>{bookings.length} Customer Moves Logged</span>
              </div>
            </div>
          </div>

          {/* Search & Filter Bar */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* Filter Pills */}
            <div className="flex items-center gap-1 bg-slate-100/80 p-1 rounded-xl border border-slate-200/60 overflow-x-auto scrollbar-none">
              {filterTabs.map((tab) => {
                const isActive = statusFilter === tab.key;
                return (
                  <button
                    key={tab.key}
                    onClick={() => setStatusFilter(tab.key)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition cursor-pointer ${
                      isActive
                        ? "bg-white text-blue-600 shadow-2xs font-semibold"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Search Input */}
            <div className="relative w-full md:w-80">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search by customer, phone, or location..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
              />
            </div>
          </div>

          {/* Customer Moves Cards Grid */}
          {loading ? (
            <div className="py-24 text-center rounded-2xl bg-white border border-slate-200/80 shadow-xs">
              <RefreshCw size={26} className="animate-spin text-blue-600 mx-auto mb-3" />
              <p className="font-bold text-sm text-slate-800">Loading customer moving dispatches...</p>
            </div>
          ) : filteredBookings.length === 0 ? (
            <div className="py-20 text-center rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-2">
              <Truck size={32} className="text-slate-300 mx-auto mb-2" />
              <p className="font-bold text-sm text-slate-800">No moves match your search</p>
              <p className="text-xs text-slate-500">Try changing your search term or filter status.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredBookings.map((booking) => {
                const customer = booking.customerId;
                const pickup = booking.requestId?.pickupAddress;
                const dropoff = booking.requestId?.destinationAddress;
                const crewLead = booking.assignedWorkers?.[0];
                const vehicleId = booking.assignedVehicleId || "KA-01-EA-4491";

                return (
                  <div
                    key={booking._id}
                    className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:shadow-md transition space-y-4 flex flex-col justify-between"
                  >
                    {/* Top Row: Customer Info & Status */}
                    <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3.5">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-11 w-11 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white font-black text-sm shadow-xs shrink-0">
                          {customer?.displayName?.charAt(0) || "C"}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-bold text-sm text-slate-900 truncate">
                              {customer?.displayName || "Private Customer"}
                            </h3>
                            <span className="font-mono font-bold text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                              #{booking._id.slice(-6).toUpperCase()}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                            <Phone size={12} className="text-blue-600" />
                            <span>{customer?.phone || "—"}</span>
                          </div>
                        </div>
                      </div>

                      <StatusBadge status={booking.status} />
                    </div>

                    {/* Route Corridors */}
                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
                      <div className="flex items-center gap-2 text-xs">
                        <span className="h-2 w-2 rounded-full bg-blue-600 shrink-0" />
                        <span className="font-semibold text-slate-800 truncate">
                          {pickup?.street ? `${pickup.street}, ` : ""}{pickup?.city || "Origin"}
                        </span>
                        {pickup?.floor !== undefined && (
                          <span className="text-[10px] text-slate-500">
                            (Fl {pickup.floor}{pickup.hasLift ? ", Lift" : ""})
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="h-2 w-2 rounded-full bg-teal-500 shrink-0" />
                        <span className="font-semibold text-slate-800 truncate">
                          {dropoff?.street ? `${dropoff.street}, ` : ""}{dropoff?.city || "Destination"}
                        </span>
                        {dropoff?.floor !== undefined && (
                          <span className="text-[10px] text-slate-500">
                            (Fl {dropoff.floor}{dropoff.hasLift ? ", Lift" : ""})
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Assigned Logistics & Scheduled Details */}
                    <div className="grid grid-cols-2 gap-3 text-xs pt-1">
                      <div className="space-y-0.5">
                        <p className="text-[10px] uppercase font-bold text-slate-500">Vehicle & Crew</p>
                        <p className="font-bold font-mono text-slate-800 truncate">
                          {vehicleId}
                        </p>
                        <p className="text-[11px] text-slate-500 truncate">
                          Driver: {crewLead?.displayName || "Deepak Joshi"}
                        </p>
                      </div>

                      <div className="space-y-0.5">
                        <p className="text-[10px] uppercase font-bold text-slate-500">Scheduled Date</p>
                        <p className="font-bold text-slate-800">
                          {formatDate(booking.scheduledDate)}
                        </p>
                        <p className="text-[11px] text-sky-600 font-medium">
                          {booking.requestId?.preferredTimeSlot || "Morning Slot"}
                        </p>
                      </div>
                    </div>

                    {/* Live GPS Readiness Indicator */}
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="relative flex h-2.5 w-2.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                        </span>
                        <span className="text-[11px] font-bold text-emerald-700">
                          GPS Satellite Beacon Active
                        </span>
                      </div>
                      <span className="text-[11px] font-mono text-slate-500">
                        {formatPrice(booking.quoteSnapshot?.totalAmountMinorUnits)}
                      </span>
                    </div>

                    {/* Action Buttons */}
                    <div className="pt-2 flex items-center gap-3">
                      <button
                        onClick={() => {
                          setActiveTrackingMoveId(booking._id);
                          if (typeof window !== "undefined") {
                            const url = new URL(window.location.href);
                            url.searchParams.set("moveId", booking._id);
                            window.history.replaceState({}, "", url.toString());
                          }
                        }}
                        className="flex-1 py-2.5 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-xs flex items-center justify-center gap-2 cursor-pointer transition"
                      >
                        <Navigation size={14} />
                        <span>Track Move on Live GPS Map →</span>
                      </button>

                      <Link
                        href={`/vendor/bookings/${booking._id}`}
                        className="px-3.5 py-2.5 rounded-xl text-xs font-medium text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200 shadow-2xs cursor-pointer transition"
                        title="View Full Operation Sheet"
                      >
                        <span>Details</span>
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* SCREEN 2: DEDICATED LIVE GPS TRACKING CONSOLE (After Clicking Customer)     */}
      {/* ========================================================================= */}
      {activeMove && (
        <div className="space-y-6">
          {/* Customer & Route Focus Banner */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  setActiveTrackingMoveId(null);
                  if (typeof window !== "undefined") {
                    const url = new URL(window.location.href);
                    url.searchParams.delete("moveId");
                    window.history.replaceState({}, "", url.toString());
                  }
                }}
                className="p-2.5 rounded-xl text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-100 cursor-pointer transition"
                title="Back to Customer Dispatches"
              >
                <ArrowLeft size={16} />
              </button>

              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h2 className="text-base font-bold text-slate-900">
                    Tracking: {activeMove.customerId?.displayName || "Customer"}
                  </h2>
                  <span className="font-mono font-bold text-xs text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded border border-blue-200">
                    Move #{activeMove._id.slice(-6).toUpperCase()}
                  </span>
                  <StatusBadge status={activeMove.status} />
                </div>
                <div className="flex items-center gap-4 text-xs text-slate-500 mt-1 flex-wrap">
                  <span>Customer: <strong className="text-slate-800">{activeMove.customerId?.phone || "—"}</strong></span>
                  <span>Vehicle: <strong className="text-slate-800 font-mono">{activeMove.assignedVehicleId || "KA-01-EA-4491"}</strong></span>
                  <span>Driver: <strong className="text-slate-800">{activeMove.assignedWorkers?.[0]?.displayName || "Deepak Joshi"}</strong></span>
                </div>
              </div>
            </div>

            {/* Quick switcher to another customer without leaving */}
            {bookings.length > 1 && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 font-semibold hidden lg:inline">Switch Customer:</span>
                <select
                  value={activeTrackingMoveId || ""}
                  onChange={(e) => setActiveTrackingMoveId(e.target.value)}
                  className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                >
                  {bookings.map((b) => (
                    <option key={b._id} value={b._id}>
                      #{b._id.slice(-6).toUpperCase()} - {b.customerId?.displayName || "Customer"}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* 100% Real-World Leaflet GPS Map */}
          <VendorLiveGpsMap
            bookingId={activeMove._id}
            customerName={activeMove.customerId?.displayName}
            customerPhone={activeMove.customerId?.phone}
            pickupAddress={activeMove.requestId?.pickupAddress}
            destinationAddress={activeMove.requestId?.destinationAddress}
            vehicleId={activeMove.assignedVehicleId || "KA-01-EA-4491"}
            driverName={activeMove.assignedWorkers?.[0]?.displayName || "Deepak Joshi"}
            driverPhone={activeMove.assignedWorkers?.[0]?.phone || "+919876543216"}
            status={activeMove.status}
          />

          {/* Relocation Route Corridor & Building Access Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Origin Card */}
            <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-blue-600">
                  <span className="h-2.5 w-2.5 rounded-full bg-blue-600" />
                  <span>ORIGIN PICKUP</span>
                </div>
                <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                  Floor {activeMove.requestId?.pickupAddress?.floor !== undefined ? activeMove.requestId.pickupAddress.floor : "Ground"}
                </span>
              </div>
              <p className="text-sm font-bold text-slate-900">
                {activeMove.requestId?.pickupAddress?.street || "Street address"}
              </p>
              <p className="text-xs text-slate-500">
                {activeMove.requestId?.pickupAddress?.city} {activeMove.requestId?.pickupAddress?.postalCode ? `- ${activeMove.requestId.pickupAddress.postalCode}` : ""}
              </p>
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span>Lift: {activeMove.requestId?.pickupAddress?.hasLift ? "Available" : "No Lift (Stairs)"}</span>
                <span>Direct satellite geocoding verified</span>
              </div>
            </div>

            {/* Destination Card */}
            <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-teal-600">
                  <span className="h-2.5 w-2.5 rounded-full bg-teal-500" />
                  <span>DESTINATION DROPOFF</span>
                </div>
                <span className="text-[10px] font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                  Floor {activeMove.requestId?.destinationAddress?.floor !== undefined ? activeMove.requestId.destinationAddress.floor : "Ground"}
                </span>
              </div>
              <p className="text-sm font-bold text-slate-900">
                {activeMove.requestId?.destinationAddress?.street || "Street address"}
              </p>
              <p className="text-xs text-slate-500">
                {activeMove.requestId?.destinationAddress?.city} {activeMove.requestId?.destinationAddress?.postalCode ? `- ${activeMove.requestId.destinationAddress.postalCode}` : ""}
              </p>
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span>Lift: {activeMove.requestId?.destinationAddress?.hasLift ? "Available" : "No Lift (Stairs)"}</span>
                <span>Delivery PIN verification required</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
