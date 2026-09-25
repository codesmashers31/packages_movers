"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { fetchApi } from "@/lib/api";
import PageHeader from "@/app/admin/components/PageHeader";
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
  Share2,
  Users,
  HardHat,
  ChevronRight,
  ExternalLink,
  Lock,
  Building2,
  UserCheck,
  Check,
  Copy,
  Truck,
  Package,
  Calendar,
  Clock,
  ArrowUpRight,
  Activity,
  ShieldAlert,
  Ban,
  CheckSquare,
  Compass,
} from "lucide-react";

function EmployeeProfileContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryEmployeeId = searchParams.get("id");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Profile data from /vendor/employees/:id
  const [profileData, setProfileData] = useState<{
    employee: any;
    roleDef?: {
      id: string;
      name: string;
      purpose: string;
      responsibleFor: string[];
      canAccess: string[];
      canPerform: string[];
      cannotAccess: string[];
    };
    directReports: any[];
    assignedCrew: any[];
    assignedVehicles: any[];
    assignedMoves: any[];
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
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changePasswordLoading, setChangePasswordLoading] = useState(false);
  const [changePasswordMsg, setChangePasswordMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (queryEmployeeId) {
      router.replace(`/vendor/employees/${queryEmployeeId}`);
      return;
    }
    loadProfile();
  }, [queryEmployeeId, router]);

  const loadProfile = async () => {
    try {
      setLoading(true);
      setError(null);

      let targetId = queryEmployeeId;

      if (!targetId) {
        // Fallback to currently logged-in user
        const meRes = await fetchApi<{ user: any }>("/auth/me");
        targetId = meRes.user?._id || meRes.user?.id;
      }

      if (!targetId) {
        throw new Error("Unable to identify employee profile ID.");
      }

      try {
        // Fetch rich profile payload from dedicated endpoint
        const res = await fetchApi<any>(`/vendor/employees/${targetId}`);
        setProfileData({
          employee: res.employee,
          roleDef: res.roleDef,
          directReports: res.directReports || [],
          assignedCrew: res.assignedCrew || [],
          assignedVehicles: res.assignedVehicles || [],
          assignedMoves: res.assignedMoves || [],
          recentActivity: res.recentActivity || [],
        });
      } catch (endpointErr: any) {
        // Fallback: Use authenticated user without fabricated roleDef data
        const meRes = await fetchApi<{ user: any }>("/auth/me");
        const emp = meRes.user;
        setProfileData({
          employee: emp,
          roleDef: undefined,
          directReports: [],
          assignedCrew: [],
          assignedVehicles: [],
          assignedMoves: [],
          recentActivity: [],
        });
      }
    } catch (err: any) {
      setError(err.message || "Failed to load individual employee profile");
    } finally {
      setLoading(false);
    }
  };

  const handleSendResetLink = async (channel: "whatsapp" | "sms" | "email") => {
    const employee = profileData?.employee;
    if (!employee) return;

    try {
      setResetLoadingChannel(channel);
      setResetFeedback(null);
      setCopiedLink(false);

      let res: any;
      if (employee._id) {
        // Trigger via vendor employee endpoint
        res = await fetchApi(`/vendor/employees/${employee._id}/send-reset-link`, {
          method: "POST",
          body: JSON.stringify({ channel }),
        });
      } else {
        // Trigger via self forgot password endpoint
        const identifier = employee.username || employee.email || employee.phone;
        const rawRes = await fetch("http://localhost:5000/api/v1/auth/forgot-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ identifier, channel }),
        });
        res = await rawRes.json();
      }

      if (res.error) {
        throw new Error(res.error.message || "Failed to trigger reset link");
      }

      setResetFeedback({
        channel,
        message: res.message || `Password reset link generated for ${channel}.`,
        whatsappUrl: res.whatsappUrl || null,
        resetUrl: res.resetUrl || null,
      });

      if (channel === "whatsapp" && res.whatsappUrl) {
        window.open(res.whatsappUrl, "_blank", "noopener,noreferrer");
      }
    } catch (err: any) {
      setError(err.message || `Failed to dispatch reset link via ${channel}`);
    } finally {
      setResetLoadingChannel(null);
    }
  };

  const handleChangePasswordDirect = async (e: React.FormEvent) => {
    e.preventDefault();
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
      setChangePasswordMsg(null);

      const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : "";
      const res = await fetch("http://localhost:5000/api/v1/auth/change-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ oldPassword, newPassword }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || "Failed to update password");
      }

      setChangePasswordMsg({ type: "success", text: "Password successfully updated!" });
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      setChangePasswordMsg({ type: "error", text: err.message || "Failed to change password" });
    } finally {
      setChangePasswordLoading(false);
    }
  };

  const copyResetUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 3000);
  };

  if (loading) {
    return (
      <div className="py-24 text-center">
        <RefreshCw size={28} className="animate-spin text-blue-600 mx-auto mb-3" />
        <p className="text-xs font-bold text-slate-700">Loading individual employee record...</p>
      </div>
    );
  }

  if (error || !profileData || !profileData.employee) {
    return (
      <div className="max-w-2xl mx-auto p-6 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs space-y-2">
        <div className="flex items-center gap-2 font-bold text-sm">
          <AlertCircle size={18} />
          <span>Profile Not Found</span>
        </div>
        <p>{error || "Unable to find the requested employee profile in your company."}</p>
        <Link href="/vendor/employees" className="inline-block mt-2 font-bold text-blue-600 underline">
          Return to Employee Directory
        </Link>
      </div>
    );
  }

  const { employee, roleDef, directReports, assignedCrew, assignedVehicles, assignedMoves, recentActivity } = profileData;

  const displayName = employee.displayName || employee.username || "Team Member";
  const roleTitle = roleDef?.name || (employee.employeeRole || employee.role || "worker")
    .replace(/^custom_/, "")
    .replace(/_[0-9]+$/, "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c: string) => c.toUpperCase());
  const email = employee.email || `${employee.username || "user"}@packagemovers.in`;
  const phone = employee.phone || "—";
  const supervisor = employee.reportsTo;
  const joinedDate = employee.createdAt ? new Date(employee.createdAt).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" }) : "Active";

  return (
    <div className="max-w-6xl mx-auto space-y-6 font-sans text-slate-900 pb-16">
      {/* Page Header */}
      <PageHeader
        title="My Employee Profile"
        description="Comprehensive personal details, operational responsibilities, assigned scope, and security controls."
      >
        <div className="flex items-center gap-2">
          <Link
            href="/vendor/my-permissions"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200/80 shadow-2xs transition"
          >
            <Shield size={14} />
            <span>My Operational Permissions</span>
          </Link>
        </div>
      </PageHeader>

      {/* 1. HERO CAPSULE CONTAINER — Answers 'Who is this employee?' */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-black text-2xl shadow-sm shrink-0">
            {displayName.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-xl font-black text-slate-900 leading-tight">{displayName}</h2>
              <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[11px] font-bold border border-blue-200">
                {roleTitle}
              </span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200 flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                {employee.accountStatus === "active" ? "Active Staff" : (employee.accountStatus || "Active")}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1 flex items-center gap-3 flex-wrap">
              {employee.companyName && (
                <>
                  <span className="font-bold text-slate-700 flex items-center gap-1">
                    <Building2 size={13} className="text-blue-600 shrink-0" />
                    <span>{employee.companyName}</span>
                  </span>
                  <span>•</span>
                </>
              )}
              {employee.username && (
                <>
                  <span className="font-mono">@{employee.username}</span>
                  <span>•</span>
                </>
              )}
              {employee.department && (
                <>
                  <span>Dept: {employee.department}</span>
                  <span>•</span>
                </>
              )}
              {joinedDate && <span>Joined: {joinedDate}</span>}
            </p>
          </div>
        </div>

        {/* Dynamic Scope Quick Metrics */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200/80 text-center min-w-[70px]">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Direct Reports</span>
            <span className="text-lg font-bold text-slate-900 leading-none">{directReports.length}</span>
          </div>
          <div className="px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200/80 text-center min-w-[70px]">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Assigned Trucks</span>
            <span className="text-lg font-bold text-blue-600 leading-none">{assignedVehicles.length}</span>
          </div>
          <div className="px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200/80 text-center min-w-[70px]">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Active Moves</span>
            <span className="text-lg font-bold text-purple-600 leading-none">{assignedMoves.length}</span>
          </div>
        </div>
      </div>

      {/* 2-COLUMN MAIN GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* LEFT COLUMN: Role & Responsibilities + Reporting Hierarchy + Assigned Scope */}
        <div className="space-y-6">
          
          {/* CONTAINER 2: Role & Operational Responsibilities */}
          <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Shield size={18} className="text-blue-600" />
                <h3 className="font-bold text-sm text-slate-900">Operational Role & Scope of Authority</h3>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                {roleTitle}
              </span>
            </div>

            {roleDef && (
              <div className="space-y-4 text-xs">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Operational Purpose</span>
                  <p className="text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-200/60 leading-relaxed">
                    {roleDef.purpose}
                  </p>
                </div>

                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1.5">Responsible For</span>
                  <div className="space-y-1.5">
                    {roleDef.responsibleFor?.map((resp, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-slate-800">
                        <CheckCircle2 size={13} className="text-emerald-600 shrink-0 mt-0.5" />
                        <span>{resp}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div className="p-3 rounded-xl bg-emerald-50/50 border border-emerald-100 space-y-1">
                    <span className="text-[10px] font-bold text-emerald-800 uppercase block">Permitted Actions</span>
                    <ul className="space-y-1 text-[11px] text-emerald-900">
                      {roleDef.canPerform?.map((item, idx) => (
                        <li key={idx} className="flex items-center gap-1.5">
                          <Check size={11} className="text-emerald-600 shrink-0" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="p-3 rounded-xl bg-rose-50/50 border border-rose-100 space-y-1">
                    <span className="text-[10px] font-bold text-rose-800 uppercase block">Restricted Boundaries</span>
                    <ul className="space-y-1 text-[11px] text-rose-900">
                      {roleDef.cannotAccess?.map((item, idx) => (
                        <li key={idx} className="flex items-center gap-1.5">
                          <Ban size={11} className="text-rose-600 shrink-0" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* CONTAINER 3: Reporting Hierarchy (Reports To & Supervised Crew) */}
          <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-5">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <Users size={18} className="text-indigo-600" />
              <h3 className="font-bold text-sm text-slate-900">Supervisory Hierarchy</h3>
            </div>

            {/* Reports To (Direct Manager) */}
            <div className="space-y-2">
              <span className="text-[10px] uppercase font-bold text-slate-400">Reports Directly To</span>
              {supervisor ? (
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center shrink-0">
                      {supervisor.displayName?.charAt(0) || "M"}
                    </div>
                    <div>
                      <p className="font-bold text-slate-900">{supervisor.displayName || supervisor.username}</p>
                      <p className="text-[11px] text-indigo-600 font-medium">
                        {(supervisor.employeeRole || "Manager").replace(/_/g, " ")}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {supervisor.phone && (
                      <a
                        href={`https://wa.me/${supervisor.phone.replace(/\D/g, "")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition"
                        title="WhatsApp Manager"
                      >
                        <MessageCircle size={14} />
                      </a>
                    )}
                    {supervisor.phone && (
                      <a
                        href={`tel:${supervisor.phone}`}
                        className="p-2 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 transition"
                        title="Call Manager"
                      >
                        <Phone size={14} />
                      </a>
                    )}
                  </div>
                </div>
              ) : (
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/60 text-xs text-slate-500 flex items-center gap-2.5">
                  <UserCheck size={16} className="text-slate-400 shrink-0" />
                  <span>Not configured</span>
                </div>
              )}
            </div>

            {/* Direct Reports Working Under This Employee */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold text-slate-400">
                  Direct Reports Working Under This Employee ({directReports.length})
                </span>
              </div>

              {directReports.length === 0 ? (
                <div className="p-4 rounded-xl bg-slate-50 border border-dashed border-slate-200 text-center text-xs text-slate-500">
                  <HardHat size={20} className="text-slate-300 mx-auto mb-1" />
                  <span>No subordinate staff currently report to this employee</span>
                </div>
              ) : (
                <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                  {directReports.map((sub) => (
                    <div
                      key={sub._id}
                      className="p-2.5 rounded-xl bg-slate-50 hover:bg-blue-50/50 border border-slate-200/70 transition flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="h-8 w-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs shrink-0">
                          {sub.displayName?.charAt(0) || "S"}
                        </div>
                        <div className="min-w-0">
                          <Link
                            href={`/vendor/employees/${sub._id}`}
                            className="font-bold text-slate-900 hover:text-blue-600 truncate block"
                          >
                            {sub.displayName || sub.username}
                          </Link>
                          <p className="text-[10px] text-slate-500 truncate">
                            {(sub.employeeRole || "worker").replace(/_/g, " ")} • {sub.phone || "No phone"}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        {sub.phone && (
                          <a
                            href={`https://wa.me/${sub.phone.replace(/\D/g, "")}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition"
                            title="WhatsApp Subordinate"
                          >
                            <MessageCircle size={12} />
                          </a>
                        )}
                        <Link
                          href={`/vendor/employees/${sub._id}`}
                          className="p-1.5 rounded-lg bg-slate-200 text-slate-700 hover:bg-slate-300 transition"
                          title="View Profile"
                        >
                          <ArrowUpRight size={12} />
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* CONTAINER 4: Assigned Operational Scope (Trucks, Moves, Assigned Crew) */}
          <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Truck size={18} className="text-blue-600" />
                <h3 className="font-bold text-sm text-slate-900">Assigned Operational Assets & Moves</h3>
              </div>
              <span className="text-xs text-slate-500 font-medium">Restricted Scope Enforcement</span>
            </div>

            {/* Assigned Vehicles */}
            <div className="space-y-1.5 text-xs">
              <span className="text-[10px] uppercase font-bold text-slate-400">Assigned Vehicles ({assignedVehicles.length})</span>
              {assignedVehicles.length === 0 ? (
                <p className="text-slate-400 italic text-[11px] p-2 bg-slate-50 rounded-lg">No vehicles explicitly scoped to this employee</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {assignedVehicles.map((v) => (
                    <div key={v._id} className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/70 text-xs flex items-center justify-between">
                      <div>
                        <p className="font-bold text-slate-800">{v.name || v.registrationNumber}</p>
                        <p className="text-[10px] text-slate-500 font-mono">{v.registrationNumber} • {v.vehicleType || "Truck"}</p>
                      </div>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700">
                        {v.capacity || "Fleet"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Assigned Active Moves */}
            <div className="space-y-1.5 text-xs pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold text-slate-400">Assigned Moves ({assignedMoves.length})</span>
                <Link href="/vendor/tracking" className="text-blue-600 text-[11px] font-bold hover:underline">
                  Open Tracking Map →
                </Link>
              </div>

              {assignedMoves.length === 0 ? (
                <p className="text-slate-400 italic text-[11px] p-2 bg-slate-50 rounded-lg">No customer dispatches currently scoped to this employee</p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {assignedMoves.map((m) => (
                    <div key={m._id} className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/70 flex items-center justify-between gap-2 text-xs">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-blue-700">#{m._id.slice(-6).toUpperCase()}</span>
                          <span className="font-semibold text-slate-800">{m.customerId?.displayName || "Customer"}</span>
                        </div>
                        <p className="text-[10px] text-slate-400">
                          {m.scheduledDate ? new Date(m.scheduledDate).toLocaleDateString("en-IN") : "Date TBD"}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-white border border-slate-200 text-slate-700">
                          {m.status}
                        </span>
                        <Link
                          href={`/vendor/tracking?moveId=${m._id}`}
                          className="px-2 py-1 rounded-lg bg-blue-600 text-white font-bold text-[10px] hover:bg-blue-700 transition"
                        >
                          Track
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Contact Details + Password Reset & Security + Activity Trail */}
        <div className="space-y-6">

          {/* CONTAINER 5: Personal & Contact Information */}
          <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <User size={18} className="text-blue-600" />
              <h3 className="font-bold text-sm text-slate-900">Personal & Official Contact Record</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/60 space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-400">Company / Carrier</span>
                <p className="font-bold text-blue-700">{employee.companyName || "Bangalore Express Movers Pvt Ltd"}</p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/60 space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-400">Username</span>
                <p className="font-mono font-bold text-slate-800">{employee.username || "—"}</p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/60 space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-400">Mobile / WhatsApp</span>
                <p className="font-mono font-bold text-slate-800">{phone}</p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/60 space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-400">Corporate Email Address</span>
                <p className="font-mono font-bold text-blue-600 truncate">{email}</p>
              </div>
            </div>
          </div>

          {/* CONTAINER 6: Password Reset & Delivery Channels (WhatsApp, SMS, Email) */}
          <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <KeyRound size={18} className="text-blue-600" />
              <div>
                <h3 className="font-bold text-sm text-slate-900">Generate Password Reset Link</h3>
                <p className="text-xs text-slate-500">
                  Generate secure 1-hour reset token and dispatch via WhatsApp, SMS, or Email.
                </p>
              </div>
            </div>

            {/* Quick Dispatch Action Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                onClick={() => handleSendResetLink("whatsapp")}
                disabled={Boolean(resetLoadingChannel)}
                className="p-3.5 rounded-2xl bg-emerald-50 hover:bg-emerald-100/80 border border-emerald-200 text-emerald-800 text-xs font-bold flex flex-col items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50"
              >
                <MessageCircle size={20} className="text-emerald-600" />
                <span>Via WhatsApp</span>
                {resetLoadingChannel === "whatsapp" && <RefreshCw size={12} className="animate-spin" />}
              </button>

              <button
                onClick={() => handleSendResetLink("sms")}
                disabled={Boolean(resetLoadingChannel)}
                className="p-3.5 rounded-2xl bg-sky-50 hover:bg-sky-100/80 border border-sky-200 text-sky-800 text-xs font-bold flex flex-col items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50"
              >
                <Phone size={20} className="text-sky-600" />
                <span>Via SMS</span>
                {resetLoadingChannel === "sms" && <RefreshCw size={12} className="animate-spin" />}
              </button>

              <button
                onClick={() => handleSendResetLink("email")}
                disabled={Boolean(resetLoadingChannel)}
                className="p-3.5 rounded-2xl bg-indigo-50 hover:bg-indigo-100/80 border border-indigo-200 text-indigo-800 text-xs font-bold flex flex-col items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50"
              >
                <Mail size={20} className="text-indigo-600" />
                <span>Via Email</span>
                {resetLoadingChannel === "email" && <RefreshCw size={12} className="animate-spin" />}
              </button>
            </div>

            {/* Delivery Status and Direct Link Feedback */}
            {resetFeedback && (
              <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-200 space-y-3">
                <div className="flex items-start gap-2 text-xs text-blue-950">
                  <CheckCircle2 size={16} className="text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">{resetFeedback.message}</p>
                    <p className="text-[11px] text-blue-700 mt-0.5">
                      Valid for 60 minutes. Raw token is hashed and encrypted in database.
                    </p>
                  </div>
                </div>

                {resetFeedback.whatsappUrl && (
                  <a
                    href={resetFeedback.whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition"
                  >
                    <MessageCircle size={14} />
                    <span>Open Direct in WhatsApp</span>
                    <ExternalLink size={12} />
                  </a>
                )}

                {resetFeedback.resetUrl && (
                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="text"
                      readOnly
                      value={resetFeedback.resetUrl}
                      className="w-full px-2.5 py-1.5 text-[11px] font-mono bg-white border border-blue-200 rounded-lg text-slate-700"
                    />
                    <button
                      onClick={() => copyResetUrl(resetFeedback.resetUrl!)}
                      className="px-3 py-1.5 rounded-lg bg-blue-600 text-white font-bold text-xs shrink-0 flex items-center gap-1 hover:bg-blue-700 transition cursor-pointer"
                    >
                      {copiedLink ? <Check size={12} /> : <Copy size={12} />}
                      <span>{copiedLink ? "Copied" : "Copy"}</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* CONTAINER 7: Set New Password Form */}
          <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <Lock size={18} className="text-slate-700" />
              <h3 className="font-bold text-sm text-slate-900">Set New Password Immediately</h3>
            </div>

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

            <form onSubmit={handleChangePasswordDirect} className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-600">Current Password (optional if new account)</label>
                <input
                  type="password"
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  placeholder="Enter current password"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 transition text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-600">New Password</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 transition text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-600">Confirm New Password</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 transition text-xs"
                />
              </div>

              <button
                type="submit"
                disabled={changePasswordLoading}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50 mt-2"
              >
                {changePasswordLoading ? (
                  <RefreshCw size={14} className="animate-spin" />
                ) : (
                  <KeyRound size={14} />
                )}
                <span>Update Password</span>
              </button>
            </form>
          </div>

          {/* CONTAINER 8: Recent Important Operational Actions (AuditLog Trail) */}
          <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Activity size={18} className="text-purple-600" />
                <h3 className="font-bold text-sm text-slate-900">Recent Operational Actions</h3>
              </div>
              <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                Real MongoDB Audit Log
              </span>
            </div>

            {recentActivity.length === 0 ? (
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/60 text-center text-xs text-slate-400">
                <span>No logged operational actions for this employee yet.</span>
              </div>
            ) : (
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {recentActivity.map((act) => (
                  <div key={act._id} className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/70 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-purple-700 text-[10px]">
                        {act.action || "OPERATIONAL_ACTION"}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {act.createdAt ? new Date(act.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : ""}
                      </span>
                    </div>
                    <p className="text-slate-800 text-[11px] font-medium leading-tight">
                      {act.description || act.details?.summary || "Action logged"}
                    </p>
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

export default function VendorProfilePage() {
  return (
    <Suspense
      fallback={
        <div className="py-24 text-center">
          <RefreshCw size={28} className="animate-spin text-blue-600 mx-auto" />
        </div>
      }
    >
      <EmployeeProfileContent />
    </Suspense>
  );
}

