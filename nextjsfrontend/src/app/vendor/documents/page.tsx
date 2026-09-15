"use client";

import { useState, useEffect, useRef } from "react";
import { fetchApi, getDocumentStreamUrl } from "@/lib/api";
import PageHeader from "@/app/admin/components/PageHeader";
import StatusBadge from "@/app/admin/components/StatusBadge";
import DocumentViewerModal from "@/app/admin/components/DocumentViewerModal";
import {
  FileText,
  Upload,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  Clock,
  X,
  ShieldCheck,
  ShieldAlert,
  Download,
  Eye,
  File,
  Printer,
  Building2,
  UserCheck,
  Camera,
  Calendar,
  Lock,
  Check,
  Info,
  RotateCcw,
  CameraOff,
  Sparkles,
} from "lucide-react";

interface DocItem {
  type: string;
  category: "BUSINESS" | "REPRESENTATIVE";
  title: string;
  description: string;
  required: boolean;
  status: "NOT_SUBMITTED" | "PENDING_REVIEW" | "CHANGES_REQUESTED" | "APPROVED" | "REJECTED";
  fileUrl?: string | null;
  fileName?: string | null;
  fileSize?: string | null;
  idType?: string | null;
  maskedIdNumber?: string | null;
  supportedIdTypes?: string[];
  submittedAt?: string | null;
  reviewedAt?: string | null;
  feedback?: string | null;
}

interface DocumentData {
  vendorStatus: string;
  lastReviewedAt?: string | null;
  adminFeedback?: string | null;
  documents: DocItem[];
}

