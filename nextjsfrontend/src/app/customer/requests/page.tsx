"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { fetchApi, getApiBaseUrl } from "@/lib/api";
import {
  Package,
  Calendar,
  MapPin,
  ArrowRight,
  CheckCircle2,
  XCircle,
  Clock,
  HelpCircle,
  Layers,
  Search,
  Plus,
  RefreshCw,
  LogOut,
  User,
  ShieldCheck,
  AlertCircle,
  Truck,
  Users,
  Calculator,
  Eye,
  FileText,
  Check,
} from "lucide-react";

interface MovingRequest {
  _id: string;
  pickupAddress: {
    street: string;
    city: string;
    postalCode: string;
  };
  destinationAddress: {
    street: string;
    city: string;
    postalCode: string;
  };
  preferredDate: string;
  preferredTimeSlot?: string;
  items?: Array<{ name: string; quantity: number; isFragile?: boolean }>;
  requestedServices?: string[];
  status: string;
  commonRejectionFeedback?: {
    reasons: string[];
    comment?: string;
    submittedAt: string;
  };
  createdAt: string;
}

interface QuoteItem {
  _id: string;
  vendorId?: {
    _id: string;
    businessName: string;
    contactPhone?: string;
    rating?: number;
  };
  totalAmountMinorUnits: number;
  currency: string;
  vehicleType?: string;
  vehicleSpecs?: string;
  crewCount?: number;
  crewRoles?: string;
  splitCharges?: {
    freightMinorUnits?: number;
    packingMaterialsMinorUnits?: number;
    loadingUnloadingMinorUnits?: number;
    dismantlingAssemblyMinorUnits?: number;
    insuranceMinorUnits?: number;
    taxGstMinorUnits?: number;
    otherMinorUnits?: number;
  };
  itemizedServices?: Array<{ serviceName: string; amountMinorUnits: number }>;
  inclusions?: string[];
  exclusions?: string[];
  assumptions?: string[];
  validUntil: string;
  status: string;
}

const PREDEFINED_REJECTION_REASONS = [
  "Price was too high",
  "Service/package did not meet my needs",
  "Delivery time was not suitable",
  "Preferred another option",
  "Required service was unavailable",
  "Schedule did not match",
  "Other",
];

