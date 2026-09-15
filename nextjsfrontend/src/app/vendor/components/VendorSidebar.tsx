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
  FileCheck,
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
} from "lucide-react";
import VendorRolePermissionsDrawer from "./VendorRolePermissionsDrawer";

interface VendorSidebarProps {
  onClose?: () => void;
}

export const ROUTE_PERMISSION_MAP: Record<string, string[]> = {
  "/vendor": ["*"], // Dashboard is accessible to all authenticated vendor staff
  "/vendor/demand": [
    "*",
    "Review Available Customer Leads",
    "Quotation Performance & Insights",
    "Reports & Performance Analytics",
  ],
  "/vendor/quotations": [
    "*",
    "Create & Submit Formal Quotations",
    "Review Available Customer Leads",
    "Quotation Performance & Insights",
  ],
  "/vendor/bookings": [
    "*",
    "View & Dispatch Bookings",
    "Bookings & Job Dispatch",
    "Update Move Progression Milestones",
    "Enter Recipient Delivery Verification Code",
  ],
  "/vendor/tracking": [
    "*",
    "Update Move Progression Milestones",
    "View & Dispatch Bookings",
    "Bookings & Job Dispatch",
    "Fleet & Vehicle Operations",
  ],
  "/vendor/workers": [
    "*",
    "Manage Employees & Crew",
    "Assign Available Workers & Crew",
    "View Crew Attendance & Performance",
  ],
  "/vendor/vehicles": [
    "*",
    "Fleet & Vehicle Operations",
    "Assign Transport Trucks to Moves",
    "Vehicle Inspection & Maintenance Tracking",
  ],
  "/vendor/services": [
    "*",
    "Service Catalog Configuration",
    "Custom Specialized Services",
  ],
  "/vendor/packages": [
    "*",
    "Service Catalog Configuration",
  ],
  "/vendor/service-areas": [
    "*",
    "Coverage Areas Configuration",
  ],
  "/vendor/documents": [
    "*",
    "Document Submissions",
    "Regulatory Status Monitoring",
  ],
  "/vendor/employees": [
    "*",
    "Manage Employees & Crew",
  ],
  "/vendor/roles": [
    "*",
    "Manage Employees & Crew",
  ],
  "/vendor/permissions": [
    "*",
    "Manage Employees & Crew",
  ],
  "/vendor/reports": [
    "*",
    "Reports & Performance Analytics",
  ],
  "/vendor/audit-logs": [
    "*",
    "Operational Audit Logs",
  ],
};

