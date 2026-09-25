"use client";

import { useState, useEffect, useMemo, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { fetchApi } from "@/lib/api";
import PageHeader from "../components/PageHeader";
import {
  ADMIN_SIDEBAR_MODULES,
  isAdminActionGranted,
  type AdminSidebarModuleDef,
  type AdminPermissionActionDef,
} from "@/lib/adminPermissionsDef";
import ModuleActionPermissionSelector from "@/components/permissions/ModuleActionPermissionSelector";
import {
  Shield,
  ShieldCheck,
  Users,
  Check,
  X as XIcon,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Store,
  UserCheck,
  FileCheck2,
  Package,
  MapPin,
  CalendarCheck,
  AlertTriangle,
  BarChart3,
  FileClock,
  Settings,
  ChevronRight,
  Info,
  RotateCcw,
  Save,
  ArrowLeft,
  ShieldAlert,
  Building2,
  Search,
  Filter,
} from "lucide-react";

const ADMIN_ICON_MAP: Record<string, any> = {
  Users,
  Store,
  UserCheck,
  FileCheck2,
  Package,
  MapPin,
  CalendarCheck,
  AlertTriangle,
  Shield,
  ShieldCheck,
  BarChart3,
  FileClock,
  Settings,
};

function AdminPermissionsContent() {
  const searchParams = useSearchParams();
  const employeeIdQuery = searchParams.get("employeeId");

  const [employees, setEmployees] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [selectedTargetType, setSelectedTargetType] = useState<"role" | "employee">(
    employeeIdQuery ? "employee" : "role"
  );
  const [selectedRoleId, setSelectedRoleId] = useState<string>("operations_manager");
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>(employeeIdQuery || "");

export default function AdminPermissionsPage() {
  const [permissions, setPermissions] = useState<PermissionItem[]>([]);
  const [rolePermissions, setRolePermissions] = useState<Record<string, string[]>>({
    admin: [],
    operations_manager: [],
    operations_executive: [],
    customer: [],
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const roles = [
    { id: "admin", label: "Admin", badge: "Supervisory" },
    { id: "operations_manager", label: "Ops Manager", badge: "Management" },
    { id: "operations_executive", label: "Ops Executive", badge: "Execution" },
    { id: "customer", label: "Customer", badge: "Client" },
  ];

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isAuthorized, setIsAuthorized] = useState<boolean>(true);

  // Load standard admin roles & employee roster
  const loadInitialData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Verify governance permission
      const meRes = await fetchApi<{ user: any }>("/auth/me");
      const user = meRes?.user;
      setCurrentUser(user);
      const isSuperAdmin =
        user?.phone === "+919876543210" || (user?.role === "admin" && user?.adminRole === "super_admin");
      const hasPerm =
        Array.isArray(user?.permissions) &&
        (user.permissions.includes("permissions:manage") || user.permissions.includes("*"));

      if (!isSuperAdmin && !hasPerm) {
        setIsAuthorized(false);
        setLoading(false);
        return;
      }

      const [empRes, rolesRes] = await Promise.all([
        fetchApi<{ employees: any[] }>("/admin/employees?limit=100"),
        fetchApi<{ roles: any[] }>("/admin/admin-roles"),
      ]);

      const empList = empRes.employees || [];
      const roleList = rolesRes.roles || [];

      // Deduplicate roles and employees by ID to guarantee unique React keys
      const uniqueRoles = Array.from(new Map(roleList.map((r: any) => [r.id, r])).values());
      const uniqueEmployees = Array.from(new Map(empList.map((e: any) => [e._id, e])).values());

      setEmployees(uniqueEmployees);
      setRoles(uniqueRoles);

      if (employeeIdQuery) {
        setSelectedTargetType("employee");
        setSelectedEmployeeId(employeeIdQuery);
      } else if (uniqueEmployees.length > 0 && !selectedEmployeeId) {
        setSelectedEmployeeId(uniqueEmployees[0]._id);
      }
      if (uniqueRoles.length > 0 && !selectedRoleId) {
        setSelectedRoleId(uniqueRoles[0].id || "operations_manager");
      }
    } catch (err: any) {
      setError(err.message || "Failed to load roles and platform staff roster");
    } finally {
      setLoading(false);
    }
  }, [selectedEmployeeId, selectedRoleId, employeeIdQuery]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  useEffect(() => {
    if (employeeIdQuery) {
      setSelectedTargetType("employee");
      setSelectedEmployeeId(employeeIdQuery);
    }
  }, [employeeIdQuery]);

  // Sync state whenever selected role changes
  useEffect(() => {
    if (selectedTargetType === "role" && selectedRoleId && roles.length > 0) {
      const matchedRole = roles.find((r) => r.id === selectedRoleId);
      setRoleDefaultPermissions(matchedRole?.permissions || []);
      setGrantedOverrides([]);
      setRevokedOverrides([]);
      setCurrentEmployee(null);
    }
  }, [selectedTargetType, selectedRoleId, roles]);

  // Sync state whenever selected employee changes
  useEffect(() => {
    if (selectedTargetType === "employee" && selectedEmployeeId) {
      let isSubscribed = true;
      const loadEmployeeDetail = async () => {
        try {
          setLoading(true);
          setError(null);
          const data = await fetchApi<{
            employee: any;
            roleDef: any;
            effectivePermissions: string[];
            permissionOverrides: { granted: string[]; revoked: string[] };
          }>(`/admin/employees/${selectedEmployeeId}`);

          if (!isSubscribed) return;

          setCurrentEmployee(data.employee);

          const matchedRole = roles.find((r) => r.id === data.employee.adminRole) || data.roleDef;
          setRoleDefaultPermissions(matchedRole?.permissions || []);

          const overrides = data.permissionOverrides || data.employee.permissionOverrides || { granted: [], revoked: [] };
          setGrantedOverrides(overrides.granted || []);
          setRevokedOverrides(overrides.revoked || []);
        } catch (err: any) {
          if (isSubscribed) setError(err.message || "Failed to fetch employee permissions");
        } finally {
          if (isSubscribed) setLoading(false);
        }
      };

      loadEmployeeDetail();
      return () => {
        isSubscribed = false;
      };
    }
  }, [selectedTargetType, selectedEmployeeId, roles]);

  // Effective permissions calculation: (Role Defaults + Granted) - Revoked
  const effectivePermissions = useMemo(() => {
    if (selectedTargetType === "role") {
      return roleDefaultPermissions;
    }
    const combined = Array.from(new Set([...roleDefaultPermissions, ...grantedOverrides]));
    return combined.filter((p) => !revokedOverrides.includes(p));
  }, [selectedTargetType, roleDefaultPermissions, grantedOverrides, revokedOverrides]);

  const isActionActive = (action: AdminPermissionActionDef): boolean => {
    return isAdminActionGranted(effectivePermissions, action);
  };

  const getActionState = (action: AdminPermissionActionDef) => {
    const isDefault = isAdminActionGranted(roleDefaultPermissions, action);
    const isGrantedOverride = grantedOverrides.includes(action.key);
    const isRevokedOverride = revokedOverrides.includes(action.key);

    if (selectedTargetType === "employee") {
      if (isRevokedOverride) return "revoked";
      if (isGrantedOverride) return "granted_override";
      if (isDefault) return "role_default";
      return "none";
    }

    return isDefault ? "role_default" : "none";
  };

  const handleToggleAction = (action: AdminPermissionActionDef) => {
    setError(null);
    setSuccessMessage(null);

    const permKey = action.key;
    const isCurrentlyActive = isActionActive(action);
    const isGrantedByRole = isAdminActionGranted(roleDefaultPermissions, action);

    if (selectedTargetType === "role") {
      setRoleDefaultPermissions((prev) => {
        if (isCurrentlyActive) {
          return prev.filter((p) => p !== permKey && (!action.aliases || !action.aliases.includes(p)));
        } else {
          return [...prev, permKey];
        }
      });
      return;
    }

    if (isCurrentlyActive) {
      if (isGrantedByRole) {
        setRevokedOverrides((prev) => Array.from(new Set([...prev, permKey])));
        setGrantedOverrides((prev) =>
          prev.filter((p) => p !== permKey && (!action.aliases || !action.aliases.includes(p)))
        );
      } else {
        setGrantedOverrides((prev) =>
          prev.filter((p) => p !== permKey && (!action.aliases || !action.aliases.includes(p)))
        );
      }
    } else {
      if (isGrantedByRole) {
        setRevokedOverrides((prev) =>
          prev.filter((p) => p !== permKey && (!action.aliases || !action.aliases.includes(p)))
        );
      } else {
        setGrantedOverrides((prev) => Array.from(new Set([...prev, permKey])));
        setRevokedOverrides((prev) =>
          prev.filter((p) => p !== permKey && (!action.aliases || !action.aliases.includes(p)))
        );
      }
    }
  };

  const handleResetOverrides = () => {
    setGrantedOverrides([]);
    setRevokedOverrides([]);
    setSuccessMessage("Overrides cleared. Permissions will now mirror base role defaults.");
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccessMessage(null);

      if (selectedTargetType === "employee") {
        if (!selectedEmployeeId) return;

        await fetchApi(`/admin/employees/${selectedEmployeeId}`, {
          method: "PATCH",
          body: JSON.stringify({
            permissionOverrides: {
              granted: grantedOverrides,
              revoked: revokedOverrides,
            },
          }),
        });

        setSuccessMessage(`Permissions successfully saved for ${currentEmployee?.displayName || "staff member"}.`);
      } else {
        await fetchApi(`/admin/roles/${selectedRoleId}`, {
          method: "PUT",
          body: JSON.stringify({
            permissions: roleDefaultPermissions,
          }),
        });

        setSuccessMessage(`Default capabilities updated for role "${selectedRoleId.replace(/_/g, " ")}".`);
      }

      // Refresh /auth/me to sync live state
      try {
        const meRes = await fetchApi<{ user: any }>("/auth/me");
        if (meRes?.user) {
          setCurrentUser(meRes.user);
          try {
            localStorage.setItem("auth_user", JSON.stringify(meRes.user));
          } catch (_) {}
        }
      } catch (_) {}

      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("admin-permissions-updated"));
        window.dispatchEvent(new Event("permissions-updated"));
      }
    } catch (err: any) {
      setError(err.message || "Failed to save permissions");
    } finally {
      setSaving(false);
    }
  };

  const platformCompanyName =
    currentEmployee?.companyName || "Package Movers Platform Administration";

  if (!isAuthorized) {
    return (
      <div className="p-8 sm:p-12 max-w-md mx-auto text-center space-y-4 bg-white rounded-3xl shadow-sm border border-slate-200/80 my-12 animate-scaleUp font-sans">
        <div className="h-12 w-12 rounded-2xl bg-amber-50 text-amber-600 mx-auto flex items-center justify-center border border-amber-200">
          <ShieldAlert size={24} />
        </div>
        <div>
          <h3 className="text-base font-bold text-slate-900">Access Restricted</h3>
          <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
            Platform Permissions & Role Access Governance is strictly reserved for Platform Super Administrators and Authorized Governance Officers.
          </p>
        </div>
        <div className="pt-2">
          <Link
            href="/admin/my-permissions"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 transition"
          >
            <ShieldCheck size={14} />
            <span>View My Capabilities</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 font-sans text-slate-900 pb-12">
      <PageHeader
        title="Platform Permissions & Access Governance"
        description="Configure platform administrative role defaults and individual officer capability overrides mapped directly to platform sidebar modules."
      >
        <div className="flex items-center gap-2">
          <Link
            href="/admin/my-permissions"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200/80 shadow-2xs transition cursor-pointer"
          >
            <ShieldCheck size={14} className="text-blue-600" />
            <span>My Capabilities</span>
          </Link>

          <button
            onClick={loadInitialData}
            disabled={loading || saving}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200/80 shadow-2xs transition cursor-pointer disabled:opacity-50"
          >
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
            <span>Refresh</span>
          </button>
        </div>
      </PageHeader>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-3 text-rose-700 text-xs shadow-2xs">
          <AlertCircle size={18} className="shrink-0 text-rose-600" />
          <span className="font-medium">{error}</span>
        </div>
      )}

      {successMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between text-emerald-800 text-xs shadow-2xs animate-fade-in">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
            <span className="font-semibold">{successMessage}</span>
          </div>
          <button
            onClick={() => setSuccessMessage(null)}
            className="text-emerald-700 hover:text-emerald-900 font-bold px-2 py-0.5 cursor-pointer"
          >
            ×
          </button>
        </div>
      )}

      {/* Distinction Top Bar: Base Role Permissions vs. Individual Employee Permissions */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-2xs">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="inline-flex p-1 bg-slate-100 rounded-xl">
              <button
                type="button"
                onClick={() => setSelectedTargetType("role")}
                className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  selectedTargetType === "role"
                    ? "bg-white text-slate-900 shadow-2xs ring-1 ring-slate-200"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <Shield size={14} className="text-blue-600" />
                  <span>1. Base Role Template</span>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setSelectedTargetType("employee")}
                className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  selectedTargetType === "employee"
                    ? "bg-white text-slate-900 shadow-2xs ring-1 ring-slate-200"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <Users size={14} className="text-emerald-600" />
                  <span>2. Individual Officer Overrides</span>
                </div>
              </button>
            </div>

            <div className="flex items-center gap-2 min-w-[290px]">
              {selectedTargetType === "role" ? (
                <div className="w-full">
                  <select
                    value={selectedRoleId}
                    onChange={(e) => setSelectedRoleId(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition cursor-pointer"
                  >
                    {roles.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name} ({r.permissions?.length || 0} default capabilities)
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                modules.map((moduleName) => {
                  const modulePerms = permissions.filter((p) => p.module === moduleName);
                  return (
                    <Fragment key={moduleName}>
                      {/* Module header row */}
                      <tr className="bg-[#EEF2F6] border-y border-[#D9E2EC]/70">
                        <td
                          colSpan={6}
                          className="py-2 px-4 text-[11px] font-bold uppercase tracking-wider text-[#1E293B]"
                        >
                          {moduleName}
                        </td>
                      </tr>

                      {modulePerms.map((perm) => (
                        <tr key={perm.id} className="hover:bg-[#EEF2F6]/70 transition-colors">
                          <td className="py-2.5 px-4">
                            <div className="font-semibold text-[#1E293B]">{perm.name}</div>
                            <code className="text-[10px] text-[#64748B] font-mono">{perm.id}</code>
                          </td>
                          <td className="py-2.5 px-4 text-[#64748B] hidden md:table-cell text-[11px]">
                            {perm.description}
                          </td>

                          {roles.map((role) => {
                            const isGranted = (rolePermissions[role.id] || []).includes(perm.id);
                            const isUpdating = updatingKey === `${role.id}:${perm.id}`;
                            const isLocked = role.id === "admin" && perm.id === "permissions:manage";

                            return (
                              <td key={role.id} className="py-2.5 px-3 text-center align-middle">
                                {isLocked ? (
                                  <span
                                    className="inline-flex items-center justify-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-teal-50 text-teal-800 border border-teal-200/80 cursor-not-allowed"
                                    title="Root administrator privilege (Locked)"
                                  >
                                    <Lock size={10} className="text-[#14B8A6]" />
                                    Allowed
                                  </span>
                                ) : (
                                  <button
                                    onClick={() => handleTogglePermission(role.id, perm.id, isGranted)}
                                    disabled={isUpdating}
                                    className={`inline-flex items-center justify-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-medium transition cursor-pointer border ${
                                      isGranted
                                        ? "bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100 font-semibold"
                                        : "bg-rose-50 text-rose-600 border-rose-200 hover:bg-rose-100 font-semibold"
                                    } ${isUpdating ? "opacity-50 pointer-events-none" : ""}`}
                                    title={`Click to ${isGranted ? "revoke" : "grant"} permission for ${role.label}`}
                                  >
                                    {isUpdating ? (
                                      <RefreshCw size={10} className={`animate-spin ${isGranted ? "text-emerald-600" : "text-rose-600"}`} />
                                    ) : isGranted ? (
                                      <Check size={11} className="text-emerald-600" />
                                    ) : (
                                      <X size={11} className="text-rose-600" />
                                    )}
                                    <span>{isGranted ? "Allowed" : "Restricted"}</span>
                                  </button>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </Fragment>
                  );
                })
              )}
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {selectedTargetType === "employee" && (grantedOverrides.length > 0 || revokedOverrides.length > 0) && (
              <button
                type="button"
                onClick={handleResetOverrides}
                disabled={saving}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer"
              >
                <RotateCcw size={13} />
                <span>Reset to Role Defaults</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-xs hover:shadow transition cursor-pointer disabled:opacity-50"
            >
              {saving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
              <span>Save Permissions</span>
            </button>
          </div>
        </div>
      </div>

      {/* INDIVIDUAL OFFICER MANAGEMENT CARD (Explicitly displaying Employee Name, Employee Role, Company, Effective Permission Summary) */}
      {selectedTargetType === "employee" && currentEmployee && (
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-2xs space-y-5">
          <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
              <Link href="/admin/employees" className="hover:text-[#2563EB] transition flex items-center gap-1">
                <Users size={13} />
                <span>Platform Staff</span>
              </Link>
              <span>/</span>
              <Link
                href={`/admin/employees/${currentEmployee._id}`}
                className="hover:text-[#2563EB] transition font-semibold text-slate-700"
              >
                {currentEmployee.displayName || currentEmployee.username}
              </Link>
              <span>/</span>
              <span className="text-[#2563EB] font-bold">Permissions Governance</span>
            </div>

            <Link
              href={`/admin/employees/${currentEmployee._id}`}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-[#2563EB] transition"
            >
              <ArrowLeft size={13} />
              <span>Back to Officer Profile</span>
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Field 1: Employee Name */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Employee Name</div>
              <div className="text-sm font-black text-slate-900 flex items-center gap-2">
                <div className="h-6 w-6 rounded-full bg-blue-100 text-[#2563EB] text-[10px] font-bold flex items-center justify-center shrink-0">
                  {(currentEmployee.displayName || currentEmployee.username || "A")[0].toUpperCase()}
                </div>
                <span className="truncate">{currentEmployee.displayName || currentEmployee.username}</span>
              </div>
              <div className="text-[11px] text-slate-500 font-mono">{currentEmployee.phone}</div>
            </div>

            {/* Field 2: Employee Role */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Employee Role</div>
              <div className="text-sm font-black text-slate-900 flex items-center gap-2">
                <Shield size={14} className="text-blue-600 shrink-0" />
                <span className="capitalize">{(currentEmployee.adminRole || "operations_manager").replace(/_/g, " ")}</span>
              </div>
              <div className="text-[11px] text-slate-500">Administrative Designation</div>
            </div>

            {/* Field 3: Company */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Company</div>
              <div className="text-sm font-black text-slate-900 flex items-center gap-1.5 truncate">
                <Building2 size={14} className="text-blue-600 shrink-0" />
                <span className="truncate">{platformCompanyName}</span>
              </div>
              <div className="text-[11px] text-slate-500">Platform Headquarters</div>
            </div>

            {/* Field 4: Effective Permission Summary */}
            <div className="p-4 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50/50 border border-blue-100 space-y-1">
              <div className="text-[11px] font-bold uppercase tracking-wider text-blue-700">Effective Permission Summary</div>
              <div className="text-base font-black text-blue-900">
                {effectivePermissions.length} <span className="text-xs font-semibold text-blue-700">Active Capabilities</span>
              </div>
              <div className="text-[10px] text-slate-600 flex items-center gap-1.5 pt-0.5">
                <span className="font-semibold text-slate-800">{roleDefaultPermissions.length} base</span>
                <span>•</span>
                <span className="font-semibold text-emerald-700">+{grantedOverrides.length} granted</span>
                <span>•</span>
                <span className="font-semibold text-rose-700">-{revokedOverrides.length} revoked</span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 text-xs border-t border-slate-100 text-slate-500">
            <div className="flex items-center gap-2">
              <Info size={13} className="text-blue-500 shrink-0" />
              <span>
                <strong>Effective Permissions Formula:</strong> Effective = (Base Role Defaults ∪ Custom Granted) ∖ Custom Revoked
              </span>
            </div>
            <div className="text-[11px] text-slate-400">
              Personal overrides adjust this platform officer without altering global role definitions.
            </div>
          </div>
        </div>
      )}

      {/* BASE ROLE MANAGEMENT CARD */}
      {selectedTargetType === "role" && (
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs text-slate-500 mb-1 font-medium">
                <Shield size={13} className="text-blue-600" />
                <span>Base Role Configuration Template</span>
              </div>
              <h3 className="text-lg font-black text-slate-900 tracking-tight capitalize">
                Role: {selectedRoleId.replace(/_/g, " ")}
              </h3>
              <p className="text-xs text-slate-600 mt-0.5">
                Organization: <strong className="text-slate-900">{platformCompanyName}</strong> • Default Capabilities:{" "}
                <strong className="text-blue-700">{roleDefaultPermissions.length} enabled</strong>
              </p>
            </div>

            <div className="px-3 py-2 rounded-xl bg-amber-50 border border-amber-200/80 text-[11px] text-amber-800 max-w-sm">
              <span className="font-bold">Template Impact:</span> Changes made here apply by default to all platform staff assigned the{" "}
              <strong>{selectedRoleId.replace(/_/g, " ")}</strong> role who do not have individual overrides.
            </div>
          </div>
        </div>
      )}

      {/* Enterprise Reusable Two-Column Module Action Permission Selector */}
      {selectedTargetType === "role" ? (
        <ModuleActionPermissionSelector
          modules={ADMIN_SIDEBAR_MODULES}
          mode="role"
          selectedPermissions={roleDefaultPermissions}
          onTogglePermission={(key, nextChecked) => {
            setRoleDefaultPermissions((prev) =>
              nextChecked ? [...prev.filter((k) => k !== key), key] : prev.filter((k) => k !== key)
            );
          }}
          onSelectAllModule={(moduleId) => {
            const mod = ADMIN_SIDEBAR_MODULES.find((m) => m.id === moduleId);
            if (!mod) return;
            const modKeys = mod.actions.map((a) => a.key);
            setRoleDefaultPermissions((prev) => Array.from(new Set([...prev, ...modKeys])));
          }}
          onClearModule={(moduleId) => {
            const mod = ADMIN_SIDEBAR_MODULES.find((m) => m.id === moduleId);
            if (!mod) return;
            const modKeys = new Set(mod.actions.map((a) => a.key));
            setRoleDefaultPermissions((prev) => prev.filter((k) => !modKeys.has(k)));
          }}
        />
      ) : (
        <ModuleActionPermissionSelector
          modules={ADMIN_SIDEBAR_MODULES}
          mode="employee_override"
          roleDefaultPermissions={roleDefaultPermissions}
          grantedOverrides={grantedOverrides}
          revokedOverrides={revokedOverrides}
          onToggleAction={handleToggleAction}
        />
      )}
    </div>
  );
}

export default function AdminPermissionsPage() {
  return (
    <Suspense
      fallback={
        <div className="p-12 text-center text-xs text-slate-500 flex flex-col items-center justify-center gap-2">
          <RefreshCw size={20} className="animate-spin text-[#2563EB]" />
          <span>Loading platform staff permissions console...</span>
        </div>
      }
    >
      <AdminPermissionsContent />
    </Suspense>
  );
}
