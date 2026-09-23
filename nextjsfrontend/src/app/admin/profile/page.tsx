"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { fetchApi } from "@/lib/api";
import PageHeader from "../components/PageHeader";
import {
  User,
  Mail,
  Phone,
  Shield,
  KeyRound,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  MessageCircle,
  Users,
  ChevronRight,
  ExternalLink,
  Lock,
  Building2,
  Check,
  Copy,
  Calendar,
  Clock,
  Activity,
  Sliders,
  RotateCcw,
} from "lucide-react";

function AdminProfileContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryEmployeeId = searchParams.get("id");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [profileData, setProfileData] = useState<{
    employee: any;
    roleInfo?: {
      id: string;
      name: string;
      department?: string;
      permissions: string[];
    };
    effectivePermissions: string[];
    permissionOverrides: { granted: string[]; revoked: string[] };
    directReports: any[];
    recentActivity: any[];
  } | null>(null);

  // Password reset link trigger state
  const [resetLoadingChannel, setResetLoadingChannel] = useState<string | null>(null);
  const [resetFeedback, setResetFeedback] = useState<{
    channel: string;
    message: string;
    whatsappUrl?: string | null;
    resetUrl?: string | null;
  } | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Direct Change Password Form
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changePasswordLoading, setChangePasswordLoading] = useState(false);
  const [changePasswordMsg, setChangePasswordMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (queryEmployeeId) {
      router.replace(`/admin/employees/${queryEmployeeId}`);
      return;
    }
    loadProfile();
  }, [queryEmployeeId, router]);

  const loadProfile = async () => {
    try {
      setLoading(true);
      setError(null);

      // Identify currently logged-in admin user
      const meRes = await fetchApi<{ user: any }>("/auth/me");
      const targetId = meRes.user?._id || meRes.user?.id;

      if (!targetId) {
        throw new Error("Unable to identify administrator profile ID.");
      }

      try {
        const res = await fetchApi<any>(`/admin/employees/${targetId}`);
        setProfileData(res);
      } catch (err: any) {
        // Safe fallback to /auth/me if dedicated endpoint is not reachable
        const emp = meRes.user;
        setProfileData({
          employee: {
            ...emp,
            companyName: "Package Movers Platform Administration",
          },
          roleInfo: {
            id: emp.adminRole || "platform_officer",
            name: (emp.adminRole || "Platform Officer").replace(/_/g, " "),
            department: emp.adminDepartment || emp.department || "General Administration",
            permissions: emp.effectivePermissions || [],
          },
          effectivePermissions: emp.effectivePermissions || [],
          permissionOverrides: emp.permissionOverrides || { granted: [], revoked: [] },
          directReports: [],
          recentActivity: [],
        });
      }
    } catch (err: any) {
      setError(err.message || "Failed to load administrator profile");
    } finally {
      setLoading(false);
    }
  };

  const handleSendResetLink = async (channel: "whatsapp" | "sms" | "email") => {
    if (!profileData?.employee) return;
    try {
      setResetLoadingChannel(channel);
      setResetFeedback(null);
      setCopiedLink(false);

      const res = await fetchApi<{
        success: boolean;
        channel: string;
        message: string;
        whatsappUrl?: string | null;
        resetUrl?: string | null;
      }>("/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({
          identifier: profileData.employee.username || profileData.employee.phone,
          channel,
        }),
      });

      setResetFeedback(res);
    } catch (err: any) {
      alert(err.message || "Failed to generate password reset link");
    } finally {
      setResetLoadingChannel(null);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setChangePasswordMsg(null);

    if (newPassword.length < 6) {
      setChangePasswordMsg({ type: "error", text: "New password must be at least 6 characters long." });
      return;
    }

    if (newPassword !== confirmPassword) {
      setChangePasswordMsg({ type: "error", text: "Passwords do not match." });
      return;
    }

    try {
      setChangePasswordLoading(true);
      await fetchApi("/auth/change-password", {
        method: "POST",
        body: JSON.stringify({ newPassword }),
      });

      setChangePasswordMsg({
        type: "success",
        text: "Password updated successfully! Your new password is now active.",
      });
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      setChangePasswordMsg({ type: "error", text: err.message || "Failed to update password." });
    } finally {
      setChangePasswordLoading(false);
    }
  };

  const copyResetUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-3">
        <RefreshCw className="animate-spin text-slate-400" size={32} />
        <p className="text-xs font-semibold text-slate-500">Loading administrator profile...</p>
      </div>
    );
  }

  if (error || !profileData) {
    return (
      <div className="space-y-6">
        <PageHeader title="Administrator Profile" description="Individual headquarters staff profile" />
        <div className="p-6 bg-rose-50 border border-rose-200 rounded-2xl flex items-center justify-between text-rose-700 text-xs">
          <div className="flex items-center gap-3">
            <AlertCircle size={20} className="text-rose-600 shrink-0" />
            <span className="font-semibold">{error || "Profile could not be located."}</span>
          </div>
          <button
            onClick={loadProfile}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold cursor-pointer transition"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const { employee, roleInfo, effectivePermissions = [], permissionOverrides, directReports = [], recentActivity = [] } = profileData;
  const isSuperAdmin = employee.phone === "+919876543210" || employee.adminRole === "super_admin";

  return (
    <div className="space-y-6 font-sans text-slate-900 pb-12">
      {/* Header */}
      <PageHeader
        title={employee.displayName || employee.username || "Administrator Profile"}
        description={`Headquarters Staff Record • ${employee.department || employee.adminDepartment || "General Administration"}`}
      >
        <div className="flex items-center gap-2">
          <Link
            href="/admin/my-permissions"
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200/80 shadow-2xs transition"
          >
            <Shield size={14} className="text-blue-600" />
            <span>My Role & Permissions</span>
          </Link>

          <button
            onClick={loadProfile}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200/80 shadow-2xs transition cursor-pointer"
          >
            <RefreshCw size={14} />
            <span>Refresh</span>
          </button>
        </div>
      </PageHeader>

      {/* Main Profile Identity Card */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-100">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-2xl bg-gradient-to-tr from-slate-900 to-slate-700 text-white flex items-center justify-center font-bold text-xl shadow-xs shrink-0">
              {(employee.displayName || employee.username || "A").slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl font-bold text-slate-900">{employee.displayName || employee.username}</h1>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                    employee.accountStatus === "active"
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      : "bg-rose-50 text-rose-700 border border-rose-200"
                  }`}
                >
                  {employee.accountStatus === "active" ? "Active Account" : "Suspended"}
                </span>

                {isSuperAdmin && (
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                    Platform Super Administrator
                  </span>
                )}
              </div>

              <div className="flex items-center gap-4 mt-1.5 text-xs text-slate-500 flex-wrap">
                <span className="font-semibold text-slate-700">@{employee.username || "staff"}</span>
                <span>•</span>
                <span>Role: <strong className="text-slate-900">{roleInfo?.name || employee.roleName || (employee.adminRole || "admin").replace(/_/g, " ")}</strong></span>
                <span>•</span>
                <span>Department: <strong className="text-slate-900">{employee.department || employee.adminDepartment || "General Administration"}</strong></span>
              </div>
            </div>
          </div>

          {/* Activity / Session Status Container */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 text-xs bg-slate-50 p-4 rounded-xl border border-slate-100">
            <div className="space-y-1">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                <Clock size={12} />
                <span>Last Login</span>
              </div>
              <div className="font-semibold text-slate-800">
                {employee.lastLogin ? new Date(employee.lastLogin).toLocaleString() : "Never (Account Pending)"}
              </div>
            </div>

            <div className="hidden sm:block h-8 w-px bg-slate-200" />

            <div className="space-y-1">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                <Activity size={12} />
                <span>Last Activity</span>
              </div>
              <div className="font-semibold text-slate-800">
                {employee.lastActivity ? new Date(employee.lastActivity).toLocaleString() : "No recorded activity"}
              </div>
            </div>
          </div>
        </div>

        {/* Contact & Organizational Credentials */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 pt-6">
          <div className="flex items-center gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-100">
            <Building2 size={16} className="text-blue-600 shrink-0" />
            <div className="truncate">
              <div className="text-[10px] font-bold text-slate-400 uppercase">Organization</div>
              <div className="text-xs font-semibold text-blue-900 truncate" title="Package Movers Platform Administration">
                {employee.companyName || "Package Movers Platform Administration"}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-100">
            <Mail size={16} className="text-slate-500 shrink-0" />
            <div className="truncate">
              <div className="text-[10px] font-bold text-slate-400 uppercase">Corporate Email</div>
              <div className="text-xs font-semibold text-slate-800 truncate" title={employee.email}>
                {employee.email || "Pending Provisioning"}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-100">
            <Phone size={16} className="text-slate-500 shrink-0" />
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase">Phone (Login ID)</div>
              <div className="text-xs font-semibold text-slate-800">{employee.phone}</div>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-100">
            <Shield size={16} className="text-slate-500 shrink-0" />
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase">Reports To</div>
              <div className="text-xs font-semibold text-slate-800 truncate">
                {employee.reportsTo?.displayName || employee.reportsTo?.username || "Executive Governance / Super Admin"}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-100">
            <Calendar size={16} className="text-slate-500 shrink-0" />
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase">Onboarded Since</div>
              <div className="text-xs font-semibold text-slate-800">
                {employee.createdAt ? new Date(employee.createdAt).toLocaleDateString() : "Active Member"}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Grid: Reporting Hierarchy + Effective Permissions Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Reporting Hierarchy & Direct Reports */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Users size={16} className="text-blue-600" />
                <span>Supervision & Direct Reports ({directReports.length})</span>
              </h2>
            </div>

            {directReports.length === 0 ? (
              <div className="p-6 text-center bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-500">
                No staff members currently report to this administrator.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 max-h-[300px] overflow-y-auto">
                {directReports.map((report) => (
                  <Link
                    key={report._id}
                    href={`/admin/employees/${report._id}`}
                    className="flex items-center justify-between py-3 px-2 hover:bg-slate-50 rounded-lg transition"
                  >
                    <div>
                      <div className="text-xs font-bold text-slate-900">{report.displayName || report.username}</div>
                      <div className="text-[11px] text-slate-500">
                        {(report.adminRole || "admin").replace(/_/g, " ")} • {report.phone}
                      </div>
                    </div>
                    <ChevronRight size={14} className="text-slate-400" />
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Password Reset Dispatch & Credential Controls */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-2xs space-y-4">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <KeyRound size={16} className="text-emerald-600" />
              <span>Password Dispatch & Reset</span>
            </h2>
            <p className="text-xs text-slate-500 leading-relaxed">
              Generate a cryptographically secure, 1-hour expiring reset token and dispatch via authenticated channels.
            </p>

            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleSendResetLink("whatsapp")}
                disabled={Boolean(resetLoadingChannel)}
                className="flex flex-col items-center justify-center p-3 rounded-xl bg-emerald-50 hover:bg-emerald-100/80 border border-emerald-200 text-emerald-800 text-xs font-bold transition cursor-pointer disabled:opacity-50"
              >
                <MessageCircle size={18} className="mb-1 text-emerald-600" />
                <span>WhatsApp</span>
              </button>

              <button
                type="button"
                onClick={() => handleSendResetLink("sms")}
                disabled={Boolean(resetLoadingChannel)}
                className="flex flex-col items-center justify-center p-3 rounded-xl bg-sky-50 hover:bg-sky-100/80 border border-sky-200 text-sky-800 text-xs font-bold transition cursor-pointer disabled:opacity-50"
              >
                <Phone size={18} className="mb-1 text-sky-600" />
                <span>SMS</span>
              </button>

              <button
                type="button"
                onClick={() => handleSendResetLink("email")}
                disabled={Boolean(resetLoadingChannel)}
                className="flex flex-col items-center justify-center p-3 rounded-xl bg-purple-50 hover:bg-purple-100/80 border border-purple-200 text-purple-800 text-xs font-bold transition cursor-pointer disabled:opacity-50"
              >
                <Mail size={18} className="mb-1 text-purple-600" />
                <span>Email</span>
              </button>
            </div>

            {resetFeedback && (
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2 mt-3">
                <div className="font-semibold text-slate-800">{resetFeedback.message}</div>
                {resetFeedback.whatsappUrl && (
                  <a
                    href={resetFeedback.whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs transition"
                  >
                    <span>Open WhatsApp Dispatch</span>
                    <ExternalLink size={12} />
                  </a>
                )}
                {resetFeedback.resetUrl && (
                  <div className="flex items-center gap-2 pt-2 border-t border-slate-200">
                    <input
                      readOnly
                      value={resetFeedback.resetUrl}
                      className="bg-white border border-slate-200 px-2 py-1 rounded text-[11px] text-slate-600 font-mono w-full"
                    />
                    <button
                      type="button"
                      onClick={() => copyResetUrl(resetFeedback.resetUrl!)}
                      className="p-1.5 hover:bg-slate-200 rounded text-slate-700 cursor-pointer"
                    >
                      {copiedLink ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Direct Change Password Card */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-2xs space-y-4">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Lock size={16} className="text-slate-700" />
              <span>Change Account Password</span>
            </h2>
            <p className="text-xs text-slate-500 leading-relaxed">
              Update your account credentials immediately. Ensure your new password is at least 6 characters long.
            </p>

            {changePasswordMsg && (
              <div
                className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                  changePasswordMsg.type === "success"
                    ? "bg-emerald-50 border border-emerald-200 text-emerald-800"
                    : "bg-rose-50 border border-rose-200 text-rose-800"
                }`}
              >
                {changePasswordMsg.type === "success" ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                <span>{changePasswordMsg.text}</span>
              </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-600">New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  placeholder="Enter new password (min 6 chars)"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-mono text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-600">Confirm New Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  placeholder="Repeat new password"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-mono text-xs"
                />
              </div>

              <button
                type="submit"
                disabled={changePasswordLoading}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-xs transition cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {changePasswordLoading ? <RefreshCw size={14} className="animate-spin" /> : <Lock size={14} />}
                <span>Update Password</span>
              </button>
            </form>
          </div>
        </div>

        {/* Right: Effective Permissions & Immutable Audit Trail */}
        <div className="lg:col-span-7 space-y-6">
          {/* Permissions Overview Container */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Shield size={16} className="text-blue-600" />
                  <span>Effective Active Permissions</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Calculated from role defaults + granted overrides - revoked overrides.
                </p>
              </div>

              <Link
                href="/admin/my-permissions"
                className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1"
              >
                <span>View Full Details</span>
                <ChevronRight size={14} />
              </Link>
            </div>

            {isSuperAdmin ? (
              <div className="p-4 bg-purple-50 border border-purple-200 rounded-xl text-xs text-purple-900 font-medium">
                ⭐ Root Super Administrator: unrestricted platform-wide access (<code>*</code> wildcard granted across all governance, financial, and management endpoints).
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  {effectivePermissions.map((perm) => {
                    const isGrantedOverride = permissionOverrides?.granted?.includes(perm);
                    return (
                      <span
                        key={perm}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold ${
                          isGrantedOverride
                            ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                            : "bg-slate-100 text-slate-800 border border-slate-200/60"
                        }`}
                      >
                        <Check size={12} className={isGrantedOverride ? "text-emerald-600" : "text-slate-500"} />
                        <span>{perm}</span>
                        {isGrantedOverride && <span className="text-[10px] text-emerald-700">(Override)</span>}
                      </span>
                    );
                  })}
                </div>

                {permissionOverrides?.revoked && permissionOverrides.revoked.length > 0 && (
                  <div className="pt-2">
                    <div className="text-[11px] font-bold text-rose-600 uppercase">Revoked from Base Role:</div>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {permissionOverrides.revoked.map((rev) => (
                        <span
                          key={rev}
                          className="line-through px-2 py-0.5 rounded text-[11px] bg-rose-50 text-rose-700 border border-rose-200"
                        >
                          {rev}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Immutable Audit Log History */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-2xs space-y-4">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Activity size={16} className="text-purple-600" />
              <span>Real MongoDB Audit Trail ({recentActivity.length})</span>
            </h2>

            {recentActivity.length === 0 ? (
              <div className="p-6 text-center bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-500">
                No recorded administrative actions found for this user in the audit log.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 max-h-[360px] overflow-y-auto">
                {recentActivity.map((log: any) => (
                  <div key={log._id} className="py-3 text-xs space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-slate-900">{log.action || log.event}</span>
                      <span className="text-[11px] text-slate-400">
                        {log.createdAt ? new Date(log.createdAt).toLocaleString() : ""}
                      </span>
                    </div>
                    <p className="text-slate-600 text-[11px]">{log.details || log.description || "Administrative modification"}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminProfilePage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[300px]">
          <RefreshCw className="animate-spin text-slate-400" size={24} />
        </div>
      }
    >
      <AdminProfileContent />
    </Suspense>
  );
}
