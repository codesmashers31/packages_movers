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
  Lock,
  User,
  Eye,
  EyeOff,
  Check,
  ShieldAlert,
} from "lucide-react";

export default function AdminLoginPage() {
  const router = useRouter();

  // Auth Modes: "password" or "otp"
  const [authMode, setAuthMode] = useState<"password" | "otp">("password");

  // Password Login State
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // OTP Login State
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [phone, setPhone] = useState("+919876543210");
  const [otp, setOtp] = useState("");

  // Common UI State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  // Mandatory First-Time Password Change Modal State
  const [showPasswordChangeModal, setShowPasswordChangeModal] = useState(false);
  const [pendingToken, setPendingToken] = useState("");
  const [pendingUser, setPendingUser] = useState<any>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  const [changePasswordError, setChangePasswordError] = useState("");

  // 1. Instant Super Admin Access (OTP based)
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

  // 2. Password Login
  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim() || !password.trim()) {
      setError("Please enter your Username, Corporate Email, or Phone, along with your Password.");
      return;
    }

    setLoading(true);
    setError("");
    setInfo("");

    try {
      const data = await fetchApi<{ token: string; user: any; mustChangePassword?: boolean }>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ identifier: identifier.trim(), password }),
      });

      if (!data.token) {
        throw new Error("Login failed: No authentication token received.");
      }

      if (data.user.role !== "admin") {
        throw new Error("Access Denied: This account is not registered as platform administrative staff.");
      }

      // Check if employee must set their own password on first login
      if (data.mustChangePassword) {
        setPendingToken(data.token);
        setPendingUser(data.user);
        setShowPasswordChangeModal(true);
        setInfo("First-time sign in detected. Please establish your private password.");
        return;
      }

      // Standard Login
      localStorage.setItem("auth_token", data.token);
      localStorage.setItem("auth_user", JSON.stringify(data.user));
      router.push("/admin");
    } catch (err: any) {
      setError(err.message || "Invalid credentials. Please verify your username and password.");
    } finally {
      setLoading(false);
    }
  };

  // 3. First-Time Password Change Submit
  const handleSaveNewPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setChangePasswordError("");

    if (!newPassword || newPassword.length < 6) {
      setChangePasswordError("Password must be at least 6 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setChangePasswordError("Passwords do not match. Please re-enter.");
      return;
    }

    setChangingPassword(true);

    try {
      const res = await fetchApi<{ token: string; message: string }>("/auth/change-password", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${pendingToken}`,
        },
        body: JSON.stringify({
          newPassword,
        }),
      });

      const activeToken = res.token || pendingToken;
      const updatedUser = { ...pendingUser, mustChangePassword: false };

      localStorage.setItem("auth_token", activeToken);
      localStorage.setItem("auth_user", JSON.stringify(updatedUser));

      setShowPasswordChangeModal(false);
      router.push("/admin");
    } catch (err: any) {
      setChangePasswordError(err.message || "Failed to update password. Please try again.");
    } finally {
      setChangingPassword(false);
    }
  };

  // 4. Request OTP for Root Admin / Phone Login
  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim()) {
      setError("Please enter your registered administrator phone number.");
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

  // 5. Verify OTP
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
        throw new Error("Access Denied: This account is not registered with administrator privileges.");
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
                <p className="text-[11px] text-[#64748B] font-medium leading-none mt-1">Platform Operations</p>
              </div>
            </div>

            <div className="mt-8 space-y-3">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-50 shadow-neu-raised-sm border border-teal-200/80 text-[11px] text-teal-800 font-semibold">
                <span className="h-1.5 w-1.5 rounded-full bg-[#14B8A6] animate-pulse" />
                <span>Enterprise RBAC Console</span>
              </div>
              <h1 className="text-2xl font-extrabold text-[#1E293B] tracking-tight leading-snug">
                Administrative Governance & Operations.
              </h1>
              <p className="text-xs text-[#64748B] leading-relaxed">
                Supervise moving fulfillment, review carrier onboarding compliance, manage service packages, and govern platform staff with granular role authorizations.
              </p>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-[#D9E2EC]/70 space-y-2.5">
            <div className="flex items-center gap-2.5 text-xs text-[#64748B]">
              <div className="h-6 w-6 rounded-lg bg-[#EEF2F6] shadow-neu-inset-sm flex items-center justify-center text-[#2563EB] shrink-0">
                <Truck size={13} />
              </div>
              <span>Multi-City Carrier Fulfillment</span>
            </div>
            <div className="flex items-center gap-2.5 text-xs text-[#64748B]">
              <div className="h-6 w-6 rounded-lg bg-[#EEF2F6] shadow-neu-inset-sm flex items-center justify-center text-[#0EA5E9] shrink-0">
                <MapPin size={13} />
              </div>
              <span>Standardized Regional Service Zones</span>
            </div>
            <div className="flex items-center gap-2.5 text-xs text-[#64748B]">
              <div className="h-6 w-6 rounded-lg bg-[#EEF2F6] shadow-neu-inset-sm flex items-center justify-center text-[#14B8A6] shrink-0">
                <ShieldCheck size={13} />
              </div>
              <span>Granular RBAC • Individual Staff Sign-In</span>
            </div>
          </div>
        </div>

        {/* Right Form Panel */}
        <div className="lg:col-span-7 p-8 sm:p-12 flex flex-col justify-center">
          <div className="max-w-md w-full mx-auto space-y-5">
            <div>
              <h2 className="text-2xl font-bold text-[#1E293B] tracking-tight">Admin Console Sign In</h2>
              <p className="text-xs text-[#64748B] mt-1">
                Enter your administrative credentials to access your permitted workspace.
              </p>
            </div>

            {/* Auth Mode Tabs */}
            <div className="grid grid-cols-2 p-1.5 rounded-2xl bg-[#EEF2F6] shadow-neu-inset-sm border border-white/60 text-xs">
              <button
                type="button"
                onClick={() => {
                  setAuthMode("password");
                  setError("");
                  setInfo("");
                }}
                className={`py-2 px-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  authMode === "password"
                    ? "bg-[#EEF2F6] shadow-neu-raised-sm text-[#2563EB] border border-white/80"
                    : "text-[#64748B] hover:text-[#1E293B]"
                }`}
              >
                <Lock size={13} />
                <span>Staff Password</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthMode("otp");
                  setError("");
                  setInfo("");
                }}
                className={`py-2 px-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  authMode === "otp"
                    ? "bg-[#EEF2F6] shadow-neu-raised-sm text-[#2563EB] border border-white/80"
                    : "text-[#64748B] hover:text-[#1E293B]"
                }`}
              >
                <KeyRound size={13} />
                <span>Quick Access (OTP)</span>
              </button>
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

            {/* TAB 1: Password Login */}
            {authMode === "password" && (
              <form onSubmit={handlePasswordLogin} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#1E293B]">
                    Username, Corporate Email, or Phone
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#64748B]">
                      <User size={15} />
                    </div>
                    <input
                      type="text"
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      placeholder="e.g. priya.sharma or vikram.patel"
                      required
                      className="w-full rounded-xl bg-[#EEF2F6] shadow-neu-inset pl-10 pr-3 py-2.5 text-xs text-[#1E293B] placeholder:text-[#94A3B8] outline-none border border-transparent focus:border-[#2563EB]/50 transition"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#1E293B]">Password</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#64748B]">
                      <Lock size={15} />
                    </div>
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter account password"
                      required
                      className="w-full rounded-xl bg-[#EEF2F6] shadow-neu-inset pl-10 pr-10 py-2.5 text-xs text-[#1E293B] placeholder:text-[#94A3B8] outline-none border border-transparent focus:border-[#2563EB]/50 transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#64748B] hover:text-[#1E293B] cursor-pointer"
                    >
                      {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="neu-btn-primary w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-white font-bold text-xs cursor-pointer disabled:opacity-60"
                >
                  {loading ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      <span>Authenticating Staff...</span>
                    </>
                  ) : (
                    <>
                      <span>Sign In with Password</span>
                      <ArrowRight size={14} />
                    </>
                  )}
                </button>

                <div className="p-3 rounded-xl bg-[#EEF2F6] shadow-neu-inset-sm border border-white/60 text-[11px] text-[#64748B] space-y-1">
                  <p className="font-semibold text-[#1E293B]">Test Staff Accounts (Live Atlas DB):</p>
                  <p>• Compliance Officer: <span className="font-mono text-[#2563EB]">priya.sharma</span> / <span className="font-mono text-emerald-700 font-semibold">AdminPass@2026</span></p>
                  <p>• Operations Manager: <span className="font-mono text-[#2563EB]">vikram.patel</span> / <span className="font-mono text-emerald-700 font-semibold">AdminPass@2026</span></p>
                </div>
              </form>
            )}

            {/* TAB 2: OTP Login (Super Admin) */}
            {authMode === "otp" && (
              <>
                {step === "phone" ? (
                  <form onSubmit={handleRequestOtp} className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-[#1E293B]">
                        Super Admin Phone Number
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
                        Root Administrator: <code className="text-[#2563EB] font-mono font-semibold">+919876543210</code>
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
                        <span>Instant Super Admin Access</span>
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
              </>
            )}
          </div>
        </div>
      </div>

      {/* Mandatory First-Time Password Change Modal */}
      {showPasswordChangeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="max-w-md w-full bg-[#EEF2F6] rounded-3xl p-6 sm:p-8 shadow-neu-raised border border-white/90 space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center shadow-neu-raised-sm shrink-0">
                <ShieldAlert size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#1E293B]">Set Your Private Password</h3>
                <p className="text-xs text-[#64748B]">Required security update for new staff accounts</p>
              </div>
            </div>

            <p className="text-xs text-[#64748B] leading-relaxed">
              Hello <strong className="text-[#1E293B]">{pendingUser?.displayName || pendingUser?.username}</strong>! This is your first time logging into the Package Mover Admin Console. For platform security, please choose your private password.
            </p>

            {changePasswordError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start gap-2">
                <AlertCircle size={15} className="shrink-0 mt-0.5" />
                <span>{changePasswordError}</span>
              </div>
            )}

            <form onSubmit={handleSaveNewPassword} className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#1E293B]">New Private Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                  required
                  className="w-full rounded-xl bg-[#EEF2F6] shadow-neu-inset px-3 py-2 text-xs text-[#1E293B] outline-none border border-transparent focus:border-[#2563EB]/50"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#1E293B]">Confirm Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter your new password"
                  required
                  className="w-full rounded-xl bg-[#EEF2F6] shadow-neu-inset px-3 py-2 text-xs text-[#1E293B] outline-none border border-transparent focus:border-[#2563EB]/50"
                />
              </div>

              <button
                type="submit"
                disabled={changingPassword}
                className="neu-btn-primary w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-white font-bold text-xs cursor-pointer disabled:opacity-60 mt-4"
              >
                {changingPassword ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Saving Secure Password...</span>
                  </>
                ) : (
                  <>
                    <Check size={14} />
                    <span>Save Password & Enter Dashboard</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
