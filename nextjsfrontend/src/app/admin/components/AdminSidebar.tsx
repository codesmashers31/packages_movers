"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
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
} from "lucide-react";

interface AdminSidebarProps {
  onClose?: () => void;
}

export default function AdminSidebar({ onClose }: AdminSidebarProps) {
  const pathname = usePathname();
  const [adminDisplayName, setAdminDisplayName] = useState<string>("Administrator");
  const [adminPhone, setAdminPhone] = useState<string>("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const storedUser = localStorage.getItem("auth_user");
        if (storedUser) {
          const user = JSON.parse(storedUser);
          setAdminDisplayName(user.displayName || "Administrator");
          setAdminPhone(user.phone || "");
        }
      } catch (e) {
        // Fallback
      }
    }
  }, []);

  const handleSignOut = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("auth_token");
      localStorage.removeItem("auth_user");
      window.location.href = "/admin/login";
    }
  };

  const navSections = [
    {
      title: "Overview",
      items: [
        { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
      ],
    },
    {
      title: "Management",
      items: [
        { label: "Users", href: "/admin/users", icon: Users },
        { label: "Roles", href: "/admin/roles", icon: Shield },
        { label: "Permissions", href: "/admin/permissions", icon: KeyRound },
      ],
    },
    {
      title: "Marketplace",
      items: [
        { label: "Vendors", href: "/admin/vendors", icon: Store },
        { label: "Vendor Requests", href: "/admin/vendor-requests", icon: UserCheck },
        { label: "Packages", href: "/admin/packages", icon: Package },
        { label: "Service Areas", href: "/admin/service-areas", icon: MapPin },
      ],
    },
    {
      title: "Operations",
      items: [
        { label: "Bookings", href: "/admin/bookings", icon: CalendarCheck },
        { label: "Disputes", href: "/admin/disputes", icon: AlertTriangle },
      ],
    },
    {
      title: "System",
      items: [
        { label: "Reports", href: "/admin/reports", icon: BarChart3 },
        { label: "Audit Logs", href: "/admin/audit-logs", icon: FileClock },
        { label: "Settings", href: "/admin/settings", icon: Settings },
      ],
    },
  ];

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
              {section.items.map((item) => {
                const Icon = item.icon;
                const isActive =
                  item.href === "/admin"
                    ? pathname === "/admin"
                    : pathname.startsWith(item.href);

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
                <span className="h-1.5 w-1.5 rounded-full bg-[#14B8A6] shrink-0 animate-pulse" />
                <p className="text-[10px] text-[#14B8A6] font-medium truncate leading-none">Online • Atlas Live</p>
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
    </div>
  );
}
