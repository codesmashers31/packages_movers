"use client";

import React, { useState, useMemo } from "react";
import {
  TrendingUp,
  FileText,
  CalendarCheck,
  Truck,
  HardHat,
  Car,
  Layers,
  Package,
  MapPin,
  FileCheck,
  Users,
  Shield,
  ShieldCheck,
  BarChart3,
  FileClock,
  Store,
  UserCheck,
  FileCheck2,
  AlertTriangle,
  Settings,
  Search,
  CheckCircle2,
  Lock,
  ChevronRight,
} from "lucide-react";

export const ICON_MAP: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  TrendingUp,
  FileText,
  CalendarCheck,
  Truck,
  HardHat,
  Car,
  Layers,
  Package,
  MapPin,
  FileCheck,
  Users,
  Shield,
  ShieldCheck,
  BarChart3,
  FileClock,
  Store,
  UserCheck,
  FileCheck2,
  AlertTriangle,
  Settings,
};

export interface PermissionActionItem {
  key: string;
  label: string;
  actionType?: "read" | "create" | "update" | "delete" | "dispatch" | "action" | "manage" | string;
  description: string;
  aliases?: string[];
}

export interface PermissionModuleItem {
  id: string;
  name: string;
  sidebarHref?: string;
  iconName?: string;
  description?: string;
  actions: PermissionActionItem[];
}

export interface ModuleActionPermissionSelectorProps {
  modules: PermissionModuleItem[] | any[];
  mode: "role" | "employee_override" | "read_only";
  // For mode === "role"
  selectedPermissions?: string[];
  onTogglePermission?: (actionKey: string, nextChecked: boolean) => void;
  onSelectAllModule?: (moduleId: string) => void;
  onClearModule?: (moduleId: string) => void;
  // For mode === "employee_override"
  roleDefaultPermissions?: string[];
  grantedOverrides?: string[];
  revokedOverrides?: string[];
  onToggleAction?: (action: any) => void;
  // For mode === "read_only"
  effectivePermissions?: string[];
  // Layout customization
  compact?: boolean;
}

export function isActionKeyActive(perms: string[], action: PermissionActionItem): boolean {
  if (!Array.isArray(perms) || perms.length === 0) return false;
  if (perms.includes("*")) return true;
  if (perms.includes(action.key)) return true;
  if (action.aliases && action.aliases.some((alias) => perms.includes(alias))) {
    return true;
  }
  return false;
}

