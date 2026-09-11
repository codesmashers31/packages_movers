"use client";

import React from "react";

export type SemanticStatus =
  | "active"
  | "suspended"
  | "deleted"
  | "PENDING_REVIEW"
  | "CHANGES_REQUESTED"
  | "APPROVED"
  | "REJECTED"
  | "SUSPENDED"
  | "PENDING_PAYMENT"
  | "CONFIRMED"
  | "ASSIGNED"
  | "EN_ROUTE_PICKUP"
  | "ARRIVED_PICKUP"
  | "PACKING"
  | "LOADING"
  | "IN_TRANSIT"
  | "ARRIVED_DROPOFF"
  | "UNLOADING"
  | "AWAITING_CONFIRMATION"
  | "COMPLETED"
  | "CANCELLED"
  | "TERMINATED"
  | string;

interface StatusBadgeProps {
  status: SemanticStatus;
  label?: string;
}

export default function StatusBadge({ status, label }: StatusBadgeProps) {
  const norm = (status || "").toUpperCase();

  let styles = "bg-[#EEF2F6] text-[#1E293B] shadow-neu-raised-sm border border-white/80";
  let dotColor = "bg-[#64748B]";
  let displayLabel = label || status;

  if (["ACTIVE", "APPROVED", "COMPLETED"].includes(norm)) {
    // Teal accent for success / completed / verified
    styles = "bg-teal-50 text-teal-800 shadow-neu-raised-sm border border-teal-200/80";
    dotColor = "bg-[#14B8A6]";
  } else if (["PENDING_REVIEW", "PENDING_PAYMENT", "AWAITING_CONFIRMATION", "CHANGES_REQUESTED"].includes(norm)) {
    // Amber accent for pending / review required
    styles = "bg-amber-50 text-amber-900 shadow-neu-raised-sm border border-amber-200/80";
    dotColor = "bg-[#F59E0B]";
  } else if (["CONFIRMED", "ASSIGNED", "EN_ROUTE_PICKUP", "ARRIVED_PICKUP", "PACKING", "LOADING", "IN_TRANSIT", "ARRIVED_DROPOFF", "UNLOADING"].includes(norm)) {
    // Sky Blue accent for active movement / in-transit
    styles = "bg-sky-50 text-sky-900 shadow-neu-raised-sm border border-sky-200/80";
    dotColor = "bg-[#0EA5E9]";
  } else if (["SUSPENDED", "REJECTED", "CANCELLED", "TERMINATED", "DELETED"].includes(norm)) {
    // Rose accent for warnings / restrictions
    styles = "bg-rose-50 text-rose-800 shadow-neu-raised-sm border border-rose-200/80";
    dotColor = "bg-rose-500";
  }

  // Format label for display if not customized
  if (!label && norm.includes("_")) {
    displayLabel = norm
      .toLowerCase()
      .split("_")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${styles}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${dotColor}`} />
      <span>{displayLabel}</span>
    </span>
  );
}
