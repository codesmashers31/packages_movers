import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config({ path: 'backend/.env' });

function calculateSplitForAmount(totalRupees, vehicleType) {
  let freightRatio = 0.38;
  let packingRatio = 0.20;
  let loadingRatio = 0.16;
  let dismantlingRatio = 0.09;
  let insuranceRatio = 0.05;
  let otherRatio = 0.03;
  // tax = remaining (approx 9-10%)

  let freight = Math.round((totalRupees * freightRatio) / 100) * 100;
  let packing = Math.round((totalRupees * packingRatio) / 100) * 100;
  let loading = Math.round((totalRupees * loadingRatio) / 100) * 100;
  let dismantling = Math.round((totalRupees * dismantlingRatio) / 100) * 100;
  let insurance = Math.round((totalRupees * insuranceRatio) / 100) * 100;
  let other = Math.round((totalRupees * otherRatio) / 100) * 100;
  
  let sub = freight + packing + loading + dismantling + insurance + other;
  let taxGst = totalRupees - sub;
  if (taxGst < 0) {
    taxGst = 0;
    freight = totalRupees - (packing + loading + dismantling + insurance + other);
  }

  return {
    freightMinorUnits: freight * 100,
    packingMaterialsMinorUnits: packing * 100,
    loadingUnloadingMinorUnits: loading * 100,
    dismantlingAssemblyMinorUnits: dismantling * 100,
    insuranceMinorUnits: insurance * 100,
    taxGstMinorUnits: taxGst * 100,
    otherMinorUnits: other * 100,
  };
}