export default function VendorSidebar({ onClose }: VendorSidebarProps) {
  const pathname = usePathname();
  const [userName, setUserName] = useState<string>("Staff Member");
  const [userPhone, setUserPhone] = useState<string>("");
  const [userRole, setUserRole] = useState<string>("");
  const [employeeRole, setEmployeeRole] = useState<string>("");
  const [userPermissions, setUserPermissions] = useState<string[]>([]);
  const [activeCompanyName, setActiveCompanyName] = useState<string>("");
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

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

          if (Array.isArray(u.permissions) && u.permissions.length > 0) {
            setUserPermissions(u.permissions);
          } else if (Array.isArray(u.resolvedPermissions) && u.resolvedPermissions.length > 0) {
            setUserPermissions(u.resolvedPermissions);
          } else {
            // Secondary fallback: lookup role in /vendor/roles
            fetchApi<{ roles: any[] }>("/vendor/roles")
              .then((roleRes) => {
                if (roleRes?.roles) {
                  const norm = (s: string) => (s || "").toLowerCase().replace(/[^a-z0-9]/g, "");
                  const match = roleRes.roles.find(
                    (r) =>
                      (r.id && norm(r.id) === norm(empR)) ||
                      (r.name && norm(r.name) === norm(empR))
                  );
                  if (match && Array.isArray(match.permissions)) {
                    setUserPermissions(match.permissions);
                  }
                }
              })
              .catch(() => {});
          }
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
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

      // Proactively refresh authenticated profile from backend so role/permission
      // updates apply immediately without requiring manual cache clears or re-login.
      syncLiveVendorUser();

      const onFocus = () => syncLiveVendorUser();
      window.addEventListener("focus", onFocus);
      window.addEventListener("vendor-permissions-updated", onFocus);
      const interval = setInterval(syncLiveVendorUser, 30000);

      return () => {
        window.removeEventListener("focus", onFocus);
        window.removeEventListener("vendor-permissions-updated", onFocus);
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
      window.location.href = "/vendor/login";
    }
  };

  const isVendorOwner = userRole === "vendor" || userPermissions.includes("*");
  const activePermsCount = isVendorOwner ? "All Access" : `${userPermissions.length} Active`;

  const navSections = useMemo(
    () => [
      {
        title: "Overview",
        items: [
          { label: "Dashboard", href: "/vendor", icon: LayoutDashboard },
          {
            label: "My Role & Permissions",
            href: "#my-permissions",
            icon: ShieldCheck,
            isDrawerTrigger: true,
            badge: activePermsCount,
          },
        ],
      },
      {
        title: "Move Operations",
        items: [
          { label: "Demand Insights", href: "/vendor/demand", icon: TrendingUp },
          { label: "Quotations", href: "/vendor/quotations", icon: FileText },
          { label: "Bookings", href: "/vendor/bookings", icon: CalendarCheck },
          { label: "Live Tracking", href: "/vendor/tracking", icon: Truck },
          { label: "Crew Workers", href: "/vendor/workers", icon: HardHat },
          { label: "Fleet Vehicles", href: "/vendor/vehicles", icon: Car },
        ],
      },
      {
        title: "Marketplace & Services",
        items: [
          { label: "Services Catalog", href: "/vendor/services", icon: Layers },
          { label: "Moving Packages", href: "/vendor/packages", icon: Package },
          { label: "Service Areas", href: "/vendor/service-areas", icon: MapPin },
          { label: "Compliance Docs", href: "/vendor/documents", icon: FileCheck },
        ],
      },
      {
        title: "Team & Access Control",
        items: [
          { label: "Employees", href: "/vendor/employees", icon: Users },
          { label: "Roles & Rules", href: "/vendor/roles", icon: Shield },
          { label: "Permissions", href: "/vendor/permissions", icon: KeyRound },
        ],
      },
      {
        title: "Analytics & System",
        items: [
          { label: "Business Reports", href: "/vendor/reports", icon: BarChart3 },
          { label: "Activity Logs", href: "/vendor/audit-logs", icon: FileClock },
        ],
      },
    ],
    []
  );

  // Dynamic Allowed Items based on dynamic permissions from DB
  const allowedHrefs = useMemo(() => {
    // 1. Vendor owner and platform admin have full access to all modules
    if (userRole === "vendor" || userRole === "admin") {
      return [...Object.keys(ROUTE_PERMISSION_MAP), "#my-permissions"];
    }

    // 2. Wildcard permission grants full access
    if (userPermissions.includes("*")) {
      return [...Object.keys(ROUTE_PERMISSION_MAP), "#my-permissions"];
    }

    // 3. Match against dynamic permissions assigned to the employee
    if (userPermissions.length > 0) {
      const allowed = Object.keys(ROUTE_PERMISSION_MAP).filter((href) => {
        if (href === "/vendor") return true; // Always allow base dashboard
        const required = ROUTE_PERMISSION_MAP[href];
        return required && required.some((perm) => userPermissions.includes(perm));
      });
      return [...allowed, "#my-permissions"];
    }

    // 4. Fallback for unconfigured roles (strictly matching system role key)
    const norm = (employeeRole || "").toLowerCase().trim();
    if (norm === "manager") return [...Object.keys(ROUTE_PERMISSION_MAP), "#my-permissions"];
    if (norm === "hr") {
      return ["/vendor", "#my-permissions", "/vendor/employees", "/vendor/roles", "/vendor/permissions", "/vendor/reports", "/vendor/audit-logs"];
    }
    if (norm === "lead_estimator" || norm.includes("estimate") || norm.includes("quote")) {
      return ["/vendor", "#my-permissions", "/vendor/demand", "/vendor/quotations"];
    }
    if (norm === "fleet_supervisor" || norm.includes("fleet") || norm.includes("transport")) {
      return ["/vendor", "#my-permissions", "/vendor/bookings", "/vendor/tracking", "/vendor/workers", "/vendor/vehicles"];
    }
    return ["/vendor", "#my-permissions", "/vendor/bookings", "/vendor/vehicles"];
  }, [userRole, userPermissions, employeeRole]);

  const filteredNavSections = useMemo(() => {
    return navSections
      .map((sec) => ({
        ...sec,
        items: sec.items.filter((item) => allowedHrefs.includes(item.href)),
      }))
      .filter((sec) => sec.items.length > 0);
  }, [navSections, allowedHrefs]);

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

      {/* Navigation list */}
      <nav className="flex-1 px-3 py-3 space-y-3.5 overflow-y-auto scrollbar-none">
        {filteredNavSections.map((section) => (
          <div key={section.title} className="space-y-1">
            <p className="px-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              {section.title}
            </p>
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const Icon = item.icon;
                const isActive =
                  item.href === "/vendor"
                    ? pathname === "/vendor"
                    : pathname.startsWith(item.href);

                if ((item as any).isDrawerTrigger) {
                  return (
                    <button
                      key={item.label}
                      onClick={() => {
                        setDrawerOpen(true);
                        if (onClose) onClose();
                      }}
                      className="w-full group flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs transition-colors duration-150 text-slate-700 hover:text-blue-600 hover:bg-slate-50 border border-transparent font-semibold cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Icon
                          size={15}
                          className="shrink-0 text-emerald-600 group-hover:text-blue-600 transition-colors"
                        />
                        <span className="truncate leading-tight text-xs">{item.label}</span>
                      </div>
                      {(item as any).badge && (
                        <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200/60 shrink-0">
                          {(item as any).badge}
                        </span>
                      )}
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

                    {isActive && (
                      <span className="h-1.5 w-1.5 rounded-full bg-blue-600 shrink-0" />
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Profile Footer */}
      <div className="p-3 border-t border-slate-200/80 shrink-0 bg-white mt-auto">
        <div className="p-2 rounded-xl bg-slate-50/80 border border-slate-200/80 flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-tr from-slate-800 to-slate-900 text-white flex items-center justify-center font-bold text-xs shadow-2xs shrink-0">
              {userName.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-900 truncate leading-tight">{userName}</p>
              <div className="inline-flex items-center gap-1 mt-0.5 px-1.5 py-0.5 rounded bg-emerald-50 border border-emerald-200/70 text-[9px] font-semibold text-emerald-700 leading-none">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                <span className="truncate capitalize">{userRole === "vendor" ? "Carrier Owner" : employeeRole}</span>
              </div>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            title="Sign Out"
            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer shrink-0"
          >
            <LogOut size={15} />
          </button>
        </div>
      </div>

      {/* Dynamic Carrier Role & Permissions Matrix Slide-over Drawer */}
      <VendorRolePermissionsDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        currentUser={currentUser}
        vendorCompany={{ businessName: activeCompanyName }}
        onUserRefreshed={(u) => {
          setCurrentUser(u);
          if (Array.isArray(u.permissions)) setUserPermissions(u.permissions);
        }}
      />
    </div>
  );
}
