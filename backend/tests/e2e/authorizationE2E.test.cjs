const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);

const mongoose = require('mongoose');
const { config } = require('../../dist/config/env.js');

const BASE_URL = 'http://localhost:5000/api/v1';

// Exact route permission map from VendorSidebar.tsx
const ROUTE_PERMISSION_MAP = {
  "/vendor": ["*"],
  "/vendor/my-permissions": ["*"],
  "/vendor/profile": ["*"],
  "/vendor/demand": [
    "demand:view",
    "demand:export",
    "Review Available Customer Leads",
    "Quotation Performance & Insights",
    "Reports & Performance Analytics",
  ],
  "/vendor/quotations": [
    "quotations:view",
    "quotations:create",
    "quotations:edit",
    "quotations:cancel",
    "Create & Submit Formal Quotations",
    "Review Available Customer Leads",
    "Quotation Performance & Insights",
  ],
  "/vendor/bookings": [
    "bookings:view",
    "bookings:dispatch",
    "bookings:update_status",
    "bookings:verify_delivery",
    "View & Dispatch Bookings",
    "Bookings & Job Dispatch",
    "Update Move Progression Milestones",
    "Enter Recipient Delivery Verification Code",
  ],
  "/vendor/tracking": [
    "tracking:view",
    "tracking:contact_crew",
    "tracking:update_status",
    "Update Move Progression Milestones",
    "View & Dispatch Bookings",
    "Bookings & Job Dispatch",
    "Fleet & Vehicle Operations",
  ],
  "/vendor/workers": [
    "workers:view",
    "workers:assign",
    "workers:manage",
    "Assign Available Workers & Crew",
    "View Crew Attendance & Performance",
  ],
  "/vendor/vehicles": [
    "vehicles:view",
    "vehicles:assign",
    "vehicles:maintenance",
    "Fleet & Vehicle Operations",
    "Assign Transport Trucks to Moves",
    "Vehicle Inspection & Maintenance Tracking",
  ],
  "/vendor/services": [
    "services:view",
    "services:manage",
    "Service Catalog Configuration",
    "Custom Specialized Services",
  ],
  "/vendor/packages": [
    "packages:view",
    "packages:manage",
    "Service Catalog Configuration",
  ],
  "/vendor/service-areas": [
    "service_areas:view",
    "service_areas:manage",
    "Coverage Areas Configuration",
  ],
  "/vendor/documents": [
    "documents:view",
    "documents:upload",
    "Document Submissions",
    "Regulatory Status Monitoring",
  ],
  "/vendor/employees": [
    "employees:view",
    "employees:create",
    "employees:edit",
    "employees:status",
    "Manage Employees & Crew",
  ],
  "/vendor/roles": [
    "roles:view",
    "roles:manage",
    "Manage Employees & Crew",
  ],
  "/vendor/permissions": [
    "permissions:manage",
  ],
  "/vendor/reports": [
    "reports:view",
    "reports:export",
    "Reports & Performance Analytics",
  ],
  "/vendor/audit-logs": [
    "audit_logs:view",
    "Operational Audit Logs",
  ],
};

function computeAllowedHrefs(userRole, userPermissions) {
  if (userRole === "vendor" || userRole === "admin" || userPermissions.includes("*")) {
    return [...Object.keys(ROUTE_PERMISSION_MAP), "/vendor/permissions"];
  }
  const baseAlwaysAllowed = ["/vendor", "/vendor/my-permissions", "/vendor/profile"];
  if (userPermissions.length > 0) {
    const allowed = Object.keys(ROUTE_PERMISSION_MAP).filter((href) => {
      if (baseAlwaysAllowed.includes(href)) return true;
      const required = ROUTE_PERMISSION_MAP[href];
      return required && required.some((perm) => userPermissions.includes(perm));
    });
    return [...allowed, ...baseAlwaysAllowed];
  }
  return baseAlwaysAllowed;
}

async function api(path, token, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });
  let body = null;
  try {
    body = await res.json();
  } catch (e) {
    body = null;
  }
  return { status: res.status, body };
}

let passedCount = 0;
let failedCount = 0;
const recordedFailures = [];

function assert(condition, message, failureInfo = {}) {
  if (condition) {
    console.log(`    ✓ [PASS] ${message}`);
    passedCount++;
  } else {
    console.error(`    ✗ [FAIL] ${message}`);
    failedCount++;
    recordedFailures.push({
      test: message,
      userRole: failureInfo.userRole || 'Unknown',
      urlApi: failureInfo.urlApi || 'N/A',
      expected: failureInfo.expected || 'Success',
      actual: failureInfo.actual || 'Failure',
      rootCause: failureInfo.rootCause || 'Unspecified',
      file: failureInfo.file || 'Unspecified',
      minimalFix: failureInfo.minimalFix || 'Unspecified',
    });
  }
}

