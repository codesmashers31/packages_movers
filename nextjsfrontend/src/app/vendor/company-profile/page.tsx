"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { fetchApi, getDocumentStreamUrl } from "@/lib/api";
import StatusBadge from "@/app/admin/components/StatusBadge";
import DocumentViewerModal from "@/app/admin/components/DocumentViewerModal";
import {
  Building2,
  Users,
  ShieldCheck,
  ShieldAlert,
  Clock,
  AlertTriangle,
  Upload,
  Camera,
  CheckCircle2,
  FileText,
  Phone,
  Mail,
  MapPin,
  Layers,
  Edit3,
  Lock,
  RotateCcw,
  Eye,
  X,
  Plus,
  AlertCircle,
  HardHat,
  UserCheck,
  Check,
} from "lucide-react";

interface DocItem {
  type: string;
  category: "COMPANY" | "REPRESENTATIVE" | "OPERATIONAL" | "BUSINESS";
  section?: "COMPANY" | "REPRESENTATIVE" | "OPERATIONAL";
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

interface CompanyProfileData {
  vendor: {
    _id: string;
    businessName: string;
    logoUrl?: string | null;
    contactEmail?: string;
    contactPhone: string;
    status: string;
    serviceAreas: string[];
    servicesOffered: string[];
    createdAt: string;
  };
  workforce: {
    totalEmployees: number;
    crewWorkers: number;
    activeEmployees: number;
  };
  verification: {
    status: string;
    verificationStatus?: string;
    access?: "ALLOWED" | "RESTRICTED";
    blockingItem?: string | null;
    blockingReason?: string | null;
    lastReviewedAt?: string | null;
    adminFeedback?: string | null;
    suspensionReason?: string | null;
    coreApprovedCount?: number;
    coreRequiredCount?: number;
    coreVerificationComplete?: boolean;
    totalApprovedCount?: number;
    totalRequiredCount?: number;
    allDocumentsApproved?: boolean;
    documents: DocItem[];
  };
  canEdit: boolean;
  canUploadDocs: boolean;
}

export default function VendorCompanyProfilePage() {
  const [data, setData] = useState<CompanyProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "workforce" | "verification">("overview");

  // Overview edit state
  const [editingOverview, setEditingOverview] = useState(false);
  const [businessNameInput, setBusinessNameInput] = useState("");
  const [phoneInput, setPhoneInput] = useState("");
  const [emailInput, setEmailInput] = useState("");
  const [serviceAreas, setServiceAreas] = useState<string[]>([]);
  const [servicesOffered, setServicesOffered] = useState<string[]>([]);
  const [newAreaInput, setNewAreaInput] = useState("");
  const [newServiceInput, setNewServiceInput] = useState("");
  const [savingOverview, setSavingOverview] = useState(false);

  // Logo upload state
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  // Document modal states
  const [viewingDoc, setViewingDoc] = useState<DocItem | null>(null);
  const [uploadModalDoc, setUploadModalDoc] = useState<DocItem | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileDataUrl, setFileDataUrl] = useState<string>("");
  const [fileNameInput, setFileNameInput] = useState("");
  const [selectedIdType, setSelectedIdType] = useState("Aadhaar");
  const [idNumberInput, setIdNumberInput] = useState("");
  const [notesInput, setNotesInput] = useState("");
  const [submittingDoc, setSubmittingDoc] = useState(false);
  const [docUploadError, setDocUploadError] = useState<string | null>(null);

  // Live Camera state
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const docFileInputRef = useRef<HTMLInputElement>(null);

