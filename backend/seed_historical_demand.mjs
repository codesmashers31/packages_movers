import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://dhamodharan:dhamo@cluster0.zed8tep.mongodb.net/packages_movers?retryWrites=true&w=majority&appName=Cluster0';

async function seedHistoricalDemand() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(MONGODB_URI);
  const db = mongoose.connection.db;

  const vendorId = new mongoose.Types.ObjectId('6aa2fb8a919783dc13a83777');
  const customerIds = [
    new mongoose.Types.ObjectId('6aa445286e1bf22bed95864d'),
    new mongoose.Types.ObjectId('6aa445286e1bf22bed95864e'),
    new mongoose.Types.ObjectId('6aa445286e1bf22bed95864f'),
    new mongoose.Types.ObjectId('6aa445286e1bf22bed958650'),
    new mongoose.Types.ObjectId('6aa453b614cb1d650e398404'),
  ];

  const routes = [
    { from: { city: 'Bengaluru', street: 'Koramangala 5th Block', pin: '560095' }, to: { city: 'Chennai', street: 'Adyar', pin: '600020' } },
    { from: { city: 'Bengaluru', street: 'Indiranagar', pin: '560038' }, to: { city: 'Hyderabad', street: 'Hitech City', pin: '500081' } },
    { from: { city: 'Bengaluru', street: 'Whitefield', pin: '560066' }, to: { city: 'Pune', street: 'Kothrud', pin: '411038' } },
    { from: { city: 'Chennai', street: 'T. Nagar', pin: '600017' }, to: { city: 'Bengaluru', street: 'HSR Layout', pin: '560102' } },
    { from: { city: 'Bengaluru', street: 'Jayanagar', pin: '560041' }, to: { city: 'Electronic City', street: 'Phase 1', pin: '560100' } },
    { from: { city: 'Hyderabad', street: 'Madhapur', pin: '500081' }, to: { city: 'Bengaluru', street: 'Marathahalli', pin: '560037' } },
  ];

  // 11-month historical distribution (Oct 2025 - Aug 2026)
  // Demonstrating authentic seasonal peaks:
  // - Oct / Nov: Festive / Diwali relocation peak (35 & 28 moves)
  // - Apr / May: Summer school & career relocation peak (31 & 36 moves)
  // - Regular months: 14-22 moves
  const monthlyProfiles = [
    { year: 2025, month: 10, name: 'Oct 2025', count: 35 },
    { year: 2025, month: 11, name: 'Nov 2025', count: 28 },
    { year: 2025, month: 12, name: 'Dec 2025', count: 18 },
    { year: 2026, month: 1,  name: 'Jan 2026', count: 20 },
    { year: 2026, month: 2,  name: 'Feb 2026', count: 17 },
    { year: 2026, month: 3,  name: 'Mar 2026', count: 22 },
    { year: 2026, month: 4,  name: 'Apr 2026', count: 31 },
    { year: 2026, month: 5,  name: 'May 2026', count: 36 },
    { year: 2026, month: 6,  name: 'Jun 2026', count: 27 },
    { year: 2026, month: 7,  name: 'Jul 2026', count: 14 },
    { year: 2026, month: 8,  name: 'Aug 2026', count: 16 },
  ];

  console.log('Seeding historical customer move requests and bookings...');

  let totalSeededRequests = 0;
  let totalSeededBookings = 0;

  for (const p of monthlyProfiles) {
    for (let i = 0; i < p.count; i++) {
      const day = Math.floor(Math.random() * 26) + 1;
      const hour = Math.floor(Math.random() * 12) + 8;
      const date = new Date(Date.UTC(p.year, p.month - 1, day, hour, 0, 0));

      const customerId = customerIds[i % customerIds.length];
      const route = routes[i % routes.length];
      const isBooked = i % 4 !== 0; // ~75% booking conversion

      const reqDoc = {
        customerId,
        pickupAddress: {
          street: route.from.street,
          city: route.from.city,
          postalCode: route.from.pin,
          floor: (i % 3) + 1,
          hasLift: i % 2 === 0,
          parkingDistanceMeters: 15,
        },
        destinationAddress: {
          street: route.to.street,
          city: route.to.city,
          postalCode: route.to.pin,
          floor: (i % 4) + 1,
          hasLift: true,
          parkingDistanceMeters: 20,
        },
        preferredDate: new Date(date.getTime() + 4 * 86400000),
        preferredTimeSlot: i % 2 === 0 ? 'MORNING' : 'AFTERNOON',
        items: [
          { name: 'Master Bed & Mattress', category: 'Furniture', quantity: 1, isFragile: false },
          { name: 'Dining Set', category: 'Furniture', quantity: 1, isFragile: true },
          { name: 'Refrigerator', category: 'Appliances', quantity: 1, isFragile: false },
        ],
        requestedServices: ['packing', 'loading', 'transport', 'unloading'],
        revision: 1,
        status: isBooked ? 'BOOKED' : 'CLOSED',
        createdAt: date,
        updatedAt: date,
      };

      const insertedReq = await db.collection('movingrequests').insertOne(reqDoc);
      totalSeededRequests++;

      if (isBooked) {
        const bookingDoc = {
          requestId: insertedReq.insertedId,
          customerId,
          vendorId,
          quoteSnapshot: {
            totalAmountMinorUnits: (12000 + (i % 15) * 1000) * 100,
            currency: 'INR',
          },
          status: 'COMPLETED',
          scheduledDate: new Date(date.getTime() + 4 * 86400000),
          deliveryCode: Math.floor(1000 + Math.random() * 9000).toString(),
          version: 1,
          createdAt: new Date(date.getTime() + 86400000),
          updatedAt: new Date(date.getTime() + 5 * 86400000),
        };
        await db.collection('bookings').insertOne(bookingDoc);
        totalSeededBookings++;
      }
    }
  }

  console.log(`Successfully seeded ${totalSeededRequests} historical moving requests and ${totalSeededBookings} bookings across 11 months!`);
  await mongoose.disconnect();
  process.exit(0);
}

seedHistoricalDemand().catch(err => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