export default function ModuleActionPermissionSelector({
  modules,
  mode,
  selectedPermissions = [],
  onTogglePermission,
  onSelectAllModule,
  onClearModule,
  roleDefaultPermissions = [],
  grantedOverrides = [],
  revokedOverrides = [],
  onToggleAction,
  effectivePermissions = [],
  compact = false,
}: ModuleActionPermissionSelectorProps) {
  const [activeModuleId, setActiveModuleId] = useState<string>(modules[0]?.id || "");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [filterType, setFilterType] = useState<"all" | "active" | "overridden" | "restricted">("all");

  // Determine active module object
  const activeModule = useMemo(() => {
    return modules.find((m) => m.id === activeModuleId) || modules[0] || {
      id: "general",
      name: "General",
      actions: [],
    };
  }, [modules, activeModuleId]);

  // Helper to determine if an action is currently active in whatever mode we're in
  const isActionActive = (action: PermissionActionItem): boolean => {
    if (mode === "role") {
      return isActionKeyActive(selectedPermissions, action);
    }
    if (mode === "employee_override") {
      const isRevoked = isActionKeyActive(revokedOverrides, action);
      if (isRevoked) return false;
      const isGranted = isActionKeyActive(grantedOverrides, action);
      if (isGranted) return true;
      return isActionKeyActive(roleDefaultPermissions, action);
    }
    // read_only mode
    return isActionKeyActive(effectivePermissions, action);
  };

  // Helper to determine 3-state badge for employee override mode
  const getActionOverrideState = (action: PermissionActionItem): "role_default" | "granted_override" | "revoked" | "none" => {
    const isRevoked = isActionKeyActive(revokedOverrides, action);
    if (isRevoked) return "revoked";
    const isGranted = isActionKeyActive(grantedOverrides, action);
    if (isGranted) return "granted_override";
    const isBase = isActionKeyActive(roleDefaultPermissions, action);
    if (isBase) return "role_default";
    return "none";
  };

  // Filter actions of selected module by search query and filter pill
  const filteredActions = useMemo(() => {
    return ((activeModule.actions || []) as PermissionActionItem[]).filter((action: PermissionActionItem) => {
      const active = isActionActive(action);
      const state = mode === "employee_override" ? getActionOverrideState(action) : null;

      if (filterType === "active" && !active) return false;
      if (filterType === "restricted" && active) return false;
      if (filterType === "overridden" && state !== "granted_override" && state !== "revoked") {
        return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const labelMatch = action.label.toLowerCase().includes(q);
        const keyMatch = action.key.toLowerCase().includes(q);
        const descMatch = (action.description || "").toLowerCase().includes(q);
        if (!labelMatch && !keyMatch && !descMatch) return false;
      }

      return true;
    });
  }, [activeModule, filterType, searchQuery, mode, selectedPermissions, roleDefaultPermissions, grantedOverrides, revokedOverrides, effectivePermissions]);

  const ActiveIcon = ICON_MAP[activeModule.iconName || ""] || Shield;

  const handleToggleClick = (action: PermissionActionItem) => {
    if (mode === "role" && onTogglePermission) {
      const currentlyActive = isActionKeyActive(selectedPermissions, action);
      onTogglePermission(action.key, !currentlyActive);
    } else if (mode === "employee_override" && onToggleAction) {
      onToggleAction(action);
    }
  };

  return (
    <div className={`grid grid-cols-1 md:grid-cols-12 gap-4 sm:gap-6 items-start ${compact ? "text-xs" : ""}`}>
      {/* ========================================================================= */}
      {/* LEFT COLUMN: Application Modules Navigation with Real Dynamic Counts      */}
      {/* ========================================================================= */}
      <div
        className={`md:col-span-4 bg-white border border-slate-200/90 rounded-2xl p-2.5 sm:p-3 shadow-2xs space-y-1 ${
          compact ? "max-h-[380px] overflow-y-auto" : ""
        }`}
      >
        <div className="px-3 py-2 flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-400">
          <span>Application Modules ({modules.length})</span>
        </div>

        <div className="space-y-1">
          {modules.map((mod) => {
            const IconComp = ICON_MAP[mod.iconName || ""] || FileText;
            const isActive = activeModule.id === mod.id;

            const activeCount = ((mod.actions || []) as PermissionActionItem[]).filter((a: PermissionActionItem) => isActionActive(a)).length;
            const totalCount = mod.actions?.length || 0;

            return (
              <button
                key={mod.id}
                type="button"
                onClick={() => {
                  setActiveModuleId(mod.id);
                  setSearchQuery("");
                }}
                className={`w-full flex items-center justify-between p-2.5 sm:p-3 rounded-xl text-left transition cursor-pointer ${
                  isActive
                    ? "bg-slate-900 text-white shadow-xs font-semibold"
                    : "text-slate-700 hover:bg-slate-100/70 font-medium"
                }`}
              >
                <div className="flex items-center gap-2.5 sm:gap-3 truncate min-w-0">
                  <div
                    className={`p-1.5 sm:p-2 rounded-lg shrink-0 ${
                      isActive ? "bg-white/15 text-white" : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    <IconComp size={compact ? 14 : 16} />
                  </div>
                  <div className="truncate min-w-0">
                    <div className="text-xs font-semibold truncate leading-tight">{mod.name}</div>
                    <div className={`text-[10px] truncate mt-0.5 ${isActive ? "text-slate-300" : "text-slate-400"}`}>
                      {totalCount} action{totalCount === 1 ? "" : "s"}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0 ml-2">
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      isActive
                        ? "bg-white/20 text-white"
                        : activeCount === totalCount && totalCount > 0
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : activeCount > 0
                        ? "bg-blue-50 text-blue-700 border border-blue-200"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {activeCount}/{totalCount}
                  </span>
                  <ChevronRight size={13} className={isActive ? "text-white" : "text-slate-400"} />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* RIGHT COLUMN: Actions for Selected Module with [ ON / OFF ] Switches     */}
      {/* ========================================================================= */}
      <div
        className={`md:col-span-8 bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-6 shadow-2xs space-y-4 sm:space-y-5 ${
          compact ? "max-h-[500px] overflow-y-auto" : ""
        }`}
      >
        {/* Module Header & Search/Filter Controls */}
        <div className="border-b border-slate-100 pb-4 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-2 sm:p-2.5 rounded-xl bg-slate-100 text-slate-800 shrink-0">
                <ActiveIcon size={compact ? 18 : 20} />
              </div>
              <div className="min-w-0">
                <h4 className="text-sm font-bold text-slate-900 flex flex-wrap items-center gap-2">
                  <span className="truncate">{activeModule.name}</span>
                  {activeModule.sidebarHref && (
                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-mono">
                      {activeModule.sidebarHref}
                    </span>
                  )}
                </h4>
                {activeModule.description && (
                  <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{activeModule.description}</p>
                )}
              </div>
            </div>

            {/* In Role mode, provide Quick Module Select/Clear All */}
            {mode === "role" && onSelectAllModule && onClearModule && (
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => onSelectAllModule(activeModule.id)}
                  className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 cursor-pointer hover:underline"
                >
                  Enable All
                </button>
                <span className="text-slate-300">|</span>
                <button
                  type="button"
                  onClick={() => onClearModule(activeModule.id)}
                  className="text-[11px] font-semibold text-slate-500 hover:text-slate-700 cursor-pointer hover:underline"
                >
                  Disable All
                </button>
              </div>
            )}
          </div>

          {/* Filter Pills & Search Input */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-1">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              <button
                type="button"
                onClick={() => setFilterType("all")}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  filterType === "all" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                All ({activeModule.actions?.length || 0})
              </button>
              <button
                type="button"
                onClick={() => setFilterType("active")}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  filterType === "active" ? "bg-emerald-700 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                Active ({((activeModule.actions || []) as PermissionActionItem[]).filter((a: PermissionActionItem) => isActionActive(a)).length})
              </button>
              {mode === "employee_override" && (
                <button
                  type="button"
                  onClick={() => setFilterType("overridden")}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                    filterType === "overridden" ? "bg-blue-700 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  Overrides (
                  {
                    ((activeModule.actions || []) as PermissionActionItem[]).filter((a: PermissionActionItem) => {
                      const s = getActionOverrideState(a);
                      return s === "granted_override" || s === "revoked";
                    }).length
                  }
                  )
                </button>
              )}
              <button
                type="button"
                onClick={() => setFilterType("restricted")}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  filterType === "restricted" ? "bg-rose-700 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                Restricted ({((activeModule.actions || []) as PermissionActionItem[]).filter((a: PermissionActionItem) => !isActionActive(a)).length})
              </button>
            </div>

            <div className="relative min-w-[180px]">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search actions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-7 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
              />
            </div>
          </div>
        </div>

        {/* Actions List */}
        <div className="space-y-2.5">
          {filteredActions.length === 0 ? (
            <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-100 text-xs text-slate-500 space-y-1">
              <p className="font-semibold text-slate-700">No matching action types found</p>
              <p className="text-[11px] text-slate-400">Try adjusting your search query or active filter.</p>
            </div>
          ) : (
            filteredActions.map((action: PermissionActionItem) => {
              const active = isActionActive(action);
              const overrideState = mode === "employee_override" ? getActionOverrideState(action) : null;

              const typeBadge = (() => {
                switch (action.actionType) {
                  case "read":
                    return { label: "VIEW / READ", bg: "bg-sky-50 text-sky-700 border-sky-200" };
                  case "create":
                    return { label: "CREATE", bg: "bg-emerald-50 text-emerald-700 border-emerald-200" };
                  case "update":
                    return { label: "EDIT / UPDATE", bg: "bg-amber-50 text-amber-700 border-amber-200" };
                  case "delete":
                    return { label: "DELETE / CANCEL", bg: "bg-rose-50 text-rose-700 border-rose-200" };
                  case "dispatch":
                    return { label: "DISPATCH / ASSIGN", bg: "bg-purple-50 text-purple-700 border-purple-200" };
                  case "manage":
                    return { label: "CONFIGURE", bg: "bg-indigo-50 text-indigo-700 border-indigo-200" };
                  default:
                    return { label: "ACTION", bg: "bg-slate-50 text-slate-700 border-slate-200" };
                }
              })();

              return (
                <div
                  key={action.key}
                  className={`p-3.5 sm:p-4 rounded-xl sm:rounded-2xl border transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    active
                      ? "bg-slate-50/70 border-slate-200/90 hover:border-slate-300"
                      : "bg-white border-slate-100/90 hover:border-slate-200 opacity-80"
                  }`}
                >
                  <div className="space-y-1.5 max-w-xl min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-md border ${typeBadge.bg}`}>
                        {typeBadge.label}
                      </span>
                      <span className="text-xs font-bold text-slate-900">{action.label}</span>

                      {/* State Badges depending on Mode */}
                      {mode === "employee_override" && (
                        <>
                          {overrideState === "role_default" && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                              Role Default
                            </span>
                          )}
                          {overrideState === "granted_override" && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                              <span>+</span> Custom Granted
                            </span>
                          )}
                          {overrideState === "revoked" && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-800 border border-rose-300 flex items-center gap-1">
                              <span>−</span> Custom Revoked
                            </span>
                          )}
                          {overrideState === "none" && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-500">
                              Restricted
                            </span>
                          )}
                        </>
                      )}

                      {mode === "role" && (
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            active
                              ? "bg-blue-50 text-blue-700 border border-blue-200"
                              : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {active ? "Enabled" : "Disabled"}
                        </span>
                      )}

                      {mode === "read_only" && (
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            active
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-slate-100 text-slate-400"
                          }`}
                        >
                          {active ? "Allowed" : "Restricted"}
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-500 leading-relaxed">{action.description}</p>
                    <div className="text-[10px] font-mono text-slate-400">
                      Action Key: <span className="text-slate-600 font-semibold">{action.key}</span>
                    </div>
                  </div>

                  {/* Right Control: Switch for interactive modes, Badge for read-only */}
                  <div className="shrink-0 flex items-center gap-3 self-end sm:self-center">
                    {mode !== "read_only" ? (
                      <button
                        type="button"
                        role="switch"
                        aria-checked={active}
                        onClick={() => handleToggleClick(action)}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 ${
                          active ? "bg-slate-900" : "bg-slate-200"
                        }`}
                      >
                        <span
                          aria-hidden="true"
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                            active ? "translate-x-5" : "translate-x-0"
                          }`}
                        />
                      </button>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        {active ? (
                          <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold">
                            <CheckCircle2 size={13} />
                            <span>Allowed</span>
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-400 border border-slate-200 text-xs font-semibold">
                            <Lock size={12} />
                            <span>Restricted</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