async function runAudit() {
  console.log('========================================================================');
  console.log('  FINAL COMPREHENSIVE END-TO-END AUTHORIZATION & SECURITY AUDIT');
  console.log('  Vendor & Admin: Employee → Role → Permission → Scope System');
  console.log('========================================================================\n');

  await mongoose.connect(config.mongoUri);
  const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));
  const Vendor = mongoose.model('Vendor', new mongoose.Schema({}, { strict: false }));
  const Quote = mongoose.model('Quote', new mongoose.Schema({}, { strict: false }));

  const targetVendorId = '6aa2fb8a919783dc13a83777';
  const otherVendorId = '6aa2fb8a919783dc13a83778';

  // Configure Quotation-only persona: Rahul (9342224204) strictly with ONLY quotations:view
  console.log('--- Step 0: Persona Setup & Database Baseline Synchronization ---');
  await Vendor.updateOne(
    { _id: targetVendorId },
    {
      $set: {
        status: 'APPROVED',
        'verificationDetails.documents': [
          { type: 'GST_CERTIFICATE', status: 'APPROVED' },
          { type: 'BUSINESS_PAN', status: 'APPROVED' },
          { type: 'REPRESENTATIVE_ID_PROOF', status: 'APPROVED' },
          { type: 'REPRESENTATIVE_PHOTO', status: 'APPROVED' },
          { type: 'TRANSPORT_PERMIT', status: 'APPROVED' },
          { type: 'TRANSIT_INSURANCE', status: 'APPROVED' },
        ],
      },
    }
  );
  console.log('    ✓ Configured Vendor (6aa2fb8a919783dc13a83777) as APPROVED for operational testing');
  await User.updateOne(
    { phone: '9342224204' },
    {
      $set: {
        permissions: ['quotations:view'],
        permissionOverrides: { granted: [], revoked: [] }
      }
    }
  );
  console.log('    ✓ Configured Rahul (9342224204) strictly with ONLY ["quotations:view"]');

  // Reset Joel (9342224202) baseline
  await User.updateOne(
    { phone: '9342224202' },
    {
      $set: {
        permissions: ['quotations:view', 'Review Available Customer Leads'],
        permissionOverrides: { granted: [], revoked: [] }
      }
    }
  );
  console.log('    ✓ Configured Joel (9342224202) baseline custom worker');

  const personas = [
    {
      key: 'vendor_admin',
      name: 'Persona 1: Vendor Admin (Company Owner)',
      phone: '+919876543215',
      expectedRole: 'vendor',
      expectedEmployeeRole: undefined,
      isOwner: true,
    },
    {
      key: 'ops_manager',
      name: 'Persona 2: Operations Manager (Godson)',
      phone: '9342224201',
      expectedRole: 'worker',
      expectedEmployeeRole: 'manager',
      isManager: true,
    },
    {
      key: 'tracking_employee',
      name: 'Persona 3: Tracking Employee (Kavitha)',
      phone: '9342224203',
      expectedRole: 'worker',
      expectedEmployeeRole: 'tracking_coordinator',
      isTracking: true,
    },
    {
      key: 'quotation_employee',
      name: 'Persona 4: Quotation-only Employee (Rahul)',
      phone: '9342224204',
      expectedRole: 'worker',
      expectedEmployeeRole: 'lead_estimator',
      isQuoteOnly: true,
    },
    {
      key: 'normal_worker',
      name: 'Persona 5: Normal Worker (Joel Scoped)',
      phone: '9342224202',
      expectedRole: 'worker',
      expectedEmployeeRole: 'custom_worker_1789217482741',
      isWorker: true,
    },
    {
      key: 'super_admin',
      name: 'Admin Persona 1: Super Admin',
      phone: '+919876543210',
      expectedRole: 'admin',
      isAdmin: true,
      isSuperAdmin: true,
    },
    {
      key: 'compliance_officer',
      name: 'Admin Persona 2: Compliance Officer (Priya)',
      phone: '+919888800001',
      expectedRole: 'admin',
      isAdmin: true,
      isSuperAdmin: false,
    },
  ];

  const sessions = {};

  // ========================================================================
  // SECTION 1: CRITERIA A TO Q FOR ALL PERSONAS
  // ========================================================================
  console.log('\n========================================================================');
  console.log('SECTION 1: Criteria A through Q Verification');
  console.log('========================================================================');

  // A. Login
  console.log('\n[Criterion A] Login & JWT Minting:');
  for (const p of personas) {
    const res = await api('/auth/login', null, {
      method: 'POST',
      body: JSON.stringify({ identifier: p.phone, password: 'password123' }),
    });
    assert(
      res.status === 200 && res.body?.token,
      `${p.name} login successful (Status 200, JWT token returned)`,
      { userRole: p.expectedRole, urlApi: 'POST /auth/login', actual: `Status ${res.status}` }
    );
    sessions[p.key] = {
      token: res.body?.token,
      user: res.body?.user,
    };
  }

  // B. Current-user endpoint & C. Effective role & D. Effective permissions
  console.log('\n[Criteria B, C, D] /auth/me, Effective Role & Effective Permissions:');
  for (const p of personas) {
    const s = sessions[p.key];
    const res = await api('/auth/me', s.token);
    assert(
      res.status === 200 && res.body?.user,
      `${p.name} GET /auth/me returned 200`,
      { userRole: p.expectedRole, urlApi: 'GET /auth/me', actual: `Status ${res.status}` }
    );
    s.meUser = res.body?.user;
    s.permissions = res.body?.user?.permissions || [];

    // Check role
    assert(
      s.meUser?.role === p.expectedRole,
      `${p.name} effective role verified: '${s.meUser?.role}'`,
      { userRole: p.expectedRole, expected: p.expectedRole, actual: s.meUser?.role }
    );

    // Check permissions
    if (p.isSuperAdmin || p.isOwner) {
      assert(
        s.permissions.includes('*'),
        `${p.name} has wildcard [*] permission`,
        { userRole: p.expectedRole, expected: '[*]', actual: JSON.stringify(s.permissions) }
      );
    } else if (p.isQuoteOnly) {
      assert(
        s.permissions.includes('quotations:view') && !s.permissions.includes('employees:view'),
        `${p.name} has quotations:view and strictly lacks employees:view`,
        { userRole: p.expectedRole, actual: JSON.stringify(s.permissions) }
      );
    }
  }

  // E. Sidebar & F. Direct URL Access
  console.log('\n[Criteria E & F] Dynamic Sidebar Visibility & Direct Route Guard Logic:');
  for (const p of personas) {
    if (p.isAdmin) continue; // Vendor sidebar checks
    const s = sessions[p.key];
    const allowedHrefs = computeAllowedHrefs(s.meUser.role, s.permissions);

    if (p.isOwner || s.permissions.includes('*')) {
      assert(
        allowedHrefs.includes('/vendor/employees') && allowedHrefs.includes('/vendor/roles'),
        `${p.name} sidebar includes Employees and Roles`,
        { userRole: p.expectedRole }
      );
    } else if (p.isQuoteOnly) {
      assert(
        allowedHrefs.includes('/vendor/quotations'),
        `${p.name} sidebar INCLUDES Quotations`,
        { userRole: p.expectedRole }
      );
      assert(
        !allowedHrefs.includes('/vendor/employees'),
        `${p.name} sidebar EXCLUDES Employees`,
        { userRole: p.expectedRole }
      );
      assert(
        !allowedHrefs.includes('/vendor/roles'),
        `${p.name} sidebar EXCLUDES Roles`,
        { userRole: p.expectedRole }
      );
      assert(
        !allowedHrefs.includes('/vendor/permissions'),
        `${p.name} sidebar EXCLUDES Permissions`,
        { userRole: p.expectedRole }
      );
      assert(
        !allowedHrefs.includes('/vendor/workers'),
        `${p.name} sidebar EXCLUDES Crew Workers`,
        { userRole: p.expectedRole }
      );
      assert(
        !allowedHrefs.includes('/vendor/vehicles'),
        `${p.name} sidebar EXCLUDES Vehicles`,
        { userRole: p.expectedRole }
      );
      assert(
        !allowedHrefs.includes('/vendor/tracking'),
        `${p.name} sidebar EXCLUDES Tracking`,
        { userRole: p.expectedRole }
      );
    }
  }

  // G. Page-level & I. API-level authorization
  console.log('\n[Criteria G & I] Page-Level & API-Level Backend Authorization:');
  // 1. Normal worker attempting GET /vendor/employees
  const workerEmpRes = await api('/vendor/employees', sessions.normal_worker.token);
  assert(
    workerEmpRes.status === 403,
    `Normal Worker blocked from GET /vendor/employees (Status 403 Forbidden)`,
    { userRole: 'worker', urlApi: 'GET /vendor/employees', expected: 403, actual: workerEmpRes.status }
  );

  // 2. Vendor Owner allowed GET /vendor/employees
  const ownerEmpRes = await api('/vendor/employees', sessions.vendor_admin.token);
  assert(
    ownerEmpRes.status === 200,
    `Vendor Admin allowed GET /vendor/employees (Status 200 OK)`,
    { userRole: 'vendor', urlApi: 'GET /vendor/employees', expected: 200, actual: ownerEmpRes.status }
  );

  // 3. Normal worker attempting GET /vendor/roles
  const workerRolesRes = await api('/vendor/roles', sessions.normal_worker.token);
  assert(
    workerRolesRes.status === 403,
    `Normal Worker blocked from GET /vendor/roles (Status 403 Forbidden)`,
    { userRole: 'worker', urlApi: 'GET /vendor/roles', expected: 403, actual: workerRolesRes.status }
  );

  // 4. Normal worker attempting GET /vendor/permissions
  const workerPermsRes = await api('/vendor/permissions', sessions.normal_worker.token);
  assert(
    workerPermsRes.status === 403,
    `Normal Worker blocked from GET /vendor/permissions (Status 403 Forbidden)`,
    { userRole: 'worker', urlApi: 'GET /vendor/permissions', expected: 403, actual: workerPermsRes.status }
  );

  // J. Employee Profile (Self vs Other)
  console.log('\n[Criterion J] Employee Profile (Self Access 200 vs Unauthorized Other Access 403):');
  const joelId = sessions.normal_worker.meUser._id || sessions.normal_worker.meUser.id;
  const ownerId = sessions.vendor_admin.meUser._id || sessions.vendor_admin.meUser.id;

  // Joel views his own profile
  const joelSelfRes = await api(`/vendor/employees/${joelId}`, sessions.normal_worker.token);
  assert(
    joelSelfRes.status === 200 && joelSelfRes.body?.employee?.displayName === 'Joel',
    `Normal Worker Joel can view own profile (Status 200, name: Joel)`,
    { userRole: 'worker', urlApi: `/vendor/employees/${joelId}`, expected: 200, actual: joelSelfRes.status }
  );
  assert(
    joelSelfRes.body?.employee?.password === undefined,
    `Password hash is strictly excluded from profile response`,
    { userRole: 'worker', expected: 'undefined', actual: typeof joelSelfRes.body?.employee?.password }
  );

  // Joel attempts to view Owner profile
  const joelOtherRes = await api(`/vendor/employees/${ownerId}`, sessions.normal_worker.token);
  assert(
    joelOtherRes.status === 403,
    `Normal Worker Joel strictly blocked from viewing Vendor Owner profile (Status 403 Forbidden)`,
    { userRole: 'worker', urlApi: `/vendor/employees/${ownerId}`, expected: 403, actual: joelOtherRes.status }
  );

  // Owner views Joel profile
  const ownerViewJoelRes = await api(`/vendor/employees/${joelId}`, sessions.vendor_admin.token);
  assert(
    ownerViewJoelRes.status === 200 && ownerViewJoelRes.body?.employee?.displayName === 'Joel',
    `Vendor Admin can view employee profile (Status 200 OK)`,
    { userRole: 'vendor', urlApi: `/vendor/employees/${joelId}`, expected: 200, actual: ownerViewJoelRes.status }
  );

  // K. My Role & Permissions
  console.log('\n[Criterion K] My Role & Permissions Read-Only Inspection:');
  for (const p of personas) {
    const s = sessions[p.key];
    const meRes = await api('/auth/me', s.token);
    assert(
      meRes.status === 200 && Array.isArray(meRes.body?.user?.permissions),
      `${p.name} can inspect own permissions via /auth/me`,
      { userRole: p.expectedRole }
    );
  }

  // L. Employee Creation
  console.log('\n[Criterion L] Employee Creation Authorization:');
  const dummyEmpPayload = {
    displayName: 'Test Onboarded Worker',
    phone: '9349999991',
    employeeRole: 'worker',
    department: 'Field Operations',
  };

  // Normal Worker attempting to create employee -> 403
  const workerCreateRes = await api('/vendor/employees', sessions.normal_worker.token, {
    method: 'POST',
    body: JSON.stringify(dummyEmpPayload),
  });
  assert(
    workerCreateRes.status === 403,
    `Normal Worker CANNOT create employee (Status 403 Forbidden)`,
    { userRole: 'worker', urlApi: 'POST /vendor/employees', expected: 403, actual: workerCreateRes.status }
  );

  // Tracking Employee attempting to create employee -> 403
  const trackingCreateRes = await api('/vendor/employees', sessions.tracking_employee.token, {
    method: 'POST',
    body: JSON.stringify(dummyEmpPayload),
  });
  assert(
    trackingCreateRes.status === 403,
    `Tracking Employee CANNOT create employee (Status 403 Forbidden)`,
    { userRole: 'tracking_coordinator', urlApi: 'POST /vendor/employees', expected: 403, actual: trackingCreateRes.status }
  );

  // Quotation Employee attempting to create employee -> 403
  const quoteCreateRes = await api('/vendor/employees', sessions.quotation_employee.token, {
    method: 'POST',
    body: JSON.stringify(dummyEmpPayload),
  });
  assert(
    quoteCreateRes.status === 403,
    `Quotation Employee CANNOT create employee (Status 403 Forbidden)`,
    { userRole: 'lead_estimator', urlApi: 'POST /vendor/employees', expected: 403, actual: quoteCreateRes.status }
  );

  // Vendor Owner creating employee -> 201 or 200
  const ownerCreateRes = await api('/vendor/employees', sessions.vendor_admin.token, {
    method: 'POST',
    body: JSON.stringify(dummyEmpPayload),
  });
  assert(
    ownerCreateRes.status === 201 || ownerCreateRes.status === 200,
    `Vendor Admin CAN create employee (Status ${ownerCreateRes.status})`,
    { userRole: 'vendor', urlApi: 'POST /vendor/employees', expected: 201, actual: ownerCreateRes.status }
  );
  // Clean up created test worker
  if (ownerCreateRes.body?.employee?._id) {
    await User.deleteOne({ _id: ownerCreateRes.body.employee._id });
  } else {
    await User.deleteOne({ phone: '9349999991' });
  }

  // M. Role Assignment
  console.log('\n[Criterion M] Role Assignment Authorization & Self-Escalation Block:');
  // Worker attempting to assign role to Joel -> 403
  const workerAssignRes = await api(`/vendor/employees/${joelId}`, sessions.normal_worker.token, {
    method: 'PATCH',
    body: JSON.stringify({ employeeRole: 'manager' }),
  });
  assert(
    workerAssignRes.status === 403,
    `Normal Worker CANNOT assign roles (Status 403 Forbidden)`,
    { userRole: 'worker', urlApi: `PATCH /vendor/employees/${joelId}`, expected: 403, actual: workerAssignRes.status }
  );

  // N. Permission Modification
  console.log('\n[Criterion N] Permission Modification Authorization:');
  const workerModPermsRes = await api(`/vendor/employees/${joelId}`, sessions.normal_worker.token, {
    method: 'PATCH',
    body: JSON.stringify({ permissionOverrides: { granted: ['*'], revoked: [] } }),
  });
  assert(
    workerModPermsRes.status === 403,
    `Normal Worker CANNOT modify permissions (Status 403 Forbidden)`,
    { userRole: 'worker', urlApi: `PATCH /vendor/employees/${joelId}`, expected: 403, actual: workerModPermsRes.status }
  );

  // O. Cross-Company Access & Admin Isolation
  console.log('\n[Criterion O] Cross-Company & Admin Isolation:');
  // Vendor accessing Admin endpoint
  const vendorToAdminRes = await api('/admin/employees', sessions.vendor_admin.token);
  assert(
    vendorToAdminRes.status === 403,
    `Vendor Admin strictly blocked from Admin endpoint /admin/employees (Status 403 Forbidden)`,
    { userRole: 'vendor', urlApi: 'GET /admin/employees', expected: 403, actual: vendorToAdminRes.status }
  );

  const workerToAdminRes = await api('/admin/dashboard/stats', sessions.normal_worker.token);
  assert(
    workerToAdminRes.status === 403,
    `Normal Worker strictly blocked from Admin endpoint /admin/dashboard/stats (Status 403 Forbidden)`,
    { userRole: 'worker', urlApi: 'GET /admin/dashboard/stats', expected: 403, actual: workerToAdminRes.status }
  );

  // Cross-Company direct resource access (Bangalore Express querying ABC Logistic resources)
  const crossCompanyEmpRes = await api('/vendor/employees/6aa445276e1bf22bed958648', sessions.vendor_admin.token);
  assert(
    crossCompanyEmpRes.status === 404 || crossCompanyEmpRes.status === 403,
    `Bangalore Express Admin strictly blocked from ABC Logistic employee record (Status ${crossCompanyEmpRes.status})`,
    { userRole: 'vendor', urlApi: 'GET /vendor/employees/6aa445276e1bf22bed958648', expected: 404, actual: crossCompanyEmpRes.status }
  );

  const crossCompanyQuoteRes = await api('/vendor/quotations/6aa565e305b78618ba9f1977', sessions.vendor_admin.token);
  assert(
    crossCompanyQuoteRes.status === 404 || crossCompanyQuoteRes.status === 403,
    `Bangalore Express Admin strictly blocked from ABC Logistic quotation (Status ${crossCompanyQuoteRes.status})`,
    { userRole: 'vendor', urlApi: 'GET /vendor/quotations/6aa565e305b78618ba9f1977', expected: 404, actual: crossCompanyQuoteRes.status }
  );

  // P. Scope Restrictions
  console.log('\n[Criterion P] Scope Restrictions (Scoped Worker vs Moves Outside Operational Scope):');
  const unassignedMoveRes = await api('/vendor/bookings/6aa4452709f077dd3685fa0e', sessions.normal_worker.token);
  assert(
    unassignedMoveRes.status === 403,
    `Normal Worker Joel strictly blocked from unassigned move outside operational scope (Status 403)`,
    { userRole: 'worker', urlApi: 'GET /vendor/bookings/6aa4452709f077dd3685fa0e', expected: 403, actual: unassignedMoveRes.status }
  );

  // ========================================================================
  // SECTION 2: SPECIAL FOCUS TESTS FROM USER
  // ========================================================================
  console.log('\n========================================================================');
  console.log('SECTION 2: Special Focus Audit Tests');
  console.log('========================================================================');

  // SPECIAL TEST 1: Quotation Employee with ONLY quotations:view
  console.log('\n--- Special Test 1: Quotation Employee with ONLY quotations:view ---');
  const qToken = sessions.quotation_employee.token;
  
  // 1. View quotation data -> PASS 200
  const qViewRes = await api('/vendor/quotations', qToken);
  assert(
    qViewRes.status === 200,
    `Quotation Employee CAN view quotation data (Status 200 OK)`,
    { userRole: 'lead_estimator', urlApi: 'GET /vendor/quotations', expected: 200, actual: qViewRes.status }
  );

  const qLeadsRes = await api('/vendor/requests/available', qToken);
  assert(
    qLeadsRes.status === 200,
    `Quotation Employee CAN view available customer leads (Status 200 OK)`,
    { userRole: 'lead_estimator', urlApi: 'GET /vendor/requests/available', expected: 200, actual: qLeadsRes.status }
  );

  // 2. Create quotation -> FAIL 403
  const qCreateRes = await api('/vendor/quotations', qToken, {
    method: 'POST',
    body: JSON.stringify({
      customerPhone: '+919999988888',
      pickupAddress: { city: 'Bangalore' },
      destinationAddress: { city: 'Chennai' },
      totalAmount: 15000,
    }),
  });
  assert(
    qCreateRes.status === 403,
    `Quotation Employee CANNOT create quotation (Status 403 Forbidden)`,
    { userRole: 'lead_estimator', urlApi: 'POST /vendor/quotations', expected: 403, actual: qCreateRes.status }
  );

  // 3. Edit quotation -> FAIL 403
  const dummyQuoteId = new mongoose.Types.ObjectId();
  const qEditRes = await api(`/vendor/quotations/${dummyQuoteId}`, qToken, {
    method: 'PATCH',
    body: JSON.stringify({ totalAmount: 20000 }),
  });
  assert(
    qEditRes.status === 403,
    `Quotation Employee CANNOT edit quotation (Status 403 Forbidden)`,
    { userRole: 'lead_estimator', urlApi: `PATCH /vendor/quotations/${dummyQuoteId}`, expected: 403, actual: qEditRes.status }
  );

  // 4. Delete quotation -> FAIL 403
  const qDeleteRes = await api(`/vendor/quotations/${dummyQuoteId}`, qToken, {
    method: 'DELETE',
  });
  assert(
    qDeleteRes.status === 403,
    `Quotation Employee CANNOT delete quotation (Status 403 Forbidden)`,
    { userRole: 'lead_estimator', urlApi: `DELETE /vendor/quotations/${dummyQuoteId}`, expected: 403, actual: qDeleteRes.status }
  );

  // 5. Attempt unauthorized API calls -> 403
  const qEmpCall = await api('/vendor/employees', qToken);
  assert(
    qEmpCall.status === 403,
    `Quotation Employee unauthorized call to GET /vendor/employees rejected (Status 403)`,
    { userRole: 'lead_estimator', urlApi: 'GET /vendor/employees', expected: 403, actual: qEmpCall.status }
  );

  const qRolesCall = await api('/vendor/roles', qToken);
  assert(
    qRolesCall.status === 403,
    `Quotation Employee unauthorized call to GET /vendor/roles rejected (Status 403)`,
    { userRole: 'lead_estimator', urlApi: 'GET /vendor/roles', expected: 403, actual: qRolesCall.status }
  );

  const qVehiclesCall = await api('/vendor/vehicles', qToken);
  assert(
    qVehiclesCall.status === 403,
    `Quotation Employee unauthorized call to GET /vendor/vehicles rejected (Status 403)`,
    { userRole: 'lead_estimator', urlApi: 'GET /vendor/vehicles', expected: 403, actual: qVehiclesCall.status }
  );

  const qWorkersCall = await api('/vendor/workers', qToken);
  assert(
    qWorkersCall.status === 403,
    `Quotation Employee unauthorized call to GET /vendor/workers rejected (Status 403)`,
    { userRole: 'lead_estimator', urlApi: 'GET /vendor/workers', expected: 403, actual: qWorkersCall.status }
  );

  // SPECIAL TEST 2: Normal Worker Lockdown
  console.log('\n--- Special Test 2: Normal Worker Lockdown ---');
  const wToken = sessions.normal_worker.token;
  assert(
    (await api('/vendor/employees', wToken, { method: 'POST', body: JSON.stringify(dummyEmpPayload) })).status === 403,
    `Normal Worker cannot create employee (Status 403)`,
    { userRole: 'worker', urlApi: 'POST /vendor/employees', expected: 403 }
  );
  assert(
    (await api(`/vendor/employees/${joelId}`, wToken, { method: 'PATCH', body: JSON.stringify({ employeeRole: 'manager' }) })).status === 403,
    `Normal Worker cannot assign roles (Status 403)`,
    { userRole: 'worker', urlApi: `PATCH /vendor/employees/${joelId}`, expected: 403 }
  );
  assert(
    (await api(`/vendor/employees/${joelId}`, wToken, { method: 'PATCH', body: JSON.stringify({ permissionOverrides: { granted: ['*'] } }) })).status === 403,
    `Normal Worker cannot modify permissions (Status 403)`,
    { userRole: 'worker', urlApi: `PATCH /vendor/employees/${joelId}`, expected: 403 }
  );
  assert(
    (await api(`/vendor/employees/${ownerId}`, wToken)).status === 403,
    `Normal Worker cannot manage/view other employees (Status 403)`,
    { userRole: 'worker', urlApi: `GET /vendor/employees/${ownerId}`, expected: 403 }
  );
  assert(
    (await api('/admin/admin-roles', wToken)).status === 403,
    `Normal Worker cannot access admin configuration (Status 403)`,
    { userRole: 'worker', urlApi: 'GET /admin/admin-roles', expected: 403 }
  );

  // SPECIAL TEST 3: Tracking Employee Restrictions
  console.log('\n--- Special Test 3: Tracking Employee Restrictions ---');
  const tToken = sessions.tracking_employee.token;
  const tEmpCall = await api('/vendor/employees', tToken);
  assert(
    tEmpCall.status === 403,
    `Tracking Employee does NOT receive employee-management permissions (Status 403)`,
    { userRole: 'tracking_coordinator', urlApi: 'GET /vendor/employees', expected: 403, actual: tEmpCall.status }
  );
  const tRolesCall = await api('/vendor/roles', tToken);
  assert(
    tRolesCall.status === 403,
    `Tracking Employee cannot view or manage roles (Status 403)`,
    { userRole: 'tracking_coordinator', urlApi: 'GET /vendor/roles', expected: 403, actual: tRolesCall.status }
  );

  // SPECIAL TEST 4: Modify Permission, Multi-Permission Independence, Refresh, Logout, Login Again
  console.log('\n--- Special Test 4: Modify Permission, Multi-Permission Independence, Refresh, Logout, Login Again ---');
  // 1. Grant Joel 'quotations:create'
  const grantRes = await api(`/vendor/employees/${joelId}`, sessions.vendor_admin.token, {
    method: 'PATCH',
    body: JSON.stringify({
      permissionOverrides: {
        granted: ['quotations:create'],
        revoked: [],
      },
    }),
  });
  assert(
    grantRes.status === 200,
    `Vendor Admin saved permission override (Granted quotations:create) (Status 200)`,
    { userRole: 'vendor', urlApi: `PATCH /vendor/employees/${joelId}` }
  );

  // 2. Refresh (GET /auth/me for Joel)
  const joelRefreshed = await api('/auth/me', sessions.normal_worker.token);
  assert(
    joelRefreshed.body?.user?.permissions?.includes('quotations:create'),
    `Joel GET /auth/me immediately reflects granted permission quotations:create`,
    { userRole: 'worker', expected: 'quotations:create in permissions', actual: JSON.stringify(joelRefreshed.body?.user?.permissions) }
  );

  // 3. Multi-permission independence: Add 'tracking:view' without erasing 'quotations:create'
  const grantMultiRes = await api(`/vendor/employees/${joelId}`, sessions.vendor_admin.token, {
    method: 'PATCH',
    body: JSON.stringify({
      permissionOverrides: {
        granted: ['quotations:create', 'tracking:view'],
        revoked: [],
      },
    }),
  });
  assert(
    grantMultiRes.status === 200,
    `Vendor Admin added tracking:view without wiping quotations:create (Status 200)`,
    { userRole: 'vendor', urlApi: `PATCH /vendor/employees/${joelId}` }
  );

  const joelMultiMe = await api('/auth/me', sessions.normal_worker.token);
  assert(
    joelMultiMe.body?.user?.permissions?.includes('quotations:create') &&
    joelMultiMe.body?.user?.permissions?.includes('tracking:view'),
    `Joel holds BOTH quotations:create AND tracking:view simultaneously (Independent overrides)`,
    { userRole: 'worker', expected: 'both perms active', actual: JSON.stringify(joelMultiMe.body?.user?.permissions) }
  );

  // 4. Logout & Login again as Joel - verify MongoDB persistence
  const joelReLogin = await api('/auth/login', null, {
    method: 'POST',
    body: JSON.stringify({ identifier: '9342224202', password: 'password123' }),
  });
  assert(
    joelReLogin.status === 200 && joelReLogin.body?.token,
    `Joel logged in again successfully`,
    { userRole: 'worker' }
  );

  const joelReLoginMe = await api('/auth/me', joelReLogin.body.token);
  assert(
    joelReLoginMe.body?.user?.permissions?.includes('quotations:create') &&
    joelReLoginMe.body?.user?.permissions?.includes('tracking:view'),
    `Fresh session after login maintains persisted MongoDB permissions (quotations:create + tracking:view)`,
    { userRole: 'worker', expected: 'both perms persisted', actual: JSON.stringify(joelReLoginMe.body?.user?.permissions) }
  );

  // 5. Verify dynamic sidebar reflected both
  const joelElevatedSidebar = computeAllowedHrefs('worker', joelReLoginMe.body?.user?.permissions || []);
  assert(
    joelElevatedSidebar.includes('/vendor/quotations') && joelElevatedSidebar.includes('/vendor/tracking'),
    `Joel sidebar correctly includes Quotations and Live Tracking with multi-permissions`,
    { userRole: 'worker' }
  );

  // 6. Restore Joel back to clean defaults
  await api(`/vendor/employees/${joelId}`, sessions.vendor_admin.token, {
    method: 'PATCH',
    body: JSON.stringify({
      permissionOverrides: {
        granted: [],
        revoked: [],
      },
    }),
  });
  const joelRestored = await api('/auth/me', sessions.normal_worker.token);
  assert(
    !joelRestored.body?.user?.permissions?.includes('quotations:create') &&
    !joelRestored.body?.user?.permissions?.includes('tracking:view'),
    `Joel clean defaults restored successfully (quotations:create & tracking:view removed)`,
    { userRole: 'worker' }
  );

  // SPECIAL TEST 5: Profile Switching & Zero Hardcoding
  console.log('\n--- Special Test 5: Profile Switching & Zero Hardcoding ---');
  // Vendor Admin viewing Joel's profile
  const p1 = await api(`/vendor/employees/${joelId}`, sessions.vendor_admin.token);
  assert(
    p1.status === 200 && p1.body?.employee?.displayName === 'Joel',
    `Target profile loads Joel from MongoDB (displayName: Joel)`,
    { userRole: 'vendor' }
  );

  // Vendor Admin viewing Godson's profile
  const godsonId = sessions.ops_manager.meUser._id || sessions.ops_manager.meUser.id;
  const p2 = await api(`/vendor/employees/${godsonId}`, sessions.vendor_admin.token);
  assert(
    p2.status === 200 && p2.body?.employee?.displayName === 'Godson',
    `Target profile loads Godson from MongoDB (displayName: Godson)`,
    { userRole: 'vendor' }
  );

  // Operations Manager viewing own profile
  const p3 = await api(`/vendor/employees/${godsonId}`, sessions.ops_manager.token);
  assert(
    p3.status === 200 && p3.body?.employee?._id.toString() === godsonId.toString(),
    `Authenticated employee self-profile dynamically resolves their own MongoDB ID`,
    { userRole: 'manager' }
  );

  // SPECIAL TEST 6: Admin Separation & Scope Isolation
  console.log('\n--- Special Test 6: Admin Separation & Scope Isolation ---');
  // Platform Officer Priya (Compliance Officer) testing Super Admin only route
  const priyaRolesRes = await api('/admin/admin-roles', sessions.compliance_officer.token);
  assert(
    priyaRolesRes.status === 403,
    `Compliance Officer Priya strictly blocked from Super Admin endpoint /admin/admin-roles (Status 403)`,
    { userRole: 'compliance_officer', urlApi: 'GET /admin/admin-roles', expected: 403, actual: priyaRolesRes.status }
  );

  // Super Admin accessing /admin/admin-roles -> 200
  const superAdminRolesRes = await api('/admin/admin-roles', sessions.super_admin.token);
  assert(
    superAdminRolesRes.status === 200,
    `Super Admin permitted to access /admin/admin-roles (Status 200 OK)`,
    { userRole: 'super_admin', urlApi: 'GET /admin/admin-roles', expected: 200, actual: superAdminRolesRes.status }
  );

  // SPECIAL TEST 7: Custom Role & Tracking Specialist (Persona: Elaya)
  console.log('\n--- Special Test 7: Custom Role & Tracking Specialist (Persona: Elaya) ---');
  const jwt = require('jsonwebtoken');
  const elayaDoc = await User.findOne({ phone: '1212121212' });
  if (elayaDoc) {
    const elayaToken = jwt.sign(
      { id: elayaDoc._id.toString(), role: elayaDoc.role, phone: elayaDoc.phone },
      config.jwtSecret,
      { expiresIn: '1h' }
    );

    const elayaMeRes = await api('/auth/me', elayaToken);
    assert(
      elayaMeRes.status === 200 && elayaMeRes.body?.user?.permissions?.includes('tracking:view'),
      `Elaya resolves custom System Analyst role with tracking:view permission`,
      { userRole: 'worker' }
    );

    // Can access live tracking moves telemetry
    const elayaBookingsRes = await api('/vendor/bookings?limit=50', elayaToken);
    assert(
      elayaBookingsRes.status === 200,
      `Elaya CAN fetch active moves for Live Tracking (Status 200 OK)`,
      { userRole: 'worker', urlApi: 'GET /vendor/bookings?limit=50', expected: 200, actual: elayaBookingsRes.status }
    );

    // Blocked from unauthorized endpoints
    const elayaEmpRes = await api('/vendor/employees', elayaToken);
    assert(
      elayaEmpRes.status === 403,
      `Elaya strictly blocked from Employee Management /vendor/employees (Status 403)`,
      { userRole: 'worker', urlApi: 'GET /vendor/employees', expected: 403, actual: elayaEmpRes.status }
    );

    const elayaQuoteCreateRes = await api('/vendor/quotations', elayaToken, {
      method: 'POST',
      body: JSON.stringify({ customerPhone: '9999999999' }),
    });
    assert(
      elayaQuoteCreateRes.status === 403,
      `Elaya strictly blocked from Creating Quotations (Status 403)`,
      { userRole: 'worker', urlApi: 'POST /vendor/quotations', expected: 403, actual: elayaQuoteCreateRes.status }
    );
  }

  // SPECIAL TEST 8: Sensitive Data Leakage & Password Hash Exclusion Audit
  console.log('\n--- Special Test 8: Sensitive Data Leakage & Password Hash Exclusion Audit ---');
  const meRes = await api('/auth/me', sessions.normal_worker.token);
  assert(
    meRes.body?.user?.password === undefined && meRes.body?.user?.plainTempPassword === undefined,
    `GET /auth/me strictly omits password and plainTempPassword`,
    { userRole: 'worker' }
  );

  const empDetailRes = await api(`/vendor/employees/${joelId}`, sessions.vendor_admin.token);
  assert(
    empDetailRes.body?.employee?.password === undefined && empDetailRes.body?.employee?.plainTempPassword === undefined,
    `GET /vendor/employees/:id strictly omits password and plainTempPassword`,
    { userRole: 'vendor' }
  );

  const adminEmpDetailRes = await api(`/admin/employees/${sessions.super_admin.meUser._id}`, sessions.super_admin.token);
  assert(
    adminEmpDetailRes.body?.employee?.password === undefined && adminEmpDetailRes.body?.employee?.plainTempPassword === undefined,
    `GET /admin/employees/:id strictly omits password and plainTempPassword`,
    { userRole: 'admin' }
  );

  // SPECIAL TEST 9: Immediate Dynamic Revocation on Active Token
  console.log('\n--- Special Test 9: Immediate Dynamic Revocation on Active Token ---');
  // 1. Grant quotations:create to Joel
  await api(`/vendor/employees/${joelId}`, sessions.vendor_admin.token, {
    method: 'PATCH',
    body: JSON.stringify({
      permissionOverrides: { granted: ['quotations:create'], revoked: [] },
    }),
  });

  const validQuotePayload = {
    customerName: 'E2E Verification Client',
    customerPhone: '+919988776655',
    pickupAddress: { street: '12 Indiranagar 100ft Rd', city: 'Bangalore' },
    destinationAddress: { street: '45 Koramangala 80ft Rd', city: 'Bangalore' },
    totalAmount: 8500,
  };

  // 2. Joel attempts POST /vendor/quotations with valid input -> expected business success 201
  const joelGrantedValidRes = await api('/vendor/quotations', sessions.normal_worker.token, {
    method: 'POST',
    body: JSON.stringify(validQuotePayload),
  });
  assert(
    joelGrantedValidRes.status === 201 && joelGrantedValidRes.body?.quote?._id,
    `Active token with granted permission creates quotation successfully (Status 201 Created)`,
    { userRole: 'worker', urlApi: 'POST /vendor/quotations', expected: 201, actual: joelGrantedValidRes.status }
  );
  const createdQuoteId = joelGrantedValidRes.body?.quote?._id;

  // 3. Separately test authorized request with malformed input -> expected validation error 400
  const joelGrantedInvalidRes = await api('/vendor/quotations', sessions.normal_worker.token, {
    method: 'POST',
    body: JSON.stringify({}),
  });
  assert(
    joelGrantedInvalidRes.status === 400,
    `Active token with granted permission receives 400 Bad Request on invalid input (Validation separated from Auth)`,
    { userRole: 'worker', urlApi: 'POST /vendor/quotations', expected: 400, actual: joelGrantedInvalidRes.status }
  );

  // 4. Immediately revoke quotations:create from Joel
  await api(`/vendor/employees/${joelId}`, sessions.vendor_admin.token, {
    method: 'PATCH',
    body: JSON.stringify({
      permissionOverrides: { granted: [], revoked: ['quotations:create'] },
    }),
  });

  // 5. Joel attempts POST /vendor/quotations with the EXACT SAME valid input -> expected 403 Forbidden
  const joelRevokedRes = await api('/vendor/quotations', sessions.normal_worker.token, {
    method: 'POST',
    body: JSON.stringify(validQuotePayload),
  });
  assert(
    joelRevokedRes.status === 403,
    `Active token immediately loses access upon revocation without token refresh (Status 403 Forbidden)`,
    { userRole: 'worker', urlApi: 'POST /vendor/quotations', expected: 403, actual: joelRevokedRes.status }
  );

  // 6. Cleanup created test quote and restore Joel cleanly
  if (createdQuoteId) {
    await Quote.findByIdAndDelete(createdQuoteId);
  }
  await api(`/vendor/employees/${joelId}`, sessions.vendor_admin.token, {
    method: 'PATCH',
    body: JSON.stringify({
      permissionOverrides: { granted: [], revoked: [] },
    }),
  });

  // SPECIAL TEST 10: Role Template Cache Invalidation across Role Members
  console.log('\n--- Special Test 10: Role Template Invalidation Across Role Members ---');
  if (elayaDoc) {
    const elayaToken = jwt.sign(
      { id: elayaDoc._id.toString(), role: elayaDoc.role, phone: elayaDoc.phone },
      config.jwtSecret,
      { expiresIn: '1h' }
    );

    // Baseline: Elaya role system_analyst does not have quotations:view
    const elayaBaseRes = await api('/vendor/quotations', elayaToken);
    assert(
      elayaBaseRes.status === 403,
      `Elaya baseline lacks quotations:view from role template (Status 403 Forbidden)`,
      { userRole: 'system_analyst', urlApi: 'GET /vendor/quotations', expected: 403, actual: elayaBaseRes.status }
    );

    // Vendor Admin updates custom role system_analyst to include quotations:view
    const updateRoleRes = await api('/vendor/roles/system_analyst', sessions.vendor_admin.token, {
      method: 'PUT',
      body: JSON.stringify({
        permissions: ['demand:view', 'demand:export', 'tracking:view', 'workers:view', 'quotations:view'],
      }),
    });
    assert(
      updateRoleRes.status === 200,
      `Vendor Admin successfully updated custom role template system_analyst (Status 200 OK)`,
      { expected: 200, actual: updateRoleRes.status }
    );

    // Elaya calls GET /vendor/quotations with same active token -> should now succeed!
    const elayaAfterRoleUpdate = await api('/vendor/quotations', elayaToken);
    assert(
      elayaAfterRoleUpdate.status === 200,
      `Role template update immediately grants access to role members via cache invalidation (Status 200 OK)`,
      { userRole: 'system_analyst', urlApi: 'GET /vendor/quotations', expected: 200, actual: elayaAfterRoleUpdate.status }
    );

    // Revert custom role system_analyst back to original permissions
    const revertRoleRes = await api('/vendor/roles/system_analyst', sessions.vendor_admin.token, {
      method: 'PUT',
      body: JSON.stringify({
        permissions: ['demand:view', 'demand:export', 'tracking:view', 'workers:view'],
      }),
    });
    assert(
      revertRoleRes.status === 200,
      `Vendor Admin successfully reverted custom role template system_analyst (Status 200 OK)`,
      { expected: 200, actual: revertRoleRes.status }
    );

    // Elaya calls GET /vendor/quotations again with same active token -> immediately rejected!
    const elayaAfterRevert = await api('/vendor/quotations', elayaToken);
    assert(
      elayaAfterRevert.status === 403,
      `Role template permission removal immediately restricts role members via cache invalidation (Status 403 Forbidden)`,
      { userRole: 'system_analyst', urlApi: 'GET /vendor/quotations', expected: 403, actual: elayaAfterRevert.status }
    );
  }

  // SPECIAL TEST 11: Fail-Closed Protection Against Forged/Stale JWT Claims
  console.log('\n--- Special Test 11: Fail-Closed Protection Against Forged/Stale JWT Claims ---');
  const { invalidatePermissionsCache } = require('../../dist/middlewares/auth.js');
  invalidatePermissionsCache(joelId);

  const staleOrForgedToken = jwt.sign(
    {
      id: joelId,
      phone: '9342224202',
      displayName: 'Joel',
      role: 'worker',
      employeeRole: 'custom_worker_1789217482741',
      vendorId: targetVendorId,
      permissions: ['*', 'quotations:create', 'roles:manage'], // Forged/stale token claims
    },
    config.jwtSecret,
    { expiresIn: '1h' }
  );

  const failClosedQuoteRes = await api('/vendor/quotations', staleOrForgedToken, {
    method: 'POST',
    body: JSON.stringify({
      customerName: 'E2E Verification Client',
      customerPhone: '+919988776655',
      pickupAddress: { street: '12 Indiranagar 100ft Rd', city: 'Bangalore' },
      destinationAddress: { street: '45 Koramangala 80ft Rd', city: 'Bangalore' },
      totalAmount: 8500,
    }),
  });
  assert(
    failClosedQuoteRes.status === 403,
    `Fail-Closed Gateway: Stale/forged JWT claim ['*'] strictly rejected based on live DB permissions (Status 403 Forbidden)`,
    { userRole: 'worker', urlApi: 'POST /vendor/quotations', expected: 403, actual: failClosedQuoteRes.status }
  );

  const failClosedRoleRes = await api('/vendor/roles', staleOrForgedToken, {
    method: 'POST',
    body: JSON.stringify({ name: 'Injected Role' }),
  });
  assert(
    failClosedRoleRes.status === 403,
    `Fail-Closed Gateway: Stale/forged JWT claim ['roles:manage'] strictly rejected for role creation (Status 403 Forbidden)`,
    { userRole: 'worker', urlApi: 'POST /vendor/roles', expected: 403, actual: failClosedRoleRes.status }
  );

  console.log('\n========================================================================');
  console.log(`AUDIT SUMMARY: ${passedCount} PASSED, ${failedCount} FAILED`);
  console.log('========================================================================');

  if (recordedFailures.length > 0) {
    console.log('\n--- RECORDED FAILURES FOR REVIEW ---');
    console.log(JSON.stringify(recordedFailures, null, 2));
    process.exitCode = 1;
  }

  await mongoose.disconnect();
}

runAudit().catch((err) => {
  console.error(err);
  process.exit(1);
});
