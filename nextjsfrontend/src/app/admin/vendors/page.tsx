"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { fetchApi } from "@/lib/api";
import PageHeader from "../components/PageHeader";
import StatusBadge from "../components/StatusBadge";
import ConfirmModal from "../components/ConfirmModal";
import DocumentViewerModal from "../components/DocumentViewerModal";
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
  Building2,
  UserCheck,
  ShieldCheck,
  FileText,
  MessageSquare,
} from "lucide-react";

interface DocumentRecord {
  type: string;
  name?: string;
  category?: string;
  fileUrl?: string;
  fileName?: string;
  fileSize?: string;
  idType?: string;
  maskedIdNumber?: string;
  status: "NOT_SUBMITTED" | "PENDING_REVIEW" | "CHANGES_REQUESTED" | "APPROVED" | "REJECTED";
  submittedAt?: string;
  reviewedAt?: string;
  feedback?: string;
}

interface VendorItem {
  _id: string;
  businessName: string;
  contactPhone: string;
  contactEmail?: string;
  status: "PENDING_REVIEW" | "CHANGES_REQUESTED" | "APPROVED" | "REJECTED" | "SUSPENDED";
  serviceAreas: string[];
  servicesOffered: string[];
  ownerId?: { displayName?: string; phone?: string };
  verificationDetails?: {
    lastReviewedAt?: string;
    reviewReason?: string;
    documents?: DocumentRecord[];
    [key: string]: any;
  };
  createdAt: string;
}

const STANDARD_KYC_DOCS = [
  // Section 1: Company Verification (2 Core Documents)
  {
    type: "GST_CERTIFICATE",
    category: "COMPANY",
    section: "COMPANY",
    title: "GST Registration Certificate",
    description: "Core business identity document required for company approval.",
    required: true,
  },
  {
    type: "BUSINESS_PAN",
    category: "COMPANY",
    section: "COMPANY",
    title: "Company / Business PAN Card",
    description: "Permanent Account Number registered with Income Tax Department.",
    required: true,
  },
  // Section 2: Owner / Authorized Representative Verification (2 Core Documents)
  {
    type: "REPRESENTATIVE_ID_PROOF",
    category: "REPRESENTATIVE",
    section: "REPRESENTATIVE",
    title: "Government Identity Proof",
    description: "Official ID proof (Aadhaar, Passport, Driving Licence, or Other) of owner / representative.",
    required: true,
  },
  {
    type: "REPRESENTATIVE_PHOTO",
    category: "REPRESENTATIVE",
    section: "REPRESENTATIVE",
    title: "Representative Photo / Camera Capture",
    description: "Recent photograph of the business owner or authorized representative for identity verification.",
    required: true,
  },
  // Section 3: Operational Compliance (Optional / Service-Specific)
  {
    type: "TRANSPORT_PERMIT",
    category: "OPERATIONAL",
    section: "OPERATIONAL",
    title: "All India Goods Transport Permit",
    description: "Commercial logistics transport permit (operational compliance; does not block core company approval).",
    required: false,
  },
  {
    type: "TRANSIT_INSURANCE",
    category: "OPERATIONAL",
    section: "OPERATIONAL",
    title: "Goods In-Transit Insurance Policy",
    description: "Cargo transit indemnity policy protecting customer goods (operational compliance; does not block core company approval).",
    required: false,
  },
];

const VENDORS_CACHE_KEY = "pm_admin_vendors_cache";

