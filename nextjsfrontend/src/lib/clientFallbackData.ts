// Client-side fallback data for Admin portal
// Uses ONLY existing Mongoose model fields without invented properties

export function getClientFallback(endpoint: string, options: RequestInit = {}): any {
  const method = (options.method || 'GET').toUpperCase();

  // Auth fallbacks
  if (endpoint.startsWith('/auth/otp/request')) {
    return {
      success: true,
      message: 'OTP sent successfully (Development mock OTP: 123456)',
    };
  }

  if (endpoint.startsWith('/auth/otp/verify')) {
    return {
      token: 'dev_mock_jwt_admin_token_active',
      user: {
        id: '675000000000000000000001',
        phone: '+919876543210',
        displayName: 'System Administrator',
        role: 'admin',
        language: 'en',
      },
    };
  }

  // Dashboard stats
  if (endpoint.startsWith('/admin/dashboard/stats')) {
    return {
      stats: {
        totalUsers: 8,
        totalVendors: 5,
        pendingVendorRequests: 2,
        approvedVendors: 2,
        totalBookings: 5,
        activeBookings: 3,
        completedBookings: 1,
        pendingDisputes: 1,
        totalCategories: 6,
        totalPackages: 4,
        serviceAreasCount: 6,
      },
      recentBookings: [
        {
          _id: '675400000000000000000001',
          customerId: { displayName: 'Priya Sharma', phone: '+919822334455' },
          vendorId: { businessName: 'Apex Relocations Pvt Ltd', contactPhone: '+919811223344' },
          requestId: {
            pickupAddress: { city: 'Bengaluru', street: 'Whitefield' },
            destinationAddress: { city: 'Bengaluru', street: 'Bannerghatta Rd' },
            preferredDate: '2026-03-15T09:00:00.000Z',
          },
          status: 'IN_TRANSIT',
          scheduledDate: '2026-03-15T09:00:00.000Z',
          deliveryCode: '7492',
          createdAt: '2026-03-10T08:00:00.000Z',
        },
        {
          _id: '675400000000000000000002',
          customerId: { displayName: 'Sneha Patel', phone: '+919855667788' },
          vendorId: { businessName: 'Swift Cargo Movers', contactPhone: '+919844556677' },
          requestId: {
            pickupAddress: { city: 'Bengaluru', street: 'Koramangala' },
            destinationAddress: { city: 'Bengaluru', street: 'HSR Layout' },
            preferredDate: '2026-03-14T10:00:00.000Z',
          },
          status: 'PACKING',
          scheduledDate: '2026-03-14T10:00:00.000Z',
          deliveryCode: '3180',
          createdAt: '2026-03-10T10:30:00.000Z',
        },
        {
          _id: '675400000000000000000005',
          customerId: { displayName: 'Deepak Joshi', phone: '+919877665544' },
          vendorId: { businessName: 'Kaveri Freight Logistics', contactPhone: '+919733224455' },
          requestId: {
            pickupAddress: { city: 'Bengaluru', street: 'JP Nagar' },
            destinationAddress: { city: 'Bengaluru', street: 'Hebbal' },
            preferredDate: '2026-03-05T11:00:00.000Z',
          },
          status: 'TERMINATED',
          cancellationReason: 'Vendor unannounced 4-hour delay; customer refused service',
          scheduledDate: '2026-03-05T11:00:00.000Z',
          deliveryCode: '4421',
          createdAt: '2026-03-04T09:00:00.000Z',
        },
      ],
      recentActivity: [
        {
          _id: '675600000000000000000001',
          action: 'UPDATE_SETTINGS',
          targetType: 'PlatformSetting',
          targetId: 'service_areas',
          reason: 'Updated designated service coverage areas',
          createdAt: '2026-03-10T14:20:00.000Z',
          actorId: { phone: '+919876543210', displayName: 'System Administrator', role: 'admin' },
        },
        {
          _id: '675600000000000000000003',
          action: 'SUSPEND_VENDOR',
          targetType: 'Vendor',
          targetId: '675100000000000000000005',
          reason: 'Vendor unannounced 4-hour delay without notice',
          createdAt: '2026-03-05T14:30:00.000Z',
          actorId: { phone: '+919876543210', displayName: 'System Administrator', role: 'admin' },
        },
      ],
    };
  }

  // Users
  if (endpoint.startsWith('/admin/users')) {
    if (method === 'POST') {
      const body = options.body ? JSON.parse(options.body as string) : {};
      return {
        user: {
          _id: '675000000000000000000099',
          phone: body.phone || '+919999999999',
          displayName: body.displayName || '',
          role: body.role || 'customer',
          accountStatus: body.accountStatus || 'active',
          language: body.language || 'en',
          createdAt: new Date().toISOString(),
        },
      };
    }
    return {
      users: [
        { _id: '675000000000000000000001', phone: '+919876543210', displayName: 'System Administrator', role: 'admin', accountStatus: 'active', language: 'en', createdAt: '2026-01-10T10:00:00.000Z' },
        { _id: '675000000000000000000002', phone: '+919876543211', displayName: 'Operations Dispatcher', role: 'admin', accountStatus: 'active', language: 'en', createdAt: '2026-01-15T12:00:00.000Z' },
        { _id: '675000000000000000000003', phone: '+919811223344', displayName: 'Rajesh Verma', role: 'vendor', accountStatus: 'active', language: 'en', createdAt: '2026-02-01T08:30:00.000Z' },
        { _id: '675000000000000000000004', phone: '+919822334455', displayName: 'Priya Sharma', role: 'customer', accountStatus: 'active', language: 'en', createdAt: '2026-02-10T14:15:00.000Z' },
        { _id: '675000000000000000000005', phone: '+919833445566', displayName: 'Amit Kumar', role: 'worker', accountStatus: 'active', language: 'en', createdAt: '2026-02-14T09:00:00.000Z' },
        { _id: '675000000000000000000006', phone: '+919844556677', displayName: 'Vikram Singh', role: 'vendor', accountStatus: 'active', language: 'en', createdAt: '2026-02-18T16:45:00.000Z' },
        { _id: '675000000000000000000007', phone: '+919855667788', displayName: 'Sneha Patel', role: 'customer', accountStatus: 'active', language: 'en', createdAt: '2026-02-22T11:20:00.000Z' },
        { _id: '675000000000000000000008', phone: '+919866778899', displayName: 'Ravi Teja', role: 'worker', accountStatus: 'suspended', language: 'en', createdAt: '2026-02-28T13:10:00.000Z' },
      ],
      pagination: { page: 1, limit: 10, total: 8, totalPages: 1 },
    };
  }

  // Vendors
  if (endpoint.startsWith('/admin/vendors')) {
    if (method === 'POST') {
      const body = options.body ? JSON.parse(options.body as string) : {};
      return {
        vendor: {
          _id: '675100000000000000000099',
          businessName: body.businessName || 'New Company',
          contactPhone: body.contactPhone || '+919999999999',
          contactEmail: body.contactEmail || '',
          status: body.status || 'APPROVED',
          serviceAreas: body.serviceAreas || ['Chennai Central'],
          servicesOffered: body.servicesOffered || ['transport'],
          createdAt: new Date().toISOString(),
        },
      };
    }
    const rawVendors = [
      {
        _id: '675100000000000000000001',
        businessName: 'Apex Relocations Pvt Ltd',
        contactPhone: '+919811223344',
        contactEmail: 'operations@apexmovers.in',
        status: 'APPROVED',
        serviceAreas: ['Chennai Central', 'Old Mahabalipuram Road (OMR)'],
        servicesOffered: ['packing', 'loading', 'transport', 'unloading'],
        verificationDetails: { reviewedAt: '2026-02-02T10:00:00.000Z', decisionReason: 'Verified GST' },
        createdAt: '2026-02-01T09:00:00.000Z',
      },
      {
        _id: '675100000000000000000002',
        businessName: 'Swift Cargo Movers',
        contactPhone: '+919844556677',
        contactEmail: 'swiftcargo@gmail.com',
        status: 'APPROVED',
        serviceAreas: ['Anna Nagar & Kilpauk', 'Velachery & Adyar'],
        servicesOffered: ['transport', 'loading', 'unloading'],
        verificationDetails: { reviewedAt: '2026-02-19T14:00:00.000Z' },
        createdAt: '2026-02-18T17:00:00.000Z',
      },
      {
        _id: '675100000000000000000003',
        businessName: 'Metro Shifting Services',
        contactPhone: '+919711002233',
        contactEmail: 'metroshift@outlook.com',
        status: 'PENDING_REVIEW',
        serviceAreas: ['Tambaram & Chromepet'],
        servicesOffered: ['packing', 'transport'],
        createdAt: '2026-03-01T09:15:00.000Z',
      },
      {
        _id: '675100000000000000000004',
        businessName: 'Prime City Express',
        contactPhone: '+919722113344',
        contactEmail: 'primecity@express.com',
        status: 'PENDING_REVIEW',
        serviceAreas: ['Porur & Poonamallee'],
        servicesOffered: ['transport', 'loading'],
        createdAt: '2026-03-04T15:20:00.000Z',
      },
      {
        _id: '675100000000000000000005',
        businessName: 'Kaveri Freight Logistics',
        contactPhone: '+919733224455',
        contactEmail: 'support@kaverilogistics.in',
        status: 'SUSPENDED',
        serviceAreas: ['Chennai Central'],
        servicesOffered: ['transport'],
        verificationDetails: { suspensionReason: 'Unannounced 4-hour delay without notice' },
        createdAt: '2026-01-10T12:00:00.000Z',
      },
    ];

    let filteredVendors = rawVendors;
    const match = endpoint.match(/status=([^&]+)/);
    if (match && match[1] && match[1] !== 'all') {
      filteredVendors = rawVendors.filter(v => v.status === match[1]);
    }

    return {
      vendors: filteredVendors,
      pagination: { page: 1, limit: 10, total: filteredVendors.length, totalPages: 1 },
    };
  }

  // Packages
  if (endpoint.startsWith('/admin/packages')) {
    return {
      packages: [
        {
          _id: '675200000000000000000001',
          name: 'Professional Packing',
          code: 'SERVICE_PACKING',
          description: 'Full house packing using sturdy corrugated boxes, bubble wrap, stretch film, and label tagging.',
          category: 'Packing',
          basePriceEstimate: 2500,
          inclusions: ['Carton boxes', 'Bubble wrap', 'Labeling', 'Fragile items care'],
          isActive: true,
          createdAt: '2026-01-15T10:00:00.000Z',
        },
        {
          _id: '675200000000000000000002',
          name: 'Loading & Handling',
          code: 'SERVICE_LOADING',
          description: 'Trained labor team safely loading furniture and boxes into transport vehicle with safety belts.',
          category: 'Labor',
          basePriceEstimate: 1500,
          inclusions: ['Ground & elevator handling', 'Protective blankets', 'Trained loaders'],
          isActive: true,
          createdAt: '2026-01-15T10:00:00.000Z',
        },
        {
          _id: '675200000000000000000003',
          name: 'Safe City Transport',
          code: 'SERVICE_TRANSPORT',
          description: 'Dedicated enclosed transport truck with verified driver and timely transit route.',
          category: 'Transport',
          basePriceEstimate: 3500,
          inclusions: ['Enclosed truck', 'Fuel & tolls', 'Transit securing'],
          isActive: true,
          createdAt: '2026-01-15T10:00:00.000Z',
        },
        {
          _id: '675200000000000000000004',
          name: 'Unloading & Placement',
          code: 'SERVICE_UNLOADING',
          description: 'Careful unloading from truck and room-wise box/furniture placement at the new home.',
          category: 'Labor',
          basePriceEstimate: 1500,
          inclusions: ['Room placement', 'Stair/elevator carry', 'Inspection verification'],
          isActive: true,
          createdAt: '2026-01-15T10:00:00.000Z',
        },
      ],
    };
  }

  // Categories
  if (endpoint.startsWith('/admin/categories')) {
    return {
      categories: [
        { _id: '675300000000000000000001', name: '1 RK / Studio Apartment', slug: '1-rk-studio', description: 'Single room or studio flat shifting with basic household items.', icon: 'Home', displayOrder: 1, isActive: true, createdAt: '2026-01-10T10:00:00.000Z' },
        { _id: '675300000000000000000002', name: '1 BHK Apartment', slug: '1-bhk', description: 'Standard 1 bedroom apartment shifting including cot, fridge, and basic appliances.', icon: 'Home', displayOrder: 2, isActive: true, createdAt: '2026-01-10T10:00:00.000Z' },
        { _id: '675300000000000000000003', name: '2 BHK House / Apartment', slug: '2-bhk', description: '2 bedroom home relocation with full furniture, appliances, and kitchen items.', icon: 'Home', displayOrder: 3, isActive: true, createdAt: '2026-01-10T10:00:00.000Z' },
        { _id: '675300000000000000000004', name: '3+ BHK / Independent Villa', slug: '3-bhk-villa', description: 'Large multi-room residential shifting requiring dedicated crew and larger truck.', icon: 'Home', displayOrder: 4, isActive: true, createdAt: '2026-01-10T10:00:00.000Z' },
        { _id: '675300000000000000000005', name: 'Office / Commercial Shift', slug: 'office-commercial', description: 'Desks, chairs, computer peripherals, and filing cabinet relocation.', icon: 'Briefcase', displayOrder: 5, isActive: true, createdAt: '2026-01-10T10:00:00.000Z' },
        { _id: '675300000000000000000006', name: 'Single Item / Few Items', slug: 'single-items', description: 'Individual heavy furniture, refrigerator, or small bulk move.', icon: 'Package', displayOrder: 6, isActive: true, createdAt: '2026-01-10T10:00:00.000Z' },
      ],
    };
  }

  // Bookings
  if (endpoint.startsWith('/admin/bookings')) {
    const rawBookings = [
      {
        _id: '675400000000000000000001',
        customerId: { displayName: 'Priya Sharma', phone: '+919822334455' },
        vendorId: { businessName: 'Apex Relocations Pvt Ltd', contactPhone: '+919811223344' },
        requestId: {
          pickupAddress: { city: 'Bengaluru', street: 'Whitefield' },
          destinationAddress: { city: 'Bengaluru', street: 'Bannerghatta Rd' },
          preferredDate: '2026-03-15T09:00:00.000Z',
        },
        status: 'IN_TRANSIT',
        scheduledDate: '2026-03-15T09:00:00.000Z',
        deliveryCode: '7492',
        createdAt: '2026-03-10T08:00:00.000Z',
      },
      {
        _id: '675400000000000000000002',
        customerId: { displayName: 'Sneha Patel', phone: '+919855667788' },
        vendorId: { businessName: 'Swift Cargo Movers', contactPhone: '+919844556677' },
        requestId: {
          pickupAddress: { city: 'Bengaluru', street: 'Koramangala' },
          destinationAddress: { city: 'Bengaluru', street: 'HSR Layout' },
          preferredDate: '2026-03-14T10:00:00.000Z',
        },
        status: 'PACKING',
        scheduledDate: '2026-03-14T10:00:00.000Z',
        deliveryCode: '3180',
        createdAt: '2026-03-10T10:30:00.000Z',
      },
      {
        _id: '675400000000000000000003',
        customerId: { displayName: 'TechVision Labs', phone: '+919819922883' },
        vendorId: { businessName: 'Apex Relocations Pvt Ltd', contactPhone: '+919811223344' },
        requestId: {
          pickupAddress: { city: 'Bengaluru', street: 'Domlur' },
          destinationAddress: { city: 'Bengaluru', street: 'Electronic City' },
          preferredDate: '2026-03-08T08:00:00.000Z',
        },
        status: 'COMPLETED',
        scheduledDate: '2026-03-08T08:00:00.000Z',
        deliveryCode: '5521',
        createdAt: '2026-03-01T11:00:00.000Z',
      },
      {
        _id: '675400000000000000000004',
        customerId: { displayName: 'Karthik Raman', phone: '+919833112299' },
        vendorId: { businessName: 'Swift Cargo Movers', contactPhone: '+919844556677' },
        requestId: {
          pickupAddress: { city: 'Bengaluru', street: 'Malleshwaram' },
          destinationAddress: { city: 'Bengaluru', street: 'Yemalur' },
          preferredDate: '2026-03-18T09:30:00.000Z',
        },
        status: 'CONFIRMED',
        scheduledDate: '2026-03-18T09:30:00.000Z',
        deliveryCode: '9014',
        createdAt: '2026-03-09T14:20:00.000Z',
      },
      {
        _id: '675400000000000000000005',
        customerId: { displayName: 'Deepak Joshi', phone: '+919877665544' },
        vendorId: { businessName: 'Kaveri Freight Logistics', contactPhone: '+919733224455' },
        requestId: {
          pickupAddress: { city: 'Bengaluru', street: 'JP Nagar' },
          destinationAddress: { city: 'Bengaluru', street: 'Hebbal' },
          preferredDate: '2026-03-05T11:00:00.000Z',
        },
        status: 'TERMINATED',
        cancellationReason: 'Vendor unannounced 4-hour delay; customer refused service',
        scheduledDate: '2026-03-05T11:00:00.000Z',
        deliveryCode: '4421',
        createdAt: '2026-03-04T09:00:00.000Z',
      },
    ];

    let filteredBookings = rawBookings;
    const match = endpoint.match(/status=([^&]+)/);
    if (match && match[1] && match[1] !== 'all') {
      filteredBookings = rawBookings.filter(b => b.status === match[1]);
    }

    return {
      bookings: filteredBookings,
      pagination: { page: 1, limit: 10, total: filteredBookings.length, totalPages: 1 },
    };
  }

  // Settings
  if (endpoint.startsWith('/admin/settings')) {
    return {
      serviceAreas: [
        { id: 'area-1', name: 'Chennai Central', code: 'CHN-CTR', city: 'Chennai', state: 'Tamil Nadu', active: true },
        { id: 'area-2', name: 'Old Mahabalipuram Road (OMR)', code: 'CHN-OMR', city: 'Chennai', state: 'Tamil Nadu', active: true },
        { id: 'area-3', name: 'Anna Nagar & Kilpauk', code: 'CHN-ANR', city: 'Chennai', state: 'Tamil Nadu', active: true },
        { id: 'area-4', name: 'Velachery & Adyar', code: 'CHN-VLC', city: 'Chennai', state: 'Tamil Nadu', active: true },
        { id: 'area-5', name: 'Tambaram & Chromepet', code: 'CHN-TBM', city: 'Chennai', state: 'Tamil Nadu', active: true },
        { id: 'area-6', name: 'Porur & Poonamallee', code: 'CHN-PRR', city: 'Chennai', state: 'Tamil Nadu', active: true },
      ],
      marketplaceConfig: {
        platformName: 'Package Mover',
        currency: 'INR',
        currencySymbol: '₹',
        supportEmail: 'support@packagemover.local',
        supportPhone: '+91 98765 00000',
        autoApproveQuotes: true,
        requireSurveyForCommercial: true,
      },
      policyConfig: {
        advancePercentageGuideline: '20% (Standard Moving Advance)',
        commissionGuideline: '12.5% Platform Margin',
        cancellationWindowHours: 24,
        disputeReportingWindowDays: 7,
        deliveryConfirmationMethod: '4-digit customer delivery code',
        prohibitedItemsNotice: 'Hazardous chemicals, combustibles, illegal substances, live animals, jewelry and unsealed cash are excluded.',
      },
    };
  }

  // Audit Logs
  if (endpoint.startsWith('/admin/audit-logs')) {
    return {
      logs: [
        {
          _id: '675600000000000000000001',
          action: 'UPDATE_SETTINGS',
          targetType: 'PlatformSetting',
          targetId: 'service_areas',
          reason: 'Updated designated service coverage areas',
          createdAt: '2026-03-10T14:20:00.000Z',
          actorId: { phone: '+919876543210', displayName: 'System Administrator', role: 'admin' },
        },
        {
          _id: '675600000000000000000002',
          action: 'VENDOR_APPROVED',
          targetType: 'Vendor',
          targetId: '675100000000000000000001',
          reason: 'GST registration and commercial vehicle permits verified',
          createdAt: '2026-02-02T10:00:00.000Z',
          actorId: { phone: '+919876543210', displayName: 'System Administrator', role: 'admin' },
        },
        {
          _id: '675600000000000000000003',
          action: 'SUSPEND_VENDOR',
          targetType: 'Vendor',
          targetId: '675100000000000000000005',
          reason: 'Vendor unannounced 4-hour delay without notice',
          createdAt: '2026-03-05T14:30:00.000Z',
          actorId: { phone: '+919876543210', displayName: 'System Administrator', role: 'admin' },
        },
        {
          _id: '675600000000000000000004',
          action: 'CREATE_USER',
          targetType: 'User',
          targetId: '675000000000000000000002',
          reason: 'Provisioned operations desk administrator',
          createdAt: '2026-01-15T12:00:00.000Z',
          actorId: { phone: '+919876543210', displayName: 'System Administrator', role: 'admin' },
        },
      ],
      pagination: { page: 1, limit: 20, total: 4, totalPages: 1 },
    };
  }

  // Roles & Permissions
  if (endpoint.startsWith('/admin/roles')) {
    return {
      roles: [
        {
          id: 'admin',
          name: 'Administrator',
          code: 'admin',
          description: 'Supervises marketplace, approves vendor applications, manages platform settings, users, and disputes.',
          userCount: 2,
          permissions: ['users:view', 'users:manage', 'vendors:view', 'vendors:approve', 'vendors:manage', 'bookings:view', 'bookings:manage', 'catalog:manage', 'settings:manage', 'audit:view'],
        },
        {
          id: 'vendor',
          name: 'Vendor Owner/Manager',
          code: 'vendor',
          description: 'Manages company profile, service areas, receives moving leads, submits itemized quotes, and assigns crew.',
          userCount: 2,
          permissions: ['leads:view', 'quotes:submit', 'crew:assign', 'bookings:vendor_view'],
        },
        {
          id: 'worker',
          name: 'Field Worker / Crew',
          code: 'worker',
          description: 'Executes moving jobs assigned by an active vendor membership, reports progress updates, and captures delivery confirmation.',
          userCount: 2,
          permissions: ['jobs:assigned_view', 'jobs:update_status', 'jobs:confirm_delivery'],
        },
        {
          id: 'customer',
          name: 'Customer',
          code: 'customer',
          description: 'Submits moving requests, reviews itemized quotes, books verified vendors, makes payments, and submits reviews.',
          userCount: 2,
          permissions: ['requests:create', 'quotes:view_own', 'bookings:create', 'bookings:view_own', 'reviews:create'],
        },
      ],
    };
  }

  if (endpoint.startsWith('/admin/permissions')) {
    const permissions = [
      { id: 'users:view', module: 'User Management', name: 'View Users', description: 'Can view customer, vendor, and worker accounts' },
      { id: 'users:manage', module: 'User Management', name: 'Manage Users', description: 'Can create users, suspend accounts, and edit roles' },
      { id: 'vendors:view', module: 'Vendor Management', name: 'View Vendors', description: 'Can inspect vendor directory and profiles' },
      { id: 'vendors:approve', module: 'Vendor Management', name: 'Approve / Reject Applications', description: 'Can review submitted applications and documents' },
      { id: 'vendors:manage', module: 'Vendor Management', name: 'Manage Vendor Status', description: 'Can suspend or reactivate vendor companies' },
      { id: 'bookings:view', module: 'Operations', name: 'View All Bookings', description: 'Can supervise platform-wide move schedules' },
      { id: 'bookings:manage', module: 'Operations', name: 'Manage Bookings & Disputes', description: 'Can resolve exceptions and review cancellations' },
      { id: 'catalog:manage', module: 'Catalog', name: 'Manage Packages & Categories', description: 'Can add, edit, or deactivate catalog services and move types' },
      { id: 'settings:manage', module: 'Settings', name: 'Manage Platform Settings', description: 'Can configure coverage service areas and policy parameters' },
      { id: 'audit:view', module: 'Audit & Compliance', name: 'View Audit Logs', description: 'Can inspect chronological trail of sensitive platform actions' },
    ];
    return {
      permissions,
      roleMapping: {
        admin: permissions.map(p => p.id),
        vendor: ['leads:view', 'quotes:submit', 'crew:assign', 'bookings:vendor_view'],
        worker: ['jobs:assigned_view', 'jobs:update_status', 'jobs:confirm_delivery'],
        customer: ['requests:create', 'quotes:view_own', 'bookings:create', 'bookings:view_own', 'reviews:create'],
      },
    };
  }

  return null;
}
