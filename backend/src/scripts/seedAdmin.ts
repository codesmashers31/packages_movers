import mongoose from 'mongoose';
import { config } from '../config/env.js';
import { User } from '../models/User.js';

const seedAdmin = async () => {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(config.mongoUri);

    const adminPhone = process.env.ADMIN_PHONE || '+919876543210';
    let admin = await User.findOne({ phone: adminPhone });

    if (admin) {
      if (admin.role !== 'admin') {
        admin.role = 'admin';
        await admin.save();
        console.log(`Updated user ${adminPhone} to role: 'admin'`);
      } else {
        console.log(`Admin user ${adminPhone} already exists with role: 'admin'`);
      }
    } else {
      admin = await User.create({
        phone: adminPhone,
        displayName: 'Platform Admin',
        role: 'admin',
        accountStatus: 'active',
        language: 'en',
        verifiedAt: new Date(),
      });
      console.log(`Created default admin user: ${admin.phone} (role: ${admin.role})`);
    }

    console.log('Admin seeding completed successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Failed to seed admin user:', error);
    process.exit(1);
  }
};

seedAdmin();
