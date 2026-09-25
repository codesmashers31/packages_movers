"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, LogOut, Building2, ChevronDown, Check, Sparkles, ShieldCheck } from "lucide-react";
import { fetchApi } from "@/lib/api";
import NotificationBell from "@/app/admin/components/NotificationBell";

interface VendorHeaderProps {
  onMenuToggle: () => void;
}

interface CompanyItem {
  _id: string;
  businessName: string;
  contactPhone: string;
  status: string;
}

export default function VendorHeader({ onMenuToggle }: VendorHeaderProps) {
  const pathname = usePathname();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [vendorDisplayName, setVendorDisplayName] = useState<string>("Vendor Partner");
  const [vendorPhone, setVendorPhone] = useState<string>("");
  const [companies, setCompanies] = useState<CompanyItem[]>([]);
  const [activeCompany, setActiveCompany] = useState<CompanyItem | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const storedUser = localStorage.getItem("auth_user");
        if (storedUser) {
          const user = JSON.parse(storedUser);
          setCurrentUser(user);
          setVendorDisplayName(user.displayName || "Vendor Partner");
          setVendorPhone(user.phone || "");
        }
      } catch (e) {
        // Fallback
      }
    }

    const loadCompanies = async () => {
      try {
        const res = await fetchApi<{
          companies: CompanyItem[];
          activeCompanyId: string;
          activeCompany?: CompanyItem;
        }>("/vendor/companies");

        if (res.companies && res.companies.length > 0) {
          setCompanies(res.companies);

          const storedId = typeof window !== "undefined" ? localStorage.getItem("active_vendor_id") : null;
          const matched = res.companies.find((c) => c._id === storedId) || res.activeCompany || res.companies[0];

          setActiveCompany(matched);
          if (typeof window !== "undefined" && matched) {
            localStorage.setItem("active_vendor_id", matched._id);
            localStorage.setItem("active_vendor_name", matched.businessName);
          }
        }
      } catch (err) {
        // Silent fallback
      }
    };

    loadCompanies();
  }, []);

  const handleSelectCompany = (comp: CompanyItem) => {
    if (typeof window !== "undefined") {
      localStorage.setItem("active_vendor_id", comp._id);
      localStorage.setItem("active_vendor_name", comp.businessName);
      setDropdownOpen(false);
      window.location.reload();
    }
  };

  const handleSignOut = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("auth_token");
      localStorage.removeItem("auth_user");
      localStorage.removeItem("active_vendor_id");
      localStorage.removeItem("active_vendor_name");
      window.location.href = "/vendor/login";
    }
  };

  const getSectionLabel = () => {
    if (pathname === "/vendor") return "Overview";
    const segment = pathname.split("/")[2] || "";
    return segment
      .split("-")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
  };

  const roleTitle =
    currentUser?.role === "vendor"
      ? "Managing Director (Owner)"
      : (currentUser?.employeeRole || "Staff")
          .split("_")
          .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(" ");

  return (
    <>
      <header className="h-14 bg-white/90 backdrop-blur-md border-b border-slate-200/80 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-20 font-sans shadow-2xs">
        <div className="flex items-center gap-3">
          <button
            onClick={onMenuToggle}
            className="lg:hidden p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition cursor-pointer"
            aria-label="Toggle Menu"
          >
            <Menu size={18} />
          </button>

          <nav className="flex items-center gap-2 text-xs text-slate-500">
            <span>Carrier Fleet</span>
            <span>/</span>
            <span className="font-semibold text-slate-900">{getSectionLabel()}</span>
          </nav>
        </div>

        <div className="flex items-center gap-2.5 sm:gap-3">
          {/* Active Company Selector */}
          {activeCompany && (
            <div className="relative">
              <button
                onClick={() => companies.length > 1 && setDropdownOpen(!dropdownOpen)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-medium transition ${
                  companies.length > 1
                    ? "bg-slate-50 border-slate-200 hover:bg-slate-100/80 text-slate-800 cursor-pointer"
                    : "bg-slate-50/70 border-slate-200 text-slate-700 cursor-default"
                }`}
              >
                <div className="h-5 w-5 rounded-md bg-blue-600 text-white flex items-center justify-center font-bold text-[10px] shrink-0">
                  {activeCompany.businessName.charAt(0).toUpperCase()}
                </div>
                <span className="truncate max-w-[140px] sm:max-w-[200px]">{activeCompany.businessName}</span>
                {companies.length > 1 && (
                  <ChevronDown
                    size={13}
                    className={`text-slate-400 transition-transform ${dropdownOpen ? "rotate-180" : ""}`}
                  />
                )}
              </button>

              {dropdownOpen && companies.length > 1 && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setDropdownOpen(false)} />
                  <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-xl border border-slate-200 p-2 z-50 animate-scaleUp space-y-1">
                    <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                      <span>Switch Moving Company</span>
                      <span className="text-blue-600 font-mono text-[9px] bg-blue-50 px-1.5 py-0.5 rounded">
                        {companies.length} Registered
                      </span>
                    </div>
                    {companies.map((comp) => {
                      const isSelected = comp._id === activeCompany._id;
                      return (
                        <button
                          key={comp._id}
                          onClick={() => handleSelectCompany(comp)}
                          className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs text-left transition cursor-pointer ${
                            isSelected
                              ? "bg-blue-50 text-blue-700 font-semibold border border-blue-100"
                              : "hover:bg-slate-50 text-slate-700 font-medium"
                          }`}
                        >
                          <div className="min-w-0 pr-2">
                            <p className="truncate leading-tight">{comp.businessName}</p>
                            <p className="text-[10px] text-slate-400 font-mono mt-0.5">{comp.contactPhone}</p>
                          </div>
                          {isSelected && <Check size={14} className="text-blue-600 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Direct Link to Personal Role & Capabilities Inspection Page */}
          <Link
            href="/vendor/my-permissions"
            className="neu-btn px-2.5 py-1.5 rounded-xl text-xs font-semibold text-[#1E293B] hover:text-[#2563EB] flex items-center gap-1.5 cursor-pointer shadow-neu-raised-sm"
            title="Inspect What You Can Do vs What You Cannot Do"
          >
            <ShieldCheck size={14} className="text-teal-600" />
            <span className="hidden sm:inline">My Capabilities</span>
            <span className="px-1.5 py-0.2 rounded-full bg-teal-100 text-teal-800 text-[10px] font-bold">
              {roleTitle}
            </span>
          </Link>

          {/* Real-time Bidirectional Notification Bell for Carrier */}
          <NotificationBell isVendor={true} />

          {/* Network Status Chip */}
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200/80 text-[11px] text-emerald-800 font-semibold">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Live Network</span>
          </div>

          {/* Profile Capsule */}
          <div className="flex items-center gap-2 pl-2 pr-1.5 py-1 rounded-xl bg-slate-50 border border-slate-200/80 hover:border-blue-300 transition">
            <a
              href="/vendor/profile"
              title="View Individual Profile & Account Settings"
              className="flex items-center gap-2 cursor-pointer group"
            >
              <div className="h-6 w-6 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-[11px] shadow-2xs group-hover:scale-105 transition">
                {vendorDisplayName.charAt(0).toUpperCase()}
              </div>
              <div className="hidden md:block text-left pr-1">
                <p className="text-xs font-semibold text-slate-800 leading-tight truncate max-w-[120px] group-hover:text-blue-600 transition">
                  {vendorDisplayName}
                </p>
              </div>
            </a>

            <button
              onClick={handleSignOut}
              title="Sign Out"
              className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
            >
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </header>
    </>
  );
}
