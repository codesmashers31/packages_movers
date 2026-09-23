import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://dhamodharan:dhamo@cluster0.zed8tep.mongodb.net/packages_movers?retryWrites=true&w=majority&appName=Cluster0';

async function updateCategories() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(MONGODB_URI);
  const db = mongoose.connection.db;

  const requests = await db.collection('movingrequests').find({}).toArray();
  console.log(`Found ${requests.length} moving requests to categorize...`);

  let updatedCount = 0;

  for (let i = 0; i < requests.length; i++) {
    const req = requests[i];
    const date = new Date(req.createdAt);
    const month = date.getMonth() + 1; // 1-12

    let assignedCategory = 'Standard Family Move';

    // March, April, May: Major summer household relocation peak (~75-80% Heavy Load House Shifting)
    if (month === 3 || month === 4 || month === 5) {
      const rand = i % 10;
      if (rand < 8) { // 80%
        assignedCategory = 'Heavy Load House Shifting';
      } else if (rand < 9) {
        assignedCategory = 'Standard Family Move';
      } else {
        assignedCategory = 'Vehicle & Bike Transit';
      }
    }
    // October & November: Festive new home Griha Pravesh moves (~65% Heavy Load, ~20% Standard)
    else if (month === 10 || month === 11) {
      const rand = i % 10;
      if (rand < 7) {
        assignedCategory = 'Heavy Load House Shifting';
      } else if (rand < 9) {
        assignedCategory = 'Standard Family Move';
      } else {
        assignedCategory = 'Corporate & Office Relocation';
      }
    }
    // December & January: Lease renewals and bachelor / 1BHK transitions
    else if (month === 12 || month === 1) {
      const rand = i % 10;
      if (rand < 5) {
        assignedCategory = 'Compact Home Shifting';
      } else if (rand < 8) {
        assignedCategory = 'Standard Family Move';
      } else {
        assignedCategory = 'Heavy Load House Shifting';
      }
    }
    // June: Last wave of school relocation
    else if (month === 6) {
      const rand = i % 10;
      if (rand < 6) {
        assignedCategory = 'Heavy Load House Shifting';
      } else if (rand < 8) {
        assignedCategory = 'Standard Family Move';
      } else {
        assignedCategory = 'Compact Home Shifting';
      }
    }
    // July, August, September: Monsoon & corporate transfers
    else {
      const rand = i % 10;
      if (rand < 3) {
        assignedCategory = 'Corporate & Office Relocation';
      } else if (rand < 6) {
        assignedCategory = 'Standard Family Move';
      } else if (rand < 8) {
        assignedCategory = 'Compact Home Shifting';
      } else {
        assignedCategory = 'Heavy Load House Shifting';
      }
    }

    await db.collection('movingrequests').updateOne(
      { _id: req._id },
      { $set: { category: assignedCategory } }
    );
    updatedCount++;
  }

  console.log(`Successfully updated ${updatedCount} moving requests with categorized move types!`);
  await mongoose.disconnect();
  process.exit(0);
}

updateCategories().catch(err => {
  console.error('Update failed:', err);
  process.exit(1);
});
