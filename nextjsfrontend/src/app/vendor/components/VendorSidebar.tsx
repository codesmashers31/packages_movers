"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { fetchApi } from "@/lib/api";
import {
  LayoutDashboard,
  Users,
  Shield,
  KeyRound,
  Package,
  Layers,
  MapPin,
  Building2,
  CalendarCheck,
  Truck,
  HardHat,
  Car,
  BarChart3,
  FileClock,
  FileText,
  TrendingUp,
  LogOut,
  X,
  ShieldAlert,
  ShieldCheck,
  Lock,
  ArrowRight,
} from "lucide-react";

interface VendorSidebarProps {
  onClose?: () => void;
}

export const ROUTE_PERMISSION_MAP: Record<string, string[]> = {
  "/vendor": ["*"], // Dashboard is accessible to all authenticated vendor staff
  "/vendor/my-permissions": ["*"], // Personal inspection accessible to all authenticated staff
  "/vendor/profile": ["*"], // Personal profile accessible to all authenticated staff
  "/vendor/company-profile": [
    "company_profile:view",
    "documents:view",
    "Document Submissions",
    "Regulatory Status Monitoring",
  ],
  "/vendor/documents": [
    "company_profile:view",
    "documents:view",
  ],
  "/vendor/demand": [
    "demand:view",
    "demand:export",
    "Review Available Customer Leads",
    "Quotation Performance & Insights",
    "Reports & Performance Analytics",
  ],
  "/vendor/quotations": [
    "quotations:view",
    "quotations:create",
    "quotations:edit",
    "quotations:cancel",
    "Create & Submit Formal Quotations",
    "Review Available Customer Leads",
    "Quotation Performance & Insights",
  ],
  "/vendor/bookings": [
    "bookings:view",
    "bookings:dispatch",
    "bookings:update_status",
    "bookings:verify_delivery",
    "View & Dispatch Bookings",
    "Bookings & Job Dispatch",
    "Update Move Progression Milestones",
    "Enter Recipient Delivery Verification Code",
  ],
  "/vendor/tracking": [
    "tracking:view",
    "tracking:contact_crew",
    "tracking:update_status",
    "Update Move Progression Milestones",
    "View & Dispatch Bookings",
    "Bookings & Job Dispatch",
    "Fleet & Vehicle Operations",
  ],
  "/vendor/workers": [
    "workers:view",
    "workers:assign",
    "workers:manage",
    "Assign Available Workers & Crew",
    "View Crew Attendance & Performance",
  ],
  "/vendor/vehicles": [
    "vehicles:view",
    "vehicles:assign",
    "vehicles:maintenance",
    "Fleet & Vehicle Operations",
    "Assign Transport Trucks to Moves",
    "Vehicle Inspection & Maintenance Tracking",
  ],
  "/vendor/services": [
    "services:view",
    "services:manage",
    "Service Catalog Configuration",
    "Custom Specialized Services",
  ],
  "/vendor/packages": [
    "packages:view",
    "packages:manage",
    "Service Catalog Configuration",
  ],
  "/vendor/service-areas": [
    "service_areas:view",
    "service_areas:manage",
    "Coverage Areas Configuration",
  ],
  "/vendor/employees": [
    "employees:view",
    "employees:create",
    "employees:edit",
    "employees:status",
    "Manage Employees & Crew",
  ],
  "/vendor/roles": [
    "roles:view",
    "roles:manage",
    "Manage Employees & Crew",
  ],
  "/vendor/permissions": [
    "permissions:manage",
  ],
  "/vendor/reports": [
    "reports:view",
    "reports:export",
    "Reports & Performance Analytics",
  ],
  "/vendor/audit-logs": [
    "audit_logs:view",
    "Operational Audit Logs",
  ],
};

