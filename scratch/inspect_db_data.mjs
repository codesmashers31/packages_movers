import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config({ path: 'backend/.env' });

async function inspect() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');
  const db = mongoose.connection.db;
  const collections = await db.listCollections().toArray();
  for (const col of collections) {
    const count = await db.collection(col.name).countDocuments();
    console.log(`${col.name}: ${count}`);
  }

  // Inspect sample MovingRequests
  const requests = await db.collection('movingrequests').find({}).limit(5).toArray();
  console.log('\nSample movingrequests count:', requests.length);
  if (requests.length) {
    console.log('Sample request keys:', Object.keys(requests[0]));
    console.log('Sample request:', JSON.stringify(requests[0], null, 2));
  }

  // Inspect sample Quotes
  const quotes = await db.collection('quotes').find({}).limit(5).toArray();
  console.log('\nSample quotes count:', quotes.length);
  if (quotes.length) {
    console.log('Sample quote keys:', Object.keys(quotes[0]));
    console.log('Sample quote:', JSON.stringify(quotes[0], null, 2));
  }

  // Inspect sample Bookings
  const bookings = await db.collection('bookings').find({}).limit(5).toArray();
  console.log('\nSample bookings count:', bookings.length);
  if (bookings.length) {
    console.log('Sample booking keys:', Object.keys(bookings[0]));
    console.log('Sample booking:', JSON.stringify(bookings[0], null, 2));
  }

  await mongoose.disconnect();
}

inspect().catch(console.error);
