"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { fetchApi } from "@/lib/api";
import { Building2, Lock, CheckCircle2, AlertCircle, Eye, EyeOff, ArrowRight } from "lucide-react";

function AcceptInvitationContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token") || "";

  const [verifying, setVerifying] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [userInfo, setUserInfo] = useState<{ displayName?: string; phone?: string; email?: string; companyName?: string } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      setVerifying(false);
      setErrorMessage("No invitation token was provided in the link.");
      return;
    }

    fetchApi<{ valid: boolean; user?: any }>(`/auth/invitation/verify?token=${encodeURIComponent(token)}`)
      .then((res) => {
        if (res?.valid) {
          setTokenValid(true);
          setUserInfo(res.user || null);
        } else {
          setTokenValid(false);
          setErrorMessage("This invitation link is invalid or has already expired.");
        }
      })
      .catch((err) => {
        setTokenValid(false);
        setErrorMessage(err?.message || "Invitation link is invalid or has expired.");
      })
      .finally(() => {
        setVerifying(false);
      });
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (password.length < 6) {
      setErrorMessage("Password must be at least 6 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage("Passwords do not match.");
      return;
    }

    try {
      setSubmitting(true);
      await fetchApi("/auth/invitation/accept", {
        method: "POST",
        body: JSON.stringify({ token, password }),
      });
      setSuccess(true);
    } catch (err: any) {
      setErrorMessage(err?.message || "Failed to set up account password.");
    } finally {
      setSubmitting(false);
    }
  };

  if (verifying) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-semibold text-slate-600">Verifying carrier invitation...</p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-slate-200/80 shadow-sm text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
            <CheckCircle2 size={24} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">Account Setup Complete!</h2>
            <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
              Your password has been configured successfully. You can now sign in to the Carrier Console to manage your company profile and compliance documents.
            </p>
          </div>
          <div className="pt-3">
            <Link
              href="/vendor/login"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 transition"
            >
              <span>Sign In to Vendor Console</span>
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!tokenValid) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-slate-200/80 shadow-sm text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
            <AlertCircle size={24} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">Invalid or Expired Link</h2>
            <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
              {errorMessage || "This invitation link is not valid or has expired. Please contact support or your system administrator for an updated link."}
            </p>
          </div>
          <div className="pt-2">
            <Link
              href="/vendor/login"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition"
            >
              <span>Return to Login</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-slate-200/80 shadow-sm space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
            <Building2 size={24} />
          </div>
          <h1 className="text-xl font-bold text-slate-900">Set Up Your Account</h1>
          <p className="text-xs text-slate-500 leading-relaxed">
            Welcome to Package Mover! Set a secure password for{" "}
            <strong>{userInfo?.companyName || userInfo?.displayName || "your company"}</strong> (
            {userInfo?.phone || userInfo?.email}).
          </p>
        </div>

        {errorMessage && (
          <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
            <AlertCircle size={15} className="shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">New Password</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="At least 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 rounded-xl text-xs border border-slate-300 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Confirm Password</label>
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Re-enter password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 rounded-xl text-xs border border-slate-300 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <Lock size={14} />
            <span>{submitting ? "Setting Password..." : "Complete Setup & Sign In"}</span>
          </button>
        </form>

        <div className="text-center pt-2">
          <Link href="/vendor/login" className="text-xs text-slate-500 hover:text-slate-800">
            Already have an account? Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function AcceptInvitationPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
          <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <AcceptInvitationContent />
    </Suspense>
  );
}
