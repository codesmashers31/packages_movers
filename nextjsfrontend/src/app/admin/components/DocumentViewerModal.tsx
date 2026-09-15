"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  X,
  FileText,
  Download,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  MessageSquare,
  Camera,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { getDocumentStreamUrl, isImageDocument } from "@/lib/api";
import StatusBadge from "./StatusBadge";

interface DocumentViewerModalProps {
  isOpen: boolean;
  title: string;
  fileUrl?: string | null;
  fileName?: string | null;
  fileSize?: string | null;
  docType?: string;
  category?: string;
  vendorName?: string;
  status?: string;
  feedback?: string | null;
  idType?: string | null;
  maskedIdNumber?: string | null;
  onClose: () => void;
  onApprove?: () => void;
  onRequestChanges?: () => void;
  onReject?: () => void;
  isAdmin?: boolean;
}

export default function DocumentViewerModal({
  isOpen,
  title,
  fileUrl,
  fileName,
  fileSize,
  docType,
  category,
  vendorName,
  status = "PENDING_REVIEW",
  feedback,
  idType,
  maskedIdNumber,
  onClose,
  onApprove,
  onRequestChanges,
  onReject,
  isAdmin = false,
}: DocumentViewerModalProps) {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [detectedMime, setDetectedMime] = useState<string | null>(null);

  const cleanFileName = fileName || `${(docType || "document").toLowerCase()}_verified.pdf`;

  const loadDocumentContent = useCallback(async () => {
    if (!fileUrl) {
      setLoading(false);
      setLoadError(true);
      setErrorMessage("No document file link specified.");
      return;
    }

    setLoading(true);
    setLoadError(false);
    setErrorMessage(null);

    // If already a base64 Data URL, use directly
    if (fileUrl.startsWith("data:")) {
      setObjectUrl(fileUrl);
      if (fileUrl.startsWith("data:image/")) {
        setDetectedMime("image");
      } else {
        setDetectedMime("application/pdf");
      }
      setLoading(false);
      return;
    }

    const streamUrl = getDocumentStreamUrl(fileUrl);
    if (!streamUrl) {
      setLoading(false);
      setLoadError(true);
      setErrorMessage("Unable to construct valid streaming URL.");
      return;
    }

    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;
      const res = await fetch(streamUrl, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (!res.ok) {
        setLoading(false);
        setLoadError(true);
        if (res.status === 404) {
          setErrorMessage("The document file is not yet uploaded or is unavailable on the storage server.");
        } else if (res.status === 401 || res.status === 403) {
          setErrorMessage("Authentication error: You do not have permission to view this document.");
        } else {
          setErrorMessage(`Server responded with error status ${res.status}.`);
        }
        return;
      }

      const contentType = res.headers.get("content-type") || "";
      const blob = await res.blob();
      const createdBlobUrl = URL.createObjectURL(blob);

      setObjectUrl(createdBlobUrl);
      setDetectedMime(contentType);
      setLoading(false);
    } catch (err: any) {
      // In case fetch fails (e.g. strict CORS or offline), fall back to streaming URL directly
      console.warn("[DocumentViewerModal] Blob fetch failed, falling back to stream URL:", err);
      setObjectUrl(streamUrl);
      setLoading(false);
    }
  }, [fileUrl]);

  useEffect(() => {
    let active = true;

    if (isOpen && fileUrl) {
      loadDocumentContent();
    } else {
      setLoading(false);
      setLoadError(false);
      setErrorMessage(null);
      setObjectUrl(null);
    }

    return () => {
      active = false;
      if (objectUrl && objectUrl.startsWith("blob:")) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [isOpen, fileUrl, loadDocumentContent]);

  if (!isOpen) return null;

  const streamUrl = getDocumentStreamUrl(fileUrl);
  const downloadUrl = getDocumentStreamUrl(fileUrl, true);
  const isImg =
    isImageDocument(docType, fileName || undefined, fileUrl || undefined) ||
    (detectedMime ? detectedMime.startsWith("image/") : false);

  const displayUrl = objectUrl || streamUrl;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-[#EEF2F6] rounded-3xl shadow-neu-flat border border-white/80 max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-scaleUp">
        {/* Modal Header */}
        <div className="px-5 py-3.5 border-b border-[#D9E2EC]/80 flex items-center justify-between bg-[#EEF2F6] shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-10 w-10 rounded-2xl bg-blue-500/10 text-[#2563EB] flex items-center justify-center shadow-neu-raised-sm shrink-0 border border-blue-200/60">
              {isImg ? <Camera size={20} /> : <FileText size={20} />}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-bold text-slate-900 truncate">{title}</h3>
                <StatusBadge status={status} />
              </div>
              <p className="text-xs text-slate-500 font-mono mt-0.5 truncate">
                {vendorName && <strong className="text-slate-800 font-semibold">{vendorName} • </strong>}
                {cleanFileName}
                {fileSize && <span> • {fileSize}</span>}
                {idType && <span> • {idType}</span>}
                {maskedIdNumber && <span> • {maskedIdNumber}</span>}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {displayUrl && !loadError && (
              <a
                href={displayUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="neu-btn px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-700 hover:text-[#2563EB] flex items-center gap-1.5 cursor-pointer shadow-neu-flat-sm"
                title="Open in Full Browser Tab"
              >
                <ExternalLink size={13} />
                <span className="hidden sm:inline">New Tab</span>
              </a>
            )}

            {displayUrl && !loadError && (
              <a
                href={objectUrl || downloadUrl || displayUrl}
                download={cleanFileName}
                target="_blank"
                rel="noopener noreferrer"
                className="neu-btn px-3 py-1.5 rounded-xl text-xs font-bold text-[#2563EB] flex items-center gap-1.5 cursor-pointer shadow-neu-raised-sm"
                title="Download Official Document"
              >
                <Download size={13} />
                <span>Download</span>
              </a>
            )}

            <button
              onClick={onClose}
              className="neu-btn p-2 rounded-xl text-slate-500 hover:text-slate-900 cursor-pointer shadow-neu-flat-sm"
              title="Close Viewer"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Feedback Alert if requested revisions */}
        {feedback && (
          <div className="mx-5 mt-3 p-3 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-2.5 text-xs text-amber-900 shadow-neu-inset-sm shrink-0">
            <AlertTriangle size={15} className="text-amber-600 shrink-0 mt-0.5" />
            <div>
              <strong className="font-bold">Review Feedback:</strong> {feedback}
            </div>
          </div>
        )}

        {/* Viewer Content Body */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 bg-slate-100 flex items-center justify-center min-h-[460px] relative">
          {loadError ? (
            <div className="text-center p-8 max-w-md space-y-3 bg-[#EEF2F6] rounded-3xl border border-white/80 shadow-neu-flat">
              <div className="h-12 w-12 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center mx-auto shadow-neu-raised-sm">
                <AlertCircle size={24} />
              </div>
              <div>
                <h4 className="font-bold text-sm text-slate-800">Document file is unavailable.</h4>
                <p className="text-xs text-slate-500 mt-1">
                  {errorMessage || "The requested compliance document has not been uploaded yet or could not be loaded from the storage server."}
                </p>
              </div>
              <div className="flex items-center justify-center gap-2 pt-2">
                <button
                  onClick={loadDocumentContent}
                  className="neu-btn px-4 py-2 rounded-xl text-xs font-semibold text-[#2563EB] flex items-center gap-1.5 cursor-pointer shadow-neu-flat-sm"
                >
                  <RefreshCw size={13} />
                  <span>Retry</span>
                </button>
                <button
                  onClick={onClose}
                  className="neu-btn px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 cursor-pointer"
                >
                  Dismiss
                </button>
              </div>
            </div>
          ) : isImg ? (
            <div className="w-full flex flex-col items-center justify-center p-2">
              {loading && (
                <div className="absolute inset-0 bg-slate-50/90 flex flex-col items-center justify-center gap-2 z-10">
                  <Loader2 size={24} className="animate-spin text-[#2563EB]" />
                  <span className="text-xs text-slate-500 font-medium">Loading document image...</span>
                </div>
              )}
              <img
                src={displayUrl}
                alt={title}
                onLoad={() => setLoading(false)}
                onError={() => {
                  setLoading(false);
                  setLoadError(true);
                  setErrorMessage("Failed to render document image.");
                }}
                className="max-h-[520px] max-w-full object-contain rounded-2xl shadow-neu-flat border border-white/80 bg-white"
              />
              <p className="text-xs text-slate-500 font-mono mt-3">
                {cleanFileName} {fileSize ? `(${fileSize})` : ""}
              </p>
            </div>
          ) : (
            <div className="w-full h-full min-h-[520px] flex flex-col rounded-2xl overflow-hidden border border-[#D9E2EC]/80 shadow-inner bg-white relative">
              {loading && (
                <div className="absolute inset-0 bg-slate-50/90 flex flex-col items-center justify-center gap-2 z-10">
                  <Loader2 size={24} className="animate-spin text-[#2563EB]" />
                  <span className="text-xs text-slate-500 font-medium">Loading compliance document...</span>
                </div>
              )}
              {displayUrl && (
                <iframe
                  src={displayUrl}
                  title={title}
                  onLoad={() => setLoading(false)}
                  onError={() => {
                    setLoading(false);
                    setLoadError(true);
                    setErrorMessage("Failed to render PDF document.");
                  }}
                  className="w-full h-[520px] border-none"
                />
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-[#EEF2F6] border-t border-[#D9E2EC]/80 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-600 flex items-center gap-2">
            <ShieldCheck size={16} className="text-[#2563EB]" />
            <span className="font-semibold">Verification Record:</span>
            <span className="font-mono text-slate-500">Status: {status}</span>
          </div>

          {isAdmin && onApprove && onReject && onRequestChanges ? (
            <div className="flex items-center gap-2 flex-wrap justify-end">
              {/* Contextual actions: Only show alternative state transitions to prevent confusion */}
              {status === "APPROVED" && (
                <>
                  <button
                    type="button"
                    onClick={onRequestChanges}
                    className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-900 transition cursor-pointer flex items-center gap-1.5 shadow-neu-flat-sm"
                    title="Change decision to revision requested"
                  >
                    <RotateCcw size={13} />
                    <span>Request Changes</span>
                  </button>

                  <button
                    type="button"
                    onClick={onReject}
                    className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 border border-rose-200 transition cursor-pointer flex items-center gap-1.5 shadow-neu-flat-sm"
                    title="Change decision to rejected"
                  >
                    <X size={13} />
                    <span>Reject</span>
                  </button>
                </>
              )}

              {status === "CHANGES_REQUESTED" && (
                <>
                  <button
                    type="button"
                    onClick={onApprove}
                    className="neu-btn-primary px-4 py-1.5 rounded-xl text-xs font-bold text-white transition cursor-pointer shadow-neu-raised-sm flex items-center gap-1.5"
                    title="Change decision to approved"
                  >
                    <CheckCircle2 size={13} />
                    <span>Approve Document</span>
                  </button>

                  <button
                    type="button"
                    onClick={onReject}
                    className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 border border-rose-200 transition cursor-pointer flex items-center gap-1.5 shadow-neu-flat-sm"
                    title="Change decision to rejected"
                  >
                    <X size={13} />
                    <span>Reject</span>
                  </button>
                </>
              )}

              {status === "REJECTED" && (
                <>
                  <button
                    type="button"
                    onClick={onApprove}
                    className="neu-btn-primary px-4 py-1.5 rounded-xl text-xs font-bold text-white transition cursor-pointer shadow-neu-raised-sm flex items-center gap-1.5"
                    title="Change decision to approved"
                  >
                    <CheckCircle2 size={13} />
                    <span>Approve Document</span>
                  </button>

                  <button
                    type="button"
                    onClick={onRequestChanges}
                    className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-900 transition cursor-pointer flex items-center gap-1.5 shadow-neu-flat-sm"
                    title="Change decision to revision requested"
                  >
                    <RotateCcw size={13} />
                    <span>Request Changes</span>
                  </button>
                </>
              )}

              {status !== "APPROVED" && status !== "CHANGES_REQUESTED" && status !== "REJECTED" && (
                <>
                  <button
                    type="button"
                    onClick={onApprove}
                    className="neu-btn-primary px-4 py-1.5 rounded-xl text-xs font-bold text-white transition cursor-pointer shadow-neu-raised-sm flex items-center gap-1.5"
                    title="Approve this document"
                  >
                    <CheckCircle2 size={13} />
                    <span>Approve</span>
                  </button>

                  <button
                    type="button"
                    onClick={onRequestChanges}
                    className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-900 transition cursor-pointer flex items-center gap-1.5 shadow-neu-flat-sm"
                    title="Request vendor revisions"
                  >
                    <RotateCcw size={13} />
                    <span>Request Changes</span>
                  </button>

                  <button
                    type="button"
                    onClick={onReject}
                    className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 border border-rose-200 transition cursor-pointer flex items-center gap-1.5 shadow-neu-flat-sm"
                    title="Reject this document"
                  >
                    <X size={13} />
                    <span>Reject</span>
                  </button>
                </>
              )}

              <button
                onClick={onClose}
                className="neu-btn px-3.5 py-1.5 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer ml-1 shadow-neu-flat-sm"
              >
                Close
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 self-end sm:self-center">
              <button
                onClick={onClose}
                className="neu-btn px-4 py-1.5 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer shadow-neu-flat-sm"
              >
                Close Viewer
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
