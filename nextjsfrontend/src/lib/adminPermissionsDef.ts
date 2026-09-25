export type AdminPermissionActionType = "read" | "create" | "update" | "delete" | "action" | "manage";

export interface AdminPermissionActionDef {
  key: string;
  label: string;
  actionType: AdminPermissionActionType;
  description: string;
  aliases?: string[];
}

export interface AdminSidebarModuleDef {
  id: string;
  name: string; // Exact sidebar name
  sidebarHref: string;
  iconName: string;
  description: string;
  actions: AdminPermissionActionDef[];
}

export const ADMIN_SIDEBAR_MODULES: AdminSidebarModuleDef[] = [
  {
    id: "users",
    name: "Customer Accounts",
    sidebarHref: "/admin/users",
    iconName: "Users",
    description: "Consumer customer accounts, moving history, profile verification, and account statuses.",
    actions: [
      {
        key: "users:view",
        label: "Read Customer Accounts",
        actionType: "read",
        description: "Browse registered users, contact phone numbers, verified states, and moving history.",
        aliases: ["users:view"],
      },
      {
        key: "users:create",
        label: "Onboard Customers & Users",
        actionType: "create",
        description: "Manually provision customer or individual driver accounts from platform headquarters.",
        aliases: ["users:create"],
      },
      {
        key: "users:edit",
        label: "Edit Account Records",
        actionType: "update",
        description: "Modify user profile information, contact channels, and credential resets.",
        aliases: ["users:edit"],
      },
      {
        key: "users:status",
        label: "Suspend Customer Accounts",
        actionType: "delete",
        description: "Deactivate, suspend, or block delinquent customer accounts.",
        aliases: ["users:manage"],
      },
    ],
  },
  {
    id: "vendors",
    name: "Carrier Partners",
    sidebarHref: "/admin/vendors",
    iconName: "Store",
    description: "Enterprise commercial mover partnerships, corporate profiles, and operating authority.",
    actions: [
      {
        key: "vendors:view",
        label: "Read Carrier Directory",
        actionType: "read",
        description: "Inspect commercial mover profiles, verified fleet sizes, ratings, and operating headquarters.",
        aliases: ["vendors:view"],
      },
      {
        key: "vendors:approve",
        label: "Approve Partner Applications",
        actionType: "action",
        description: "Review carrier onboarding applications and grant official platform verification status.",
        aliases: ["vendors:approve"],
      },
      {
        key: "vendors:edit",
        label: "Edit Carrier Details",
        actionType: "update",
        description: "Update company profile details, operational contacts, and dispatch guidelines.",
        aliases: ["vendors:manage"],
      },
      {
        key: "vendors:suspend",
        label: "Suspend Operating Authority",
        actionType: "delete",
        description: "Temporarily freeze or terminate non-compliant vendor accounts from accepting moves.",
        aliases: ["vendors:suspend"],
      },
    ],
  },
  {
    id: "vendor-requests",
    name: "Partner Requests",
    sidebarHref: "/admin/vendor-requests",
    iconName: "UserCheck",
    description: "Pending onboarding submissions from prospective transport carriers seeking platform registration.",
    actions: [
      {
        key: "vendor_requests:view",
        label: "Read Partner Requests",
        actionType: "read",
        description: "Browse submitted applications, fleet declarations, and company credentials.",
        aliases: ["vendors:view"],
      },
      {
        key: "vendor_requests:decide",
        label: "Approve or Reject Requests",
        actionType: "action",
        description: "Process partner registration decisions and issue formal acceptance or feedback notices.",
        aliases: ["vendors:approve"],
      },
    ],
  },
  {
    id: "documents",
    name: "Carrier Documents",
    sidebarHref: "/admin/documents",
    iconName: "FileCheck2",
    description: "Legal verification of trade licenses, commercial transport permits, and cargo insurance.",
    actions: [
      {
        key: "documents:view",
        label: "Read Submitted Documents",
        actionType: "read",
        description: "Access and review legal registration certificates, GST documents, and carrier insurance policies.",
        aliases: ["documents:view"],
      },
      {
        key: "documents:verify",
        label: "Verify & Approve Documents",
        actionType: "action",
        description: "Certify verified regulatory filings and validate coverage validity expiration dates.",
        aliases: ["documents:verify"],
      },
      {
        key: "documents:reject",
        label: "Reject & Request Resubmission",
        actionType: "delete",
        description: "Flag deficient documents with clear legal remediation instructions to the carrier.",
        aliases: ["documents:reject"],
      },
    ],
  },
  {
    id: "packages",
    name: "Moving Packages",
    sidebarHref: "/admin/packages",
    iconName: "Package",
    description: "Global package specifications, standard residential tiers, and consumer move catalog.",
    actions: [
      {
        key: "packages:view",
        label: "Read Package Catalog",
        actionType: "read",
        description: "Inspect system standard moving packages, inclusions, and tier guidelines.",
        aliases: ["packages:manage"],
      },
      {
        key: "packages:manage",
        label: "Manage Package Configurations",
        actionType: "manage",
        description: "Publish, update, or archive platform-wide moving package definitions.",
        aliases: ["packages:manage"],
      },
    ],
  },
  {
    id: "service-areas",
    name: "Service Areas",
    sidebarHref: "/admin/service-areas",
    iconName: "MapPin",
    description: "Regional transit corridors, operational city zones, and intercity route boundaries.",
    actions: [
      {
        key: "service_areas:view",
        label: "Read Service Hubs & Routes",
        actionType: "read",
        description: "Browse nationwide moving territory boundaries, regional hubs, and pin code maps.",
        aliases: ["service_areas:manage"],
      },
      {
        key: "service_areas:manage",
        label: "Manage Service Hubs",
        actionType: "manage",
        description: "Add or modify active intercity corridors, hub centers, and territorial boundary rules.",
        aliases: ["service_areas:manage"],
      },
    ],
  },
  {
    id: "bookings",
    name: "Bookings & Operations",
    sidebarHref: "/admin/bookings",
    iconName: "CalendarCheck",
    description: "Consumer moving jobs, carrier fulfillment monitoring, and platform intervention.",
    actions: [
      {
        key: "bookings:view",
        label: "Read Platform Bookings",
        actionType: "read",
        description: "Inspect customer bookings across all carriers, schedules, and delivery progress.",
        aliases: ["bookings:view"],
      },
      {
        key: "bookings:intervene",
        label: "Intervene & Reassign Bookings",
        actionType: "update",
        description: "Reassign delinquent or delayed customer bookings to backup carriers.",
        aliases: ["bookings:manage"],
      },
      {
        key: "bookings:cancel",
        label: "Cancel Bookings",
        actionType: "delete",
        description: "Authorize formal cancellations and process consumer refund authorizations.",
        aliases: ["bookings:manage"],
      },
    ],
  },
  {
    id: "disputes",
    name: "Disputes & Claims",
    sidebarHref: "/admin/disputes",
    iconName: "AlertTriangle",
    description: "Customer cargo damage claims, delay arbitrations, and billing refund disputes.",
    actions: [
      {
        key: "disputes:view",
        label: "Read Disputes & Claims",
        actionType: "read",
        description: "Inspect consumer damage complaints, carrier delay reports, and evidence photos.",
        aliases: ["disputes:view"],
      },
      {
        key: "disputes:resolve",
        label: "Resolve & Settle Claims",
        actionType: "action",
        description: "Issue arbitration decisions, approve insurance claims, and order payouts.",
        aliases: ["disputes:resolve"],
      },
    ],
  },
  {
    id: "employees",
    name: "Platform Employees",
    sidebarHref: "/admin/employees",
    iconName: "Users",
    description: "Platform headquarters staff, departmental roles, and internal administrative provisioning.",
    actions: [
      {
        key: "staff:view",
        label: "View Employees",
        actionType: "read",
        description: "Browse administrative staff accounts, active status, departments, and roles.",
        aliases: ["staff:view", "employees:view", "View Employees", "Read Platform Staff Roster"],
      },
      {
        key: "staff:create",
        label: "Create Employee",
        actionType: "create",
        description: "Provision new platform officer accounts, assign roles, and dispatch credentials.",
        aliases: ["staff:manage", "employees:create", "Create Employee", "Onboard Staff Members", "staff:create"],
      },
      {
        key: "staff:edit",
        label: "Edit Employee",
        actionType: "update",
        description: "Update staff designations, reporting managers ('Reports To'), and departments.",
        aliases: ["staff:manage", "employees:edit", "Edit Employee", "Edit Staff Details & Departments", "staff:edit"],
      },
      {
        key: "staff:status",
        label: "Assign Employee",
        actionType: "delete",
        description: "Manage administrative role assignment or suspend platform staff access.",
        aliases: ["staff:manage", "employees:assign", "Assign Employee", "Deactivate Staff Accounts", "staff:status"],
      },
    ],
  },
  {
    id: "roles",
    name: "Roles & Rules",
    sidebarHref: "/admin/roles",
    iconName: "Shield",
    description: "Administrative RBAC definitions, capability matrices, and staff permission overrides.",
    actions: [
      {
        key: "roles:view",
        label: "View Roles",
        actionType: "read",
        description: "Inspect administrative role definitions and granular capability matrices.",
        aliases: ["roles:view", "permissions:view", "permissions:manage", "View Roles"],
      },
      {
        key: "roles:create",
        label: "Create Role",
        actionType: "create",
        description: "Create new platform administrative roles with custom baseline capabilities.",
        aliases: ["roles:create", "roles:manage", "permissions:manage", "Create Role"],
      },
      {
        key: "roles:edit",
        label: "Edit Role",
        actionType: "update",
        description: "Update administrative role descriptions, departments, and baseline access matrices.",
        aliases: ["roles:edit", "roles:manage", "permissions:manage", "Edit Role"],
      },
    ],
  },
  {
    id: "permissions",
    name: "Permissions",
    sidebarHref: "/admin/permissions",
    iconName: "Shield",
    description: "Platform security governance, administrative access matrices, and officer capability overrides.",
    actions: [
      {
        key: "permissions:view",
        label: "View Permissions",
        actionType: "read",
        description: "Inspect platform administrative access matrices and officer override status.",
        aliases: ["permissions:view", "roles:view", "permissions:manage", "View Permissions"],
      },
      {
        key: "permissions:manage",
        label: "Manage Permissions",
        actionType: "manage",
        description: "Configure role baseline capabilities and grant or revoke platform officer overrides.",
        aliases: ["permissions:manage", "roles:manage", "Manage Permissions"],
      },
    ],
  },
  {
    id: "reports",
    name: "Business Reports",
    sidebarHref: "/admin/reports",
    iconName: "BarChart3",
    description: "Nationwide platform gross moving revenue, vendor performance, and customer satisfaction metrics.",
    actions: [
      {
        key: "reports:view",
        label: "Read Financial & Operational Reports",
        actionType: "read",
        description: "Inspect platform revenue, commission volume, carrier ratings, and growth metrics.",
        aliases: ["reports:view"],
      },
      {
        key: "reports:export",
        label: "Export Analytics & Ledgers",
        actionType: "action",
        description: "Download CSV financial audits, platform commissions, and volume statements.",
        aliases: ["reports:view"],
      },
    ],
  },
  {
    id: "audit-logs",
    name: "Audit Logs",
    sidebarHref: "/admin/audit-logs",
    iconName: "FileClock",
    description: "Chronological immutable ledger of security events, administrative actions, and status updates.",
    actions: [
      {
        key: "audit:view",
        label: "Read System Audit Logs",
        actionType: "read",
        description: "Audit immutable chronological logs of administrative actions across the platform.",
        aliases: ["audit:view"],
      },
    ],
  },
  {
    id: "settings",
    name: "Platform Settings",
    sidebarHref: "/admin/settings",
    iconName: "Settings",
    description: "Platform commission rates, SMS/WhatsApp delivery gateways, and system-wide policies.",
    actions: [
      {
        key: "settings:view",
        label: "Read Platform Settings",
        actionType: "read",
        description: "Inspect platform commission percentages, operational thresholds, and policies.",
        aliases: ["settings:manage"],
      },
      {
        key: "settings:manage",
        label: "Configure Platform Settings",
        actionType: "manage",
        description: "Update platform commission rates, system parameters, and messaging gateways.",
        aliases: ["settings:manage"],
      },
    ],
  },
];

export function isAdminActionGranted(effectivePermissions: string[], action: AdminPermissionActionDef): boolean {
  if (!Array.isArray(effectivePermissions) || effectivePermissions.length === 0) return false;
  if (effectivePermissions.includes("*")) return true;
  if (effectivePermissions.includes(action.key)) return true;
  if (action.aliases && action.aliases.some((alias) => effectivePermissions.includes(alias))) {
    return true;
  }
  return false;
}
