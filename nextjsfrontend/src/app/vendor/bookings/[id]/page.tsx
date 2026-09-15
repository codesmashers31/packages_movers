"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { fetchApi } from "@/lib/api";
import StatusBadge from "@/app/admin/components/StatusBadge";
import {
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  User,
  Phone,
  Truck,
  HardHat,
  Package,
  Shield,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  RefreshCw,
  AlertTriangle,
  ChevronRight,
  Sparkles,
  Layers,
  X,
  Building2,
  Navigation,
  Check,
  CircleDot,
  Boxes,
  Car,
  BadgeAlert,
  ArrowRight,
} from "lucide-react";

interface Address {
  street?: string;
  city?: string;
  postalCode?: string;
  floor?: number;
  hasLift?: boolean;
  parkingDistanceMeters?: number;
}

interface InventoryItem {
  _id?: string;
  name: string;
  quantity: number;
  isFragile?: boolean;
}

interface WorkerOption {
  _id: string;
  displayName: string;
  phone: string;
  employeeRole?: string;
  availability?: string;
}

interface VehicleOption {
  _id: string;
  name: string;
  registrationNumber: string;
  vehicleType: string;
  capacity?: string;
  availability?: string;
  isActive: boolean;
}

interface BookingDetail {
  _id: string;
  customerId?: {
    _id: string;
    displayName: string;
    phone: string;
  };
  requestId?: {
    _id: string;
    pickupAddress?: Address;
    destinationAddress?: Address;
    preferredDate?: string;
    preferredTimeSlot?: string;
    items?: InventoryItem[];
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
  leadWorkerId?: {
    _id: string;
    displayName: string;
    phone: string;
  };
  assignedVehicleId?: string;
  scheduledDate: string;
  status: string;
  deliveryCode?: string;
  version: number;
  createdAt: string;
}

const MILESTONE_STAGES = [
  { key: "CONFIRMED", label: "Confirmed", shortLabel: "Confirmed" },
  { key: "ASSIGNED", label: "Assigned", shortLabel: "Assigned" },
  { key: "EN_ROUTE_PICKUP", label: "En Route", shortLabel: "En Route" },
  { key: "ARRIVED_PICKUP", label: "Arrived Origin", shortLabel: "Arrived Origin" },
  { key: "PACKING", label: "Packing", shortLabel: "Packing" },
  { key: "LOADING", label: "Loading", shortLabel: "Loading" },
  { key: "IN_TRANSIT", label: "In Transit", shortLabel: "In Transit" },
  { key: "ARRIVED_DROPOFF", label: "Arrived Dest", shortLabel: "Arrived Dest" },
  { key: "UNLOADING", label: "Unloading", shortLabel: "Unloading" },
  { key: "COMPLETED", label: "Completed", shortLabel: "Completed" },
];

export default function VendorBookingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const bookingId = resolvedParams.id;
  const router = useRouter();

  const [booking, setBooking] = useState<BookingDetail | null>(null);
  const [assignedVehicle, setAssignedVehicle] = useState<VehicleOption | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Resource Assignment Modal State
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [availableWorkers, setAvailableWorkers] = useState<WorkerOption[]>([]);
  const [availableVehicles, setAvailableVehicles] = useState<VehicleOption[]>([]);
  const [selectedWorkerIds, setSelectedWorkerIds] = useState<string[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>("");
  const [selectedLeadWorkerId, setSelectedLeadWorkerId] = useState<string>("");
  const [assignLoading, setAssignLoading] = useState(false);
  const [assignError, setAssignError] = useState<string | null>(null);

  // Milestone Advance State
  const [isAdvanceModalOpen, setIsAdvanceModalOpen] = useState(false);
  const [targetNextStatus, setTargetNextStatus] = useState<string>("");
  const [inputDeliveryCode, setInputDeliveryCode] = useState<string>("");
  const [advanceLoading, setAdvanceLoading] = useState(false);
  const [advanceError, setAdvanceError] = useState<string | null>(null);

  const fetchBookingDetail = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetchApi<{
        booking: BookingDetail;
        assignedVehicle: VehicleOption | null;
      }>(`/vendor/bookings/${bookingId}`);

      setBooking(res.booking);
      setAssignedVehicle(res.assignedVehicle);

      if (res.booking.assignedWorkers) {
        setSelectedWorkerIds(res.booking.assignedWorkers.map((w) => w._id));
      }
      if (res.booking.assignedVehicleId) {
        setSelectedVehicleId(res.booking.assignedVehicleId);
      }
      if (res.booking.leadWorkerId) {
        setSelectedLeadWorkerId(res.booking.leadWorkerId._id);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load booking details");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookingDetail();
  }, [bookingId]);

