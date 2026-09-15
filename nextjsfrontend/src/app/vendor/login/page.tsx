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
  HardHat,
  Sparkles,
  TrendingUp,
  Lock,
  User,
  Eye,
  EyeOff,
  Check,
} from "lucide-react";

export default function VendorLoginPage() {
  const router = useRouter();

  // Auth Modes: "password" or "otp"
  const [authMode, setAuthMode] = useState<"password" | "otp">("password");

  // Password Login State
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // OTP Login State
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [phone, setPhone] = useState("+919876543215");
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

  // 1. Instant Demo Access (OTP based)
  const handleInstantAccess = async () => {
    setLoading(true);
    setError("");
    setInfo("");
    try {
      const data = await fetchApi<{ token: string; user: any }>("/auth/otp/verify", {
        method: "POST",
        body: JSON.stringify({ phone: "+919876543215", otp: "123456", role: "vendor" }),
      });

      if (!data.token) {
        throw new Error("No token returned from server");
      }
      localStorage.setItem("auth_token", data.token);
      localStorage.setItem("auth_user", JSON.stringify(data.user));
      router.push("/vendor");
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
      setError("Please enter your Username/Email/Phone and Password.");
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

      if (data.user.role !== "vendor" && data.user.role !== "worker") {
        throw new Error("Access Denied: This account is not registered as an authorized vendor carrier.");
      }

      // Check if employee must set their own password on first login
      if (data.mustChangePassword) {
        setPendingToken(data.token);
        setPendingUser(data.user);
        setShowPasswordChangeModal(true);
        setInfo("First-time sign in detected. Please set your personal permanent password.");
        return;
      }

      // Standard Login
      localStorage.setItem("auth_token", data.token);
      localStorage.setItem("auth_user", JSON.stringify(data.user));
      if (data.user?.vendorId) {
        localStorage.setItem("active_vendor_id", String(data.user.vendorId));
      }
      router.push("/vendor");
    } catch (err: any) {
      setError(err.message || "Invalid credentials. Please check your username and password.");
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

    try {
      setChangingPassword(true);
      const res = await fetchApi<{ token: string; user: any; message: string }>("/auth/change-password", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${pendingToken}`,
        },
        body: JSON.stringify({ newPassword }),
      });

      // Save refreshed token and user
      const finalToken = res.token || pendingToken;
      const finalUser = res.user || { ...pendingUser, mustChangePassword: false };

      localStorage.setItem("auth_token", finalToken);
      localStorage.setItem("auth_user", JSON.stringify(finalUser));
      if (finalUser?.vendorId) {
        localStorage.setItem("active_vendor_id", String(finalUser.vendorId));
      }

      setShowPasswordChangeModal(false);
      router.push("/vendor");
    } catch (err: any) {
      setChangePasswordError(err.message || "Failed to update password. Please try again.");
    } finally {
      setChangingPassword(false);
    }
  };

  // 4. Request Phone OTP
  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim()) {
      setError("Please enter your registered vendor phone number.");
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

  // 5. Verify Phone OTP
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp.trim()) {
      setError("Please enter the 6-digit verification code.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const data = await fetchApi<{ token: string; user: any; mustChangePassword?: boolean }>("/auth/otp/verify", {
        method: "POST",
        body: JSON.stringify({ phone, otp, role: "vendor" }),
      });

      if (!data.token) {
        throw new Error("Verification failed: No authentication token received.");
      }

      if (data.user.role !== "vendor" && data.user.role !== "worker") {
        throw new Error("Access Denied: This account is not registered as an authorized vendor carrier.");
      }

      if (data.mustChangePassword) {
        setPendingToken(data.token);
        setPendingUser(data.user);
        setShowPasswordChangeModal(true);
        setInfo("First-time sign in detected. Please set your personal permanent password.");
        return;
      }

      localStorage.setItem("auth_token", data.token);
      localStorage.setItem("auth_user", JSON.stringify(data.user));
      if (data.user?.vendorId) {
        localStorage.setItem("active_vendor_id", String(data.user.vendorId));
      }
      router.push("/vendor");
    } catch (err: any) {
      setError(err.message || "Authentication failed. Please verify code and try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4 sm:p-6 lg:p-8 selection:bg-blue-600 selection:text-white font-sans text-slate-900">
      <div className="max-w-4xl w-full grid grid-cols-1 lg:grid-cols-12 bg-white rounded-3xl shadow-xl shadow-slate-200/60 border border-slate-200/80 overflow-hidden">
        {/* Left Narrative Panel */}
        <div className="lg:col-span-5 p-8 sm:p-10 bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 text-white flex flex-col justify-between relative overflow-hidden">
          {/* Subtle background glow */}
          <div className="absolute -top-24 -left-24 w-72 h-72 rounded-full bg-blue-600/20 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -right-24 w-72 h-72 rounded-full bg-teal-500/20 blur-3xl pointer-events-none" />

          <div className="relative z-10">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/30">
                <Truck className="text-white" size={20} />
              </div>
              <div>
                <h2 className="text-sm font-extrabold text-white tracking-tight">Package Mover</h2>
                <p className="text-[11px] text-blue-200/70 font-medium">Carrier Dispatch Console</p>
              </div>
            </div>

            <div className="mt-10 space-y-3">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[11px] text-emerald-300 font-semibold backdrop-blur-sm">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>Enterprise Partner Network</span>
              </div>
              <h1 className="text-2xl font-extrabold text-white tracking-tight leading-snug">
                Carrier dispatch operations & moving fulfillment.
              </h1>
              <p className="text-xs text-slate-300/80 leading-relaxed">
                Manage logistics fleet, crew assignments, customized service offerings, and real-time move dispatching across active regional corridors.
              </p>
            </div>
          </div>

          <div className="relative z-10 mt-10 pt-6 border-t border-white/10 space-y-3">
            <div className="flex items-center gap-3 text-xs text-slate-300">
              <div className="h-7 w-7 rounded-lg bg-white/10 flex items-center justify-center text-blue-400 shrink-0">
                <Truck size={14} />
              </div>
              <span>Multi-Vehicle Fleet & Dispatch Allocation</span>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-300">
              <div className="h-7 w-7 rounded-lg bg-white/10 flex items-center justify-center text-indigo-400 shrink-0">
                <HardHat size={14} />
              </div>
              <span>Role-Based Access for HR, Estimators & Crew</span>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-300">
              <div className="h-7 w-7 rounded-lg bg-white/10 flex items-center justify-center text-teal-400 shrink-0">
                <TrendingUp size={14} />
              </div>
              <span>Automated WhatsApp Credential Dispatch</span>
            </div>
          </div>
        </div>

        {/* Right Form Panel */}
        <div className="lg:col-span-7 p-8 sm:p-12 bg-white flex flex-col justify-center">
          <div className="max-w-md w-full mx-auto space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Vendor Sign In</h2>
              <p className="text-xs text-slate-500 mt-1">
                Access your dispatch console using employee credentials or phone verification.
              </p>
            </div>

            {/* Mode Switcher Tabs */}
            <div className="flex p-1 bg-slate-100 rounded-xl border border-slate-200/80">
              <button
                type="button"
                onClick={() => {
                  setAuthMode("password");
                  setError("");
                }}
                className={`flex-1 py-2 rounded-lg text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5 ${
                  authMode === "password"
                    ? "bg-white shadow-xs text-blue-600 border border-slate-200/60"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Lock size={13} />
                <span>Password Login</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthMode("otp");
                  setError("");
                }}
                className={`flex-1 py-2 rounded-lg text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5 ${
                  authMode === "otp"
                    ? "bg-white shadow-xs text-blue-600 border border-slate-200/60"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Phone size={13} />
                <span>Phone OTP</span>
              </button>
            </div>

            {error && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-2.5 text-xs text-rose-700">
                <AlertCircle size={16} className="shrink-0 mt-0.5 text-rose-600" />
                <span>{error}</span>
              </div>
            )}

            {info && (
              <div className="p-3.5 rounded-xl bg-teal-50 border border-teal-200 flex items-start gap-2.5 text-xs text-teal-800">
                <CheckCircle2 size={16} className="shrink-0 mt-0.5 text-teal-600" />
                <span>{info}</span>
              </div>
            )}

            {authMode === "password" ? (
              /* Password Login Form */
              <form onSubmit={handlePasswordLogin} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">
                    Username, Company Email, or Phone
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <User size={15} />
                    </div>
                    <input
                      type="text"
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      placeholder="e.g. anita.hr or joel@company.in"
                      required
                      className="w-full rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-600 focus:ring-4 focus:ring-blue-500/10 pl-10 pr-3 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 outline-none transition"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">
                    Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Lock size={15} />
                    </div>
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your account password"
                      required
                      className="w-full rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-600 focus:ring-4 focus:ring-blue-500/10 pl-10 pr-10 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 outline-none transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-700 cursor-pointer"
                    >
                      {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-500">
                    New team members: Use the default password sent to your WhatsApp number.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-white font-semibold text-xs bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-600/20 active:scale-[0.99] transition cursor-pointer disabled:opacity-60"
                >
                  {loading ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      <span>Authenticating...</span>
                    </>
                  ) : (
                    <>
                      <span>Sign In with Password</span>
                      <ArrowRight size={14} />
                    </>
                  )}
                </button>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleInstantAccess}
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-blue-600 font-semibold text-xs bg-blue-50 hover:bg-blue-100/70 border border-blue-200/80 transition cursor-pointer disabled:opacity-60"
                  >
                    <Sparkles size={14} className="text-blue-600" />
                    <span>Instant Vendor Demo Access</span>
                  </button>
                </div>
              </form>
            ) : step === "phone" ? (
              /* OTP Login - Step 1: Phone */
              <form onSubmit={handleRequestOtp} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">
                    Registered Vendor Phone
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Phone size={15} />
                    </div>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+91 98765 43215"
                      required
                      className="w-full rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-600 focus:ring-4 focus:ring-blue-500/10 pl-10 pr-3 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 outline-none transition"
                    />
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Registered demo partner: <code className="text-blue-600 font-mono font-semibold">+919876543215</code>
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-white font-semibold text-xs bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-600/20 active:scale-[0.99] transition cursor-pointer disabled:opacity-60"
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
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-blue-600 font-semibold text-xs bg-blue-50 hover:bg-blue-100/70 border border-blue-200/80 transition cursor-pointer disabled:opacity-60"
                  >
                    <Sparkles size={14} className="text-blue-600" />
                    <span>Instant Vendor Demo Access</span>
                  </button>
                </div>
              </form>
            ) : (
              /* OTP Login - Step 2: Code Verification */
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">
                    Enter 6-Digit Verification Code
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <KeyRound size={15} />
                    </div>
                    <input
                      type="text"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      placeholder="123456"
                      required
                      maxLength={6}
                      className="w-full rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-600 focus:ring-4 focus:ring-blue-500/10 pl-10 pr-3 py-2.5 text-xs text-slate-900 font-mono tracking-widest outline-none transition"
                    />
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Development demo OTP: <code className="text-blue-600 font-mono font-bold">123456</code>
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-white font-semibold text-xs bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-600/20 active:scale-[0.99] transition cursor-pointer disabled:opacity-60"
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
                  className="w-full text-center text-xs text-slate-500 hover:text-blue-600 transition font-medium cursor-pointer"
                >
                  &larr; Back to phone number
                </button>
              </form>
            )}
          </div>
        </div>
      </div>

      {/* Mandatory First-Time Password Change Modal */}
      {showPasswordChangeModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 sm:p-8 border border-slate-200 space-y-5 animate-scaleUp">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-200/80">
                <Lock size={18} />
              </div>
              <div>
                <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-[10px] font-bold text-amber-800 mb-1">
                  <span>Mandatory Security Step</span>
                </div>
                <h3 className="text-base font-bold text-slate-900">Set Your New Password</h3>
              </div>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              Hello <strong className="text-slate-800">{pendingUser?.displayName || "Team Member"}</strong>! Because this is your first time logging in with your temporary password, please create your personal password before continuing.
            </p>

            {changePasswordError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start gap-2">
                <AlertCircle size={15} className="shrink-0 mt-0.5 text-rose-600" />
                <span>{changePasswordError}</span>
              </div>
            )}

            <form onSubmit={handleSaveNewPassword} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">
                  New Permanent Password
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  required
                  minLength={6}
                  className="w-full rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-600 focus:ring-4 focus:ring-blue-500/10 px-3.5 py-2.5 text-xs text-slate-900 outline-none transition"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter your new password"
                  required
                  minLength={6}
                  className="w-full rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-600 focus:ring-4 focus:ring-blue-500/10 px-3.5 py-2.5 text-xs text-slate-900 outline-none transition"
                />
              </div>

              <button
                type="submit"
                disabled={changingPassword}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-white font-semibold text-xs bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-600/20 active:scale-[0.99] transition cursor-pointer disabled:opacity-60 mt-2"
              >
                {changingPassword ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Saving Secure Password...</span>
                  </>
                ) : (
                  <>
                    <span>Save Password & Open Console</span>
                    <Check size={14} />
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