export default function CustomerRequestsPage() {
  const [token, setToken] = useState<string | null>(null);
  const [phone, setPhone] = useState("+919876543211");
  const [otp, setOtp] = useState("123456");
  const [authLoading, setAuthLoading] = useState(false);

  const [requests, setRequests] = useState<MovingRequest[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<MovingRequest | null>(null);
  const [quotes, setQuotes] = useState<QuoteItem[]>([]);
  const [loadingQuotes, setLoadingQuotes] = useState(false);

  // Reject Modal state
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [selectedReasons, setSelectedReasons] = useState<string[]>([]);
  const [rejectionComment, setRejectionComment] = useState("");
  const [submittingRejection, setSubmittingRejection] = useState(false);

  // New Request Form Modal state
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [pickupCity, setPickupCity] = useState("Bangalore");
  const [pickupStreet, setPickupStreet] = useState("100 Feet Rd, Indiranagar");
  const [destCity, setDestCity] = useState("Chennai");
  const [destStreet, setDestStreet] = useState("Anna Nagar");
  const [moveDate, setMoveDate] = useState(new Date(Date.now() + 5 * 86400000).toISOString().split("T")[0]);
  const [creatingRequest, setCreatingRequest] = useState(false);

  const [viewEstimationModal, setViewEstimationModal] = useState<QuoteItem | null>(null);
  const [banner, setBanner] = useState<{ type: "success" | "error"; message: string } | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("customer_auth_token");
    if (stored) {
      setToken(stored);
    }
  }, []);

  useEffect(() => {
    if (token) {
      loadRequests();
    }
  }, [token]);

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setAuthLoading(true);
    setBanner(null);
    try {
      await fetch(`${getApiBaseUrl()}/auth/otp/request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const res = await fetch(`${getApiBaseUrl()}/auth/otp/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, otp, role: "customer" }),
      });
      const data = await res.json();
      if (!data.token) throw new Error(data.error?.message || "Login failed");
      localStorage.setItem("customer_auth_token", data.token);
      setToken(data.token);
      setBanner({ type: "success", message: "Authenticated as Customer!" });
    } catch (err: any) {
      setBanner({ type: "error", message: err.message || "Failed to log in" });
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignOut = () => {
    localStorage.removeItem("customer_auth_token");
    setToken(null);
    setRequests([]);
    setSelectedRequest(null);
    setQuotes([]);
  };

  const loadRequests = async () => {
    setLoadingRequests(true);
    try {
      const res = await fetch(`${getApiBaseUrl()}/requests`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setRequests(data.requests || []);
      if (data.requests && data.requests.length > 0) {
        handleSelectRequest(data.requests[0]);
      }
    } catch (err: any) {
      console.error("Failed to load requests:", err);
    } finally {
      setLoadingRequests(false);
    }
  };

  const handleSelectRequest = async (req: MovingRequest) => {
    setSelectedRequest(req);
    setLoadingQuotes(true);
    try {
      const res = await fetch(`${getApiBaseUrl()}/requests/${req._id}/quotes`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setQuotes(data.quotes || []);
    } catch (err: any) {
      console.error("Failed to load quotes for request:", err);
      setQuotes([]);
    } finally {
      setLoadingQuotes(false);
    }
  };

  const handleAcceptQuote = async (quoteId: string) => {
    if (!confirm("Are you sure you want to accept this quotation and confirm your booking?")) return;
    try {
      const res = await fetch(`${getApiBaseUrl()}/bookings`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ quoteId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || "Failed to accept quote");
      setBanner({ type: "success", message: "Quotation accepted! Move booking confirmed." });
      loadRequests();
    } catch (err: any) {
      setBanner({ type: "error", message: err.message || "Failed to accept quote" });
    }
  };

  const getEffectiveEstimation = (q: QuoteItem) => {
    const totalRupees = Math.round(q.totalAmountMinorUnits / 100);

    const vehicleType = q.vehicleType || (
      totalRupees >= 24000
        ? "22ft High-Cube Heavy Container Truck"
        : totalRupees >= 18000
        ? "17ft Multi-Axle Container Truck"
        : totalRupees <= 9000
        ? "Tata Ace 9ft Mini Truck"
        : "14ft Closed Container Truck"
    );

    const vehicleSpecs = q.vehicleSpecs || (
      totalRupees >= 24000
        ? "Maximum Volume Enclosed Truck, Heavy Machinery Ramp, Multi-Point Tie-Downs, GPS Live Tracking"
        : totalRupees >= 18000
        ? "Heavy-Duty Weatherproof Container, Hydraulic Lift, Air-Suspension Transit, GPS Real-time Tracking"
        : totalRupees <= 9000
        ? "Compact City Transit Vehicle, All-Weather Tarpaulin Protection, Heavy Cargo Straps"
        : "Weatherproof Closed Container, Hydraulic Tailgate Ramp, GPS Tracking, Transit Cargo Blankets"
    );

    const crewCount = q.crewCount || (
      totalRupees >= 24000 ? 5 : totalRupees >= 18000 ? 4 : totalRupees <= 9000 ? 2 : 3
    );

    const crewRoles = q.crewRoles || (
      totalRupees >= 24000
        ? "1 Move Coordinator & Driver, 3 Heavy-Load Packers, 1 Technician for Appliances"
        : totalRupees >= 18000
        ? "1 Fleet Lead & Driver, 2 Senior Packers, 1 Furniture Dismantling Specialist"
        : totalRupees <= 9000
        ? "1 Driver & Supervisor, 1 Professional Packer/Loader"
        : "1 Lead Driver & Supervisor, 2 Professional Packers & Loaders"
    );

    let split = q.splitCharges;
    const hasValidSplit = split && split.freightMinorUnits && split.freightMinorUnits > 0;
    if (!hasValidSplit) {
      const freight = Math.round((totalRupees * 0.38) / 100) * 100;
      const packing = Math.round((totalRupees * 0.20) / 100) * 100;
      const loading = Math.round((totalRupees * 0.16) / 100) * 100;
      const dismantling = Math.round((totalRupees * 0.09) / 100) * 100;
      const insurance = Math.round((totalRupees * 0.05) / 100) * 100;
      const other = Math.round((totalRupees * 0.03) / 100) * 100;
      const sub = freight + packing + loading + dismantling + insurance + other;
      const taxGst = Math.max(0, totalRupees - sub);

      split = {
        freightMinorUnits: freight * 100,
        packingMaterialsMinorUnits: packing * 100,
        loadingUnloadingMinorUnits: loading * 100,
        dismantlingAssemblyMinorUnits: dismantling * 100,
        insuranceMinorUnits: insurance * 100,
        taxGstMinorUnits: taxGst * 100,
        otherMinorUnits: other * 100,
      };
    }

    return { vehicleType, vehicleSpecs, crewCount, crewRoles, splitCharges: split };
  };

  const handleOpenRejectModal = () => {
    setSelectedReasons([]);
    setRejectionComment("");
    setRejectModalOpen(true);
  };

  const handleToggleReason = (reason: string) => {
    if (selectedReasons.includes(reason)) {
      setSelectedReasons(selectedReasons.filter((r) => r !== reason));
    } else {
      setSelectedReasons([...selectedReasons, reason]);
    }
  };

  const handleExecuteRejection = async (skipFeedback: boolean) => {
    if (!selectedRequest) return;
    setSubmittingRejection(true);
    setBanner(null);

    try {
      const payload: any = {};
      if (!skipFeedback) {
        payload.reasons = selectedReasons;
        if (rejectionComment.trim()) payload.comment = rejectionComment.trim();
      }

      const res = await fetch(`${getApiBaseUrl()}/requests/${selectedRequest._id}/reject-all`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || "Failed to reject quotations");

      setBanner({
        type: "success",
        message: skipFeedback
          ? "Quotations rejected without feedback."
          : "Quotations rejected. Thank you for sharing feedback with participating movers!",
      });

      setRejectModalOpen(false);
      loadRequests();
    } catch (err: any) {
      setBanner({ type: "error", message: err.message || "Failed to reject quotations" });
    } finally {
      setSubmittingRejection(false);
    }
  };

  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatingRequest(true);
    setBanner(null);

    try {
      const res = await fetch(`${getApiBaseUrl()}/requests`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          pickupAddress: { street: pickupStreet, city: pickupCity, postalCode: "560001" },
          destinationAddress: { street: destStreet, city: destCity, postalCode: "600001" },
          preferredDate: new Date(moveDate).toISOString(),
          items: [
            { name: "Living Room Sofa Set", quantity: 1, isFragile: false },
            { name: "Glass Coffee Table", quantity: 1, isFragile: true },
            { name: "Washing Machine", quantity: 1, isFragile: false },
          ],
          requestedServices: ["packing", "loading", "transport", "unloading"],
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || "Failed to create request");

      setBanner({ type: "success", message: "New moving request posted to marketplace!" });
      setCreateModalOpen(false);
      loadRequests();
    } catch (err: any) {
      setBanner({ type: "error", message: err.message || "Failed to create request" });
    } finally {
      setCreatingRequest(false);
    }
  };

  const formatPaise = (paise?: number) => {
    if (!paise) return "₹0";
    return `₹${(paise / 100).toLocaleString("en-IN")}`;
  };

  return (
    <div className="min-h-screen bg-[#EEF2F6] text-[#1E293B] font-sans p-6 sm:p-10">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Navigation Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-3xl bg-[#EEF2F6] shadow-neu-flat border border-white/80">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-[#2563EB] to-[#0EA5E9] flex items-center justify-center text-white font-black text-base shadow-neu-raised-sm">
              PM
            </div>
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#0EA5E9]">
                Customer Marketplace
              </span>
              <h1 className="text-xl font-black text-[#1E293B]">My Move Requests & Quotations</h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/vendor"
              className="px-3.5 py-2 rounded-xl bg-[#EEF2F6] text-xs font-bold text-[#2563EB] shadow-neu-raised hover:shadow-neu-flat active:shadow-neu-pressed border border-white/80 transition-all"
            >
              Vendor Portal &rarr;
            </Link>
            {token ? (
              <button
                onClick={handleSignOut}
                className="px-3.5 py-2 rounded-xl bg-rose-50 text-rose-700 text-xs font-bold shadow-neu-raised hover:shadow-neu-flat flex items-center gap-1.5"
              >
                <LogOut size={14} /> Sign Out
              </button>
            ) : null}
          </div>
        </div>

        {/* Alert Banner */}
        {banner && (
          <div
            className={`p-4 rounded-2xl flex items-center justify-between border shadow-neu-inset-sm transition-all ${
              banner.type === "success"
                ? "bg-emerald-50/90 border-emerald-200 text-emerald-800"
                : "bg-rose-50/90 border-rose-200 text-rose-800"
            }`}
          >
            <div className="flex items-center gap-3">
              {banner.type === "success" ? (
                <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle size={18} className="text-rose-600 shrink-0" />
              )}
              <span className="text-xs font-bold">{banner.message}</span>
            </div>
            <button onClick={() => setBanner(null)} className="text-xs font-bold opacity-70 hover:opacity-100">
              ✕
            </button>
          </div>
        )}

        {/* Login State if not authenticated */}
        {!token ? (
          <div className="p-8 sm:p-12 rounded-3xl bg-[#EEF2F6] shadow-neu-flat border border-white/80 max-w-md mx-auto space-y-6 text-center">
            <div className="h-12 w-12 rounded-2xl bg-blue-50 text-[#2563EB] flex items-center justify-center mx-auto shadow-neu-inset-sm">
              <User size={24} />
            </div>
            <div className="space-y-1">
              <h2 className="text-lg font-black text-[#1E293B]">Customer Access</h2>
              <p className="text-xs text-[#64748B]">Sign in to review vendor quotations and manage moves</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4 text-left">
              <div className="space-y-1">
                <label className="text-xs font-bold text-[#1E293B]">Mobile Phone</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#EEF2F6] shadow-neu-inset-sm border border-[#D9E2EC]/80 text-xs font-semibold focus:outline-none"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-[#1E293B]">Verification OTP</label>
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#EEF2F6] shadow-neu-inset-sm border border-[#D9E2EC]/80 text-xs font-semibold focus:outline-none"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={authLoading}
                className="w-full py-2.5 rounded-xl bg-[#2563EB] text-white text-xs font-bold shadow-neu-raised hover:bg-blue-600 active:shadow-neu-pressed transition-all"
              >
                {authLoading ? "Authenticating..." : "Sign In with OTP (Default: 123456)"}
              </button>
            </form>
          </div>
        ) : (
          /* Main Customer Workspace */
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column: Moving Requests List */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black uppercase tracking-wider text-[#1E293B]">
                  Your Requests ({requests.length})
                </h3>
                <button
                  onClick={() => setCreateModalOpen(true)}
                  className="px-3 py-1.5 rounded-xl bg-[#2563EB] text-white text-[11px] font-bold shadow-neu-raised hover:bg-blue-600 active:shadow-neu-pressed flex items-center gap-1"
                >
                  <Plus size={13} /> New Move
                </button>
              </div>

              {loadingRequests ? (
                <div className="p-8 text-center text-xs text-[#64748B]">Loading requests...</div>
              ) : requests.length === 0 ? (
                <div className="p-8 text-center rounded-2xl bg-[#EEF2F6] shadow-neu-flat border border-white/80 space-y-2">
                  <p className="text-xs font-bold text-[#1E293B]">No moving requests found.</p>
                  <button
                    onClick={() => setCreateModalOpen(true)}
                    className="text-xs text-[#2563EB] font-bold hover:underline"
                  >
                    Create a Move Request &rarr;
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {requests.map((r) => {
                    const isSelected = selectedRequest?._id === r._id;
                    return (
                      <div
                        key={r._id}
                        onClick={() => handleSelectRequest(r)}
                        className={`p-4 rounded-2xl cursor-pointer transition-all border ${
                          isSelected
                            ? "bg-white/80 border-[#2563EB] shadow-neu-raised"
                            : "bg-[#EEF2F6] border-white/80 hover:bg-white/40 shadow-neu-flat"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] font-black text-[#2563EB]">
                            REQ #{r._id.slice(-6).toUpperCase()}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                              r.status === "OPEN"
                                ? "bg-emerald-100 text-emerald-800"
                                : r.status === "BOOKED"
                                ? "bg-blue-100 text-[#2563EB]"
                                : "bg-slate-100 text-slate-700"
                            }`}
                          >
                            {r.status}
                          </span>
                        </div>

                        <div className="text-xs font-extrabold text-[#1E293B] flex items-center gap-1.5">
                          <span>{r.pickupAddress.city}</span>
                          <ArrowRight size={12} className="text-[#0EA5E9]" />
                          <span>{r.destinationAddress.city}</span>
                        </div>

                        <div className="text-[11px] text-[#64748B] mt-1">
                          Move: {new Date(r.preferredDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Right Column: Quotes & Actions for Selected Request */}
            <div className="lg:col-span-2 space-y-5">
              {selectedRequest ? (
                <>
                  {/* Selected Request Detail Header */}
                  <div className="p-5 rounded-3xl bg-[#EEF2F6] shadow-neu-flat border border-white/80 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#D9E2EC]/70">
                      <div>
                        <span className="text-[10px] font-black uppercase text-[#0EA5E9]">Active Moving Request</span>
                        <h2 className="text-base font-black text-[#1E293B]">
                          {selectedRequest.pickupAddress.city} → {selectedRequest.destinationAddress.city}
                        </h2>
                      </div>

                      <div className="flex items-center gap-2">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-black ${
                            selectedRequest.status === "OPEN"
                              ? "bg-emerald-100 text-emerald-800"
                              : selectedRequest.status === "BOOKED"
                              ? "bg-blue-100 text-[#2563EB]"
                              : "bg-slate-100 text-slate-700"
                          }`}
                        >
                          Status: {selectedRequest.status}
                        </span>

                        {selectedRequest.status === "OPEN" && quotes.length > 0 && (
                          <button
                            onClick={handleOpenRejectModal}
                            className="px-3 py-1 rounded-xl bg-rose-50 text-rose-700 text-xs font-bold border border-rose-200 shadow-neu-raised hover:shadow-neu-flat"
                          >
                            Reject All Quotations
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div>
                        <span className="text-[10px] text-[#64748B] font-bold block">Pickup</span>
                        <p className="font-semibold">{selectedRequest.pickupAddress.street}, {selectedRequest.pickupAddress.city}</p>
                      </div>
                      <div>
                        <span className="text-[10px] text-[#64748B] font-bold block">Destination</span>
                        <p className="font-semibold">{selectedRequest.destinationAddress.street}, {selectedRequest.destinationAddress.city}</p>
                      </div>
                    </div>

                    {/* Common Feedback Display if already closed with feedback */}
                    {selectedRequest.commonRejectionFeedback && (
                      <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-900 space-y-1">
                        <span className="font-black text-[10px] uppercase tracking-wider text-rose-700">
                          Rejection Feedback Shared with Movers
                        </span>
                        <p className="font-bold">
                          Reasons: {selectedRequest.commonRejectionFeedback.reasons.join(", ")}
                        </p>
                        {selectedRequest.commonRejectionFeedback.comment && (
                          <p className="italic text-rose-800">
                            "{selectedRequest.commonRejectionFeedback.comment}"
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Vendor Quotations List */}
                  <div className="space-y-3">
                    <h3 className="text-xs font-black uppercase tracking-wider text-[#1E293B]">
                      Received Vendor Quotations ({quotes.length})
                    </h3>

                    {loadingQuotes ? (
                      <div className="p-8 text-center text-xs text-[#64748B]">Loading vendor quotes...</div>
                    ) : quotes.length === 0 ? (
                      <div className="p-8 text-center rounded-2xl bg-[#EEF2F6] shadow-neu-flat border border-white/80 text-xs text-[#64748B]">
                        No quotations have been submitted by vendors for this request yet.
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {quotes.map((q) => {
                          const est = getEffectiveEstimation(q);
                          return (
                            <div
                              key={q._id}
                              className="p-5 rounded-3xl bg-[#EEF2F6] shadow-neu-flat border border-white/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                            >
                              <div className="space-y-1.5 flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-black text-[#1E293B]">
                                    {q.vendorId?.businessName || "Verified Move Vendor"}
                                  </span>
                                  {q.status === "ACCEPTED" && (
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800">
                                      ACCEPTED
                                    </span>
                                  )}
                                </div>

                                <p className="text-xl font-black text-[#2563EB]">
                                  {formatPaise(q.totalAmountMinorUnits)}
                                </p>

                                {/* Operational Estimation Tags */}
                                <div className="flex flex-wrap items-center gap-2 pt-0.5">
                                  <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-white text-[#1E293B] border border-[#CBD5E1]/70 shadow-sm flex items-center gap-1">
                                    <Truck size={11} className="text-[#0EA5E9]" />
                                    {est.vehicleType}
                                  </span>
                                  <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-white text-[#1E293B] border border-[#CBD5E1]/70 shadow-sm flex items-center gap-1">
                                    <Users size={11} className="text-[#2563EB]" />
                                    {est.crewCount} Dedicated Crew
                                  </span>
                                  <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                                    <Calculator size={11} className="text-emerald-600" />
                                    Split Charges Ready
                                  </span>
                                </div>

                                <div className="text-xs text-[#64748B] flex flex-wrap gap-x-3 pt-0.5">
                                  <span>Valid until: {new Date(q.validUntil).toLocaleDateString()}</span>
                                  {q.inclusions && q.inclusions.length > 0 && (
                                    <span>• Includes: {q.inclusions[0]}</span>
                                  )}
                                </div>
                              </div>

                              <div className="flex sm:flex-col items-center sm:items-end gap-2 shrink-0">
                                <button
                                  onClick={() => setViewEstimationModal(q)}
                                  className="px-3.5 py-1.5 rounded-xl bg-[#EEF2F6] text-[#1E293B] text-xs font-bold shadow-neu-raised hover:shadow-neu-flat active:shadow-neu-pressed border border-white/80 transition-all flex items-center gap-1.5"
                                >
                                  <Eye size={13} className="text-[#0EA5E9]" />
                                  Full Estimation Sheet
                                </button>

                                {selectedRequest.status === "OPEN" && q.status === "SUBMITTED" && (
                                  <button
                                    onClick={() => handleAcceptQuote(q._id)}
                                    className="px-4 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-bold shadow-neu-raised hover:bg-emerald-700 active:shadow-neu-pressed transition-all shrink-0"
                                  >
                                    Accept & Book Move
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="p-12 text-center text-xs text-[#64748B]">Select a request from the left column.</div>
              )}
            </div>
          </div>
        )}

        {/* CUSTOMER REJECTION & COMMON FEEDBACK MODAL */}
        {rejectModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fadeIn">
            <div className="max-w-lg w-full p-6 rounded-3xl bg-[#EEF2F6] shadow-neu-raised border border-white/90 space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-[#D9E2EC]/80">
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#0EA5E9]">
                    Decline Quotations
                  </span>
                  <h3 className="text-base font-black text-[#1E293B]">
                    Help us understand why you didn't choose a quotation
                  </h3>
                </div>
                <button
                  onClick={() => setRejectModalOpen(false)}
                  className="h-8 w-8 rounded-xl bg-[#EEF2F6] text-[#64748B] hover:text-[#1E293B] flex items-center justify-center shadow-neu-flat font-bold"
                >
                  ✕
                </button>
              </div>

              <p className="text-xs text-[#64748B] leading-relaxed">
                Select one or more reasons below (optional). This common feedback will be shared with the movers who quoted so they can improve their pricing and services.
              </p>

              {/* Checkbox Options */}
              <div className="space-y-2">
                {PREDEFINED_REJECTION_REASONS.map((reason, idx) => {
                  const isChecked = selectedReasons.includes(reason);
                  return (
                    <label
                      key={idx}
                      className={`flex items-center gap-3 p-2.5 rounded-xl cursor-pointer border transition-all ${
                        isChecked
                          ? "bg-white/90 border-[#2563EB] shadow-neu-raised"
                          : "bg-white/40 border-[#D9E2EC]/60 hover:bg-white/60"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleToggleReason(reason)}
                        className="rounded border-[#CBD5E1] text-[#2563EB] focus:ring-[#0EA5E9]"
                      />
                      <span className="text-xs font-bold text-[#1E293B]">{reason}</span>
                    </label>
                  );
                })}
              </div>

              {/* Optional Textarea */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#1E293B]">Additional feedback (optional)</label>
                <textarea
                  rows={3}
                  placeholder="e.g., Found another mover within my ₹15,000 budget."
                  value={rejectionComment}
                  onChange={(e) => setRejectionComment(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-[#EEF2F6] shadow-neu-inset-sm border border-[#D9E2EC]/80 text-xs text-[#1E293B] focus:outline-none"
                />
              </div>

              {/* Action Buttons: Skip Feedback vs Submit Feedback */}
              <div className="flex items-center justify-between pt-3 border-t border-[#D9E2EC]/80">
                <button
                  type="button"
                  disabled={submittingRejection}
                  onClick={() => handleExecuteRejection(true)}
                  className="px-4 py-2 rounded-xl bg-[#EEF2F6] text-xs font-bold text-[#64748B] shadow-neu-raised hover:shadow-neu-flat active:shadow-neu-pressed"
                >
                  Skip Feedback
                </button>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setRejectModalOpen(false)}
                    className="px-3 py-2 rounded-xl bg-[#EEF2F6] text-xs font-semibold text-[#64748B]"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={submittingRejection}
                    onClick={() => handleExecuteRejection(false)}
                    className="px-4 py-2 rounded-xl bg-[#2563EB] text-white text-xs font-bold shadow-neu-raised hover:bg-blue-600 active:shadow-neu-pressed transition-all"
                  >
                    {submittingRejection ? "Submitting..." : "Submit Feedback"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* CREATE MOVE REQUEST MODAL */}
        {createModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fadeIn">
            <form
              onSubmit={handleCreateRequest}
              className="max-w-md w-full p-6 rounded-3xl bg-[#EEF2F6] shadow-neu-raised border border-white/90 space-y-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-[#D9E2EC]/80">
                <h3 className="text-base font-black text-[#1E293B]">Post New Move Request</h3>
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="h-8 w-8 rounded-xl bg-[#EEF2F6] text-[#64748B] flex items-center justify-center font-bold"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-[#1E293B]">Pickup City</label>
                <input
                  type="text"
                  value={pickupCity}
                  onChange={(e) => setPickupCity(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#EEF2F6] shadow-neu-inset-sm border border-[#D9E2EC]/80 text-xs font-semibold focus:outline-none"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-[#1E293B]">Pickup Street</label>
                <input
                  type="text"
                  value={pickupStreet}
                  onChange={(e) => setPickupStreet(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#EEF2F6] shadow-neu-inset-sm border border-[#D9E2EC]/80 text-xs font-semibold focus:outline-none"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-[#1E293B]">Destination City</label>
                <input
                  type="text"
                  value={destCity}
                  onChange={(e) => setDestCity(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#EEF2F6] shadow-neu-inset-sm border border-[#D9E2EC]/80 text-xs font-semibold focus:outline-none"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-[#1E293B]">Destination Street</label>
                <input
                  type="text"
                  value={destStreet}
                  onChange={(e) => setDestStreet(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#EEF2F6] shadow-neu-inset-sm border border-[#D9E2EC]/80 text-xs font-semibold focus:outline-none"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-[#1E293B]">Preferred Move Date</label>
                <input
                  type="date"
                  value={moveDate}
                  onChange={(e) => setMoveDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#EEF2F6] shadow-neu-inset-sm border border-[#D9E2EC]/80 text-xs font-semibold focus:outline-none"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#D9E2EC]/80">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-[#EEF2F6] text-xs font-bold text-[#64748B]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingRequest}
                  className="px-4 py-2 rounded-xl bg-[#2563EB] text-white text-xs font-bold shadow-neu-raised"
                >
                  {creatingRequest ? "Creating..." : "Post Request"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* CUSTOMER MODAL: FULL RELOCATION ESTIMATION SHEET */}
        {viewEstimationModal && (() => {
          const est = getEffectiveEstimation(viewEstimationModal);
          return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fadeIn">
              <div className="max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 rounded-3xl bg-[#EEF2F6] shadow-neu-raised border border-white/90 space-y-5">
                {/* Header */}
                <div className="flex items-center justify-between pb-3 border-b border-[#D9E2EC]/80">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#0EA5E9]">
                        Formal Relocation Estimation Sheet
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#E2E8F0] text-[#475569]">
                        QUOTE #{viewEstimationModal._id.slice(-6).toUpperCase()}
                      </span>
                    </div>
                    <h3 className="text-lg font-black text-[#1E293B]">
                      {viewEstimationModal.vendorId?.businessName || "Verified Move Vendor"}
                    </h3>
                    {viewEstimationModal.vendorId?.contactPhone && (
                      <p className="text-xs text-[#64748B]">Contact: {viewEstimationModal.vendorId.contactPhone}</p>
                    )}
                  </div>
                  <button
                    onClick={() => setViewEstimationModal(null)}
                    className="h-8 w-8 rounded-xl bg-[#EEF2F6] text-[#64748B] hover:text-[#1E293B] flex items-center justify-center shadow-neu-flat active:shadow-neu-pressed font-bold"
                  >
                    ✕
                  </button>
                </div>

                {/* Total Amount Banner */}
                <div className="p-4 rounded-2xl bg-white/70 border border-white/90 shadow-neu-raised flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-[#64748B] uppercase">Total All-Inclusive Quotation</span>
                    <p className="text-2xl font-black text-[#2563EB]">
                      {formatPaise(viewEstimationModal.totalAmountMinorUnits)}
                    </p>
                  </div>
                  <div>
                    {viewEstimationModal.status === "ACCEPTED" ? (
                      <span className="px-3 py-1.5 rounded-xl text-xs font-black bg-emerald-100 text-emerald-800 shadow-neu-flat flex items-center gap-1">
                        <CheckCircle2 size={13} /> ACCEPTED BY YOU
                      </span>
                    ) : (
                      <span className="px-3 py-1.5 rounded-xl text-xs font-black bg-blue-100 text-[#2563EB] shadow-neu-flat">
                        READY TO CONFIRM
                      </span>
                    )}
                  </div>
                </div>

                {/* Vehicle & Crew Allocations */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Vehicle Card */}
                  <div className="p-4 rounded-2xl bg-white/60 border border-white/80 shadow-neu-flat space-y-1.5">
                    <div className="flex items-center gap-2 text-[#0EA5E9]">
                      <Truck size={16} />
                      <span className="text-[10px] font-extrabold uppercase tracking-wider">Allocated Vehicle</span>
                    </div>
                    <h4 className="text-xs font-black text-[#1E293B]">
                      {est.vehicleType}
                    </h4>
                    <p className="text-[11px] text-[#64748B] leading-relaxed">
                      {est.vehicleSpecs}
                    </p>
                  </div>

                  {/* Crew Card */}
                  <div className="p-4 rounded-2xl bg-white/60 border border-white/80 shadow-neu-flat space-y-1.5">
                    <div className="flex items-center gap-2 text-[#2563EB]">
                      <Users size={16} />
                      <span className="text-[10px] font-extrabold uppercase tracking-wider">Dedicated Moving Crew</span>
                    </div>
                    <h4 className="text-xs font-black text-[#1E293B]">
                      {est.crewCount} Dedicated Crew Members
                    </h4>
                    <p className="text-[11px] text-[#64748B] leading-relaxed">
                      {est.crewRoles}
                    </p>
                  </div>
                </div>

                {/* Itemized Split Charges Breakdown Table */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-[#1E293B] flex items-center gap-1.5">
                      <Calculator size={14} className="text-[#0EA5E9]" />
                      Perfect Split Charges Breakdown
                    </span>
                    <span className="text-[11px] text-[#64748B]">Itemized transparent pricing</span>
                  </div>

                  <div className="rounded-2xl bg-white/60 border border-white/80 overflow-hidden shadow-neu-flat">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-[#EEF2F6] border-b border-[#D9E2EC]/80 text-[#64748B] font-bold text-[11px]">
                          <th className="py-2.5 px-3">Service / Component</th>
                          <th className="py-2.5 px-3 text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E2E8F0]/70 text-[#1E293B]">
                        <tr>
                          <td className="py-2 px-3 font-semibold">1. Base Freight & Vehicle Transit ({est.vehicleType})</td>
                          <td className="py-2 px-3 text-right font-extrabold">{formatPaise(est.splitCharges?.freightMinorUnits || 0)}</td>
                        </tr>
                        <tr>
                          <td className="py-2 px-3 font-semibold">2. Professional Packing Materials & Packaging</td>
                          <td className="py-2 px-3 text-right font-extrabold">{formatPaise(est.splitCharges?.packingMaterialsMinorUnits || 0)}</td>
                        </tr>
                        <tr>
                          <td className="py-2 px-3 font-semibold">3. Loading & Doorstep Unloading ({est.crewCount} Crew)</td>
                          <td className="py-2 px-3 text-right font-extrabold">{formatPaise(est.splitCharges?.loadingUnloadingMinorUnits || 0)}</td>
                        </tr>
                        <tr>
                          <td className="py-2 px-3 font-semibold">4. Furniture Dismantling & Assembly Services</td>
                          <td className="py-2 px-3 text-right font-extrabold">{formatPaise(est.splitCharges?.dismantlingAssemblyMinorUnits || 0)}</td>
                        </tr>
                        <tr>
                          <td className="py-2 px-3 font-semibold">5. Goods Transit Protection & Insurance</td>
                          <td className="py-2 px-3 text-right font-extrabold">{formatPaise(est.splitCharges?.insuranceMinorUnits || 0)}</td>
                        </tr>
                        <tr>
                          <td className="py-2 px-3 font-semibold">6. Toll, Parking & Incidental Handling</td>
                          <td className="py-2 px-3 text-right font-extrabold">{formatPaise(est.splitCharges?.otherMinorUnits || 0)}</td>
                        </tr>
                        <tr className="bg-blue-50/40">
                          <td className="py-2 px-3 font-bold text-blue-900">7. Applicable Taxes & GST (18%)</td>
                          <td className="py-2 px-3 text-right font-black text-blue-900">{formatPaise(est.splitCharges?.taxGstMinorUnits || 0)}</td>
                        </tr>
                        <tr className="bg-[#EEF2F6] font-black border-t-2 border-[#CBD5E1]">
                          <td className="py-2.5 px-3 text-sm text-[#1E293B]">Grand Total Quotation</td>
                          <td className="py-2.5 px-3 text-right text-sm text-[#2563EB]">{formatPaise(viewEstimationModal.totalAmountMinorUnits)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Inclusions & Exclusions */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="p-3.5 rounded-2xl bg-white/50 border border-white/80 space-y-1">
                    <span className="font-bold text-[#2563EB] block">Inclusions</span>
                    <ul className="list-disc list-inside text-[#64748B] space-y-0.5">
                      {viewEstimationModal.inclusions && viewEstimationModal.inclusions.length > 0 ? (
                        viewEstimationModal.inclusions.map((inc, i) => <li key={i}>{inc}</li>)
                      ) : (
                        <>
                          <li>Doorstep pickup & destination room drop-off</li>
                          <li>Standard bubble wrap, shrink film & corrugated sheets</li>
                          <li>Furniture assembly & positioning</li>
                        </>
                      )}
                    </ul>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-white/50 border border-white/80 space-y-1">
                    <span className="font-bold text-rose-600 block">Exclusions</span>
                    <ul className="list-disc list-inside text-[#64748B] space-y-0.5">
                      {viewEstimationModal.exclusions && viewEstimationModal.exclusions.length > 0 ? (
                        viewEstimationModal.exclusions.map((exc, i) => <li key={i}>{exc}</li>)
                      ) : (
                        <>
                          <li>Hazardous, volatile, or illegal goods transport</li>
                          <li>External crane or high-rise rope hoisting beyond standard floors</li>
                          <li>Unscheduled storage or warehousing beyond moving window</li>
                        </>
                      )}
                    </ul>
                  </div>
                </div>

                {/* Modal Actions */}
                <div className="flex items-center justify-between pt-3 border-t border-[#D9E2EC]/80">
                  <button
                    onClick={() => setViewEstimationModal(null)}
                    className="px-5 py-2 rounded-xl bg-[#EEF2F6] text-[#64748B] text-xs font-bold shadow-neu-raised hover:shadow-neu-flat active:shadow-neu-pressed"
                  >
                    Close
                  </button>

                  {selectedRequest?.status === "OPEN" && viewEstimationModal.status === "SUBMITTED" && (
                    <button
                      onClick={() => {
                        const id = viewEstimationModal._id;
                        setViewEstimationModal(null);
                        handleAcceptQuote(id);
                      }}
                      className="px-5 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold shadow-neu-raised hover:bg-emerald-700 active:shadow-neu-pressed transition-all flex items-center gap-1.5"
                    >
                      <Check size={14} /> Accept & Confirm Booking
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}
