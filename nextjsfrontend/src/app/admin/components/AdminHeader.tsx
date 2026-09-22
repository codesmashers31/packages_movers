"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, LogOut, ShieldCheck } from "lucide-react";
import NotificationBell from "./NotificationBell";

interface AdminHeaderProps {
  onMenuToggle: () => void;
}

export default function AdminHeader({ onMenuToggle }: AdminHeaderProps) {
  const pathname = usePathname();
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const storedUser = localStorage.getItem("auth_user");
        if (storedUser) {
          setCurrentUser(JSON.parse(storedUser));
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

  // Human readable section label from pathname
  const getSectionLabel = () => {
    if (pathname === "/admin") return "Overview";
    const segment = pathname.split("/")[2] || "";
    return segment
      .split("-")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
  };

  const displayName = currentUser?.displayName || "Administrator";
  const phone = currentUser?.phone || "";
  const rawRole = currentUser?.adminRole || "super_admin";
  const roleLabel =
    currentUser?.phone === "+919876543210" || rawRole === "super_admin"
      ? "Super Admin"
      : rawRole
          .split("_")
          .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(" ");

  return (
    <>
      <header className="h-14 bg-[#EEF2F6] shadow-neu-flat-sm border-b border-[#D9E2EC]/80 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <button
            onClick={onMenuToggle}
            className="lg:hidden p-1.5 rounded-xl bg-[#EEF2F6] shadow-neu-raised-sm hover:shadow-neu-flat active:shadow-neu-pressed border border-white/80 text-[#1E293B] transition cursor-pointer"
            aria-label="Toggle Menu"
          >
            <Menu size={16} />
          </button>

          <nav className="flex items-center gap-2 text-xs px-3 py-1 rounded-xl bg-[#EEF2F6] shadow-neu-inset-sm border border-white/50">
            <span className="text-[#64748B] font-medium">Operations</span>
            <span className="text-[#CBD5E1]">/</span>
            <span className="font-bold text-[#1E293B]">{getSectionLabel()}</span>
          </nav>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {/* Direct Link to Personal Administrative Capabilities Inspection Page */}
          <Link
            href="/admin/my-permissions"
            className="neu-btn px-2.5 py-1.5 rounded-xl text-xs font-semibold text-[#1E293B] hover:text-[#2563EB] flex items-center gap-1.5 cursor-pointer shadow-neu-raised-sm"
            title="Inspect What You Can Do vs What You Cannot Do"
          >
            <ShieldCheck size={14} className="text-emerald-600" />
            <span className="hidden sm:inline">My Capabilities</span>
            <span className="px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
              {roleLabel}
            </span>
          </Link>

          {/* Real-time Bidirectional Notification Bell */}
          <NotificationBell isVendor={false} />

          {/* Database Atlas Live Telemetry Chip */}
          <div className="hidden lg:flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-50 shadow-neu-raised-sm border border-teal-200/80 text-[11px] text-teal-800 font-semibold">
            <span className="h-1.5 w-1.5 rounded-full bg-[#14B8A6] animate-pulse"></span>
            <span>Atlas Connected</span>
          </div>

          {/* User Profile Capsule */}
          <div className="flex items-center gap-2.5 pl-2.5 py-1 px-2.5 rounded-xl bg-[#EEF2F6] shadow-neu-raised-sm border border-white/80 hover:border-blue-300 transition">
            <Link
              href="/admin/profile"
              title="View Individual Profile & Account Settings"
              className="flex items-center gap-2.5 cursor-pointer group"
            >
              <div className="h-7 w-7 rounded-full bg-gradient-to-br from-[#2563EB] to-[#0EA5E9] flex items-center justify-center text-white font-semibold text-xs shadow-2xs group-hover:scale-105 transition">
                {displayName.charAt(0).toUpperCase()}
              </div>
              <div className="hidden md:block text-left">
                <p className="text-xs font-semibold text-[#1E293B] leading-tight group-hover:text-blue-600 transition">{displayName}</p>
                {phone && <p className="text-[10px] text-[#64748B] font-mono leading-none mt-0.5">{phone}</p>}
              </div>
            </Link>

            <button
              onClick={handleSignOut}
              title="Sign Out"
              className="p-1 text-[#64748B] hover:text-rose-600 hover:shadow-neu-inset-sm rounded-lg transition cursor-pointer ml-1"
            >
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </header>
    </>
  );
}
