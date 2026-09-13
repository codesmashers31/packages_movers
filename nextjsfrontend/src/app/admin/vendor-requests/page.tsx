"use client";

import { useState, useEffect } from "react";
import { fetchApi } from "@/lib/api";
import PageHeader from "../components/PageHeader";
import StatusBadge from "../components/StatusBadge";
import ConfirmModal from "../components/ConfirmModal";
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
} from "lucide-react";

interface VendorApplication {
  _id: string;
  businessName: string;
  contactPhone: string;
  contactEmail?: string;
  status: "PENDING_REVIEW" | "CHANGES_REQUESTED" | "APPROVED" | "REJECTED";
  serviceAreas: string[];
  servicesOffered: string[];
  ownerId?: { displayName?: string; phone?: string };
  verificationDetails?: Record<string, any>;
  createdAt: string;
}

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

  return (
    <div className="space-y-4">
      <PageHeader
        title="Vendor Applications"
        description="Review incoming onboarding applications, verify business credentials, and issue decisions"
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
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setInspectApp(app)}
                          className="p-1 text-slate-400 hover:text-[#2563EB] rounded transition cursor-pointer"
                          title="Inspect Credentials"
                        >
                          <Eye size={14} />
                        </button>
                        <button
                          onClick={() => openDecisionModal(app, "APPROVED")}
                          className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[11px] font-medium transition cursor-pointer"
                          title="Approve"
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

        {/* Total Summary Footer */}
        <div className="px-4 py-3 border-t border-[#D9E2EC]/70 text-xs text-slate-500">
          Showing {requests.length} applications awaiting administrative action
        </div>
      </div>

      {/* Inspect Application Modal */}
      {inspectApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="w-full max-w-2xl bg-[#EEF2F6] rounded-2xl shadow-neu-flat border border-white/80 overflow-hidden shadow-lg flex flex-col max-h-[90vh]">
            <div className="px-5 py-3.5 border-b border-[#D9E2EC]/70 flex items-center justify-between bg-[#EEF2F6] shrink-0">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setInspectApp(null)}
                  className="p-1.5 text-slate-500 hover:text-slate-700 bg-white/50 hover:bg-white rounded-lg shadow-sm border border-[#D9E2EC]/70 transition cursor-pointer"
                  title="Go Back"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>
                </button>
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">{inspectApp.businessName}</h3>
                  <p className="text-[11px] text-slate-500">Application Review</p>
                </div>
              </div>
            </div>

            <div className="p-5 space-y-4 text-xs overflow-y-auto min-h-0">
              <div className="grid grid-cols-2 gap-3 pb-3 border-b border-slate-200">
                <div>
                  <span className="text-slate-500 block mb-0.5">Current Status</span>
                  <StatusBadge status={inspectApp.status} />
                </div>
                <div>
                  <span className="text-slate-500 block mb-0.5">Submitted On</span>
                  <span className="font-medium text-slate-700">
                    {new Date(inspectApp.createdAt).toLocaleString()}
                  </span>
                </div>
              </div>

              <div>
                <span className="text-slate-500 block mb-1">Contact Information</span>
                <p className="font-medium text-slate-900 font-mono">Phone: {inspectApp.contactPhone}</p>
                {inspectApp.contactEmail && (
                  <p className="text-slate-600 mt-0.5">Email: {inspectApp.contactEmail}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-slate-500 block mb-1">Requested Service Areas</span>
                  <div className="flex flex-wrap gap-1">
                    {inspectApp.serviceAreas?.map((a, i) => (
                      <span key={i} className="px-2 py-0.5 bg-white border border-[#D9E2EC] shadow-sm rounded text-slate-700 font-medium">
                        {a}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <span className="text-slate-500 block mb-1">Offered Moving Services</span>
                  <div className="flex flex-wrap gap-1">
                    {inspectApp.servicesOffered?.map((s, i) => (
                      <span key={i} className="px-2 py-0.5 bg-white border border-[#D9E2EC] shadow-sm rounded capitalize font-medium text-slate-700">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {inspectApp.verificationDetails && (
                <div className="pt-2">
                  <span className="font-semibold text-slate-800 block mb-2 text-sm border-b border-[#D9E2EC]/70 pb-1">Submitted Verification Documents</span>
                  <div className="space-y-3 mt-3">
                    {Array.isArray(inspectApp.verificationDetails) ? (
                      inspectApp.verificationDetails.map((doc, idx) => (
                        <div key={idx} className="p-3 bg-white rounded-xl shadow-sm border border-[#D9E2EC] flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-slate-900 truncate text-sm">{doc.name || doc.type}</p>
                            <p className="text-slate-500 mt-0.5 text-[11px] font-mono truncate">{doc.fileName || "Document"}</p>
                            {doc.notes && <p className="text-slate-600 mt-1.5 italic text-[11px]">&quot;{doc.notes}&quot;</p>}
                            <div className="flex items-center gap-2 mt-2">
                              {doc.status && (
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${doc.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                  {doc.status}
                                </span>
                              )}
                              {doc.fileSize && <span className="text-slate-400 text-[10px]">{doc.fileSize}</span>}
                            </div>
                          </div>
                          {doc.fileUrl && (
                            <a 
                              href={doc.fileUrl} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 font-medium rounded-lg transition shrink-0 border border-blue-200 shadow-sm flex items-center gap-1.5"
                            >
                              <Eye size={14} />
                              <span>View</span>
                            </a>
                          )}
                        </div>
                      ))
                    ) : (
                      <pre className="text-[11px] font-mono text-slate-600 bg-white p-3 rounded-xl border border-[#D9E2EC] overflow-x-auto">
                        {JSON.stringify(inspectApp.verificationDetails, null, 2)}
                      </pre>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="px-5 py-3.5 bg-[#EEF2F6] border-t border-[#D9E2EC]/70 flex items-center justify-between shrink-0">
              <button
                onClick={() => setInspectApp(null)}
                className="px-4 py-2 bg-white text-slate-700 hover:bg-slate-50 font-medium rounded-lg transition cursor-pointer shadow-sm border border-slate-200"
              >
                Close
              </button>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => openDecisionModal(inspectApp, "APPROVED")}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition cursor-pointer shadow-sm"
                >
                  Approve Application
                </button>
                <button
                  onClick={() => openDecisionModal(inspectApp, "REJECTED")}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-medium transition cursor-pointer shadow-sm"
                >
                  Reject
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Decision Confirmation Modal */}
      <ConfirmModal
        isOpen={decisionModalOpen}
        title={
          decisionType === "APPROVED"
            ? `Approve "${selectedApp?.businessName}"`
            : decisionType === "REJECTED"
            ? `Reject Application for "${selectedApp?.businessName}"`
            : `Request Changes from "${selectedApp?.businessName}"`
        }
        message={
          decisionType === "APPROVED"
            ? `Approving this vendor will activate their profile, allowing them to view incoming move requests and place quotes.`
            : decisionType === "REJECTED"
            ? `Rejecting this application will archive it and notify the applicant.`
            : `Specify which documents or items need clarification before this application can be approved.`
        }
        confirmLabel={
          decisionType === "APPROVED"
            ? "Approve Application"
            : decisionType === "REJECTED"
            ? "Reject Application"
            : "Send Request"
        }
        confirmVariant={
          decisionType === "APPROVED"
            ? "primary"
            : decisionType === "REJECTED"
            ? "danger"
            : "warning"
        }
        requireReason={decisionType !== "APPROVED"}
        reasonPlaceholder={
          decisionType === "APPROVED"
            ? "Optional approval memo..."
            : "Specify reason for rejection or required clarification..."
        }
        isLoading={submitting}
        onConfirm={handleConfirmDecision}
        onClose={() => setDecisionModalOpen(false)}
      />
    </div>
  );
}
