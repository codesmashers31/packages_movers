import mongoose from 'mongoose';
import { Vehicle } from '../models/Vehicle.js';
import { User } from '../models/User.js';
import { MovingRequest } from '../models/MovingRequest.js';
import { Quote } from '../models/Quote.js';
import { Booking } from '../models/Booking.js';
import { Vendor } from '../models/Vendor.js';

export async function bootstrapVendorOperations(vendorId: mongoose.Types.ObjectId | string): Promise<void> {
  const vId = new mongoose.Types.ObjectId(vendorId);

  // 1. Ensure Vehicles exist
  const existingVehiclesCount = await Vehicle.countDocuments({ vendorId: vId });
  let vMap: Record<string, string> = {};

  if (existingVehiclesCount === 0) {
    const defaultVehicles = [
      {
        vendorId: vId,
        name: 'Tata Ace Gold Mini Truck',
        registrationNumber: 'KA-01-MJ-2041',
        vehicleType: 'Small Pickup',
        capacity: '1.5 Ton',
        isActive: true,
        notes: 'Compact city delivery vehicle for narrow lanes & 1 BHK moves',
      },
      {
        vendorId: vId,
        name: 'Mahindra Bolero Maxi Truck',
        registrationNumber: 'KA-05-AB-7812',
        vehicleType: 'Medium Truck',
        capacity: '2.5 Ton',
        isActive: true,
        notes: 'Standard 2 BHK household furniture carrier',
      },
      {
        vendorId: vId,
        name: 'Eicher Pro 2049 Enclosed Container',
        registrationNumber: 'KA-03-EX-9904',
        vehicleType: 'Large Freight Truck',
        capacity: '4.5 Ton',
        isActive: true,
        notes: '14ft water-resistant closed container for 3 BHK & villa moves',
      },
      {
        vendorId: vId,
        name: 'Ashok Leyland Dost XL',
        registrationNumber: 'KA-04-TR-5521',
        vehicleType: 'Medium Truck',
        capacity: '2.0 Ton',
        isActive: true,
        notes: 'Express move pickup vehicle equipped with hydraulic tail lift',
      },
      {
        vendorId: vId,
        name: 'Tata 407 Commercial Logistics Truck',
        registrationNumber: 'KA-02-PM-3319',
        vehicleType: 'Large Freight Truck',
        capacity: '6.0 Ton',
        isActive: true,
        notes: 'Commercial corporate office relocation hauler',
      },
    ];

    const insertedVehicles = await Vehicle.insertMany(defaultVehicles);
    insertedVehicles.forEach((v) => {
      vMap[v.registrationNumber] = v._id.toString();
    });
  } else {
    const existing = await Vehicle.find({ vendorId: vId });
    existing.forEach((v) => {
      vMap[v.registrationNumber] = v._id.toString();
    });
  }

  // 2. Ensure Workers exist
  const existingWorkersCount = await User.countDocuments({ vendorId: vId, role: 'worker' });
  let wList: mongoose.Types.ObjectId[] = [];

  if (existingWorkersCount === 0) {
    const defaultWorkers = [
      {
        phone: '+919876543201',
        displayName: 'Ramesh Kumar',
        role: 'worker' as const,
        employeeRole: 'worker' as const,
        accountStatus: 'active' as const,
        vendorId: vId,
        skills: ['Team Lead', 'Furniture Assembly', 'Fragile Packing', 'Disassembly'],
      },
      {
        phone: '+919876543202',
        displayName: 'Suresh Patil',
        role: 'worker' as const,
        employeeRole: 'worker' as const,
        accountStatus: 'active' as const,
        vendorId: vId,
        skills: ['Electronics Handling', 'Heavy Loading', '3-Layer Bubble Wrap'],
      },
      {
        phone: '+919876543203',
        displayName: 'Manjunath Gowda',
        role: 'worker' as const,
        employeeRole: 'worker' as const,
        accountStatus: 'active' as const,
        vendorId: vId,
        skills: ['Commercial Driver', 'Safe Transit Securing', 'Route Navigation'],
      },
      {
        phone: '+919876543204',
        displayName: 'Anand Sharma',
        role: 'worker' as const,
        employeeRole: 'worker' as const,
        accountStatus: 'active' as const,
        vendorId: vId,
        skills: ['Appliance Packing', 'Floor Protection', 'Careful Unloading'],
      },
      {
        phone: '+919876543205',
        displayName: 'Kiran Naik',
        role: 'worker' as const,
        employeeRole: 'worker' as const,
        accountStatus: 'active' as const,
        vendorId: vId,
        skills: ['Heavy Lifting', 'Inventory Tagging', 'Room-by-Room Placement'],
      },
    ];

    for (const w of defaultWorkers) {
      const u = await User.findOneAndUpdate(
        { phone: w.phone },
        { $set: w },
        { upsert: true, new: true }
      );
      if (u) wList.push(u._id);
    }
  } else {
    const existing = await User.find({ vendorId: vId, role: 'worker' });
    wList = existing.map((w) => w._id);
  }

  // 3. Ensure Bookings exist
  const existingBookingsCount = await Booking.countDocuments({ vendorId: vId });

  if (existingBookingsCount === 0) {
    // Ensure customers
    const defaultCustomers = [
      { phone: '+919811223344', displayName: 'Priya Sharma', role: 'customer' as const, accountStatus: 'active' as const },
      { phone: '+919822334455', displayName: 'Arjun Verma', role: 'customer' as const, accountStatus: 'active' as const },
      { phone: '+919833445566', displayName: 'Deepak Mehta', role: 'customer' as const, accountStatus: 'active' as const },
      { phone: '+919844556677', displayName: 'Sneha Rao', role: 'customer' as const, accountStatus: 'active' as const },
    ];

    const customerIds: mongoose.Types.ObjectId[] = [];
    for (const c of defaultCustomers) {
      const u = await User.findOneAndUpdate(
        { phone: c.phone },
        { $set: c },
        { upsert: true, new: true }
      );
      if (u) customerIds.push(u._id);
    }

    const defaultMoves = [
      {
        custIdx: 0,
        pickup: { street: '42, 80ft Road, 4th Block', city: 'Koramangala, Bengaluru', postalCode: '560034', floor: 2, hasLift: true },
        dest: { street: 'Tower 3, Prestige Tech Park, Outer Ring Rd', city: 'Whitefield, Bengaluru', postalCode: '560103', floor: 4, hasLift: true },
        date: new Date(),
        status: 'IN_TRANSIT' as const,
        amount: 1450000,
        pkgCode: 'PKG-3BHK-PRM',
        pkgName: '3 BHK Premium White-Glove Move',
        vehicleReg: 'KA-03-EX-9904',
        workers: [wList[0], wList[1], wList[2]],
        leadWorker: wList[0],
        deliveryCode: '5821',
      },
      {
        custIdx: 1,
        pickup: { street: '12th Main Road, HAL 2nd Stage', city: 'Indiranagar, Bengaluru', postalCode: '560038', floor: 1, hasLift: false },
        dest: { street: '17th Cross, 2nd Sector', city: 'HSR Layout, Bengaluru', postalCode: '560102', floor: 3, hasLift: true },
        date: new Date(),
        status: 'LOADING' as const,
        amount: 850000,
        pkgCode: 'PKG-2BHK-STD',
        pkgName: '2 BHK Standard Family Move',
        vehicleReg: 'KA-05-AB-7812',
        workers: [wList[3], wList[4]],
        leadWorker: wList[3],
        deliveryCode: '4190',
      },
      {
        custIdx: 2,
        pickup: { street: '9th Main Road, 4th Block', city: 'Jayanagar, Bengaluru', postalCode: '560011', floor: 0, hasLift: false },
        dest: { street: 'Phase 1, Cyber Park Area', city: 'Electronic City, Bengaluru', postalCode: '560100', floor: 1, hasLift: true },
        date: new Date(Date.now() + 24 * 3600 * 1000),
        status: 'CONFIRMED' as const,
        amount: 450000,
        pkgCode: 'PKG-1BHK-STD',
        pkgName: '1 BHK Essential Relocation',
        vehicleReg: 'KA-01-MJ-2041',
        workers: [wList[0], wList[4]],
        leadWorker: wList[0],
        deliveryCode: '2983',
      },
      {
        custIdx: 3,
        pickup: { street: '15th Cross, Sampige Road', city: 'Malleshwaram, Bengaluru', postalCode: '560003', floor: 3, hasLift: true },
        dest: { street: 'Block C, Manyata Embassy Business Park', city: 'Hebbal, Bengaluru', postalCode: '560045', floor: 2, hasLift: true },
        date: new Date(Date.now() - 48 * 3600 * 1000),
        status: 'COMPLETED' as const,
        amount: 1800000,
        pkgCode: 'PKG-CORP-OFFICE',
        pkgName: 'Corporate & Office Relocation',
        vehicleReg: 'KA-02-PM-3319',
        workers: [wList[1], wList[2], wList[3]],
        leadWorker: wList[1],
        deliveryCode: '7741',
      },
    ];

    for (const m of defaultMoves) {
      const cId = customerIds[m.custIdx];

      const reqDoc = await MovingRequest.create({
        customerId: cId,
        pickupAddress: m.pickup,
        destinationAddress: m.dest,
        preferredDate: m.date,
        preferredTimeSlot: '09:00 AM - 01:00 PM',
        items: [
          { name: 'Double Bed & Mattress', quantity: 2, isFragile: false },
          { name: 'Refrigerator 350L', quantity: 1, isFragile: true },
          { name: 'Washing Machine', quantity: 1, isFragile: false },
          { name: 'Living Room Sofa Set (3+2)', quantity: 1, isFragile: false },
          { name: 'Crockery Carton Boxes', quantity: 6, isFragile: true },
          { name: 'Wardrobe & Clothing Boxes', quantity: 8, isFragile: false },
        ],
        requestedServices: ['Packing', 'Loading', 'Road Transit', 'Unloading'],
        revision: 1,
        status: m.status === 'COMPLETED' ? 'CLOSED' : 'BOOKED',
      });

      const quoteDoc = await Quote.create({
        requestId: reqDoc._id,
        vendorId: vId,
        requestRevision: 1,
        quoteRevision: 1,
        totalAmountMinorUnits: m.amount,
        currency: 'INR',
        itemizedServices: [
          { serviceName: 'Vehicle Freight & Transport', amountMinorUnits: Math.round(m.amount * 0.5) },
          { serviceName: 'Multi-layer Protective Packing', amountMinorUnits: Math.round(m.amount * 0.3) },
          { serviceName: 'Trained Crew Loading & Unloading', amountMinorUnits: Math.round(m.amount * 0.2) },
        ],
        inclusions: [
          'Dedicated container truck transit',
          'Trained moving crew & team lead',
          'Standard cartons & bubble wrapping',
          'Loading, road transport & doorstep unloading',
        ],
        exclusions: ['Civil construction or plumbing works'],
        validUntil: new Date(Date.now() + 7 * 24 * 3600 * 1000),
        status: 'ACCEPTED',
      });

      const assignedVehicleId = vMap[m.vehicleReg] || m.vehicleReg;

      await Booking.create({
        requestId: reqDoc._id,
        customerId: cId,
        vendorId: vId,
        quoteId: quoteDoc._id,
        quoteSnapshot: {
          totalAmountMinorUnits: m.amount,
          currency: 'INR',
          packageCode: m.pkgCode,
          packageName: m.pkgName,
        },
        status: m.status,
        scheduledDate: m.date,
        assignedWorkers: m.workers,
        leadWorkerId: m.leadWorker,
        assignedVehicleId,
        deliveryCode: m.deliveryCode,
        version: 1,
      });
    }
  }
}
