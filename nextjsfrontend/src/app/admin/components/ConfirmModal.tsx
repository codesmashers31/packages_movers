"use client";

import { useState } from "react";
import { AlertCircle, X } from "lucide-react";

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  confirmVariant?: "danger" | "primary" | "warning";
  requireReason?: boolean;
  reasonPlaceholder?: string;
  isLoading?: boolean;
  onConfirm: (reason: string) => void;
  onClose: () => void;
}

export default function ConfirmModal({
  isOpen,
  title,
  message,
  confirmLabel = "Confirm",
  confirmVariant = "primary",
  requireReason = false,
  reasonPlaceholder = "Provide a reason or note...",
  isLoading = false,
  onConfirm,
  onClose,
}: ConfirmModalProps) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (requireReason && !reason.trim()) {
      setError("Please provide a reason before continuing.");
      return;
    }
    setError("");
    onConfirm(reason);
  };

  const getVariantStyles = () => {
    switch (confirmVariant) {
      case "danger":
        return "bg-rose-600 hover:bg-rose-700 text-white";
      case "warning":
        return "bg-[#F59E0B] hover:bg-amber-600 text-white";
      default:
        return "bg-[#2563EB] hover:bg-[#1D4ED8] text-white shadow-xs";
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1E293B]/50 backdrop-blur-2xs animate-fadeIn">
      <div className="w-full max-w-md bg-[#EEF2F6] rounded-2xl shadow-neu-flat border border-white/80 overflow-hidden">
        <div className="px-5 py-4 border-b border-[#D9E2EC]/80 flex items-center justify-between">
          <div className="flex items-center gap-2 text-[#1E293B] font-semibold text-sm">
            <AlertCircle size={18} className={confirmVariant === "danger" ? "text-rose-600" : "text-[#2563EB]"} />
            <span>{title}</span>
          </div>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="p-1 text-[#64748B] hover:text-[#1E293B] rounded-md hover:bg-[#F8FAFC] transition cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-5 space-y-3">
          <p className="text-xs text-[#64748B] leading-relaxed">{message}</p>

          {requireReason && (
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-[#1E293B]">
                Reason / Note <span className="text-rose-500">*</span>
              </label>
              <textarea
                value={reason}
                onChange={(e) => {
                  setReason(e.target.value);
                  if (error) setError("");
                }}
                placeholder={reasonPlaceholder}
                rows={3}
                className="w-full rounded-xl bg-[#EEF2F6] shadow-neu-inset px-3 py-2 text-xs outline-none transition border border-transparent focus:border-[#2563EB]/50 text-[#1E293B]"
              />
              {error && <p className="text-xs text-rose-600 font-medium">{error}</p>}
            </div>
          )}
        </div>

        <div className="px-5 py-3 bg-[#EEF2F6] border-t border-[#D9E2EC]/80 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-3 py-1.5 text-xs font-medium text-[#64748B] hover:text-[#1E293B] hover:bg-[#E2E8F0]/50 rounded-md transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isLoading}
            className={`px-3 py-1.5 text-xs font-medium rounded-md shadow-xs transition disabled:opacity-50 cursor-pointer ${getVariantStyles()}`}
          >
            {isLoading ? "Processing..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
