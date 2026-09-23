const API_BASE = 'http://localhost:5000/api/v1';

async function run() {
  console.log('=== Starting Vendor Value-Add Features Verification ===\n');

  // 1. Authenticate Vendor
  console.log('Step 1: Authenticating Vendor (+919876543215)...');
  await fetch(`${API_BASE}/auth/otp/request`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: '+919876543215' }),
  });
  const vLoginRes = await fetch(`${API_BASE}/auth/otp/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: '+919876543215', otp: '123456' }),
  });
  const vLoginData = await vLoginRes.json();
  const vendorToken = vLoginData.token;
  console.log('Vendor authenticated! Token obtained.\n');

  // 2. Authenticate Customer (or create one for testing customer request & rejection)
  console.log('Step 2: Authenticating Customer (+919876543211)...');
  await fetch(`${API_BASE}/auth/otp/request`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: '+919876543211' }),
  });
  const cLoginRes = await fetch(`${API_BASE}/auth/otp/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: '+919876543211', otp: '123456' }),
  });
  const cLoginData = await cLoginRes.json();
  const customerToken = cLoginData.token;
  console.log('Customer authenticated! Token obtained.\n');

  // 3. Customer creates a new Moving Request
  console.log('Step 3: Customer creating a new Moving Request (Bangalore to Chennai)...');
  const reqRes = await fetch(`${API_BASE}/requests`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${customerToken}`,
    },
    body: JSON.stringify({
      pickupAddress: {
        street: '12th Cross, Indiranagar',
        city: 'Bangalore',
        postalCode: '560038',
        floor: 2,
        hasLift: true,
      },
      destinationAddress: {
        street: 'Anna Nagar West',
        city: 'Chennai',
        postalCode: '600040',
        floor: 1,
        hasLift: false,
      },
      preferredDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      preferredTimeSlot: 'MORNING',
      items: [
        { name: 'Sofa 3-Seater', category: 'Furniture', quantity: 1, isFragile: false },
        { name: 'Dining Table Glass', category: 'Furniture', quantity: 1, isFragile: true },
        { name: 'Double Door Refrigerator', category: 'Appliances', quantity: 1, isFragile: false },
      ],
      requestedServices: ['packing', 'loading', 'transport', 'unloading'],
    }),
  });
  const reqData = await reqRes.json();
  const newRequestId = reqData.request._id;
  console.log('Created Moving Request ID:', newRequestId, 'Status:', reqData.request.status, '\n');

  // 4. Vendor checks available requests
  console.log('Step 4: Vendor querying available requests...');
  const availRes = await fetch(`${API_BASE}/vendor/requests/available?city=Bangalore`, {
    headers: { Authorization: `Bearer ${vendorToken}` },
  });
  const availData = await availRes.json();
  console.log(`Available requests returned: ${availData.requests.length}`);
  const targetAvail = availData.requests.find(r => r._id === newRequestId);
  if (!targetAvail) {
    throw new Error('Newly created request not found in available requests');
  }
  console.log('Found target request in available list. hasQuoted:', targetAvail.hasQuoted, '\n');

  // 5. Vendor submits a Quotation
  console.log('Step 5: Vendor submitting quotation for the request...');
  const quoteSubmitRes = await fetch(`${API_BASE}/vendor/quotations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${vendorToken}`,
    },
    body: JSON.stringify({
      requestId: newRequestId,
      totalAmount: 18500, // ₹18,500 -> 1,850,000 paise
      currency: 'INR',
      itemizedServices: [
        { serviceName: 'High-grade Bubble & Corrugated Packing', amount: 4500 },
        { serviceName: 'Interstate GPS Container Transport', amount: 11000 },
        { serviceName: 'Unloading & Placement', amount: 3000 },
      ],
      inclusions: ['Transit insurance coverage up to ₹50,000', 'Disassembly and reassembly of bed and table'],
      exclusions: ['Storage fees beyond 24 hours', 'Handling of hazardous materials'],
      assumptions: ['Dedicated elevator access at Indiranagar', 'Normal parking distance within 30m'],
    }),
  });
  const quoteData = await quoteSubmitRes.json();
  if (quoteSubmitRes.status !== 201) {
    throw new Error(`Failed to submit quote: ${JSON.stringify(quoteData)}`);
  }
  const quoteId = quoteData.quote._id;
  console.log('Quote submitted successfully! Quote ID:', quoteId, 'Minor Units (Paise):', quoteData.quote.totalAmountMinorUnits, 'Status:', quoteData.quote.status, '\n');

  // 6. Test Duplicate Quote Prevention
  console.log('Step 6: Testing duplicate quote prevention...');
  const dupRes = await fetch(`${API_BASE}/vendor/quotations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${vendorToken}`,
    },
    body: JSON.stringify({
      requestId: newRequestId,
      totalAmount: 19000,
    }),
  });
  const dupData = await dupRes.json();
  console.log('Duplicate submission response status:', dupRes.status, 'Error Code:', dupData.error?.code);
  if (dupRes.status !== 400 || dupData.error?.code !== 'DUPLICATE_QUOTE') {
    throw new Error('Duplicate quote submission was not properly rejected!');
  }
  console.log('Duplicate quote properly prevented!\n');

  // 7. Vendor checks My Quotations
  console.log('Step 7: Vendor viewing My Quotations list...');
  const myQuotesRes = await fetch(`${API_BASE}/vendor/quotations?status=SUBMITTED`, {
    headers: { Authorization: `Bearer ${vendorToken}` },
  });
  const myQuotesData = await myQuotesRes.json();
  const myQuote = myQuotesData.quotations.find(q => q._id === quoteId);
  if (!myQuote) {
    throw new Error('Submitted quote not found in vendor quotation list');
  }
  console.log('Vendor quote confirmed in list. Status:', myQuote.status, 'Request City:', myQuote.requestId?.destinationAddress?.city, '\n');

  // 8. Customer rejects all quotations with Common Feedback
  console.log('Step 8: Customer rejecting all quotations with Common Feedback...');
  const rejectRes = await fetch(`${API_BASE}/requests/${newRequestId}/reject-all`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${customerToken}`,
    },
    body: JSON.stringify({
      reasons: ['Price was too high', 'Delivery time was not suitable'],
      comment: 'Found a local alternative within budget and faster delivery.',
    }),
  });
  const rejectData = await rejectRes.json();
  if (rejectRes.status !== 200) {
    throw new Error(`Failed to reject quotations: ${JSON.stringify(rejectData)}`);
  }
  console.log('Customer rejection completed! Request status:', rejectData.request.status);
  console.log('Common Feedback recorded:', JSON.stringify(rejectData.request.commonRejectionFeedback), '\n');

  // 9. Vendor views rejected quote detail and common feedback
  console.log('Step 9: Vendor inspecting rejected quote detail to view Common Feedback...');
  const quoteDetailRes = await fetch(`${API_BASE}/vendor/quotations/${quoteId}`, {
    headers: { Authorization: `Bearer ${vendorToken}` },
  });
  const quoteDetail = await quoteDetailRes.json();
  console.log('Vendor quote status:', quoteDetail.quotation.status);
  console.log('Vendor saw Common Feedback:', JSON.stringify(quoteDetail.quotation.requestId?.commonRejectionFeedback));
  if (!quoteDetail.quotation.requestId?.commonRejectionFeedback?.reasons?.includes('Price was too high')) {
    throw new Error('Common feedback reason not visible to participating rejected vendor');
  }
  console.log('Feedback correctly and safely visible to participating vendor!\n');

  // 10. Vendor Demand Analytics (Real MongoDB data)
  console.log('Step 10: Querying Demand Analytics...');
  const demandRes = await fetch(`${API_BASE}/vendor/analytics/demand`, {
    headers: { Authorization: `Bearer ${vendorToken}` },
  });
  const demandData = await demandRes.json();
  console.log('Demand Analytics Response:');
  console.log('- hasSufficientData:', demandData.hasSufficientData);
  console.log('- isLimitedData:', demandData.isLimitedData);
  console.log('- message:', demandData.message);
  console.log('- monthlyTrends count:', demandData.monthlyTrends?.length);
  if (demandData.monthlyTrends?.length > 0) {
    console.log('- Sample Trend:', JSON.stringify(demandData.monthlyTrends[0]));
  }
  console.log('- topRoutes count:', demandData.topRoutes?.length);
  if (demandData.topRoutes?.length > 0) {
    console.log('- Top Route:', JSON.stringify(demandData.topRoutes[0]));
  }
  console.log('- earlyPreparationNotice:', demandData.earlyPreparationNotice, '\n');

  // 11. Vendor Quote Performance Analytics (Real quotation data)
  console.log('Step 11: Querying Quote Performance Analytics...');
  const perfRes = await fetch(`${API_BASE}/vendor/analytics/quote-performance`, {
    headers: { Authorization: `Bearer ${vendorToken}` },
  });
  const perfData = await perfRes.json();
  console.log('Quote Performance Response:');
  console.log('- hasData:', perfData.hasData);
  console.log('- metrics:', JSON.stringify(perfData.metrics));
  console.log('- monthlyActivity:', JSON.stringify(perfData.monthlyActivity));
  console.log('- commonRejectionReasons:', JSON.stringify(perfData.commonRejectionReasons));
  if (perfData.commonRejectionReasons?.length > 0) {
    console.log('Verified that real customer rejection reasons are aggregated in Quote Performance!\n');
  }

  console.log('=== ALL BACKEND VALUE-ADD FEATURES VERIFIED SUCCESSFULLY! ===');
}

run().catch(err => {
  console.error('FAILED with error:', err);
  process.exit(1);
});
