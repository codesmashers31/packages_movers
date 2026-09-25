"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { fetchApi } from "@/lib/api";
import {
  ArrowLeft,
  Shield,
  ShieldCheck,
  User,
  Phone,
  Mail,
  Building,
  UserCheck,
  Users,
  HardHat,
  Truck,
  Package,
  Calendar,
  Clock,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ExternalLink,
  MessageCircle,
  Copy,
  Check,
  Activity,
  Lock,
  Edit2,
  X,
} from "lucide-react";

export default function VendorEmployeeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const employeeId = params?.id as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [employee, setEmployee] = useState<any>(null);
  const [roleDef, setRoleDef] = useState<any>(null);
  const [directReports, setDirectReports] = useState<any[]>([]);
  const [assignedCrew, setAssignedCrew] = useState<any[]>([]);
  const [assignedVehicles, setAssignedVehicles] = useState<any[]>([]);
  const [assignedMoves, setAssignedMoves] = useState<any[]>([]);
  const [effectivePermissions, setEffectivePermissions] = useState<string[]>([]);
  const [permissionOverrides, setPermissionOverrides] = useState<any>({ granted: [], revoked: [] });
  const [auditTrail, setAuditTrail] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Edit modal state
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({
    displayName: "",
    phone: "",
    employeeRole: "",
    department: "",
    accountStatus: "active",
  });
  const [availableRoles, setAvailableRoles] = useState<any[]>([]);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const userStr = localStorage.getItem("auth_user");
      if (userStr) {
        setCurrentUser(JSON.parse(userStr));
      }
    } catch (e) {}

    fetchApi<{ user: any }>("/auth/me")
      .then((res) => {
        if (res?.user) {
          setCurrentUser(res.user);
        }
      })
      .catch(() => {});
  }, []);

  const canManagePermissions = useMemo(() => {
    if (!currentUser) return false;
    if (currentUser.role === "vendor" || currentUser.role === "admin") return true;
    const perms = Array.isArray(currentUser.permissions) ? currentUser.permissions : [];
    return perms.includes("*") || perms.includes("permissions:manage") || perms.includes("roles:manage");
  }, [currentUser]);

  const canEditEmployee = useMemo(() => {
    if (!currentUser) return false;
    if (currentUser.role === "vendor" || currentUser.role === "admin") return true;
    const perms = Array.isArray(currentUser.permissions) ? currentUser.permissions : [];
    return perms.includes("*") || perms.includes("employees:edit") || perms.includes("employees:manage") || perms.includes("Manage Employees & Crew");
  }, [currentUser]);

  const canViewActivity = useMemo(() => {
    if (!currentUser) return false;
    if (currentUser.role === "vendor" || currentUser.role === "admin") return true;
    const perms = Array.isArray(currentUser.permissions) ? currentUser.permissions : [];
    return perms.includes("*") || perms.includes("audit_logs:view") || perms.includes("Operational Audit Logs") || perms.includes("employees:view") || perms.includes("Manage Employees & Crew");
  }, [currentUser]);

  // Password reset link generation state
  const [dispatchingToken, setDispatchingToken] = useState(false);
  const [tokenResult, setTokenResult] = useState<{
    token: string;
    resetUrl: string;
    expiresInMinutes: number;
    channel: string;
  } | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  const loadEmployeeData = async () => {
    if (!employeeId) return;
    try {
      setLoading(true);
      setError(null);
      const data = await fetchApi<{
        employee: any;
        roleDef: any;
        directReports: any[];
        assignedCrew: any[];
        assignedVehicles: any[];
        assignedMoves: any[];
        effectivePermissions: string[];
        permissionOverrides: any;
        auditTrail: any[];
      }>(`/vendor/employees/${employeeId}`);

      setEmployee(data.employee);
      setRoleDef(data.roleDef);
      setDirectReports(data.directReports || []);
      setAssignedCrew(data.assignedCrew || []);
      setAssignedVehicles(data.assignedVehicles || []);
      setAssignedMoves(data.assignedMoves || []);
      setEffectivePermissions(data.effectivePermissions || []);
      setPermissionOverrides(data.permissionOverrides || { granted: [], revoked: [] });
      setAuditTrail(data.auditTrail || []);
    } catch (err: any) {
      setError(err.message || "Failed to load employee details");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (employee) {
      setEditFormData({
        displayName: employee.displayName || "",
        phone: employee.phone || "",
        employeeRole: employee.employeeRole || "worker",
        department: employee.department || "Operations",
        accountStatus: employee.accountStatus || "active",
      });
    }
  }, [employee]);

  const handleOpenEdit = async () => {
    try {
      const res = await fetchApi<{ roles: any[] }>("/vendor/roles");
      if (res?.roles) setAvailableRoles(res.roles);
    } catch {}
    setEditError(null);
    setEditModalOpen(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSavingEdit(true);
      setEditError(null);
      await fetchApi(`/vendor/employees/${employeeId}`, {
        method: "PATCH",
        body: JSON.stringify(editFormData),
      });
      setEditModalOpen(false);
      await loadEmployeeData();
    } catch (err: any) {
      setEditError(err.message || "Failed to update employee");
    } finally {
      setSavingEdit(false);
    }
  };

  useEffect(() => {
    loadEmployeeData();
  }, [employeeId]);

  const handleGenerateResetLink = async (channel: "whatsapp" | "sms" | "email" | "copy") => {
    try {
      setDispatchingToken(true);
      const res = await fetchApi<{
        resetToken: string;
        resetUrl: string;
        expiresInMinutes: number;
        recipient: { displayName: string; phone?: string; email?: string };
      }>("/auth/request-reset-token", {
        method: "POST",
        body: JSON.stringify({
          identifier: employee.phone || employee.corporateEmail || employee.username,
          channel: channel === "copy" ? "copy" : channel,
        }),
      });

      setTokenResult({
        token: res.resetToken,
        resetUrl: res.resetUrl,
        expiresInMinutes: res.expiresInMinutes || 60,
        channel,
      });

      if (channel === "whatsapp" && employee.phone) {
        const cleanPhone = employee.phone.replace(/\D/g, "");
        const formattedPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
        const msg = encodeURIComponent(
          `Hello ${employee.displayName},\n\nYour security password reset link for the carrier portal is:\n${res.resetUrl}\n\nThis link expires in ${res.expiresInMinutes || 60} minutes.`
        );
        window.open(`https://wa.me/${formattedPhone}?text=${msg}`, "_blank");
      }
    } catch (err: any) {
      alert(err.message || "Failed to generate password reset token");
    } finally {
      setDispatchingToken(false);
    }
  };

  const handleCopyLink = () => {
    if (tokenResult?.resetUrl) {
      navigator.clipboard.writeText(tokenResult.resetUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const roleTitle =
    roleDef?.name ||
    (employee?.employeeRole || "Staff")
      .split("_")
      .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");

  if (loading) {
    return (
      <div className="p-16 text-center text-xs text-slate-500 space-y-3 font-sans">
        <RefreshCw size={24} className="animate-spin text-blue-600 mx-auto" />
        <p className="font-medium">Loading employee profile from database...</p>
      </div>
    );
  }

  if (error || !employee) {
    return (
      <div className="max-w-4xl mx-auto space-y-4 font-sans p-6">
        <Link
          href="/vendor/employees"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition"
        >
          <ArrowLeft size={14} />
          <span>Back to Employees</span>
        </Link>
        <div className="p-6 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-xs flex items-start gap-3">
          <AlertCircle size={18} className="text-rose-600 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold text-sm">Unable to Load Employee Record</h4>
            <p className="mt-1">{error || "Employee record was not found or has been removed."}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 font-sans text-slate-900 pb-16 max-w-6xl mx-auto">
      {/* Navigation Breadcrumb Context */}
      <div className="flex items-center justify-between gap-4">
        <nav className="flex items-center gap-2 text-xs text-slate-500 font-medium">
          <Link href="/vendor/employees" className="hover:text-blue-600 transition flex items-center gap-1">
            <Users size={13} className="text-slate-400" />
            <span>Employees</span>
          </Link>
          <span>/</span>
          <span className="font-bold text-slate-900">{employee.displayName}</span>
        </nav>

        <Link
          href="/vendor/employees"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200/80 shadow-2xs transition cursor-pointer"
        >
          <ArrowLeft size={13} />
          <span>Back to Employees</span>
        </Link>
      </div>

      {/* Page Header Container */}
      <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="h-14 w-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-xl shadow-xs shrink-0">
              {employee.displayName.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-extrabold text-slate-900">{employee.displayName}</h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200/60">
                  {roleTitle}
                </span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border flex items-center gap-1 ${
                    employee.accountStatus === "active"
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200/60"
                      : "bg-rose-50 text-rose-700 border-rose-200/60"
                  }`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      employee.accountStatus === "active" ? "bg-emerald-500" : "bg-rose-500"
                    }`}
                  ></span>
                  {employee.accountStatus === "active" ? "Active Staff" : "Suspended"}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 mt-2">
                <span className="flex items-center gap-1">
                  <Phone size={13} className="text-slate-400" />
                  <span className="font-mono">{employee.phone}</span>
                </span>
                {employee.username && (
                  <span className="font-mono text-slate-600">
                    @{employee.username}
                  </span>
                )}
                {employee.corporateEmail && (
                  <span className="flex items-center gap-1">
                    <Mail size={13} className="text-slate-400" />
                    <span>{employee.corporateEmail}</span>
                  </span>
                )}
                {employee.department && (
                  <span className="flex items-center gap-1">
                    <Building size={13} className="text-slate-400" />
                    <span>{employee.department}</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Action CTAs */}
          <div className="flex items-center gap-2.5 shrink-0 flex-wrap justify-end">
            {canEditEmployee && (
              <button
                type="button"
                onClick={handleOpenEdit}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200/80 shadow-2xs transition cursor-pointer"
              >
                <Edit2 size={13} className="text-slate-500" />
                <span>Edit Employee</span>
              </button>
            )}

            {canViewActivity && auditTrail.length > 0 && (
              <a
                href="#activity-history"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200/80 shadow-2xs transition cursor-pointer"
              >
                <Activity size={13} className="text-blue-500" />
                <span>View Activity</span>
              </a>
            )}

            {canManagePermissions && (
              <Link
                href={`/vendor/permissions?employeeId=${employee._id}`}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 shadow-xs transition cursor-pointer"
              >
                <ShieldCheck size={14} className="text-teal-400" />
                <span>Manage Permissions</span>
              </Link>
            )}

            <button
              onClick={loadEmployeeData}
              disabled={loading}
              className="p-2 rounded-xl text-slate-600 bg-slate-100 hover:bg-slate-200 transition cursor-pointer"
              title="Refresh Record"
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            </button>
          </div>
        </div>
      </div>

      {/* Grid: 2 Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (8 cols): Core Operations & Capabilities */}
        <div className="lg:col-span-8 space-y-6">
          {/* Section 1: Basic Information */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-2xs space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <User size={13} className="text-slate-500" />
              <span>Basic Information</span>
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 text-xs">
              <div>
                <span className="text-[11px] text-slate-400">Full Name</span>
                <p className="font-semibold text-slate-900 mt-0.5">{employee.displayName}</p>
              </div>
              <div>
                <span className="text-[11px] text-slate-400">Company</span>
                <p className="font-semibold text-blue-700 mt-0.5 flex items-center gap-1">
                  <Building size={12} className="text-blue-600 shrink-0" />
                  <span>{employee.companyName || "Bangalore Express Movers Pvt Ltd"}</span>
                </p>
              </div>
              <div>
                <span className="text-[11px] text-slate-400">Primary Phone</span>
                <p className="font-mono font-semibold text-slate-900 mt-0.5">{employee.phone}</p>
              </div>
              <div>
                <span className="text-[11px] text-slate-400">Corporate Email</span>
                <p className="font-semibold text-slate-900 mt-0.5">{employee.corporateEmail || "None recorded"}</p>
              </div>
              <div>
                <span className="text-[11px] text-slate-400">Company Username</span>
                <p className="font-mono font-semibold text-slate-900 mt-0.5">@{employee.username || "—"}</p>
              </div>
              <div>
                <span className="text-[11px] text-slate-400">Joined Company</span>
                <p className="font-semibold text-slate-900 mt-0.5">
                  {employee.createdAt ? new Date(employee.createdAt).toLocaleDateString() : "—"}
                </p>
              </div>
              <div>
                <span className="text-[11px] text-slate-400">Account Status</span>
                <p className="font-semibold capitalize text-slate-900 mt-0.5">{employee.accountStatus}</p>
              </div>
            </div>
          </div>

          {/* Section 2: Responsibility & Scope */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-2xs space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Shield size={13} className="text-slate-500" />
              <span>Operational Role Scope & Responsibilities</span>
            </h3>

            {roleDef?.purpose && (
              <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-200/60 leading-relaxed">
                {roleDef.purpose}
              </p>
            )}

            {roleDef?.responsibleFor && roleDef.responsibleFor.length > 0 && (
              <div className="space-y-1.5">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Core Responsibilities
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {roleDef.responsibleFor.map((r: string, i: number) => (
                    <div key={i} className="flex items-start gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                      <CheckCircle2 size={13} className="text-blue-600 shrink-0 mt-0.5" />
                      <span className="text-slate-700">{r}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Section 3: Effective Permissions Summary */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <ShieldCheck size={13} className="text-slate-500" />
                <span>Effective Capabilities ({effectivePermissions.length})</span>
              </h3>
              {canManagePermissions && (
                <Link
                  href={`/vendor/permissions?employeeId=${employee._id}`}
                  className="text-xs font-bold text-blue-600 hover:text-blue-800 transition flex items-center gap-1"
                >
                  <span>Edit Overrides</span>
                  <ExternalLink size={12} />
                </Link>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              {effectivePermissions.length === 0 ? (
                <p className="text-xs text-slate-400 italic">No capabilities currently assigned.</p>
              ) : (
                effectivePermissions.map((perm) => (
                  <span
                    key={perm}
                    className="px-2.5 py-1 rounded-xl text-xs font-semibold bg-slate-100 text-slate-800 border border-slate-200/60"
                  >
                    {perm}
                  </span>
                ))
              )}
            </div>

            {(permissionOverrides?.granted?.length > 0 || permissionOverrides?.revoked?.length > 0) && (
              <div className="pt-3 border-t border-slate-100 flex items-center gap-4 text-xs">
                {permissionOverrides?.granted?.length > 0 && (
                  <span className="text-emerald-700 font-medium">
                    +{permissionOverrides.granted.length} custom granted
                  </span>
                )}
                {permissionOverrides?.revoked?.length > 0 && (
                  <span className="text-rose-700 font-medium">
                    −{permissionOverrides.revoked.length} custom revoked
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Section 4: Assigned Work & Operational Scope */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-2xs space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Package size={13} className="text-slate-500" />
              <span>Assigned Workload & Fleet Resources</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/60">
                <span className="text-[10px] uppercase font-bold text-slate-400">Assigned Moves</span>
                <p className="text-base font-bold text-slate-900 mt-0.5">{assignedMoves.length} Moves</p>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/60">
                <span className="text-[10px] uppercase font-bold text-slate-400">Assigned Vehicles</span>
                <p className="text-base font-bold text-slate-900 mt-0.5">{assignedVehicles.length} Trucks</p>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/60">
                <span className="text-[10px] uppercase font-bold text-slate-400">Supervised Field Crew</span>
                <p className="text-base font-bold text-slate-900 mt-0.5">{assignedCrew.length} Workers</p>
              </div>
            </div>

            {/* Assigned Moves list preview */}
            {assignedMoves.length > 0 && (
              <div className="space-y-2 pt-2">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Active / Recent Move Allocations
                </span>
                <div className="space-y-1.5">
                  {assignedMoves.slice(0, 5).map((m: any) => (
                    <div
                      key={m._id}
                      className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/60 text-xs flex items-center justify-between"
                    >
                      <div>
                        <span className="font-semibold text-slate-800">
                          {m.customerId?.displayName || "Customer Move"}
                        </span>
                        <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                          Date: {m.scheduledDate ? new Date(m.scheduledDate).toLocaleDateString() : "—"}
                        </p>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold capitalize bg-blue-50 text-blue-700 border border-blue-200">
                        {m.status?.replace(/_/g, " ")}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Section 5: Recent Activity History */}
          <div id="activity-history" className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-2xs space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Activity size={13} className="text-slate-500" />
              <span>Recent Activity History</span>
            </h3>

            {auditTrail.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-2">No recent audit logs recorded for this employee.</p>
            ) : (
              <div className="space-y-2">
                {auditTrail.slice(0, 5).map((log: any) => (
                  <div
                    key={log._id}
                    className="p-3 rounded-xl bg-slate-50 border border-slate-200/60 text-xs flex items-start justify-between gap-3"
                  >
                    <div>
                      <span className="font-bold text-slate-800">{log.action?.replace(/_/g, " ")}</span>
                      <p className="text-slate-500 text-[11px] mt-0.5">{log.details || log.description}</p>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono shrink-0">
                      {log.createdAt ? new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ""}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column (4 cols): Supervisory Hierarchy & Security Credentials */}
        <div className="lg:col-span-4 space-y-6">
          {/* Reports To / Team Card */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-2xs space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <UserCheck size={13} className="text-slate-500" />
              <span>Supervisory Hierarchy</span>
            </h3>

            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/60 space-y-1 text-xs">
              <span className="text-[10px] font-bold uppercase text-slate-400">Reports Directly To</span>
              <p className="font-bold text-slate-900">
                {employee.reportsTo?.displayName || employee.reportsTo?.username || "Company Owner (Vendor Admin)"}
              </p>
              {employee.reportsTo?.phone && (
                <p className="font-mono text-slate-500 text-[11px]">{employee.reportsTo.phone}</p>
              )}
            </div>

            {/* Direct Reports */}
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-500 uppercase tracking-wider text-[11px]">
                  Direct Reports ({directReports.length})
                </span>
              </div>

              {directReports.length === 0 ? (
                <p className="text-xs text-slate-400 italic">No employees currently report to this staff member.</p>
              ) : (
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {directReports.map((dr: any) => (
                    <Link
                      key={dr._id}
                      href={`/vendor/employees/${dr._id}`}
                      className="p-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-100 flex items-center justify-between text-xs transition block"
                    >
                      <div>
                        <span className="font-semibold text-slate-800">{dr.displayName}</span>
                        <p className="text-[10px] text-slate-400 capitalize">{dr.employeeRole?.replace(/_/g, " ")}</p>
                      </div>
                      <span className="text-blue-600 font-bold text-xs">→</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Session & Security Credentials */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-2xs space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Lock size={13} className="text-slate-500" />
              <span>Session & Access Security</span>
            </h3>

            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-slate-500">Last Login:</span>
                <span className="font-mono font-semibold text-slate-800">
                  {employee.lastLogin ? new Date(employee.lastLogin).toLocaleString() : "Never logged in"}
                </span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-slate-500">Last Activity:</span>
                <span className="font-mono font-semibold text-slate-800">
                  {employee.lastActivity ? new Date(employee.lastActivity).toLocaleString() : "No active session"}
                </span>
              </div>
            </div>

            {/* Password Reset Action */}
            <div className="pt-2 border-t border-slate-100 space-y-2.5">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Dispatch Password Reset Link
              </span>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleGenerateResetLink("whatsapp")}
                  disabled={dispatchingToken}
                  className="px-2.5 py-1.5 rounded-xl text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <MessageCircle size={13} />
                  <span>WhatsApp</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleGenerateResetLink("copy")}
                  disabled={dispatchingToken}
                  className="px-2.5 py-1.5 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Copy size={13} />
                  <span>Copy Link</span>
                </button>
              </div>

              {tokenResult && (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-emerald-700">Token Generated</span>
                    <span className="text-[10px] text-slate-400">Expires in {tokenResult.expiresInMinutes}m</span>
                  </div>
                  <div className="p-2 bg-white rounded-lg border border-slate-200 font-mono text-[10px] break-all select-all text-slate-700">
                    {tokenResult.resetUrl}
                  </div>
                  <button
                    onClick={handleCopyLink}
                    className="w-full py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs flex items-center justify-center gap-1 cursor-pointer"
                  >
                    {copiedLink ? <Check size={13} /> : <Copy size={13} />}
                    <span>{copiedLink ? "Copied!" : "Copy Reset Link"}</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Edit Employee Modal */}
      {editModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/50 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-5 sm:p-6 max-w-md w-full my-auto space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-xl bg-blue-50 text-blue-600 border border-blue-200/60 flex items-center justify-center">
                  <Edit2 size={15} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Edit Employee Record</h3>
                  <p className="text-[11px] text-slate-500">Update staff details and operational role</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {editError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium flex items-center gap-2">
                <AlertCircle size={15} className="shrink-0 text-rose-600" />
                <span>{editError}</span>
              </div>
            )}

            <form onSubmit={handleSaveEdit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={editFormData.displayName}
                  onChange={(e) => setEditFormData({ ...editFormData, displayName: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-500 text-slate-800 outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Phone Number</label>
                <input
                  type="text"
                  required
                  value={editFormData.phone}
                  onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-500 text-slate-800 font-mono outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Assigned Operational Role</label>
                <select
                  value={editFormData.employeeRole}
                  onChange={(e) => setEditFormData({ ...editFormData, employeeRole: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-500 text-slate-800 font-semibold outline-none cursor-pointer"
                >
                  {availableRoles.length > 0 ? (
                    availableRoles.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name} {r.isCustom ? "(Custom Role)" : ""}
                      </option>
                    ))
                  ) : (
                    <option value={editFormData.employeeRole}>{editFormData.employeeRole}</option>
                  )}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Department</label>
                <input
                  type="text"
                  value={editFormData.department}
                  onChange={(e) => setEditFormData({ ...editFormData, department: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-500 text-slate-800 outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Account Status</label>
                <select
                  value={editFormData.accountStatus}
                  onChange={(e) => setEditFormData({ ...editFormData, accountStatus: e.target.value as any })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-500 text-slate-800 font-semibold outline-none cursor-pointer"
                >
                  <option value="active">Active Staff (Full Portal Access)</option>
                  <option value="suspended">Suspended / Inactive (Login Disabled)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
                  className="px-4 py-2 rounded-xl font-semibold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="px-4 py-2 rounded-xl font-semibold text-white bg-blue-600 hover:bg-blue-700 transition cursor-pointer flex items-center gap-1.5"
                >
                  {savingEdit && <RefreshCw size={13} className="animate-spin" />}
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