export default function VendorSidebar({ onClose }: VendorSidebarProps) {
  const pathname = usePathname();
  const [userName, setUserName] = useState<string>("Staff Member");
  const [userPhone, setUserPhone] = useState<string>("");
  const [userRole, setUserRole] = useState<string>("");
  const [employeeRole, setEmployeeRole] = useState<string>("");
  const [roleDisplayName, setRoleDisplayName] = useState<string>("");
  const [userPermissions, setUserPermissions] = useState<string[]>([]);
  const [activeCompanyName, setActiveCompanyName] = useState<string>("");
  const [vendorStatus, setVendorStatus] = useState<string>("APPROVED");
  const [verificationAccess, setVerificationAccess] = useState<string>("ALLOWED");
  const [verificationStatus, setVerificationStatus] = useState<string>("APPROVED");
  const [blockingItem, setBlockingItem] = useState<string | null>(null);
  const [blockingReason, setBlockingReason] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);

  const syncLiveVendorUser = () => {
    if (typeof window === "undefined") return;
    const token = localStorage.getItem("auth_token");
    if (!token) return;
    fetchApi<{ user: any }>("/auth/me")
      .then((res) => {
        if (res?.user) {
          const u = res.user;
          const existingStr = localStorage.getItem("auth_user");
          const existing = existingStr ? JSON.parse(existingStr) : {};
          const merged = { ...existing, ...u, id: u._id || u.id };
          localStorage.setItem("auth_user", JSON.stringify(merged));
          if (u.vendorId) {
            localStorage.setItem("active_vendor_id", String(u.vendorId));
          }
          setCurrentUser(merged);
          setUserName(u.displayName || u.username || "Vendor Partner");
          setUserPhone(u.phone || "");
          setUserRole(u.role || "vendor");
          const empR = u.employeeRole || (u.role === "vendor" ? "vendor" : "worker");
          setEmployeeRole(empR);

          if (u.companyVerificationAccess) {
            setVerificationAccess(u.companyVerificationAccess);
            localStorage.setItem("active_vendor_verification_access", u.companyVerificationAccess);
          }
          if (u.companyVerificationStatus) {
            setVerificationStatus(u.companyVerificationStatus);
            localStorage.setItem("active_vendor_verification_status", u.companyVerificationStatus);
          }
          if (u.vendorStatus) {
            setVendorStatus(u.vendorStatus);
            localStorage.setItem("active_vendor_status", u.vendorStatus);
          }
          if (u.companyVerification?.blockingItem) {
            setBlockingItem(u.companyVerification.blockingItem);
          }
          if (u.companyVerification?.reason) {
            setBlockingReason(u.companyVerification.reason);
          }

          // Resolve human-readable role name and fallback permissions from /vendor/roles
          fetchApi<{ roles: any[] }>("/vendor/roles")
            .then((roleRes) => {
              if (roleRes?.roles) {
                const norm = (s: string) => (s || "").toLowerCase().replace(/[^a-z0-9]/g, "");
                const match = roleRes.roles.find(
                  (r) =>
                    (r.id && norm(r.id) === norm(empR)) ||
                    (r.name && norm(r.name) === norm(empR))
                );
                if (match?.name) {
                  setRoleDisplayName(match.name);
                }
                if ((!u.permissions || u.permissions.length === 0) && match && Array.isArray(match.permissions)) {
                  setUserPermissions(match.permissions);
                }
              }
            })
            .catch(() => {});

          if (Array.isArray(u.permissions) && u.permissions.length > 0) {
            setUserPermissions(u.permissions);
          } else if (Array.isArray(u.resolvedPermissions) && u.resolvedPermissions.length > 0) {
            setUserPermissions(u.resolvedPermissions);
          }
        }
      })
      .catch(() => {});

    // Sync vendor verification status
    fetchApi<{ vendor?: any; verificationDecision?: any }>("/vendor/profile")
      .then((vRes) => {
        if (vRes?.vendor) {
          if (vRes.vendor.status) {
            setVendorStatus(vRes.vendor.status);
            localStorage.setItem("active_vendor_status", vRes.vendor.status);
          }
          if (vRes.vendor.verificationAccess) {
            setVerificationAccess(vRes.vendor.verificationAccess);
            localStorage.setItem("active_vendor_verification_access", vRes.vendor.verificationAccess);
          }
          if (vRes.vendor.verificationStatus) {
            setVerificationStatus(vRes.vendor.verificationStatus);
            localStorage.setItem("active_vendor_verification_status", vRes.vendor.verificationStatus);
          }
          if (vRes.vendor.blockingItem) {
            setBlockingItem(vRes.vendor.blockingItem);
          }
          if (vRes.vendor.verificationReason) {
            setBlockingReason(vRes.vendor.verificationReason);
          }
          if (vRes.vendor.businessName) {
            setActiveCompanyName(vRes.vendor.businessName);
            localStorage.setItem("active_vendor_name", vRes.vendor.businessName);
          }
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const storedStatus = localStorage.getItem("active_vendor_status");
        if (storedStatus) setVendorStatus(storedStatus);

        const storedAccess = localStorage.getItem("active_vendor_verification_access");
        if (storedAccess) setVerificationAccess(storedAccess);

        const storedVerStatus = localStorage.getItem("active_vendor_verification_status");
        if (storedVerStatus) setVerificationStatus(storedVerStatus);

        const storedCompName = localStorage.getItem("active_vendor_name");
        if (storedCompName) setActiveCompanyName(storedCompName);

        const storedUser = localStorage.getItem("auth_user");
        if (storedUser) {
          const user = JSON.parse(storedUser);
          setCurrentUser(user);
          setUserName(user.displayName || user.username || "Vendor Partner");
          setUserPhone(user.phone || "");
          setUserRole(user.role || "vendor");
          const empR = user.employeeRole || (user.role === "vendor" ? "vendor" : "worker");
          setEmployeeRole(empR);

          if (Array.isArray(user.permissions) && user.permissions.length > 0) {
            setUserPermissions(user.permissions);
          } else if (Array.isArray(user.resolvedPermissions) && user.resolvedPermissions.length > 0) {
            setUserPermissions(user.resolvedPermissions);
          }
        }
      } catch (e) {
        // Fallback
      }

      syncLiveVendorUser();

      const onFocus = () => syncLiveVendorUser();
      window.addEventListener("focus", onFocus);
      window.addEventListener("vendor-permissions-updated", onFocus);
      window.addEventListener("vendor-status-updated", onFocus);
      window.addEventListener("permissions-updated", onFocus);
      const interval = setInterval(syncLiveVendorUser, 30000);

      return () => {
        window.removeEventListener("focus", onFocus);
        window.removeEventListener("vendor-permissions-updated", onFocus);
        window.removeEventListener("vendor-status-updated", onFocus);
        window.removeEventListener("permissions-updated", onFocus);
        clearInterval(interval);
      };
    }
  }, []);

  const handleSignOut = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("auth_token");
      localStorage.removeItem("auth_user");
      localStorage.removeItem("active_vendor_id");
      localStorage.removeItem("active_vendor_name");
      localStorage.removeItem("active_vendor_status");
      localStorage.removeItem("active_vendor_verification_access");
      localStorage.removeItem("active_vendor_verification_status");
      localStorage.removeItem("active_vendor_blocking_item");
      localStorage.removeItem("active_vendor_review_reason");
      window.location.href = "/vendor/login";
    }
  };

  const isVendorOwner = userRole === "vendor" || userPermissions.includes("*");
  const activePermsCount = isVendorOwner ? "All Access" : `${userPermissions.length} Active`;
  const isApproved = vendorStatus === "APPROVED" && verificationAccess !== "RESTRICTED";

  const navSections = useMemo(
    () => [
      {
        title: "Overview",
        items: [
          { label: "Dashboard", href: "/vendor", icon: LayoutDashboard, isOperational: true },
          {
            label: "My Role & Permissions",
            href: "/vendor/my-permissions",
            icon: ShieldCheck,
            badge: activePermsCount,
            isOperational: false,
          },
        ],
      },
      {
        title: "Move Operations",
        items: [
          { label: "Demand Insights", href: "/vendor/demand", icon: TrendingUp, isOperational: true },
          { label: "Quotations", href: "/vendor/quotations", icon: FileText, isOperational: true },
          { label: "Bookings", href: "/vendor/bookings", icon: CalendarCheck, isOperational: true },
          { label: "Live Tracking", href: "/vendor/tracking", icon: Truck, isOperational: true },
          { label: "Crew Workers", href: "/vendor/workers", icon: HardHat, isOperational: true },
          { label: "Fleet Vehicles", href: "/vendor/vehicles", icon: Car, isOperational: true },
        ],
      },
      {
        title: "Marketplace & Services",
        items: [
          { label: "Services Catalog", href: "/vendor/services", icon: Layers, isOperational: true },
          { label: "Moving Packages", href: "/vendor/packages", icon: Package, isOperational: true },
          { label: "Service Areas", href: "/vendor/service-areas", icon: MapPin, isOperational: true },
        ],
      },
      {
        title: "Company & Verification",
        items: [
          {
            label: "Company Profile",
            href: "/vendor/company-profile",
            icon: Building2,
            isOperational: false,
            badge: !isApproved
              ? verificationStatus === "CHANGES_REQUESTED"
                ? "Action Req"
                : verificationStatus === "SUSPENDED" || vendorStatus === "SUSPENDED"
                ? "Suspended"
                : verificationStatus === "REJECTED"
                ? "Rejected"
                : verificationStatus === "PENDING_REVIEW"
                ? "In Review"
                : "Pending"
              : undefined,
            badgeColor: !isApproved
              ? verificationStatus === "CHANGES_REQUESTED"
                ? "amber"
                : verificationStatus === "SUSPENDED" || vendorStatus === "SUSPENDED" || verificationStatus === "REJECTED"
                ? "rose"
                : "blue"
              : undefined,
          },
        ],
      },
      {
        title: "Team & Access Control",
        items: [
          { label: "Employees", href: "/vendor/employees", icon: Users, isOperational: true },
          { label: "Roles & Rules", href: "/vendor/roles", icon: Shield, isOperational: true },
          { label: "Permissions", href: "/vendor/permissions", icon: KeyRound, isOperational: true },
        ],
      },
      {
        title: "Analytics & System",
        items: [
          { label: "Business Reports", href: "/vendor/reports", icon: BarChart3, isOperational: true },
          { label: "Activity Logs", href: "/vendor/audit-logs", icon: FileClock, isOperational: true },
        ],
      },
    ],
    [activePermsCount, isApproved, vendorStatus, verificationStatus]
  );

  // State for lightweight locked feature modal
  const [lockedModalInfo, setLockedModalInfo] = useState<{
    label: string;
    icon: any;
    href: string;
    isLocked: boolean;
    reasonType: "COMPANY_VERIFICATION" | "EMPLOYEE_PERMISSION" | "NONE";
    title: string;
    message: string;
    blockingItem?: string | null;
    blockingReason?: string | null;
    ctaText: string;
    ctaHref: string;
  } | null>(null);

  // Remediation and identity routes are ALWAYS accessible to all authenticated vendor staff
  const remediationHrefs = useMemo(
    () => [
      "/vendor",
      "/vendor/company-profile",
      "/vendor/my-permissions",
      "/vendor/profile",
      "/vendor/documents",
    ],
    []
  );

  // Dynamic Allowed Items based on dynamic permissions from DB when approved
  const employeePermittedHrefs = useMemo(() => {
    // 1. Vendor owner and platform admin have full access to all modules
    if (userRole === "vendor" || userRole === "admin") {
      return [...Object.keys(ROUTE_PERMISSION_MAP), "/vendor/permissions"];
    }

    // 2. Wildcard permission grants full access
    if (userPermissions.includes("*")) {
      return [...Object.keys(ROUTE_PERMISSION_MAP), "/vendor/permissions"];
    }

    // 3. Match against dynamic permissions assigned to the employee
    const baseAlwaysAllowed = ["/vendor", "/vendor/my-permissions", "/vendor/profile", "/vendor/company-profile", "/vendor/documents"];
    if (userPermissions.length > 0) {
      const allowed = Object.keys(ROUTE_PERMISSION_MAP).filter((href) => {
        if (baseAlwaysAllowed.includes(href)) return true;
        const required = ROUTE_PERMISSION_MAP[href];
        return required && required.some((perm) => userPermissions.includes(perm));
      });
      return [...allowed, ...baseAlwaysAllowed];
    }

    // 4. Fallback for unconfigured roles (strictly matching system role key)
    const norm = (employeeRole || "").toLowerCase().trim();
    if (norm === "manager" || norm === "operational_manager") {
      return [...Object.keys(ROUTE_PERMISSION_MAP)];
    }
    if (norm === "hr") {
      return ["/vendor", "/vendor/my-permissions", "/vendor/profile", "/vendor/company-profile", "/vendor/documents", "/vendor/employees", "/vendor/roles", "/vendor/reports", "/vendor/audit-logs"];
    }
    if (norm === "lead_estimator" || norm.includes("estimate") || norm.includes("quote")) {
      return ["/vendor", "/vendor/my-permissions", "/vendor/profile", "/vendor/company-profile", "/vendor/documents", "/vendor/demand", "/vendor/quotations"];
    }
    if (norm === "fleet_supervisor" || norm.includes("fleet") || norm.includes("transport")) {
      return ["/vendor", "/vendor/my-permissions", "/vendor/profile", "/vendor/company-profile", "/vendor/documents", "/vendor/bookings", "/vendor/tracking", "/vendor/workers", "/vendor/vehicles"];
    }
    return ["/vendor", "/vendor/my-permissions", "/vendor/profile", "/vendor/company-profile", "/vendor/documents", "/vendor/bookings", "/vendor/vehicles"];
  }, [userRole, userPermissions, employeeRole]);

  // Dual-reason locking evaluator
  const getLockDecision = (item: { label: string; href: string; isOperational?: boolean }) => {
    // 1. Remediation and identity routes are always accessible
    if (remediationHrefs.includes(item.href)) {
      return {
        isLocked: false,
        reasonType: "NONE" as const,
        title: "",
        message: "",
        ctaText: "",
        ctaHref: "",
      };
    }

    // 2. Reason A: Company Verification Gate
    if (!isApproved) {
      return {
        isLocked: true,
        reasonType: "COMPANY_VERIFICATION" as const,
        title: "Operational Access Restricted",
        message: `Complete company verification to access ${item.label}.`,
        blockingItem: blockingItem || null,
        blockingReason: blockingReason || null,
        ctaText: "Review Company Profile",
        ctaHref: "/vendor/company-profile",
      };
    }

    // 3. Reason B: Employee Permission
    if (!employeePermittedHrefs.includes(item.href)) {
      return {
        isLocked: true,
        reasonType: "EMPLOYEE_PERMISSION" as const,
        title: "Access Restricted",
        message: `You do not have permission to access ${item.label}. Contact your carrier administrator to update your role permissions.`,
        ctaText: "View My Role & Permissions",
        ctaHref: "/vendor/my-permissions",
      };
    }

    return {
      isLocked: false,
      reasonType: "NONE" as const,
      title: "",
      message: "",
      ctaText: "",
      ctaHref: "",
    };
  };

  return (
    <div className="h-full flex flex-col bg-white border-r border-slate-200/80 w-64 select-none font-sans overflow-hidden">
      {/* Brand Header */}
      <div className="h-14 px-4 flex items-center justify-between border-b border-slate-200/80 shrink-0 bg-white">
        <Link href="/vendor" className="flex items-center gap-2.5 min-w-0">
          <div className="h-8 w-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-xs shadow-xs ring-1 ring-blue-600/20 shrink-0">
            {activeCompanyName ? activeCompanyName.charAt(0).toUpperCase() : "PM"}
          </div>
          <div className="min-w-0 pr-1">
            <p className="text-xs font-bold text-slate-900 tracking-tight leading-none truncate">
              {activeCompanyName || "Package Mover"}
            </p>
            <p className="text-[10px] text-blue-600 font-bold uppercase tracking-wider leading-none mt-1">
              Carrier Console
            </p>
          </div>
        </Link>
        {onClose && (
          <button
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-xl text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Verification Gate Restricted Pill/Banner */}
      {!isApproved && (
        <div className="mx-3 mt-2.5 p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-[11px] space-y-1">
          <div className="flex items-center gap-1.5">
            <Lock size={13} className="text-amber-700 shrink-0" />
            <span className="font-bold uppercase tracking-wider text-[10px] text-amber-800">
              Company Access: RESTRICTED
            </span>
          </div>
          <p className="text-amber-700 text-[10px] leading-tight">
            {blockingItem ? `Blocking item: ${blockingItem}` : "Compliance review required by administration."}
          </p>
          <Link
            href="/vendor/company-profile"
            className="inline-block text-[10px] font-semibold text-blue-700 underline hover:text-blue-900 mt-0.5"
          >
            Review Company Profile &rarr;
          </Link>
        </div>
      )}

      {/* Navigation list */}
      <nav className="flex-1 px-3 py-3 space-y-3.5 overflow-y-auto scrollbar-none">
        {navSections.map((section) => (
          <div key={section.title} className="space-y-1">
            <p className="px-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              {section.title}
            </p>
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const Icon = item.icon;
                const lockDecision = getLockDecision(item);
                const isActive =
                  item.href === "/vendor"
                    ? pathname === "/vendor"
                    : pathname.startsWith(item.href);

                if (lockDecision.isLocked) {
                  return (
                    <button
                      key={item.label}
                      type="button"
                      onClick={() =>
                        setLockedModalInfo({
                          label: item.label,
                          icon: item.icon,
                          href: item.href,
                          ...lockDecision,
                        })
                      }
                      className="w-full text-left group flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs transition-colors duration-150 text-slate-600 hover:text-slate-900 hover:bg-slate-50 border border-transparent font-medium cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Icon
                          size={15}
                          className="shrink-0 text-slate-400 group-hover:text-slate-600 transition-colors"
                        />
                        <span className="truncate leading-tight text-xs text-slate-700 group-hover:text-slate-900">
                          {item.label}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {(item as any).badge && (
                          <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200/60 shrink-0">
                            {(item as any).badge}
                          </span>
                        )}
                        <span
                          title={lockDecision.message}
                          className="flex items-center text-slate-400 group-hover:text-slate-600 transition-colors"
                        >
                          <Lock size={12} />
                        </span>
                      </div>
                    </button>
                  );
                }

                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    onClick={onClose}
                    className={`group flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs transition-colors duration-150 ${
                      isActive
                        ? "bg-blue-50/90 text-blue-600 font-semibold border border-blue-100/80 shadow-2xs"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-50 border border-transparent font-medium"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Icon
                        size={15}
                        className={`shrink-0 transition-colors ${
                          isActive ? "text-blue-600" : "text-slate-400 group-hover:text-slate-700"
                        }`}
                      />
                      <span className="truncate leading-tight text-xs">{item.label}</span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {(item as any).badge && (
                        <span
                          className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-full border shrink-0 ${
                            (item as any).badgeColor === "amber" || String((item as any).badge).includes("Action") || String((item as any).badge).includes("Change")
                              ? "bg-amber-100 text-amber-800 border-amber-300"
                              : (item as any).badgeColor === "rose" || String((item as any).badge).includes("Suspend") || String((item as any).badge).includes("Reject")
                              ? "bg-rose-100 text-rose-800 border-rose-300"
                              : (item as any).badgeColor === "blue" || String((item as any).badge).includes("Review") || String((item as any).badge).includes("Pending")
                              ? "bg-blue-100 text-blue-800 border-blue-200"
                              : (item as any).badge === "All Access"
                              ? "bg-emerald-100 text-emerald-800 border-emerald-200/60"
                              : "bg-slate-100 text-slate-700 border-slate-200/60"
                          }`}
                        >
                          {(item as any).badge}
                        </span>
                      )}
                      {isActive && (
                        <span className="h-1.5 w-1.5 rounded-full bg-blue-600 shrink-0" />
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Lightweight Locked Feature Modal */}
      {lockedModalInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-2xs animate-fadeIn">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden animate-scaleUp">
            <div className="p-5 border-b border-slate-100 flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div
                  className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 border ${
                    lockedModalInfo.reasonType === "COMPANY_VERIFICATION"
                      ? "bg-amber-50 text-amber-600 border-amber-200"
                      : "bg-blue-50 text-blue-600 border-blue-200"
                  }`}
                >
                  {lockedModalInfo.reasonType === "COMPANY_VERIFICATION" ? (
                    <Lock size={18} />
                  ) : (
                    <ShieldAlert size={18} />
                  )}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">{lockedModalInfo.title}</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Feature module: <strong className="text-slate-700">{lockedModalInfo.label}</strong>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setLockedModalInfo(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-5 space-y-3 text-xs">
              <p className="text-slate-600 leading-relaxed">{lockedModalInfo.message}</p>

              {lockedModalInfo.reasonType === "COMPANY_VERIFICATION" && (
                <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200/80 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-amber-800 font-semibold">
                    <Lock size={13} className="shrink-0 text-amber-700" />
                    <span>Company Verification Required</span>
                  </div>
                  {lockedModalInfo.blockingItem && (
                    <p className="text-rose-700 font-medium">
                      Action Required: {lockedModalInfo.blockingItem}
                    </p>
                  )}
                  {lockedModalInfo.blockingReason && (
                    <p className="text-slate-600 italic">
                      "{lockedModalInfo.blockingReason}"
                    </p>
                  )}
                </div>
              )}

              {lockedModalInfo.reasonType === "EMPLOYEE_PERMISSION" && (
                <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-200/80 space-y-1">
                  <p className="font-semibold text-blue-900">Role-Based Access Control</p>
                  <p className="text-slate-600">
                    Your assigned account role does not have authorization for this action. Contact your carrier administrator to grant access.
                  </p>
                </div>
              )}
            </div>

            <div className="p-4 bg-slate-50/80 border-t border-slate-100 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setLockedModalInfo(null)}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                Close
              </button>
              {lockedModalInfo.ctaHref && (
                <Link
                  href={lockedModalInfo.ctaHref}
                  onClick={() => {
                    setLockedModalInfo(null);
                    if (onClose) onClose();
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-xs transition cursor-pointer"
                >
                  <span>{lockedModalInfo.ctaText}</span>
                  <ArrowRight size={13} />
                </Link>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Profile Footer */}
      <div className="p-3 border-t border-slate-200/80 shrink-0 bg-white mt-auto">
        <div className="p-2 rounded-xl bg-slate-50/80 border border-slate-200/80 flex items-center justify-between">
          <Link
            href="/vendor/profile"
            title="View Employee Profile"
            className="flex items-center gap-2.5 min-w-0 hover:opacity-80 transition group"
          >
            <div className="h-8 w-8 rounded-lg bg-gradient-to-tr from-slate-800 to-slate-900 text-white flex items-center justify-center font-bold text-xs shadow-2xs shrink-0 group-hover:ring-2 group-hover:ring-blue-500/40 transition">
              {userName.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-900 truncate leading-tight group-hover:text-blue-600 transition">{userName}</p>
              <div className="inline-flex items-center gap-1 mt-0.5 px-1.5 py-0.5 rounded bg-emerald-50 border border-emerald-200/70 text-[9px] font-semibold text-emerald-700 leading-none">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                <span className="truncate capitalize">
                  {userRole === "vendor"
                    ? "Carrier Owner"
                    : roleDisplayName || employeeRole.replace(/^custom_/, "").replace(/_[0-9]+$/, "").replace(/_/g, " ")}
                </span>
              </div>
            </div>
          </Link>
          <button
            onClick={handleSignOut}
            title="Sign Out"
            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer shrink-0"
          >
            <LogOut size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}
