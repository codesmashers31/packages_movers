// scratch/test_document_viewing_flow.mjs
// End-to-end test for Vendor Document Upload & Admin Viewing Workflow

const API_BASE = 'http://localhost:5000/api/v1';

// Minimal 1-page valid PDF buffer in base64
const SAMPLE_PDF_BASE64 = 
  'JVBERi0xLjQKMSAwIG9iago8PAogIC9UeXBlIC9DYXRhbG9nCiAgL1BhZ2VzIDIgMCBSCj4+CmVuZG9iagoyIDAgb2JqCjw8CiAgL1R5cGUgL1BhZ2VzCiAgL0tpZHMgWzMgMCBSXQogIC9Db3VudCAxCj4+CmVuZG9iagozIDAgb2JqCjw8CiAgL1R5cGUgL1BhZ2UKICAvUGFyZW50IDIgMCBSCiAgL01lZGlhQm94IFswIDAgNjEyIDc5Ml0KICAvUmVzb3VyY2VzIDw8CiAgICAvRm9udCA8PAogICAgICAvRjEgPDwKICAgICAgICAvVHlwZSAvRm9udAogICAgICAgIC9TdWJ0eXBlIC9UeXBlMQogICAgICAgIC9CYXNlRm9udCAvSGVsdmV0aWNhCiAgICAgID4+CiAgICA+PgogID4+CiAgL0NvbnRlbnRzIDQgMCBSCj4+CmVuZG9iago0IDAgb2JqCjw8CiAgL0xlbmd0aCA1NQo+PgpzdHJlYW0KQlQKL0YxIDI0IFRmCjEwMCA3MDAgVGQKKFRlc3QgR1NUIENlcnRpZmljYXRlIFBERikgVGoKRVQKZW5kc3RyZWFtCmVuZG9iagp4cmVmCjAgNQowMDAwMDAwMDAwIDY1NTM1IGYgCjAwMDAwMDAwMDkgMDAwMDAgbiAKMDAwMDAwMDA1OCAwMDAwMCBuIAowMDAwMDAwMTE1IDAwMDAwIG4gCjAwMDAwMDAyOTkgMDAwMDAgbiAKdHJhaWxlcgo8PAogIC9TaXplIDUKICAvUm9vdCAxIDAgUgo+PgpzdGFydHhyZWYKNDAzCiUlRU9G';

const SAMPLE_PDF_DATA_URL = `data:application/pdf;base64,${SAMPLE_PDF_BASE64}`;

