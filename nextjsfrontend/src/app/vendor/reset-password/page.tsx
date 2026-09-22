"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Lock, CheckCircle2, AlertCircle, RefreshCw, KeyRound, ArrowRight, ShieldCheck } from "lucide-react";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [username, setUsername] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setError("No reset token provided. Please use the reset link sent to your WhatsApp, SMS, or Email.");
    }
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      setError("Missing reset token.");
      return;
    }

    if (newPassword.length < 6) {
      setError("New password must be at least 6 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match. Please ensure both passwords match.");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const res = await fetch("http://localhost:5000/api/v1/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error?.message || "Failed to reset password. Link may have expired.");
      }

      setSuccess(true);
      if (data.username) setUsername(data.username);
    } catch (err: any) {
      setError(err.message || "Failed to reset password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl border border-slate-200 shadow-xl p-8 space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="h-14 w-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto shadow-xs border border-blue-100">
            <KeyRound size={28} />
          </div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight">Set New Password</h1>
          <p className="text-xs text-slate-500">
            Carrier Employee & Logistics Staff Account Security
          </p>
        </div>

        {error && (
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2.5">
            <AlertCircle size={16} className="shrink-0 mt-0.5 text-rose-600" />
            <span className="font-medium leading-relaxed">{error}</span>
          </div>
        )}

        {success ? (
          <div className="space-y-5 text-center py-4">
            <div className="h-16 w-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-200">
              <CheckCircle2 size={32} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Password Changed Successfully!</h2>
              <p className="text-xs text-slate-500 mt-1">
                Your new credentials are now active. You can immediately log into the Carrier Portal.
              </p>
              {username && (
                <p className="mt-2 text-xs font-mono font-semibold text-blue-600 bg-blue-50 py-1.5 px-3 rounded-lg border border-blue-100 inline-block">
                  Username: {username}
                </p>
              )}
            </div>

            <Link
              href="/vendor/login"
              className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition cursor-pointer"
            >
              <span>Go to Vendor Login</span>
              <ArrowRight size={14} />
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Lock size={12} className="text-slate-400" />
                <span>New Password</span>
              </label>
              <input
                type="password"
                required
                minLength={6}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter at least 6 characters"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Lock size={12} className="text-slate-400" />
                <span>Confirm New Password</span>
              </label>
              <input
                type="password"
                required
                minLength={6}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm password"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading || !token}
                className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-blue-500/20 transition cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    <span>Updating Password...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck size={14} />
                    <span>Set & Save Password</span>
                  </>
                )}
              </button>
            </div>

            <div className="text-center pt-2">
              <Link
                href="/vendor/login"
                className="text-xs text-slate-500 hover:text-blue-600 transition"
              >
                Back to Login
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default function VendorResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
          <RefreshCw size={24} className="animate-spin text-blue-600" />
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
