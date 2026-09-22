"use client";

import { useState, useEffect } from "react";
import { fetchApi } from "@/lib/api";
import PageHeader from "../components/PageHeader";
import StatusBadge from "../components/StatusBadge";
import ConfirmModal from "../components/ConfirmModal";
import DocumentViewerModal from "../components/DocumentViewerModal";
import {
  Phone,
  Mail,
  Loader2,
  AlertCircle,
  RefreshCw,
  Eye,
  X,
  Check,
  RotateCcw,
  Ban,
  Building2,
  UserCheck,
  ShieldCheck,
  FileText,
  Camera,
  Download,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
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

interface VendorApplication {
  _id: string;
  businessName: string;
  contactPhone: string;
  contactEmail?: string;
  status: "PENDING_REVIEW" | "CHANGES_REQUESTED" | "APPROVED" | "REJECTED";
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

export default function AdminVendorRequestsPage() {
  const [requests, setRequests] = useState<VendorApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Modals & Actions
  const [inspectApp, setInspectApp] = useState<VendorApplication | null>(null);
  const [selectedApp, setSelectedApp] = useState<VendorApplication | null>(null);
  const [decisionModalOpen, setDecisionModalOpen] = useState(false);
  const [decisionType, setDecisionType] = useState<"APPROVED" | "REJECTED" | "CHANGES_REQUESTED">("APPROVED");
  const [submitting, setSubmitting] = useState(false);

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

  const loadRequests = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetchApi<{ vendors: VendorApplication[] }>("/admin/vendors?status=PENDING_REVIEW&limit=50");
      const changesRes = await fetchApi<{ vendors: VendorApplication[] }>("/admin/vendors?status=CHANGES_REQUESTED&limit=50");
      const combined = [...(res.vendors || []), ...(changesRes.vendors || [])];
      const seen = new Set<string>();
      const uniqueVendors = combined.filter((v) => {
        if (!v?._id || seen.has(v._id)) return false;
        seen.add(v._id);
        return v.status === "PENDING_REVIEW" || v.status === "CHANGES_REQUESTED";
      });
      setRequests(uniqueVendors);
    } catch (err: any) {
      setError(err.message || "Failed to load vendor applications");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const openDecisionModal = (app: VendorApplication, type: "APPROVED" | "REJECTED" | "CHANGES_REQUESTED") => {
    setSelectedApp(app);
    setDecisionType(type);
    setDecisionModalOpen(true);
  };

  const handleConfirmDecision = async (reason: string) => {
    if (!selectedApp) return;
    setSubmitting(true);
    try {
      await fetchApi(`/admin/vendors/${selectedApp._id}/decision`, {
        method: "PATCH",
        body: JSON.stringify({
          decision: decisionType,
          reason,
        }),
      });

      setDecisionModalOpen(false);
      setSelectedApp(null);
      if (inspectApp?._id === selectedApp._id) {
        setInspectApp(null);
      }
      loadRequests();
    } catch (err: any) {
      setError(err.message || "Failed to submit decision");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDocumentDecision = async (
    vendorId: string,
    docType: string,
    decision: "APPROVED" | "CHANGES_REQUESTED" | "REJECTED",
    reason?: string
  ) => {
    try {
      const defaultReason =
        decision === "APPROVED"
          ? "Approved and verified by administrator."
          : decision === "CHANGES_REQUESTED"
          ? "Revision requested: please upload an updated and clear copy."
          : "Document rejected by administrator.";
      const finalReason = reason || defaultReason;

      // 1. Update in-place in inspectApp
      setInspectApp((prev) => {
        if (!prev) return null;
        const docs = [...(prev.verificationDetails?.documents || [])];
        const idx = docs.findIndex((d) => d.type === docType);
        const updatedDoc = {
          type: docType,
          status: decision,
          feedback: finalReason,
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
        let newStatus = prev.status;
        if (changesRequested) newStatus = "CHANGES_REQUESTED";
        else if (rejected) newStatus = "REJECTED";
        else if (docs.length >= 6 && approvedCount === docs.length) newStatus = "APPROVED";
        else newStatus = "PENDING_REVIEW";

        return {
          ...prev,
          status: newStatus,
          verificationDetails: {
            ...prev.verificationDetails,
            documents: docs,
          },
        };
      });

      // 2. Update in applications list
      setRequests((prev) =>
        prev.map((app) => {
          if (app._id !== vendorId) return app;
          const docs = [...(app.verificationDetails?.documents || [])];
          const idx = docs.findIndex((d) => d.type === docType);
          const updatedDoc = {
            type: docType,
            status: decision,
            feedback: finalReason,
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
          let newStatus = app.status;
          if (changesRequested) newStatus = "CHANGES_REQUESTED";
          else if (rejected) newStatus = "REJECTED";
          else if (docs.length >= 6 && approvedCount === docs.length) newStatus = "APPROVED";
          else newStatus = "PENDING_REVIEW";

          return {
            ...app,
            status: newStatus,
            verificationDetails: {
              ...app.verificationDetails,
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
            feedback: finalReason,
          };
        }
        return prev;
      });

      await fetchApi(`/admin/vendors/${vendorId}/documents/${docType}`, {
        method: "PATCH",
        body: JSON.stringify({ decision, reason: finalReason }),
      });

      loadRequests();
    } catch (err: any) {
      setError(err.message || "Failed to update document status");
      loadRequests();
    }
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Vendor Applications & KYC Review"
        description="Review business credentials and owner / representative identity documents, issue approvals, or request revisions."
      >
        <button
          onClick={loadRequests}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-[#EEF2F6] border border-[#D9E2EC]/80 rounded-md hover:bg-[#EEF2F6] transition cursor-pointer disabled:opacity-50"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          <span>Refresh</span>
        </button>
      </PageHeader>

      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-md flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertCircle size={15} className="shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
          <button
            onClick={() => loadRequests()}
            className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded text-xs font-medium transition cursor-pointer shrink-0"
          >
            Retry
          </button>
        </div>
      )}

      {/* Applications list table */}
      <div className="bg-[#EEF2F6] rounded-2xl shadow-neu-flat border border-white/80 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#EEF2F6]/75 text-slate-500 font-semibold border-b border-[#D9E2EC]/70 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="px-4 py-2.5">Company Name</th>
                <th className="px-4 py-2.5">Contact</th>
                <th className="px-4 py-2.5">Service Areas</th>
                <th className="px-4 py-2.5">Services</th>
                <th className="px-4 py-2.5">Submitted</th>
                <th className="px-4 py-2.5">Status</th>
                <th className="px-4 py-2.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#D9E2EC]/70">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <Loader2 size={20} className="animate-spin text-slate-600 mx-auto mb-2" />
                    <span>Loading pending applications...</span>
                  </td>
                </tr>
              ) : requests.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No vendor applications currently requiring review.
                  </td>
                </tr>
              ) : (
                requests.map((app, index) => (
                  <tr key={app._id ? `${app._id}-${index}` : `app-${index}`} className="hover:bg-[#EEF2F6]/50 transition-colors">
                    <td className="px-4 py-2.5">
                      <p className="font-medium text-slate-900">{app.businessName}</p>
                      <p className="text-[11px] text-slate-500">
                        {app.ownerId?.displayName || "Direct Account"}
                      </p>
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="space-y-0.5">
                        <span className="font-mono text-slate-700 flex items-center gap-1">
                          <Phone size={11} className="text-slate-400 shrink-0" />
                          {app.contactPhone}
                        </span>
                        {app.contactEmail && (
                          <span className="text-slate-500 flex items-center gap-1 text-[11px]">
                            <Mail size={11} className="text-slate-400 shrink-0" />
                            {app.contactEmail}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {app.serviceAreas?.length ? (
                          app.serviceAreas.map((area, i) => (
                            <span
                              key={i}
                              className="px-1.5 py-0.5 rounded bg-[#EEF2F6] text-slate-600 text-[11px]"
                            >
                              {area}
                            </span>
                          ))
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">None</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {app.servicesOffered?.length ? (
                          app.servicesOffered.map((srv, i) => (
                            <span
                              key={i}
                              className="px-1.5 py-0.5 rounded bg-[#EEF2F6] border border-[#D9E2EC]/70 text-slate-700 text-[11px] capitalize"
                            >
                              {srv}
                            </span>
                          ))
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">Standard</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-slate-500">
                      {new Date(app.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-2.5">
                      <StatusBadge status={app.status} />
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setInspectApp(app)}
                          className="neu-btn px-2.5 py-1 text-slate-700 hover:text-[#2563EB] rounded text-xs font-semibold transition cursor-pointer flex items-center gap-1"
                          title="Inspect KYC Dossier"
                        >
                          <Eye size={13} />
                          <span>Inspect KYC</span>
                        </button>

                        <button
                          onClick={() => openDecisionModal(app, "APPROVED")}
                          className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[11px] font-medium transition cursor-pointer"
                          title="Approve All"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => openDecisionModal(app, "CHANGES_REQUESTED")}
                          className="px-2 py-1 bg-[#EEF2F6] border border-[#D9E2EC]/80 hover:bg-amber-50 hover:border-amber-300 hover:text-amber-800 text-slate-700 rounded text-[11px] font-medium transition cursor-pointer"
                          title="Request Changes"
                        >
                          Clarify
                        </button>
                        <button
                          onClick={() => openDecisionModal(app, "REJECTED")}
                          className="px-2 py-1 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 rounded text-[11px] font-medium transition cursor-pointer"
                          title="Reject"
                        >
                          Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="px-4 py-3 border-t border-[#D9E2EC]/70 text-xs text-slate-500">
          Showing {requests.length} applications awaiting administrative action
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL: STRUCTURED KYC DOCUMENT INSPECTION DOSSIER (Replaces Raw JSON)      */}
      {/* ========================================================================= */}
      {inspectApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/50 backdrop-blur-2xs">
          <div className="w-full max-w-3xl bg-[#EEF2F6] rounded-3xl shadow-neu-flat border border-white/80 overflow-hidden shadow-2xl flex flex-col max-h-[90vh] animate-scaleUp">
            {/* Header */}
            <div className="px-6 py-4 bg-[#EEF2F6] border-b border-[#D9E2EC]/70 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-slate-900">{inspectApp.businessName}</h3>
                  <StatusBadge status={inspectApp.status} />
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Full Business & Representative KYC Verification Dossier
                </p>
              </div>
              <button
                onClick={() => setInspectApp(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Scrollable Dossier Body */}
            <div className="p-6 overflow-y-auto space-y-6 text-xs">
              {/* Company Info Banner */}
              <div className="p-4 rounded-2xl bg-white/70 border border-[#D9E2EC]/70 grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Contact Phone</span>
                  <p className="font-mono font-semibold text-slate-900">{inspectApp.contactPhone}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Contact Email</span>
                  <p className="text-slate-700 truncate">{inspectApp.contactEmail || "—"}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Submitted On</span>
                  <p className="font-mono text-slate-700">{new Date(inspectApp.createdAt).toLocaleDateString("en-IN")}</p>
                </div>
              </div>

              {/* SECTION 1: COMPANY VERIFICATION (2 CORE DOCUMENTS) */}
              <div className="space-y-3">
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
                    const submitted = (inspectApp.verificationDetails?.documents || []).find(
                      (d) => d.type === std.type
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
                            fileUrl: submitted?.fileUrl || `/api/v1/admin/vendors/${inspectApp._id}/documents/${std.type}/view`,
                            fileName: submitted?.fileName,
                            fileSize: submitted?.fileSize,
                            docType: std.type,
                            vendorId: inspectApp._id,
                            vendorName: inspectApp.businessName,
                            status,
                            feedback: submitted?.feedback,
                            idType: submitted?.idType,
                            maskedIdNumber: submitted?.maskedIdNumber,
                          })
                        }
                        onApprove={() => handleDocumentDecision(inspectApp._id, std.type, "APPROVED", submitted?.feedback || "Approved and verified by administrator.")}
                        onRequestChanges={() => handleDocumentDecision(inspectApp._id, std.type, "CHANGES_REQUESTED", submitted?.feedback || "Revision requested: please upload an updated and clear copy.")}
                        onReject={() => handleDocumentDecision(inspectApp._id, std.type, "REJECTED", submitted?.feedback || "Document rejected by administrator.")}
                        onFeedbackNotes={() => {
                          setDocReviewReason(submitted?.feedback || "");
                          setDocReviewPrompt({
                            vendorId: inspectApp._id,
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
              <div className="space-y-3">
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
                    const submitted = (inspectApp.verificationDetails?.documents || []).find(
                      (d) => d.type === std.type
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
                            fileUrl: submitted?.fileUrl || `/api/v1/admin/vendors/${inspectApp._id}/documents/${std.type}/view`,
                            fileName: submitted?.fileName,
                            fileSize: submitted?.fileSize,
                            docType: std.type,
                            vendorId: inspectApp._id,
                            vendorName: inspectApp.businessName,
                            status,
                            feedback: submitted?.feedback,
                            idType: submitted?.idType,
                            maskedIdNumber: submitted?.maskedIdNumber,
                          })
                        }
                        onApprove={() => handleDocumentDecision(inspectApp._id, std.type, "APPROVED", submitted?.feedback || "Approved and verified by administrator.")}
                        onRequestChanges={() => handleDocumentDecision(inspectApp._id, std.type, "CHANGES_REQUESTED", submitted?.feedback || "Revision requested: please upload an updated and clear copy.")}
                        onReject={() => handleDocumentDecision(inspectApp._id, std.type, "REJECTED", submitted?.feedback || "Document rejected by administrator.")}
                        onFeedbackNotes={() => {
                          setDocReviewReason(submitted?.feedback || "");
                          setDocReviewPrompt({
                            vendorId: inspectApp._id,
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
              <div className="space-y-3">
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
                    const submitted = (inspectApp.verificationDetails?.documents || []).find(
                      (d) => d.type === std.type
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
                            fileUrl: submitted?.fileUrl || `/api/v1/admin/vendors/${inspectApp._id}/documents/${std.type}/view`,
                            fileName: submitted?.fileName,
                            fileSize: submitted?.fileSize,
                            docType: std.type,
                            vendorId: inspectApp._id,
                            vendorName: inspectApp.businessName,
                            status,
                            feedback: submitted?.feedback,
                            idType: submitted?.idType,
                            maskedIdNumber: submitted?.maskedIdNumber,
                          })
                        }
                        onApprove={() => handleDocumentDecision(inspectApp._id, std.type, "APPROVED", submitted?.feedback || "Approved and verified by administrator.")}
                        onRequestChanges={() => handleDocumentDecision(inspectApp._id, std.type, "CHANGES_REQUESTED", submitted?.feedback || "Revision requested: please upload an updated and clear copy.")}
                        onReject={() => handleDocumentDecision(inspectApp._id, std.type, "REJECTED", submitted?.feedback || "Document rejected by administrator.")}
                        onFeedbackNotes={() => {
                          setDocReviewReason(submitted?.feedback || "");
                          setDocReviewPrompt({
                            vendorId: inspectApp._id,
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

            {/* Footer */}
            <div className="px-6 py-3.5 bg-[#EEF2F6] border-t border-[#D9E2EC]/70 flex items-center justify-between">
              <button
                onClick={() => setInspectApp(null)}
                className="neu-btn px-4 py-2 text-slate-700 rounded-xl transition cursor-pointer text-xs font-semibold"
              >
                Close
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => openDecisionModal(inspectApp, "CHANGES_REQUESTED")}
                  className="px-3.5 py-2 bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-800 rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  Request Revisions
                </button>
                <button
                  onClick={() => openDecisionModal(inspectApp, "APPROVED")}
                  className="neu-btn-primary px-4 py-2 text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-neu-raised-sm"
                >
                  Approve All Documents
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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

      {/* Confirmation Modal for Overall Decisions */}
      <ConfirmModal
        isOpen={decisionModalOpen}
        onClose={() => setDecisionModalOpen(false)}
        onConfirm={handleConfirmDecision}
        title={
          decisionType === "APPROVED"
            ? "Approve Vendor Onboarding"
            : decisionType === "CHANGES_REQUESTED"
            ? "Request Revisions from Vendor"
            : "Reject Vendor Application"
        }
        message={
          decisionType === "APPROVED"
            ? `Authorize "${selectedApp?.businessName}" to participate in moving quote assignments and dispatches.`
            : decisionType === "CHANGES_REQUESTED"
            ? `Notify "${selectedApp?.businessName}" of missing or revised credentials required for approval.`
            : `Decline the onboarding application from "${selectedApp?.businessName}".`
        }
        confirmLabel={
          decisionType === "APPROVED"
            ? "Approve Vendor"
            : decisionType === "CHANGES_REQUESTED"
            ? "Send Revision Request"
            : "Reject Application"
        }
        confirmVariant={decisionType === "APPROVED" ? "primary" : decisionType === "CHANGES_REQUESTED" ? "warning" : "danger"}
        requireReason={decisionType !== "APPROVED"}
        reasonPlaceholder={
          decisionType === "CHANGES_REQUESTED"
            ? "e.g., Please provide a higher-resolution scan of your Goods Transport Permit."
            : "e.g., Incomplete documentation or regulatory non-compliance."
        }
        isLoading={submitting}
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
