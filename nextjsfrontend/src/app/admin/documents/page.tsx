"use client";

import { useState, useEffect, useMemo } from "react";
import { fetchApi, getDocumentStreamUrl } from "@/lib/api";
import PageHeader from "../components/PageHeader";
import StatusBadge from "../components/StatusBadge";
import DocumentViewerModal from "../components/DocumentViewerModal";
import {
  FileCheck2,
  RefreshCw,
  RotateCcw,
  Search,
  Eye,
  Check,
  X,
  MessageSquare,
  AlertCircle,
  FileText,
  Building2,
  UserCheck,
  Download,
  ExternalLink,
  ShieldCheck,
  Clock,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Phone,
  Layers,
  Camera,
  ChevronDown,
  ChevronUp,
  FolderOpen,
  Award,
  Sparkles,
  TrendingUp,
  LayoutGrid,
  Filter,
} from "lucide-react";

interface AdminDocument {
  vendorId: string;
  businessName: string;
  vendorPhone: string;
  vendorEmail?: string;
  vendorStatus: string;
  type: string;
  title: string;
  category: "BUSINESS" | "REPRESENTATIVE";
  description: string;
  fileUrl?: string;
  fileName: string;
  fileSize: string;
  idType?: string;
  maskedIdNumber?: string;
  notes?: string;
  status: "NOT_SUBMITTED" | "PENDING_REVIEW" | "CHANGES_REQUESTED" | "APPROVED" | "REJECTED";
  submittedAt?: string;
  reviewedAt?: string;
  feedback?: string;
}

interface VendorCompanyGroup {
  vendorId: string;
  businessName: string;
  contactPhone: string;
  contactEmail?: string;
  status: string;
  createdAt: string;
  totalDocuments: number;
  totalRequired: number;
  approvedCount: number;
  pendingCount: number;
  changesRequestedCount: number;
  rejectedCount: number;
  compliancePercentage: number;
  documents: AdminDocument[];
}

interface Stats {
  total: number;
  pending: number;
  approved: number;
  changesRequested: number;
  rejected: number;
  businessCount: number;
  representativeCount: number;
  totalCompanies?: number;
  fullyApprovedCompanies?: number;
  pendingReviewCompanies?: number;
  changesRequestedCompanies?: number;
  avgComplianceScore?: number;
}

function PhotoThumbnail({
  fileUrl,
  fileName,
  fileSize,
  onClick,
}: {
  fileUrl: string;
  fileName: string;
  fileSize?: string;
  onClick?: () => void;
}) {
  const [imgError, setImgError] = useState(false);
  const streamUrl = getDocumentStreamUrl(fileUrl);

  return (
    <div
      onClick={onClick}
      className="p-2.5 rounded-xl bg-[#EEF2F6] shadow-neu-inset-sm border border-white/60 flex items-center gap-3 cursor-pointer hover:bg-slate-200/50 transition group"
      title="Click to inspect verified photo"
    >
      <div className="h-14 w-14 rounded-xl overflow-hidden border border-white shadow-neu-raised-sm shrink-0 bg-slate-200 flex items-center justify-center relative">
        {!imgError ? (
          <img
            src={streamUrl}
            alt="Live Biometric Verification"
            onError={() => setImgError(true)}
            className="h-full w-full object-cover group-hover:scale-105 transition duration-200"
          />
        ) : (
          <div className="h-full w-full flex flex-col items-center justify-center bg-teal-50 text-teal-600">
            <Camera size={20} />
          </div>
        )}
        <div className="absolute bottom-0.5 right-0.5 h-3.5 w-3.5 bg-teal-500 rounded-full border border-white flex items-center justify-center text-white shadow-xs">
          <Check size={8} />
        </div>
      </div>
      <div className="min-w-0 text-xs">
        <span className="text-[10px] font-bold uppercase tracking-wider text-[#14B8A6] block">
          ● Biometric Camera Selfie Verified
        </span>
        <p className="text-[11px] font-mono text-[#64748B] truncate mt-0.5">
          {fileName}
        </p>
        {fileSize && <span className="text-[10px] text-[#94A3B8]">{fileSize}</span>}
      </div>
    </div>
  );
}

