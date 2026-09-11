import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
import express, { Response } from 'express';
import { authenticate, requireRoles, AuthenticatedRequest } from '../middlewares/auth.js';

// Setup isolated express test app
const app = express();
app.use(express.json());

// Protected admin route
app.get('/api/v1/admin/test-protection', authenticate, requireRoles('admin'), (req: AuthenticatedRequest, res: Response) => {
  res.status(200).json({ success: true, message: 'Admin access granted', user: req.user });
});

async function runTests() {
  console.log('--- Starting Admin Authorization Security Verification ---');

  const customerToken = jwt.sign(
    { id: 'user_cust_1', phone: '+919000000001', role: 'customer' },
    config.jwtSecret,
    { expiresIn: '1h' }
  );

  const vendorToken = jwt.sign(
    { id: 'user_vend_1', phone: '+919000000002', role: 'vendor' },
    config.jwtSecret,
    { expiresIn: '1h' }
  );

  const adminToken = jwt.sign(
    { id: 'user_admin_1', phone: '+919876543210', role: 'admin' },
    config.jwtSecret,
    { expiresIn: '1h' }
  );

  const server = app.listen(0);
  const address = server.address() as any;
  const port = address.port;
  const baseUrl = `http://127.0.0.1:${port}/api/v1/admin/test-protection`;

  try {
    // Test 1: No token
    console.log('1. Testing unauthenticated request (no token)...');
    const res1 = await fetch(baseUrl);
    console.log(`   Status: ${res1.status} (Expected: 401)`);
    if (res1.status !== 401) throw new Error(`Test 1 Failed: Expected 401, got ${res1.status}`);

    // Test 2: Customer token
    console.log('2. Testing customer token accessing admin route...');
    const res2 = await fetch(baseUrl, {
      headers: { Authorization: `Bearer ${customerToken}` },
    });
    console.log(`   Status: ${res2.status} (Expected: 403)`);
    if (res2.status !== 403) throw new Error(`Test 2 Failed: Expected 403, got ${res2.status}`);

    // Test 3: Vendor token
    console.log('3. Testing vendor token accessing admin route...');
    const res3 = await fetch(baseUrl, {
      headers: { Authorization: `Bearer ${vendorToken}` },
    });
    console.log(`   Status: ${res3.status} (Expected: 403)`);
    if (res3.status !== 403) throw new Error(`Test 3 Failed: Expected 403, got ${res3.status}`);

    // Test 4: Admin token
    console.log('4. Testing admin token accessing admin route...');
    const res4 = await fetch(baseUrl, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const body4 = (await res4.json()) as any;
    console.log(`   Status: ${res4.status} (Expected: 200), Response: ${JSON.stringify(body4)}`);
    if (res4.status !== 200 || !body4.success) throw new Error(`Test 4 Failed: Expected 200, got ${res4.status}`);

    console.log('--- All Admin Authorization Security Tests Passed! ---');
  } finally {
    server.close();
  }
}

runTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
