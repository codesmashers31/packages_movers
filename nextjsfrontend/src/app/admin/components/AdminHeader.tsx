"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Menu, LogOut } from "lucide-react";

interface AdminHeaderProps {
  onMenuToggle: () => void;
}

export default function AdminHeader({ onMenuToggle }: AdminHeaderProps) {
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

  // Human readable section label from pathname
  const getSectionLabel = () => {
    if (pathname === "/admin") return "Overview";
    const segment = pathname.split("/")[2] || "";
    return segment
      .split("-")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
  };

  return (
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

      <div className="flex items-center gap-3">
        <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-50 shadow-neu-raised-sm border border-teal-200/80 text-[11px] text-teal-800 font-semibold">
          <span className="h-1.5 w-1.5 rounded-full bg-[#14B8A6] animate-pulse"></span>
          <span>Atlas Connected</span>
        </div>

        <div className="flex items-center gap-2.5 pl-2.5 py-1 px-2.5 rounded-xl bg-[#EEF2F6] shadow-neu-raised-sm border border-white/80">
          <div className="h-7 w-7 rounded-full bg-gradient-to-br from-[#2563EB] to-[#0EA5E9] flex items-center justify-center text-white font-semibold text-xs shadow-2xs">
            {adminDisplayName.charAt(0).toUpperCase()}
          </div>
          <div className="hidden md:block text-left">
            <p className="text-xs font-semibold text-[#1E293B] leading-tight">{adminDisplayName}</p>
            {adminPhone && <p className="text-[10px] text-[#64748B] font-mono leading-none mt-0.5">{adminPhone}</p>}
          </div>

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
  );
}