export default function AdminDocumentsPage() {
  // State for raw documents and grouped companies from MongoDB Atlas
  const [companies, setCompanies] = useState<VendorCompanyGroup[]>([]);
  const [documents, setDocuments] = useState<AdminDocument[]>([]);
  const [stats, setStats] = useState<Stats>({
    total: 0,
    pending: 0,
    approved: 0,
    changesRequested: 0,
    rejected: 0,
    businessCount: 0,
    representativeCount: 0,
    totalCompanies: 0,
    fullyApprovedCompanies: 0,
    pendingReviewCompanies: 0,
    avgComplianceScore: 0,
  });

  const [loading, setLoading] = useState(true);

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // View Mode: 'companies' (grouped by carrier fleet) vs 'flat' (all documents grid)
  const [viewMode, setViewMode] = useState<"companies" | "flat">("companies");

  // Accordion state for expanded companies: set of vendorIds
  const [expandedCompanies, setExpandedCompanies] = useState<Record<string, boolean>>({});

  // Filters
  const [search, setSearch] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  // In-Viewer Modal
  const [inspectDoc, setInspectDoc] = useState<AdminDocument | null>(null);

  // Feedback Revision Dialog
  const [revisionPrompt, setRevisionPrompt] = useState<{
    vendorId: string;
    docType: string;
    title: string;
    decision: "CHANGES_REQUESTED" | "REJECTED";
  } | null>(null);
  const [revisionReason, setRevisionReason] = useState("");
  const [submittingDecision, setSubmittingDecision] = useState(false);

  const fetchDocuments = async (forceShowSkeleton = false) => {
    try {
      if (forceShowSkeleton) {
        setLoading(true);
      } else {
        setIsRefreshing(true);
      }
      setError(null);
      const res = await fetchApi<{
        companies?: VendorCompanyGroup[];
        documents: AdminDocument[];
        stats: Stats;
      }>("/admin/documents");

      const docs = res.documents || [];
      const fetchedCompanies = res.companies || [];
      const st = res.stats || {
        total: docs.length,
        pending: docs.filter((d) => d.status === "PENDING_REVIEW").length,
        approved: docs.filter((d) => d.status === "APPROVED").length,
        changesRequested: docs.filter((d) => d.status === "CHANGES_REQUESTED").length,
        rejected: docs.filter((d) => d.status === "REJECTED").length,
        businessCount: docs.filter((d) => d.category === "BUSINESS").length,
        representativeCount: docs.filter((d) => d.category === "REPRESENTATIVE").length,
        totalCompanies: fetchedCompanies.length,
        fullyApprovedCompanies: fetchedCompanies.filter((c) => c.compliancePercentage === 100).length,
        pendingReviewCompanies: fetchedCompanies.filter((c) => c.pendingCount > 0).length,
        avgComplianceScore:
          fetchedCompanies.length > 0
            ? Math.round(
                fetchedCompanies.reduce((acc, c) => acc + c.compliancePercentage, 0) /
                  fetchedCompanies.length
              )
            : 0,
      };

      setDocuments(docs);
      setCompanies(fetchedCompanies);
      setStats(st);

      // Default expand all companies or the first 3
      const initialExpanded: Record<string, boolean> = {};
      fetchedCompanies.forEach((c, index) => {
        // Expand first 3 or any with pending review by default
        initialExpanded[c.vendorId] = index < 3 || c.pendingCount > 0;
      });
      setExpandedCompanies((prev) => (Object.keys(prev).length === 0 ? initialExpanded : prev));
    } catch (err: any) {
      setError(err.message || "Failed to load vendor compliance documents.");
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDocuments(true);
  }, []);

  const toggleCompany = (vendorId: string) => {
    setExpandedCompanies((prev) => ({
      ...prev,
      [vendorId]: !prev[vendorId],
    }));
  };

  const expandAll = () => {
    const all: Record<string, boolean> = {};
    companies.forEach((c) => {
      all[c.vendorId] = true;
    });
    setExpandedCompanies(all);
  };

  const collapseAll = () => {
    setExpandedCompanies({});
  };

  const handleDocumentDecision = async (
    vendorId: string,
    docType: string,
    decision: "APPROVED" | "CHANGES_REQUESTED" | "REJECTED",
    reason?: string
  ) => {
    try {
      setSubmittingDecision(true);
      setError(null);

      // 1. Send API PATCH request to backend (MongoDB update occurs first)
      const patchRes = await fetchApi<{
        message?: string;
        vendor?: any;
        updatedDocument?: any;
        companyDossier?: any;
      }>(`/admin/vendors/${vendorId}/documents/${docType}`, {
        method: "PATCH",
        body: JSON.stringify({ decision, reason }),
      });

      // 2. Authoritatively apply MongoDB response to state
      if (patchRes?.companyDossier) {
        setCompanies((prev) =>
          prev.map((c) => (c.vendorId === vendorId ? patchRes.companyDossier : c))
        );
      }
      if (patchRes?.updatedDocument) {
        setDocuments((prev) =>
          prev.map((d) =>
            d.vendorId === vendorId && d.type === docType ? patchRes.updatedDocument : d
          )
        );
        if (inspectDoc && inspectDoc.vendorId === vendorId && inspectDoc.type === docType) {
          setInspectDoc(patchRes.updatedDocument);
        }
      }

      setSuccessToast(
        decision === "APPROVED"
          ? `Document "${docType}" verified & approved successfully.`
          : decision === "CHANGES_REQUESTED"
          ? `Revision request sent to vendor with feedback notes.`
          : `Document marked as rejected.`
      );
      setTimeout(() => setSuccessToast(null), 3500);

      // 3. Re-fetch full authoritative data from MongoDB to guarantee 100% database synchronicity
      await fetchDocuments(false);
    } catch (err: any) {
      // If MongoDB update fails: do NOT show success, do NOT change status visually, show real error
      setError(err.message || "Failed to update document review status.");
    } finally {
      setSubmittingDecision(false);
      setRevisionPrompt(null);
      setRevisionReason("");
    }
  };

  // Filtered companies based on search and status
  const filteredCompanies = useMemo(() => {
    return companies.filter((company) => {
      const term = search.trim().toLowerCase();
      const matchesSearch =
        term === "" ||
        company.businessName.toLowerCase().includes(term) ||
        company.contactPhone.includes(term) ||
        (company.contactEmail && company.contactEmail.toLowerCase().includes(term)) ||
        company.vendorId.toLowerCase().includes(term) ||
        company.documents.some(
          (d) =>
            d.title.toLowerCase().includes(term) ||
            d.type.toLowerCase().includes(term) ||
            (d.fileName && d.fileName.toLowerCase().includes(term)) ||
            (d.maskedIdNumber && d.maskedIdNumber.includes(term))
        );

      let matchesStatus = true;
      if (selectedStatus === "PENDING_REVIEW") {
        matchesStatus = company.pendingCount > 0 || company.status === "PENDING_REVIEW";
      } else if (selectedStatus === "APPROVED") {
        matchesStatus = company.compliancePercentage === 100 || company.status === "APPROVED";
      } else if (selectedStatus === "CHANGES_REQUESTED") {
        matchesStatus = company.changesRequestedCount > 0 || company.status === "CHANGES_REQUESTED";
      } else if (selectedStatus === "REJECTED") {
        matchesStatus = company.rejectedCount > 0 || company.status === "REJECTED";
      }

      return matchesSearch && matchesStatus;
    });
  }, [companies, search, selectedStatus]);

  // Filtered flat documents list
  const filteredDocuments = useMemo(() => {
    return documents.filter((doc) => {
      const matchesStatus = selectedStatus === "all" || doc.status === selectedStatus;
      const matchesCategory =
        selectedCategory === "all" ||
        doc.category.toLowerCase() === selectedCategory.toLowerCase();

      const term = search.trim().toLowerCase();
      const matchesSearch =
        term === "" ||
        doc.businessName.toLowerCase().includes(term) ||
        doc.title.toLowerCase().includes(term) ||
        doc.type.toLowerCase().includes(term) ||
        (doc.fileName && doc.fileName.toLowerCase().includes(term)) ||
        (doc.vendorPhone && doc.vendorPhone.includes(term)) ||
        (doc.idType && doc.idType.toLowerCase().includes(term)) ||
        (doc.maskedIdNumber && doc.maskedIdNumber.includes(term));

      return matchesStatus && matchesCategory && matchesSearch;
    });
  }, [documents, selectedStatus, selectedCategory, search]);

  const getMonogram = (name: string) => {
    return name
      .split(" ")
      .map((w) => w[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  };

  // Helper renderer for a single document item card
  const renderDocumentCard = (doc: AdminDocument) => {
    const isPhoto = doc.type === "REPRESENTATIVE_PHOTO";
    const isPdf =
      doc.fileName?.toLowerCase().endsWith(".pdf") ||
      doc.fileUrl?.startsWith("data:application/pdf");

    return (
      <div
        key={`${doc.vendorId}-${doc.type}`}
        className="p-4 rounded-2xl bg-[#EEF2F6] shadow-neu-inset-sm border border-white/80 flex flex-col justify-between space-y-3 transition hover:border-slate-300/80"
      >
        <div className="space-y-2">
          {/* Header row: Doc title, Type pill, Status Badge */}
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <h4 className="text-xs font-extrabold text-[#1E293B]">{doc.title}</h4>
                <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-white/70 shadow-xs text-[#2563EB]">
                  {doc.type}
                </span>
              </div>
              <p className="text-[10px] text-[#64748B] mt-0.5 line-clamp-1">{doc.description}</p>
            </div>
            <StatusBadge status={doc.status} />
          </div>

          {/* ID Proof Extra Info */}
          {doc.idType && (
            <div className="px-2.5 py-1.5 rounded-lg bg-white/80 border border-[#D9E2EC]/70 flex items-center justify-between text-[11px]">
              <div className="flex items-center gap-1.5">
                <UserCheck size={12} className="text-[#2563EB]" />
                <span className="font-semibold text-slate-700">{doc.idType}</span>
              </div>
              {doc.maskedIdNumber && (
                <span className="font-mono font-bold text-[#2563EB] text-[10px]">
                  {doc.maskedIdNumber}
                </span>
              )}
            </div>
          )}

          {/* Representative Selfie Photo Preview */}
          {isPhoto && doc.fileUrl && (
            <PhotoThumbnail
              fileUrl={doc.fileUrl}
              fileName={doc.fileName}
              fileSize={doc.fileSize}
              onClick={() => setInspectDoc(doc)}
            />
          )}

          {/* Previous Review Feedback Notes */}
          {doc.feedback && (
            <div className="p-2 rounded-xl bg-amber-50 border border-amber-200/80 text-amber-900 text-[11px] space-y-0.5">
              <span className="text-[9px] font-bold uppercase tracking-wider block text-amber-700">
                Review Feedback / Revisions:
              </span>
              <p className="leading-relaxed text-amber-950 font-medium">{doc.feedback}</p>
            </div>
          )}

          {/* File Metadata */}
          <div className="flex items-center justify-between text-[10px] text-[#64748B] font-mono pt-1">
            <span className="truncate max-w-[170px]" title={doc.fileName}>
              📄 {doc.fileName}
            </span>
            <span>{doc.fileSize}</span>
            <span>
              {doc.submittedAt ? new Date(doc.submittedAt).toLocaleDateString("en-IN") : "—"}
            </span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="pt-2.5 border-t border-[#D9E2EC]/70 flex items-center justify-between gap-2">
          <button
            onClick={() => setInspectDoc(doc)}
            className="neu-btn px-2.5 py-1.5 rounded-xl text-[11px] font-bold text-[#2563EB] hover:text-[#1D4ED8] flex items-center gap-1.5 shadow-neu-raised-sm cursor-pointer"
          >
            <Eye size={12} />
            <span>{isPdf ? "View PDF" : "Inspect"}</span>
          </button>

          <div className="flex items-center gap-1.5 flex-wrap justify-end">
            {/* If APPROVED: show current status badge + available actions: [Request Changes] & [Reject] */}
            {doc.status === "APPROVED" && (
              <>
                <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                  <Check size={11} /> Approved
                </span>
                <button
                  disabled={submittingDecision}
                  onClick={() =>
                    handleDocumentDecision(
                      doc.vendorId,
                      doc.type,
                      "CHANGES_REQUESTED",
                      doc.feedback || "Revision requested: please upload an updated and clear copy."
                    )
                  }
                  className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-900 transition cursor-pointer flex items-center gap-1"
                  title="Change decision: Request revision"
                >
                  <RotateCcw size={11} />
                  <span>Revise</span>
                </button>
                <button
                  disabled={submittingDecision}
                  onClick={() =>
                    handleDocumentDecision(
                      doc.vendorId,
                      doc.type,
                      "REJECTED",
                      doc.feedback || "Document rejected by administrator."
                    )
                  }
                  className="px-2.5 py-1 rounded-lg text-[11px] font-semibold text-rose-600 hover:bg-rose-50 border border-rose-200 transition cursor-pointer flex items-center gap-1"
                  title="Change decision: Reject document"
                >
                  <X size={11} />
                  <span>Reject</span>
                </button>
              </>
            )}

            {/* If CHANGES_REQUESTED: show current status badge + available actions: [Approve] & [Reject] */}
            {doc.status === "CHANGES_REQUESTED" && (
              <>
                <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1">
                  <RotateCcw size={11} /> Revision Needed
                </span>
                <button
                  disabled={submittingDecision}
                  onClick={() =>
                    handleDocumentDecision(
                      doc.vendorId,
                      doc.type,
                      "APPROVED",
                      doc.feedback || "Approved and verified by administrator."
                    )
                  }
                  className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition cursor-pointer flex items-center gap-1 shadow-xs"
                  title="Change decision: Approve document"
                >
                  <Check size={11} />
                  <span>Approve</span>
                </button>
                <button
                  disabled={submittingDecision}
                  onClick={() =>
                    handleDocumentDecision(
                      doc.vendorId,
                      doc.type,
                      "REJECTED",
                      doc.feedback || "Document rejected by administrator."
                    )
                  }
                  className="px-2.5 py-1 rounded-lg text-[11px] font-semibold text-rose-600 hover:bg-rose-50 border border-rose-200 transition cursor-pointer flex items-center gap-1"
                  title="Change decision: Reject document"
                >
                  <X size={11} />
                  <span>Reject</span>
                </button>
              </>
            )}

            {/* If REJECTED: show current status badge + available actions: [Approve] & [Request Changes] */}
            {doc.status === "REJECTED" && (
              <>
                <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300 flex items-center gap-1">
                  <X size={11} /> Rejected
                </span>
                <button
                  disabled={submittingDecision}
                  onClick={() =>
                    handleDocumentDecision(
                      doc.vendorId,
                      doc.type,
                      "APPROVED",
                      doc.feedback || "Approved and verified by administrator."
                    )
                  }
                  className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition cursor-pointer flex items-center gap-1 shadow-xs"
                  title="Change decision: Approve document"
                >
                  <Check size={11} />
                  <span>Approve</span>
                </button>
                <button
                  disabled={submittingDecision}
                  onClick={() =>
                    handleDocumentDecision(
                      doc.vendorId,
                      doc.type,
                      "CHANGES_REQUESTED",
                      doc.feedback || "Revision requested: please upload an updated and clear copy."
                    )
                  }
                  className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-900 transition cursor-pointer flex items-center gap-1"
                  title="Change decision: Request revision"
                >
                  <RotateCcw size={11} />
                  <span>Revise</span>
                </button>
              </>
            )}

            {/* If PENDING_REVIEW or other: show all 3 actions */}
            {doc.status !== "APPROVED" && doc.status !== "CHANGES_REQUESTED" && doc.status !== "REJECTED" && (
              <>
                <button
                  disabled={submittingDecision}
                  onClick={() =>
                    handleDocumentDecision(
                      doc.vendorId,
                      doc.type,
                      "APPROVED",
                      doc.feedback || "Approved and verified by administrator."
                    )
                  }
                  className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-300 transition cursor-pointer flex items-center gap-1"
                  title="Approve this document"
                >
                  <Check size={11} />
                  <span>Approve</span>
                </button>
                <button
                  disabled={submittingDecision}
                  onClick={() =>
                    handleDocumentDecision(
                      doc.vendorId,
                      doc.type,
                      "CHANGES_REQUESTED",
                      doc.feedback || "Revision requested: please upload an updated and clear copy."
                    )
                  }
                  className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-900 transition cursor-pointer flex items-center gap-1"
                  title="Request revision"
                >
                  <RotateCcw size={11} />
                  <span>Revise</span>
                </button>
                <button
                  disabled={submittingDecision}
                  onClick={() =>
                    handleDocumentDecision(
                      doc.vendorId,
                      doc.type,
                      "REJECTED",
                      doc.feedback || "Document rejected by administrator."
                    )
                  }
                  className="px-2.5 py-1 rounded-lg text-[11px] font-semibold text-rose-600 hover:bg-rose-50 border border-rose-200 transition cursor-pointer flex items-center gap-1"
                  title="Reject document"
                >
                  <X size={11} />
                  <span>Reject</span>
                </button>
              </>
            )}

            {/* Optional Custom Notes Trigger */}
            <button
              disabled={submittingDecision}
              onClick={() => {
                setRevisionReason(doc.feedback || "");
                setRevisionPrompt({
                  vendorId: doc.vendorId,
                  docType: doc.type,
                  title: doc.title,
                  decision: doc.status === "REJECTED" ? "CHANGES_REQUESTED" : "REJECTED",
                });
              }}
              className="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 rounded-md transition cursor-pointer"
              title="Add or Edit Feedback Notes"
            >
              <MessageSquare size={13} />
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans pb-16">
      {/* Page Header */}
      <PageHeader
        title="Vendor Compliance & Document Verification"
        description="Inspect carrier companies, verify commercial licenses, transit insurance, and driver KYC credentials with 100% genuine dynamic telemetry."
      >
        <button
          onClick={() => fetchDocuments(true)}
          disabled={loading || isRefreshing}
          className="neu-btn inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold text-[#1E293B] cursor-pointer disabled:opacity-50"
        >
          <RefreshCw size={14} className={loading || isRefreshing ? "animate-spin" : ""} />
          <span>{isRefreshing ? "Syncing..." : "Refresh"}</span>
        </button>
      </PageHeader>

      {/* Alerts / Notifications */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center justify-between gap-3 text-rose-700 text-xs shadow-neu-raised-sm">
          <div className="flex items-center gap-2.5">
            <AlertCircle size={17} className="shrink-0 text-rose-600" />
            <span className="font-medium">{error}</span>
          </div>
          <button
            onClick={() => fetchDocuments(true)}
            className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {successToast && (
        <div className="p-4 bg-teal-50 border border-teal-200 rounded-2xl flex items-center gap-2.5 text-teal-800 text-xs shadow-neu-raised-sm animate-fadeIn">
          <CheckCircle2 size={17} className="shrink-0 text-[#14B8A6]" />
          <span className="font-semibold">{successToast}</span>
        </div>
      )}

      {/* 4 Dynamic Genuine Metrics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {/* Total Fleets / Companies */}
        <div className="p-4 rounded-3xl bg-[#EEF2F6] shadow-neu-flat border border-white/80">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#64748B]">
              Carrier Fleets
            </span>
            <div className="h-7 w-7 rounded-xl bg-blue-50 text-[#2563EB] flex items-center justify-center">
              <Building2 size={14} />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-[#1E293B] mt-1.5">
            {stats.totalCompanies || companies.length}
          </p>
          <span className="text-[11px] text-[#2563EB] font-semibold block mt-0.5">
            {stats.fullyApprovedCompanies ?? 0} Fully Approved Fleets
          </span>
        </div>

        {/* Avg Compliance Health Score */}
        <div className="p-4 rounded-3xl bg-[#EEF2F6] shadow-neu-flat border border-white/80">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#14B8A6]">
              Platform Health
            </span>
            <div className="h-7 w-7 rounded-xl bg-teal-50 text-[#14B8A6] flex items-center justify-center">
              <ShieldCheck size={14} />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-[#14B8A6] mt-1.5">
            {stats.avgComplianceScore ?? 0}%
          </p>
          <span className="text-[11px] text-[#64748B] block mt-0.5">
            Fleet Compliance Average
          </span>
        </div>

        {/* Awaiting Review */}
        <div className="p-4 rounded-3xl bg-[#EEF2F6] shadow-neu-flat border border-white/80">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#F59E0B]">
              Awaiting Review
            </span>
            <div className="h-7 w-7 rounded-xl bg-amber-50 text-[#F59E0B] flex items-center justify-center">
              <Clock size={14} />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-[#F59E0B] mt-1.5">{stats.pending}</p>
          <span className="text-[11px] text-amber-800 font-semibold block mt-0.5">
            {stats.pendingReviewCompanies ?? 0} Fleets need attention
          </span>
        </div>

        {/* Total Documents Verified */}
        <div className="p-4 rounded-3xl bg-[#EEF2F6] shadow-neu-flat border border-white/80">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#2563EB]">
              Verified Credentials
            </span>
            <div className="h-7 w-7 rounded-xl bg-indigo-50 text-[#2563EB] flex items-center justify-center">
              <CheckCircle2 size={14} />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-[#2563EB] mt-1.5">{stats.approved}</p>
          <span className="text-[11px] text-[#64748B] block mt-0.5">
            out of {stats.total} total filed documents
          </span>
        </div>
      </div>

      {/* View Mode & Filter Control Bar */}
      <div className="p-4 rounded-3xl bg-[#EEF2F6] shadow-neu-flat border border-white/80 space-y-3">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          {/* View Mode Switcher: By Vendor Company vs All Documents */}
          <div className="flex items-center gap-2">
            <div className="p-1 rounded-2xl bg-[#EEF2F6] shadow-neu-inset-sm border border-white/60 flex items-center gap-1">
              <button
                onClick={() => setViewMode("companies")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  viewMode === "companies"
                    ? "bg-[#2563EB] text-white shadow-neu-raised-sm"
                    : "text-[#64748B] hover:text-[#1E293B]"
                }`}
              >
                <Building2 size={13} />
                <span>Grouped by Vendor Company</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                    viewMode === "companies" ? "bg-white/20 text-white" : "bg-white/80 text-[#64748B]"
                  }`}
                >
                  {companies.length}
                </span>
              </button>

              <button
                onClick={() => setViewMode("flat")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  viewMode === "flat"
                    ? "bg-[#2563EB] text-white shadow-neu-raised-sm"
                    : "text-[#64748B] hover:text-[#1E293B]"
                }`}
              >
                <LayoutGrid size={13} />
                <span>All Documents Grid</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                    viewMode === "flat" ? "bg-white/20 text-white" : "bg-white/80 text-[#64748B]"
                  }`}
                >
                  {documents.length}
                </span>
              </button>
            </div>

            {/* Expand / Collapse All (Only in company view) */}
            {viewMode === "companies" && companies.length > 0 && (
              <div className="hidden sm:flex items-center gap-1">
                <button
                  onClick={expandAll}
                  className="neu-btn px-2.5 py-1.5 rounded-xl text-[11px] font-semibold text-[#64748B] hover:text-[#1E293B] cursor-pointer"
                >
                  Expand All
                </button>
                <button
                  onClick={collapseAll}
                  className="neu-btn px-2.5 py-1.5 rounded-xl text-[11px] font-semibold text-[#64748B] hover:text-[#1E293B] cursor-pointer"
                >
                  Collapse All
                </button>
              </div>
            )}
          </div>

          {/* Search Box */}
          <div className="relative w-full md:w-80">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
            <input
              type="text"
              placeholder="Search company, phone, document, or ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-8 py-2 bg-[#EEF2F6] shadow-neu-inset-sm rounded-xl border border-white/60 text-xs text-[#1E293B] placeholder-[#94A3B8] focus:outline-hidden"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#1E293B] cursor-pointer"
              >
                <X size={12} />
              </button>
            )}
          </div>
        </div>

        {/* Status Filter Row */}
        <div className="flex items-center gap-1.5 overflow-x-auto pt-2 border-t border-[#D9E2EC]/70 scrollbar-none">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#64748B] mr-1 shrink-0">
            Status Filter:
          </span>
          {[
            { id: "all", label: "All Records", count: viewMode === "companies" ? companies.length : documents.length },
            {
              id: "PENDING_REVIEW",
              label: "Pending Review",
              count: viewMode === "companies" ? stats.pendingReviewCompanies ?? 0 : stats.pending,
            },
            {
              id: "APPROVED",
              label: "Fully Approved",
              count: viewMode === "companies" ? stats.fullyApprovedCompanies ?? 0 : stats.approved,
            },
            {
              id: "CHANGES_REQUESTED",
              label: "Changes Requested",
              count: viewMode === "companies" ? stats.changesRequestedCompanies ?? 0 : stats.changesRequested,
            },
            { id: "REJECTED", label: "Rejected", count: stats.rejected },
          ].map((st) => {
            const isSelected = selectedStatus === st.id;
            return (
              <button
                key={st.id}
                onClick={() => setSelectedStatus(st.id)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition cursor-pointer flex items-center gap-1 whitespace-nowrap ${
                  isSelected
                    ? "bg-[#1E293B] text-white shadow-neu-raised-sm"
                    : "neu-btn text-[#64748B] hover:text-[#1E293B]"
                }`}
              >
                <span>{st.label}</span>
                <span className="opacity-70 text-[10px]">({st.count})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Loading Skeleton */}
      {loading && (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-[#EEF2F6] rounded-3xl shadow-neu-flat border border-white/80 p-6 space-y-4 animate-pulse"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-2xl bg-slate-200" />
                  <div className="space-y-1.5">
                    <div className="h-4 w-48 bg-slate-200 rounded" />
                    <div className="h-3 w-32 bg-slate-200 rounded" />
                  </div>
                </div>
                <div className="h-6 w-24 bg-slate-200 rounded-full" />
              </div>
              <div className="h-3 w-full bg-slate-200 rounded-full" />
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading &&
        ((viewMode === "companies" && filteredCompanies.length === 0) ||
          (viewMode === "flat" && filteredDocuments.length === 0)) && (
          <div className="bg-[#EEF2F6] rounded-3xl shadow-neu-flat border border-white/80 p-12 text-center space-y-4">
            <div className="h-14 w-14 rounded-2xl bg-blue-50 text-[#2563EB] shadow-neu-raised-sm flex items-center justify-center mx-auto">
              <FileCheck2 size={28} />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#1E293B]">No Records Found</h3>
              <p className="text-xs text-[#64748B] max-w-sm mx-auto mt-1">
                {search || selectedStatus !== "all"
                  ? "No vendor companies or compliance documents match your active filter criteria."
                  : "No vendor companies have submitted compliance documents yet."}
              </p>
            </div>
            <button
              onClick={() => {
                setSearch("");
                setSelectedStatus("all");
                fetchDocuments();
              }}
              className="neu-btn px-4 py-2 rounded-xl text-xs font-bold text-[#2563EB] hover:text-[#1D4ED8] cursor-pointer shadow-neu-raised-sm"
            >
              Reset Filters
            </button>
          </div>
        )}

      {/* ---------------------------------------------------- */}
      {/* MODE 1: COMPANY-CENTRIC DIRECTORY (REQUESTED BY USER) */}
      {/* ---------------------------------------------------- */}
      {!loading && viewMode === "companies" && filteredCompanies.length > 0 && (
        <div className="space-y-5">
          {filteredCompanies.map((company) => {
            const isExpanded = !!expandedCompanies[company.vendorId];
            const businessDocs = company.documents.filter((d) => d.category === "BUSINESS");
            const identityDocs = company.documents.filter((d) => d.category === "REPRESENTATIVE");

            return (
              <div
                key={company.vendorId}
                className="bg-[#EEF2F6] rounded-3xl shadow-neu-flat border border-white/80 overflow-hidden transition"
              >
                {/* Company Banner / Accordion Header */}
                <div
                  onClick={() => toggleCompany(company.vendorId)}
                  className="p-5 cursor-pointer hover:bg-slate-200/30 transition flex flex-col md:flex-row items-start md:items-center justify-between gap-4 select-none"
                >
                  {/* Left: Monogram + Company Info */}
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-mono font-extrabold text-sm flex items-center justify-center shadow-neu-raised-sm shrink-0 border border-white">
                      {getMonogram(company.businessName)}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-base font-extrabold text-[#1E293B] truncate">
                          {company.businessName}
                        </h3>
                        <StatusBadge status={company.status} />
                      </div>

                      <div className="flex items-center gap-3 text-xs text-[#64748B] mt-1 flex-wrap font-mono">
                        <span className="flex items-center gap-1 text-slate-700">
                          <Phone size={11} className="text-[#2563EB]" />
                          {company.contactPhone}
                        </span>
                        {company.contactEmail && (
                          <>
                            <span>•</span>
                            <span className="text-slate-600 truncate max-w-[200px]">
                              {company.contactEmail}
                            </span>
                          </>
                        )}
                        <span>•</span>
                        <span className="text-[#94A3B8] text-[11px]">
                          ID: {company.vendorId.slice(-6)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Dynamic Compliance Progress Bar + Accordion Trigger */}
                  <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end">
                    {/* Compliance Progress Indicator */}
                    <div className="text-right min-w-[170px]">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#64748B]">
                          Compliance Status
                        </span>
                        <span className="font-extrabold text-[#1E293B]">
                          {company.approvedCount} / {company.totalRequired} (
                          <span
                            className={
                              company.compliancePercentage === 100
                                ? "text-emerald-600"
                                : company.compliancePercentage >= 50
                                ? "text-[#2563EB]"
                                : "text-amber-600"
                            }
                          >
                            {company.compliancePercentage}%
                          </span>
                          )
                        </span>
                      </div>

                      {/* Visual Progress Bar */}
                      <div className="h-2 w-full bg-slate-200/80 rounded-full overflow-hidden shadow-neu-inset-sm">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            company.compliancePercentage === 100
                              ? "bg-emerald-500"
                              : company.compliancePercentage >= 50
                              ? "bg-blue-600"
                              : "bg-amber-500"
                          }`}
                          style={{ width: `${company.compliancePercentage}%` }}
                        />
                      </div>

                      {/* Status Breakdown Pills */}
                      <div className="flex items-center justify-end gap-1.5 mt-1 text-[10px] font-mono">
                        {company.pendingCount > 0 && (
                          <span className="text-amber-700 font-bold bg-amber-50 px-1.5 py-0.2 rounded">
                            {company.pendingCount} Pending
                          </span>
                        )}
                        {company.changesRequestedCount > 0 && (
                          <span className="text-rose-700 font-bold bg-rose-50 px-1.5 py-0.2 rounded">
                            {company.changesRequestedCount} Revisions
                          </span>
                        )}
                        {company.approvedCount > 0 && (
                          <span className="text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.2 rounded">
                            {company.approvedCount} Approved
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Expand/Collapse Chevron Button */}
                    <button
                      type="button"
                      className="neu-btn p-2 rounded-xl text-[#64748B] hover:text-[#1E293B] shadow-neu-raised-sm shrink-0 cursor-pointer"
                      title={isExpanded ? "Collapse Company Documents" : "Expand Company Documents"}
                    >
                      {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                  </div>
                </div>

                {/* Expanded Section: All Documents of this Company */}
                {isExpanded && (
                  <div className="p-5 pt-2 border-t border-[#D9E2EC]/70 space-y-5 bg-[#F4F7FA]/40">
                    {/* Category 1: Commercial & Fleet Credentials */}
                    {businessDocs.length > 0 && (
                      <div className="space-y-2.5">
                        <div className="flex items-center gap-2">
                          <Building2 size={13} className="text-[#2563EB]" />
                          <h4 className="text-xs font-bold uppercase tracking-wider text-[#1E293B]">
                            Commercial & Transport Credentials ({businessDocs.length})
                          </h4>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                          {businessDocs.map((doc) => renderDocumentCard(doc))}
                        </div>
                      </div>
                    )}

                    {/* Category 2: Owner & Driver KYC Credentials */}
                    {identityDocs.length > 0 && (
                      <div className="space-y-2.5">
                        <div className="flex items-center gap-2">
                          <UserCheck size={13} className="text-teal-600" />
                          <h4 className="text-xs font-bold uppercase tracking-wider text-[#1E293B]">
                            Owner & Representative KYC Verification ({identityDocs.length})
                          </h4>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                          {identityDocs.map((doc) => renderDocumentCard(doc))}
                        </div>
                      </div>
                    )}

                    {company.documents.length === 0 && (
                      <p className="text-xs text-[#64748B] italic py-3 text-center">
                        This carrier company has not uploaded any verification documents yet.
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* MODE 2: FLAT DOCUMENTS GRID VIEW                     */}
      {/* ---------------------------------------------------- */}
      {!loading && viewMode === "flat" && filteredDocuments.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {filteredDocuments.map((doc) => {
            const isPhoto = doc.type === "REPRESENTATIVE_PHOTO";
            const isPdf =
              doc.fileName?.toLowerCase().endsWith(".pdf") ||
              doc.fileUrl?.startsWith("data:application/pdf");

            return (
              <div
                key={`flat-${doc.vendorId}-${doc.type}`}
                className="bg-[#EEF2F6] rounded-3xl shadow-neu-flat border border-white/80 p-5 flex flex-col justify-between space-y-4 transition hover:shadow-neu-raised"
              >
                <div className="space-y-3">
                  {/* Top Bar: Vendor Details */}
                  <div className="flex items-center justify-between border-b border-[#D9E2EC]/70 pb-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="h-9 w-9 rounded-xl bg-blue-50 text-[#2563EB] font-mono font-bold text-xs flex items-center justify-center shadow-neu-raised-sm shrink-0 border border-blue-200/60">
                        {getMonogram(doc.businessName)}
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-[#1E293B] truncate">
                          {doc.businessName}
                        </h4>
                        <div className="flex items-center gap-2 text-[11px] text-[#64748B]">
                          <span className="flex items-center gap-1 font-mono">
                            <Phone size={10} />
                            {doc.vendorPhone}
                          </span>
                          <span>•</span>
                          <span className="font-mono text-[10px] text-[#94A3B8]">
                            Vendor ID: {doc.vendorId.slice(-6)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <StatusBadge status={doc.status} />
                  </div>

                  {/* Document Title & Category */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h3 className="text-sm font-extrabold text-[#1E293B]">{doc.title}</h3>
                        <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-[#EEF2F6] shadow-neu-inset-sm text-[#2563EB]">
                          {doc.type}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#64748B] mt-0.5">{doc.description}</p>
                    </div>

                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 shadow-neu-raised-sm ${
                        doc.category === "BUSINESS"
                          ? "bg-blue-50 text-[#2563EB] border border-blue-200/60"
                          : "bg-teal-50 text-teal-800 border border-teal-200/60"
                      }`}
                    >
                      {doc.category === "BUSINESS" ? "Business" : "Identity"}
                    </span>
                  </div>

                  {/* ID Proof Extra Metadata */}
                  {doc.idType && (
                    <div className="p-2.5 rounded-xl bg-white/70 border border-[#D9E2EC]/70 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5">
                        <UserCheck size={13} className="text-[#2563EB]" />
                        <span className="font-semibold text-slate-700">{doc.idType}</span>
                      </div>
                      {doc.maskedIdNumber && (
                        <span className="font-mono font-bold text-[#2563EB] text-[11px]">
                          {doc.maskedIdNumber}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Representative Photo Preview */}
                  {isPhoto && doc.fileUrl && (
                    <PhotoThumbnail
                      fileUrl={doc.fileUrl}
                      fileName={doc.fileName}
                      fileSize={doc.fileSize}
                      onClick={() => setInspectDoc(doc)}
                    />
                  )}

                  {/* Review Feedback History */}
                  {doc.feedback && (
                    <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200/80 text-amber-900 text-xs space-y-0.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider block">
                        Previous Review Notes:
                      </span>
                      <p className="text-[11px] leading-relaxed">{doc.feedback}</p>
                    </div>
                  )}

                  {/* File Metadata Info */}
                  <div className="flex items-center justify-between text-[11px] text-[#64748B] font-mono pt-1">
                    <span className="truncate max-w-[200px]" title={doc.fileName}>
                      📄 {doc.fileName}
                    </span>
                    <span>{doc.fileSize}</span>
                    <span>
                      {doc.submittedAt
                        ? new Date(doc.submittedAt).toLocaleDateString("en-IN")
                        : "—"}
                    </span>
                  </div>
                </div>

                {/* Card Action Bar */}
                <div className="pt-3 border-t border-[#D9E2EC]/70 flex items-center justify-between gap-2">
                  <button
                    onClick={() => setInspectDoc(doc)}
                    className="neu-btn-primary px-3.5 py-2 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-neu-raised-sm cursor-pointer"
                  >
                    <Eye size={13} />
                    <span>{isPdf ? "View & Verify PDF" : "View & Verify Document"}</span>
                  </button>

                  <div className="flex items-center gap-1.5 flex-wrap justify-end">
                    {/* If APPROVED: show current status badge + available actions: [Request Changes] & [Reject] */}
                    {doc.status === "APPROVED" && (
                      <>
                        <span className="px-2.5 py-1 rounded-xl text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                          <Check size={12} /> Approved
                        </span>
                        <button
                          disabled={submittingDecision}
                          onClick={() =>
                            handleDocumentDecision(
                              doc.vendorId,
                              doc.type,
                              "CHANGES_REQUESTED",
                              doc.feedback || "Revision requested: please upload an updated and clear copy."
                            )
                          }
                          className="px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-900 transition cursor-pointer flex items-center gap-1"
                          title="Change decision: Request revision"
                        >
                          <RotateCcw size={12} />
                          <span>Revise</span>
                        </button>
                        <button
                          disabled={submittingDecision}
                          onClick={() =>
                            handleDocumentDecision(
                              doc.vendorId,
                              doc.type,
                              "REJECTED",
                              doc.feedback || "Document rejected by administrator."
                            )
                          }
                          className="px-2.5 py-1.5 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 border border-rose-200 transition cursor-pointer flex items-center gap-1"
                          title="Change decision: Reject document"
                        >
                          <X size={12} />
                          <span>Reject</span>
                        </button>
                      </>
                    )}

                    {/* If CHANGES_REQUESTED: show current status badge + available actions: [Approve] & [Reject] */}
                    {doc.status === "CHANGES_REQUESTED" && (
                      <>
                        <span className="px-2.5 py-1 rounded-xl text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1">
                          <RotateCcw size={12} /> Revision Needed
                        </span>
                        <button
                          disabled={submittingDecision}
                          onClick={() =>
                            handleDocumentDecision(
                              doc.vendorId,
                              doc.type,
                              "APPROVED",
                              doc.feedback || "Approved and verified by administrator."
                            )
                          }
                          className="px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition cursor-pointer flex items-center gap-1 shadow-xs"
                          title="Change decision: Approve document"
                        >
                          <Check size={12} />
                          <span>Approve</span>
                        </button>
                        <button
                          disabled={submittingDecision}
                          onClick={() =>
                            handleDocumentDecision(
                              doc.vendorId,
                              doc.type,
                              "REJECTED",
                              doc.feedback || "Document rejected by administrator."
                            )
                          }
                          className="px-2.5 py-1.5 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 border border-rose-200 transition cursor-pointer flex items-center gap-1"
                          title="Change decision: Reject document"
                        >
                          <X size={12} />
                          <span>Reject</span>
                        </button>
                      </>
                    )}

                    {/* If REJECTED: show current status badge + available actions: [Approve] & [Request Changes] */}
                    {doc.status === "REJECTED" && (
                      <>
                        <span className="px-2.5 py-1 rounded-xl text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300 flex items-center gap-1">
                          <X size={12} /> Rejected
                        </span>
                        <button
                          disabled={submittingDecision}
                          onClick={() =>
                            handleDocumentDecision(
                              doc.vendorId,
                              doc.type,
                              "APPROVED",
                              doc.feedback || "Approved and verified by administrator."
                            )
                          }
                          className="px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition cursor-pointer flex items-center gap-1 shadow-xs"
                          title="Change decision: Approve document"
                        >
                          <Check size={12} />
                          <span>Approve</span>
                        </button>
                        <button
                          disabled={submittingDecision}
                          onClick={() =>
                            handleDocumentDecision(
                              doc.vendorId,
                              doc.type,
                              "CHANGES_REQUESTED",
                              doc.feedback || "Revision requested: please upload an updated and clear copy."
                            )
                          }
                          className="px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-900 transition cursor-pointer flex items-center gap-1"
                          title="Change decision: Request revision"
                        >
                          <RotateCcw size={12} />
                          <span>Revise</span>
                        </button>
                      </>
                    )}

                    {/* If PENDING_REVIEW or other: show all 3 actions */}
                    {doc.status !== "APPROVED" && doc.status !== "CHANGES_REQUESTED" && doc.status !== "REJECTED" && (
                      <>
                        <button
                          disabled={submittingDecision}
                          onClick={() =>
                            handleDocumentDecision(
                              doc.vendorId,
                              doc.type,
                              "APPROVED",
                              doc.feedback || "Approved and verified by administrator."
                            )
                          }
                          className="px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-300 transition cursor-pointer flex items-center gap-1"
                          title="Approve this document"
                        >
                          <Check size={12} />
                          <span>Approve</span>
                        </button>
                        <button
                          disabled={submittingDecision}
                          onClick={() =>
                            handleDocumentDecision(
                              doc.vendorId,
                              doc.type,
                              "CHANGES_REQUESTED",
                              doc.feedback || "Revision requested: please upload an updated and clear copy."
                            )
                          }
                          className="px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-900 transition cursor-pointer flex items-center gap-1"
                          title="Request revision"
                        >
                          <RotateCcw size={12} />
                          <span>Revise</span>
                        </button>
                        <button
                          disabled={submittingDecision}
                          onClick={() =>
                            handleDocumentDecision(
                              doc.vendorId,
                              doc.type,
                              "REJECTED",
                              doc.feedback || "Document rejected by administrator."
                            )
                          }
                          className="px-2.5 py-1.5 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 border border-rose-200 transition cursor-pointer flex items-center gap-1"
                          title="Reject document"
                        >
                          <X size={12} />
                          <span>Reject</span>
                        </button>
                      </>
                    )}

                    {/* Optional Custom Notes Trigger */}
                    <button
                      disabled={submittingDecision}
                      onClick={() => {
                        setRevisionReason(doc.feedback || "");
                        setRevisionPrompt({
                          vendorId: doc.vendorId,
                          docType: doc.type,
                          title: doc.title,
                          decision: doc.status === "REJECTED" ? "CHANGES_REQUESTED" : "REJECTED",
                        });
                      }}
                      className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 rounded-lg transition cursor-pointer"
                      title="Add or Edit Feedback Notes"
                    >
                      <MessageSquare size={13} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* AUTHENTICATED PDF / KYC DOCUMENT VIEWER MODAL */}
      <DocumentViewerModal
        isOpen={!!inspectDoc}
        title={inspectDoc?.title || "Verification Document"}
        fileUrl={
          inspectDoc
            ? inspectDoc.fileUrl ||
              `/api/v1/admin/vendors/${inspectDoc.vendorId}/documents/${inspectDoc.type}/view`
            : null
        }
        fileName={inspectDoc?.fileName}
        fileSize={inspectDoc?.fileSize}
        docType={inspectDoc?.type}
        category={inspectDoc?.category}
        vendorName={inspectDoc?.businessName}
        status={inspectDoc?.status}
        feedback={inspectDoc?.feedback}
        idType={inspectDoc?.idType}
        maskedIdNumber={inspectDoc?.maskedIdNumber}
        onClose={() => setInspectDoc(null)}
        isAdmin={true}
        onApprove={() => {
          if (inspectDoc) {
            handleDocumentDecision(inspectDoc.vendorId, inspectDoc.type, "APPROVED", inspectDoc.feedback || "Approved and verified by administrator.");
            setInspectDoc(null);
          }
        }}
        onRequestChanges={() => {
          if (inspectDoc) {
            handleDocumentDecision(inspectDoc.vendorId, inspectDoc.type, "CHANGES_REQUESTED", inspectDoc.feedback || "Revision requested: please upload an updated and clear copy.");
            setInspectDoc(null);
          }
        }}
        onReject={() => {
          if (inspectDoc) {
            handleDocumentDecision(inspectDoc.vendorId, inspectDoc.type, "REJECTED", inspectDoc.feedback || "Document rejected by administrator.");
            setInspectDoc(null);
          }
        }}
      />

      {/* DOCUMENT FEEDBACK / REVISION REASON PROMPT */}
      {revisionPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-[#EEF2F6] rounded-3xl shadow-neu-flat border border-white/80 p-6 max-w-md w-full space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-[#D9E2EC]/80 pb-3">
              <h3 className="text-sm font-bold text-slate-900">
                {revisionPrompt.decision === "CHANGES_REQUESTED"
                  ? "Request Revisions on Document"
                  : "Reject Document"}
              </h3>
              <button
                onClick={() => {
                  setRevisionPrompt(null);
                  setRevisionReason("");
                }}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Document: <strong>{revisionPrompt.title}</strong>
            </p>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-600 uppercase flex items-center justify-between">
                <span>Feedback Notes for Carrier</span>
                <span className="text-[10px] text-slate-400 font-normal">Optional</span>
              </label>
              <textarea
                rows={3}
                value={revisionReason}
                onChange={(e) => setRevisionReason(e.target.value)}
                placeholder={
                  revisionPrompt.decision === "CHANGES_REQUESTED"
                    ? "e.g. Scanned copy is blurry. Please upload a clear PDF with official stamp visible."
                    : "e.g. Document expired, invalid, or details do not match carrier company registration."
                }
                className="w-full px-3 py-2 bg-[#EEF2F6] shadow-neu-inset-sm rounded-xl border border-white/60 text-xs text-slate-900 focus:outline-hidden"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#D9E2EC]/70">
              <button
                type="button"
                onClick={() => {
                  setRevisionPrompt(null);
                  setRevisionReason("");
                }}
                className="neu-btn px-4 py-1.5 rounded-xl text-xs font-semibold text-slate-600 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submittingDecision}
                onClick={() => {
                  const fallbackReason =
                    revisionPrompt.decision === "CHANGES_REQUESTED"
                      ? "Revision requested: please upload an updated and verified copy."
                      : "Document rejected by administrator.";
                  const finalReason = revisionReason.trim() || fallbackReason;
                  handleDocumentDecision(
                    revisionPrompt.vendorId,
                    revisionPrompt.docType,
                    revisionPrompt.decision,
                    finalReason
                  );
                }}
                className={`px-4 py-1.5 rounded-xl text-xs font-bold text-white shadow-neu-raised-sm cursor-pointer disabled:opacity-50 transition ${
                  revisionPrompt.decision === "REJECTED"
                    ? "bg-rose-600 hover:bg-rose-700"
                    : "bg-amber-600 hover:bg-amber-700"
                }`}
              >
                {submittingDecision
                  ? "Saving..."
                  : revisionPrompt.decision === "CHANGES_REQUESTED"
                  ? "Request Revision"
                  : "Confirm Reject"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