  // Open Resource Assignment Modal
  const openAssignModal = async () => {
    setIsAssignModalOpen(true);
    setAssignError(null);
    try {
      const [workersRes, vehiclesRes] = await Promise.all([
        fetchApi<{ workers: WorkerOption[] }>("/vendor/workers"),
        fetchApi<{ vehicles: VehicleOption[] }>("/vendor/vehicles"),
      ]);
      setAvailableWorkers(workersRes.workers || []);
      setAvailableVehicles(vehiclesRes.vehicles || []);

      if (booking?.assignedWorkers) {
        setSelectedWorkerIds(booking.assignedWorkers.map((w) => w._id));
      }
      if (booking?.assignedVehicleId) {
        setSelectedVehicleId(booking.assignedVehicleId);
      }
    } catch (err: any) {
      setAssignError(err.message || "Failed to load available resources");
    }
  };

  // Submit Resource Assignment
  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setAssignLoading(true);
      setAssignError(null);

      await fetchApi(`/vendor/bookings/${bookingId}/assign`, {
        method: "POST",
        body: JSON.stringify({
          workerIds: selectedWorkerIds,
          vehicleId: selectedVehicleId || undefined,
          leadWorkerId: selectedLeadWorkerId || selectedWorkerIds[0] || undefined,
        }),
      });

