"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { fetchApi } from "@/lib/api";
import PageHeader from "../components/PageHeader";
import StatusBadge from "../components/StatusBadge";
import ConfirmModal from "../components/ConfirmModal";
import {
  Search,
  Plus,
  Phone,
  Mail,
  Loader2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Eye,
  X,
  FileCheck2,
  Ban,
  RotateCcw,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  Check,
  Store,
} from "lucide-react";

interface VendorItem {
  _id: string;
  businessName: string;
  contactPhone: string;
  contactEmail?: string;
  status: "PENDING_REVIEW" | "CHANGES_REQUESTED" | "APPROVED" | "REJECTED" | "SUSPENDED";
  serviceAreas: string[];
  servicesOffered: string[];
  ownerId?: { displayName?: string; phone?: string };
  verificationDetails?: Record<string, any>;
  createdAt: string;
}

export default function AdminVendorsPage() {
  const [vendors, setVendors] = useState<VendorItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toastMessage, setToastMessage] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Overall metric counts
  const [allVendorCount, setAllVendorCount] = useState(0);
  const [approvedCount, setApprovedCount] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [suspendedCount, setSuspendedCount] = useState(0);

  // Add Vendor Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [formBusinessName, setFormBusinessName] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formAreas, setFormAreas] = useState("BLR-CEN, BLR-STH");
  const [formServices, setFormServices] = useState("Residential Relocation, Packing & Moving");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  // Edit Vendor Modal
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editVendor, setEditVendor] = useState<VendorItem | null>(null);
  const [editBusinessName, setEditBusinessName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editAreas, setEditAreas] = useState("");
  const [editServices, setEditServices] = useState("");
  const [editStatus, setEditStatus] = useState<VendorItem["status"]>("APPROVED");
  const [editError, setEditError] = useState("");

  // Inspect Modal
  const [inspectVendor, setInspectVendor] = useState<VendorItem | null>(null);

  // Suspend / Reactivate Modal
  const [suspendModalOpen, setSuspendModalOpen] = useState(false);
  const [targetVendor, setTargetVendor] = useState<VendorItem | null>(null);
  const [suspendAction, setSuspendAction] = useState<"suspend" | "reactivate">("suspend");

  // Reject Modal
  const [rejectModalOpen, setRejectModalOpen] = useState(false);

  // Delete Modal
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((current) => (current === msg ? "" : current));
    }, 4000);
  };

  const loadVendors = async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "10",
        search,
        status: statusFilter,
        sortBy,
        sortOrder,
      });

      // Load main list and global stats in parallel
      const [res, statsRes] = await Promise.all([
        fetchApi<{
          vendors: VendorItem[];
          pagination: { total: number; totalPages: number };
        }>(`/admin/vendors?${params.toString()}`),
        fetchApi<{
          stats: { totalVendors: number; approvedVendors: number; pendingVendorRequests: number };
          distributions: { vendorStatus: Record<string, number> };
        }>("/admin/dashboard/stats").catch(() => null),
      ]);

      setVendors(res.vendors || []);
      setTotalPages(res.pagination?.totalPages || 1);
      setTotalCount(res.pagination?.total || 0);

      if (statsRes) {
        setAllVendorCount(statsRes.stats.totalVendors || 0);
        setApprovedCount(statsRes.stats.approvedVendors || 0);
        setPendingCount(statsRes.stats.pendingVendorRequests || 0);
        setSuspendedCount(statsRes.distributions?.vendorStatus?.SUSPENDED || 0);
      } else {
        setAllVendorCount(res.pagination?.total || 0);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load vendors");
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("asc");
    }
    setPage(1);
  };

  useEffect(() => {
    loadVendors();
  }, [page, statusFilter, sortBy, sortOrder]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadVendors();
  };

  const getMonogram = (name: string) => {
    const parts = (name || "").trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return (name.slice(0, 2) || "VN").toUpperCase();
  };

  const handleAddVendor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formBusinessName.trim() || !formPhone.trim()) {
      setFormError("Business name and contact phone are required.");
      return;
    }

    setSubmitting(true);
    setFormError("");

    try {
      await fetchApi("/admin/vendors", {
        method: "POST",
        body: JSON.stringify({
          businessName: formBusinessName.trim(),
          contactPhone: formPhone.trim(),
          contactEmail: formEmail.trim() || undefined,
          serviceAreas: formAreas.split(",").map((s) => s.trim()).filter(Boolean),
          servicesOffered: formServices.split(",").map((s) => s.trim()).filter(Boolean),
          status: "APPROVED",
        }),
      });

      setShowAddModal(false);
      setFormBusinessName("");
      setFormPhone("");
      setFormEmail("");
      showToast(`Vendor "${formBusinessName.trim()}" created successfully!`);
      loadVendors();
    } catch (err: any) {
      setFormError(err.message || "Failed to add vendor company");
    } finally {
      setSubmitting(false);
    }
  };

  const openEditModal = (v: VendorItem) => {
    setEditVendor(v);
    setEditBusinessName(v.businessName || "");
    setEditPhone(v.contactPhone || "");
    setEditEmail(v.contactEmail || "");
    setEditAreas(v.serviceAreas?.join(", ") || "");
    setEditServices(v.servicesOffered?.join(", ") || "");
    setEditStatus(v.status || "APPROVED");
    setEditError("");
    setEditModalOpen(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editVendor) return;
    if (!editBusinessName.trim() || !editPhone.trim()) {
      setEditError("Business name and contact phone are required.");
      return;
    }

    setSubmitting(true);
    setEditError("");

    const updatedAreas = editAreas.split(",").map((s) => s.trim()).filter(Boolean);
    const updatedServices = editServices.split(",").map((s) => s.trim()).filter(Boolean);

    try {
      const res = await fetchApi<{ vendor: VendorItem }>(`/admin/vendors/${editVendor._id}`, {
        method: "PATCH",
        body: JSON.stringify({
          businessName: editBusinessName.trim(),
          contactPhone: editPhone.trim(),
          contactEmail: editEmail.trim() || "",
          status: editStatus,
          serviceAreas: updatedAreas,
          servicesOffered: updatedServices,
        }),
      });

      // Instantaneous state update
      setVendors((prev) =>
        prev.map((item) =>
          item._id === editVendor._id
            ? res.vendor || {
                ...item,
                businessName: editBusinessName.trim(),
                contactPhone: editPhone.trim(),
                contactEmail: editEmail.trim(),
                status: editStatus,
                serviceAreas: updatedAreas,
                servicesOffered: updatedServices,
              }
            : item
        )
      );

      if (inspectVendor?._id === editVendor._id) {
        setInspectVendor(
          res.vendor || {
            ...inspectVendor,
            businessName: editBusinessName.trim(),
            contactPhone: editPhone.trim(),
            contactEmail: editEmail.trim(),
            status: editStatus,
            serviceAreas: updatedAreas,
            servicesOffered: updatedServices,
          }
        );
      }

      setEditModalOpen(false);
      setEditVendor(null);
      showToast(`Vendor "${editBusinessName.trim()}" updated successfully!`);
      loadVendors();
    } catch (err: any) {
      setEditError(err.message || "Failed to update vendor details");
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmSuspend = async (reason: string) => {
    if (!targetVendor) return;
    setSubmitting(true);
    const isSuspending = suspendAction === "suspend";
    const targetStatus = isSuspending ? "SUSPENDED" : "APPROVED";

    try {
      await fetchApi(`/admin/vendors/${targetVendor._id}/suspend`, {
        method: "PATCH",
        body: JSON.stringify({
          action: suspendAction,
          suspend: isSuspending,
          reason,
        }),
      });

      // Immediate local dynamic update
      setVendors((prev) =>
        prev.map((v) => (v._id === targetVendor._id ? { ...v, status: targetStatus } : v))
      );

      if (inspectVendor?._id === targetVendor._id) {
        setInspectVendor((prev) => (prev ? { ...prev, status: targetStatus } : null));
      }

      setSuspendModalOpen(false);
      showToast(
        `Vendor "${targetVendor.businessName}" has been ${
          isSuspending ? "suspended" : "reactivated"
        } successfully.`
      );
      setTargetVendor(null);
      loadVendors();
    } catch (err: any) {
      setError(err.message || "Failed to update vendor status");
    } finally {
      setSubmitting(false);
    }
  };

  const handleVendorDecision = async (
    vendor: VendorItem,
    decision: "APPROVED" | "REJECTED",
    reason?: string
  ) => {
    setSubmitting(true);
    try {
      await fetchApi(`/admin/vendors/${vendor._id}/decision`, {
        method: "PATCH",
        body: JSON.stringify({
          decision,
          reason: reason || `Application marked as ${decision} by admin`,
        }),
      });

      setVendors((prev) =>
        prev.map((v) => (v._id === vendor._id ? { ...v, status: decision } : v))
      );

      if (inspectVendor?._id === vendor._id) {
        setInspectVendor((prev) => (prev ? { ...prev, status: decision } : null));
      }

      setRejectModalOpen(false);
      setTargetVendor(null);
      showToast(`Vendor "${vendor.businessName}" marked as ${decision}.`);
      loadVendors();
    } catch (err: any) {
      setError(err.message || "Failed to update vendor status");
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!targetVendor) return;
    setSubmitting(true);
    try {
      await fetchApi(`/admin/vendors/${targetVendor._id}`, {
        method: "DELETE",
      });

      setVendors((prev) => prev.filter((v) => v._id !== targetVendor._id));

      if (inspectVendor?._id === targetVendor._id) {
        setInspectVendor(null);
      }

      setDeleteModalOpen(false);
      showToast(`Vendor "${targetVendor.businessName}" deleted successfully.`);
      setTargetVendor(null);
      loadVendors();
    } catch (err: any) {
      setError(err.message || "Failed to delete vendor");
    } finally {
      setSubmitting(false);
    }
  };

  const statusTabs = [
    { key: "all", label: "All Vendors", count: allVendorCount },
    { key: "APPROVED", label: "Approved", count: approvedCount },
    { key: "PENDING_REVIEW", label: "Pending", count: pendingCount },
    { key: "SUSPENDED", label: "Suspended", count: suspendedCount },
  ];

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 bg-[#1E293B] text-white rounded-xl shadow-2xl text-xs font-medium border border-[#374151] animate-slideUp">
          <Check size={16} className="text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
          <button
            onClick={() => setToastMessage("")}
            className="ml-2 text-[#9CA3AF] hover:text-white transition cursor-pointer"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Page Header */}
      <PageHeader
        title="Vendors"
        description="Supervise registered moving companies, service coverage, and operational status"
      >
        <Link
          href="/admin/vendor-requests"
          className="border border-[#D9E2EC]/70 bg-[#EEF2F6] hover:bg-[#EEF2F6] text-[#1E293B] shadow-neu-inset-sm inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[#1E293B] hover:text-[#2563EB] text-xs font-semibold cursor-pointer"
        >
          <FileCheck2 size={15} className="text-[#F59E0B]" />
          <span>Review Applications</span>
        </Link>
        <button
          onClick={() => {
            setFormError("");
            setShowAddModal(true);
          }}
          className="neu-btn-primary text-white rounded-lg px-4 py-2 font-semibold text-xs shadow-neu-flat-sm transition cursor-pointer inline-flex items-center gap-1.5 px-4 py-2 text-white rounded-xl text-xs font-semibold cursor-pointer"
        >
          <Plus size={15} />
          <span>Add Vendor</span>
        </button>
      </PageHeader>

      {/* Top Metric Cards Strip (Visual Anchors) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Fleet */}
        <div className="bg-[#EEF2F6] p-4 rounded-2xl shadow-neu-flat border border-white/80 flex items-center justify-between transition-all">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
              Total Fleet Vendors
            </p>
            <p className="text-2xl font-bold text-[#1E293B] mt-1 font-mono">{allVendorCount}</p>
            <p className="text-[11px] text-[#64748B] mt-0.5">Registered moving companies</p>
          </div>
          <div className="h-11 w-11 rounded-xl bg-[#EEF2F6] shadow-neu-flat border border-white/80 flex items-center justify-center text-[#1E293B] shrink-0">
            <Store size={20} />
          </div>
        </div>

        {/* Card 2: Approved Active */}
        <div className="bg-[#EEF2F6] p-4 rounded-2xl shadow-neu-flat border border-white/80 flex items-center justify-between transition-all">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
              Active & Approved
            </p>
            <p className="text-2xl font-bold text-[#14B8A6] mt-1 font-mono">{approvedCount}</p>
            <p className="text-[11px] text-[#64748B] mt-0.5">Dispatch & quote ready</p>
          </div>
          <div className="h-11 w-11 rounded-xl bg-teal-50 border border-teal-200/80 flex items-center justify-center text-[#14B8A6] shrink-0">
            <CheckCircle2 size={20} />
          </div>
        </div>

        {/* Card 3: Pending Review */}
        <div className="bg-[#EEF2F6] p-4 rounded-2xl shadow-neu-flat border border-white/80 flex items-center justify-between transition-all">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
              Pending Review
            </p>
            <p className="text-2xl font-bold text-[#F59E0B] mt-1 font-mono">{pendingCount}</p>
            <p className="text-[11px] text-[#64748B] mt-0.5">Awaiting authorization</p>
          </div>
          <div className="h-11 w-11 rounded-xl bg-amber-50 border border-amber-200/80 flex items-center justify-center text-[#F59E0B] shrink-0">
            <FileCheck2 size={20} />
          </div>
        </div>

        {/* Card 4: Suspended Fleet */}
        <div className="bg-[#EEF2F6] p-4 rounded-2xl shadow-neu-flat border border-white/80 flex items-center justify-between transition-all">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
              Suspended Fleet
            </p>
            <p className="text-2xl font-bold text-rose-600 mt-1 font-mono">{suspendedCount}</p>
            <p className="text-[11px] text-[#64748B] mt-0.5">Blocked from platform leads</p>
          </div>
          <div className="h-11 w-11 rounded-xl bg-rose-50 border border-rose-200/80 flex items-center justify-center text-rose-600 shrink-0">
            <Ban size={20} />
          </div>
        </div>
      </div>

      {/* Segmented Status Tabs & Search Toolbar */}
      <div className="bg-[#EEF2F6] p-3.5 rounded-2xl shadow-neu-flat border border-white/80 flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Status Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
          {statusTabs.map((tab) => {
            const isSelected = statusFilter === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => {
                  setStatusFilter(tab.key);
                  setPage(1);
                }}
                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer whitespace-nowrap ${
                  isSelected
                    ? "bg-[#EEF2F6] shadow-neu-raised-sm text-[#2563EB] font-bold"
                    : "text-[#64748B] hover:text-[#1E293B] hover:shadow-neu-raised-sm"
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                    isSelected
                      ? "bg-[#374151] text-white"
                      : "bg-[#EEF2F6] shadow-neu-flat border border-white/80 text-[#64748B]"
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search Input */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          <form onSubmit={handleSearchSubmit} className="relative w-full md:w-72">
            <Search
              size={15}
              className="absolute inset-y-0 left-3 my-auto text-[#64748B] pointer-events-none"
            />
            <input
              type="text"
              placeholder="Search fleet by name or phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-8 py-2 text-xs rounded-xl bg-[#EEF2F6] shadow-neu-inset-sm text-[#1E293B] placeholder-[#64748B] border border-transparent focus:border-[#2563EB]/50 focus:outline-none transition"
            />
            {search && (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setPage(1);
                  loadVendors();
                }}
                className="absolute inset-y-0 right-2.5 my-auto text-[#64748B] hover:text-[#1E293B] cursor-pointer"
              >
                <X size={14} />
              </button>
            )}
          </form>

          {(search || statusFilter !== "all") && (
            <button
              onClick={() => {
                setSearch("");
                setStatusFilter("all");
                setPage(1);
              }}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs text-[#64748B] hover:text-[#1E293B] border border-[#D9E2EC]/70 rounded-lg hover:bg-[#EEF2F6] transition cursor-pointer whitespace-nowrap"
            >
              <RotateCcw size={12} />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <AlertCircle size={16} className="shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
          <button
            onClick={() => loadVendors()}
            className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold transition cursor-pointer shrink-0"
          >
            Retry
          </button>
        </div>
      )}

      {/* Structured Uniform Table (Zero Jagged Rows) */}
      <div className="bg-[#EEF2F6] rounded-2xl shadow-neu-flat border border-white/80 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#EEF2F6] text-[#64748B] font-semibold border-b border-[#D9E2EC]/70">
              <tr>
                <th
                  className="px-5 py-3 cursor-pointer hover:text-[#1E293B] transition select-none"
                  onClick={() => handleSort("businessName")}
                >
                  <div className="flex items-center gap-1.5">
                    <span>Company</span>
                    <span className="text-[10px] text-[#94A3B8]">
                      {sortBy === "businessName" ? (sortOrder === "asc" ? "▲" : "▼") : "↕"}
                    </span>
                  </div>
                </th>
                <th
                  className="px-4 py-3 cursor-pointer hover:text-[#1E293B] transition select-none"
                  onClick={() => handleSort("contactPhone")}
                >
                  <div className="flex items-center gap-1.5">
                    <span>Direct Contact</span>
                    <span className="text-[10px] text-[#94A3B8]">
                      {sortBy === "contactPhone" ? (sortOrder === "asc" ? "▲" : "▼") : "↕"}
                    </span>
                  </div>
                </th>
                <th className="px-4 py-3">Service Coverage</th>
                <th className="px-4 py-3">Specialty Services</th>
                <th
                  className="px-4 py-3 cursor-pointer hover:text-[#1E293B] transition select-none"
                  onClick={() => handleSort("status")}
                >
                  <div className="flex items-center gap-1.5">
                    <span>Status</span>
                    <span className="text-[10px] text-[#94A3B8]">
                      {sortBy === "status" ? (sortOrder === "asc" ? "▲" : "▼") : "↕"}
                    </span>
                  </div>
                </th>
                <th
                  className="px-4 py-3 cursor-pointer hover:text-[#1E293B] transition select-none"
                  onClick={() => handleSort("createdAt")}
                >
                  <div className="flex items-center gap-1.5">
                    <span>Registered</span>
                    <span className="text-[10px] text-[#94A3B8]">
                      {sortBy === "createdAt" ? (sortOrder === "asc" ? "▲" : "▼") : "↕"}
                    </span>
                  </div>
                </th>
                <th className="px-5 py-3 text-right whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#D9E2EC]/70">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-[#64748B]">
                    <Loader2 size={24} className="animate-spin text-[#2563EB] mx-auto mb-2" />
                    <span className="text-xs font-medium">Loading fleet vendors...</span>
                  </td>
                </tr>
              ) : vendors.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center">
                    <Store size={32} className="mx-auto text-[#94A3B8] mb-2" />
                    <p className="font-semibold text-[#1E293B]">No vendor companies found</p>
                    <p className="text-xs text-[#64748B] mt-0.5">
                      No moving companies match the selected filters or search query.
                    </p>
                  </td>
                </tr>
              ) : (
                vendors.map((v) => (
                  <tr
                    key={v._id}
                    className="hover:bg-[#EEF2F6]/80 transition-colors h-14"
                  >
                    {/* Company Column with Monogram Avatar */}
                    <td className="px-5 py-2.5">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-lg bg-blue-50/80 border border-blue-200/80 flex items-center justify-center font-bold text-xs text-[#2563EB] shadow-neu-inset-sm shrink-0">
                          {getMonogram(v.businessName)}
                        </div>
                        <div className="min-w-0">
                          <button
                            onClick={() => setInspectVendor(v)}
                            className="font-semibold text-[#1E293B] hover:text-[#2563EB] transition text-left truncate block cursor-pointer"
                            title="Inspect details"
                          >
                            {v.businessName}
                          </button>
                          <p className="text-[11px] text-[#64748B] truncate mt-0.5">
                            {v.ownerId?.displayName || v.ownerId?.phone || "Direct Account"}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Direct Contact Column */}
                    <td className="px-4 py-2.5">
                      <div className="space-y-0.5">
                        <span className="font-mono text-xs text-[#1E293B] font-medium flex items-center gap-1.5">
                          <Phone size={12} className="text-[#64748B] shrink-0" />
                          {v.contactPhone}
                        </span>
                        {v.contactEmail ? (
                          <span className="text-[11px] text-[#64748B] flex items-center gap-1.5 truncate">
                            <Mail size={12} className="text-[#94A3B8] shrink-0" />
                            {v.contactEmail}
                          </span>
                        ) : (
                          <span className="text-[11px] text-[#94A3B8] italic">No email</span>
                        )}
                      </div>
                    </td>

                    {/* Service Coverage (Uniform 1-Line Display) */}
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-1.5">
                        {v.serviceAreas && v.serviceAreas.length > 0 ? (
                          <>
                            {v.serviceAreas.slice(0, 2).map((area, idx) => (
                              <span
                                key={idx}
                                className="px-2 py-0.5 rounded bg-[#EEF2F6] text-[#1E293B] border border-[#D9E2EC]/70 text-[11px] font-mono font-medium whitespace-nowrap"
                              >
                                {area}
                              </span>
                            ))}
                            {v.serviceAreas.length > 2 && (
                              <button
                                onClick={() => setInspectVendor(v)}
                                className="px-1.5 py-0.5 rounded bg-blue-50/80 text-[#2563EB] border border-blue-200/70 text-[10px] font-semibold hover:bg-blue-100 transition cursor-pointer"
                                title={v.serviceAreas.slice(2).join(", ")}
                              >
                                +{v.serviceAreas.length - 2}
                              </button>
                            )}
                          </>
                        ) : (
                          <span className="text-[#94A3B8] italic text-[11px]">Unmapped</span>
                        )}
                      </div>
                    </td>

                    {/* Specialty Services (Uniform 1-Line Display) */}
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-1.5">
                        {v.servicesOffered && v.servicesOffered.length > 0 ? (
                          <>
                            <span className="px-2 py-0.5 rounded bg-[#EEF2F6] text-[#1E293B] border border-[#D9E2EC]/70 text-[11px] capitalize truncate max-w-[140px] whitespace-nowrap font-medium">
                              {v.servicesOffered[0]}
                            </span>
                            {v.servicesOffered.length > 1 && (
                              <button
                                onClick={() => setInspectVendor(v)}
                                className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200/70 text-[10px] font-semibold hover:bg-amber-100 transition cursor-pointer"
                                title={v.servicesOffered.slice(1).join(", ")}
                              >
                                +{v.servicesOffered.length - 1}
                              </button>
                            )}
                          </>
                        ) : (
                          <span className="text-[#94A3B8] italic text-[11px]">Standard Move</span>
                        )}
                      </div>
                    </td>

                    {/* Status Column */}
                    <td className="px-4 py-2.5">
                      <StatusBadge status={v.status} />
                    </td>

                    {/* Registered Column */}
                    <td className="px-4 py-2.5 text-[#64748B] font-mono text-[11px]">
                      {new Date(v.createdAt).toLocaleDateString()}
                    </td>

                    {/* Actions Column (Segmented Group) */}
                    <td className="px-5 py-2.5 text-right whitespace-nowrap">
                      <div className="inline-flex items-center justify-end gap-1 bg-[#EEF2F6] shadow-neu-flat border border-white/80 p-1 rounded-lg">
                        {/* 1. View / Inspect Details */}
                        <button
                          onClick={() => setInspectVendor(v)}
                          className="p-1.5 text-[#64748B] hover:text-[#2563EB] hover:bg-[#EEF2F6] rounded transition cursor-pointer"
                          title="View Details"
                        >
                          <Eye size={14} />
                        </button>

                        {/* 2. Edit Vendor Details */}
                        <button
                          onClick={() => openEditModal(v)}
                          className="p-1.5 text-[#64748B] hover:text-[#1E293B] hover:bg-[#EEF2F6] rounded transition cursor-pointer"
                          title="Edit Vendor"
                        >
                          <Edit2 size={14} />
                        </button>

                        {/* 3. Dynamic Status Actions */}
                        {v.status === "APPROVED" && (
                          <button
                            onClick={() => {
                              setTargetVendor(v);
                              setSuspendAction("suspend");
                              setSuspendModalOpen(true);
                            }}
                            className="p-1.5 text-[#64748B] hover:text-rose-600 hover:bg-rose-50 rounded transition cursor-pointer"
                            title="Suspend Vendor"
                          >
                            <Ban size={14} />
                          </button>
                        )}

                        {v.status === "SUSPENDED" && (
                          <button
                            onClick={() => {
                              setTargetVendor(v);
                              setSuspendAction("reactivate");
                              setSuspendModalOpen(true);
                            }}
                            className="p-1.5 text-[#64748B] hover:text-[#14B8A6] hover:bg-teal-50 rounded transition cursor-pointer"
                            title="Reactivate Vendor"
                          >
                            <RotateCcw size={14} />
                          </button>
                        )}

                        {(v.status === "PENDING_REVIEW" || v.status === "CHANGES_REQUESTED") && (
                          <>
                            <button
                              onClick={() => handleVendorDecision(v, "APPROVED")}
                              className="p-1.5 text-[#64748B] hover:text-[#14B8A6] hover:bg-teal-50 rounded transition cursor-pointer"
                              title="Approve Application"
                            >
                              <CheckCircle2 size={14} />
                            </button>
                            <button
                              onClick={() => {
                                setTargetVendor(v);
                                setRejectModalOpen(true);
                              }}
                              className="p-1.5 text-[#64748B] hover:text-rose-600 hover:bg-rose-50 rounded transition cursor-pointer"
                              title="Reject Application"
                            >
                              <XCircle size={14} />
                            </button>
                          </>
                        )}

                        {v.status === "REJECTED" && (
                          <button
                            onClick={() => handleVendorDecision(v, "APPROVED")}
                            className="p-1.5 text-[#64748B] hover:text-[#14B8A6] hover:bg-teal-50 rounded transition cursor-pointer"
                            title="Re-evaluate & Approve"
                          >
                            <RotateCcw size={14} />
                          </button>
                        )}

                        {/* 4. Delete Vendor */}
                        <button
                          onClick={() => {
                            setTargetVendor(v);
                            setDeleteModalOpen(true);
                          }}
                          className="p-1.5 text-[#64748B] hover:text-rose-600 hover:bg-rose-50 rounded transition cursor-pointer"
                          title="Delete Vendor"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="px-5 py-3.5 bg-[#EEF2F6] border-t border-[#D9E2EC]/70 flex items-center justify-between text-xs text-[#64748B]">
          <span>
            Showing <strong className="text-[#1E293B]">{vendors.length}</strong> of{" "}
            <strong className="text-[#1E293B]">{totalCount}</strong> moving companies
          </span>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-2.5 py-1 rounded-lg border border-[#D9E2EC]/70 bg-[#EEF2F6] hover:bg-[#EEF2F6] hover:text-[#2563EB] disabled:opacity-40 transition cursor-pointer shadow-neu-inset-sm"
            >
              <ChevronLeft size={14} />
            </button>
            <span className="px-2.5 py-1 font-semibold text-[#1E293B] font-mono">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="px-2.5 py-1 rounded-lg border border-[#D9E2EC]/70 bg-[#EEF2F6] hover:bg-[#EEF2F6] hover:text-[#2563EB] disabled:opacity-40 transition cursor-pointer shadow-neu-inset-sm"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Add Vendor Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1E293B]/50 backdrop-blur-2xs">
          <div className="w-full max-w-md bg-[#EEF2F6] rounded-xl border border-[#D9E2EC]/70 overflow-hidden shadow-xl">
            <div className="px-5 py-4 bg-[#EEF2F6] border-b border-[#D9E2EC]/70 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-[#1E293B]">Add Moving Company</h3>
                <p className="text-[11px] text-[#64748B]">Register a verified logistics provider</p>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 text-[#64748B] hover:text-[#1E293B] rounded transition cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleAddVendor} className="p-5 space-y-4 text-xs">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg">
                  {formError}
                </div>
              )}

              <div className="space-y-1">
                <label className="font-semibold text-[#1E293B]">Company Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Swift Movers & Logistics"
                  value={formBusinessName}
                  onChange={(e) => setFormBusinessName(e.target.value)}
                  className="w-full px-3 py-2 border border-[#D9E2EC]/70 rounded-lg focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/15 text-[#1E293B]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-[#1E293B]">Phone *</label>
                  <input
                    type="tel"
                    required
                    placeholder="+919876543210"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    className="w-full px-3 py-2 border border-[#D9E2EC]/70 rounded-lg focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/15 text-[#1E293B] font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-[#1E293B]">Email</label>
                  <input
                    type="email"
                    placeholder="ops@swiftmovers.in"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-[#D9E2EC]/70 rounded-lg focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/15 text-[#1E293B]"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-[#1E293B]">Service Areas (comma-separated)</label>
                <input
                  type="text"
                  value={formAreas}
                  onChange={(e) => setFormAreas(e.target.value)}
                  placeholder="BLR-CEN, BLR-STH, MUM-STH"
                  className="w-full px-3 py-2 border border-[#D9E2EC]/70 rounded-lg focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/15 text-[#1E293B]"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-[#1E293B]">Specialty Services (comma-separated)</label>
                <input
                  type="text"
                  value={formServices}
                  onChange={(e) => setFormServices(e.target.value)}
                  placeholder="Residential Relocation, Packing & Moving, Transport"
                  className="w-full px-3 py-2 border border-[#D9E2EC]/70 rounded-lg focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/15 text-[#1E293B]"
                />
              </div>

              <div className="pt-3 border-t border-[#D9E2EC]/70 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3.5 py-2 border border-[#D9E2EC]/70 text-[#64748B] hover:text-[#1E293B] hover:bg-[#EEF2F6] rounded-lg transition cursor-pointer font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 neu-btn-primary text-white rounded-lg shadow-neu-flat-sm transition cursor-pointer disabled:opacity-50 font-semibold"
                >
                  {submitting ? "Saving..." : "Add Company"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Vendor Modal */}
      {editModalOpen && editVendor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1E293B]/50 backdrop-blur-2xs">
          <div className="w-full max-w-md bg-[#EEF2F6] rounded-xl border border-[#D9E2EC]/70 overflow-hidden shadow-xl">
            <div className="px-5 py-4 bg-[#EEF2F6] border-b border-[#D9E2EC]/70 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-[#1E293B]">Edit Moving Company</h3>
                <p className="text-[11px] text-[#64748B]">Vendor ID: {editVendor._id}</p>
              </div>
              <button
                onClick={() => setEditModalOpen(false)}
                className="p-1 text-[#64748B] hover:text-[#1E293B] rounded transition cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-5 space-y-4 text-xs">
              {editError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg">
                  {editError}
                </div>
              )}

              <div className="space-y-1">
                <label className="font-semibold text-[#1E293B]">Company Name *</label>
                <input
                  type="text"
                  required
                  value={editBusinessName}
                  onChange={(e) => setEditBusinessName(e.target.value)}
                  className="w-full px-3 py-2 border border-[#D9E2EC]/70 rounded-lg focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/15 text-[#1E293B]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-[#1E293B]">Phone *</label>
                  <input
                    type="tel"
                    required
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="w-full px-3 py-2 border border-[#D9E2EC]/70 rounded-lg focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/15 text-[#1E293B] font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-[#1E293B]">Email</label>
                  <input
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-[#D9E2EC]/70 rounded-lg focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/15 text-[#1E293B]"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-[#1E293B]">Operational Status</label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as VendorItem["status"])}
                  className="w-full px-3 py-2 border border-[#D9E2EC]/70 rounded-lg focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/15 bg-[#EEF2F6] text-[#1E293B]"
                >
                  <option value="APPROVED">APPROVED (Active & Dispatch Ready)</option>
                  <option value="PENDING_REVIEW">PENDING_REVIEW (Awaiting Verification)</option>
                  <option value="CHANGES_REQUESTED">CHANGES_REQUESTED (Resubmission Needed)</option>
                  <option value="SUSPENDED">SUSPENDED (Temporarily Blocked)</option>
                  <option value="REJECTED">REJECTED (Not Authorized)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-[#1E293B]">Service Areas (comma-separated)</label>
                <input
                  type="text"
                  value={editAreas}
                  onChange={(e) => setEditAreas(e.target.value)}
                  placeholder="e.g. BLR-CEN, MUM-STH, PUN-CEN"
                  className="w-full px-3 py-2 border border-[#D9E2EC]/70 rounded-lg focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/15 text-[#1E293B]"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-[#1E293B]">Specialty Services (comma-separated)</label>
                <input
                  type="text"
                  value={editServices}
                  onChange={(e) => setEditServices(e.target.value)}
                  placeholder="e.g. packing, loading, transport, unloading"
                  className="w-full px-3 py-2 border border-[#D9E2EC]/70 rounded-lg focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/15 text-[#1E293B]"
                />
              </div>

              <div className="pt-3 border-t border-[#D9E2EC]/70 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
                  className="px-3.5 py-2 border border-[#D9E2EC]/70 text-[#64748B] hover:text-[#1E293B] hover:bg-[#EEF2F6] rounded-lg transition cursor-pointer font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 neu-btn-primary text-white rounded-lg shadow-neu-flat-sm transition cursor-pointer disabled:opacity-50 font-semibold"
                >
                  {submitting ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Inspect Vendor Modal */}
      {inspectVendor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1E293B]/50 backdrop-blur-2xs">
          <div className="w-full max-w-lg bg-[#EEF2F6] rounded-xl border border-[#D9E2EC]/70 overflow-hidden shadow-xl">
            <div className="px-5 py-4 bg-[#EEF2F6] border-b border-[#D9E2EC]/70 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-blue-50/80 border border-blue-200/80 flex items-center justify-center font-bold text-sm text-[#2563EB] shadow-neu-inset-sm">
                  {getMonogram(inspectVendor.businessName)}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#1E293B]">{inspectVendor.businessName}</h3>
                  <p className="text-[11px] text-[#64748B]">Vendor ID: {inspectVendor._id}</p>
                </div>
              </div>
              <button
                onClick={() => setInspectVendor(null)}
                className="p-1 text-[#64748B] hover:text-[#1E293B] rounded transition cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3 pb-3 border-b border-[#D9E2EC]/70">
                <div>
                  <span className="text-[#64748B] block mb-1 font-medium">Status</span>
                  <StatusBadge status={inspectVendor.status} />
                </div>
                <div>
                  <span className="text-[#64748B] block mb-1 font-medium">Registered Date</span>
                  <span className="font-semibold text-[#1E293B] font-mono">
                    {new Date(inspectVendor.createdAt).toLocaleString()}
                  </span>
                </div>
              </div>

              <div>
                <span className="text-[#64748B] block mb-1 font-medium">Contact Credentials</span>
                <p className="font-semibold text-[#1E293B] font-mono">Phone: {inspectVendor.contactPhone}</p>
                {inspectVendor.contactEmail && (
                  <p className="text-[#64748B] mt-0.5">Email: {inspectVendor.contactEmail}</p>
                )}
              </div>

              <div>
                <span className="text-[#64748B] block mb-1 font-medium">Service Areas</span>
                <div className="flex flex-wrap gap-1.5">
                  {inspectVendor.serviceAreas?.length ? (
                    inspectVendor.serviceAreas.map((a, i) => (
                      <span
                        key={i}
                        className="px-2.5 py-1 bg-[#EEF2F6] shadow-neu-flat border border-white/80 rounded-lg text-[#1E293B] font-mono text-xs"
                      >
                        {a}
                      </span>
                    ))
                  ) : (
                    <span className="text-[#94A3B8] italic">No specific areas registered</span>
                  )}
                </div>
              </div>

              <div>
                <span className="text-[#64748B] block mb-1 font-medium">Offered Move Services</span>
                <div className="flex flex-wrap gap-1.5">
                  {inspectVendor.servicesOffered?.length ? (
                    inspectVendor.servicesOffered.map((s, i) => (
                      <span
                        key={i}
                        className="px-2.5 py-1 bg-[#EEF2F6] shadow-neu-flat border border-white/80 text-[#1E293B] rounded-lg capitalize text-xs"
                      >
                        {s}
                      </span>
                    ))
                  ) : (
                    <span className="text-[#94A3B8] italic">Standard move services</span>
                  )}
                </div>
              </div>

              {inspectVendor.verificationDetails &&
                Object.keys(inspectVendor.verificationDetails).length > 0 && (
                  <div className="p-3 bg-[#EEF2F6] rounded-lg border border-[#D9E2EC]/70">
                    <span className="font-semibold text-[#1E293B] block mb-1">Verification Records</span>
                    <pre className="text-[11px] font-mono text-[#64748B] whitespace-pre-wrap">
                      {JSON.stringify(inspectVendor.verificationDetails, null, 2)}
                    </pre>
                  </div>
                )}
            </div>

            {/* Inspect Modal Action Footer */}
            <div className="px-5 py-3.5 bg-[#EEF2F6] border-t border-[#D9E2EC]/70 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const v = inspectVendor;
                    setInspectVendor(null);
                    openEditModal(v);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#EEF2F6] shadow-neu-flat border border-white/80 text-[#1E293B] hover:bg-[#EEF2F6] rounded-lg text-xs font-semibold shadow-neu-inset-sm transition cursor-pointer"
                >
                  <Edit2 size={13} />
                  <span>Edit Details</span>
                </button>

                {inspectVendor.status === "APPROVED" ? (
                  <button
                    onClick={() => {
                      const v = inspectVendor;
                      setInspectVendor(null);
                      setTargetVendor(v);
                      setSuspendAction("suspend");
                      setSuspendModalOpen(true);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100 rounded-lg text-xs font-semibold transition cursor-pointer"
                  >
                    <Ban size={13} />
                    <span>Suspend</span>
                  </button>
                ) : inspectVendor.status === "SUSPENDED" ? (
                  <button
                    onClick={() => {
                      const v = inspectVendor;
                      setInspectVendor(null);
                      setTargetVendor(v);
                      setSuspendAction("reactivate");
                      setSuspendModalOpen(true);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-teal-50 border border-emerald-200 text-teal-700 hover:bg-emerald-100 rounded-lg text-xs font-semibold transition cursor-pointer"
                  >
                    <RotateCcw size={13} />
                    <span>Reactivate</span>
                  </button>
                ) : null}
              </div>

              <button
                onClick={() => setInspectVendor(null)}
                className="px-4 py-1.5 bg-[#1E293B] hover:bg-[#111827] text-white rounded-lg text-xs font-semibold transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Suspend Confirmation Modal */}
      <ConfirmModal
        isOpen={suspendModalOpen}
        title={suspendAction === "suspend" ? "Suspend Moving Company" : "Reactivate Moving Company"}
        message={
          suspendAction === "suspend"
            ? `Are you sure you want to suspend "${targetVendor?.businessName}"? Suspending this vendor will block new leads, but ongoing confirmed moves will be preserved for fulfillment.`
            : `Reactivate "${targetVendor?.businessName}" so they can receive moving leads and submit quotes?`
        }
        confirmLabel={suspendAction === "suspend" ? "Suspend Vendor" : "Reactivate"}
        confirmVariant={suspendAction === "suspend" ? "danger" : "primary"}
        requireReason={true}
        reasonPlaceholder="Specify administrative reason for this action..."
        isLoading={submitting}
        onConfirm={handleConfirmSuspend}
        onClose={() => setSuspendModalOpen(false)}
      />

      {/* Reject Application Modal */}
      <ConfirmModal
        isOpen={rejectModalOpen}
        title="Reject Vendor Application"
        message={`Are you sure you want to reject the application for "${targetVendor?.businessName}"?`}
        confirmLabel="Reject Application"
        confirmVariant="danger"
        requireReason={true}
        reasonPlaceholder="Specify reason for application rejection..."
        isLoading={submitting}
        onConfirm={(reason) => {
          if (targetVendor) {
            handleVendorDecision(targetVendor, "REJECTED", reason);
          }
        }}
        onClose={() => setRejectModalOpen(false)}
      />

      {/* Delete Vendor Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteModalOpen}
        title="Delete Moving Company"
        message={`Are you sure you want to permanently delete "${targetVendor?.businessName}"? This action cannot be undone and will remove all associated fleet records from the database.`}
        confirmLabel="Delete Company"
        confirmVariant="danger"
        requireReason={false}
        isLoading={submitting}
        onConfirm={handleConfirmDelete}
        onClose={() => setDeleteModalOpen(false)}
      />
    </div>
  );
}
