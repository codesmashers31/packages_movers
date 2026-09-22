export type PermissionActionType = "read" | "create" | "update" | "delete" | "dispatch" | "action" | "manage";

export interface PermissionActionDef {
  key: string;
  label: string;
  actionType: PermissionActionType;
  description: string;
  aliases?: string[];
}

export interface VendorSidebarModuleDef {
  id: string;
  name: string; // Exact sidebar name
  sidebarHref: string;
  iconName: string;
  description: string;
  actions: PermissionActionDef[];
}

export const VENDOR_SIDEBAR_MODULES: VendorSidebarModuleDef[] = [
  {
    id: "demand",
    name: "Demand Insights",
    sidebarHref: "/vendor/demand",
    iconName: "TrendingUp",
    description: "Prospective customer leads, heatmaps, and route demand analytics across serviced territories.",
    actions: [
      {
        key: "demand:view",
        label: "View Customer Demand & Leads",
        actionType: "read",
        description: "Inspect customer move volume trends, popular origin-destination routes, and new inquiries.",
        aliases: ["Review Available Customer Leads", "Quotation Performance & Insights", "Demand Insights: Can View Customer Demand & Leads", "View Customer Demand & Routes"],
      },
      {
        key: "demand:export",
        label: "Export Demand Analytics",
        actionType: "action",
        description: "Download route demand summaries, win/loss conversion rates, and volume metrics.",
        aliases: ["Quotation Performance & Insights", "Reports & Performance Analytics", "Demand Insights: Can Export Demand Analytics", "Export Demand Analytics"],
      },
    ],
  },
  {
    id: "quotations",
    name: "Quotations",
    sidebarHref: "/vendor/quotations",
    iconName: "FileText",
    description: "Customer move inquiries, formal bidding, pricing estimates, and customer offer negotiations.",
    actions: [
      {
        key: "quotations:view",
        label: "View Quotations",
        actionType: "read",
        description: "Inspect incoming customer requests, inventory volume manifests, and pricing history.",
        aliases: ["Review Available Customer Leads", "View Quotations", "quotations:view", "Quotation: Can View Only", "Can View Quotations Only", "Can View Quotations"],
      },
      {
        key: "quotations:create",
        label: "Create Quotations",
        actionType: "create",
        description: "Draft and create price bids, inventory estimates, and customized packing costs for clients.",
        aliases: ["Create & Submit Formal Quotations", "Create Quotations", "quotations:create", "Quotation: Can Create Quotations", "Can Create Quotations"],
      },
      {
        key: "quotations:edit",
        label: "Edit Quotations",
        actionType: "update",
        description: "Adjust quotation rates, apply discounts, and update moving conditions before confirmation.",
        aliases: ["Edit Quotations", "quotations:edit", "quotations:manage", "Quotation: Can Edit Quotations", "Can Edit Quotations"],
      },
      {
        key: "quotations:submit",
        label: "Submit Quotations",
        actionType: "action",
        description: "Formally seal and dispatch finalized quotation bids directly to customers.",
        aliases: ["Submit Quotations", "Create & Submit Formal Quotations", "quotations:create", "quotations:submit", "Quotation: Can Submit Quotations", "Can Submit Quotations"],
      },
    ],
  },
  {
    id: "bookings",
    name: "Bookings",
    sidebarHref: "/vendor/bookings",
    iconName: "CalendarCheck",
    description: "Confirmed moving jobs, pickup/drop manifests, crew dispatch, and delivery execution.",
    actions: [
      {
        key: "bookings:view",
        label: "View Bookings",
        actionType: "read",
        description: "Access customer move schedules, cargo item manifests, pickup/delivery addresses, and notes.",
        aliases: ["View & Dispatch Bookings", "View Bookings", "bookings:view", "Bookings: Can View Bookings", "Can View Bookings"],
      },
      {
        key: "bookings:dispatch",
        label: "Dispatch Bookings",
        actionType: "dispatch",
        description: "Confirm moving schedules, assign operational coordinators, and schedule departure times.",
        aliases: ["Bookings & Job Dispatch", "Dispatch Bookings", "bookings:dispatch", "Bookings: Can Dispatch Bookings", "Can Dispatch Bookings"],
      },
      {
        key: "bookings:update_status",
        label: "Update Booking Status",
        actionType: "update",
        description: "Advance moving progress stages: Scheduled, Packed, In Transit, Arrived, and Completed.",
        aliases: ["Update Move Progression Milestones", "Update Booking Status", "bookings:update_status", "Bookings: Can Update Booking Status", "Can Update Booking Status"],
      },
      {
        key: "bookings:verify_delivery",
        label: "Verify Delivery OTP",
        actionType: "action",
        description: "Validate customer recipient drop-off security PIN code at destination to finalize the job.",
        aliases: ["Enter Recipient Delivery Verification Code", "Verify Delivery OTP", "bookings:verify_delivery", "Bookings: Can Verify Delivery OTP", "Can Verify Delivery OTP"],
      },
    ],
  },
  {
    id: "tracking",
    name: "Live Tracking",
    sidebarHref: "/vendor/tracking",
    iconName: "Truck",
    description: "Real-time GPS tracking of moving vehicles, driver communications, and customer delay alerts.",
    actions: [
      {
        key: "tracking:view",
        label: "View Live Tracking",
        actionType: "read",
        description: "Monitor live vehicle locations, speed telemetry, and active route trajectories on the map.",
        aliases: ["View Live GPS Tracking", "Fleet & Vehicle Operations", "View Tracking", "tracking:view", "Live Tracking: Can View Live Tracking", "Can View Live Tracking"],
      },
      {
        key: "tracking:view_crew",
        label: "View Assigned Crew",
        actionType: "read",
        description: "Inspect on-duty moving crew, certified drivers, and operational personnel on transit routes.",
        aliases: ["View Assigned Crew", "workers:view", "Customer Support Coordination", "Manage Employees & Crew", "Live Tracking: Can View Assigned Crew", "Can View Assigned Crew"],
      },
      {
        key: "tracking:view_vehicles",
        label: "View Assigned Vehicles",
        actionType: "read",
        description: "Inspect commercial moving truck specifications, plate numbers, and telemetry tracking units.",
        aliases: ["View Assigned Vehicles", "vehicles:view", "Fleet & Vehicle Operations", "Live Tracking: Can View Assigned Vehicles", "Can View Assigned Vehicles"],
      },
      {
        key: "tracking:update_status",
        label: "Update Tracking Status",
        actionType: "update",
        description: "Broadcast real-time transit progression milestones, route delays, and updated arrival ETAs.",
        aliases: ["Update Tracking Status", "Customer Support Coordination", "Update Move Progression Milestones", "Broadcast Transit Updates & Delays", "Live Tracking: Can Update Tracking Status", "Can Update Tracking Status"],
      },
    ],
  },
  {
    id: "workers",
    name: "Crew Workers",
    sidebarHref: "/vendor/workers",
    iconName: "HardHat",
    description: "On-ground movers, certified drivers, daily shift rosters, and field crew management.",
    actions: [
      {
        key: "workers:view",
        label: "View Crew Workers",
        actionType: "read",
        description: "Inspect on-ground moving crew profiles, licenses, contact numbers, and duty statuses.",
        aliases: ["Manage Employees & Crew", "View Crew Attendance & Performance", "View Crew Workers", "Crew Workers: Can View Crew Workers", "Can View Crew Workers"],
      },
      {
        key: "workers:assign",
        label: "Assign Crew to Bookings",
        actionType: "dispatch",
        description: "Allocate certified drivers and moving crew members to confirmed customer bookings.",
        aliases: ["Assign Available Workers & Crew", "Assign Crew", "Crew Workers: Can Assign Crew to Bookings", "Can Assign Crew to Bookings"],
      },
      {
        key: "workers:manage",
        label: "Manage Crew Duty & Attendance",
        actionType: "manage",
        description: "Log daily worker attendance, check-in duty shifts, and maintain operational performance notes.",
        aliases: ["View Crew Attendance & Performance", "Manage Crew Duty", "Crew Workers: Can Manage Crew Duty & Attendance", "Can Manage Crew Duty & Attendance"],
      },
    ],
  },
  {
    id: "vehicles",
    name: "Fleet Vehicles",
    sidebarHref: "/vendor/vehicles",
    iconName: "Car",
    description: "Moving trucks, container specifications, maintenance logs, and vehicle dispatch allocation.",
    actions: [
      {
        key: "vehicles:view",
        label: "View Fleet Vehicles",
        actionType: "read",
        description: "Browse registered commercial trucks, vehicle capacity, registration certificates, and fitness.",
        aliases: ["Fleet & Vehicle Operations", "View Vehicles", "Fleet Vehicles: Can View Fleet Vehicles", "Can View Fleet Vehicles"],
      },
      {
        key: "vehicles:assign",
        label: "Assign Transport Trucks",
        actionType: "dispatch",
        description: "Designate specific moving trucks and transport carriers to confirmed customer moves.",
        aliases: ["Assign Transport Trucks to Moves", "Assign Vehicles", "Fleet Vehicles: Can Assign Transport Trucks", "Can Assign Transport Trucks"],
      },
      {
        key: "vehicles:maintenance",
        label: "Record Maintenance & Logs",
        actionType: "update",
        description: "Log pre-trip vehicle condition, odometer, fitness renewals, and repair maintenance.",
        aliases: ["Vehicle Inspection & Maintenance Tracking", "vehicles:manage", "Fleet Vehicles: Can Record Maintenance & Logs", "Can Record Maintenance & Logs"],
      },
    ],
  },
  {
    id: "services",
    name: "Services Catalog",
    sidebarHref: "/vendor/services",
    iconName: "Layers",
    description: "Company service offerings, fragile item packing options, and custom rate cards.",
    actions: [
      {
        key: "services:view",
        label: "View Services Catalog",
        actionType: "read",
        description: "Browse company service offerings, specialized packing options, and assembly rates.",
        aliases: ["Service Catalog Configuration", "View Services", "Services Catalog: Can View Services Catalog", "Can View Services Catalog"],
      },
      {
        key: "services:manage",
        label: "Configure Services & Pricing",
        actionType: "manage",
        description: "Add, edit, or archive service offerings, base rates, and specialized handling fees.",
        aliases: ["Service Catalog Configuration", "Custom Specialized Services", "Manage Services", "Services Catalog: Can Configure Services & Pricing", "Can Configure Services & Pricing"],
      },
    ],
  },
  {
    id: "packages",
    name: "Moving Packages",
    sidebarHref: "/vendor/packages",
    iconName: "Package",
    description: "Pre-set moving package tiers (e.g. 1BHK, 2BHK, Villa, Office) and bundle discounts.",
    actions: [
      {
        key: "packages:view",
        label: "View Moving Packages",
        actionType: "read",
        description: "Browse packaged moving bundles, residential tiers, and included services.",
        aliases: ["Service Catalog Configuration", "Moving Packages: Can View Moving Packages", "Can View Moving Packages"],
      },
      {
        key: "packages:manage",
        label: "Create & Manage Packages",
        actionType: "manage",
        description: "Design, publish, or modify moving package bundles and promotional prices.",
        aliases: ["Service Catalog Configuration", "Moving Packages: Can Create & Manage Packages", "Can Create & Manage Packages"],
      },
    ],
  },
  {
    id: "service-areas",
    name: "Service Areas",
    sidebarHref: "/vendor/service-areas",
    iconName: "MapPin",
    description: "Operating cities, served postal pin codes, and intercity moving transport corridors.",
    actions: [
      {
        key: "service_areas:view",
        label: "View Service Areas",
        actionType: "read",
        description: "Inspect operational cities, postal coverage lists, and active intercity corridors.",
        aliases: ["Coverage Areas Configuration", "View Service Areas", "Service Areas: Can View Service Areas", "Can View Service Areas"],
      },
      {
        key: "service_areas:manage",
        label: "Manage Operating Coverage",
        actionType: "manage",
        description: "Add, modify, or expand serviceable cities, pin codes, and territorial transit rates.",
        aliases: ["Coverage Areas Configuration", "Manage Service Areas", "Service Areas: Can Manage Operating Coverage", "Can Manage Operating Coverage"],
      },
    ],
  },
  {
    id: "company-profile",
    name: "Company Profile",
    sidebarHref: "/vendor/company-profile",
    iconName: "Building2",
    description: "Company overview, workforce metrics, business verification documents, and KYC status.",
    actions: [
      {
        key: "company_profile:view",
        label: "View Company Profile & Verification",
        actionType: "read",
        description: "Inspect company overview, workforce metrics, verification documents, and regulatory status.",
        aliases: [
          "documents:view",
          "Document Submissions",
          "Regulatory Status Monitoring",
          "View Documents",
          "Company Profile: Can View Company Profile",
          "Can View Company Profile",
        ],
      },
      {
        key: "company_profile:edit",
        label: "Edit Company Profile & Details",
        actionType: "update",
        description: "Update company overview, contact phone, contact email, logo, and serviced areas.",
        aliases: [
          "company_profile:manage",
          "Company Profile: Can Edit Company Profile",
          "Can Edit Company Profile",
        ],
      },
      {
        key: "company_profile:upload_documents",
        label: "Upload & Submit Verification Documents",
        actionType: "create",
        description: "Upload and submit business permits, GST certificates, insurance, and representative KYC.",
        aliases: [
          "documents:upload",
          "Document Submissions",
          "Upload Documents",
          "Company Profile: Can Upload Verification Documents",
          "Can Upload Verification Documents",
        ],
      },
    ],
  },
  {
    id: "employees",
    name: "Employees",
    sidebarHref: "/vendor/employees",
    iconName: "Users",
    description: "Corporate workforce directory, departmental reporting hierarchy, and account provisioning.",
    actions: [
      {
        key: "employees:view",
        label: "View Employees",
        actionType: "read",
        description: "Browse company staff directory, phone numbers, assigned roles, and supervisory relationships.",
        aliases: ["Manage Employees & Crew", "staff:view", "View Staff Directory", "View Employees", "Employees: Can View Employees", "Can View Employees", "employees:view"],
      },
      {
        key: "employees:create",
        label: "Create Employee Accounts",
        actionType: "create",
        description: "Create employee accounts, assign initial operational roles, and issue login credentials.",
        aliases: ["Manage Employees & Crew", "staff:manage", "Onboard Employees", "Create Employee", "Employees: Can Create Employee Accounts", "Can Create Employees", "employees:create"],
      },
      {
        key: "employees:edit",
        label: "Edit Employee Records",
        actionType: "update",
        description: "Update staff profiles, reporting manager ('Reports To'), and department assignments.",
        aliases: ["Manage Employees & Crew", "staff:manage", "Edit Staff Accounts", "Edit Employee", "Employees: Can Edit Employee Records", "Can Edit Employees", "employees:edit"],
      },
      {
        key: "employees:assign",
        label: "Assign Supervisor & Scope",
        actionType: "dispatch",
        description: "Assign employee operational scope, supervisory reports, or update active status.",
        aliases: ["Manage Employees & Crew", "staff:manage", "Assign Employee", "employees:status", "Manage Account Status", "Employees: Can Assign Supervisor & Scope", "Can Assign Employee", "employees:assign"],
      },
    ],
  },
  {
    id: "roles",
    name: "Roles & Rules",
    sidebarHref: "/vendor/roles",
    iconName: "Shield",
    description: "Company role definitions, operational scope boundaries, and access control governance.",
    actions: [
      {
        key: "roles:view",
        label: "View Roles & Rules",
        actionType: "read",
        description: "Inspect standard company roles, operational scopes, and assigned permission summaries.",
        aliases: ["View Company Roles", "roles:view", "permissions:manage", "View Roles", "Roles & Rules: Can View Roles & Rules", "Can View Roles & Rules"],
      },
      {
        key: "roles:create",
        label: "Create & Manage Roles",
        actionType: "create",
        description: "Define new custom roles tailored to specific company operational scopes.",
        aliases: ["roles:manage", "permissions:manage", "Create Role", "roles:create", "Roles & Rules: Can Create & Manage Roles", "Can Create & Manage Roles"],
      },
      {
        key: "roles:edit",
        label: "Edit Roles",
        actionType: "update",
        description: "Modify existing role titles, base descriptions, and operational responsibilities.",
        aliases: ["roles:manage", "permissions:manage", "Edit Role", "roles:edit", "Roles & Rules: Can Create & Manage Roles"],
      },
    ],
  },
  {
    id: "permissions",
    name: "Permissions",
    sidebarHref: "/vendor/permissions",
    iconName: "KeyRound",
    description: "Company permissions governance, role access baselines, and individual employee capability overrides.",
    actions: [
      {
        key: "permissions:view",
        label: "View Permissions",
        actionType: "read",
        description: "Inspect granular permission matrices, role defaults, and employee override status.",
        aliases: ["permissions:view", "roles:view", "permissions:manage", "View Permissions", "Permissions: Can View Permissions", "Can View Permissions"],
      },
      {
        key: "permissions:manage",
        label: "Manage Employee Permissions",
        actionType: "manage",
        description: "Configure role baseline capabilities and grant or revoke individual employee overrides.",
        aliases: ["permissions:manage", "roles:manage", "Manage Permissions", "Permissions: Can Manage Employee Permissions", "Can Manage Employee Permissions"],
      },
    ],
  },
  {
    id: "reports",
    name: "Business Reports",
    sidebarHref: "/vendor/reports",
    iconName: "BarChart3",
    description: "Financial performance summaries, completed move metrics, and fleet utilization analytics.",
    actions: [
      {
        key: "reports:view",
        label: "View Business Reports",
        actionType: "read",
        description: "Inspect gross moving revenue, booking volumes, driver payouts, and profitability charts.",
        aliases: ["Reports & Performance Analytics", "View Reports", "Business Reports: Can View Business Reports", "Can View Business Reports"],
      },
      {
        key: "reports:export",
        label: "Export Operational Analytics",
        actionType: "action",
        description: "Download CSV statements and operational metrics for accounting and executive review.",
        aliases: ["Reports & Performance Analytics", "Export Reports", "Business Reports: Can Export Operational Analytics", "Can Export Operational Analytics"],
      },
    ],
  },
  {
    id: "audit-logs",
    name: "Activity Logs",
    sidebarHref: "/vendor/audit-logs",
    iconName: "FileClock",
    description: "Immutable chronological audit trail of team operations, status changes, and dispatch reassignments.",
    actions: [
      {
        key: "audit_logs:view",
        label: "View Activity Logs",
        actionType: "read",
        description: "Audit immutable chronological logs of actions, status updates, and assignments across the company.",
        aliases: ["Operational Audit Logs", "audit:view", "View Activity Logs", "Activity Logs: Can View Activity Logs", "Can View Activity Logs"],
      },
    ],
  },
];

/**
 * Checks whether an effective permissions array satisfies an action definition.
 * Supports exact key, wildcard '*', and designated aliases.
 */
export function isActionGranted(effectivePermissions: string[], action: PermissionActionDef): boolean {
  if (!Array.isArray(effectivePermissions) || effectivePermissions.length === 0) return false;
  if (effectivePermissions.includes("*")) return true;
  if (effectivePermissions.includes(action.key)) return true;
  if (action.aliases && action.aliases.some((alias) => effectivePermissions.includes(alias))) {
    return true;
  }
  return false;
}

/**
 * Checks whether an effective permissions array has a specific action key granted.
 */
export function hasPermissionKey(effectivePermissions: string[], actionKey: string): boolean {
  if (!Array.isArray(effectivePermissions) || effectivePermissions.length === 0) return false;
  if (effectivePermissions.includes("*")) return true;
  if (effectivePermissions.includes(actionKey)) return true;
  for (const mod of VENDOR_SIDEBAR_MODULES) {
    for (const act of mod.actions) {
      if (act.key === actionKey) {
        return isActionGranted(effectivePermissions, act);
      }
    }
  }
  return false;
}