      setIsAssignModalOpen(false);
      fetchBookingDetail();
    } catch (err: any) {
      setAssignError(err.message || "Failed to assign resources to move");
    } finally {
      setAssignLoading(false);
    }
  };

  // Determine next milestone
  const currentStageIndex = MILESTONE_STAGES.findIndex((s) => s.key === booking?.status);
  const nextStage =
    currentStageIndex >= 0 && currentStageIndex < MILESTONE_STAGES.length - 1
      ? MILESTONE_STAGES[currentStageIndex + 1]
      : null;

  // Open Advance Milestone Modal
  const openAdvanceModal = (nextStatusKey: string) => {
    setTargetNextStatus(nextStatusKey);
    setInputDeliveryCode("");
    setAdvanceError(null);
    setIsAdvanceModalOpen(true);
  };

  // Submit Milestone Advance
  const handleAdvanceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setAdvanceLoading(true);
      setAdvanceError(null);

      await fetchApi(`/vendor/bookings/${bookingId}/status`, {
        method: "PATCH",
        body: JSON.stringify({
          status: targetNextStatus,
          deliveryCode: targetNextStatus === "COMPLETED" ? inputDeliveryCode.trim() : undefined,
        }),
      });

      setIsAdvanceModalOpen(false);
      fetchBookingDetail();
    } catch (err: any) {
      setAdvanceError(err.message || "Failed to advance milestone status");
    } finally {
      setAdvanceLoading(false);
    }
  };

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
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  if (loading && !booking) {
    return (
      <div className="py-24 text-center">
        <RefreshCw size={28} className="animate-spin text-[#2563EB] mx-auto mb-3" />
        <p className="font-bold text-sm text-[#1E293B]">Loading Move Operation Sheet...</p>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="p-6 bg-rose-50 border border-rose-200 rounded-2xl max-w-xl mx-auto my-12 text-center text-rose-800 shadow-xs">
        <AlertCircle size={32} className="text-rose-600 mx-auto mb-3" />
        <h3 className="font-bold text-base mb-1">Move Operation Not Found</h3>
        <p className="text-xs text-rose-700 mb-4">{error || "The requested booking does not belong to your vendor company."}</p>
        <Link
          href="/vendor/bookings"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 shadow-2xs transition"
        >
          <ArrowLeft size={14} />
          <span>Back to Bookings Roster</span>
        </Link>
      </div>
    );
  }

  const pickup = booking.requestId?.pickupAddress;
  const dropoff = booking.requestId?.destinationAddress;
  const items = booking.requestId?.items || [];
  const services = booking.requestId?.requestedServices || [];
  const assignedWorkers = booking.assignedWorkers || [];

  return (
    <div className="space-y-6 font-sans text-slate-800">
      {/* 1. Top Navigation Bar */}
      <div className="flex items-center justify-between">
        <Link
          href="/vendor/bookings"
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200/80 shadow-2xs cursor-pointer transition"
        >
          <ArrowLeft size={14} />
          <span>Back to Bookings Roster</span>
        </Link>

        <div className="flex items-center gap-2">
          <Link
            href="/vendor/tracking"
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold text-blue-600 hover:text-blue-700 bg-white hover:bg-slate-50 border border-slate-200/80 shadow-2xs cursor-pointer transition"
          >
            <Navigation size={14} />
            <span>Live GPS Map</span>
          </Link>

          <button
            onClick={fetchBookingDetail}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-800 bg-white hover:bg-slate-50 border border-slate-200/80 shadow-2xs cursor-pointer transition"
            title="Refresh Details"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* 2. Master Move Header Banner */}
      <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="space-y-2">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="font-mono font-extrabold text-2xl text-blue-600 tracking-tight">
              Move #{booking._id.slice(-6).toUpperCase()}
            </h1>
            <StatusBadge status={booking.status} />
            <span className="text-xs font-mono font-medium text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
              Revision v{booking.version}
            </span>
          </div>

          <div className="flex items-center gap-4 text-xs text-slate-500 flex-wrap">
            <div className="flex items-center gap-1.5">
              <Calendar size={14} className="text-blue-600" />
              <span className="font-semibold text-slate-800">{formatDate(booking.scheduledDate)}</span>
            </div>
            {booking.requestId?.preferredTimeSlot && (
              <div className="flex items-center gap-1.5">
                <Clock size={14} className="text-sky-600" />
                <span className="font-medium text-slate-700">Slot: {booking.requestId.preferredTimeSlot}</span>
              </div>
            )}
            <div className="flex items-center gap-1.5">
              <Package size={14} className="text-teal-600" />
              <span className="font-medium text-slate-700">
                {booking.quoteSnapshot?.packageCode || "Standard Move"} • {formatPrice(booking.quoteSnapshot?.totalAmountMinorUnits)}
              </span>
            </div>
          </div>
        </div>

        {/* Recipient PIN Badge */}
        {booking.deliveryCode && (
          <div className="p-3.5 rounded-xl bg-blue-50/60 border border-blue-100 flex items-center gap-3 self-start md:self-auto">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-xs shrink-0">
              <KeyRound size={18} />
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                Recipient Delivery PIN
              </p>
              <p className="text-lg font-mono font-black text-slate-900 tracking-widest leading-none mt-0.5">
                {booking.deliveryCode}
              </p>
              <p className="text-[10px] text-blue-600 font-medium mt-1">Verify upon dropoff completion</p>
            </div>
          </div>
        )}
      </div>

      {/* 3. Progressive Horizontal Operational Timeline Stepper */}
      <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0">
              <Truck size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                  Move Operational Lifecycle
                </h2>
                <span className="text-[11px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                  Stage {currentStageIndex + 1} of {MILESTONE_STAGES.length}
                </span>
              </div>
              <p className="text-xs text-slate-500">Real-time milestone progression across moving dispatch stages</p>
            </div>
          </div>

          {/* Advance Stage CTA Button right at the top! */}
          {nextStage && booking.status !== "COMPLETED" && booking.status !== "CANCELLED" && (
            <button
              onClick={() => openAdvanceModal(nextStage.key)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-xs flex items-center justify-center gap-2 cursor-pointer transition shrink-0"
            >
              <Sparkles size={15} />
              <span>Advance Stage to: {nextStage.label}</span>
            </button>
          )}

          {booking.status === "COMPLETED" && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-teal-50 border border-teal-200 text-teal-800 text-xs font-bold">
              <CheckCircle2 size={16} className="text-teal-600" />
              <span>Move Successfully Delivered & Completed</span>
            </div>
          )}
        </div>

        {/* Horizontal Stepper Graphic */}
        <div className="overflow-x-auto py-3">
          <div className="flex items-center justify-between min-w-[850px] relative px-4">
            {/* Background connecting track */}
            <div className="absolute left-8 right-8 top-4 h-1 bg-slate-200 -z-0 rounded-full" />
            {/* Active connecting track */}
            <div
              className="absolute left-8 top-4 h-1 bg-gradient-to-r from-blue-600 to-teal-500 -z-0 rounded-full transition-all duration-500"
              style={{
                width: `${Math.min(100, Math.max(0, (currentStageIndex / (MILESTONE_STAGES.length - 1)) * 100))}%`,
              }}
            />

            {MILESTONE_STAGES.map((stage, idx) => {
              const isPassed = currentStageIndex > idx;
              const isCurrent = currentStageIndex === idx;

              return (
                <div
                  key={stage.key}
                  className="flex flex-col items-center text-center relative z-10 group cursor-default"
                  style={{ width: "80px" }}
                >
                  <div
                    className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                      isCurrent
                        ? "bg-blue-600 text-white shadow-xs ring-4 ring-blue-100 scale-110"
                        : isPassed
                        ? "bg-teal-600 text-white shadow-xs"
                        : "bg-slate-100 text-slate-400 border border-slate-200"
                    }`}
                  >
                    {isPassed ? <Check size={14} strokeWidth={3} /> : idx + 1}
                  </div>

                  <p
                    className={`text-[11px] mt-2 font-semibold leading-tight line-clamp-2 ${
                      isCurrent
                        ? "text-blue-600 font-bold"
                        : isPassed
                        ? "text-slate-800"
                        : "text-slate-400"
                    }`}
                  >
                    {stage.shortLabel}
                  </p>

                  {isCurrent && (
                    <span className="h-1.5 w-1.5 rounded-full bg-blue-600 mt-1 animate-ping" />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 4. Two Balanced Columns (6 cols each) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Left Column: Route, Access & Customer Details */}
        <div className="space-y-6">
          {/* Relocation Route Card */}
          <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Navigation size={17} className="text-blue-600" />
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Relocation Corridors & Building Access
                </h3>
              </div>
            </div>

            {/* Visual Route Corridor */}
            <div className="space-y-4">
              {/* Origin / Pickup Card */}
              <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-200/80 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-blue-600">
                    <span className="h-2.5 w-2.5 rounded-full bg-blue-600 shadow-2xs" />
                    <span>ORIGIN PICKUP</span>
                  </div>
                  <span className="text-[10px] uppercase font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                    Floor {pickup?.floor !== undefined ? pickup.floor : "Ground"}
                  </span>
                </div>
                <p className="text-sm font-bold text-slate-900">
                  {pickup?.street || "Street address specified"}
                </p>
                <p className="text-xs text-slate-500">
                  {pickup?.city} {pickup?.postalCode ? `- ${pickup.postalCode}` : ""}
                </p>
                <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-xs text-slate-500">
                  <span className="flex items-center gap-1">
                    <Building2 size={13} className="text-blue-600" />
                    <span>Lift: {pickup?.hasLift ? "Available" : "No Lift (Stairs)"}</span>
                  </span>
                  <span>Parking: {pickup?.parkingDistanceMeters || 0}m distance</span>
                </div>
              </div>

              {/* Transit Distance Connector */}
              <div className="flex items-center justify-center gap-3 text-xs text-slate-500 py-0.5">
                <div className="h-px flex-1 bg-gradient-to-r from-blue-600/30 to-teal-500/30" />
                <div className="px-3 py-1 rounded-full bg-white border border-slate-200 shadow-2xs text-[11px] font-medium text-slate-700 flex items-center gap-1.5">
                  <Truck size={12} className="text-sky-600" />
                  <span>Scheduled Direct Transit</span>
                </div>
                <div className="h-px flex-1 bg-gradient-to-r from-sky-500/30 to-teal-500/30" />
              </div>

              {/* Destination / Dropoff Card */}
              <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-200/80 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-teal-600">
                    <span className="h-2.5 w-2.5 rounded-full bg-teal-500 shadow-2xs" />
                    <span>DESTINATION DROPOFF</span>
                  </div>
                  <span className="text-[10px] uppercase font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                    Floor {dropoff?.floor !== undefined ? dropoff.floor : "Ground"}
                  </span>
                </div>
                <p className="text-sm font-bold text-slate-900">
                  {dropoff?.street || "Street address specified"}
                </p>
                <p className="text-xs text-slate-500">
                  {dropoff?.city} {dropoff?.postalCode ? `- ${dropoff.postalCode}` : ""}
                </p>
                <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-xs text-slate-500">
                  <span className="flex items-center gap-1">
                    <Building2 size={13} className="text-teal-600" />
                    <span>Lift: {dropoff?.hasLift ? "Available" : "No Lift (Stairs)"}</span>
                  </span>
                  <span>Parking: {dropoff?.parkingDistanceMeters || 0}m distance</span>
                </div>
              </div>
            </div>

            {/* Customer Contact Strip */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-9 w-9 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-xs shrink-0">
                  {booking.customerId?.displayName?.charAt(0) || "C"}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-900 truncate">
                    {booking.customerId?.displayName || "Private Customer"}
                  </p>
                  <p className="text-[11px] text-slate-500 truncate">
                    {booking.customerId?.phone || "Phone not provided"}
                  </p>
                </div>
              </div>
              {booking.customerId?.phone && (
                <a
                  href={`tel:${booking.customerId.phone}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-blue-600 hover:text-blue-700 bg-white hover:bg-slate-50 border border-slate-200 shadow-2xs shrink-0 cursor-pointer transition"
                >
                  <Phone size={12} />
                  <span>Call Customer</span>
                </a>
              )}
            </div>

            {/* Contracted Services */}
            {services.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Contracted Moving Services
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {services.map((srv, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 border border-slate-200/80 text-slate-700"
                    >
                      {srv}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Crew & Fleet Resources + Cargo Manifest */}
        <div className="space-y-6">
          {/* Dispatched Crew & Fleet Card */}
          <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <HardHat size={17} className="text-blue-600" />
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Dispatched Crew & Fleet Resources
                </h3>
              </div>
              <button
                onClick={openAssignModal}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-blue-600 hover:text-blue-700 bg-white hover:bg-slate-50 border border-slate-200 shadow-2xs cursor-pointer transition"
              >
                <span>Dispatch / Reassign</span>
              </button>
            </div>

            {/* Assigned Crew Workers */}
            <div className="space-y-2">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Field Crew Members ({assignedWorkers.length})
              </p>
              {assignedWorkers.length === 0 ? (
                <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center justify-between">
                  <span>No crew members currently assigned.</span>
                  <button
                    onClick={openAssignModal}
                    className="font-bold underline text-amber-800 hover:text-amber-950 cursor-pointer"
                  >
                    Assign Now
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {assignedWorkers.map((w) => (
                    <div
                      key={w._id}
                      className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-2"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-xs shrink-0">
                          {w.displayName.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-slate-800 truncate">
                            {w.displayName}
                          </p>
                          <p className="text-[10px] text-slate-500">{w.phone}</p>
                        </div>
                      </div>
                      <span className="text-[10px] uppercase font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 shrink-0">
                        {w.employeeRole || "Crew"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Assigned Logistics Vehicle */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Assigned Logistics Vehicle
              </p>
              {booking.assignedVehicleId ? (
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-sky-500 to-teal-500 flex items-center justify-center text-white shrink-0 shadow-xs">
                      <Truck size={18} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-xs text-slate-800 bg-white px-2 py-0.5 rounded border border-slate-200">
                          {booking.assignedVehicleId}
                        </span>
                        <span className="text-xs font-bold text-slate-800">
                          {assignedVehicle?.name || "Logistics Commercial Fleet"}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {assignedVehicle?.vehicleType || "Medium Truck"} • Capacity: {assignedVehicle?.capacity || "1.5 Tons"}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center justify-between">
                  <span>No transport vehicle currently assigned.</span>
                  <button
                    onClick={openAssignModal}
                    className="font-bold underline text-amber-800 hover:text-amber-950 cursor-pointer"
                  >
                    Assign Vehicle
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Cargo Manifest Card */}
          <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Boxes size={17} className="text-blue-600" />
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Cargo Inventory Manifest ({items.length} Items)
                </h3>
              </div>
              <span className="text-xs font-mono font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-xl border border-blue-200">
                {formatPrice(booking.quoteSnapshot?.totalAmountMinorUnits)}
              </span>
            </div>

            {items.length === 0 ? (
              <div className="py-8 text-center text-slate-500 text-xs">
                <p>Standard household relocation manifest. No itemized breakdown logged.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {items.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="h-7 w-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                        <Package size={14} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-800 truncate">
                          {item.name}
                        </p>
                        {item.isFragile && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-600">
                            <BadgeAlert size={10} />
                            <span>Fragile Cargo</span>
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="font-mono font-bold text-xs text-slate-700 bg-white px-2.5 py-1 rounded-lg border border-slate-200 shrink-0">
                      Qty: {item.quantity}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MODAL 1: Resource Assignment Dialog */}
      {isAssignModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl border border-slate-200/80 p-6 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <HardHat size={18} className="text-blue-600" />
                <h3 className="text-sm font-bold text-slate-900">
                  Dispatch Crew & Fleet Resources
                </h3>
              </div>
              <button
                onClick={() => setIsAssignModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer transition"
              >
                <X size={16} />
              </button>
            </div>

            {assignError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle size={15} className="shrink-0 text-rose-600" />
                <span>{assignError}</span>
              </div>
            )}

            <form onSubmit={handleAssignSubmit} className="space-y-4">
              {/* Workers Selection */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-800">
                  Select Crew Workers:
                </label>
                <div className="max-h-48 overflow-y-auto space-y-1.5 p-2 rounded-xl bg-slate-50 border border-slate-200">
                  {availableWorkers.length === 0 ? (
                    <p className="text-xs text-slate-500 p-2">No workers registered in your roster.</p>
                  ) : (
                    availableWorkers.map((worker) => {
                      const isSelected = selectedWorkerIds.includes(worker._id);
                      return (
                        <label
                          key={worker._id}
                          className={`flex items-center justify-between p-2.5 rounded-lg text-xs cursor-pointer transition ${
                            isSelected
                              ? "bg-white shadow-2xs border border-slate-200"
                              : "hover:bg-white/60"
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedWorkerIds([...selectedWorkerIds, worker._id]);
                                } else {
                                  setSelectedWorkerIds(
                                    selectedWorkerIds.filter((id) => id !== worker._id)
                                  );
                                }
                              }}
                              className="accent-blue-600 h-3.5 w-3.5 rounded"
                            />
                            <div className="min-w-0">
                              <p className="font-semibold text-slate-800 truncate">
                                {worker.displayName}
                              </p>
                              <p className="text-[10px] text-slate-500">{worker.phone}</p>
                            </div>
                          </div>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                              worker.availability === "AVAILABLE"
                                ? "bg-teal-50 text-teal-700 border border-teal-200"
                                : "bg-amber-50 text-amber-700 border border-amber-200"
                            }`}
                          >
                            {worker.availability || "ACTIVE"}
                          </span>
                        </label>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Vehicle Selection */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-800">
                  Select Fleet Vehicle:
                </label>
                <select
                  value={selectedVehicleId}
                  onChange={(e) => setSelectedVehicleId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                >
                  <option value="">-- No vehicle assigned --</option>
                  {availableVehicles.map((veh) => (
                    <option key={veh._id} value={veh.registrationNumber}>
                      {veh.name} [{veh.registrationNumber}] - {veh.vehicleType} ({veh.availability || "ACTIVE"})
                    </option>
                  ))}
                </select>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAssignModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200 shadow-2xs cursor-pointer transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={assignLoading}
                  className="px-5 py-2 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-xs cursor-pointer disabled:opacity-50 transition"
                >
                  {assignLoading ? "Saving Dispatch..." : "Confirm Resource Dispatch"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Milestone Advance Dialog (with PIN code prompt if COMPLETED) */}
      {isAdvanceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-xl border border-slate-200/80 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles size={17} className="text-blue-600" />
                <h3 className="text-sm font-bold text-slate-900">
                  Advance Move Milestone
                </h3>
              </div>
              <button
                onClick={() => setIsAdvanceModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer transition"
              >
                <X size={16} />
              </button>
            </div>

            {advanceError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle size={15} className="shrink-0 text-rose-600" />
                <span>{advanceError}</span>
              </div>
            )}

            <form onSubmit={handleAdvanceSubmit} className="space-y-4">
              <p className="text-xs text-slate-700">
                Are you sure you want to transition this move operation to stage{" "}
                <span className="font-bold text-blue-600">{targetNextStatus}</span>?
              </p>

              {/* If target stage is COMPLETED, require delivery PIN */}
              {targetNextStatus === "COMPLETED" && (
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                    <KeyRound size={15} className="text-blue-600" />
                    <span>Recipient 4-Digit Delivery Confirmation PIN</span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Ask the customer / recipient at the dropoff destination for their 4-digit verification code.
                  </p>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    placeholder="Enter 4-digit code (e.g. 7482)"
                    value={inputDeliveryCode}
                    onChange={(e) => setInputDeliveryCode(e.target.value)}
                    className="w-full px-3 py-2 bg-white rounded-xl text-sm font-mono font-bold tracking-widest text-center text-slate-900 border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                  />
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAdvanceModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200 shadow-2xs cursor-pointer transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={advanceLoading}
                  className="px-5 py-2 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-xs cursor-pointer disabled:opacity-50 transition"
                >
                  {advanceLoading ? "Updating Milestone..." : "Confirm Milestone Advance"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