export default function VendorDocumentsPage() {
  const [data, setData] = useState<DocumentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Document Viewer Modal
  const [viewingDoc, setViewingDoc] = useState<DocItem | null>(null);

  // Upload Modal
  const [selectedDoc, setSelectedDoc] = useState<DocItem | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileDataUrl, setFileDataUrl] = useState<string>("");
  const [fileNameInput, setFileNameInput] = useState<string>("");
  const [fileSizeInput, setFileSizeInput] = useState<string>("");
  const [selectedIdType, setSelectedIdType] = useState<string>("Aadhaar");
  const [idNumberInput, setIdNumberInput] = useState<string>("");
  const [notesInput, setNotesInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Live Camera Capture Modal State
  const [liveCameraOpen, setLiveCameraOpen] = useState(false);
  const [cameraLoading, setCameraLoading] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [cameraFlash, setCameraFlash] = useState(false);
  const [liveCameraStream, setLiveCameraStream] = useState<MediaStream | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetchApi<DocumentData>("/vendor/documents");
      setData(res);
    } catch (err: any) {
      setError(err.message || "Failed to load compliance documents");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  // Sync video stream with video element
  useEffect(() => {
    if (liveCameraOpen && videoRef.current && liveCameraStream) {
      videoRef.current.srcObject = liveCameraStream;
      videoRef.current.play().catch(() => {});
    }
  }, [liveCameraOpen, liveCameraStream]);

  // Cleanup camera stream on unmount
  useEffect(() => {
    return () => {
      if (liveCameraStream) {
        liveCameraStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [liveCameraStream]);

  const openLiveCamera = (_doc?: DocItem) => {
    setLiveCameraOpen(true);
    setCapturedPhoto(null);
    setCameraError(null);
    startCamera();
  };

  const startCamera = async () => {
    setCameraLoading(true);
    setCameraError(null);
    try {
      if (typeof navigator === "undefined" || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Live camera is not supported on this browser/device. Please upload an image file instead.");
      }
      // Stop prior tracks
      if (liveCameraStream) {
        liveCameraStream.getTracks().forEach((track) => track.stop());
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });
      setLiveCameraStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }
    } catch (err: any) {
      console.error("Camera access error:", err);
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        setCameraError("Camera permission was denied. Please allow camera permissions in your browser bar or upload a photo file.");
      } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
        setCameraError("No camera device was detected. Please connect a webcam or upload a photo file.");
      } else {
        setCameraError(err.message || "Failed to initialize camera feed.");
      }
    } finally {
      setCameraLoading(false);
    }
  };

  const stopCamera = () => {
    if (liveCameraStream) {
      liveCameraStream.getTracks().forEach((track) => track.stop());
      setLiveCameraStream(null);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const handleCapturePhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    if (video.videoWidth === 0 || video.videoHeight === 0) return;

    // Trigger visual shutter flash
    setCameraFlash(true);
    setTimeout(() => setCameraFlash(false), 250);

    const canvas = canvasRef.current || document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Flip horizontally to mirror selfie orientation
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
    setCapturedPhoto(dataUrl);

    // Stop video stream while reviewing captured photo
    stopCamera();
  };

  const handleRetakePhoto = () => {
    setCapturedPhoto(null);
    startCamera();
  };

  const handleCloseCamera = () => {
    stopCamera();
    setLiveCameraOpen(false);
    setCapturedPhoto(null);
    setCameraError(null);
  };

  const handleUploadLivePhoto = async () => {
    if (!capturedPhoto) return;
    try {
      setSubmitting(true);
      setCameraError(null);

      const sizeBytes = Math.round((capturedPhoto.length * 3) / 4);
      const sizeKb = Math.round(sizeBytes / 1024);
      const fileSize = sizeKb > 1000 ? `${(sizeKb / 1024).toFixed(1)} MB` : `${sizeKb} KB`;

      await fetchApi("/vendor/documents", {
        method: "POST",
        body: JSON.stringify({
          type: "REPRESENTATIVE_PHOTO",
          fileUrl: capturedPhoto,
          fileName: `live_kyc_selfie_${Date.now()}.jpg`,
          fileSize,
          notes: "Live camera selfie biometric capture",
        }),
      });

      setSuccess("Live representative KYC photo captured and submitted successfully!");
      handleCloseCamera();
      fetchDocuments();
      setTimeout(() => setSuccess(null), 4000);
    } catch (err: any) {
      setCameraError(err.message || "Failed to upload captured KYC photo.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleFileSelect = (file: File) => {
    setUploadError(null);

    const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    const isImage = file.type.startsWith("image/") || /\.(jpg|jpeg|png)$/i.test(file.name);

    if (selectedDoc?.type === "REPRESENTATIVE_PHOTO") {
      if (!isImage && !isPdf) {
        setUploadError("Please upload a valid image (JPG, PNG) or PDF of the representative photo.");
        return;
      }
    } else {
      if (!isPdf && !isImage) {
        setUploadError("Please upload an authentic document file (PDF or clear scan).");
        return;
      }
    }

    if (file.size > 10 * 1024 * 1024) {
      setUploadError("File is too large. Maximum file size allowed is 10MB.");
      return;
    }

    setSelectedFile(file);
    setFileNameInput(file.name);
    const sizeMb = (file.size / (1024 * 1024)).toFixed(2);
    setFileSizeInput(`${sizeMb} MB`);

    const reader = new FileReader();
    reader.onload = (e) => {
      setFileDataUrl(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleOpenUpload = (doc: DocItem) => {
    setSelectedDoc(doc);
    setSelectedFile(null);
    setFileDataUrl("");
    setFileNameInput(doc.fileName || `${doc.type.toLowerCase()}_document.pdf`);
    setFileSizeInput(doc.fileSize || "1.5 MB");
    setSelectedIdType(doc.idType || "Aadhaar");
    setIdNumberInput("");
    setNotesInput("");
    setUploadError(null);
  };

  const handleSubmitDoc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDoc) return;

    const finalUrl = fileDataUrl || selectedDoc.fileUrl;
    if (!finalUrl) {
      setUploadError("Please select a file to upload.");
      return;
    }

    try {
      setSubmitting(true);
      setUploadError(null);

      await fetchApi("/vendor/documents", {
        method: "POST",
        body: JSON.stringify({
          type: selectedDoc.type,
          fileUrl: finalUrl,
          fileName: fileNameInput || `${selectedDoc.type.toLowerCase()}_document.pdf`,
          fileSize: fileSizeInput || "1.5 MB",
          idType: selectedDoc.type === "REPRESENTATIVE_ID_PROOF" ? selectedIdType : undefined,
          idNumber: selectedDoc.type === "REPRESENTATIVE_ID_PROOF" ? idNumberInput : undefined,
          notes: notesInput,
        }),
      });

      setSuccess(`"${selectedDoc.title}" submitted successfully for administrative review.`);
      setSelectedDoc(null);
      fetchDocuments();
      setTimeout(() => setSuccess(null), 4000);
    } catch (err: any) {
      setUploadError(err.message || "Failed to submit document.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownloadDoc = (doc: DocItem) => {
    if (!doc.fileUrl) return;
    if (doc.fileUrl.startsWith("data:")) {
      const link = document.createElement("a");
      link.href = doc.fileUrl;
      link.download = doc.fileName || `${doc.type.toLowerCase()}_verified.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      const downloadUrl = getDocumentStreamUrl(doc.fileUrl, true);
      window.open(downloadUrl, "_blank");
    }
  };

  const businessDocs = (data?.documents || []).filter((d) => d.category === "BUSINESS");
  const representativeDocs = (data?.documents || []).filter((d) => d.category === "REPRESENTATIVE");

  return (
    <div className="space-y-7 font-sans text-[#1E293B]">
      {/* Page Header */}
      <PageHeader
        title="Compliance & Verification"
        description="Manage your business and representative verification documents."
      >
        <button
          onClick={fetchDocuments}
          disabled={loading}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 shadow-xs cursor-pointer disabled:opacity-50"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          <span>Refresh</span>
        </button>
      </PageHeader>

      {/* Alerts */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center justify-between gap-3 text-rose-700 text-xs shadow-xs">
          <div className="flex items-center gap-2.5">
            <AlertCircle size={17} className="shrink-0 text-rose-600" />
            <span className="font-medium">{error}</span>
          </div>
          <button onClick={fetchDocuments} className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold cursor-pointer">
            Retry
          </button>
        </div>
      )}

      {success && (
        <div className="p-4 bg-teal-50 border border-teal-200 rounded-2xl flex items-center gap-2.5 text-teal-800 text-xs shadow-xs">
          <CheckCircle2 size={17} className="shrink-0 text-teal-600" />
          <span className="font-semibold">{success}</span>
        </div>
      )}

      {data && (
        <div className="p-5 rounded-2xl bg-white shadow-xs border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="h-11 w-11 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center shrink-0">
              {data.vendorStatus === "APPROVED" ? (
                <ShieldCheck size={22} className="text-teal-600" />
              ) : (
                <ShieldAlert size={22} className="text-amber-500" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Vendor Onboarding Status:</span>
                <StatusBadge status={data.vendorStatus} />
              </div>
              {data.adminFeedback && (
                <p className="text-xs text-amber-900 font-medium mt-1">
                  <span className="font-bold">Admin Notice:</span> {data.adminFeedback}
                </p>
              )}
            </div>
          </div>

          {data.lastReviewedAt && (
            <div className="text-[11px] text-slate-500 sm:text-right shrink-0">
              <span className="font-semibold block">Last Admin Review</span>
              <span className="font-mono">
                {new Date(data.lastReviewedAt).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </span>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 1 — BUSINESS VERIFICATION                                         */}
      {/* ========================================================================= */}
      <div className="space-y-4">
        <div className="flex items-center gap-2.5 border-b border-slate-200 pb-2.5">
          <div className="h-8 w-8 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0">
            <Building2 size={16} />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
              Section 1 — Business Verification
            </h2>
            <p className="text-xs text-slate-500">
              Mandatory commercial credentials verifying the legitimacy and operational authority of the business.
            </p>
          </div>
        </div>

        {/* Business Documents Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {businessDocs.map((doc) => (
            <DocumentCard
              key={doc.type}
              doc={doc}
              onOpenUpload={() => handleOpenUpload(doc)}
              onView={() => setViewingDoc(doc)}
              onDownload={() => handleDownloadDoc(doc)}
            />
          ))}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 2 — OWNER / AUTHORIZED REPRESENTATIVE VERIFICATION                 */}
      {/* ========================================================================= */}
      <div className="space-y-4 pt-2">
        <div className="flex items-center gap-2.5 border-b border-slate-200 pb-2.5">
          <div className="h-8 w-8 rounded-lg bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-600 shrink-0">
            <UserCheck size={16} />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
              Section 2 — Owner / Authorized Representative Verification
            </h2>
            <p className="text-xs text-slate-500">
              Identity verification of the individual owning or legally representing the moving company.
            </p>
          </div>
        </div>

        {/* Representative Documents Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {representativeDocs.map((doc) => (
            <DocumentCard
              key={doc.type}
              doc={doc}
              onOpenUpload={() => handleOpenUpload(doc)}
              onOpenLiveCamera={() => openLiveCamera(doc)}
              onView={() => setViewingDoc(doc)}
              onDownload={() => handleDownloadDoc(doc)}
            />
          ))}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL: DOCUMENT INSPECTION VIEWER                                         */}
      {/* ========================================================================= */}
      {/* AUTHENTICATED PDF / KYC DOCUMENT VIEWER MODAL */}
      <DocumentViewerModal
        isOpen={!!viewingDoc}
        title={viewingDoc?.title || "Verification Document"}
        fileUrl={viewingDoc?.fileUrl}
        fileName={viewingDoc?.fileName}
        fileSize={viewingDoc?.fileSize}
        docType={viewingDoc?.type}
        category={viewingDoc?.category}
        status={viewingDoc?.status}
        feedback={viewingDoc?.feedback}
        idType={viewingDoc?.idType}
        maskedIdNumber={viewingDoc?.maskedIdNumber}
        onClose={() => setViewingDoc(null)}
        isAdmin={false}
      />

      {/* ========================================================================= */}
      {/* MODAL: LIVE KYC CAMERA CAPTURE                                            */}
      {/* ========================================================================= */}
      {liveCameraOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-lg w-full overflow-hidden shadow-2xl flex flex-col animate-scaleUp">
            {/* Header */}
            <div className="px-5 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center">
                  <Camera size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Live KYC Photo Capture</h3>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="flex h-2 w-2 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    <span className="text-[10px] font-mono font-bold text-emerald-700 uppercase tracking-wider">
                      {capturedPhoto ? "Photo Captured" : "Live Camera Feed"}
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={handleCloseCamera}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Camera Viewfinder / Preview Area */}
            <div className="p-5 space-y-4">
              <div className="relative w-full aspect-[4/3] bg-slate-950 rounded-2xl overflow-hidden shadow-inner flex items-center justify-center border border-slate-200">
                {/* Visual Camera Shutter Flash */}
                {cameraFlash && (
                  <div className="absolute inset-0 bg-white z-40 pointer-events-none transition-opacity duration-300" />
                )}

                {/* Captured Photo Preview */}
                {capturedPhoto ? (
                  <div className="relative w-full h-full">
                    <img
                      src={capturedPhoto}
                      alt="Captured representative selfie"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-3 left-3 bg-emerald-600 text-white text-[11px] font-bold px-2.5 py-1 rounded-lg backdrop-blur-xs flex items-center gap-1.5 shadow-md">
                      <CheckCircle2 size={13} />
                      <span>Live Photo Ready</span>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Live Video Stream */}
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className={`w-full h-full object-cover transform -scale-x-100 ${
                        cameraLoading || cameraError ? "hidden" : "block"
                      }`}
                    />

                    {/* Biometric Face Guide Overlay (Only during active live stream) */}
                    {!cameraLoading && !cameraError && (
                      <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
                        {/* Oval Face Silhouette Guide */}
                        <div className="w-44 h-56 sm:w-52 sm:h-64 rounded-[50%] border-2 border-dashed border-emerald-400/90 shadow-[0_0_30px_rgba(52,211,153,0.3)] relative flex items-center justify-center">
                          {/* Corner alignment brackets */}
                          <div className="absolute top-2 left-4 text-emerald-300/80 text-xs font-mono font-bold">┌</div>
                          <div className="absolute top-2 right-4 text-emerald-300/80 text-xs font-mono font-bold">┐</div>
                          <div className="absolute bottom-2 left-4 text-emerald-300/80 text-xs font-mono font-bold">└</div>
                          <div className="absolute bottom-2 right-4 text-emerald-300/80 text-xs font-mono font-bold">┘</div>

                          <span className="absolute -top-3.5 bg-slate-900/85 text-emerald-300 border border-emerald-500/40 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full backdrop-blur-xs">
                            Align Face In Oval
                          </span>
                        </div>

                        {/* Live Guidance Tip */}
                        <div className="absolute bottom-3 inset-x-3 flex items-center justify-center">
                          <div className="bg-slate-900/80 border border-white/10 text-white text-[11px] px-3 py-1 rounded-full backdrop-blur-xs shadow-md flex items-center gap-1.5 font-medium">
                            <Sparkles size={12} className="text-amber-400" />
                            <span>Look straight at the camera with clear lighting</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Camera Loading State */}
                    {cameraLoading && (
                      <div className="flex flex-col items-center gap-2.5 text-slate-300 text-xs">
                        <RefreshCw size={24} className="animate-spin text-blue-500" />
                        <span>Initializing live camera feed...</span>
                      </div>
                    )}

                    {/* Camera Error State */}
                    {cameraError && (
                      <div className="p-6 text-center space-y-3 max-w-xs z-10">
                        <CameraOff size={36} className="text-rose-400 mx-auto" />
                        <p className="text-xs text-rose-200">{cameraError}</p>
                        <div className="flex items-center justify-center gap-2 pt-2">
                          <button
                            type="button"
                            onClick={startCamera}
                            className="px-3 py-1.5 text-xs font-semibold text-white bg-slate-800 hover:bg-slate-700 rounded-xl cursor-pointer"
                          >
                            Retry Camera
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              handleCloseCamera();
                              const photoDoc = (data?.documents || []).find((d) => d.type === "REPRESENTATIVE_PHOTO");
                              if (photoDoc) handleOpenUpload(photoDoc);
                            }}
                            className="px-3 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl cursor-pointer"
                          >
                            Upload File Instead
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* Hidden canvas for taking snapshot */}
                <canvas ref={canvasRef} className="hidden" />
              </div>

              {/* Instructions Bar */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-slate-600 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Info size={14} className="text-blue-600 shrink-0" />
                  <span>
                    {capturedPhoto
                      ? "Check your photo clarity. Ensure eyes and face are clearly visible."
                      : "Hold still and look directly into the camera before capturing."}
                  </span>
                </div>
                {!capturedPhoto && (
                  <button
                    type="button"
                    onClick={() => {
                      handleCloseCamera();
                      const photoDoc = (data?.documents || []).find((d) => d.type === "REPRESENTATIVE_PHOTO");
                      if (photoDoc) handleOpenUpload(photoDoc);
                    }}
                    className="text-[10px] text-blue-600 font-bold hover:underline shrink-0 cursor-pointer"
                  >
                    Switch to File Upload
                  </button>
                )}
              </div>
            </div>

            {/* Modal Actions Footer */}
            <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
              {capturedPhoto ? (
                <>
                  <button
                    type="button"
                    onClick={handleRetakePhoto}
                    className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 shadow-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <RotateCcw size={13} />
                    <span>Retake Photo</span>
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleCloseCamera}
                      className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={handleUploadLivePhoto}
                      className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      {submitting ? (
                        <>
                          <RefreshCw size={13} className="animate-spin" />
                          <span>Uploading...</span>
                        </>
                      ) : (
                        <>
                          <Check size={13} />
                          <span>Confirm & Upload Photo</span>
                        </>
                      )}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={handleCloseCamera}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    disabled={cameraLoading || !!cameraError}
                    onClick={handleCapturePhoto}
                    className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-xs flex items-center gap-2 cursor-pointer transition disabled:opacity-50"
                  >
                    <Camera size={15} />
                    <span>Capture Live Photo</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: DOCUMENT UPLOAD                                                    */}
      {/* ========================================================================= */}
      {selectedDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-7 max-w-md w-full space-y-4 shadow-2xl animate-scaleUp">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center">
                  <Upload size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Upload Verification File</h3>
                  <p className="text-xs text-slate-500 truncate">{selectedDoc.title}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedDoc(null)}
                className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {uploadError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
                <AlertCircle size={14} className="shrink-0" />
                <span>{uploadError}</span>
              </div>
            )}

            <form onSubmit={handleSubmitDoc} className="space-y-3.5 text-xs">
              {/* Optional ID Type Selector for Government ID */}
              {selectedDoc.type === "REPRESENTATIVE_ID_PROOF" && (
                <div className="space-y-2">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1 uppercase text-[10px]">
                      Identity Document Type *
                    </label>
                    <select
                      value={selectedIdType}
                      onChange={(e) => setSelectedIdType(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition"
                    >
                      <option value="Aadhaar">Aadhaar Card</option>
                      <option value="Passport">Passport</option>
                      <option value="Driving Licence">Driving Licence</option>
                      <option value="Voter ID">Voter ID</option>
                      <option value="Other">Other Government Photo ID</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1 uppercase text-[10px]">
                      Document ID Number (Optional / Masked)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Last 4 digits or full number (auto-masked)"
                      value={idNumberInput}
                      onChange={(e) => setIdNumberInput(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition font-mono"
                    />
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      Sensitive identity numbers are automatically masked (e.g. •••• •••• 1234).
                    </p>
                  </div>
                </div>
              )}

              {/* Photo Explanation */}
              {selectedDoc.type === "REPRESENTATIVE_PHOTO" && (
                <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-blue-950">
                  <div className="flex items-center gap-2.5">
                    <div className="h-8 w-8 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                      <Camera size={16} />
                    </div>
                    <div>
                      <p className="font-bold text-xs text-blue-950">Live Camera Capture Recommended</p>
                      <p className="text-[11px] text-blue-700">Capture directly with your device webcam for fastest verification.</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const d = selectedDoc;
                      setSelectedDoc(null);
                      openLiveCamera(d);
                    }}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 flex items-center gap-1.5 shrink-0 shadow-xs cursor-pointer transition"
                  >
                    <Camera size={13} />
                    <span>Launch Live Camera</span>
                  </button>
                </div>
              )}

              {/* Drag and Drop Zone */}
              <div>
                <label className="block font-bold text-slate-700 mb-1.5 uppercase text-[10px]">
                  Document File Attachment *
                </label>

                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragOver(true);
                  }}
                  onDragLeave={() => setIsDragOver(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragOver(false);
                    if (e.dataTransfer.files?.[0]) {
                      handleFileSelect(e.dataTransfer.files[0]);
                    }
                  }}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition flex flex-col items-center justify-center gap-2 ${
                    isDragOver
                      ? "border-blue-500 bg-blue-50/70"
                      : "border-slate-300 bg-slate-50 hover:border-blue-500 hover:bg-blue-50/30"
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept={
                      selectedDoc.type === "REPRESENTATIVE_PHOTO"
                        ? "image/*,application/pdf"
                        : "application/pdf,image/*"
                    }
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files?.[0]) {
                        handleFileSelect(e.target.files[0]);
                      }
                    }}
                  />

                  <div className="h-10 w-10 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center">
                    <Upload size={18} />
                  </div>

                  <div>
                    <p className="font-bold text-xs text-slate-800">
                      Click to choose file or drag & drop here
                    </p>
                    <p className="text-[10px] text-slate-500">
                      {selectedDoc.type === "REPRESENTATIVE_PHOTO"
                        ? "JPG, PNG image or PDF (Max 10MB)"
                        : "PDF or clear document scan (Max 10MB)"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Selected File Chip */}
              {selectedFile && (
                <div className="p-3 rounded-xl bg-slate-50 border border-emerald-200 flex items-center justify-between text-xs">
                  <div className="min-w-0 pr-2">
                    <p className="font-bold text-slate-900 truncate font-mono text-[11px]">{selectedFile.name}</p>
                    <p className="text-[10px] text-emerald-700 font-semibold">{fileSizeInput} • Ready</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedFile(null);
                      setFileDataUrl("");
                    }}
                    className="text-rose-600 hover:text-rose-800 cursor-pointer"
                  >
                    <X size={14} />
                  </button>
                </div>
              )}

              {/* Optional Notes */}
              <div>
                <label className="block font-bold text-slate-700 mb-1 uppercase text-[10px]">
                  Notes for Reviewer (Optional)
                </label>
                <textarea
                  rows={2}
                  value={notesInput}
                  onChange={(e) => setNotesInput(e.target.value)}
                  placeholder="Any specific comments or renewal dates..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setSelectedDoc(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 shadow-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || (!selectedFile && !selectedDoc.fileUrl)}
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-xs disabled:opacity-50 cursor-pointer transition"
                >
                  {submitting ? "Uploading..." : "Submit for Verification"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// Reusable Document Card Component
function DocumentCard({
  doc,
  onOpenUpload,
  onOpenLiveCamera,
  onView,
  onDownload,
}: {
  doc: DocItem;
  onOpenUpload: () => void;
  onOpenLiveCamera?: () => void;
  onView: () => void;
  onDownload: () => void;
}) {
  const isPhoto = doc.type === "REPRESENTATIVE_PHOTO";

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 flex flex-col justify-between space-y-3.5 shadow-xs hover:shadow-md transition">
      <div className="space-y-3">
        {/* Top: Icon, Title, Status */}
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="h-9 w-9 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center shrink-0">
              {isPhoto ? <Camera size={18} /> : <FileText size={18} />}
            </div>
            <div className="min-w-0">
              <h3 className="text-xs sm:text-sm font-bold text-slate-900 truncate">{doc.title}</h3>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[10px] font-mono font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                  {doc.type}
                </span>
                {doc.idType && (
                  <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                    {doc.idType}
                  </span>
                )}
              </div>
            </div>
          </div>

          <StatusBadge status={doc.status} />
        </div>

        {/* Description */}
        <p className="text-xs text-slate-500 leading-relaxed">{doc.description}</p>

        {/* Admin Feedback (If changes requested or rejected) */}
        {doc.feedback && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 space-y-0.5">
            <div className="flex items-center gap-1.5 font-bold text-[11px] text-amber-950">
              <AlertTriangle size={13} className="text-amber-600 shrink-0" />
              <span>Admin Feedback:</span>
            </div>
            <p className="text-amber-900 pl-4">{doc.feedback}</p>
          </div>
        )}

        {/* Attachment Pill (Only if file is present) */}
        {doc.fileUrl ? (
          isPhoto ? (
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-3 min-w-0">
                <div className="relative h-12 w-12 rounded-xl overflow-hidden border border-slate-200 shrink-0 bg-slate-200 flex items-center justify-center">
                  <img
                    src={getDocumentStreamUrl(doc.fileUrl)}
                    alt="Live KYC Portrait"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = "none";
                    }}
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute bottom-0 right-0 h-4 w-4 bg-teal-600 rounded-full flex items-center justify-center text-white border border-white">
                    <Check size={9} />
                  </div>
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="font-bold text-xs text-slate-900 truncate">Live Portrait Capture</p>
                    <span className="text-[9px] font-bold text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded border border-teal-200">
                      Live Selfie
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                    {doc.fileName || "live_kyc_photo.jpg"} • {doc.fileSize || "Verified photo"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={onView}
                  className="px-2.5 py-1 rounded-lg text-xs font-bold text-blue-600 bg-white border border-slate-200 hover:bg-slate-100 flex items-center gap-1 cursor-pointer shadow-xs transition"
                  title="View Photo"
                >
                  <Eye size={12} />
                  <span>View</span>
                </button>
                <button
                  onClick={onDownload}
                  className="p-1.5 rounded-lg text-slate-600 bg-white border border-slate-200 hover:text-slate-900 hover:bg-slate-100 cursor-pointer shadow-xs transition"
                  title="Download"
                >
                  <Download size={12} />
                </button>
              </div>
            </div>
          ) : (
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2 min-w-0">
                <div className="h-7 w-7 rounded-lg bg-rose-500 text-white flex items-center justify-center font-bold text-[8px] shrink-0">
                  PDF
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-xs text-slate-900 truncate font-mono">
                    {doc.fileName || `${doc.type.toLowerCase()}_file`}
                  </p>
                  <p className="text-[10px] text-slate-500">
                    {doc.fileSize || "Verified file"}
                    {doc.maskedIdNumber ? ` • ${doc.maskedIdNumber}` : ""}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={onView}
                  className="px-2.5 py-1 rounded-lg text-xs font-bold text-blue-600 bg-white border border-slate-200 hover:bg-slate-100 flex items-center gap-1 cursor-pointer shadow-xs transition"
                  title="View Document"
                >
                  <Eye size={12} />
                  <span>View</span>
                </button>
                <button
                  onClick={onDownload}
                  className="p-1.5 rounded-lg text-slate-600 bg-white border border-slate-200 hover:text-slate-900 hover:bg-slate-100 cursor-pointer shadow-xs transition"
                  title="Download"
                >
                  <Download size={12} />
                </button>
              </div>
            </div>
          )
        ) : (
          isPhoto ? (
            <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-[11px] text-blue-900 flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                <Camera size={16} />
              </div>
              <div className="min-w-0">
                <p className="font-bold text-xs text-blue-950">Live Camera Verification Required</p>
                <p className="text-[10px] text-blue-700">Capture a live photo using your device webcam or camera.</p>
              </div>
            </div>
          ) : (
            <div className="p-2.5 rounded-xl bg-slate-50 border border-dashed border-slate-200 text-[11px] text-slate-500 flex items-center gap-2">
              <Info size={14} className="text-slate-400 shrink-0" />
              <span>Not submitted yet. Required for platform verification.</span>
            </div>
          )
        )}
      </div>

      {/* Card Footer: Real Timestamps & Upload/Re-upload CTA */}
      <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
        <span className="text-[11px] text-slate-500">
          {doc.submittedAt
            ? `Submitted ${new Date(doc.submittedAt).toLocaleDateString("en-IN")}`
            : "Not submitted"}
        </span>

        {isPhoto ? (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onOpenUpload}
              className="text-[11px] text-slate-500 hover:text-blue-600 font-medium underline underline-offset-2 cursor-pointer flex items-center gap-1"
              title="Upload photo file from device storage"
            >
              <Upload size={11} />
              <span>or file</span>
            </button>

            <button
              type="button"
              onClick={onOpenLiveCamera}
              className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-xs flex items-center gap-1.5 cursor-pointer transition"
            >
              <Camera size={13} />
              <span>
                {doc.status === "NOT_SUBMITTED"
                  ? "Live Capture"
                  : doc.status === "CHANGES_REQUESTED"
                  ? "Recapture Live Photo"
                  : "Retake Live Photo"}
              </span>
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={onOpenUpload}
            className="px-3 py-1.5 rounded-xl text-xs font-bold text-blue-600 bg-white border border-blue-200 hover:bg-blue-50 flex items-center gap-1.5 cursor-pointer shadow-xs transition"
          >
            <Upload size={12} />
            <span>
              {doc.status === "NOT_SUBMITTED"
                ? "Upload"
                : doc.status === "CHANGES_REQUESTED"
                ? "Re-upload (Revision)"
                : "Re-upload"}
            </span>
          </button>
        )}
      </div>
    </div>
  );
}