async function runTests() {
  console.log('====================================================');
  console.log('  TESTING VENDOR KYC DOCUMENT VIEWING WORKFLOW');
  console.log('====================================================\n');

  // Step 1: Login Vendor
  console.log('[1] Logging in Vendor (+919876543215)...');
  const vendorLoginRes = await fetch(`${API_BASE}/auth/otp/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: '+919876543215', otp: '123456', role: 'vendor' }),
  });
  const vendorLoginData = await vendorLoginRes.json();
  const vendorToken = vendorLoginData.token;
  if (!vendorToken) throw new Error('Vendor login failed: ' + JSON.stringify(vendorLoginData));

  // Get Vendor profile
  const vendorProfileRes = await fetch(`${API_BASE}/vendor/profile`, {
    headers: { Authorization: `Bearer ${vendorToken}` },
  });
  const vendorProfileData = await vendorProfileRes.json();
  const vendorId = vendorProfileData.vendor._id;
  console.log(` -> Vendor logged in: ${vendorProfileData.vendor.businessName} (ID: ${vendorId})`);

  // Step 2: Vendor uploads PDF document (GST_CERTIFICATE)
  console.log('\n[2] Vendor submitting GST_CERTIFICATE (PDF)...');
  const uploadRes = await fetch(`${API_BASE}/vendor/documents`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${vendorToken}`,
    },
    body: JSON.stringify({
      type: 'GST_CERTIFICATE',
      fileUrl: SAMPLE_PDF_DATA_URL,
      fileName: 'gstin_bangalore_movers.pdf',
      fileSize: '403 B',
      notes: 'Official GST Certificate registration test',
    }),
  });
  const uploadData = await uploadRes.json();
  if (uploadRes.status !== 200) throw new Error('Upload failed: ' + JSON.stringify(uploadData));
  console.log(' -> Document uploaded successfully:', uploadData.document.fileName);
  console.log(' -> fileUrl assigned:', uploadData.document.fileUrl);

  // Step 3: Vendor streams the document directly
  console.log('\n[3] Vendor streaming uploaded document via GET /vendor/documents/GST_CERTIFICATE/view...');
  const vendorStreamRes = await fetch(`${API_BASE}/vendor/documents/GST_CERTIFICATE/view?token=${vendorToken}`);
  console.log(' -> Response Status:', vendorStreamRes.status);
  console.log(' -> Content-Type:', vendorStreamRes.headers.get('content-type'));
  console.log(' -> Content-Disposition:', vendorStreamRes.headers.get('content-disposition'));
  const vendorBuf = await vendorStreamRes.arrayBuffer();
  const vendorHeader = Buffer.from(vendorBuf.slice(0, 5)).toString();
  console.log(' -> Magic bytes (first 5 chars):', vendorHeader);
  if (vendorStreamRes.status !== 200 || !vendorStreamRes.headers.get('content-type')?.includes('application/pdf') || vendorHeader !== '%PDF-') {
    throw new Error('Vendor streaming failed verification!');
  }
  console.log(' -> Vendor PDF stream verified valid!');

  // Step 4: Vendor downloads the document with &download=true
  console.log('\n[4] Vendor downloading with &download=true...');
  const vendorDownloadRes = await fetch(`${API_BASE}/vendor/documents/GST_CERTIFICATE/view?token=${vendorToken}&download=true`);
  const vendorDisp = vendorDownloadRes.headers.get('content-disposition') || '';
  console.log(' -> Content-Disposition:', vendorDisp);
  if (!vendorDisp.startsWith('attachment')) {
    throw new Error('Download disposition header mismatch: ' + vendorDisp);
  }
  console.log(' -> Vendor download disposition verified attachment!');

  // Step 5: Admin Login
  console.log('\n[5] Logging in Admin (+919876543210)...');
  const adminLoginRes = await fetch(`${API_BASE}/auth/otp/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: '+919876543210', otp: '123456', role: 'admin' }),
  });
  const adminLoginData = await adminLoginRes.json();
  const adminToken = adminLoginData.token;
  if (!adminToken) throw new Error('Admin login failed: ' + JSON.stringify(adminLoginData));
  console.log(' -> Admin logged in successfully');

  // Step 6: Admin retrieves documents via /admin/documents
  console.log('\n[6] Admin fetching documents from /admin/documents...');
  const adminDocsRes = await fetch(`${API_BASE}/admin/documents`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const adminDocsData = await adminDocsRes.json();
  const gstDoc = adminDocsData.documents?.find(d => d.vendorId === vendorId && d.type === 'GST_CERTIFICATE');
  if (!gstDoc) throw new Error('Uploaded GST document not found in /admin/documents!');
  console.log(' -> Found GST document in admin listing:');
  console.log('    Title:', gstDoc.title);
  console.log('    FileName:', gstDoc.fileName);
  console.log('    fileUrl:', gstDoc.fileUrl);

  // Step 7: Admin views the uploaded document via GET /admin/vendors/:vendorId/documents/:docType/view
  console.log('\n[7] Admin viewing document via authenticated streaming endpoint...');
  const adminViewUrl = `${API_BASE}/admin/vendors/${vendorId}/documents/GST_CERTIFICATE/view?token=${adminToken}`;
  const adminViewRes = await fetch(adminViewUrl);
  console.log(' -> Response Status:', adminViewRes.status);
  console.log(' -> Content-Type:', adminViewRes.headers.get('content-type'));
  console.log(' -> Content-Disposition:', adminViewRes.headers.get('content-disposition'));
  const adminBuf = await adminViewRes.arrayBuffer();
  const adminHeader = Buffer.from(adminBuf.slice(0, 5)).toString();
  console.log(' -> Magic bytes (first 5 chars):', adminHeader);
  if (adminViewRes.status !== 200 || !adminViewRes.headers.get('content-type')?.includes('application/pdf') || adminHeader !== '%PDF-') {
    throw new Error('Admin viewing failed verification!');
  }
  console.log(' -> Admin PDF stream verified valid!');

  // Step 8: Admin downloads the document with &download=true
  console.log('\n[8] Admin downloading document with &download=true...');
  const adminDownloadRes = await fetch(`${API_BASE}/admin/vendors/${vendorId}/documents/GST_CERTIFICATE/view?token=${adminToken}&download=true`);
  const adminDisp = adminDownloadRes.headers.get('content-disposition') || '';
  console.log(' -> Content-Disposition:', adminDisp);
  if (!adminDisp.startsWith('attachment')) {
    throw new Error('Admin download disposition header mismatch: ' + adminDisp);
  }
  console.log(' -> Admin download disposition verified attachment!');

  // Step 9: Test Pre-seeded / Fallback Document View (TRANSPORT_PERMIT)
  console.log('\n[9] Admin viewing pre-seeded document (TRANSPORT_PERMIT)...');
  const permitViewRes = await fetch(`${API_BASE}/admin/vendors/${vendorId}/documents/TRANSPORT_PERMIT/view?token=${adminToken}`);
  console.log(' -> Response Status:', permitViewRes.status);
  console.log(' -> Content-Type:', permitViewRes.headers.get('content-type'));
  const permitBuf = await permitViewRes.arrayBuffer();
  const permitHeader = Buffer.from(permitBuf.slice(0, 5)).toString();
  console.log(' -> Magic bytes (first 5 chars):', permitHeader);
  if (permitViewRes.status !== 200 || permitHeader !== '%PDF-') {
    throw new Error('Fallback PDF generation failed for pre-seeded document!');
  }
  console.log(' -> Certified valid PDF generated dynamically for pre-seeded document!');

  // Step 10: Security & Error Handling tests
  console.log('\n[10] Security & Error Handling tests:');

  // 10a: Access without token
  const noTokenRes = await fetch(`${API_BASE}/admin/vendors/${vendorId}/documents/GST_CERTIFICATE/view`);
  console.log(' -> Request without token status:', noTokenRes.status);
  if (noTokenRes.status !== 401) throw new Error('Expected 401 for unauthenticated request!');
  console.log('    ✓ Blocked unauthorized access (401)');

  // 10b: Request unsubmitted document
  const unsubmittedRes = await fetch(`${API_BASE}/admin/vendors/${vendorId}/documents/NON_EXISTENT/view?token=${adminToken}`);
  const unsubmittedData = await unsubmittedRes.json();
  console.log(' -> Request unsubmitted doc status:', unsubmittedRes.status, unsubmittedData.error?.message);
  if (unsubmittedRes.status !== 404 || unsubmittedData.error?.message !== 'Document file is unavailable.') {
    throw new Error('Expected 404 "Document file is unavailable."!');
  }
  console.log('    ✓ Correct graceful 404 "Document file is unavailable."');

  console.log('\n====================================================');
  console.log('  ALL 10 KYC DOCUMENT WORKFLOW TESTS PASSED 100%!');
  console.log('====================================================');
}

runTests().catch((err) => {
  console.error('\n❌ Test failed:', err);
  process.exit(1);
});
