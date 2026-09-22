"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import {
  X,
  ShieldCheck,
  CheckCircle2,
  Users,
  Truck,
  Compass,
  ArrowRight,
  UserCheck,
  Building2,
  CalendarCheck,
  HardHat,
  Eye,
} from "lucide-react";

interface VendorRolePermissionsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: any;
  vendorCompany?: any;
  onUserRefreshed?: (user: any) => void;
}

export default function VendorRolePermissionsDrawer({
  isOpen,
  onClose,
  currentUser,
  vendorCompany,
}: VendorRolePermissionsDrawerProps) {
  const userPerms: string[] = useMemo(() => {
    return Array.isArray(currentUser?.permissions)
      ? currentUser.permissions
      : Array.isArray(currentUser?.resolvedPermissions)
      ? currentUser.resolvedPermissions
      : [];
  }, [currentUser]);

  const isVendorOwner = currentUser?.role === "vendor" || userPerms.includes("*");

  const rawRole = (currentUser?.employeeRole || currentUser?.role || "operations").toLowerCase();

  const roleTitle = isVendorOwner
    ? "Carrier Managing Director (Owner)"
    : rawRole
        .replace(/_/g, " ")
        .replace(/\b\w/g, (c: string) => c.toUpperCase());

  const companyName = vendorCompany?.businessName || "Registered Moving Carrier";

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fadeIn font-sans">
      <div
        className="w-full max-w-2xl bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-scaleUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100 shadow-xs">
              <ShieldCheck size={22} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 leading-tight">
                Role & Operational Scope
              </h2>
              <p className="text-xs text-slate-500">
                Simple overview of responsibilities and team supervision access
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body Containers */}
        <div className="p-6 overflow-y-auto space-y-5 text-slate-900">
          {/* Container 1: Current Role Overview */}
          <div className="p-5 rounded-2xl bg-blue-50/50 border border-blue-100/80 flex items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-bold tracking-wider text-blue-600">
                Active Operational Designation
              </span>
              <h3 className="text-lg font-black text-slate-900 leading-tight">{roleTitle}</h3>
              <p className="text-xs text-slate-600 flex items-center gap-1.5 pt-0.5">
                <Building2 size={13} className="text-blue-500" />
                <span>{companyName}</span>
              </p>
            </div>

            <div className="text-right shrink-0">
              <span className="px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold text-xs inline-flex items-center gap-1.5 shadow-2xs">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Authorized
              </span>
            </div>
          </div>

          {/* Container 2: Role Responsibilities in Clear Plain English */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Your Primary Operational Duties
            </h4>

            {rawRole.includes("operat") ? (
              <div className="space-y-2.5 text-xs text-slate-700">
                <div className="flex items-start gap-2.5">
                  <Compass size={16} className="text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-slate-900">Supervise Vehicle Tracking:</strong>
                    <span className="text-slate-600"> Monitor on-road transport carriers, live transit routes, and GPS coordinates.</span>
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <Users size={16} className="text-indigo-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-slate-900">Direct Team Supervision:</strong>
                    <span className="text-slate-600"> Know who is working under your supervision and oversee driver and crew assignments.</span>
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-slate-900">Update Move Status:</strong>
                    <span className="text-slate-600"> Advance move milestones (En Route, Packing, In Transit, Arrived, Delivered).</span>
                  </div>
                </div>
              </div>
            ) : rawRole.includes("fleet") ? (
              <div className="space-y-2.5 text-xs text-slate-700">
                <div className="flex items-start gap-2.5">
                  <Truck size={16} className="text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-slate-900">Fleet & Vehicle Management:</strong>
                    <span className="text-slate-600"> Supervise commercial transport trucks, RC & fitness papers, and vehicle maintenance.</span>
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <Users size={16} className="text-indigo-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-slate-900">Driver Check-in:</strong>
                    <span className="text-slate-600"> Assign transport vehicles to scheduled customer relocations.</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-2.5 text-xs text-slate-700">
                <div className="flex items-start gap-2.5">
                  <ShieldCheck size={16} className="text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-slate-900">Full Carrier Administration:</strong>
                    <span className="text-slate-600"> Complete oversight of customer bookings, fleet vehicles, team staff, and quotes.</span>
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <Users size={16} className="text-indigo-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-slate-900">Workforce & Roles Control:</strong>
                    <span className="text-slate-600"> Configure staff roles, set supervisory managers, and manage employee accounts.</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Container 3: Clear Key Capabilities (No Clutter) */}
          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Core Authorized Actions
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 rounded-xl bg-white border border-slate-200/70 flex items-center gap-2">
                <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
                <span className="font-semibold text-slate-800">Live Vehicle GPS Tracking</span>
              </div>
              <div className="p-2.5 rounded-xl bg-white border border-slate-200/70 flex items-center gap-2">
                <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
                <span className="font-semibold text-slate-800">1-Click Milestone Updates</span>
              </div>
              <div className="p-2.5 rounded-xl bg-white border border-slate-200/70 flex items-center gap-2">
                <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
                <span className="font-semibold text-slate-800">Team Supervision & Crew</span>
              </div>
              <div className="p-2.5 rounded-xl bg-white border border-slate-200/70 flex items-center gap-2">
                <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
                <span className="font-semibold text-slate-800">Customer Move Schedules</span>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
          <Link
            href="/vendor/profile"
            onClick={onClose}
            className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1.5"
          >
            <UserCheck size={14} />
            <span>Open Individual Profile</span>
          </Link>

          <div className="flex items-center gap-2">
            <Link
              href="/vendor/roles"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition"
            >
              <span>Manage Roles on Page</span>
              <ArrowRight size={13} />
            </Link>

            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-semibold text-xs transition cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