  const fetchProfile = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetchApi<CompanyProfileData>("/vendor/company-profile");
      if (res && res.vendor) {
        setData(res);
        setBusinessNameInput(res.vendor.businessName || "");
        setPhoneInput(res.vendor.contactPhone || "");
        setEmailInput(res.vendor.contactEmail || "");
        setServiceAreas(res.vendor.serviceAreas || []);
        setServicesOffered(res.vendor.servicesOffered || []);
        setLogoPreview(res.vendor.logoUrl || null);
        if (res.vendor.status) {
          localStorage.setItem("active_vendor_status", res.vendor.status);
        }
      }
    } catch (err: any) {
      console.error("Failed to load company profile:", err);
      setError(err?.message || "Failed to load company profile data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  // Handle Logo Upload
  const handleLogoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please select a valid image file (PNG, JPEG, WebP) for company logo.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Logo image size must be under 5MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      setLogoPreview(base64);
      try {
        setUploadingLogo(true);
        setError(null);
        await fetchApi("/vendor/company-profile/logo", {
          method: "POST",
          body: JSON.stringify({
            file: base64,
            fileName: file.name,
          }),
        });
        setSuccess("Company logo updated successfully.");
        await fetchProfile();
      } catch (uploadErr: any) {
        setError(uploadErr?.message || "Failed to upload company logo.");
      } finally {
        setUploadingLogo(false);
      }
    };
    reader.readAsDataURL(file);
  };

  // Save Company Overview
  const handleSaveOverview = async () => {
    try {
      setSavingOverview(true);
      setError(null);
      await fetchApi("/vendor/company-profile", {
        method: "PATCH",
        body: JSON.stringify({
          businessName: businessNameInput.trim(),
          contactPhone: phoneInput.trim(),
          contactEmail: emailInput.trim(),
          serviceAreas,
          servicesOffered,
        }),
      });
      setSuccess("Company profile details saved successfully.");
      setEditingOverview(false);
      await fetchProfile();
    } catch (saveErr: any) {
      setError(saveErr?.message || "Failed to update company profile.");
    } finally {
      setSavingOverview(false);
    }
  };

  // Stop camera stream cleanly
  const stopCameraStream = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((t) => t.stop());
      setCameraStream(null);
    }
  };

  // Start Live Camera
  const startCamera = async () => {
    setCameraError(null);
    setCapturedPhoto(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" },
        audio: false,
      });
      setCameraStream(stream);
      setCameraOpen(true);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
      }, 200);
    } catch (err: any) {
      console.error("Camera access error:", err);
      setCameraError("Unable to access camera. Please check camera permissions or upload a photo instead.");
    }
  };

  // Capture frame from camera
  const capturePhotoFrame = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
      setCapturedPhoto(dataUrl);
      setFileDataUrl(dataUrl);
      setFileNameInput(`representative_photo_${Date.now()}.jpg`);
      stopCameraStream();
      setCameraOpen(false);
    }
  };

  // Handle Document File Pick
  const handleDocFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setDocUploadError("File size must not exceed 10MB.");
      return;
    }

    setSelectedFile(file);
    setFileNameInput(file.name);
    setDocUploadError(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      setFileDataUrl(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Submit Document
  const handleSubmitDocument = async () => {
    if (!uploadModalDoc || !fileDataUrl) {
      setDocUploadError("Please select or capture a document/photo file.");
      return;
    }

    try {
      setSubmittingDoc(true);
      setDocUploadError(null);

      await fetchApi("/vendor/documents", {
        method: "POST",
        body: JSON.stringify({
          type: uploadModalDoc.type,
          fileUrl: fileDataUrl,
          fileName: fileNameInput || `${uploadModalDoc.type.toLowerCase()}.pdf`,
          fileSize: selectedFile ? `${(selectedFile.size / (1024 * 1024)).toFixed(1)} MB` : "1.2 MB",
          idType: uploadModalDoc.type === "REPRESENTATIVE_ID_PROOF" ? selectedIdType : undefined,
          idNumber: uploadModalDoc.type === "REPRESENTATIVE_ID_PROOF" ? idNumberInput : undefined,
          notes: notesInput,
        }),
      });

      setSuccess(`Document ${uploadModalDoc.title} uploaded successfully for administrative review.`);
      setUploadModalDoc(null);
      setSelectedFile(null);
      setFileDataUrl("");
      setCapturedPhoto(null);
      setIdNumberInput("");
      setNotesInput("");
      await fetchProfile();
    } catch (submitErr: any) {
      setDocUploadError(submitErr?.message || "Failed to submit document.");
    } finally {
      setSubmittingDoc(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 max-w-7xl mx-auto flex flex-col items-center justify-center min-h-[50vh] gap-3">
        <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-semibold text-slate-500">Loading company profile and verification status...</p>
      </div>
    );
  }

  const vendor = data?.vendor;
  const workforce = data?.workforce || { totalEmployees: 0, crewWorkers: 0, activeEmployees: 0 };
  const verification = data?.verification;
  const docs = verification?.documents || [];

  // Group into 3 clean, dedicated sections
  const companyDocs = docs.filter(
    (d) => d.type === "GST_CERTIFICATE" || d.type === "BUSINESS_PAN" || d.section === "COMPANY"
  );
  const repDocs = docs.filter(
    (d) => d.type === "REPRESENTATIVE_ID_PROOF" || d.type === "REPRESENTATIVE_PHOTO" || d.section === "REPRESENTATIVE"
  );
  const operationalDocs = docs.filter(
    (d) => d.type === "TRANSPORT_PERMIT" || d.type === "TRANSIT_INSURANCE" || d.section === "OPERATIONAL"
  );

  const totalApprovedCount = docs.filter((d) => d.status === "APPROVED").length;
  const isSuspended = vendor?.status === "SUSPENDED";
  const isApproved = vendor?.status === "APPROVED";

  const verificationAccess = verification?.access || (vendor?.status === "APPROVED" && totalApprovedCount === 6 ? "ALLOWED" : "RESTRICTED");
  const isOperationalAllowed = verificationAccess === "ALLOWED" && vendor?.status === "APPROVED" && totalApprovedCount === 6;
  const verificationStatus = verification?.verificationStatus || vendor?.status || "PENDING_REVIEW";

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Notifications */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle size={16} className="shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="p-1 hover:bg-rose-100 rounded-lg">
            <X size={14} />
          </button>
        </div>
      )}

      {success && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="shrink-0" />
            <span>{success}</span>
          </div>
          <button onClick={() => setSuccess(null)} className="p-1 hover:bg-emerald-100 rounded-lg">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Company Verification Access Gate Capsule */}
      <div
        className={`p-5 rounded-3xl border flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-2xs ${
          isOperationalAllowed
            ? "bg-emerald-50/70 border-emerald-200 text-emerald-950"
            : verificationStatus === "SUSPENDED"
            ? "bg-rose-50 border-rose-200 text-rose-950"
            : "bg-amber-50/80 border-amber-200 text-amber-950"
        }`}
      >
        <div className="flex items-start gap-3.5">
          <div
            className={`p-2.5 rounded-2xl shrink-0 ${
              isOperationalAllowed
                ? "bg-emerald-100 text-emerald-700"
                : verificationStatus === "SUSPENDED"
                ? "bg-rose-100 text-rose-700"
                : "bg-amber-100 text-amber-700"
            }`}
          >
            {isOperationalAllowed ? <ShieldCheck size={22} /> : <Lock size={22} />}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-bold text-sm">
                Company Operational Access:{" "}
                <span className={isOperationalAllowed ? "text-emerald-700 font-extrabold" : "text-amber-800 font-extrabold"}>
                  {isOperationalAllowed ? "ACTIVE" : "RESTRICTED"}
                </span>
              </h3>
              <span
                className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                  isOperationalAllowed
                    ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                    : "bg-amber-100 text-amber-900 border-amber-300"
                }`}
              >
                Status: {verificationStatus.replace("_", " ")}
              </span>
            </div>
            <p className="text-xs mt-1 text-slate-600">
              {isOperationalAllowed
                ? "All 6 required compliance documents are verified and your carrier account is approved. Operational modules, dispatch, live moves, and marketplace listings are fully enabled."
                : `Operational features require all 6 compliance documents to be approved by platform administration (${totalApprovedCount}/6 currently verified).`}
            </p>
            {!isOperationalAllowed && verification?.blockingItem && (
              <p className="text-xs font-semibold text-rose-700 mt-1">
                Blocking Requirement: {verification.blockingItem}
              </p>
            )}
            {!isOperationalAllowed && (verification?.blockingReason || verification?.adminFeedback) && (
              <p className="text-xs italic text-slate-600 mt-0.5">
                Admin Note: "{verification.blockingReason || verification.adminFeedback}"
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0 self-end md:self-center">
          <div className="text-right">
            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Compliance Checklist</span>
            <span className="text-xs font-bold text-slate-800">
              {totalApprovedCount} of 6 Documents Approved
            </span>
          </div>
        </div>
      </div>

      {/* Hero / Overview Header */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white border border-slate-200/80 shadow-xs relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-5">
            {/* Logo display & change */}
            <div className="relative group shrink-0">
              <div className="w-20 h-20 rounded-2xl border-2 border-slate-200/80 bg-slate-50 flex items-center justify-center overflow-hidden shadow-2xs">
                {logoPreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={logoPreview} alt="Company Logo" className="w-full h-full object-cover" />
                ) : (
                  <Building2 size={32} className="text-slate-400" />
                )}
              </div>
              {!isSuspended && (
                <button
                  type="button"
                  onClick={() => logoInputRef.current?.click()}
                  title="Upload / Change Company Logo"
                  className="absolute -bottom-1.5 -right-1.5 p-1.5 rounded-full bg-blue-600 text-white shadow-md hover:bg-blue-700 transition cursor-pointer"
                >
                  <Camera size={13} />
                </button>
              )}
              <input
                ref={logoInputRef}
                type="file"
                accept="image/png, image/jpeg, image/webp"
                className="hidden"
                onChange={handleLogoSelect}
              />
            </div>

            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                  {vendor?.businessName || "Company Profile"}
                </h1>
                <StatusBadge status={vendor?.status || "PENDING_REVIEW"} />
                {isOperationalAllowed ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    <ShieldCheck size={11} /> Verified Carrier
                  </span>
                ) : (
                  <span
                    className={`inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                      isSuspended || verificationStatus === "SUSPENDED"
                        ? "text-rose-700 bg-rose-50 border-rose-200"
                        : verificationStatus === "CHANGES_REQUESTED"
                        ? "text-amber-800 bg-amber-50 border-amber-300"
                        : verificationStatus === "REJECTED"
                        ? "text-rose-800 bg-rose-50 border-rose-300"
                        : "text-blue-700 bg-blue-50 border-blue-200"
                    }`}
                  >
                    <Lock size={10} />
                    {verificationStatus === "CHANGES_REQUESTED"
                      ? "Action Required (Changes Requested)"
                      : isSuspended || verificationStatus === "SUSPENDED"
                      ? "Account Suspended"
                      : verificationStatus === "REJECTED"
                      ? "Verification Rejected"
                      : `Verification In Progress (${totalApprovedCount}/6 Verified)`}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-4 text-xs text-slate-500 mt-2 flex-wrap">
                <span className="flex items-center gap-1">
                  <Phone size={13} className="text-slate-400" />
                  {vendor?.contactPhone}
                </span>
                {vendor?.contactEmail && (
                  <span className="flex items-center gap-1">
                    <Mail size={13} className="text-slate-400" />
                    {vendor?.contactEmail}
                  </span>
                )}
                <span className="text-slate-400">•</span>
                <span className="text-slate-500">
                  Compliance Checklist: <strong className="text-slate-800">{totalApprovedCount} of 6 Documents Approved</strong>
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {!editingOverview && data?.canEdit && !isSuspended && (
              <button
                onClick={() => setEditingOverview(true)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200/80 transition cursor-pointer"
              >
                <Edit3 size={14} />
                <span>Edit Profile</span>
              </button>
            )}
            <button
              onClick={() => fetchProfile()}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition cursor-pointer"
            >
              <RotateCcw size={13} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Status notice card if not operationally allowed */}
        {!isOperationalAllowed && (
          <div
            className={`mt-6 p-4 rounded-2xl border flex items-start gap-3.5 text-xs ${
              isSuspended || verificationStatus === "SUSPENDED"
                ? "bg-rose-50 border-rose-200 text-rose-900"
                : verificationStatus === "CHANGES_REQUESTED"
                ? "bg-amber-50 border-amber-200 text-amber-900"
                : "bg-blue-50 border-blue-200 text-blue-900"
            }`}
          >
            {isSuspended || verificationStatus === "SUSPENDED" ? (
              <ShieldAlert size={18} className="text-rose-600 shrink-0 mt-0.5" />
            ) : verificationStatus === "CHANGES_REQUESTED" ? (
              <AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5" />
            ) : (
              <Clock size={18} className="text-blue-600 shrink-0 mt-0.5" />
            )}
            <div className="space-y-1">
              <p className="font-bold">
                {isSuspended || verificationStatus === "SUSPENDED"
                  ? "Carrier Company Account Suspended"
                  : verificationStatus === "CHANGES_REQUESTED"
                  ? "Compliance Revisions Requested"
                  : verificationStatus === "REJECTED"
                  ? "Application Requires Revision"
                  : "Compliance Verification In Progress"}
              </p>
              <p className="text-slate-600 leading-relaxed">
                {verification?.blockingReason ||
                  verification?.adminFeedback ||
                  (isSuspended
                    ? "Your company account has been suspended by administration. Please reach out to platform support."
                    : "All 6 compliance documents must be approved by platform administration to unlock operational modules (quotations, dispatch, live moves, and marketplace catalog). User role permissions do not bypass company verification.")}
              </p>
            </div>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200/80 mt-6 -mb-2 gap-6 text-xs font-semibold">
          <button
            onClick={() => setActiveTab("overview")}
            className={`pb-3 border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === "overview"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Building2 size={14} />
            <span>Company Overview</span>
          </button>
          <button
            onClick={() => setActiveTab("workforce")}
            className={`pb-3 border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === "workforce"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Users size={14} />
            <span>Workforce Metrics</span>
            <span className="px-1.5 py-0.2 rounded-full bg-slate-100 text-[10px] text-slate-600">
              {workforce.totalEmployees}
            </span>
          </button>
          <button
            onClick={() => setActiveTab("verification")}
            className={`pb-3 border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === "verification"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <ShieldCheck size={14} />
            <span>Verification & Compliance</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                totalApprovedCount === 6
                  ? "bg-emerald-100 text-emerald-800"
                  : "bg-amber-100 text-amber-800"
              }`}
            >
              {totalApprovedCount}/6 Verified
            </span>
          </button>
        </div>
      </div>

      {/* Tab 1: Company Overview */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-5">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Building2 size={16} className="text-blue-600" />
                  <span>Company Information</span>
                </h2>
                {isApproved && (
                  <span className="inline-flex items-center gap-1 text-[11px] text-slate-500 bg-slate-50 px-2 py-0.5 rounded-lg border border-slate-200">
                    <Lock size={11} className="text-slate-400" /> Legal Name Locked
                  </span>
                )}
              </div>

              {editingOverview ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Legal Business Entity Name
                    </label>
                    <input
                      type="text"
                      disabled={isApproved}
                      value={businessNameInput}
                      onChange={(e) => setBusinessNameInput(e.target.value)}
                      className={`w-full px-3.5 py-2 rounded-xl text-xs border ${
                        isApproved
                          ? "bg-slate-100 text-slate-500 border-slate-200 cursor-not-allowed"
                          : "bg-white border-slate-300 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                      }`}
                    />
                    {isApproved && (
                      <p className="text-[11px] text-slate-400 mt-1">
                        Legal business entity name cannot be changed directly after verification approval. Submit an administrative inquiry to request changes.
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Contact Phone
                      </label>
                      <input
                        type="text"
                        value={phoneInput}
                        onChange={(e) => setPhoneInput(e.target.value)}
                        className="w-full px-3.5 py-2 rounded-xl text-xs border border-slate-300 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Contact Email
                      </label>
                      <input
                        type="email"
                        value={emailInput}
                        onChange={(e) => setEmailInput(e.target.value)}
                        className="w-full px-3.5 py-2 rounded-xl text-xs border border-slate-300 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                      />
                    </div>
                  </div>

                  {/* Service Areas Tag Editor */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Service Areas (Cities & Regions)
                    </label>
                    <div className="flex gap-2 mb-2">
                      <input
                        type="text"
                        placeholder="Add city (e.g. Mumbai, Pune)..."
                        value={newAreaInput}
                        onChange={(e) => setNewAreaInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && newAreaInput.trim()) {
                            e.preventDefault();
                            if (!serviceAreas.includes(newAreaInput.trim())) {
                              setServiceAreas([...serviceAreas, newAreaInput.trim()]);
                            }
                            setNewAreaInput("");
                          }
                        }}
                        className="flex-1 px-3 py-1.5 rounded-xl text-xs border border-slate-300"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (newAreaInput.trim() && !serviceAreas.includes(newAreaInput.trim())) {
                            setServiceAreas([...serviceAreas, newAreaInput.trim()]);
                            setNewAreaInput("");
                          }
                        }}
                        className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700"
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {serviceAreas.map((area) => (
                        <span
                          key={area}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs bg-slate-100 text-slate-700 border border-slate-200"
                        >
                          <MapPin size={11} className="text-slate-400" />
                          {area}
                          <button
                            type="button"
                            onClick={() => setServiceAreas(serviceAreas.filter((a) => a !== area))}
                            className="text-slate-400 hover:text-rose-600 ml-1"
                          >
                            <X size={12} />
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Services Offered Tag Editor */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Services Offered
                    </label>
                    <div className="flex gap-2 mb-2">
                      <input
                        type="text"
                        placeholder="Add service (e.g. Household Relocation, Vehicle Transit)..."
                        value={newServiceInput}
                        onChange={(e) => setNewServiceInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && newServiceInput.trim()) {
                            e.preventDefault();
                            if (!servicesOffered.includes(newServiceInput.trim())) {
                              setServicesOffered([...servicesOffered, newServiceInput.trim()]);
                            }
                            setNewServiceInput("");
                          }
                        }}
                        className="flex-1 px-3 py-1.5 rounded-xl text-xs border border-slate-300"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (newServiceInput.trim() && !servicesOffered.includes(newServiceInput.trim())) {
                            setServicesOffered([...servicesOffered, newServiceInput.trim()]);
                            setNewServiceInput("");
                          }
                        }}
                        className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700"
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {servicesOffered.map((srv) => (
                        <span
                          key={srv}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs bg-blue-50 text-blue-700 border border-blue-200"
                        >
                          <Layers size={11} className="text-blue-500" />
                          {srv}
                          <button
                            type="button"
                            onClick={() => setServicesOffered(servicesOffered.filter((s) => s !== srv))}
                            className="text-blue-400 hover:text-rose-600 ml-1"
                          >
                            <X size={12} />
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingOverview(false);
                        setBusinessNameInput(vendor?.businessName || "");
                        setPhoneInput(vendor?.contactPhone || "");
                        setEmailInput(vendor?.contactEmail || "");
                        setServiceAreas(vendor?.serviceAreas || []);
                        setServicesOffered(vendor?.servicesOffered || []);
                      }}
                      className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={savingOverview}
                      onClick={handleSaveOverview}
                      className="px-5 py-2 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 transition flex items-center gap-1.5"
                    >
                      {savingOverview ? "Saving..." : "Save Changes"}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-4 border-b border-slate-100">
                    <div>
                      <span className="text-slate-400 block mb-0.5">Contact Phone</span>
                      <span className="font-semibold text-slate-800">{vendor?.contactPhone}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block mb-0.5">Contact Email</span>
                      <span className="font-semibold text-slate-800">{vendor?.contactEmail || "Not provided"}</span>
                    </div>
                  </div>

                  <div>
                    <span className="text-slate-400 block mb-2 font-semibold">Service Coverage Areas</span>
                    <div className="flex flex-wrap gap-1.5">
                      {vendor?.serviceAreas && vendor.serviceAreas.length > 0 ? (
                        vendor.serviceAreas.map((area) => (
                          <span
                            key={area}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-medium"
                          >
                            <MapPin size={11} className="text-slate-400" />
                            {area}
                          </span>
                        ))
                      ) : (
                        <span className="text-slate-400 italic">No specific service areas listed.</span>
                      )}
                    </div>
                  </div>

                  <div className="pt-2">
                    <span className="text-slate-400 block mb-2 font-semibold">Relocation Services Offered</span>
                    <div className="flex flex-wrap gap-1.5">
                      {vendor?.servicesOffered && vendor.servicesOffered.length > 0 ? (
                        vendor.servicesOffered.map((srv) => (
                          <span
                            key={srv}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 font-medium border border-blue-100"
                          >
                            <Layers size={11} className="text-blue-500" />
                            {srv}
                          </span>
                        ))
                      ) : (
                        <span className="text-slate-400 italic">Standard relocation services.</span>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Quick Workforce Snapshot Sidebar Card */}
          <div className="space-y-6">
            <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-4">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Users size={16} className="text-blue-600" />
                <span>Workforce At A Glance</span>
              </h2>

              <div className="space-y-3">
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/60 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-slate-500 font-medium">Total Staff</p>
                    <p className="text-lg font-bold text-slate-900 mt-0.5">{workforce.totalEmployees}</p>
                  </div>
                  <Users size={22} className="text-slate-400" />
                </div>

                <div className="p-3.5 rounded-2xl bg-indigo-50/60 border border-indigo-100 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-indigo-700 font-medium">Field Crew & Drivers</p>
                    <p className="text-lg font-bold text-indigo-950 mt-0.5">{workforce.crewWorkers}</p>
                  </div>
                  <HardHat size={22} className="text-indigo-400" />
                </div>

                <div className="p-3.5 rounded-2xl bg-emerald-50/60 border border-emerald-100 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-emerald-700 font-medium">Active Staff</p>
                    <p className="text-lg font-bold text-emerald-950 mt-0.5">{workforce.activeEmployees}</p>
                  </div>
                  <UserCheck size={22} className="text-emerald-400" />
                </div>
              </div>

              <div className="pt-2 text-[11px] text-slate-400 leading-relaxed">
                Workforce numbers are calculated strictly from registered staff accounts in the company directory.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Workforce Metrics */}
      {activeTab === "workforce" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Registered</p>
                <div className="w-10 h-10 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-600">
                  <Users size={20} />
                </div>
              </div>
              <p className="text-3xl font-extrabold text-slate-900 mt-3">{workforce.totalEmployees}</p>
              <p className="text-xs text-slate-500 mt-1">Non-deleted employee and crew records</p>
            </div>

            <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wider">Crew Workers & Drivers</p>
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                  <HardHat size={20} />
                </div>
              </div>
              <p className="text-3xl font-extrabold text-slate-900 mt-3">{workforce.crewWorkers}</p>
              <p className="text-xs text-slate-500 mt-1">Field drivers, loaders, and packers</p>
            </div>

            <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">Active Status</p>
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                  <UserCheck size={20} />
                </div>
              </div>
              <p className="text-3xl font-extrabold text-slate-900 mt-3">{workforce.activeEmployees}</p>
              <p className="text-xs text-slate-500 mt-1">Active staff authorized to take duty shifts</p>
            </div>
          </div>

          <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 mb-2">Workforce Governance & Dispatch Readiness</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Once company verification is approved, your registered crew and staff can be dispatched to customer booking moves and assigned live tracking milestones. Employee onboarding and role assignment are managed under the Employees and Roles modules.
            </p>
          </div>
        </div>
      )}

      {/* Tab 3: Verification & KYC Documents */}
      {activeTab === "verification" && (
        <div className="space-y-8">
          {/* 1. Company Verification (2 Core Documents) */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Building2 size={18} className="text-blue-600" />
                  <span>Company Verification</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Core business identity documents required for company approval.
                </p>
              </div>
              <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                2 Core Documents Required
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {companyDocs.map((doc) => (
                <div
                  key={doc.type}
                  className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:border-slate-300 transition flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-bold text-slate-900">{doc.title}</p>
                          <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                            Required
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">{doc.description}</p>
                      </div>
                      <StatusBadge status={doc.status} />
                    </div>

                    {doc.feedback && (
                      <div className="p-2.5 rounded-xl bg-amber-50/80 border border-amber-200 text-[11px] text-amber-900">
                        <strong>Admin Notes:</strong> {doc.feedback}
                      </div>
                    )}

                    {doc.fileName && (
                      <div className="flex items-center gap-2 text-[11px] text-slate-600 pt-1">
                        <FileText size={13} className="text-slate-400" />
                        <span className="truncate">{doc.fileName}</span>
                        {doc.fileSize && <span className="text-slate-400">({doc.fileSize})</span>}
                      </div>
                    )}
                  </div>

                  <div className="pt-4 mt-3 border-t border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {doc.fileUrl && (
                        <button
                          type="button"
                          onClick={() => setViewingDoc(doc)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200/80 transition cursor-pointer"
                        >
                          <Eye size={13} />
                          <span>View</span>
                        </button>
                      )}
                    </div>

                    {data?.canUploadDocs && !isSuspended && (
                      <button
                        type="button"
                        onClick={() => {
                          setUploadModalDoc(doc);
                          setSelectedFile(null);
                          setFileDataUrl("");
                          setDocUploadError(null);
                        }}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 transition cursor-pointer"
                      >
                        <Upload size={13} />
                        <span>{doc.status === "NOT_SUBMITTED" ? "Upload File" : "Replace File"}</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 2. Owner / Authorized Representative Verification (2 Core Documents) */}
          <div className="space-y-4 pt-4 border-t border-slate-200/80">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <UserCheck size={18} className="text-indigo-600" />
                  <span>Owner / Authorized Representative Verification</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Government-issued identity proof and representative photo / camera capture.
                </p>
              </div>
              <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                2 Required Items
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {repDocs.map((doc) => (
                <div
                  key={doc.type}
                  className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:border-slate-300 transition flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-bold text-slate-900">{doc.title}</p>
                          <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                            Required
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">{doc.description}</p>
                      </div>
                      <StatusBadge status={doc.status} />
                    </div>

                    {doc.maskedIdNumber && (
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-[11px] font-mono font-semibold">
                        <span>{doc.idType || "ID"}:</span>
                        <span>{doc.maskedIdNumber}</span>
                      </div>
                    )}

                    {doc.feedback && (
                      <div className="p-2.5 rounded-xl bg-amber-50/80 border border-amber-200 text-[11px] text-amber-900">
                        <strong>Admin Notes:</strong> {doc.feedback}
                      </div>
                    )}

                    {doc.fileName && (
                      <div className="flex items-center gap-2 text-[11px] text-slate-600 pt-1">
                        <FileText size={13} className="text-slate-400" />
                        <span className="truncate">{doc.fileName}</span>
                      </div>
                    )}
                  </div>

                  <div className="pt-4 mt-3 border-t border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {doc.fileUrl && (
                        <button
                          type="button"
                          onClick={() => setViewingDoc(doc)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200/80 transition cursor-pointer"
                        >
                          <Eye size={13} />
                          <span>View</span>
                        </button>
                      )}
                    </div>

                    {data?.canUploadDocs && !isSuspended && (
                      <button
                        type="button"
                        onClick={() => {
                          setUploadModalDoc(doc);
                          setSelectedFile(null);
                          setFileDataUrl("");
                          setDocUploadError(null);
                        }}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition cursor-pointer"
                      >
                        {doc.type === "REPRESENTATIVE_PHOTO" ? (
                          <>
                            <Camera size={13} />
                            <span>Representative Photo / Camera Capture</span>
                          </>
                        ) : (
                          <>
                            <Upload size={13} />
                            <span>{doc.status === "NOT_SUBMITTED" ? "Upload Proof" : "Replace Proof"}</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 3. Operational Logistics Compliance (Mandatory for Operational Permissions) */}
          <div className="space-y-4 pt-4 border-t border-slate-200/80">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <ShieldCheck size={18} className="text-emerald-600" />
                  <span>Operational Logistics Compliance</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Commercial transport permits and goods-in-transit insurance (mandatory for operational permissions and dispatches).
                </p>
              </div>
              <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                2 Operational Documents Required
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {operationalDocs.map((doc) => (
                <div
                  key={doc.type}
                  className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:border-slate-300 transition flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-bold text-slate-900">{doc.title}</p>
                          <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                            Required
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">{doc.description}</p>
                      </div>
                      <StatusBadge status={doc.status} />
                    </div>

                    {doc.feedback && (
                      <div className="p-2.5 rounded-xl bg-amber-50/80 border border-amber-200 text-[11px] text-amber-900">
                        <strong>Admin Notes:</strong> {doc.feedback}
                      </div>
                    )}

                    {doc.fileName && (
                      <div className="flex items-center gap-2 text-[11px] text-slate-600 pt-1">
                        <FileText size={13} className="text-slate-400" />
                        <span className="truncate">{doc.fileName}</span>
                        {doc.fileSize && <span className="text-slate-400">({doc.fileSize})</span>}
                      </div>
                    )}
                  </div>

                  <div className="pt-4 mt-3 border-t border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {doc.fileUrl && (
                        <button
                          type="button"
                          onClick={() => setViewingDoc(doc)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200/80 transition cursor-pointer"
                        >
                          <Eye size={13} />
                          <span>View</span>
                        </button>
                      )}
                    </div>

                    {data?.canUploadDocs && !isSuspended && (
                      <button
                        type="button"
                        onClick={() => {
                          setUploadModalDoc(doc);
                          setSelectedFile(null);
                          setFileDataUrl("");
                          setDocUploadError(null);
                        }}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition cursor-pointer"
                      >
                        <Upload size={13} />
                        <span>{doc.status === "NOT_SUBMITTED" ? "Upload File" : "Replace File"}</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Document Upload Modal */}
      {uploadModalDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-fadeIn">
          <div className="w-full max-w-lg bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden space-y-4 p-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Upload {uploadModalDoc.title}</h3>
                <p className="text-[11px] text-slate-500 mt-0.5">{uploadModalDoc.description}</p>
              </div>
              <button
                type="button"
                onClick={() => setUploadModalDoc(null)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X size={16} />
              </button>
            </div>

            {docUploadError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs">
                {docUploadError}
              </div>
            )}

            {/* Representative ID Specific Inputs */}
            {uploadModalDoc.type === "REPRESENTATIVE_ID_PROOF" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">ID Type</label>
                  <select
                    value={selectedIdType}
                    onChange={(e) => setSelectedIdType(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-xs border border-slate-300"
                  >
                    <option value="Aadhaar">Aadhaar Card</option>
                    <option value="Passport">Passport</option>
                    <option value="Driving Licence">Driving Licence</option>
                    <option value="Voter ID">Voter ID</option>
                    <option value="Other">Other Government ID</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">ID Number</label>
                  <input
                    type="text"
                    placeholder="Enter ID number"
                    value={idNumberInput}
                    onChange={(e) => setIdNumberInput(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-xs border border-slate-300"
                  />
                  <p className="text-[10px] text-slate-400 mt-0.5">Will be automatically masked for privacy.</p>
                </div>
              </div>
            )}

            {/* Representative Photo: Option to capture with Camera or upload */}
            {uploadModalDoc.type === "REPRESENTATIVE_PHOTO" ? (
              <div className="space-y-3">
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={startCamera}
                    className="flex-1 py-3 px-4 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-semibold hover:bg-indigo-100 transition flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Camera size={16} />
                    <span>Capture with Camera</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => docFileInputRef.current?.click()}
                    className="flex-1 py-3 px-4 rounded-2xl bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-100 transition flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Upload size={16} />
                    <span>Upload Photo File</span>
                  </button>
                </div>

                <input
                  ref={docFileInputRef}
                  type="file"
                  accept="image/png, image/jpeg, image/webp"
                  className="hidden"
                  onChange={handleDocFileSelect}
                />

                {fileDataUrl && (
                  <div className="p-3 rounded-2xl border border-slate-200 bg-slate-50 flex items-center gap-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={fileDataUrl} alt="Preview" className="w-16 h-16 rounded-xl object-cover border" />
                    <div>
                      <p className="text-xs font-bold text-slate-800">{fileNameInput || "Photo captured"}</p>
                      <p className="text-[10px] text-emerald-600 font-semibold mt-0.5 flex items-center gap-1">
                        <Check size={11} /> Ready to submit
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* Standard File Upload Area */
              <div>
                <input
                  ref={docFileInputRef}
                  type="file"
                  accept=".pdf, image/png, image/jpeg"
                  className="hidden"
                  onChange={handleDocFileSelect}
                />
                <div
                  onClick={() => docFileInputRef.current?.click()}
                  className="p-6 rounded-2xl border-2 border-dashed border-slate-300 hover:border-blue-500 hover:bg-blue-50/30 transition text-center cursor-pointer space-y-2"
                >
                  <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 mx-auto flex items-center justify-center">
                    <Upload size={18} />
                  </div>
                  <p className="text-xs font-semibold text-slate-800">
                    {fileNameInput ? fileNameInput : "Click or drag document file here"}
                  </p>
                  <p className="text-[11px] text-slate-400">PDF, PNG, JPEG up to 10MB</p>
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Optional Notes</label>
              <textarea
                rows={2}
                placeholder="Any special remarks or certificate details..."
                value={notesInput}
                onChange={(e) => setNotesInput(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-xs border border-slate-300"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setUploadModalDoc(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submittingDoc || !fileDataUrl}
                onClick={handleSubmitDocument}
                className="px-5 py-2 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 transition disabled:opacity-50 flex items-center gap-1.5"
              >
                {submittingDoc ? "Submitting..." : "Submit for Verification"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Live Camera Modal */}
      {cameraOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md bg-slate-900 rounded-3xl overflow-hidden shadow-2xl p-5 space-y-4 border border-slate-800">
            <div className="flex items-center justify-between text-white pb-2 border-b border-slate-800">
              <h4 className="text-sm font-bold flex items-center gap-2">
                <Camera size={16} className="text-indigo-400" />
                <span>Representative Photo Capture</span>
              </h4>
              <button
                type="button"
                onClick={() => {
                  stopCameraStream();
                  setCameraOpen(false);
                }}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>

            {cameraError && (
              <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-800 text-rose-200 text-xs">
                {cameraError}
              </div>
            )}

            <div className="relative rounded-2xl overflow-hidden bg-black aspect-4/3 flex items-center justify-center">
              <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
              <canvas ref={canvasRef} className="hidden" />
            </div>

            <div className="flex justify-center pt-2">
              <button
                type="button"
                onClick={capturePhotoFrame}
                className="px-6 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg transition flex items-center gap-2 cursor-pointer"
              >
                <Camera size={16} />
                <span>Snap Photo</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Document Viewer Modal */}
      {viewingDoc && (
        <DocumentViewerModal
          isOpen={Boolean(viewingDoc)}
          onClose={() => setViewingDoc(null)}
          title={viewingDoc.title}
          docType={viewingDoc.type}
          fileUrl={viewingDoc.fileUrl || `/api/v1/vendor/documents/${viewingDoc.type}/view`}
          fileName={viewingDoc.fileName || undefined}
          fileSize={viewingDoc.fileSize || undefined}
          status={viewingDoc.status}
          vendorName={vendor?.businessName}
          feedback={viewingDoc.feedback || undefined}
          idType={viewingDoc.idType || undefined}
          maskedIdNumber={viewingDoc.maskedIdNumber || undefined}
          isAdmin={false}
        />
      )}
    </div>
  );
}
