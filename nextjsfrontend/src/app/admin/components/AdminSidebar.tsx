"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { fetchApi } from "@/lib/api";
import {
  LayoutDashboard,
  Users,
  Shield,
  KeyRound,
  Store,
  UserCheck,
  Package,
  CalendarCheck,
  AlertTriangle,
  FileClock,
  Settings,
  LogOut,
  X,
  MapPin,
  BarChart3,
  FileCheck2,
  UserCog,
  ShieldCheck,
} from "lucide-react";
import RolePermissionsDrawer from "./RolePermissionsDrawer";

interface AdminSidebarProps {
  onClose?: () => void;
}

export const ADMIN_ROUTE_PERMISSIONS: Record<string, string | string[]> = {
  "/admin": "", // Always accessible
  "/admin/users": "users:view",
  "/admin/employees": "staff:view",
  "/admin/roles": "permissions:manage",
  "/admin/permissions": "permissions:manage",
  "/admin/vendors": "vendors:view",
  "/admin/vendor-requests": ["vendors:approve", "vendors:view"],
  "/admin/documents": ["documents:view", "vendors:view"],
  "/admin/packages": "packages:manage",
  "/admin/service-areas": "service_areas:manage",
  "/admin/bookings": "bookings:view",
  "/admin/disputes": "disputes:view",
  "/admin/reports": "reports:view",
  "/admin/audit-logs": "audit:view",
  "/admin/settings": "settings:manage",
};

