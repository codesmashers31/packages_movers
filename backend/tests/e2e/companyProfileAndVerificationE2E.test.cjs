const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);

const crypto = require('crypto');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { config } = require('../../dist/config/env.js');

const BASE_URL = 'http://localhost:5000/api/v1';

async function api(endpoint, token, options = {}) {
  const res = await fetch(`${BASE_URL}${endpoint}`, {
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
      ...failureInfo,
    });
  }
}

async function runTests() {
  console.log('========================================================================');
  console.log('  COMPANY PROFILE, ONBOARDING & VERIFICATION E2E AUDIT SUITE');
  console.log('========================================================================\n');

  console.log('[-] Connecting to MongoDB...');
  await mongoose.connect(config.mongoUri);
  console.log('    ✓ MongoDB Connected\n');

  const { User } = require('../../dist/models/User.js');
  const { Vendor } = require('../../dist/models/Vendor.js');
  const { Notification } = require('../../dist/models/Notification.js');

  // Step 0: Obtain Admin Session
  console.log('[Setup] Logging in Admin Persona...');
  const adminRes = await api('/auth/login', null, {
    method: 'POST',
    body: JSON.stringify({ identifier: '+919876543210', password: 'password123' }),
  });
  assert(adminRes.status === 200 && adminRes.body?.token, 'Super Admin logged in successfully', { actual: adminRes.status });
  const adminToken = adminRes.body?.token;

  // --------------------------------------------------------------------------
  // TEST GROUP 1: ADMIN VENDOR INVITATION FLOW (invitationTokenHash, single-use)
  // --------------------------------------------------------------------------
  console.log('\n========================================================================');
  console.log('TEST GROUP 1: ADMIN VENDOR INVITATION FLOW (invitationTokenHash & Security)');
  console.log('========================================================================');

  const uniqueSuffix = Date.now().toString().slice(-6);
  const invitePhone = `+91981${uniqueSuffix}`;
  const inviteBusinessName = `Swift Fleet Test ${uniqueSuffix}`;
  const inviteEmail = `ops_${uniqueSuffix}@swiftfleet.test`;

  console.log(`[-] Admin inviting vendor company "${inviteBusinessName}" (${invitePhone})...`);
  const createVendorRes = await api('/admin/vendors', adminToken, {
    method: 'POST',
    body: JSON.stringify({
      businessName: inviteBusinessName,
      contactPhone: invitePhone,
      contactEmail: inviteEmail,
      serviceAreas: ['BLR-CEN', 'BLR-STH'],
      servicesOffered: ['Residential Relocation', 'Packing & Moving'],
    }),
  });

  // Requirement 6: Don't assume every successful endpoint must return exactly 200 (expects 201)
  assert(
    createVendorRes.status === 201,
    `Admin POST /admin/vendors returns HTTP 201 Created (got ${createVendorRes.status})`,
    { expected: 201, actual: createVendorRes.status }
  );

  const createdVendor = createVendorRes.body?.vendor;
  const invitationUrl = createVendorRes.body?.invitationUrl;
  const rawInvitationToken = createVendorRes.body?.invitationToken;
  const deliveryStatus = createVendorRes.body?.deliveryStatus;

  assert(Boolean(createdVendor && createdVendor._id), 'Vendor record returned in response');
  assert(createdVendor?.status === 'PENDING_REVIEW', `Vendor status initialized to PENDING_REVIEW (got '${createdVendor?.status}')`);
  assert(Boolean(invitationUrl && rawInvitationToken), 'Cryptographic invitationUrl and invitationToken generated');
  assert(
    deliveryStatus?.email === 'pending_provider_configuration',
    `Honest delivery status reported: pending_provider_configuration (got '${deliveryStatus?.email}')`
  );

  // Requirement 1 & 2: Verify DB uses invitationTokenHash, NOT raw token, and mustChangePassword is true
  const invitedUserDB = await User.findOne({ phone: invitePhone });
  assert(Boolean(invitedUserDB), 'User owner created in database for invited vendor');
  assert(
    invitedUserDB?.mustChangePassword === true,
    `Existing mustChangePassword field verified: true (got ${invitedUserDB?.mustChangePassword})`
  );
  assert(
    Boolean(invitedUserDB?.invitationTokenHash),
    'Cryptographic invitationTokenHash stored in MongoDB'
  );

  const computedHash = crypto.createHash('sha256').update(rawInvitationToken).digest('hex');
  assert(
    invitedUserDB?.invitationTokenHash === computedHash,
    'invitationTokenHash in DB strictly matches SHA-256 of raw token; raw token NOT leaked in DB'
  );

  // Verify invitation link via GET /auth/invitation/verify
  const verifyTokenRes = await api(`/auth/invitation/verify?token=${rawInvitationToken}`, null);
  assert(verifyTokenRes.status === 200 && verifyTokenRes.body?.valid === true, 'GET /auth/invitation/verify validates token successfully');

  // Accept Invitation & Set Password
  const newOwnerPassword = 'securePassword@123';
  const acceptRes = await api('/auth/invitation/accept', null, {
    method: 'POST',
    body: JSON.stringify({ token: rawInvitationToken, password: newOwnerPassword }),
  });
  assert(acceptRes.status === 200 && acceptRes.body?.success === true, 'POST /auth/invitation/accept sets account password successfully');

  // Single-use verification: try accepting again with the same token
  const secondAcceptRes = await api('/auth/invitation/accept', null, {
    method: 'POST',
    body: JSON.stringify({ token: rawInvitationToken, password: 'anotherPassword@123' }),
  });
  assert(
    secondAcceptRes.status === 400 && secondAcceptRes.body?.error?.code === 'INVALID_OR_EXPIRED_TOKEN',
    'Invitation token is strictly single-use; second attempt rejected with 400 INVALID_OR_EXPIRED_TOKEN'
  );

  // Verify user state in DB after accepting invitation
  const updatedUserDB = await User.findOne({ phone: invitePhone });
  assert(updatedUserDB?.invitationTokenHash === undefined, 'invitationTokenHash purged from DB after single use');
  assert(updatedUserDB?.mustChangePassword === false, 'mustChangePassword cleared to false after successful password configuration');

  // Login as invited vendor owner
  const invitedOwnerLogin = await api('/auth/login', null, {
    method: 'POST',
    body: JSON.stringify({ identifier: invitePhone, password: newOwnerPassword }),
  });
  assert(invitedOwnerLogin.status === 200 && invitedOwnerLogin.body?.token, 'Invited vendor owner logs in successfully with new password');
  const invitedOwnerToken = invitedOwnerLogin.body?.token;

  // --------------------------------------------------------------------------
  // TEST GROUP 2: DIRECT URL BYPASS & CENTRALIZED GATE (requireApprovedVendor)
  // --------------------------------------------------------------------------
  console.log('\n========================================================================');
  console.log('TEST GROUP 2: DIRECT URL BYPASS & CENTRALIZED GATE (requireApprovedVendor)');
  console.log('========================================================================');

  // Vendor is in PENDING_REVIEW status:
  console.log('[-] Attempting direct URL operational API bypass while in PENDING_REVIEW status...');

  const operationalEndpoints = [
    { method: 'GET', path: '/vendor/dashboard/stats', name: 'Dashboard Stats' },
    { method: 'GET', path: '/vendor/requests/available', name: 'Available Customer Leads' },
    { method: 'GET', path: '/vendor/quotations', name: 'Quotations List' },
    { method: 'POST', path: '/vendor/quotations', name: 'Submit Quotation' },
    { method: 'GET', path: '/vendor/bookings', name: 'Bookings List' },
    { method: 'GET', path: '/vendor/employees', name: 'Employees List' },
    { method: 'GET', path: '/vendor/roles', name: 'Roles List' },
    { method: 'GET', path: '/vendor/vehicles', name: 'Fleet Vehicles' },
    { method: 'GET', path: '/vendor/workers', name: 'Crew Workers' },
    { method: 'GET', path: '/vendor/packages', name: 'Moving Packages' },
    { method: 'GET', path: '/vendor/services', name: 'Services Catalog' },
    { method: 'GET', path: '/vendor/service-areas', name: 'Service Areas' },
    { method: 'GET', path: '/vendor/reports', name: 'Business Reports' },
    { method: 'GET', path: '/vendor/audit-logs', name: 'Activity Audit Logs' },
  ];

  for (const ep of operationalEndpoints) {
    const res = await api(ep.path, invitedOwnerToken, { method: ep.method, body: ep.method === 'POST' ? JSON.stringify({}) : undefined });
    assert(
      res.status === 403 && res.body?.error?.code === 'VENDOR_NOT_APPROVED',
      `Locked Operational Endpoint [${ep.method} ${ep.path}] returns 403 VENDOR_NOT_APPROVED (got ${res.status}, code: ${res.body?.error?.code})`
    );
  }

  // Allowed Onboarding Endpoints while PENDING_REVIEW:
  console.log('\n[-] Testing allowed onboarding endpoints while in PENDING_REVIEW status...');

  const profileRes = await api('/vendor/company-profile', invitedOwnerToken);
  assert(profileRes.status === 200 && profileRes.body?.vendor, 'GET /vendor/company-profile accessible during onboarding (HTTP 200)');

  const myProfileRes = await api('/vendor/profile', invitedOwnerToken);
  assert(myProfileRes.status === 200, 'GET /vendor/profile accessible during onboarding (HTTP 200)');

  const companiesRes = await api('/vendor/companies', invitedOwnerToken);
  assert(companiesRes.status === 200, 'GET /vendor/companies accessible during onboarding (HTTP 200)');

  const docsRes = await api('/vendor/documents', invitedOwnerToken);
  assert(docsRes.status === 200 && Array.isArray(docsRes.body?.documents), 'GET /vendor/documents accessible during onboarding (HTTP 200)');

  // Requirement H: Direct Frontend Route Gate contract
  console.log('\n[-] Testing Frontend Layout Route Gate contract (Requirement H)...');
  const testRoutes = [
    { path: '/vendor/dashboard', expectedLocked: true },
    { path: '/vendor/quotations', expectedLocked: true },
    { path: '/vendor/bookings', expectedLocked: true },
    { path: '/vendor/tracking', expectedLocked: true },
    { path: '/vendor/workers', expectedLocked: true },
    { path: '/vendor/vehicles', expectedLocked: true },
    { path: '/vendor/company-profile', expectedLocked: false },
    { path: '/vendor/profile', expectedLocked: false },
    { path: '/vendor/documents', expectedLocked: false },
    { path: '/vendor/my-permissions', expectedLocked: false },
  ];
  const isOnboardingRoute = (p) =>
    p === '/vendor/company-profile' ||
    p.startsWith('/vendor/company-profile/') ||
    p === '/vendor/profile' ||
    p === '/vendor/documents' ||
    p === '/vendor/my-permissions';
  const isVerificationLocked = (p, status) => status !== 'APPROVED' && !isOnboardingRoute(p);

  for (const tr of testRoutes) {
    const locked = isVerificationLocked(tr.path, 'PENDING_REVIEW');
    assert(
      locked === tr.expectedLocked,
      `Requirement H: Frontend Layout Gate: Route "${tr.path}" when status is PENDING_REVIEW -> ${tr.expectedLocked ? 'LOCKED' : 'ALLOWED'}`
    );
  }

  // Requirement A: CHANGES_REQUESTED + ALL ACCESS -> operational API 403
  console.log('\n[-] Testing CHANGES_REQUESTED status with all-access owner (Requirement A)...');
  const requestChangesRes = await api(`/admin/vendors/${createdVendor._id}/review`, adminToken, {
    method: 'POST',
    body: JSON.stringify({
      decision: 'CHANGES_REQUESTED',
      reason: 'GST registration certificate requires official seal and signature',
    }),
  });
  assert(requestChangesRes.status === 200, 'Admin sets vendor status to CHANGES_REQUESTED (HTTP 200)');

  const changesReqVendorDB = await Vendor.findById(createdVendor._id);
  assert(
    changesReqVendorDB?.status === 'CHANGES_REQUESTED',
    `Vendor status in DB transitioned to CHANGES_REQUESTED (got '${changesReqVendorDB?.status}')`
  );

  // Owner has all-access / wildcard permissions. Verify operational APIs are locked:
  const changesReqStatsRes = await api('/vendor/dashboard/stats', invitedOwnerToken);
  assert(
    changesReqStatsRes.status === 403 && changesReqStatsRes.body?.error?.code === 'VENDOR_NOT_APPROVED',
    'Requirement A: CHANGES_REQUESTED + ALL ACCESS -> /vendor/dashboard/stats returns 403 VENDOR_NOT_APPROVED'
  );

  const changesReqQuotesRes = await api('/vendor/quotations', invitedOwnerToken);
  assert(
    changesReqQuotesRes.status === 403 && changesReqQuotesRes.body?.error?.code === 'VENDOR_NOT_APPROVED',
    'Requirement A: CHANGES_REQUESTED + ALL ACCESS -> /vendor/quotations returns 403 VENDOR_NOT_APPROVED'
  );

  const changesReqBookingsRes = await api('/vendor/bookings', invitedOwnerToken);
  assert(
    changesReqBookingsRes.status === 403 && changesReqBookingsRes.body?.error?.code === 'VENDOR_NOT_APPROVED',
    'Requirement A: CHANGES_REQUESTED + ALL ACCESS -> /vendor/bookings returns 403 VENDOR_NOT_APPROVED'
  );

  // Verify onboarding endpoints remain accessible during CHANGES_REQUESTED:
  const changesReqProfileRes = await api('/vendor/company-profile', invitedOwnerToken);
  assert(
    changesReqProfileRes.status === 200 &&
    changesReqProfileRes.body?.vendor?.status === 'CHANGES_REQUESTED' &&
    changesReqProfileRes.body?.verification?.adminFeedback?.includes('official seal'),
    'Onboarding endpoint /vendor/company-profile accessible during CHANGES_REQUESTED with reviewReason (HTTP 200)'
  );

  // Frontend layout lock check for CHANGES_REQUESTED:
  assert(
    isVerificationLocked('/vendor/quotations', 'CHANGES_REQUESTED') === true,
    'Requirement H: Frontend layout gate locks /vendor/quotations when status is CHANGES_REQUESTED'
  );
  assert(
    isVerificationLocked('/vendor/company-profile', 'CHANGES_REQUESTED') === false,
    'Requirement H: Frontend layout gate allows /vendor/company-profile when status is CHANGES_REQUESTED'
  );

  // Reset back to PENDING_REVIEW for subsequent tests
  await Vendor.findByIdAndUpdate(createdVendor._id, { $set: { status: 'PENDING_REVIEW' } });

  // --------------------------------------------------------------------------
  // TEST GROUP 3: WORKFORCE METRICS DERIVATION (MongoDB Source of Truth)
  // --------------------------------------------------------------------------
  console.log('\n========================================================================');
  console.log('TEST GROUP 3: WORKFORCE METRICS (Strict Single Source of Truth)');
  console.log('========================================================================');

  const vId = createdVendor._id;

  // Query MongoDB directly
  const dbTotalEmployees = await User.countDocuments({ vendorId: vId, accountStatus: { $ne: 'deleted' } });
  const dbCrewWorkers = await User.countDocuments({ vendorId: vId, role: 'worker', accountStatus: { $ne: 'deleted' } });
  const dbActiveEmployees = await User.countDocuments({ vendorId: vId, accountStatus: 'active' });

  console.log(`    DB counts: total=${dbTotalEmployees}, crew=${dbCrewWorkers}, active=${dbActiveEmployees}`);

  const vendorCompanyProfileRes = await api('/vendor/company-profile', invitedOwnerToken);
  const wf = vendorCompanyProfileRes.body?.workforce;

  assert(
    wf && wf.totalEmployees === dbTotalEmployees,
    `Vendor Company Profile totalEmployees strictly matches MongoDB (${wf?.totalEmployees} === ${dbTotalEmployees})`
  );
  assert(
    wf && wf.crewWorkers === dbCrewWorkers,
    `Vendor Company Profile crewWorkers strictly matches MongoDB (${wf?.crewWorkers} === ${dbCrewWorkers})`
  );
  assert(
    wf && wf.activeEmployees === dbActiveEmployees,
    `Vendor Company Profile activeEmployees strictly matches MongoDB (${wf?.activeEmployees} === ${dbActiveEmployees})`
  );

  // Admin perspective
  const adminVendorRes = await api(`/admin/vendors/${vId}`, adminToken);
  const adminWf = adminVendorRes.body?.vendor?.workforce;
  assert(
    adminWf && adminWf.totalEmployees === dbTotalEmployees,
    `Admin Vendor Details totalEmployees strictly matches MongoDB (${adminWf?.totalEmployees} === ${dbTotalEmployees})`
  );
  assert(
    adminWf && adminWf.crewWorkers === dbCrewWorkers,
    `Admin Vendor Details crewWorkers strictly matches MongoDB (${adminWf?.crewWorkers} === ${dbCrewWorkers})`
  );
  assert(
    adminWf && adminWf.activeEmployees === dbActiveEmployees,
    `Admin Vendor Details activeEmployees strictly matches MongoDB (${adminWf?.activeEmployees} === ${dbActiveEmployees})`
  );

  // --------------------------------------------------------------------------
  // TEST GROUP 4: LOGO UPLOAD & STREAMING
  // --------------------------------------------------------------------------
  console.log('\n========================================================================');
  console.log('TEST GROUP 4: COMPANY LOGO UPLOAD & STREAMING');
  console.log('========================================================================');

  // Generate 1x1 transparent PNG data URI
  const samplePngBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

  const logoUploadRes = await api('/vendor/company-profile/logo', invitedOwnerToken, {
    method: 'POST',
    body: JSON.stringify({
      file: samplePngBase64,
      fileName: 'company_logo.png',
    }),
  });
  assert(logoUploadRes.status === 200 && logoUploadRes.body?.logoUrl, 'POST /vendor/company-profile/logo returns 200 with logoUrl');

  const logoStreamRes = await api('/vendor/logo', invitedOwnerToken);
  assert(logoStreamRes.status === 200, 'GET /vendor/logo streams company logo image (HTTP 200)');

  // --------------------------------------------------------------------------
  // TEST GROUP 5: 4-CORE VERIFICATION CHECKLIST & OPERATIONAL COMPLIANCE
  // --------------------------------------------------------------------------
  console.log('\n========================================================================');
  console.log('TEST GROUP 5: 4-CORE VERIFICATION CHECKLIST & OPERATIONAL COMPLIANCE');
  console.log('========================================================================');

  // Submit 4 Core Verification Documents:
  const coreDocsToSubmit = [
    { type: 'GST_CERTIFICATE', fileName: 'gst_certificate.png', notes: 'Valid GSTIN' },
    { type: 'BUSINESS_PAN', fileName: 'business_pan.png', notes: 'Valid PAN' },
    { type: 'REPRESENTATIVE_ID_PROOF', fileName: 'rep_id_proof.png', notes: 'Govt Identity Proof' },
    { type: 'REPRESENTATIVE_PHOTO', fileName: 'rep_photo.png', notes: 'Camera capture' },
  ];

  for (const doc of coreDocsToSubmit) {
    const res = await api('/vendor/documents', invitedOwnerToken, {
      method: 'POST',
      body: JSON.stringify({
        type: doc.type,
        fileUrl: samplePngBase64,
        fileName: doc.fileName,
        fileSize: '1.2 MB',
        notes: doc.notes,
      }),
    });
    assert(res.status === 200 && res.body?.document, `Vendor submits core doc ${doc.type} successfully (HTTP 200)`);
  }

  // Submit 2 Operational Compliance Documents (Transport Permit & Transit Insurance):
  const operationalDocsToSubmit = [
    { type: 'TRANSPORT_PERMIT', fileName: 'transport_permit.png', notes: 'Commercial vehicle permit' },
    { type: 'TRANSIT_INSURANCE', fileName: 'transit_insurance.png', notes: 'Goods transit cover policy' },
  ];

  for (const doc of operationalDocsToSubmit) {
    const res = await api('/vendor/documents', invitedOwnerToken, {
      method: 'POST',
      body: JSON.stringify({
        type: doc.type,
        fileUrl: samplePngBase64,
        fileName: doc.fileName,
        fileSize: '1.5 MB',
        notes: doc.notes,
      }),
    });
    assert(res.status === 200 && res.body?.document, `Vendor submits operational compliance doc ${doc.type} successfully (HTTP 200)`);
  }

  // Inspect Company Profile metadata before Admin reviews (Requirement F):
  const profileWithDocsRes = await api('/vendor/company-profile', invitedOwnerToken);
  const vProfileDocs = profileWithDocsRes.body?.verification?.documents || [];
  const vCoreMeta = profileWithDocsRes.body?.verification || {};

  assert(
    vCoreMeta.coreRequiredCount === 4,
    `Requirement F: coreRequiredCount is strictly 4, despite operational docs submitted (got ${vCoreMeta.coreRequiredCount})`
  );

  const tPermitMeta = vProfileDocs.find((d) => d.type === 'TRANSPORT_PERMIT');
  assert(
    tPermitMeta?.required === false && tPermitMeta?.section === 'OPERATIONAL',
    `Requirement F: TRANSPORT_PERMIT has required: false and section: 'OPERATIONAL' (required: ${tPermitMeta?.required}, section: ${tPermitMeta?.section})`
  );

  const tInsuranceMeta = vProfileDocs.find((d) => d.type === 'TRANSIT_INSURANCE');
  assert(
    tInsuranceMeta?.required === false && tInsuranceMeta?.section === 'OPERATIONAL',
    `Requirement F: TRANSIT_INSURANCE has required: false and section: 'OPERATIONAL' (required: ${tInsuranceMeta?.required}, section: ${tInsuranceMeta?.section})`
  );

  const gstMeta = vProfileDocs.find((d) => d.type === 'GST_CERTIFICATE');
  assert(
    gstMeta?.required === true && gstMeta?.section === 'COMPANY',
    `GST_CERTIFICATE has required: true and section: 'COMPANY'`
  );

  const panMeta = vProfileDocs.find((d) => d.type === 'BUSINESS_PAN');
  assert(
    panMeta?.required === true && panMeta?.section === 'COMPANY',
    `BUSINESS_PAN has required: true and section: 'COMPANY'`
  );

  const repIdMeta = vProfileDocs.find((d) => d.type === 'REPRESENTATIVE_ID_PROOF');
  assert(
    repIdMeta?.required === true && repIdMeta?.section === 'REPRESENTATIVE',
    `REPRESENTATIVE_ID_PROOF has required: true and section: 'REPRESENTATIVE'`
  );

  const repPhotoMeta = vProfileDocs.find((d) => d.type === 'REPRESENTATIVE_PHOTO');
  assert(
    repPhotoMeta?.required === true && repPhotoMeta?.section === 'REPRESENTATIVE',
    `REPRESENTATIVE_PHOTO has required: true and section: 'REPRESENTATIVE'`
  );

  // Admin reviews and approves all 4 core documents individually:
  for (const doc of coreDocsToSubmit) {
    const revRes = await api(`/admin/vendors/${vId}/documents/${doc.type}/review`, adminToken, {
      method: 'POST',
      body: JSON.stringify({
        decision: 'APPROVED',
        reason: `${doc.type} verified with regulatory authority`,
      }),
    });
    assert(revRes.status === 200, `Admin reviews individual core doc ${doc.type} -> APPROVED (HTTP 200)`);
  }

  // Admin also reviews 1 operational doc (TRANSPORT_PERMIT -> APPROVED):
  const tPermitRevRes = await api(`/admin/vendors/${vId}/documents/TRANSPORT_PERMIT/review`, adminToken, {
    method: 'POST',
    body: JSON.stringify({
      decision: 'APPROVED',
      reason: 'Commercial transport permit verified with state RTO',
    }),
  });
  assert(tPermitRevRes.status === 200, 'Admin reviews operational doc TRANSPORT_PERMIT -> APPROVED (HTTP 200)');

  // Requirement E & Requirement F assertions:
  const profileAfterCoreApproval = await api('/vendor/company-profile', invitedOwnerToken);
  const coreApproved = profileAfterCoreApproval.body?.verification?.coreApprovedCount;
  const coreReq = profileAfterCoreApproval.body?.verification?.coreRequiredCount;
  const coreComplete = profileAfterCoreApproval.body?.verification?.coreVerificationComplete;
  const totalApproved = profileAfterCoreApproval.body?.verification?.totalApprovedCount;

  assert(
    coreApproved === 4,
    `Requirement F: coreApprovedCount is strictly 4 (operational doc approval does NOT increment coreApprovedCount, got ${coreApproved})`
  );
  assert(
    coreReq === 4,
    `Requirement F: coreRequiredCount is strictly 4 (got ${coreReq})`
  );
  assert(
    coreComplete === true,
    `Requirement E: coreVerificationComplete is true when 4/4 core documents approved`
  );
  assert(
    totalApproved === 5,
    `totalApprovedCount is 5 (4 core + 1 operational approved)`
  );

  // Requirement E: Company status MUST NOT automatically become APPROVED
  const vendorAfterAllCoreApproved = await Vendor.findById(vId);
  assert(
    vendorAfterAllCoreApproved?.status === 'PENDING_REVIEW',
    `Requirement E: 4/4 core docs approved completes checklist, but company remains PENDING_REVIEW; NO automatic company approval (got '${vendorAfterAllCoreApproved?.status}')`
  );

  // Operational APIs still locked because company status is not yet APPROVED:
  const opCheckWhileAllDocsApproved = await api('/vendor/dashboard/stats', invitedOwnerToken);
  assert(
    opCheckWhileAllDocsApproved.status === 403 && opCheckWhileAllDocsApproved.body?.error?.code === 'VENDOR_NOT_APPROVED',
    'Requirement E: Operational API /vendor/dashboard/stats remains locked (403 VENDOR_NOT_APPROVED) until explicit Admin company approval'
  );

  // Requirement G: Existing operational compliance documents are NOT deleted and can be fetched/viewed
  const allDocsFetchRes = await api('/vendor/documents', invitedOwnerToken);
  const docTypesInVendor = (allDocsFetchRes.body?.documents || []).map((d) => d.type);
  assert(
    docTypesInVendor.includes('TRANSPORT_PERMIT'),
    'Requirement G: TRANSPORT_PERMIT persists in vendor documents list (not deleted)'
  );
  assert(
    docTypesInVendor.includes('TRANSIT_INSURANCE'),
    'Requirement G: TRANSIT_INSURANCE persists in vendor documents list (not deleted)'
  );

  const tPermitViewRes = await api('/vendor/documents/TRANSPORT_PERMIT/view', invitedOwnerToken);
  assert(
    tPermitViewRes.status === 200,
    'Requirement G: GET /vendor/documents/TRANSPORT_PERMIT/view successfully streams operational document (HTTP 200)'
  );

  const tInsuranceViewRes = await api('/vendor/documents/TRANSIT_INSURANCE/view', invitedOwnerToken);
  assert(
    tInsuranceViewRes.status === 200,
    'Requirement G: GET /vendor/documents/TRANSIT_INSURANCE/view successfully streams operational document (HTTP 200)'
  );

  // --------------------------------------------------------------------------
  // TEST GROUP 6: COMPANY APPROVAL & LEGAL NAME LOCKING
  // --------------------------------------------------------------------------
  console.log('\n========================================================================');
  console.log('TEST GROUP 6: COMPANY APPROVAL & LEGAL NAME LOCKING');
  console.log('========================================================================');

  // While in PENDING_REVIEW, legal name can be modified:
  const pendingNameUpdateRes = await api('/vendor/company-profile', invitedOwnerToken, {
    method: 'PATCH',
    body: JSON.stringify({
      businessName: `${inviteBusinessName} Logistics`,
    }),
  });
  assert(
    pendingNameUpdateRes.status === 200,
    'Legal businessName can be updated while in PENDING_REVIEW (HTTP 200)'
  );

  // Admin formally approves company application
  const approveCompanyRes = await api(`/admin/vendors/${vId}/review`, adminToken, {
    method: 'POST',
    body: JSON.stringify({
      decision: 'APPROVED',
      reason: 'All carrier criteria validated.',
    }),
  });
  assert(approveCompanyRes.status === 200, 'Admin approves company application (HTTP 200)');

  const approvedVendorDB = await Vendor.findById(vId);
  assert(approvedVendorDB?.status === 'APPROVED', 'Vendor company status is now APPROVED');

  // Hardening Rule 14: Legal Name Locking on APPROVED Company
  const lockNameAttemptRes = await api('/vendor/company-profile', invitedOwnerToken, {
    method: 'PATCH',
    body: JSON.stringify({
      businessName: 'Unilateral Name Change Attempt Ltd',
    }),
  });
  assert(
    lockNameAttemptRes.status === 400 && lockNameAttemptRes.body?.error?.code === 'LEGAL_NAME_LOCKED',
    'Rule 14: Self-service change to legal businessName on APPROVED company blocked with 400 LEGAL_NAME_LOCKED'
  );

  // Operational non-legal updates remain allowed:
  const operationalUpdateRes = await api('/vendor/company-profile', invitedOwnerToken, {
    method: 'PATCH',
    body: JSON.stringify({
      contactPhone: '+919876500000',
      serviceAreas: ['BLR-CEN', 'BLR-STH', 'BLR-NTH'],
    }),
  });
  assert(operationalUpdateRes.status === 200, 'Operational non-legal updates (contact phone, service areas) succeed on APPROVED company (HTTP 200)');

  // Now that vendor is APPROVED, operational endpoints MUST succeed for owner:
  const operationalUnlockedRes = await api('/vendor/dashboard/stats', invitedOwnerToken);
  assert(
    operationalUnlockedRes.status === 200,
    'Operational endpoint GET /vendor/dashboard/stats successfully unlocked after company approval (HTTP 200)'
  );

  // --------------------------------------------------------------------------
  // TEST GROUP 7: TWO-LAYER AUTHORIZATION & ACTIVE-TOKEN REVOCATION
  // --------------------------------------------------------------------------
  console.log('\n========================================================================');
  console.log('TEST GROUP 7: TWO-LAYER AUTHORIZATION (Company Approved + Effective Permissions)');
  console.log('========================================================================');

  // Create an employee under this approved company who ONLY has 'quotations:view' permission
  const quoteEmpPhone = `+91982${uniqueSuffix}`;
  const salt = await bcrypt.genSalt(10);
  const hashedPw = await bcrypt.hash('password123', salt);

  const quoteEmployee = await User.create({
    phone: quoteEmpPhone,
    displayName: 'Rahul Test Quote-Only',
    role: 'worker',
    employeeRole: 'lead_estimator',
    vendorId: vId,
    accountStatus: 'active',
    password: hashedPw,
    permissions: ['quotations:view', 'View Quotations'],
    permissionOverrides: { granted: [], revoked: [] },
  });

  const quoteEmpLogin = await api('/auth/login', null, {
    method: 'POST',
    body: JSON.stringify({ identifier: quoteEmpPhone, password: 'password123' }),
  });
  assert(quoteEmpLogin.status === 200 && quoteEmpLogin.body?.token, 'Scoped employee logs in successfully');
  const quoteEmpToken = quoteEmpLogin.body?.token;

  // Requirement C: Scoped employee on APPROVED company with quotations:view accesses GET /vendor/quotations -> 200
  const allowedEpRes = await api('/vendor/quotations', quoteEmpToken);
  assert(
    allowedEpRes.status === 200,
    'Requirement C: APPROVED + QUOTATION PERMISSION -> GET /vendor/quotations returns HTTP 200'
  );

  // Requirement B: Scoped employee on APPROVED company without bookings permission accessing GET /vendor/bookings -> 403 FORBIDDEN
  const unauthorizedBookingsRes = await api('/vendor/bookings', quoteEmpToken);
  assert(
    unauthorizedBookingsRes.status === 403 && unauthorizedBookingsRes.body?.error?.code === 'FORBIDDEN',
    `Requirement B: APPROVED + NO BOOKINGS PERMISSION -> GET /vendor/bookings returns 403 FORBIDDEN (got ${unauthorizedBookingsRes.status}, code: ${unauthorizedBookingsRes.body?.error?.code})`
  );

  // Requirement B part 2: An employee with NO quotation permission accessing GET /vendor/quotations -> 403 FORBIDDEN
  const bookingEmpPhone = `+91984${uniqueSuffix}`;
  const bookingEmployee = await User.create({
    phone: bookingEmpPhone,
    displayName: 'Vijay Test Booking-Only',
    role: 'worker',
    employeeRole: 'move_coordinator',
    vendorId: vId,
    accountStatus: 'active',
    password: hashedPw,
    permissions: ['bookings:view', 'View & Dispatch Bookings'],
    permissionOverrides: { granted: [], revoked: [] },
  });

  const bookingEmpLogin = await api('/auth/login', null, {
    method: 'POST',
    body: JSON.stringify({ identifier: bookingEmpPhone, password: 'password123' }),
  });
  assert(bookingEmpLogin.status === 200 && bookingEmpLogin.body?.token, 'Booking-only employee logs in successfully');
  const bookingEmpToken = bookingEmpLogin.body?.token;

  const noQuotePermRes = await api('/vendor/quotations', bookingEmpToken);
  assert(
    noQuotePermRes.status === 403 && noQuotePermRes.body?.error?.code === 'FORBIDDEN',
    `Requirement B: APPROVED + NO QUOTATION PERMISSION -> GET /vendor/quotations returns 403 FORBIDDEN (got ${noQuotePermRes.status}, code: ${noQuotePermRes.body?.error?.code})`
  );

  // Requirement D: Permission revoked after approval -> next protected request 403 on active token
  console.log('\n[-] Testing Requirement D: Active Token Permission Revocation...');
  const revokeRes = await api(`/vendor/employees/${quoteEmployee._id}`, invitedOwnerToken, {
    method: 'PATCH',
    body: JSON.stringify({
      permissionOverrides: {
        granted: [],
        revoked: ['quotations:view', 'View Quotations', 'Review Available Customer Leads', 'Create & Submit Formal Quotations'],
      },
    }),
  });
  assert(revokeRes.status === 200, 'Vendor owner successfully revokes quotation permissions from employee (HTTP 200)');

  // Without re-logging in, the employee makes immediate next request with their existing active JWT token:
  const immediatePostRevokeRes = await api('/vendor/quotations', quoteEmpToken);
  assert(
    immediatePostRevokeRes.status === 403 && immediatePostRevokeRes.body?.error?.code === 'FORBIDDEN',
    `Requirement D: Permission revoked on active token -> next protected request immediately blocked with 403 FORBIDDEN (got ${immediatePostRevokeRes.status}, code: ${immediatePostRevokeRes.body?.error?.code})`
  );

  // --------------------------------------------------------------------------
  // TEST GROUP 8: SUSPENDED VENDOR LOCKOUT
  // --------------------------------------------------------------------------
  console.log('\n========================================================================');
  console.log('TEST GROUP 8: SUSPENDED VENDOR LOCKOUT');
  console.log('========================================================================');

  // Admin suspends vendor
  const suspendRes = await api(`/admin/vendors/${vId}/suspend`, adminToken, {
    method: 'POST',
    body: JSON.stringify({ reason: 'Audit investigation in progress' }),
  });
  assert(suspendRes.status === 200, 'Admin suspends vendor company (HTTP 200)');

  // Suspended vendor attempts operational API -> 403 VENDOR_SUSPENDED
  const suspendedOpRes = await api('/vendor/dashboard/stats', invitedOwnerToken);
  assert(
    suspendedOpRes.status === 403 && suspendedOpRes.body?.error?.code === 'VENDOR_SUSPENDED',
    `Suspended vendor calling /vendor/dashboard/stats returns 403 VENDOR_SUSPENDED (got ${suspendedOpRes.status}, code: ${suspendedOpRes.body?.error?.code})`
  );

  // Suspended vendor attempts document submission -> 403 VENDOR_SUSPENDED
  const suspendedDocRes = await api('/vendor/documents', invitedOwnerToken, {
    method: 'POST',
    body: JSON.stringify({
      type: 'TRANSPORT_PERMIT',
      fileUrl: samplePngBase64,
    }),
  });
  assert(
    suspendedDocRes.status === 403 && suspendedDocRes.body?.error?.code === 'VENDOR_SUSPENDED',
    `Suspended vendor submitting document returns 403 VENDOR_SUSPENDED (got ${suspendedDocRes.status}, code: ${suspendedDocRes.body?.error?.code})`
  );

  // --------------------------------------------------------------------------
  // TEST GROUP 9: VENDOR SELF-REGISTRATION E2E TEST (Requirement 3)
  // --------------------------------------------------------------------------
  console.log('\n========================================================================');
  console.log('TEST GROUP 9: VENDOR SELF-REGISTRATION FLOW (Requirement 3)');
  console.log('========================================================================');

  const selfRegPhone = `+91983${uniqueSuffix}`;
  const selfRegUser = await User.create({
    phone: selfRegPhone,
    displayName: 'Self Registered Owner',
    role: 'customer', // Starts as normal user / customer
    accountStatus: 'active',
    password: hashedPw,
  });

  const selfRegLogin = await api('/auth/login', null, {
    method: 'POST',
    body: JSON.stringify({ identifier: selfRegPhone, password: 'password123' }),
  });
  const selfRegToken = selfRegLogin.body?.token;

  const selfRegBusinessName = `FastGo Relocations ${uniqueSuffix}`;
  const selfRegRes = await api('/vendor/register', selfRegToken, {
    method: 'POST',
    body: JSON.stringify({
      businessName: selfRegBusinessName,
      contactPhone: selfRegPhone,
      contactEmail: `self_${uniqueSuffix}@fastgo.test`,
      serviceAreas: ['BLR-CEN'],
      servicesOffered: ['Packing', 'Loading', 'Transport'],
    }),
  });

  assert(
    selfRegRes.status === 200 || selfRegRes.status === 201,
    `Vendor self-registration succeeds with HTTP 200/201 (got ${selfRegRes.status})`
  );

  const selfRegVendor = selfRegRes.body?.vendor;
  assert(selfRegVendor?.status === 'PENDING_REVIEW', `Self-registered vendor initialized in PENDING_REVIEW (got '${selfRegVendor?.status}')`);

  // Check user role upgraded to vendor
  const updatedSelfUser = await User.findById(selfRegUser._id);
  assert(updatedSelfUser?.role === 'vendor', `User role promoted to 'vendor' (got '${updatedSelfUser?.role}')`);
  assert(
    updatedSelfUser?.vendorId?.toString() === selfRegVendor?._id?.toString(),
    'User linked to newly created vendorId'
  );

  // Check that admin cross notification was created
  const notif = await Notification.findOne({
    targetType: 'Vendor',
    targetId: selfRegVendor._id.toString(),
    title: 'New Vendor Registration',
  });
  assert(Boolean(notif), 'Admin cross-notification recorded for new self-registered vendor');

  // --------------------------------------------------------------------------
  // TEST GROUP 10: VENDOR VERIFICATION ACCESS GATE OVERRIDING OPERATIONAL PERMISSIONS
  // --------------------------------------------------------------------------
  console.log('\n========================================================================');
  console.log('TEST GROUP 10: VENDOR VERIFICATION ACCESS GATE OVERRIDE (Tests A - J)');
  console.log('========================================================================');

  const gateSuffix = Date.now().toString().slice(-5);
  const gateOwnerPhone = `+91984${gateSuffix}`;
  const gateEmployeePhone = `+91985${gateSuffix}`;

  // 1. Create owner user
  const gateOwner = await User.create({
    phone: gateOwnerPhone,
    displayName: `Gate Owner ${gateSuffix}`,
    role: 'vendor',
    accountStatus: 'active',
    password: hashedPw,
  });

  // 2. Create a fully approved carrier company with all 6 required documents APPROVED
  const gateVendor = await Vendor.create({
    ownerId: gateOwner._id,
    businessName: `Gate Security Express ${gateSuffix}`,
    contactPhone: gateOwnerPhone,
    contactEmail: `owner_${gateSuffix}@gatesecurity.test`,
    status: 'APPROVED',
    serviceAreas: ['BLR-CEN', 'BLR-EAST'],
    servicesOffered: ['Residential Moving', 'Packing & Moving'],
    verificationDetails: {
      status: 'APPROVED',
      lastReviewedAt: new Date(),
      documents: [
        { type: 'GST_CERTIFICATE', status: 'APPROVED', fileName: 'gst.pdf', fileUrl: '/uploads/gst.pdf', reviewedAt: new Date() },
        { type: 'BUSINESS_PAN', status: 'APPROVED', fileName: 'pan.pdf', fileUrl: '/uploads/pan.pdf', reviewedAt: new Date() },
        { type: 'REPRESENTATIVE_ID_PROOF', status: 'APPROVED', fileName: 'id.pdf', fileUrl: '/uploads/id.pdf', reviewedAt: new Date() },
        { type: 'REPRESENTATIVE_PHOTO', status: 'APPROVED', fileName: 'photo.jpg', fileUrl: '/uploads/photo.jpg', reviewedAt: new Date() },
        { type: 'TRANSPORT_PERMIT', status: 'APPROVED', fileName: 'permit.pdf', fileUrl: '/uploads/permit.pdf', reviewedAt: new Date() },
        { type: 'TRANSIT_INSURANCE', status: 'APPROVED', fileName: 'insurance.pdf', fileUrl: '/uploads/insurance.pdf', reviewedAt: new Date() },
      ],
    },
  });

  gateOwner.vendorId = gateVendor._id;
  await gateOwner.save();

  // 2. Create an employee with wildcard All-Access permissions ['*']
  const gateEmployee = await User.create({
    phone: gateEmployeePhone,
    displayName: `Gate Operations Chief ${gateSuffix}`,
    role: 'worker',
    employeeRole: 'operational_manager',
    vendorId: gateVendor._id,
    permissions: ['*'],
    accountStatus: 'active',
    password: hashedPw,
  });

  // Log in as employee
  const gateEmpLogin = await api('/auth/login', null, {
    method: 'POST',
    body: JSON.stringify({ identifier: gateEmployeePhone, password: 'password123' }),
  });
  assert(gateEmpLogin.status === 200 && gateEmpLogin.body?.token, 'Gate Employee logged in successfully', { actual: gateEmpLogin.status });
  const gateEmpToken = gateEmpLogin.body?.token;

  // --------------------------------------------------------------------------
  // TEST A: Initial state: Vendor approved, all 6 documents approved -> Operational Access Allowed
  // --------------------------------------------------------------------------
  console.log('\n[-] Test A: Initial state - 6 documents APPROVED, employee has "*" wildcard...');
  const testABookings = await api('/vendor/bookings', gateEmpToken);
  assert(
    testABookings.status === 200,
    `[Test A] Employee with wildcard '*' accesses operational /vendor/bookings with HTTP 200 (got ${testABookings.status})`
  );

  const testAQuotations = await api('/vendor/quotations', gateEmpToken);
  assert(
    testAQuotations.status === 200,
    `[Test A] Employee accesses operational /vendor/quotations with HTTP 200 (got ${testAQuotations.status})`
  );

  const testAMe = await api('/auth/me', gateEmpToken);
  assert(
    testAMe.status === 200 && testAMe.body?.user?.companyVerificationAccess === 'ALLOWED',
    `[Test A] /auth/me returns companyVerificationAccess === 'ALLOWED' (got '${testAMe.body?.user?.companyVerificationAccess}')`
  );
  assert(
    Array.isArray(testAMe.body?.user?.permissions) && testAMe.body.user.permissions.includes('*'),
    '[Test A] Employee permissions intact with wildcard "*"'
  );

  // --------------------------------------------------------------------------
  // TEST B: Admin reviews ONE document to CHANGES_REQUESTED (TRANSIT_INSURANCE)
  // --------------------------------------------------------------------------
  console.log('\n[-] Test B: Admin requests revisions on TRANSIT_INSURANCE...');
  const testBReview = await api(`/admin/vendors/${gateVendor._id.toString()}/documents/TRANSIT_INSURANCE/review`, adminToken, {
    method: 'POST',
    body: JSON.stringify({
      decision: 'CHANGES_REQUESTED',
      reason: 'Transit insurance expired on 01-Jan. Please upload current policy.',
    }),
  });
  assert(testBReview.status === 200, `[Test B] Admin sets TRANSIT_INSURANCE to CHANGES_REQUESTED with HTTP 200 (got ${testBReview.status})`);

  // Verify vendor.status is NOT mutated
  const gateVendorAfterB = await Vendor.findById(gateVendor._id);
  assert(
    gateVendorAfterB.status === 'APPROVED',
    `[Test B] Vendor company status remains 'APPROVED' in MongoDB (got '${gateVendorAfterB.status}')`
  );

  // --------------------------------------------------------------------------
  // TEST C: Live session invalidation: SAME employee session immediately blocked with HTTP 403
  // --------------------------------------------------------------------------
  console.log('\n[-] Test C: SAME employee session calls operational endpoint without relogin...');
  const testCOperational = await api('/vendor/bookings', gateEmpToken);
  assert(
    testCOperational.status === 403,
    `[Test C] Operational request /vendor/bookings immediately blocked with HTTP 403 (got ${testCOperational.status})`
  );
  assert(
    testCOperational.body?.error?.code === 'VENDOR_NOT_APPROVED',
    `[Test C] Error code is 'VENDOR_NOT_APPROVED' (got '${testCOperational.body?.error?.code}')`
  );
  assert(
    testCOperational.body?.verificationAccess === 'RESTRICTED',
    `[Test C] Body returns verificationAccess: 'RESTRICTED' (got '${testCOperational.body?.verificationAccess}')`
  );
  assert(
    testCOperational.body?.verificationStatus === 'CHANGES_REQUESTED',
    `[Test C] Body returns verificationStatus: 'CHANGES_REQUESTED' (got '${testCOperational.body?.verificationStatus}')`
  );
  assert(
    testCOperational.body?.blockingItem === 'TRANSIT_INSURANCE',
    `[Test C] Body identifies blockingItem: 'TRANSIT_INSURANCE' (got '${testCOperational.body?.blockingItem}')`
  );
  assert(
    Boolean(testCOperational.body?.reviewReason),
    `[Test C] Body includes administrator reviewReason: "${testCOperational.body?.reviewReason}"`
  );

  // --------------------------------------------------------------------------
  // TEST D: Verify employee permissions in MongoDB are 100% PRESERVED
  // --------------------------------------------------------------------------
  console.log('\n[-] Test D: Checking employee permissions in MongoDB...');
  const gateEmpUserDB = await User.findById(gateEmployee._id);
  assert(
    Array.isArray(gateEmpUserDB.permissions) && gateEmpUserDB.permissions.includes('*'),
    `[Test D] Employee permissions in MongoDB NOT mutated/deleted (permissions: ${JSON.stringify(gateEmpUserDB.permissions)})`
  );
  assert(
    gateEmpUserDB.employeeRole === 'operational_manager',
    `[Test D] Employee role definition preserved intact ('${gateEmpUserDB.employeeRole}')`
  );

  // --------------------------------------------------------------------------
  // TEST E: Remediation and non-operational endpoints remain ALLOWED
  // --------------------------------------------------------------------------
  console.log('\n[-] Test E: Verifying remediation endpoint accessibility...');
  const testEProfile = await api('/vendor/company-profile', gateEmpToken);
  assert(testEProfile.status === 200, `[Test E] GET /vendor/company-profile returns HTTP 200 (got ${testEProfile.status})`);
  assert(
    testEProfile.body?.verification?.access === 'RESTRICTED',
    `[Test E] Company profile returns verification.access: 'RESTRICTED' (got '${testEProfile.body?.verification?.access}')`
  );
  assert(
    testEProfile.body?.verification?.blockingItem === 'TRANSIT_INSURANCE',
    `[Test E] Company profile flags blockingItem: 'TRANSIT_INSURANCE' (got '${testEProfile.body?.verification?.blockingItem}')`
  );

  const testEDocuments = await api('/vendor/documents', gateEmpToken);
  assert(testEDocuments.status === 200, `[Test E] GET /vendor/documents returns HTTP 200 (got ${testEDocuments.status})`);

  const testEPersonal = await api('/vendor/profile', gateEmpToken);
  assert(testEPersonal.status === 200, `[Test E] GET /vendor/profile returns HTTP 200 (got ${testEPersonal.status})`);

  const testEMe = await api('/auth/me', gateEmpToken);
  assert(
    testEMe.status === 200 && testEMe.body?.user?.companyVerificationAccess === 'RESTRICTED',
    `[Test E] GET /auth/me returns companyVerificationAccess: 'RESTRICTED' (got '${testEMe.body?.user?.companyVerificationAccess}')`
  );
  assert(
    testEMe.body?.user?.permissions?.includes('*'),
    '[Test E] GET /auth/me still reports employee permissions as ["*"] (not cleared)'
  );

  // --------------------------------------------------------------------------
  // TEST F: Admin Oversight Independence (Admin endpoints never blocked)
  // --------------------------------------------------------------------------
  console.log('\n[-] Test F: Verifying Admin Oversight Independence...');
  const testFAdminVendor = await api(`/admin/vendors/${gateVendor._id.toString()}`, adminToken);
  assert(testFAdminVendor.status === 200, `[Test F] GET /admin/vendors/:id returns HTTP 200 (got ${testFAdminVendor.status})`);
  assert(
    testFAdminVendor.body?.vendor?.verificationAccess === 'RESTRICTED',
    `[Test F] Admin sees verificationAccess: 'RESTRICTED' (got '${testFAdminVendor.body?.vendor?.verificationAccess}')`
  );

  // --------------------------------------------------------------------------
  // TEST G: Admin changes document status to REJECTED
  // --------------------------------------------------------------------------
  console.log('\n[-] Test G: Admin rejects document...');
  const testGReview = await api(`/admin/vendors/${gateVendor._id.toString()}/documents/TRANSIT_INSURANCE/review`, adminToken, {
    method: 'POST',
    body: JSON.stringify({
      decision: 'REJECTED',
      reason: 'Invalid document format; seal is illegible.',
    }),
  });
  assert(testGReview.status === 200, `[Test G] Admin marks document REJECTED with HTTP 200 (got ${testGReview.status})`);

  const testGOperational = await api('/vendor/quotations', gateEmpToken);
  assert(
    testGOperational.status === 403 && testGOperational.body?.verificationStatus === 'REJECTED',
    `[Test G] Operational request returns 403 with verificationStatus: 'REJECTED' (got ${testGOperational.status})`
  );

  // --------------------------------------------------------------------------
  // TEST H: Vendor uploads replacement document
  // --------------------------------------------------------------------------
  console.log('\n[-] Test H: Vendor submits replacement document...');
  const testHUpload = await api('/vendor/documents', gateEmpToken, {
    method: 'POST',
    body: JSON.stringify({
      type: 'TRANSIT_INSURANCE',
      fileUrl: '/uploads/documents/new_transit_insurance_2026.pdf',
      fileName: 'new_transit_insurance_2026.pdf',
      notes: 'New valid policy uploaded.',
    }),
  });
  assert(testHUpload.status === 200, `[Test H] Document upload returns HTTP 200 (got ${testHUpload.status})`);

  // Verify that operational requests REMAIN blocked while document is PENDING_REVIEW
  const testHStillBlocked = await api('/vendor/bookings', gateEmpToken);
  assert(
    testHStillBlocked.status === 403 && testHStillBlocked.body?.verificationStatus === 'PENDING_REVIEW',
    `[Test H] Operational requests remain blocked (403) while document is PENDING_REVIEW (got ${testHStillBlocked.status})`
  );

  // --------------------------------------------------------------------------
  // TEST I: Admin reviews and approves replacement document
  // --------------------------------------------------------------------------
  console.log('\n[-] Test I: Admin approves replacement document...');
  const testIReview = await api(`/admin/vendors/${gateVendor._id.toString()}/documents/TRANSIT_INSURANCE/review`, adminToken, {
    method: 'POST',
    body: JSON.stringify({
      decision: 'APPROVED',
      reason: 'Policy verified with underwriter.',
    }),
  });
  assert(testIReview.status === 200, `[Test I] Admin approves replacement document with HTTP 200 (got ${testIReview.status})`);

  // Verify all 6 documents are now APPROVED
  const gateVendorAfterI = await Vendor.findById(gateVendor._id);
  const approvedDocCount = gateVendorAfterI.verificationDetails?.documents?.filter(
    (d) => ['GST_CERTIFICATE', 'BUSINESS_PAN', 'REPRESENTATIVE_ID_PROOF', 'REPRESENTATIVE_PHOTO', 'TRANSPORT_PERMIT', 'TRANSIT_INSURANCE'].includes(d.type) && d.status === 'APPROVED'
  ).length;
  assert(approvedDocCount === 6, `[Test I] All 6 blocking documents are APPROVED in MongoDB (got ${approvedDocCount}/6)`);

  // --------------------------------------------------------------------------
  // TEST J: Instant operational access restoration without relogin or permission re-grant
  // --------------------------------------------------------------------------
  console.log('\n[-] Test J: Testing instant operational access restoration for SAME session...');
  const testJBookings = await api('/vendor/bookings', gateEmpToken);
  assert(
    testJBookings.status === 200,
    `[Test J] /vendor/bookings immediately returns HTTP 200 OK without relogin or permission re-grant! (got ${testJBookings.status})`
  );

  const testJQuotations = await api('/vendor/quotations', gateEmpToken);
  assert(
    testJQuotations.status === 200,
    `[Test J] /vendor/quotations immediately returns HTTP 200 OK! (got ${testJQuotations.status})`
  );

  const testJMe = await api('/auth/me', gateEmpToken);
  assert(
    testJMe.status === 200 && testJMe.body?.user?.companyVerificationAccess === 'ALLOWED',
    `[Test J] /auth/me returns companyVerificationAccess === 'ALLOWED' (got '${testJMe.body?.user?.companyVerificationAccess}')`
  );

  // Clean up test records
  console.log('\n[Cleanup] Removing temporary test records from DB...');
  await User.deleteMany({ _id: { $in: [invitedUserDB._id, quoteEmployee._id, bookingEmployee._id, selfRegUser._id, gateEmployee._id, gateOwner._id] } });
  await Vendor.deleteMany({ _id: { $in: [createdVendor._id, selfRegVendor._id, gateVendor._id] } });
  await Notification.deleteMany({ targetId: { $in: [createdVendor._id.toString(), selfRegVendor._id.toString(), gateVendor._id.toString()] } });
  console.log('    ✓ Test artifacts cleaned up');

  console.log('\n========================================================================');
  console.log(`  E2E TEST SUMMARY:`);
  console.log(`  Passed: ${passedCount}`);
  console.log(`  Failed: ${failedCount}`);
  console.log('========================================================================\n');

  if (failedCount > 0) {
    console.error('Failure Details:');
    console.error(JSON.stringify(recordedFailures, null, 2));
    process.exit(1);
  } else {
    console.log('All company profile, onboarding and verification tests PASSED with 100% compliance!\n');
    process.exit(0);
  }
}

runTests().catch((err) => {
  console.error('Fatal error running tests:', err);
  process.exit(1);
});