export default function AdminVendorsPage() {
  const [vendors, setVendors] = useState<VendorItem[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const cached = sessionStorage.getItem(VENDORS_CACHE_KEY);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed.vendors) && parsed.vendors.length > 0) return parsed.vendors;
        }
      } catch {}
    }
    return [];
  });

  const [loading, setLoading] = useState(() => {
    if (typeof window !== "undefined") {
      try {
        const cached = sessionStorage.getItem(VENDORS_CACHE_KEY);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed.vendors) && parsed.vendors.length > 0) return false;
        }
      } catch {}
    }
    return true;
  });

  const [isRefreshing, setIsRefreshing] = useState(false);
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
  const [allVendorCount, setAllVendorCount] = useState(() => {
    if (typeof window !== "undefined") {
      try {
        const cached = sessionStorage.getItem(VENDORS_CACHE_KEY);
        if (cached) return JSON.parse(cached).allVendorCount || 0;
      } catch {}
    }
    return 0;
  });

  const [approvedCount, setApprovedCount] = useState(() => {
    if (typeof window !== "undefined") {
      try {
        const cached = sessionStorage.getItem(VENDORS_CACHE_KEY);
        if (cached) return JSON.parse(cached).approvedCount || 0;
      } catch {}
    }
    return 0;
  });

  const [pendingCount, setPendingCount] = useState(() => {
    if (typeof window !== "undefined") {
      try {
        const cached = sessionStorage.getItem(VENDORS_CACHE_KEY);
        if (cached) return JSON.parse(cached).pendingCount || 0;
      } catch {}
    }
    return 0;
  });

  const [suspendedCount, setSuspendedCount] = useState(() => {
    if (typeof window !== "undefined") {
      try {
        const cached = sessionStorage.getItem(VENDORS_CACHE_KEY);
        if (cached) return JSON.parse(cached).suspendedCount || 0;
      } catch {}
    }
    return 0;
  });

  // Add Vendor Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [createdInvitationInfo, setCreatedInvitationInfo] = useState<{
    businessName: string;
    invitationUrl: string;
    invitationToken: string;
    deliveryStatus?: any;
  } | null>(null);
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

  // Document Single Review Prompt Modal
  const [docReviewPrompt, setDocReviewPrompt] = useState<{
    vendorId: string;
    docType: string;
    title: string;
    decision: "CHANGES_REQUESTED" | "REJECTED";
  } | null>(null);
  const [docReviewReason, setDocReviewReason] = useState("");

  // Document Quick Viewer Modal
  const [viewingFile, setViewingFile] = useState<{
    title: string;
    fileUrl: string;
    fileName?: string;
    fileSize?: string;
    docType?: string;
    vendorId?: string;
    vendorName?: string;
    status?: string;
    feedback?: string;
    idType?: string;
    maskedIdNumber?: string;
  } | null>(null);

  const handleDocumentDecision = async (
    vendorId: string,
    docType: string,
    decision: "APPROVED" | "CHANGES_REQUESTED" | "REJECTED",
    reason?: string
  ) => {
    try {
      // 1. Optimistically update in-place in inspectVendor
      setInspectVendor((prev) => {
        if (!prev) return null;
        const docs = [...(prev.verificationDetails?.documents || [])];
        const idx = docs.findIndex((d) => d.type === docType);
        const updatedDoc = {
          type: docType,
          status: decision,
          feedback: reason || (decision === "APPROVED" ? "Approved and verified by administrator." : decision === "CHANGES_REQUESTED" ? "Revision requested: please upload an updated copy." : "Document rejected by administrator."),
          reviewedAt: new Date().toISOString(),
        };
        if (idx >= 0) {
          docs[idx] = { ...docs[idx], ...updatedDoc };
        } else {
          docs.push(updatedDoc);
        }

        const changesRequested = docs.some((d) => d.status === "CHANGES_REQUESTED");
        const rejected = docs.some((d) => d.status === "REJECTED");
        const approvedCount = docs.filter((d) => d.status === "APPROVED").length;
        let newVendorStatus = prev.status;
        if (changesRequested) {
          newVendorStatus = "CHANGES_REQUESTED";
        } else if (rejected) {
          newVendorStatus = "REJECTED";
        } else if (docs.length >= 6 && approvedCount === docs.length) {
          newVendorStatus = "APPROVED";
        } else {
          newVendorStatus = "PENDING_REVIEW";
        }

        return {
          ...prev,
          status: newVendorStatus,
          verificationDetails: {
            ...prev.verificationDetails,
            documents: docs,
          },
        };
      });

      // 2. Optimistically update vendors list
      setVendors((prev) =>
        prev.map((v) => {
          if (v._id !== vendorId) return v;
          const docs = [...(v.verificationDetails?.documents || [])];
          const idx = docs.findIndex((d) => d.type === docType);
          const updatedDoc = {
            type: docType,
            status: decision,
            feedback: reason || "",
            reviewedAt: new Date().toISOString(),
          };
          if (idx >= 0) {
            docs[idx] = { ...docs[idx], ...updatedDoc };
          } else {
            docs.push(updatedDoc);
          }
          const changesRequested = docs.some((d) => d.status === "CHANGES_REQUESTED");
          const rejected = docs.some((d) => d.status === "REJECTED");
          const approvedCount = docs.filter((d) => d.status === "APPROVED").length;
          let newVendorStatus = v.status;
          if (changesRequested) newVendorStatus = "CHANGES_REQUESTED";
          else if (rejected) newVendorStatus = "REJECTED";
          else if (docs.length >= 6 && approvedCount === docs.length) newVendorStatus = "APPROVED";
          else newVendorStatus = "PENDING_REVIEW";

          return {
            ...v,
            status: newVendorStatus,
            verificationDetails: {
              ...v.verificationDetails,
              documents: docs,
            },
          };
        })
      );

      // 3. Update viewingFile if viewing in modal
      setViewingFile((prev) => {
        if (prev && prev.vendorId === vendorId && prev.docType === docType) {
          return {
            ...prev,
            status: decision,
            feedback: reason || prev.feedback,
          };
        }
        return prev;
      });

      // 4. Send API PATCH request to backend
      await fetchApi(`/admin/vendors/${vendorId}/documents/${docType}`, {
        method: "PATCH",
        body: JSON.stringify({
          decision,
          reason: reason || (decision === "APPROVED" ? "Approved and verified by administrator." : decision === "CHANGES_REQUESTED" ? "Revision requested: please upload an updated copy." : "Document rejected by administrator."),
        }),
      });

      showToast(`Document marked as ${decision === "APPROVED" ? "Approved" : decision === "CHANGES_REQUESTED" ? "Changes Requested" : "Rejected"} successfully.`);
      loadVendors();
    } catch (err: any) {
      setError(err.message || "Failed to update document status");
      loadVendors();
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((current) => (current === msg ? "" : current));
    }, 4000);
  };

  const loadVendors = async (forceSkeleton = false) => {
    if (forceSkeleton || vendors.length === 0) {
      setLoading(true);
    } else {
      setIsRefreshing(true);
    }
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

      const vList = res.vendors || [];
      const tPages = res.pagination?.totalPages || 1;
      const tCount = res.pagination?.total || 0;

      setVendors(vList);
      setTotalPages(tPages);
      setTotalCount(tCount);

      let allCount = tCount;
      let appCount = 0;
      let pendCount = 0;
      let suspCount = 0;

      if (statsRes) {
        allCount = statsRes.stats.totalVendors || 0;
        appCount = statsRes.stats.approvedVendors || 0;
        pendCount = statsRes.stats.pendingVendorRequests || 0;
        suspCount = statsRes.distributions?.vendorStatus?.SUSPENDED || 0;
        setAllVendorCount(allCount);
        setApprovedCount(appCount);
        setPendingCount(pendCount);
        setSuspendedCount(suspCount);
      } else {
        setAllVendorCount(tCount);
      }

      // Save default first page in session cache
      if (page === 1 && !search && statusFilter === "all") {
        try {
          sessionStorage.setItem(
            VENDORS_CACHE_KEY,
            JSON.stringify({
              vendors: vList,
              allVendorCount: allCount,
              approvedCount: appCount,
              pendingCount: pendCount,
              suspendedCount: suspCount,
            })
          );
        } catch {}
      }
    } catch (err: any) {
      setError(err.message || "Failed to load vendors");
    } finally {
      setLoading(false);
      setIsRefreshing(false);
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
      const res = await fetchApi<{
        vendor: any;
        invitationUrl?: string;
        invitationToken?: string;
        deliveryStatus?: any;
        message?: string;
      }>("/admin/vendors", {
        method: "POST",
        body: JSON.stringify({
          businessName: formBusinessName.trim(),
          contactPhone: formPhone.trim(),
          contactEmail: formEmail.trim() || undefined,
          serviceAreas: formAreas.split(",").map((s) => s.trim()).filter(Boolean),
          servicesOffered: formServices.split(",").map((s) => s.trim()).filter(Boolean),
        }),
      });

      setShowAddModal(false);
      const name = formBusinessName.trim();
      setFormBusinessName("");
      setFormPhone("");
      setFormEmail("");

      if (res?.invitationUrl) {
        setCreatedInvitationInfo({
          businessName: name,
          invitationUrl: res.invitationUrl,
          invitationToken: res.invitationToken || "",
          deliveryStatus: res.deliveryStatus,
        });
      }

      showToast(`Vendor "${name}" created with onboarding credentials!`);
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
        <div className="bg-slate-100 hover:bg-slate-200 hover:-translate-y-1 hover:shadow-lg p-4 rounded-2xl shadow-neu-flat border border-slate-200 flex items-center justify-between transition-all duration-300 cursor-pointer">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
              Total Fleet Vendors
            </p>
            <p className="text-2xl font-bold text-[#1E293B] mt-1 font-mono">{allVendorCount}</p>
            <p className="text-[11px] text-[#64748B] mt-0.5">Registered moving companies</p>
          </div>
          <div className="h-11 w-11 rounded-xl bg-white shadow-sm border border-slate-200 flex items-center justify-center text-[#1E293B] shrink-0">
            <Store size={20} />
          </div>
        </div>

        {/* Card 2: Approved Active */}
        <div className="bg-teal-50 hover:bg-teal-100 hover:-translate-y-1 hover:shadow-lg p-4 rounded-2xl shadow-neu-flat border border-teal-100 flex items-center justify-between transition-all duration-300 cursor-pointer">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
              Active & Approved
            </p>
            <p className="text-2xl font-bold text-[#14B8A6] mt-1 font-mono">{approvedCount}</p>
            <p className="text-[11px] text-[#64748B] mt-0.5">Dispatch & quote ready</p>
          </div>
          <div className="h-11 w-11 rounded-xl bg-white shadow-sm border border-teal-200/80 flex items-center justify-center text-[#14B8A6] shrink-0">
            <CheckCircle2 size={20} />
          </div>
        </div>

        {/* Card 3: Pending Review */}
        <div className="bg-amber-50 hover:bg-amber-100 hover:-translate-y-1 hover:shadow-lg p-4 rounded-2xl shadow-neu-flat border border-amber-100 flex items-center justify-between transition-all duration-300 cursor-pointer">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
              Pending Review
            </p>
            <p className="text-2xl font-bold text-[#F59E0B] mt-1 font-mono">{pendingCount}</p>
            <p className="text-[11px] text-[#64748B] mt-0.5">Awaiting authorization</p>
          </div>
          <div className="h-11 w-11 rounded-xl bg-white shadow-sm border border-amber-200/80 flex items-center justify-center text-[#F59E0B] shrink-0">
            <FileCheck2 size={20} />
          </div>
        </div>

        {/* Card 4: Suspended Fleet */}
        <div className="bg-rose-50 hover:bg-rose-100 hover:-translate-y-1 hover:shadow-lg p-4 rounded-2xl shadow-neu-flat border border-rose-100 flex items-center justify-between transition-all duration-300 cursor-pointer">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
              Suspended Fleet
            </p>
            <p className="text-2xl font-bold text-rose-600 mt-1 font-mono">{suspendedCount}</p>
            <p className="text-[11px] text-[#64748B] mt-0.5">Blocked from platform leads</p>
          </div>
          <div className="h-11 w-11 rounded-xl bg-white shadow-sm border border-rose-200/80 flex items-center justify-center text-rose-600 shrink-0">
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
            
            const getActiveClasses = (key: string) => {
              if (!isSelected) {
                switch(key) {
                  case "all": return "text-[#64748B] hover:text-slate-800 hover:bg-slate-100 hover:shadow-neu-raised-sm border border-transparent";
                  case "approved": return "text-[#64748B] hover:text-teal-800 hover:bg-teal-50 hover:shadow-neu-raised-sm border border-transparent";
                  case "pending": return "text-[#64748B] hover:text-amber-800 hover:bg-amber-50 hover:shadow-neu-raised-sm border border-transparent";
                  case "suspended": return "text-[#64748B] hover:text-rose-800 hover:bg-rose-50 hover:shadow-neu-raised-sm border border-transparent";
                  default: return "text-[#64748B] hover:text-[#1E293B] hover:shadow-neu-raised-sm";
                }
              }
              switch(key) {
                case "all": return "bg-slate-200 shadow-neu-raised-sm text-slate-800 font-bold border border-slate-300";
                case "approved": return "bg-teal-100 shadow-neu-raised-sm text-teal-800 font-bold border border-teal-200";
                case "pending": return "bg-amber-100 shadow-neu-raised-sm text-amber-800 font-bold border border-amber-200";
                case "suspended": return "bg-rose-100 shadow-neu-raised-sm text-rose-800 font-bold border border-rose-200";
                default: return "bg-[#EEF2F6] shadow-neu-raised-sm text-[#2563EB] font-bold border border-white/80";
              }
            };

            const getBadgeClasses = (key: string) => {
              if (!isSelected) return "bg-[#EEF2F6] shadow-neu-flat border border-white/80 text-[#64748B]";
              switch(key) {
                case "all": return "bg-slate-700 text-white shadow-sm";
                case "approved": return "bg-teal-700 text-white shadow-sm";
                case "pending": return "bg-amber-600 text-white shadow-sm";
                case "suspended": return "bg-rose-700 text-white shadow-sm";
                default: return "bg-[#374151] text-white";
              }
            };

            return (
              <button
                key={tab.key}
                onClick={() => {
                  setStatusFilter(tab.key);
                  setPage(1);
                }}
                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs transition cursor-pointer whitespace-nowrap ${getActiveClasses(tab.key)}`}
              >
                <span>{tab.label}</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono transition-colors ${getBadgeClasses(tab.key)}`}
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

      {/* Vendor Invitation Ready Modal */}
      {createdInvitationInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-2xs">
          <div className="w-full max-w-md bg-white rounded-3xl border border-slate-200 p-6 space-y-4 shadow-2xl animate-scaleUp">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2 text-emerald-600">
                <CheckCircle2 size={20} />
                <h3 className="font-bold text-sm text-slate-900">Carrier Company Registered</h3>
              </div>
              <button
                onClick={() => setCreatedInvitationInfo(null)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X size={16} />
              </button>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Carrier <strong>{createdInvitationInfo.businessName}</strong> has been registered in{" "}
              <span className="font-semibold text-amber-600">PENDING_REVIEW</span> status.
            </p>
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl text-amber-900 text-xs space-y-1">
              <p className="font-bold">Provider Status: Pending Configuration</p>
              <p className="text-[11px] text-amber-800 leading-relaxed">
                Automatic email/SMS dispatch is pending gateway setup. Please provide the secure invitation setup link directly to the carrier owner so they can create their password and submit documents:
              </p>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Invitation URL (Valid for 7 Days)</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={createdInvitationInfo.invitationUrl}
                  className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 border border-slate-300 font-mono text-slate-700"
                />
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(createdInvitationInfo.invitationUrl);
                    showToast("Invitation URL copied to clipboard!");
                  }}
                  className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shrink-0 cursor-pointer"
                >
                  Copy
                </button>
              </div>
            </div>
            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setCreatedInvitationInfo(null)}
                className="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Done
              </button>
            </div>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/50 backdrop-blur-2xs">
          <div className="w-full max-w-3xl bg-[#EEF2F6] rounded-3xl shadow-neu-flat border border-white/80 overflow-hidden shadow-2xl flex flex-col max-h-[90vh] animate-scaleUp">
            <div className="px-6 py-4 bg-[#EEF2F6] border-b border-[#D9E2EC]/70 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-blue-50/80 border border-blue-200/80 flex items-center justify-center font-bold text-sm text-[#2563EB] shadow-neu-inset-sm overflow-hidden">
                  {(inspectVendor as any).logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={(inspectVendor as any).logoUrl} alt="Logo" className="w-full h-full object-cover" />
                  ) : (
                    getMonogram(inspectVendor.businessName)
                  )}
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#1E293B]">{inspectVendor.businessName}</h3>
                  <p className="text-xs text-[#64748B]">Vendor ID: {inspectVendor._id}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setInspectVendor(null)}
                  className="p-1.5 text-[#64748B] hover:text-[#1E293B] rounded-xl transition cursor-pointer"
                  title="Close Modal"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-5 text-xs overflow-y-auto max-h-[70vh]">
              {/* Workforce Metrics Snapshot */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3.5 rounded-2xl bg-white/80 border border-[#D9E2EC]/70 shadow-xs">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Total Workforce</span>
                  <p className="text-base font-bold text-slate-900 mt-0.5">
                    {(inspectVendor as any).workforce?.totalEmployees ?? (inspectVendor as any).employeeCount ?? 0}
                  </p>
                  <span className="text-[10px] text-slate-400">Registered staff</span>
                </div>
                <div className="p-3.5 rounded-2xl bg-indigo-50/70 border border-indigo-100 shadow-xs">
                  <span className="text-[10px] font-bold text-indigo-600 uppercase block">Crew & Drivers</span>
                  <p className="text-base font-bold text-indigo-950 mt-0.5">
                    {(inspectVendor as any).workforce?.crewWorkers ?? 0}
                  </p>
                  <span className="text-[10px] text-indigo-400">Field movers</span>
                </div>
                <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-100 shadow-xs">
                  <span className="text-[10px] font-bold text-emerald-600 uppercase block">Active Staff</span>
                  <p className="text-base font-bold text-emerald-950 mt-0.5">
                    {(inspectVendor as any).workforce?.activeEmployees ?? 0}
                  </p>
                  <span className="text-[10px] text-emerald-400">Duty ready</span>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-white/70 border border-[#D9E2EC]/70 grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase block mb-0.5">Status</span>
                  <StatusBadge status={inspectVendor.status} />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase block mb-0.5">Registered Date</span>
                  <span className="font-semibold text-slate-800 font-mono text-[11px]">
                    {new Date(inspectVendor.createdAt).toLocaleDateString("en-IN")}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase block mb-0.5">Phone</span>
                  <p className="font-semibold text-slate-800 font-mono text-[11px]">{inspectVendor.contactPhone}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase block mb-0.5">Email</span>
                  <p className="text-slate-700 truncate text-[11px]">{inspectVendor.contactEmail || "—"}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Service Areas</span>
                  <div className="flex flex-wrap gap-1.5">
                    {inspectVendor.serviceAreas?.length ? (
                      inspectVendor.serviceAreas.map((a, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 bg-[#EEF2F6] shadow-neu-flat border border-white/80 rounded-lg text-slate-700 font-mono text-[11px]"
                        >
                          {a}
                        </span>
                      ))
                    ) : (
                      <span className="text-slate-400 italic text-[11px]">No specific areas registered</span>
                    )}
                  </div>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Offered Move Services</span>
                  <div className="flex flex-wrap gap-1.5">
                    {inspectVendor.servicesOffered?.length ? (
                      inspectVendor.servicesOffered.map((s, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 bg-[#EEF2F6] shadow-neu-flat border border-white/80 text-slate-700 rounded-lg capitalize text-[11px]"
                        >
                          {s}
                        </span>
                      ))
                    ) : (
                      <span className="text-slate-400 italic text-[11px]">Standard move services</span>
                    )}
                  </div>
                </div>
              </div>

              {/* SECTION 1: COMPANY VERIFICATION (2 CORE DOCUMENTS) */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between border-b border-[#D9E2EC]/70 pb-2">
                  <div className="flex items-center gap-2">
                    <Building2 size={16} className="text-[#2563EB]" />
                    <h4 className="font-bold text-xs uppercase tracking-wide text-slate-800">
                      Section 1 — Company Verification (Core Business Documents)
                    </h4>
                  </div>
                  <span className="text-[10px] font-bold text-[#2563EB] bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                    2 Core Documents Required
                  </span>
                </div>

                <div className="space-y-2.5">
                  {STANDARD_KYC_DOCS.filter((d) => d.section === "COMPANY" || d.type === "GST_CERTIFICATE" || d.type === "BUSINESS_PAN").map((std) => {
                    const submitted = (inspectVendor.verificationDetails?.documents || []).find(
                      (d: any) => d.type === std.type
                    );
                    const status = submitted?.status || "NOT_SUBMITTED";

                    return (
                      <AdminDocReviewRow
                        key={std.type}
                        title={std.title}
                        type={std.type}
                        description={std.description}
                        submitted={submitted}
                        status={status}
                        onView={() =>
                          setViewingFile({
                            title: std.title,
                            fileUrl: submitted?.fileUrl || `/api/v1/admin/vendors/${inspectVendor._id}/documents/${std.type}/view`,
                            fileName: submitted?.fileName,
                            fileSize: submitted?.fileSize,
                            docType: std.type,
                            vendorId: inspectVendor._id,
                            vendorName: inspectVendor.businessName,
                            status,
                            feedback: submitted?.feedback,
                            idType: submitted?.idType,
                            maskedIdNumber: submitted?.maskedIdNumber,
                          })
                        }
                        onApprove={() => handleDocumentDecision(inspectVendor._id, std.type, "APPROVED", submitted?.feedback || "Approved and verified by administrator.")}
                        onRequestChanges={() => handleDocumentDecision(inspectVendor._id, std.type, "CHANGES_REQUESTED", submitted?.feedback || "Revision requested: please upload an updated and clear copy.")}
                        onReject={() => handleDocumentDecision(inspectVendor._id, std.type, "REJECTED", submitted?.feedback || "Document rejected by administrator.")}
                        onFeedbackNotes={() => {
                          setDocReviewReason(submitted?.feedback || "");
                          setDocReviewPrompt({
                            vendorId: inspectVendor._id,
                            docType: std.type,
                            title: std.title,
                            decision: status === "REJECTED" ? "REJECTED" : "CHANGES_REQUESTED",
                          });
                        }}
                      />
                    );
                  })}
                </div>
              </div>

              {/* SECTION 2: OWNER / REPRESENTATIVE VERIFICATION (2 CORE DOCUMENTS) */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between border-b border-[#D9E2EC]/70 pb-2">
                  <div className="flex items-center gap-2">
                    <UserCheck size={16} className="text-[#14B8A6]" />
                    <h4 className="font-bold text-xs uppercase tracking-wide text-slate-800">
                      Section 2 — Owner / Authorized Representative Verification
                    </h4>
                  </div>
                  <span className="text-[10px] font-bold text-[#14B8A6] bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                    2 Required Items
                  </span>
                </div>

                <div className="space-y-2.5">
                  {STANDARD_KYC_DOCS.filter((d) => d.section === "REPRESENTATIVE" || d.type === "REPRESENTATIVE_ID_PROOF" || d.type === "REPRESENTATIVE_PHOTO").map((std) => {
                    const submitted = (inspectVendor.verificationDetails?.documents || []).find(
                      (d: any) => d.type === std.type
                    );
                    const status = submitted?.status || "NOT_SUBMITTED";

                    return (
                      <AdminDocReviewRow
                        key={std.type}
                        title={std.title}
                        type={std.type}
                        description={std.description}
                        submitted={submitted}
                        status={status}
                        isPhoto={std.type === "REPRESENTATIVE_PHOTO"}
                        onView={() =>
                          setViewingFile({
                            title: std.title,
                            fileUrl: submitted?.fileUrl || `/api/v1/admin/vendors/${inspectVendor._id}/documents/${std.type}/view`,
                            fileName: submitted?.fileName,
                            fileSize: submitted?.fileSize,
                            docType: std.type,
                            vendorId: inspectVendor._id,
                            vendorName: inspectVendor.businessName,
                            status,
                            feedback: submitted?.feedback,
                            idType: submitted?.idType,
                            maskedIdNumber: submitted?.maskedIdNumber,
                          })
                        }
                        onApprove={() => handleDocumentDecision(inspectVendor._id, std.type, "APPROVED", submitted?.feedback || "Approved and verified by administrator.")}
                        onRequestChanges={() => handleDocumentDecision(inspectVendor._id, std.type, "CHANGES_REQUESTED", submitted?.feedback || "Revision requested: please upload an updated and clear copy.")}
                        onReject={() => handleDocumentDecision(inspectVendor._id, std.type, "REJECTED", submitted?.feedback || "Document rejected by administrator.")}
                        onFeedbackNotes={() => {
                          setDocReviewReason(submitted?.feedback || "");
                          setDocReviewPrompt({
                            vendorId: inspectVendor._id,
                            docType: std.type,
                            title: std.title,
                            decision: status === "REJECTED" ? "REJECTED" : "CHANGES_REQUESTED",
                          });
                        }}
                      />
                    );
                  })}
                </div>
              </div>

              {/* SECTION 3: OPERATIONAL COMPLIANCE (OPTIONAL / SERVICE-SPECIFIC) */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between border-b border-[#D9E2EC]/70 pb-2">
                  <div className="flex items-center gap-2">
                    <ShieldCheck size={16} className="text-emerald-600" />
                    <h4 className="font-bold text-xs uppercase tracking-wide text-slate-800">
                      Section 3 — Operational Compliance (Optional / Service-Specific)
                    </h4>
                  </div>
                  <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                    Does not block core approval
                  </span>
                </div>

                <div className="space-y-2.5">
                  {STANDARD_KYC_DOCS.filter((d) => d.section === "OPERATIONAL" || d.type === "TRANSPORT_PERMIT" || d.type === "TRANSIT_INSURANCE").map((std) => {
                    const submitted = (inspectVendor.verificationDetails?.documents || []).find(
                      (d: any) => d.type === std.type
                    );
                    const status = submitted?.status || "NOT_SUBMITTED";

                    return (
                      <AdminDocReviewRow
                        key={std.type}
                        title={std.title}
                        type={std.type}
                        description={std.description}
                        submitted={submitted}
                        status={status}
                        onView={() =>
                          setViewingFile({
                            title: std.title,
                            fileUrl: submitted?.fileUrl || `/api/v1/admin/vendors/${inspectVendor._id}/documents/${std.type}/view`,
                            fileName: submitted?.fileName,
                            fileSize: submitted?.fileSize,
                            docType: std.type,
                            vendorId: inspectVendor._id,
                            vendorName: inspectVendor.businessName,
                            status,
                            feedback: submitted?.feedback,
                            idType: submitted?.idType,
                            maskedIdNumber: submitted?.maskedIdNumber,
                          })
                        }
                        onApprove={() => handleDocumentDecision(inspectVendor._id, std.type, "APPROVED", submitted?.feedback || "Approved and verified by administrator.")}
                        onRequestChanges={() => handleDocumentDecision(inspectVendor._id, std.type, "CHANGES_REQUESTED", submitted?.feedback || "Revision requested: please upload an updated and clear copy.")}
                        onReject={() => handleDocumentDecision(inspectVendor._id, std.type, "REJECTED", submitted?.feedback || "Document rejected by administrator.")}
                        onFeedbackNotes={() => {
                          setDocReviewReason(submitted?.feedback || "");
                          setDocReviewPrompt({
                            vendorId: inspectVendor._id,
                            docType: std.type,
                            title: std.title,
                            decision: status === "REJECTED" ? "REJECTED" : "CHANGES_REQUESTED",
                          });
                        }}
                      />
                    );
                  })}
                </div>
              </div>
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

      {/* DOCUMENT FEEDBACK / REVISION REASON PROMPT */}
      {docReviewPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-[#EEF2F6] rounded-3xl shadow-neu-flat border border-white/80 p-6 max-w-md w-full space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-[#D9E2EC]/80 pb-3">
              <h3 className="text-sm font-bold text-slate-900">
                {docReviewPrompt.decision === "CHANGES_REQUESTED"
                  ? "Request Changes on Document"
                  : "Reject Document"}
              </h3>
              <button
                onClick={() => setDocReviewPrompt(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Document: <strong>{docReviewPrompt.title}</strong>
            </p>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-600 uppercase">
                Admin Review Feedback / Reason for Vendor *
              </label>
              <textarea
                rows={3}
                required
                value={docReviewReason}
                onChange={(e) => setDocReviewReason(e.target.value)}
                placeholder="e.g. Document image is blurry or expired. Please upload a clear valid copy."
                className="w-full px-3 py-2 bg-[#EEF2F6] shadow-neu-inset-sm rounded-xl border border-white/60 text-xs text-slate-900 focus:outline-hidden"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#D9E2EC]/70">
              <button
                onClick={() => setDocReviewPrompt(null)}
                className="neu-btn px-4 py-1.5 rounded-xl text-xs font-semibold text-slate-600 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const fallback =
                    docReviewPrompt.decision === "CHANGES_REQUESTED"
                      ? "Revision requested: please upload an updated and clear copy."
                      : "Document rejected by administrator.";
                  const finalReason = docReviewReason.trim() || fallback;
                  handleDocumentDecision(
                    docReviewPrompt.vendorId,
                    docReviewPrompt.docType,
                    docReviewPrompt.decision,
                    finalReason
                  );
                  setDocReviewPrompt(null);
                  setDocReviewReason("");
                }}
                className={`px-4 py-1.5 rounded-xl text-xs font-bold text-white shadow-neu-raised-sm cursor-pointer transition ${
                  docReviewPrompt.decision === "REJECTED"
                    ? "bg-rose-600 hover:bg-rose-700"
                    : "bg-amber-600 hover:bg-amber-700"
                }`}
              >
                {docReviewPrompt.decision === "CHANGES_REQUESTED"
                  ? "Submit Revision Request"
                  : "Confirm Reject"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AUTHENTICATED PDF / KYC DOCUMENT VIEWER MODAL */}
      <DocumentViewerModal
        isOpen={!!viewingFile}
        title={viewingFile?.title || "Verification Document"}
        fileUrl={viewingFile?.fileUrl}
        fileName={viewingFile?.fileName}
        fileSize={viewingFile?.fileSize}
        docType={viewingFile?.docType}
        vendorName={viewingFile?.vendorName}
        status={viewingFile?.status}
        feedback={viewingFile?.feedback}
        idType={viewingFile?.idType}
        maskedIdNumber={viewingFile?.maskedIdNumber}
        onClose={() => setViewingFile(null)}
        isAdmin={true}
        onApprove={() => {
          if (viewingFile?.vendorId && viewingFile?.docType) {
            handleDocumentDecision(
              viewingFile.vendorId,
              viewingFile.docType,
              "APPROVED",
              viewingFile.feedback || "Approved and verified by administrator."
            );
            setViewingFile(null);
          }
        }}
        onRequestChanges={() => {
          if (viewingFile?.vendorId && viewingFile?.docType) {
            handleDocumentDecision(
              viewingFile.vendorId,
              viewingFile.docType,
              "CHANGES_REQUESTED",
              viewingFile.feedback || "Revision requested: please upload an updated and clear copy."
            );
            setViewingFile(null);
          }
        }}
        onReject={() => {
          if (viewingFile?.vendorId && viewingFile?.docType) {
            handleDocumentDecision(
              viewingFile.vendorId,
              viewingFile.docType,
              "REJECTED",
              viewingFile.feedback || "Document rejected by administrator."
            );
            setViewingFile(null);
          }
        }}
      />
    </div>
  );
}

// Reusable Document Row for Admin Review
function AdminDocReviewRow({
  title,
  type,
  description,
  submitted,
  status,
  isPhoto,
  onView,
  onApprove,
  onRequestChanges,
  onReject,
  onFeedbackNotes,
}: {
  title: string;
  type: string;
  description: string;
  submitted?: DocumentRecord;
  status: string;
  isPhoto?: boolean;
  onView: () => void;
  onApprove: () => void;
  onRequestChanges: () => void;
  onReject: () => void;
  onFeedbackNotes?: () => void;
}) {
  return (
    <div className="p-3.5 rounded-2xl bg-[#EEF2F6] shadow-neu-inset-sm border border-white/80 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
      <div className="space-y-1 min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-bold text-slate-900">{title}</span>
          <StatusBadge status={status} />
          {submitted?.idType && (
            <span className="text-[10px] font-bold text-[#2563EB] bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
              {submitted.idType}
            </span>
          )}
          {submitted?.maskedIdNumber && (
            <span className="text-[10px] font-mono text-slate-600">
              {submitted.maskedIdNumber}
            </span>
          )}
        </div>

        <p className="text-[11px] text-slate-500">{description}</p>

        {submitted?.feedback && (
          <div className="p-2 rounded-lg bg-amber-50 border border-amber-200/80 text-[11px] text-amber-900">
            <span className="font-bold">Review Feedback:</span> {submitted.feedback}
          </div>
        )}

        <div className="flex items-center gap-3 text-[10px] text-slate-500 pt-0.5 font-mono">
          <span>File: {submitted?.fileName || (submitted?.fileUrl ? "attachment" : "None")}</span>
          {submitted?.fileSize && <span>• {submitted.fileSize}</span>}
          {submitted?.submittedAt && (
            <span>• Submitted {new Date(submitted.submittedAt).toLocaleDateString("en-IN")}</span>
          )}
        </div>
      </div>

      {/* Review Actions: Contextual Bidirectional State Toggles */}
      <div className="flex items-center gap-1.5 shrink-0 self-end md:self-center flex-wrap justify-end">
        {submitted?.fileUrl && (
          <button
            onClick={onView}
            className="neu-btn px-2.5 py-1 text-slate-700 hover:text-[#2563EB] rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer"
            title="Inspect File"
          >
            <Eye size={12} />
            <span>View</span>
          </button>
        )}

        {/* If APPROVED */}
        {status === "APPROVED" && (
          <>
            <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
              <Check size={11} /> Approved
            </span>
            <button
              onClick={onRequestChanges}
              className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-900 transition cursor-pointer flex items-center gap-1"
              title="Change decision: Request revision"
            >
              <RotateCcw size={12} />
              <span>Revise</span>
            </button>
            <button
              onClick={onReject}
              className="px-2.5 py-1 rounded-lg text-xs font-semibold text-rose-600 hover:bg-rose-50 border border-rose-200 transition cursor-pointer flex items-center gap-1"
              title="Change decision: Reject document"
            >
              <X size={12} />
              <span>Reject</span>
            </button>
          </>
        )}

        {/* If CHANGES_REQUESTED */}
        {status === "CHANGES_REQUESTED" && (
          <>
            <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1">
              <RotateCcw size={11} /> Revision Needed
            </span>
            <button
              onClick={onApprove}
              className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition cursor-pointer flex items-center gap-1 shadow-xs"
              title="Change decision: Approve document"
            >
              <Check size={12} />
              <span>Approve</span>
            </button>
            <button
              onClick={onReject}
              className="px-2.5 py-1 rounded-lg text-xs font-semibold text-rose-600 hover:bg-rose-50 border border-rose-200 transition cursor-pointer flex items-center gap-1"
              title="Change decision: Reject document"
            >
              <X size={12} />
              <span>Reject</span>
            </button>
          </>
        )}

        {/* If REJECTED */}
        {status === "REJECTED" && (
          <>
            <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300 flex items-center gap-1">
              <X size={11} /> Rejected
            </span>
            <button
              onClick={onApprove}
              className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition cursor-pointer flex items-center gap-1 shadow-xs"
              title="Change decision: Approve document"
            >
              <Check size={12} />
              <span>Approve</span>
            </button>
            <button
              onClick={onRequestChanges}
              className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-900 transition cursor-pointer flex items-center gap-1"
              title="Change decision: Request revision"
            >
              <RotateCcw size={12} />
              <span>Revise</span>
            </button>
          </>
        )}

        {/* If PENDING_REVIEW or other */}
        {status !== "APPROVED" && status !== "CHANGES_REQUESTED" && status !== "REJECTED" && (
          <>
            <button
              onClick={onApprove}
              className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-300 transition cursor-pointer flex items-center gap-1"
              title="Approve document"
            >
              <Check size={12} />
              <span>Approve</span>
            </button>
            <button
              onClick={onRequestChanges}
              className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-900 transition cursor-pointer flex items-center gap-1"
              title="Request revision"
            >
              <RotateCcw size={12} />
              <span>Revise</span>
            </button>
            <button
              onClick={onReject}
              className="px-2.5 py-1 rounded-lg text-xs font-semibold text-rose-600 hover:bg-rose-50 border border-rose-200 transition cursor-pointer flex items-center gap-1"
              title="Reject document"
            >
              <X size={12} />
              <span>Reject</span>
            </button>
          </>
        )}

        {/* Optional Custom Notes */}
        {onFeedbackNotes && (
          <button
            onClick={onFeedbackNotes}
            className="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 rounded-md transition cursor-pointer"
            title="Add or Edit Feedback Notes"
          >
            <MessageSquare size={13} />
          </button>
        )}
      </div>
    </div>
  );
}