export default function AdminSidebar({ onClose }: AdminSidebarProps) {
  const pathname = usePathname();
  const [adminDisplayName, setAdminDisplayName] = useState<string>("Administrator");
  const [adminPhone, setAdminPhone] = useState<string>("");
  const [adminRole, setAdminRole] = useState<string>("Super Admin");
  const [adminDepartment, setAdminDepartment] = useState<string>("Executive Governance");
  const [userPermissions, setUserPermissions] = useState<string[]>(["*"]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const syncLiveUser = async () => {
    if (typeof window === "undefined") return;
    try {
      const token = localStorage.getItem("auth_token");
      if (!token) return;
      const res = await fetchApi<{ user: any }>("/auth/me");
      if (res?.user) {
        const u = res.user;
        const existingStr = localStorage.getItem("auth_user");
        const existing = existingStr ? JSON.parse(existingStr) : {};
        const merged = { ...existing, ...u, id: u._id || u.id };
        localStorage.setItem("auth_user", JSON.stringify(merged));
        setCurrentUser(merged);
        setAdminDisplayName(merged.displayName || merged.username || "Administrator");
        setAdminPhone(merged.phone || "");

        const rawRole = merged.adminRole || "super_admin";
        const formattedRole = rawRole
          .split("_")
          .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(" ");
        setAdminRole(merged.phone === "+919876543210" || rawRole === "super_admin" ? "Super Admin" : formattedRole);
        setAdminDepartment(merged.adminDepartment || (rawRole === "super_admin" ? "Executive Governance" : "Operations"));

        const perms = Array.isArray(merged.permissions) && merged.permissions.length > 0
          ? merged.permissions
          : Array.isArray(merged.resolvedPermissions) && merged.resolvedPermissions.length > 0
          ? merged.resolvedPermissions
          : (merged.phone === "+919876543210" || rawRole === "super_admin")
          ? ["*"]
          : [];
        setUserPermissions(perms);
      }
    } catch (e) {
      // Offline fallback
    }
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const storedUser = localStorage.getItem("auth_user");
        if (storedUser) {
          const user = JSON.parse(storedUser);
          setCurrentUser(user);
          setAdminDisplayName(user.displayName || user.username || "Administrator");
          setAdminPhone(user.phone || "");
          
          // Determine readable role label
          const rawRole = user.adminRole || "super_admin";
          const formattedRole = rawRole
            .split("_")
            .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
            .join(" ");
          setAdminRole(user.phone === "+919876543210" || rawRole === "super_admin" ? "Super Admin" : formattedRole);
          setAdminDepartment(user.adminDepartment || (rawRole === "super_admin" ? "Executive Governance" : "Operations"));

          if (Array.isArray(user.permissions) && user.permissions.length > 0) {
            setUserPermissions(user.permissions);
          } else if (Array.isArray(user.resolvedPermissions) && user.resolvedPermissions.length > 0) {
            setUserPermissions(user.resolvedPermissions);
          } else if (user.phone === "+919876543210" || rawRole === "super_admin") {
            setUserPermissions(["*"]);
          }
        }
      } catch (e) {
        // Fallback
      }

      // Proactively sync live state from MongoDB Atlas
      syncLiveUser();

      const onFocus = () => syncLiveUser();
      window.addEventListener("focus", onFocus);
      window.addEventListener("admin-permissions-updated", onFocus);
      const interval = setInterval(syncLiveUser, 30000);

      return () => {
        window.removeEventListener("focus", onFocus);
        window.removeEventListener("admin-permissions-updated", onFocus);
        clearInterval(interval);
      };
    }
  }, []);

  const handleSignOut = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("auth_token");
      localStorage.removeItem("auth_user");
      window.location.href = "/admin/login";
    }
  };

  const isPermitted = (requiredPerm?: string | string[]) => {
    if (!requiredPerm) return true;
    if (userPermissions.includes("*")) return true;
    if (Array.isArray(requiredPerm)) {
      return requiredPerm.some((p) => userPermissions.includes(p));
    }
    return userPermissions.includes(requiredPerm);
  };

  const isSuperAdmin = userPermissions.includes("*") || adminRole === "Super Admin";
  const activePermsCount = isSuperAdmin ? "All Access" : `${userPermissions.length} Active`;

  const allNavSections = [
    {
      title: "Overview",
      items: [
        { label: "Dashboard", href: "/admin", icon: LayoutDashboard, perm: "" },
        {
          label: "My Role & Permissions",
          href: "#my-permissions",
          icon: ShieldCheck,
          perm: "",
          isDrawerTrigger: true,
          badge: activePermsCount,
        },
      ],
    },
    {
      title: "Staff & RBAC",
      items: [
        { label: "Platform Staff", href: "/admin/employees", icon: UserCog, perm: ["staff:view", "staff:manage"] },
        { label: "Staff Roles", href: "/admin/roles", icon: Shield, perm: "permissions:manage" },
        { label: "Permissions Matrix", href: "/admin/permissions", icon: KeyRound, perm: "permissions:manage" },
      ],
    },
    {
      title: "User Oversight",
      items: [
        { label: "Customers & Drivers", href: "/admin/users", icon: Users, perm: ["users:view", "users:create", "users:edit", "users:suspend"] },
      ],
    },
    {
      title: "Marketplace",
      items: [
        { label: "Vendors", href: "/admin/vendors", icon: Store, perm: ["vendors:view", "vendors:approve", "vendors:suspend"] },
        { label: "Carrier Applications", href: "/admin/vendor-requests", icon: UserCheck, perm: ["vendors:approve", "vendors:view"] },
        { label: "Compliance Docs", href: "/admin/documents", icon: FileCheck2, perm: ["documents:view", "documents:verify", "vendors:view"] },
        { label: "Moving Packages", href: "/admin/packages", icon: Package, perm: ["packages:manage"] },
        { label: "Service Areas", href: "/admin/service-areas", icon: MapPin, perm: ["service_areas:manage"] },
      ],
    },
    {
      title: "Operations",
      items: [
        { label: "Move Bookings", href: "/admin/bookings", icon: CalendarCheck, perm: ["bookings:view", "bookings:manage"] },
        { label: "Claims & Disputes", href: "/admin/disputes", icon: AlertTriangle, perm: ["disputes:view", "disputes:manage"] },
      ],
    },
    {
      title: "System & Governance",
      items: [
        { label: "Operational Telemetry", href: "/admin/reports", icon: BarChart3, perm: ["reports:view"] },
        { label: "Audit Logs", href: "/admin/audit-logs", icon: FileClock, perm: ["audit:view"] },
        { label: "Platform Settings", href: "/admin/settings", icon: Settings, perm: ["settings:manage"] },
      ],
    },
  ];

  // Dynamically filter sections and items according to current admin's permissions
  const navSections = allNavSections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => isPermitted(item.perm)),
    }))
    .filter((section) => section.items.length > 0);

  return (
    <div className="h-full flex flex-col bg-[#EEF2F6] border-r border-[#D9E2EC]/80 w-64 select-none font-sans overflow-hidden">
      {/* Brand Header */}
      <div className="h-14 px-4 flex items-center justify-between border-b border-[#D9E2EC]/80 shrink-0">
        <Link href="/admin" className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-[#2563EB] to-[#0EA5E9] flex items-center justify-center text-white font-bold text-xs shadow-xs">
            PM
          </div>
          <div>
            <p className="text-xs font-bold text-[#1E293B] tracking-tight leading-none">Package Mover</p>
            <p className="text-[11px] text-[#64748B] font-normal leading-none mt-1">Admin Console</p>
          </div>
        </Link>
        {onClose && (
          <button
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-lg text-[#64748B] hover:text-[#1E293B] hover:bg-[#F8FAFC] transition cursor-pointer"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Navigation list */}
      <nav className="flex-1 px-3 py-2.5 space-y-3 overflow-hidden">
        {navSections.map((section) => (
          <div key={section.title}>
            <p className="px-2.5 text-[10px] font-bold uppercase tracking-wider text-[#94A3B8] mb-1">
              {section.title}
            </p>
            <div className="space-y-0.5">
              {section.items.map((item: any) => {
                const Icon = item.icon;
                const isActive =
                  item.href === "/admin"
                    ? pathname === "/admin"
                    : pathname.startsWith(item.href);

                if (item.isDrawerTrigger) {
                  return (
                    <button
                      key={item.label}
                      onClick={() => {
                        setDrawerOpen(true);
                        if (onClose) onClose();
                      }}
                      className="w-full group flex items-center justify-between px-3 py-1.5 rounded-xl text-xs transition-all text-[#1E293B] hover:text-[#2563EB] hover:shadow-neu-flat-sm border border-transparent hover:border-white/60 font-semibold cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Icon
                          size={15}
                          className="shrink-0 text-emerald-600 group-hover:text-[#2563EB] transition-colors"
                        />
                        <span className="truncate leading-tight text-xs">{item.label}</span>
                      </div>
                      {item.badge && (
                        <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded-full bg-emerald-100/90 text-emerald-700 border border-emerald-200/60 shrink-0">
                          {item.badge}
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
                    className={`group flex items-center justify-between px-3 py-1.5 rounded-xl text-xs transition-all ${
                      isActive
                        ? "bg-[#EEF2F6] shadow-neu-raised-sm text-[#2563EB] font-bold border border-white/80"
                        : "text-[#64748B] hover:text-[#1E293B] hover:shadow-neu-flat-sm border border-transparent hover:border-white/50 font-medium"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Icon
                        size={15}
                        className={`shrink-0 transition-colors ${
                          isActive ? "text-[#2563EB]" : "text-[#64748B] group-hover:text-[#1E293B]"
                        }`}
                      />
                      <span className="truncate leading-tight text-xs">{item.label}</span>
                    </div>
                    {isActive && (
                      <span className="h-1.5 w-1.5 rounded-full bg-[#0EA5E9] shrink-0" />
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Palette 1 Integrated Footer */}
      <div className="p-3 border-t border-[#D9E2EC]/80 shrink-0 bg-[#EEF2F6] mt-auto">
        <div className="p-2.5 rounded-2xl bg-[#EEF2F6] shadow-neu-inset-sm border border-white/60 flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-[#2563EB] to-[#0EA5E9] flex items-center justify-center text-white font-bold text-xs shadow-2xs shrink-0">
              {adminDisplayName.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-[#1E293B] truncate leading-tight">{adminDisplayName}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-blue-100/80 text-blue-700 truncate max-w-[120px]">
                  {adminRole}
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            title="Sign Out"
            className="p-1.5 text-[#64748B] hover:text-rose-600 shadow-neu-raised-sm hover:shadow-neu-flat active:shadow-neu-pressed bg-[#EEF2F6] border border-white/70 rounded-xl transition cursor-pointer shrink-0"
          >
            <LogOut size={15} />
          </button>
        </div>
      </div>

      {/* Dynamic Role & Permissions Matrix Slide-over Drawer */}
      <RolePermissionsDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        currentUser={currentUser}
        onUserRefreshed={(u) => {
          setCurrentUser(u);
          if (Array.isArray(u.permissions)) setUserPermissions(u.permissions);
        }}
      />
    </div>
  );
}
