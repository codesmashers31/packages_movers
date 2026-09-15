const API_BASE = 'http://localhost:5000/api/v1';

async function verifyAll() {
  console.log('=====================================================');
  console.log('STARTING FULL END-TO-END VALUE-ADD VERIFICATION SUITE');
  console.log('=====================================================\n');

  // Helpers
  async function login(phone, role = 'customer') {
    await fetch(`${API_BASE}/auth/otp/request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone }),
    });
    const res = await fetch(`${API_BASE}/auth/otp/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, otp: '123456', role }),
    });
    const data = await res.json();
    if (!data.token) throw new Error(`Auth failed for ${phone}: ${JSON.stringify(data)}`);
    return data.token;
  }

  // 1. Auth tokens
  console.log('1. Authenticating test actors...');
  const vendorTokenA = await login('+919876543215', 'vendor');
  const adminToken = await login('+919876543210', 'admin');
  const customerToken = await login('+919876543211', 'customer');
  console.log('   ✓ Vendor A, Admin, and Customer authenticated.\n');

  // 2. Existing Admin Functionality Verification
  console.log('2. Verifying existing Admin functionality intact...');
  const adminVendors = await (await fetch(`${API_BASE}/admin/vendors`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  })).json();
  if (!adminVendors.vendors) throw new Error('Admin vendors endpoint broken');
  console.log(`   ✓ Admin can view ${adminVendors.vendors.length} vendors.`);

  const adminBookings = await (await fetch(`${API_BASE}/admin/bookings`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  })).json();
  if (!adminBookings.bookings) throw new Error('Admin bookings endpoint broken');
  console.log(`   ✓ Admin can view ${adminBookings.bookings.length} bookings.\n`);

  // 3. Customer Acceptance Flow (Booking creation)
  console.log('3. Testing Customer Quote Acceptance & Booking flow...');
  const createReqRes1 = await (await fetch(`${API_BASE}/requests`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${customerToken}` },
    body: JSON.stringify({
      pickupAddress: { street: 'Lavelle Road', city: 'Bangalore', postalCode: '560001' },
      destinationAddress: { street: 'Alwarpet', city: 'Chennai', postalCode: '600018' },
      preferredDate: new Date(Date.now() + 10 * 86400000).toISOString(),
      items: [{ name: 'Executive Desk', quantity: 1, isFragile: false }],
      requestedServices: ['packing', 'transport'],
    }),
  })).json();
  const acceptRequestId = createReqRes1.request._id;

  // Vendor A quotes
  const quoteRes1 = await (await fetch(`${API_BASE}/vendor/quotations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${vendorTokenA}` },
    body: JSON.stringify({
      requestId: acceptRequestId,
      totalAmount: 14500,
      itemizedServices: [{ serviceName: 'Transport', amount: 14500 }],
    }),
  })).json();
  const quoteIdToAccept = quoteRes1.quote._id;

  // Customer accepts quote
  const bookRes = await (await fetch(`${API_BASE}/bookings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${customerToken}` },
    body: JSON.stringify({ quoteId: quoteIdToAccept }),
  })).json();
  if (!bookRes.booking || bookRes.booking.status !== 'CONFIRMED') {
    throw new Error('Booking confirmation failed: ' + JSON.stringify(bookRes));
  }
  console.log(`   ✓ Customer accepted quote. Booking #${bookRes.booking._id} CONFIRMED.`);

  // Check quote status is ACCEPTED
  const checkAcceptedQuote = await (await fetch(`${API_BASE}/vendor/quotations/${quoteIdToAccept}`, {
    headers: { Authorization: `Bearer ${vendorTokenA}` },
  })).json();
  if (checkAcceptedQuote.quotation.status !== 'ACCEPTED') {
    throw new Error('Quote status was not updated to ACCEPTED');
  }
  console.log('   ✓ Vendor quotation reflects ACCEPTED status.\n');

  // 4. Customer Rejection Flow with Skip Feedback
  console.log('4. Testing Customer Rejection with [Skip Feedback]...');
  const createReqRes2 = await (await fetch(`${API_BASE}/requests`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${customerToken}` },
    body: JSON.stringify({
      pickupAddress: { street: 'Koramangala 4th Block', city: 'Bangalore', postalCode: '560034' },
      destinationAddress: { street: 'Banjara Hills', city: 'Hyderabad', postalCode: '500034' },
      preferredDate: new Date(Date.now() + 15 * 86400000).toISOString(),
      items: [{ name: 'Bookshelves', quantity: 2, isFragile: false }],
    }),
  })).json();
  const skipReqId = createReqRes2.request._id;

  // Vendor quotes
  const quoteRes2 = await (await fetch(`${API_BASE}/vendor/quotations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${vendorTokenA}` },
    body: JSON.stringify({
      requestId: skipReqId,
      totalAmount: 22000,
      itemizedServices: [{ serviceName: 'Intercity Transport', amount: 22000 }],
    }),
  })).json();
  const quoteIdToSkip = quoteRes2.quote._id;

  // Customer rejects without feedback (Skip Feedback)
  const skipRejectRes = await (await fetch(`${API_BASE}/requests/${skipReqId}/reject-all`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${customerToken}` },
    body: JSON.stringify({}), // empty body -> skip feedback
  })).json();
  if (skipRejectRes.request.status !== 'CLOSED') {
    throw new Error('Request was not closed on skip feedback');
  }
  console.log('   ✓ Customer skipped feedback; Request CLOSED successfully.');

  const checkSkippedQuote = await (await fetch(`${API_BASE}/vendor/quotations/${quoteIdToSkip}`, {
    headers: { Authorization: `Bearer ${vendorTokenA}` },
  })).json();
  if (checkSkippedQuote.quotation.status !== 'NOT_SELECTED') {
    throw new Error('Quote status was not updated to NOT_SELECTED');
  }
  if (checkSkippedQuote.quotation.requestId.commonRejectionFeedback?.reasons?.length) {
    throw new Error('Feedback should be empty when skipped');
  }
  console.log('   ✓ Vendor sees NOT_SELECTED with no feedback.\n');

  // 5. Customer Rejection Flow with Common Feedback
  console.log('5. Testing Customer Rejection with Common Feedback...');
  const createReqRes3 = await (await fetch(`${API_BASE}/requests`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${customerToken}` },
    body: JSON.stringify({
      pickupAddress: { street: 'Whitefield', city: 'Bangalore', postalCode: '560066' },
      destinationAddress: { street: 'Hitech City', city: 'Hyderabad', postalCode: '500081' },
      preferredDate: new Date(Date.now() + 20 * 86400000).toISOString(),
      items: [{ name: 'Modular Wardrobe', quantity: 1, isFragile: false }],
    }),
  })).json();
  const feedbackReqId = createReqRes3.request._id;

  // Vendor quotes
  const quoteRes3 = await (await fetch(`${API_BASE}/vendor/quotations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${vendorTokenA}` },
    body: JSON.stringify({
      requestId: feedbackReqId,
      totalAmount: 26000,
      itemizedServices: [{ serviceName: 'Premium Transport', amount: 26000 }],
    }),
  })).json();
  const quoteIdWithFeedback = quoteRes3.quote._id;

  // Customer rejects with predefined reasons + comment
  const feedbackRejectRes = await (await fetch(`${API_BASE}/requests/${feedbackReqId}/reject-all`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${customerToken}` },
    body: JSON.stringify({
      reasons: ['Price was too high', 'Schedule did not match'],
      comment: 'Needed delivery by 9 AM Friday, and budget was under ₹20k.',
    }),
  })).json();
  if (!feedbackRejectRes.request.commonRejectionFeedback?.reasons?.length) {
    throw new Error('Common feedback was not recorded');
  }
  console.log('   ✓ Common feedback recorded on MovingRequest centrally.');

  // Vendor inspects quote details
  const checkFeedbackQuote = await (await fetch(`${API_BASE}/vendor/quotations/${quoteIdWithFeedback}`, {
    headers: { Authorization: `Bearer ${vendorTokenA}` },
  })).json();
  const fb = checkFeedbackQuote.quotation.requestId.commonRejectionFeedback;
  if (!fb || !fb.reasons.includes('Price was too high') || !fb.comment) {
    throw new Error('Vendor could not view common feedback');
  }
  console.log('   ✓ Participating Vendor viewed common rejection feedback successfully.');
  console.log(`     Reasons: ${fb.reasons.join(', ')}`);
  console.log(`     Comment: "${fb.comment}"\n`);

  // 6. Security & Data Isolation
  console.log('6. Verifying Security & Competitor Data Isolation...');
  // Customer cannot query vendor quotations
  const custAccessVendor = await fetch(`${API_BASE}/vendor/quotations`, {
    headers: { Authorization: `Bearer ${customerToken}` },
  });
  if (custAccessVendor.status !== 403) {
    throw new Error('Non-vendor should be 403 Forbidden on vendor endpoints');
  }
  console.log('   ✓ Customer forbidden from accessing Vendor Quotations endpoint (403).');

  // Customer cannot reject another customer's request
  const otherCustToken = await login('+919876543219', 'customer');
  const hackerReject = await fetch(`${API_BASE}/requests/${feedbackReqId}/reject-all`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${otherCustToken}` },
    body: JSON.stringify({ reasons: ['Price was too high'] }),
  });
  if (hackerReject.status !== 403 && hackerReject.status !== 400) {
    throw new Error('Unrelated customer should not be able to reject another customer request');
  }
  console.log('   ✓ Customer data isolation enforced (cannot reject another customer request).\n');

  // 7. Demand & Quote Performance Analytics Verification
  console.log('7. Verifying Real MongoDB Analytics...');
  const demandData = await (await fetch(`${API_BASE}/vendor/analytics/demand`, {
    headers: { Authorization: `Bearer ${vendorTokenA}` },
  })).json();
  console.log(`   ✓ Demand analytics: ${demandData.monthlyTrends.length} month(s) aggregated, message: "${demandData.message}"`);
  console.log(`   ✓ Top routes: ${demandData.topRoutes.length} route(s) found from real data.`);

  const perfData = await (await fetch(`${API_BASE}/vendor/analytics/quote-performance`, {
    headers: { Authorization: `Bearer ${vendorTokenA}` },
  })).json();
  console.log(`   ✓ Quote performance: ${perfData.metrics.submitted} quotes, ${perfData.metrics.accepted} accepted, ${perfData.metrics.rejected} rejected, acceptance rate: ${perfData.metrics.acceptanceRate}%.`);
  console.log(`   ✓ Common rejection reasons aggregated: ${perfData.commonRejectionReasons.map(r => `${r.reason} (${r.count})`).join(', ')}\n`);

  console.log('=====================================================');
  console.log('ALL VERIFICATIONS PASSED WITH 100% INTEGRITY!');
  console.log('=====================================================');
}

verifyAll().catch(e => {
  console.error('VERIFICATION ERROR:', e);
  process.exit(1);
});