async function migrate() {
  console.log('--- MIGRATING ALL QUOTATIONS TO FULL OPERATIONAL ESTIMATION ---');
  await mongoose.connect(process.env.MONGODB_URI);

  const Quote = mongoose.model('Quote', new mongoose.Schema({}, { strict: false }));
  const MovingRequest = mongoose.model('MovingRequest', new mongoose.Schema({}, { strict: false }));

  const quotes = await Quote.find({});
  console.log(`Found ${quotes.length} quotations in MongoDB.`);

  let updatedCount = 0;

  for (const q of quotes) {
    const totalRupees = Math.round(q.totalAmountMinorUnits / 100);
    const req = await MovingRequest.findById(q.requestId);

    // Determine appropriate vehicle and crew based on totalRupees and item count
    let vehicleType = '14ft Closed Container Truck';
    let vehicleSpecs = 'Weatherproof Closed Container, Hydraulic Tailgate Ramp, GPS Tracking, Transit Cargo Blankets';
    let crewCount = 3;
    let crewRoles = '1 Lead Driver & Supervisor, 2 Professional Packers & Loaders';

    if (totalRupees >= 24000) {
      vehicleType = '22ft High-Cube Heavy Container Truck';
      vehicleSpecs = 'Maximum Volume Enclosed Truck, Heavy Machinery Ramp, Multi-Point Tie-Downs, GPS Live Tracking';
      crewCount = 5;
      crewRoles = '1 Move Coordinator & Driver, 3 Heavy-Load Packers, 1 Technician for Appliances';
    } else if (totalRupees >= 18000) {
      vehicleType = '17ft Multi-Axle Container Truck';
      vehicleSpecs = 'Heavy-Duty Weatherproof Container, Hydraulic Lift, Air-Suspension Transit, GPS Real-time Tracking';
      crewCount = 4;
      crewRoles = '1 Fleet Lead & Driver, 2 Senior Packers, 1 Furniture Dismantling Specialist';
    } else if (totalRupees <= 9000) {
      vehicleType = 'Tata Ace 9ft Mini Truck';
      vehicleSpecs = 'Compact City Transit Vehicle, All-Weather Tarpaulin Protection, Heavy Cargo Straps';
      crewCount = 2;
      crewRoles = '1 Driver & Supervisor, 1 Professional Packer/Loader';
    }

    // Check if quote already has vehicle & splitCharges
    const hasValidSplit = q.splitCharges && (q.splitCharges.freightMinorUnits > 0);
    
    let split = hasValidSplit ? q.splitCharges : calculateSplitForAmount(totalRupees, vehicleType);

    // Verify split adds up to totalAmountMinorUnits
    const splitSum = 
      (split.freightMinorUnits || 0) +
      (split.packingMaterialsMinorUnits || 0) +
      (split.loadingUnloadingMinorUnits || 0) +
      (split.dismantlingAssemblyMinorUnits || 0) +
      (split.insuranceMinorUnits || 0) +
      (split.otherMinorUnits || 0) +
      (split.taxGstMinorUnits || 0);

    if (splitSum !== q.totalAmountMinorUnits) {
      const diff = q.totalAmountMinorUnits - splitSum;
      split.taxGstMinorUnits = (split.taxGstMinorUnits || 0) + diff;
    }

    // Build itemized services
    const itemizedServices = [
      { serviceName: `Base Freight & Vehicle Transit (${vehicleType})`, amountMinorUnits: split.freightMinorUnits },
      { serviceName: 'Professional Packing Materials & Packaging', amountMinorUnits: split.packingMaterialsMinorUnits },
      { serviceName: `Loading & Doorstep Unloading (${crewCount} Crew)`, amountMinorUnits: split.loadingUnloadingMinorUnits },
      { serviceName: 'Furniture Dismantling & Assembly Services', amountMinorUnits: split.dismantlingAssemblyMinorUnits },
      { serviceName: 'Goods Transit Protection & Insurance', amountMinorUnits: split.insuranceMinorUnits },
      { serviceName: 'Toll, Parking & Incidental Handling', amountMinorUnits: split.otherMinorUnits },
      { serviceName: 'Applicable Taxes & GST (18%)', amountMinorUnits: split.taxGstMinorUnits },
    ].filter(s => s.amountMinorUnits > 0);

    const inclusions = (q.inclusions && q.inclusions.length > 0) ? q.inclusions : [
      'Multi-layer bubble wrap, foam sheeting & corrugated cartons',
      'Doorstep loading, GPS transit and unloading',
      'Goods transit insurance protection coverage',
    ];

    const exclusions = (q.exclusions && q.exclusions.length > 0) ? q.exclusions : [
      'Custom wall carpentry / masonry outside standard furniture dismantling',
      'Hazardous flammable chemicals or liquids',
      'Warehousing beyond 48 hours without prior notice',
    ];

    const assumptions = (q.assumptions && q.assumptions.length > 0) ? q.assumptions : [
      'Functional elevator available at pickup and destination',
      'Vehicle parking available within 50 meters of entrance',
    ];

    q.vehicleType = q.vehicleType || vehicleType;
    q.vehicleSpecs = q.vehicleSpecs || vehicleSpecs;
    q.crewCount = q.crewCount || crewCount;
    q.crewRoles = q.crewRoles || crewRoles;
    q.splitCharges = split;
    q.itemizedServices = itemizedServices;
    q.inclusions = inclusions;
    q.exclusions = exclusions;
    q.assumptions = assumptions;

    await Quote.updateOne(
      { _id: q._id },
      {
        $set: {
          vehicleType: q.vehicleType,
          vehicleSpecs: q.vehicleSpecs,
          crewCount: q.crewCount,
          crewRoles: q.crewRoles,
          splitCharges: q.splitCharges,
          itemizedServices: q.itemizedServices,
          inclusions: q.inclusions,
          exclusions: q.exclusions,
          assumptions: q.assumptions,
        },
      }
    );

    console.log(`Updated Quote ${q._id}: ₹${totalRupees} -> Vehicle: ${q.vehicleType} | Crew: ${q.crewCount} | Freight: ₹${split.freightMinorUnits/100} | GST: ₹${split.taxGstMinorUnits/100}`);
    updatedCount++;
  }

  console.log(`\n🎉 Successfully backfilled all ${updatedCount} quotations in MongoDB Atlas!`);
  await mongoose.disconnect();
}

migrate().catch((err) => {
  console.error('Migration error:', err);
  process.exit(1);
});
