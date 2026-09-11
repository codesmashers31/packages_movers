"use client";

import React from "react";

interface PageHeaderProps {
  title: string;
  description?: string;
  children?: React.ReactNode;
}

export default function PageHeader({ title, description, children }: PageHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#D9E2EC]/80">
      <div>
        <h1 className="text-2xl font-bold text-[#1E293B] tracking-tight">{title}</h1>
        {description && <p className="text-sm text-[#64748B] mt-1">{description}</p>}
      </div>
      {children && <div className="flex items-center gap-2.5 shrink-0">{children}</div>}
    </div>
  );
}
