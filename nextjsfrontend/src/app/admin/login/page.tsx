"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { fetchApi } from "@/lib/api";
import {
  ShieldCheck,
  Phone,
  KeyRound,
  AlertCircle,
  ArrowRight,
  Loader2,
  CheckCircle2,
  Truck,
  MapPin,
  Sparkles,
} from "lucide-react";

export default function AdminLoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [phone, setPhone] = useState("+919876543210");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  const handleInstantAccess = async () => {
    setLoading(true);
    setError("");
    setInfo("");
    try {
      const data = await fetchApi<{ token: string; user: any }>("/auth/otp/verify", {
        method: "POST",
        body: JSON.stringify({ phone: "+919876543210", otp: "123456", role: "admin" }),
      });

      if (!data.token) {
        throw new Error("No token returned from server");
      }
      localStorage.setItem("auth_token", data.token);
      localStorage.setItem("auth_user", JSON.stringify(data.user));
      router.push("/admin");
    } catch (err: any) {
      setError(err.message || "Backend unreachable. Ensure backend server is running.");
    } finally {
      setLoading(false);
    }
  };

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim()) {
      setError("Please enter your registered admin phone number.");
      return;
    }

    setLoading(true);
    setError("");
    setInfo("");

    try {
      const res = await fetchApi<{ success: boolean; message: string }>("/auth/otp/request", {
        method: "POST",
        body: JSON.stringify({ phone }),
      });
      setInfo(res.message || "OTP sent successfully. Enter verification code 123456.");
      setStep("otp");
      setOtp("123456");
    } catch (err: any) {
      setError(err.message || "Failed to request OTP. Check backend server connection.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp.trim()) {
      setError("Please enter the 6-digit verification code.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const data = await fetchApi<{ token: string; user: any }>("/auth/otp/verify", {
        method: "POST",
        body: JSON.stringify({ phone, otp, role: "admin" }),
      });

      if (!data.token) {
        throw new Error("Verification failed: No authentication token received.");
      }

      if (data.user.role !== "admin") {
        throw new Error("Access Denied: This phone number is not registered with administrator privileges.");
      }

      localStorage.setItem("auth_token", data.token);
      localStorage.setItem("auth_user", JSON.stringify(data.user));
      router.push("/admin");
    } catch (err: any) {
      setError(err.message || "Authentication failed. Please verify code and try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#EEF2F6] flex items-center justify-center p-4 sm:p-8 selection:bg-[#2563EB] selection:text-white font-sans text-[#1E293B]">
      <div className="max-w-4xl w-full grid grid-cols-1 lg:grid-cols-12 bg-[#EEF2F6] rounded-3xl shadow-neu-flat border border-white/80 overflow-hidden">
        {/* Left Narrative Panel */}
        <div className="lg:col-span-5 p-8 sm:p-10 bg-[#EEF2F6] border-b lg:border-b-0 lg:border-r border-[#D9E2EC]/70 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-[#2563EB] to-[#0EA5E9] flex items-center justify-center shadow-neu-raised-sm">
                <span className="text-white font-extrabold text-sm tracking-wide">PM</span>
              </div>
              <div>
                <h2 className="text-sm font-bold text-[#1E293B] leading-none">Package Mover</h2>
                <p className="text-[11px] text-[#64748B] font-medium leading-none mt-1">Admin Operations</p>
              </div>
            </div>

            <div className="mt-8 space-y-3">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-50 shadow-neu-raised-sm border border-teal-200/80 text-[11px] text-teal-800 font-semibold">
                <span className="h-1.5 w-1.5 rounded-full bg-[#14B8A6] animate-pulse" />
                <span>Mission Critical Console</span>
              </div>
              <h1 className="text-2xl font-extrabold text-[#1E293B] tracking-tight leading-snug">
                Logistics operations & marketplace supervision.
              </h1>
              <p className="text-xs text-[#64748B] leading-relaxed">
                Supervise carrier verification, monitor real-time bookings across active cities, manage service packages, and enforce administrative permissions.
              </p>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-[#D9E2EC]/70 space-y-2.5">
            <div className="flex items-center gap-2.5 text-xs text-[#64748B]">
              <div className="h-6 w-6 rounded-lg bg-[#EEF2F6] shadow-neu-inset-sm flex items-center justify-center text-[#2563EB] shrink-0">
                <Truck size={13} />
              </div>
              <span>Multi-City Verified Vendor Fleet</span>
            </div>
            <div className="flex items-center gap-2.5 text-xs text-[#64748B]">
              <div className="h-6 w-6 rounded-lg bg-[#EEF2F6] shadow-neu-inset-sm flex items-center justify-center text-[#0EA5E9] shrink-0">
                <MapPin size={13} />
              </div>
              <span>Standardized Geographic Coverage Zones</span>
            </div>
            <div className="flex items-center gap-2.5 text-xs text-[#64748B]">
              <div className="h-6 w-6 rounded-lg bg-[#EEF2F6] shadow-neu-inset-sm flex items-center justify-center text-[#14B8A6] shrink-0">
                <ShieldCheck size={13} />
              </div>
              <span>Role-Based Access Control & Atlas Live</span>
            </div>
          </div>
        </div>

        {/* Right Form Panel */}
        <div className="lg:col-span-7 p-8 sm:p-12 flex flex-col justify-center">
          <div className="max-w-md w-full mx-auto space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-[#1E293B] tracking-tight">Admin Sign In</h2>
              <p className="text-xs text-[#64748B] mt-1">
                Enter registered credentials to access the operations console.
              </p>
            </div>

            {error && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-2.5 text-xs text-rose-700 shadow-neu-raised-sm">
                <AlertCircle size={16} className="shrink-0 mt-0.5 text-rose-600" />
                <span>{error}</span>
              </div>
            )}

            {info && (
              <div className="p-3.5 rounded-xl bg-teal-50 border border-teal-200 flex items-start gap-2.5 text-xs text-teal-800 shadow-neu-raised-sm">
                <CheckCircle2 size={16} className="shrink-0 mt-0.5 text-[#14B8A6]" />
                <span>{info}</span>
              </div>
            )}

            {step === "phone" ? (
              <form onSubmit={handleRequestOtp} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#1E293B]">
                    Registered Administrator Phone
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#64748B]">
                      <Phone size={15} />
                    </div>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+91 98765 43210"
                      required
                      className="w-full rounded-xl bg-[#EEF2F6] shadow-neu-inset pl-10 pr-3 py-2.5 text-xs text-[#1E293B] placeholder:text-[#94A3B8] outline-none border border-transparent focus:border-[#2563EB]/50 transition"
                    />
                  </div>
                  <p className="text-[11px] text-[#64748B]">
                    Provisioned administrator account: <code className="text-[#2563EB] font-mono font-semibold">+919876543210</code>
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="neu-btn-primary w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-white font-bold text-xs cursor-pointer disabled:opacity-60"
                >
                  {loading ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      <span>Dispatching Code...</span>
                    </>
                  ) : (
                    <>
                      <span>Continue with Verification</span>
                      <ArrowRight size={14} />
                    </>
                  )}
                </button>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleInstantAccess}
                    disabled={loading}
                    className="neu-btn w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-[#2563EB] font-bold text-xs cursor-pointer disabled:opacity-60"
                  >
                    <Sparkles size={14} className="text-[#0EA5E9]" />
                    <span>Instant Admin Demo Access</span>
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#1E293B]">
                    Enter 6-Digit Verification Code
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#64748B]">
                      <KeyRound size={15} />
                    </div>
                    <input
                      type="text"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      placeholder="123456"
                      required
                      maxLength={6}
                      className="w-full rounded-xl bg-[#EEF2F6] shadow-neu-inset pl-10 pr-3 py-2.5 text-xs text-[#1E293B] font-mono tracking-widest outline-none border border-transparent focus:border-[#2563EB]/50 transition"
                    />
                  </div>
                  <p className="text-[11px] text-[#64748B]">
                    Development demo OTP: <code className="text-[#2563EB] font-mono font-bold">123456</code>
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="neu-btn-primary w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-white font-bold text-xs cursor-pointer disabled:opacity-60"
                >
                  {loading ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      <span>Verifying Authority...</span>
                    </>
                  ) : (
                    <>
                      <span>Verify & Enter Console</span>
                      <ArrowRight size={14} />
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setStep("phone")}
                  className="w-full text-center text-xs text-[#64748B] hover:text-[#2563EB] transition font-medium"
                >
                  &larr; Back to phone number
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
