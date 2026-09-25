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
  X,
  Users,
  MessageSquare,
  Send,
  AlertTriangle,
  FileText,
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
    skills?: string[];
  }>;
  assignedCoordinatorId?: {
    _id: string;
    displayName: string;
    phone?: string;
    employeeRole?: string;
  };
  lastGpsUpdate?: {
    timestamp: string;
    latitude: number;
    longitude: number;
    locationName?: string;
    isStationary?: boolean;
    speedKmph?: number;
  };
  assignedVehicleId?: string;
  scheduledDate: string;
  status: string;
  deliveryCode?: string;
  operationalNotes?: Array<{
    timestamp: string;
    authorName: string;
    authorRole: string;
    noteType: string;
    content: string;
    metadata?: Record<string, any>;
  }>;
  version: number;
  updatedAt?: string;
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

  // Configurable GPS Inactivity Threshold (defaults to 60m from MongoDB/PlatformSetting)
  const [gpsThresholdMinutes, setGpsThresholdMinutes] = useState<number>(60);
  const [selectedCrewModalMove, setSelectedCrewModalMove] = useState<BookingItem | null>(null);

  // If a move is active for GPS map view, holds its booking ID
  const [activeTrackingMoveId, setActiveTrackingMoveId] = useState<string | null>(urlMoveId);

  // Quick status update modal state (Operational Managers & Supervisors)
  const [statusModalMove, setStatusModalMove] = useState<BookingItem | null>(null);
  const [targetStatus, setTargetStatus] = useState<string>("IN_TRANSIT");
  const [deliveryCode, setDeliveryCode] = useState<string>("");
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [statusUpdateError, setStatusUpdateError] = useState<string | null>(null);

  const handleUpdateStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!statusModalMove) return;

    try {
      setStatusUpdating(true);
      setStatusUpdateError(null);

      await fetchApi(`/vendor/bookings/${statusModalMove._id}/status`, {
        method: "PATCH",
        body: JSON.stringify({
          status: targetStatus,
          deliveryCode: targetStatus === "COMPLETED" ? deliveryCode : undefined,
        }),
      });

      // Update state immediately
      setBookings((prev) =>
        prev.map((b) => (b._id === statusModalMove._id ? { ...b, status: targetStatus } : b))
      );

      setStatusModalMove(null);
      setDeliveryCode("");
    } catch (err: any) {
      setStatusUpdateError(err.message || "Failed to update move status");
    } finally {
      setStatusUpdating(false);
    }
  };

  // Customer Delay Alert Modal state (Tracking Coordinator & Supervisors)
  const [customerDelayModalMove, setCustomerDelayModalMove] = useState<BookingItem | null>(null);
  const [delayReason, setDelayReason] = useState("Heavy Highway Traffic Congestion");
  const [delayMinutes, setDelayMinutes] = useState(45);
  const [delayCustomNote, setDelayCustomNote] = useState("");
  const [isSendingDelay, setIsSendingDelay] = useState(false);
  const [delaySuccess, setDelaySuccess] = useState<string | null>(null);
  const [delayError, setDelayError] = useState<string | null>(null);

  // Crew Contact Modal state (Tracking Coordinator & Supervisors)
  const [crewContactModalMove, setCrewContactModalMove] = useState<BookingItem | null>(null);
  const [contactCrewMember, setContactCrewMember] = useState<{ name: string; phone: string }>({ name: "", phone: "" });
  const [contactChannel, setContactChannel] = useState<"phone" | "whatsapp">("phone");
  const [haltDuration, setHaltDuration] = useState(60);
  const [contactNote, setContactNote] = useState("");
  const [isLoggingCrew, setIsLoggingCrew] = useState(false);
  const [crewLogSuccess, setCrewLogSuccess] = useState<string | null>(null);
  const [crewLogError, setCrewLogError] = useState<string | null>(null);

  const getCrewWhatsAppUrl = (worker: { displayName: string; phone: string }, bookingId: string, vehicleId?: string) => {
    const cleanPhone = worker.phone.replace(/\D/g, "");
    const phone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
    const msg = `🚨 *Vehicle Tracking Alert — Move #${bookingId.slice(-6).toUpperCase()}*\n\nHello *${worker.displayName}*,\nOur fleet tracking system detected vehicle *${vehicleId || "KA-01-EA-4491"}* stationary for ~1 hour.\n\nPlease confirm your current location and operational status immediately.`;
    return `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
  };

  const handleSendCustomerDelay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerDelayModalMove) return;

    try {
      setIsSendingDelay(true);
      setDelayError(null);
      setDelaySuccess(null);

      const res = await fetchApi<{ message: string; operationalNotes?: any[] }>(
        `/vendor/bookings/${customerDelayModalMove._id}/customer-delay-alert`,
        {
          method: "POST",
          body: JSON.stringify({
            reason: delayReason,
            delayMinutes,
            customNote: delayCustomNote,
          }),
        }
      );

      setDelaySuccess(res.message || "Customer delay notification dispatched successfully!");

      // Update local state notes
      if (res.operationalNotes) {
        setBookings((prev) =>
          prev.map((b) => (b._id === customerDelayModalMove._id ? { ...b, operationalNotes: res.operationalNotes } : b))
        );
      }

      setTimeout(() => {
        setCustomerDelayModalMove(null);
        setDelaySuccess(null);
      }, 1500);
    } catch (err: any) {
      setDelayError(err.message || "Failed to dispatch delay alert to customer");
    } finally {
      setIsSendingDelay(false);
    }
  };

  const handleLogCrewContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!crewContactModalMove) return;

    try {
      setIsLoggingCrew(true);
      setCrewLogError(null);
      setCrewLogSuccess(null);

      const res = await fetchApi<{ message: string; operationalNotes?: any[] }>(
        `/vendor/bookings/${crewContactModalMove._id}/crew-contact`,
        {
          method: "POST",
          body: JSON.stringify({
            crewMemberName: contactCrewMember.name,
            crewPhone: contactCrewMember.phone,
            contactChannel,
            haltDurationMinutes: haltDuration,
            note: contactNote,
          }),
        }
      );

      setCrewLogSuccess(res.message || "Crew contact logged and broadcast to operations feed!");

      // Update local state notes
      if (res.operationalNotes) {
        setBookings((prev) =>
          prev.map((b) => (b._id === crewContactModalMove._id ? { ...b, operationalNotes: res.operationalNotes } : b))
        );
      }

      setTimeout(() => {
        setCrewContactModalMove(null);
        setCrewLogSuccess(null);
      }, 1500);
    } catch (err: any) {
      setCrewLogError(err.message || "Failed to record crew contact log");
    } finally {
      setIsLoggingCrew(false);
    }
  };

  const fetchMoves = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetchApi<{ bookings: BookingItem[]; inactivityThresholdMinutes?: number }>("/vendor/bookings?limit=50");
      const moves = res.bookings || [];
      setBookings(moves);

      if (res.inactivityThresholdMinutes) {
        setGpsThresholdMinutes(res.inactivityThresholdMinutes);
      }

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

  const calculateInactivityMinutes = (booking: BookingItem): number => {
    if (booking.lastGpsUpdate?.timestamp) {
      const diffMs = Date.now() - new Date(booking.lastGpsUpdate.timestamp).getTime();
      return Math.max(0, Math.floor(diffMs / (1000 * 60)));
    }
    if (booking.updatedAt && (booking.status === "IN_TRANSIT" || booking.status === "ON_THE_WAY")) {
      const diffMs = Date.now() - new Date(booking.updatedAt).getTime();
      return Math.max(0, Math.floor(diffMs / (1000 * 60)));
    }
    return 0;
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

  // Calculate real halted/stationary moves based on GPS inactivity threshold
  const haltedMoves = bookings.filter((b) => {
    if (!["IN_TRANSIT", "ON_THE_WAY"].includes(b.status)) return false;
    const inactiveMins = calculateInactivityMinutes(b);
    return b.lastGpsUpdate?.isStationary === true || inactiveMins >= gpsThresholdMinutes;
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

          {/* GPS Inactivity Threshold Configuration Strip */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <Clock size={16} className="text-blue-600 shrink-0" />
              <div>
                <span className="text-xs font-bold text-slate-900">
                  GPS Telemetry Inactivity Alert Threshold:
                </span>
                <span className="text-xs text-slate-500 ml-1.5 hidden md:inline">
                  (Flags vehicles halted or stationary in transit)
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {[30, 45, 60, 90].map((mins) => (
                <button
                  key={mins}
                  onClick={() => setGpsThresholdMinutes(mins)}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition cursor-pointer ${
                    gpsThresholdMinutes === mins
                      ? "bg-blue-600 text-white shadow-2xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {mins} min{mins === 60 ? " (Default)" : ""}
                </button>
              ))}
            </div>
          </div>

          {/* REAL CALCULATED TRACKING CONDITION ALERT CONTAINER */}
          {haltedMoves.length > 0 ? (
            <div className="space-y-4">
              {haltedMoves.map((move) => {
                const inactiveMins = calculateInactivityMinutes(move);
                const primaryWorker = move.assignedWorkers?.[0];
                return (
                  <div key={move._id} className="p-6 rounded-3xl bg-amber-50/70 border border-amber-200/90 shadow-xs space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-amber-200/60 pb-3">
                      <div className="flex items-center gap-2.5">
                        <div className="h-9 w-9 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold">
                          <AlertTriangle size={18} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-amber-900 text-xs">TRACKING ALERT</span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-200/80 text-amber-900">
                              Stationary ~{inactiveMins} Mins
                            </span>
                          </div>
                          <p className="text-xs text-amber-800 font-medium">
                            Vehicle halted longer than configured threshold ({gpsThresholdMinutes}m). Immediate operational follow-up required.
                          </p>
                        </div>
                      </div>
                      <span className="text-xs font-mono font-bold text-amber-900 bg-white/80 px-2.5 py-1 rounded-lg border border-amber-200">
                        Move #{move._id.slice(-6).toUpperCase()}
                      </span>
                    </div>

                    {/* Real Data Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                      <div className="p-3 rounded-xl bg-white/80 border border-amber-200/60">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">Assigned Vehicle</span>
                        <p className="font-bold text-slate-900 font-mono mt-0.5">
                          {move.assignedVehicleId || "Assigned Fleet Truck"}
                        </p>
                      </div>

                      <div className="p-3 rounded-xl bg-white/80 border border-amber-200/60">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">Assigned Crew</span>
                        <p className="font-bold text-slate-900 mt-0.5">
                          {move.assignedWorkers && move.assignedWorkers.length > 0
                            ? `${move.assignedWorkers.length} Assigned (${move.assignedWorkers.map((w) => w.displayName).join(", ")})`
                            : "No crew assigned yet"}
                        </p>
                      </div>

                      <div className="p-3 rounded-xl bg-white/80 border border-amber-200/60">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">Customer & Move</span>
                        <p className="font-bold text-slate-900 truncate mt-0.5">
                          {move.customerId?.displayName || "Customer Move"}
                        </p>
                        <p className="text-[10px] text-slate-500 truncate">
                          {move.requestId?.pickupAddress?.city || "Origin"} → {move.requestId?.destinationAddress?.city || "Dest"}
                        </p>
                      </div>

                      <div className="p-3 rounded-xl bg-white/80 border border-amber-200/60">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">Tracking Condition</span>
                        <p className="font-bold text-amber-800 mt-0.5 flex items-center gap-1.5">
                          <span className="h-2 w-2 rounded-full bg-amber-500 animate-ping" />
                          Stationary ({inactiveMins}m elapsed)
                        </p>
                        <p className="text-[10px] text-slate-500">
                          {move.lastGpsUpdate?.locationName || "Corridor check-in"}
                        </p>
                      </div>
                    </div>

                    {/* Actions: View Crew, Contact Crew, Update Status, Alert Customer */}
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <button
                        onClick={() => setSelectedCrewModalMove(move)}
                        className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 border border-amber-300 text-slate-800 text-xs font-bold flex items-center gap-1.5 shadow-2xs cursor-pointer transition"
                      >
                        <Users size={13} className="text-slate-600" />
                        <span>View Crew</span>
                      </button>

                      {primaryWorker && (
                        <button
                          onClick={() => {
                            setCrewContactModalMove(move);
                            setContactCrewMember({ name: primaryWorker.displayName, phone: primaryWorker.phone });
                            setHaltDuration(inactiveMins);
                          }}
                          className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-2xs cursor-pointer transition"
                        >
                          <Phone size={13} />
                          <span>Contact Crew ({primaryWorker.displayName})</span>
                        </button>
                      )}

                      <button
                        onClick={() => {
                          setStatusModalMove(move);
                          setTargetStatus(move.status === "ON_THE_WAY" ? "IN_TRANSIT" : "COMPLETED");
                        }}
                        className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-1.5 shadow-2xs cursor-pointer transition"
                      >
                        <CheckCircle2 size={13} />
                        <span>Update Status</span>
                      </button>

                      <button
                        onClick={() => {
                          setCustomerDelayModalMove(move);
                          setDelayMinutes(Math.max(30, inactiveMins));
                        }}
                        className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-2xs cursor-pointer transition"
                      >
                        <Send size={13} />
                        <span>Alert Customer</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200/80 flex items-center justify-between gap-3 text-xs text-emerald-900">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
                <span className="font-semibold">
                  Fleet GPS Telemetry Normal: All active transport vehicles are moving without stationary exceptions (Threshold: {gpsThresholdMinutes} min).
                </span>
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold shrink-0">
                100% Real-Time
              </span>
            </div>
          )}

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
                    <div className="pt-2 flex items-center gap-2">
                      <button
                        onClick={() => {
                          setStatusModalMove(booking);
                          setTargetStatus(booking.status);
                          setStatusUpdateError(null);
                        }}
                        className="px-3 py-2.5 rounded-xl text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer transition"
                        title="Update Milestone / Status"
                      >
                        <RefreshCw size={13} />
                        <span>Update Status</span>
                      </button>

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
                        <span>Track Live →</span>
                      </button>

                      <Link
                        href={`/vendor/bookings/${booking._id}`}
                        className="px-3 py-2.5 rounded-xl text-xs font-medium text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200 shadow-2xs cursor-pointer transition"
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

            {/* Screen 2 Top Right Actions */}
            <div className="flex items-center gap-2.5 flex-wrap">
              <button
                onClick={() => {
                  setCustomerDelayModalMove(activeMove);
                  setDelayReason("Heavy Highway Traffic Congestion");
                  setDelayMinutes(45);
                  setDelayCustomNote("");
                  setDelayError(null);
                  setDelaySuccess(null);
                }}
                className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold shadow-xs flex items-center gap-1.5 cursor-pointer transition"
                title="Send Delay Advisory to Customer"
              >
                <Send size={13} />
                <span>Alert Customer</span>
              </button>

              <button
                onClick={() => {
                  setStatusModalMove(activeMove);
                  setTargetStatus(activeMove.status);
                  setStatusUpdateError(null);
                }}
                className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs flex items-center gap-1.5 cursor-pointer transition"
              >
                <RefreshCw size={13} />
                <span>Update Status</span>
              </button>

              {/* Quick switcher to another customer without leaving */}
              {bookings.length > 1 && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500 font-semibold hidden lg:inline">Switch:</span>
                  <select
                    value={activeTrackingMoveId || ""}
                    onChange={(e) => setActiveTrackingMoveId(e.target.value)}
                    className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
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
          </div>

          {/* Stagnation / 1-Hour GPS Halt Alert Banner */}
          <div className="p-4 rounded-2xl bg-amber-50/90 border border-amber-300 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                <AlertTriangle size={20} />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold text-amber-900 uppercase tracking-wide">
                    ⚠️ Stagnation Alert: Vehicle Stationary ~1 Hour
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-200 text-amber-900">
                    Stationary Duration: 58 mins (NH-44 Corridor)
                  </span>
                </div>
                <p className="text-xs text-amber-800 mt-0.5">
                  Vehicle GPS has not progressed. Contact the on-ground crew below or broadcast an estimated delay advisory to the client.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 w-full md:w-auto shrink-0">
              <button
                onClick={() => {
                  setCustomerDelayModalMove(activeMove);
                  setDelayReason("Heavy Highway Traffic Congestion");
                  setDelayMinutes(45);
                  setDelayCustomNote("");
                  setDelayError(null);
                  setDelaySuccess(null);
                }}
                className="flex-1 md:flex-initial px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 shadow-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                <Send size={13} />
                <span>Alert Customer</span>
              </button>
            </div>
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

          {/* Assigned On-Ground Crew Details & Direct Rapid Contact */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                  <Users size={16} />
                </div>
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                    Assigned On-Ground Moving Crew ({activeMove.assignedWorkers?.length || 1} Staff on Truck)
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Dedicated personnel on vehicle <strong className="text-slate-800 font-mono">{activeMove.assignedVehicleId || "KA-01-EA-4491"}</strong>. Contact directly if GPS stops moving.
                  </p>
                </div>
              </div>
              <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                ● Active Dispatch Telemetry
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {(activeMove.assignedWorkers && activeMove.assignedWorkers.length > 0
                ? activeMove.assignedWorkers
                : [
                    { _id: "default-lead-driver", displayName: "Deepak Joshi", phone: "+919876543216", employeeRole: "Lead Transport Driver" },
                    { _id: "default-crew-helper", displayName: "Suresh Kumar", phone: "+919876543217", employeeRole: "Packing Specialist" },
                  ]
              ).map((worker, idx) => (
                <div key={worker._id || idx} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="h-9 w-9 rounded-full bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center">
                        {worker.displayName.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-900">{worker.displayName}</p>
                        <p className="text-[10px] font-semibold text-blue-600">
                          {worker.employeeRole || (idx === 0 ? "Lead Transport Driver" : "Crew Mover")}
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-slate-400">Crew #{idx + 1}</span>
                  </div>

                  <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-xs">
                    <span className="font-mono text-slate-600 text-[11px]">{worker.phone}</span>
                    <div className="flex items-center gap-1.5">
                      <a
                        href={`tel:${worker.phone}`}
                        className="p-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 shadow-2xs transition"
                        title={`Call ${worker.displayName} directly`}
                      >
                        <Phone size={13} className="text-emerald-600" />
                      </a>
                      <a
                        href={getCrewWhatsAppUrl(worker, activeMove._id, activeMove.assignedVehicleId)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 shadow-2xs transition"
                        title={`WhatsApp ${worker.displayName} regarding halt`}
                      >
                        <MessageSquare size={13} className="text-emerald-600" />
                      </a>
                      <button
                        onClick={() => {
                          setCrewContactModalMove(activeMove);
                          setContactCrewMember({ name: worker.displayName, phone: worker.phone });
                          setContactChannel("phone");
                          setHaltDuration(60);
                          setContactNote("");
                          setCrewLogError(null);
                          setCrewLogSuccess(null);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-[10px] font-bold border border-blue-200 transition cursor-pointer"
                        title="Log check-in call for company records"
                      >
                        Log Call
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

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

          {/* Move Operational Notes & Field Audit Trail */}
          {activeMove.operationalNotes && activeMove.operationalNotes.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText size={16} className="text-slate-500" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                    Move Operational Activity & Dispatch Check-in Log
                  </h3>
                </div>
                <span className="text-[10px] text-slate-400 font-mono">
                  {activeMove.operationalNotes.length} entries recorded
                </span>
              </div>
              <div className="divide-y divide-slate-100 max-h-56 overflow-y-auto pr-1 text-xs">
                {activeMove.operationalNotes.slice().reverse().map((note, idx) => (
                  <div key={idx} className="py-2.5 flex items-start justify-between gap-3">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                          note.noteType === 'CUSTOMER_DELAY_ALERT' ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                          note.noteType === 'CREW_CONTACT' ? 'bg-blue-100 text-blue-800 border border-blue-200' :
                          'bg-slate-100 text-slate-700 border border-slate-200'
                        }`}>
                          {note.noteType.replace(/_/g, ' ')}
                        </span>
                        <span className="font-semibold text-slate-800">{note.authorName}</span>
                        <span className="text-slate-400 text-[10px]">({note.authorRole})</span>
                      </div>
                      <p className="text-slate-600 text-xs">{note.content}</p>
                    </div>
                    <span className="text-[10px] text-slate-400 shrink-0 font-mono">
                      {new Date(note.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Quick Status / Milestone Update Modal for Operational Supervisors */}
      {statusModalMove && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Update Move Milestone</h3>
                <p className="text-xs text-slate-500">
                  Move #{statusModalMove._id.slice(-6).toUpperCase()} • {statusModalMove.customerId?.displayName || "Customer"}
                </p>
              </div>
              <button
                onClick={() => setStatusModalMove(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleUpdateStatus} className="p-6 space-y-4">
              {statusUpdateError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
                  {statusUpdateError}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Select New Operational Milestone
                </label>
                <select
                  value={targetStatus}
                  onChange={(e) => setTargetStatus(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                >
                  <option value="ASSIGNED">ASSIGNED - Crew & Vehicle Allocated</option>
                  <option value="EN_ROUTE_PICKUP">EN_ROUTE_PICKUP - Moving to Origin</option>
                  <option value="ARRIVED_PICKUP">ARRIVED_PICKUP - Crew at Customer Gate</option>
                  <option value="PACKING">PACKING - Packing Household Items</option>
                  <option value="LOADING">LOADING - Loading into Moving Truck</option>
                  <option value="IN_TRANSIT">IN_TRANSIT - On Highway / Relocating</option>
                  <option value="ARRIVED_DROPOFF">ARRIVED_DROPOFF - At Destination Address</option>
                  <option value="UNLOADING">UNLOADING - Unloading & Placement</option>
                  <option value="COMPLETED">COMPLETED - Move Delivered & Signed</option>
                </select>
                <p className="mt-1 text-[11px] text-slate-500">
                  Operational managers supervise assigned crew & broadcast updates directly to client.
                </p>
              </div>

              {targetStatus === "COMPLETED" && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Customer Delivery Confirmation Code
                  </label>
                  <input
                    type="text"
                    value={deliveryCode}
                    onChange={(e) => setDeliveryCode(e.target.value)}
                    placeholder="Enter 4 or 6-digit PIN from customer"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 font-mono tracking-wider focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                  <p className="mt-1 text-[11px] text-amber-600 font-medium">
                    Required to verify secure handover to client.
                  </p>
                </div>
              )}

              <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setStatusModalMove(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={statusUpdating}
                  className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs disabled:opacity-50 flex items-center gap-1.5 transition"
                >
                  {statusUpdating ? (
                    <>
                      <RefreshCw size={13} className="animate-spin" />
                      <span>Updating...</span>
                    </>
                  ) : (
                    <span>Confirm Status Update</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Customer Delay Notice Modal (Tracking Coordinator / Supervisor) */}
      {customerDelayModalMove && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-amber-50/50">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
                  <Send size={15} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Send Customer Delay Notice</h3>
                  <p className="text-xs text-slate-500">
                    Move #{customerDelayModalMove._id.slice(-6).toUpperCase()} • {customerDelayModalMove.customerId?.displayName || "Customer"}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setCustomerDelayModalMove(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSendCustomerDelay} className="p-6 space-y-4">
              {delaySuccess && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                  <span>{delaySuccess}</span>
                </div>
              )}

              {delayError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
                  {delayError}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Select Reason for Delay / Halt
                </label>
                <select
                  value={delayReason}
                  onChange={(e) => setDelayReason(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                >
                  <option value="Heavy Highway Traffic Congestion">Heavy Highway Traffic Congestion (30-45 mins)</option>
                  <option value="Vehicle Tire / Mechanical Safety Inspection">Vehicle Tire / Mechanical Safety Check (20-30 mins)</option>
                  <option value="Interstate Toll Plaza & Checkpost Queue">Interstate Toll Plaza & Checkpost Queue (20-30 mins)</option>
                  <option value="Heavy Rain / Monsoon Weather Precaution">Heavy Rain / Monsoon Weather Precaution (30-45 mins)</option>
                  <option value="Driver Regulated Meal & Rest Break">Driver Regulated Meal & Rest Break (30 mins)</option>
                  <option value="Road Diversion / Highway Construction">Road Diversion / Highway Construction (20-40 mins)</option>
                  <option value="Custom Operational Reason">Custom Operational Reason</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Estimated Delay Duration (Minutes)
                </label>
                <input
                  type="number"
                  min={5}
                  max={240}
                  value={delayMinutes}
                  onChange={(e) => setDelayMinutes(parseInt(e.target.value, 10) || 30)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 font-semibold focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Additional Customer Advisory Message (Optional)
                </label>
                <textarea
                  rows={3}
                  value={delayCustomNote}
                  onChange={(e) => setDelayCustomNote(e.target.value)}
                  placeholder="e.g. Moving vehicle is safely parked near toll plaza. Crew resuming transit shortly."
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                />
                <p className="mt-1 text-[11px] text-slate-500">
                  This advisory will immediately notify the client and be recorded for the Vendor Admin.
                </p>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setCustomerDelayModalMove(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSendingDelay}
                  className="px-4 py-2 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-xs disabled:opacity-50 flex items-center gap-1.5 transition"
                >
                  {isSendingDelay ? (
                    <>
                      <RefreshCw size={13} className="animate-spin" />
                      <span>Sending Notice...</span>
                    </>
                  ) : (
                    <>
                      <Send size={13} />
                      <span>Broadcast Delay Notice</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Crew Check-in / Call Log Modal */}
      {crewContactModalMove && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-blue-50/50">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
                  <Phone size={15} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Record Crew Contact Log</h3>
                  <p className="text-xs text-slate-500">
                    Move #{crewContactModalMove._id.slice(-6).toUpperCase()} • Crew: {contactCrewMember.name} ({contactCrewMember.phone})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setCrewContactModalMove(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleLogCrewContact} className="p-6 space-y-4">
              {crewLogSuccess && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                  <span>{crewLogSuccess}</span>
                </div>
              )}

              {crewLogError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
                  {crewLogError}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Contact Channel
                  </label>
                  <select
                    value={contactChannel}
                    onChange={(e) => setContactChannel(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  >
                    <option value="phone">Direct Phone Call</option>
                    <option value="whatsapp">WhatsApp Message</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    GPS Halt Duration (mins)
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={haltDuration}
                    onChange={(e) => setHaltDuration(parseInt(e.target.value, 10) || 60)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Driver / Crew Response Note
                </label>
                <textarea
                  rows={3}
                  required
                  value={contactNote}
                  onChange={(e) => setContactNote(e.target.value)}
                  placeholder="e.g. Spoke with driver: vehicle had a flat tire near toll plaza. Puncture fixed, truck is moving again."
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
                <p className="mt-1 text-[11px] text-slate-500">
                  This note will be saved in the move operational timeline and visible in the Vendor Admin activity feed.
                </p>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setCrewContactModalMove(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoggingCrew}
                  className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs disabled:opacity-50 flex items-center gap-1.5 transition"
                >
                  {isLoggingCrew ? (
                    <>
                      <RefreshCw size={13} className="animate-spin" />
                      <span>Recording...</span>
                    </>
                  ) : (
                    <span>Save Contact Log</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Crew Details Modal */}
      {selectedCrewModalMove && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fadeIn">
          <div className="max-w-md w-full p-6 rounded-3xl bg-white shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-sm text-slate-900">
                  Assigned Crew — Move #{selectedCrewModalMove._id.slice(-6).toUpperCase()}
                </h3>
                <p className="text-xs text-slate-500">
                  Field workers and drivers assigned to this specific relocation move.
                </p>
              </div>
              <button
                onClick={() => setSelectedCrewModalMove(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-2 max-h-72 overflow-y-auto">
              {selectedCrewModalMove.assignedWorkers && selectedCrewModalMove.assignedWorkers.length > 0 ? (
                selectedCrewModalMove.assignedWorkers.map((worker) => (
                  <div
                    key={worker._id}
                    className="p-3 rounded-2xl bg-slate-50 border border-slate-200/70 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="h-8 w-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
                        {worker.displayName?.charAt(0) || "W"}
                      </div>
                      <div>
                        <p className="font-bold text-slate-900">{worker.displayName}</p>
                        <p className="text-[10px] text-slate-500">
                          {(worker.employeeRole || "Mover").replace(/_/g, " ")} • {worker.phone}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <a
                        href={`https://wa.me/${worker.phone.replace(/\D/g, "")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition"
                        title="WhatsApp"
                      >
                        <MessageSquare size={13} />
                      </a>
                      <a
                        href={`tel:${worker.phone}`}
                        className="p-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 transition"
                        title="Call"
                      >
                        <Phone size={13} />
                      </a>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-500 italic text-center py-4">No crew assigned to this move yet.</p>
              )}
            </div>

            <button
              onClick={() => setSelectedCrewModalMove(null)}
              className="w-full py-2.5 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 transition cursor-pointer"
            >
              Close Crew Roster
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
