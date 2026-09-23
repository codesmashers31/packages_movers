"use client";

import { useState, useEffect, useMemo } from "react";
import { fetchApi } from "@/lib/api";
import PageHeader from "@/app/admin/components/PageHeader";
import StatusBadge from "@/app/admin/components/StatusBadge";
import { hasPermissionKey } from "@/lib/vendorPermissionsDef";
import {
  FileText,
  Search,
  RefreshCw,
  AlertCircle,
  Clock,
  ArrowRight,
  CheckCircle2,
  XCircle,
  TrendingUp,
  MapPin,
  Calendar,
  Layers,
  Plus,
  Trash2,
  ShieldAlert,
  Info,
  ChevronRight,
  Sparkles,
  HelpCircle,
  Eye,
  Check,
  Truck,
  Users,
  Calculator,
  ShieldCheck,
  Percent,
  Wrench,
  Boxes,
  Receipt,
  Phone,
  User as UserIcon,
  MessageSquare,
  Copy,
  Building2,
} from "lucide-react";

interface MovingRequest {
  _id: string;
  customerId?: {
    _id?: string;
    displayName?: string;
    phone?: string;
    email?: string;
  };
  pickupAddress: {
    street: string;
    city: string;
    postalCode: string;
    floor?: number;
    hasLift?: boolean;
    parkingDistanceMeters?: number;
  };
  destinationAddress: {
    street: string;
    city: string;
    postalCode: string;
    floor?: number;
    hasLift?: boolean;
    parkingDistanceMeters?: number;
  };
  preferredDate: string;
  preferredTimeSlot?: string;
  items?: Array<{ name: string; quantity: number; isFragile?: boolean; category?: string }>;
  requestedServices?: string[];
  status: string;
  hasQuoted?: boolean;
  quoteStatus?: string | null;
  createdAt: string;
  commonRejectionFeedback?: {
    reasons: string[];
    comment?: string;
    submittedAt: string;
  };
}

interface QuotationItem {
  _id: string;
  requestId: MovingRequest;
  totalAmountMinorUnits: number;
  currency: string;
  vehicleType?: string;
  vehicleSpecs?: string;
  crewCount?: number;
  crewRoles?: string;
  splitCharges?: {
    freightMinorUnits?: number;
    packingMaterialsMinorUnits?: number;
    loadingUnloadingMinorUnits?: number;
    dismantlingAssemblyMinorUnits?: number;
    insuranceMinorUnits?: number;
    taxGstMinorUnits?: number;
    otherMinorUnits?: number;
  };
  itemizedServices: Array<{ serviceName: string; amountMinorUnits: number }>;
  inclusions: string[];
  exclusions: string[];
  assumptions?: string[];
  validUntil: string;
  status: string;
  createdAt: string;
}

interface QuotePerformanceData {
  hasData: boolean;
  message?: string;
  metrics: {
    submitted: number;
    accepted: number;
    rejected: number;
    pending: number;
    acceptanceRate: number | null;
  };
  monthlyActivity: Array<{
    label: string;
    submitted: number;
    accepted: number;
    rejected: number;
  }>;
  hasFeedbackData?: boolean;
  commonRejectionReasons: Array<{ reason: string; count: number }>;
}

export default function VendorQuotationsPage() {
  const [activeTab, setActiveTab] = useState<"available" | "my_quotes" | "insights">("available");
  
  // Available Requests state
  const [availableRequests, setAvailableRequests] = useState<MovingRequest[]>([]);
  const [loadingAvailable, setLoadingAvailable] = useState(true);
  const [searchAvailable, setSearchAvailable] = useState("");
  const [unquotedOnly, setUnquotedOnly] = useState(false);

  // My Quotations state
  const [myQuotations, setMyQuotations] = useState<QuotationItem[]>([]);
  const [loadingQuotes, setLoadingQuotes] = useState(true);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [searchQuotes, setSearchQuotes] = useState("");

  // Insights state
  const [performanceData, setPerformanceData] = useState<QuotePerformanceData | null>(null);
  const [loadingInsights, setLoadingInsights] = useState(true);

  // Error / message banner
  const [feedbackBanner, setFeedbackBanner] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Modals state
  const [viewRequestModal, setViewRequestModal] = useState<MovingRequest | null>(null);
  const [quoteTargetRequest, setQuoteTargetRequest] = useState<MovingRequest | null>(null);
  const [viewQuoteModal, setViewQuoteModal] = useState<QuotationItem | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [quoteSourceMode, setQuoteSourceMode] = useState<"direct" | "request">("direct");
  const [selectedRequestId, setSelectedRequestId] = useState<string>("");
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const userStr = localStorage.getItem("auth_user");
      if (userStr) {
        try {
          setCurrentUser(JSON.parse(userStr));
        } catch {}
      }
    }
    fetchApi<{ user: any }>("/auth/me")
      .then((res) => {
        if (res?.user) setCurrentUser(res.user);
      })
      .catch(() => {});
  }, []);

  const isOwner = currentUser?.role === "vendor" || currentUser?.role === "admin";
  const userPerms = useMemo(() => {
    return Array.isArray(currentUser?.permissions) ? currentUser.permissions : [];
  }, [currentUser]);

  const canCreateQuote = isOwner || hasPermissionKey(userPerms, "quotations:create");
  const canEditQuote = isOwner || hasPermissionKey(userPerms, "quotations:edit");
  const canCancelQuote = isOwner || hasPermissionKey(userPerms, "quotations:cancel");

  // Direct Customer / Move details
  const [directCustomerName, setDirectCustomerName] = useState("");
  const [directCustomerPhone, setDirectCustomerPhone] = useState("");
  const [directPickupCity, setDirectPickupCity] = useState("Bangalore");
  const [directPickupStreet, setDirectPickupStreet] = useState("");
  const [directPickupPincode, setDirectPickupPincode] = useState("560001");
  const [directPickupFloor, setDirectPickupFloor] = useState<number>(1);
  const [directPickupHasLift, setDirectPickupHasLift] = useState<boolean>(true);

  const [directDestCity, setDirectDestCity] = useState("Chennai");
  const [directDestStreet, setDirectDestStreet] = useState("");
  const [directDestPincode, setDirectDestPincode] = useState("600001");
  const [directDestFloor, setDirectDestFloor] = useState<number>(1);
  const [directDestHasLift, setDirectDestHasLift] = useState<boolean>(true);

  const [directMoveDate, setDirectMoveDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 2);
    return d.toISOString().split("T")[0];
  });
  const [directTimeSlot, setDirectTimeSlot] = useState("Morning (8:00 AM - 12:00 PM)");
  const [directMoveSize, setDirectMoveSize] = useState("2 BHK");
  const [directCustomItemsText, setDirectCustomItemsText] = useState("Double Bed with Mattress, 3-Seater Sofa, Dining Table with 4 Chairs, Refrigerator, Washing Machine, 10 Packed Boxes");

  // Load available requests
  const loadAvailableRequests = async () => {
    setLoadingAvailable(true);
    try {
      let url = "/vendor/requests/available?";
      if (searchAvailable.trim()) url += `search=${encodeURIComponent(searchAvailable.trim())}&`;
      if (unquotedOnly) url += "unquotedOnly=true&";
      const res = await fetchApi<{ requests: MovingRequest[] }>(url);
      setAvailableRequests(res.requests || []);
    } catch (err: any) {
      console.error("Failed to load available requests:", err);
    } finally {
      setLoadingAvailable(false);
    }
  };

  // Load vendor quotes
  const loadMyQuotations = async () => {
    setLoadingQuotes(true);
    try {
      let url = "/vendor/quotations?";
      if (statusFilter !== "ALL") url += `status=${statusFilter}&`;
      if (searchQuotes.trim()) url += `search=${encodeURIComponent(searchQuotes.trim())}&`;
      const res = await fetchApi<{ quotations: QuotationItem[] }>(url);
      setMyQuotations(res.quotations || []);
    } catch (err: any) {
      console.error("Failed to load my quotations:", err);
    } finally {
      setLoadingQuotes(false);
    }
  };

  // Load Quote Performance Insights
  const loadInsights = async () => {
    setLoadingInsights(true);
    try {
      const res = await fetchApi<QuotePerformanceData>("/vendor/analytics/quote-performance");
      setPerformanceData(res);
    } catch (err: any) {
      console.error("Failed to load insights:", err);
    } finally {
      setLoadingInsights(false);
    }
  };

  useEffect(() => {
    loadAvailableRequests();
    loadMyQuotations();
    loadInsights();
  }, []);

  useEffect(() => {
    if (activeTab === "available") loadAvailableRequests();
    if (activeTab === "my_quotes") loadMyQuotations();
    if (activeTab === "insights") loadInsights();
  }, [activeTab, statusFilter, unquotedOnly]);

  // Vehicle & Operational Presets
  interface VehiclePreset {
    name: string;
    type: string;
    specs: string;
    crewCount: number;
    crewRoles: string;
    freight: number;
    packing: number;
    loading: number;
    dismantling: number;
    insurance: number;
    other: number;
  }

  const VEHICLE_PRESETS: VehiclePreset[] = [
    {
      name: "1-2 BHK (14ft Container)",
      type: "14ft Closed Container Truck",
      specs: "Weatherproof Covered Container, Hydraulic Tailgate, GPS Live Tracking, Transit Blankets & Heavy Straps",
      crewCount: 3,
      crewRoles: "1 Lead Driver & Supervisor, 2 Professional Packers & Loaders",
      freight: 6500,
      packing: 3500,
      loading: 3000,
      dismantling: 1500,
      insurance: 1000,
      other: 500,
    },
    {
      name: "2-3 BHK (17ft Multi-Axle)",
      type: "17ft Multi-Axle Container Truck",
      specs: "Heavy-Duty Weatherproof Container, Hydraulic Lift, Air-Suspension Transit, GPS Real-time Tracking",
      crewCount: 4,
      crewRoles: "1 Fleet Lead & Driver, 2 Senior Packers, 1 Furniture Dismantling Specialist",
      freight: 10000,
      packing: 5500,
      loading: 4500,
      dismantling: 2500,
      insurance: 1500,
      other: 1000,
    },
    {
      name: "3-4 BHK / Villa (22ft Heavy)",
      type: "22ft High-Cube Heavy Container Truck",
      specs: "Maximum Volume Enclosed Truck, Heavy Machinery Ramp, Multi-Point Tie-Downs, GPS Tracking",
      crewCount: 5,
      crewRoles: "1 Move Coordinator & Driver, 3 Heavy-Load Packers, 1 Technician for Appliances",
      freight: 16000,
      packing: 9000,
      loading: 7000,
      dismantling: 4000,
      insurance: 2500,
      other: 1500,
    },
    {
      name: "Studio / 1 RK (Tata Ace)",
      type: "Tata Ace 9ft Mini Truck",
      specs: "Compact City Transit Vehicle, Weather Tarpaulin Protection, Cargo Straps",
      crewCount: 2,
      crewRoles: "1 Driver & Loader, 1 Professional Packer",
      freight: 3500,
      packing: 2000,
      loading: 1800,
      dismantling: 800,
      insurance: 600,
      other: 300,
    },
    {
      name: "Automobile Carrier",
      type: "Dedicated Enclosed Vehicle Carrier",
      specs: "Hydraulic Double-Deck Car Carrier with Wheel Chocks, Heavy Lashing Straps, Transit Insurance",
      crewCount: 2,
      crewRoles: "1 Certified Vehicle Transport Driver, 1 Inspection & Lashing Specialist",
      freight: 12000,
      packing: 1500,
      loading: 1500,
      dismantling: 0,
      insurance: 2000,
      other: 1000,
    },
  ];

  // Full Estimation Form State: Vehicle & Crew
  const [selectedVehicleType, setSelectedVehicleType] = useState("14ft Closed Container Truck");
  const [vehicleSpecs, setVehicleSpecs] = useState("Weatherproof Covered Container, Hydraulic Tailgate, GPS Live Tracking, Transit Blankets & Heavy Straps");
  const [crewCount, setCrewCount] = useState<number>(3);
  const [crewRoles, setCrewRoles] = useState("1 Lead Driver & Supervisor, 2 Professional Packers & Loaders");

  // Full Estimation Form State: Split Charges (in ₹)
  const [splitFreight, setSplitFreight] = useState<string>("6500");
  const [splitPacking, setSplitPacking] = useState<string>("3500");
  const [splitLoading, setSplitLoading] = useState<string>("3000");
  const [splitDismantling, setSplitDismantling] = useState<string>("1500");
  const [splitInsurance, setSplitInsurance] = useState<string>("1000");
  const [splitOther, setSplitOther] = useState<string>("500");
  const [autoGst, setAutoGst] = useState<boolean>(true);
  const [manualGst, setManualGst] = useState<string>("");

  // Terms & Validity
  const [inclusionsText, setInclusionsText] = useState("All packing material & bubble wrap, Doorstep loading & unloading, Transit insurance up to ₹50,000");
  const [exclusionsText, setExclusionsText] = useState("Extended warehousing beyond 24h, Hazardous chemicals, Custom carpentry outside standard dismantling");
  const [assumptionsText, setAssumptionsText] = useState("Working elevator available at both ends, Vehicle parking available within 50m of entrance");
  const [validityHours, setValidityHours] = useState("48");
  const [submittingQuote, setSubmittingQuote] = useState(false);

  // Live Auto-Sum Calculations
  const numFreight = parseFloat(splitFreight) || 0;
  const numPacking = parseFloat(splitPacking) || 0;
  const numLoading = parseFloat(splitLoading) || 0;
  const numDismantling = parseFloat(splitDismantling) || 0;
  const numInsurance = parseFloat(splitInsurance) || 0;
  const numOther = parseFloat(splitOther) || 0;

  const subtotalRupees = numFreight + numPacking + numLoading + numDismantling + numInsurance + numOther;
  const calculatedGstRupees = autoGst ? Math.round(subtotalRupees * 0.18) : (parseFloat(manualGst) || 0);
  const grandTotalRupees = subtotalRupees + calculatedGstRupees;

  const applyVehiclePreset = (preset: VehiclePreset) => {
    setSelectedVehicleType(preset.type);
    setVehicleSpecs(preset.specs);
    setCrewCount(preset.crewCount);
    setCrewRoles(preset.crewRoles);
    setSplitFreight(preset.freight.toString());
    setSplitPacking(preset.packing.toString());
    setSplitLoading(preset.loading.toString());
    setSplitDismantling(preset.dismantling.toString());
    setSplitInsurance(preset.insurance.toString());
    setSplitOther(preset.other.toString());
  };

  const MOVE_SIZES = [
    { label: "1 RK / Studio", presetIdx: 3, items: "Single Bed, Small Wardrobe, Mini Fridge, Study Table, 4 Cartons" },
    { label: "1 BHK", presetIdx: 0, items: "Double Bed, 2-Door Wardrobe, Single Door Fridge, Washing Machine, TV Unit, 8 Cartons" },
    { label: "2 BHK", presetIdx: 0, items: "2 Double Beds, 2 Wardrobes, 3-Seater Sofa, Double Door Refrigerator, Washing Machine, Dining Set, 12 Cartons" },
    { label: "3 BHK", presetIdx: 1, items: "3 Double Beds, 3 Wardrobes, L-Shape Sofa Set, 4-Door Refrigerator, Front-Load Washing Machine, 6-Seater Dining, 20 Cartons" },
    { label: "4+ BHK / Villa", presetIdx: 2, items: "Complete Villa Inventory, Luxury Furniture, Heavy Appliances, Artwork, 30+ Cartons" },
    { label: "Commercial / Office", presetIdx: 2, items: "Office Workstations, Ergonomic Chairs, Filing Cabinets, Server Rack, Conference Table" },
    { label: "Vehicle Transit", presetIdx: 4, items: "Dedicated Vehicle Transit (Car / Bike / SUV)" },
  ];

  const handleSelectMoveSize = (size: typeof MOVE_SIZES[0]) => {
    setDirectMoveSize(size.label);
    setDirectCustomItemsText(size.items);
    applyVehiclePreset(VEHICLE_PRESETS[size.presetIdx]);
  };

  const handleOpenCreateQuoteModal = (req?: MovingRequest) => {
    if (!canCreateQuote) {
      setFeedbackBanner({
        type: "error",
        text: "You do not have authorization to create or submit price quotations.",
      });
      return;
    }

    if (req) {
      setQuoteSourceMode("request");
      setQuoteTargetRequest(req);
      setSelectedRequestId(req._id);

      const itemCount = req.items?.reduce((acc, item) => acc + (item.quantity || 1), 0) || 0;
      let initialPreset = VEHICLE_PRESETS[0];
      if (itemCount > 25) {
        initialPreset = VEHICLE_PRESETS[2];
      } else if (itemCount > 10) {
        initialPreset = VEHICLE_PRESETS[1];
      } else if (itemCount <= 4 && itemCount > 0) {
        initialPreset = VEHICLE_PRESETS[3];
      }
      applyVehiclePreset(initialPreset);
    } else {
      setQuoteSourceMode("direct");
      setQuoteTargetRequest(null);
      setSelectedRequestId("");
      applyVehiclePreset(VEHICLE_PRESETS[0]);
    }
    setInclusionsText("All packing material & bubble wrap, Doorstep loading & unloading, Goods transit insurance coverage");
    setExclusionsText("Extended warehousing beyond 24h, Hazardous chemicals, Custom electrical works");
    setAssumptionsText("Functional lift available at pickup & delivery, Standard parking access within 50 meters");
    setValidityHours("48");
    setIsCreateModalOpen(true);
  };

  const handleOpenSubmitModal = (req: MovingRequest) => {
    handleOpenCreateQuoteModal(req);
  };

  const handleSubmitQuote = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!canCreateQuote) {
      setFeedbackBanner({
        type: "error",
        text: "You do not have authorization to submit price quotations.",
      });
      return;
    }

    if (grandTotalRupees <= 0) {
      setFeedbackBanner({ type: "error", text: "Please enter valid split charges. Total quotation amount must be greater than ₹0." });
      return;
    }

    setSubmittingQuote(true);
    setFeedbackBanner(null);

    try {
      const validHoursNum = parseInt(validityHours, 10) || 48;
      const validUntilDate = new Date(Date.now() + validHoursNum * 60 * 60 * 1000).toISOString();

      const itemizedPayload = [
        { serviceName: `Base Freight & Transit (${selectedVehicleType})`, amountMinorUnits: Math.round(numFreight * 100) },
        { serviceName: "Professional Packing Materials & Wrapping", amountMinorUnits: Math.round(numPacking * 100) },
        { serviceName: `Loading & Doorstep Unloading (${crewCount} Crew Personnel)`, amountMinorUnits: Math.round(numLoading * 100) },
        { serviceName: "Furniture Dismantling & Reassembly Services", amountMinorUnits: Math.round(numDismantling * 100) },
        { serviceName: "Goods Transit Protection & Insurance", amountMinorUnits: Math.round(numInsurance * 100) },
        { serviceName: "Toll, Society Entry & Incidental Handling", amountMinorUnits: Math.round(numOther * 100) },
        { serviceName: "Applicable Taxes & GST (18%)", amountMinorUnits: Math.round(calculatedGstRupees * 100) },
      ].filter((item) => item.amountMinorUnits > 0);

      const inclusionsArray = inclusionsText
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      const exclusionsArray = exclusionsText
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      const assumptionsArray = assumptionsText
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      const basePayload: any = {
        totalAmount: grandTotalRupees,
        vehicleType: selectedVehicleType,
        vehicleSpecs: vehicleSpecs,
        crewCount: crewCount,
        crewRoles: crewRoles,
        splitCharges: {
          freight: numFreight,
          packingMaterials: numPacking,
          loadingUnloading: numLoading,
          dismantlingAssembly: numDismantling,
          insurance: numInsurance,
          taxGst: calculatedGstRupees,
          other: numOther,
        },
        itemizedServices: itemizedPayload,
        inclusions: inclusionsArray,
        exclusions: exclusionsArray,
        assumptions: assumptionsArray,
        validUntil: validUntilDate,
      };

      let successRouteText = "";

      if (quoteSourceMode === "request") {
        const reqToUse = quoteTargetRequest || availableRequests.find((r) => r._id === selectedRequestId);
        if (!reqToUse) {
          setFeedbackBanner({ type: "error", text: "Please select an available customer moving request." });
          setSubmittingQuote(false);
          return;
        }
        basePayload.requestId = reqToUse._id;
        successRouteText = `${reqToUse.pickupAddress.city} → ${reqToUse.destinationAddress.city}`;
      } else {
        // Direct Quote
        if (!directCustomerPhone.trim()) {
          setFeedbackBanner({ type: "error", text: "Customer phone number is required to create a direct quotation." });
          setSubmittingQuote(false);
          return;
        }
        if (!directPickupCity.trim() || !directDestCity.trim()) {
          setFeedbackBanner({ type: "error", text: "Pickup and destination cities are required." });
          setSubmittingQuote(false);
          return;
        }

        const parsedItems = directCustomItemsText
          .split(",")
          .map((itemStr) => {
            const clean = itemStr.trim();
            return clean ? { name: clean, quantity: 1 } : null;
          })
          .filter(Boolean);

        basePayload.customerName = directCustomerName.trim() || "Valued Client";
        basePayload.customerPhone = directCustomerPhone.trim();
        basePayload.pickupAddress = {
          street: directPickupStreet.trim() || "Pickup Location",
          city: directPickupCity.trim(),
          postalCode: directPickupPincode.trim() || "560001",
          floor: directPickupFloor,
          hasLift: directPickupHasLift,
        };
        basePayload.destinationAddress = {
          street: directDestStreet.trim() || "Destination Location",
          city: directDestCity.trim(),
          postalCode: directDestPincode.trim() || "600001",
          floor: directDestFloor,
          hasLift: directDestHasLift,
        };
        basePayload.preferredDate = directMoveDate;
        basePayload.preferredTimeSlot = directTimeSlot;
        basePayload.category = directMoveSize;
        basePayload.items = parsedItems.length > 0 ? parsedItems : [{ name: directMoveSize + " Inventory", quantity: 1 }];

        successRouteText = `${directPickupCity} → ${directDestCity}`;
      }

      await fetchApi("/vendor/quotations", {
        method: "POST",
        body: JSON.stringify(basePayload),
      });

      setFeedbackBanner({
        type: "success",
        text: `Quotation of ₹${grandTotalRupees.toLocaleString("en-IN")} created successfully for ${successRouteText}! Allocated: ${selectedVehicleType} with ${crewCount} crew members.`,
      });

      setIsCreateModalOpen(false);
      setQuoteTargetRequest(null);
      setSelectedRequestId("");
      setActiveTab("my_quotes");
      loadAvailableRequests();
      loadMyQuotations();
      loadInsights();
    } catch (err: any) {
      setFeedbackBanner({
        type: "error",
        text: err?.message || "Failed to create quotation. Please check your inputs.",
      });
    } finally {
      setSubmittingQuote(false);
    }
  };

  const formatPaiseToRupees = (paise?: number) => {
    if (!paise) return "₹0";
    return `₹${(paise / 100).toLocaleString("en-IN")}`;
  };

  const getEffectiveEstimation = (q: QuotationItem) => {
    const totalRupees = Math.round(q.totalAmountMinorUnits / 100);

    const vehicleType = q.vehicleType || (
      totalRupees >= 24000
        ? "22ft High-Cube Heavy Container Truck"
        : totalRupees >= 18000
        ? "17ft Multi-Axle Container Truck"
        : totalRupees <= 9000
        ? "Tata Ace 9ft Mini Truck"
        : "14ft Closed Container Truck"
    );

    const vehicleSpecs = q.vehicleSpecs || (
      totalRupees >= 24000
        ? "Maximum Volume Enclosed Truck, Heavy Machinery Ramp, Multi-Point Tie-Downs, GPS Live Tracking"
        : totalRupees >= 18000
        ? "Heavy-Duty Weatherproof Container, Hydraulic Lift, Air-Suspension Transit, GPS Real-time Tracking"
        : totalRupees <= 9000
        ? "Compact City Transit Vehicle, All-Weather Tarpaulin Protection, Heavy Cargo Straps"
        : "Weatherproof Closed Container, Hydraulic Tailgate Ramp, GPS Tracking, Transit Cargo Blankets"
    );

    const crewCount = q.crewCount || (
      totalRupees >= 24000 ? 5 : totalRupees >= 18000 ? 4 : totalRupees <= 9000 ? 2 : 3
    );

    const crewRoles = q.crewRoles || (
      totalRupees >= 24000
        ? "1 Move Coordinator & Driver, 3 Heavy-Load Packers, 1 Technician for Appliances"
        : totalRupees >= 18000
        ? "1 Fleet Lead & Driver, 2 Senior Packers, 1 Furniture Dismantling Specialist"
        : totalRupees <= 9000
        ? "1 Driver & Supervisor, 1 Professional Packer/Loader"
        : "1 Lead Driver & Supervisor, 2 Professional Packers & Loaders"
    );

    let split = q.splitCharges;
    const hasValidSplit = split && split.freightMinorUnits && split.freightMinorUnits > 0;
    if (!hasValidSplit) {
      const freight = Math.round((totalRupees * 0.38) / 100) * 100;
      const packing = Math.round((totalRupees * 0.20) / 100) * 100;
      const loading = Math.round((totalRupees * 0.16) / 100) * 100;
      const dismantling = Math.round((totalRupees * 0.09) / 100) * 100;
      const insurance = Math.round((totalRupees * 0.05) / 100) * 100;
      const other = Math.round((totalRupees * 0.03) / 100) * 100;
      const sub = freight + packing + loading + dismantling + insurance + other;
      const taxGst = Math.max(0, totalRupees - sub);

      split = {
        freightMinorUnits: freight * 100,
        packingMaterialsMinorUnits: packing * 100,
        loadingUnloadingMinorUnits: loading * 100,
        dismantlingAssemblyMinorUnits: dismantling * 100,
        insuranceMinorUnits: insurance * 100,
        taxGstMinorUnits: taxGst * 100,
        otherMinorUnits: other * 100,
      };
    }

    return { vehicleType, vehicleSpecs, crewCount, crewRoles, splitCharges: split };
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Quotation Operations"
        description="Review available customer moving leads, create custom and marketplace quotations, and track conversion rates."
      >
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => {
              loadAvailableRequests();
              loadMyQuotations();
              loadInsights();
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200/80 rounded-xl shadow-2xs transition cursor-pointer"
          >
            <RefreshCw size={13} className={loadingAvailable || loadingQuotes ? "animate-spin text-blue-600" : ""} />
            <span>Sync Activity</span>
          </button>
          {canCreateQuote && (
            <button
              onClick={() => handleOpenCreateQuoteModal()}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition cursor-pointer"
            >
              <Plus size={14} />
              <span>Create Quotation</span>
            </button>
          )}
        </div>
      </PageHeader>

      {/* Alert Banner */}
      {feedbackBanner && (
        <div
          className={`p-4 rounded-2xl flex items-center justify-between border shadow-2xs transition-all ${
            feedbackBanner.type === "success"
              ? "bg-emerald-50/90 border-emerald-200 text-emerald-800"
              : "bg-rose-50/90 border-rose-200 text-rose-800"
          }`}
        >
          <div className="flex items-center gap-2.5">
            {feedbackBanner.type === "success" ? (
              <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle size={16} className="text-rose-600 shrink-0" />
            )}
            <span className="text-xs font-medium">{feedbackBanner.text}</span>
          </div>
          <button
            onClick={() => setFeedbackBanner(null)}
            className="text-xs opacity-60 hover:opacity-100 font-bold ml-4 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex items-center gap-1 p-1 rounded-2xl bg-slate-100 border border-slate-200/80 max-w-xl">
        <button
          onClick={() => setActiveTab("available")}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs transition-all cursor-pointer ${
            activeTab === "available"
              ? "bg-white text-blue-600 font-bold shadow-xs border border-slate-200/60"
              : "text-slate-600 hover:text-slate-900 font-medium"
          }`}
        >
          <FileText size={14} />
          <span>Available Requests</span>
          <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-blue-50 text-blue-700 font-bold ml-0.5 border border-blue-100">
            {availableRequests.filter((r) => !r.hasQuoted).length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("my_quotes")}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs transition-all cursor-pointer ${
            activeTab === "my_quotes"
              ? "bg-white text-blue-600 font-bold shadow-xs border border-slate-200/60"
              : "text-slate-600 hover:text-slate-900 font-medium"
          }`}
        >
          <Layers size={14} />
          <span>My Quotations</span>
          <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-sky-50 text-sky-700 font-bold ml-0.5 border border-sky-100">
            {myQuotations.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("insights")}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs transition-all cursor-pointer ${
            activeTab === "insights"
              ? "bg-white text-blue-600 font-bold shadow-xs border border-slate-200/60"
              : "text-slate-600 hover:text-slate-900 font-medium"
          }`}
        >
          <TrendingUp size={14} />
          <span>Conversion & Insights</span>
        </button>
      </div>

      {/* TAB 1: AVAILABLE REQUESTS */}
      {activeTab === "available" && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
              <input
                type="text"
                placeholder="Search pickup, destination, or street..."
                value={searchAvailable}
                onChange={(e) => setSearchAvailable(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && loadAvailableRequests()}
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition"
              />
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
              <label className="flex items-center gap-2 text-xs font-medium text-slate-600 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={unquotedOnly}
                  onChange={(e) => setUnquotedOnly(e.target.checked)}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500/20"
                />
                <span>Hide already quoted requests</span>
              </label>

              <button
                onClick={loadAvailableRequests}
                className="px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 shadow-xs transition cursor-pointer"
              >
                Search
              </button>
            </div>
          </div>

          {/* List of Available Requests */}
          {loadingAvailable ? (
            <div className="p-12 text-center text-xs font-medium text-slate-500 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
              <RefreshCw className="animate-spin mx-auto mb-2 text-blue-600" size={18} />
              Discovering available customer move leads...
            </div>
          ) : availableRequests.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-white border border-slate-200/80 shadow-xs">
              <div className="h-12 w-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-3">
                <FileText size={22} />
              </div>
              <h3 className="text-sm font-bold text-slate-900 mb-1">No matching moving requests are available</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Customer requests will appear here as soon as moves are requested within your operating territory.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {availableRequests.map((req) => (
                <div
                  key={req._id}
                  className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:border-blue-200 hover:shadow-sm transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-2 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200/70">
                        REQ #{req._id.slice(-6).toUpperCase()}
                      </span>
                      <span className="text-[11px] font-medium text-slate-500 flex items-center gap-1">
                        <Calendar size={12} className="text-blue-600" />
                        Move Date: {new Date(req.preferredDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                      </span>
                      {req.preferredTimeSlot && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200/60">
                          {req.preferredTimeSlot}
                        </span>
                      )}
                      {req.hasQuoted ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/80 flex items-center gap-1">
                          <Check size={11} /> Quote Submitted ({req.quoteStatus})
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200/80">
                          Ready for Quotation
                        </span>
                      )}
                    </div>

                    {/* Route */}
                    <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
                      <span>{req.pickupAddress.city}</span>
                      <ArrowRight size={14} className="text-blue-600" />
                      <span>{req.destinationAddress.city}</span>
                    </div>

                    <div className="text-xs text-slate-500 flex flex-wrap items-center gap-x-4 gap-y-1">
                      <span>Pickup: {req.pickupAddress.street}</span>
                      <span>•</span>
                      <span>Delivery: {req.destinationAddress.street}</span>
                      <span>•</span>
                      <span>Inventory: {req.items?.length || 0} items listed</span>
                    </div>

                    {/* Service badges */}
                    {req.requestedServices && req.requestedServices.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        {req.requestedServices.map((svc, i) => (
                          <span
                            key={i}
                            className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-50 text-slate-700 border border-slate-200/70"
                          >
                            {svc}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2.5 shrink-0">
                    <button
                      onClick={() => setViewRequestModal(req)}
                      className="px-3.5 py-2 rounded-xl bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 border border-slate-200/80 shadow-2xs transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <Eye size={13} className="text-slate-500" />
                      <span>View Request</span>
                    </button>

                    {req.hasQuoted ? (
                      <button
                        onClick={() => setActiveTab("my_quotes")}
                        className="px-4 py-2 rounded-xl bg-emerald-50 text-emerald-700 text-xs font-semibold border border-emerald-200 flex items-center gap-1 cursor-pointer"
                      >
                        <CheckCircle2 size={13} />
                        <span>Quoted</span>
                      </button>
                    ) : canCreateQuote ? (
                      <button
                        onClick={() => handleOpenSubmitModal(req)}
                        className="px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-semibold shadow-xs hover:bg-blue-700 transition flex items-center gap-1.5 cursor-pointer"
                      >
                        <Plus size={13} />
                        <span>Submit Quote</span>
                      </button>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: MY QUOTATIONS */}
      {activeTab === "my_quotes" && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
              <input
                type="text"
                placeholder="Search by city or reference..."
                value={searchQuotes}
                onChange={(e) => setSearchQuotes(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && loadMyQuotations()}
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition"
              />
            </div>

            {/* Status Pills & Action Button */}
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto pb-1 sm:pb-0 justify-between sm:justify-end">
              <div className="flex items-center gap-1.5 overflow-x-auto">
                {[
                  { label: "All", val: "ALL" },
                  { label: "Pending", val: "SUBMITTED" },
                  { label: "Accepted", val: "ACCEPTED" },
                  { label: "Not Selected / Rejected", val: "REJECTED" },
                ].map((pill) => (
                  <button
                    key={pill.val}
                    onClick={() => setStatusFilter(pill.val)}
                    className={`px-3 py-1.5 rounded-xl text-xs transition-all whitespace-nowrap cursor-pointer ${
                      statusFilter === pill.val
                        ? "bg-blue-600 text-white font-semibold shadow-xs"
                        : "bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200/70 font-medium"
                    }`}
                  >
                    {pill.label}
                  </button>
                ))}
              </div>

              {canCreateQuote && (
                <button
                  onClick={() => handleOpenCreateQuoteModal()}
                  className="px-3.5 py-1.5 rounded-xl bg-blue-600 text-white text-xs font-semibold shadow-xs hover:bg-blue-700 transition flex items-center gap-1.5 shrink-0 ml-1 cursor-pointer"
                >
                  <Plus size={13} />
                  <span>New Quote</span>
                </button>
              )}
            </div>
          </div>

          {/* Quotations List */}
          {loadingQuotes ? (
            <div className="p-12 text-center text-xs font-medium text-slate-500 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
              <RefreshCw className="animate-spin mx-auto mb-2 text-blue-600" size={18} />
              Loading submitted quotations...
            </div>
          ) : myQuotations.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-white border border-slate-200/80 shadow-xs">
              <div className="h-12 w-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-3">
                <FileText size={22} />
              </div>
              <h3 className="text-sm font-bold text-slate-900 mb-1">No quotations submitted yet</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mb-4">
                Create direct customer quotations or explore open marketplace requests to dispatch proposals.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3">
                {canCreateQuote && (
                  <button
                    onClick={() => handleOpenCreateQuoteModal()}
                    className="px-5 py-2.5 rounded-xl bg-blue-600 text-white text-xs font-semibold shadow-xs hover:bg-blue-700 transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus size={14} />
                    <span>Create Quotation</span>
                  </button>
                )}
                <button
                  onClick={() => setActiveTab("available")}
                  className="px-4 py-2.5 rounded-xl bg-white text-slate-700 text-xs font-semibold hover:bg-slate-50 border border-slate-200/80 shadow-2xs transition cursor-pointer"
                >
                  Browse Available Requests
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {myQuotations.map((q) => {
                const isRejected = q.status === "NOT_SELECTED" || q.status === "REJECTED";
                const isAccepted = q.status === "ACCEPTED";
                const hasCustomerFeedback =
                  isRejected && q.requestId?.commonRejectionFeedback?.reasons?.length;

                return (
                  <div
                    key={q._id}
                    className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:border-blue-200 hover:shadow-sm transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="space-y-2 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200/70">
                          QUOTE #{q._id.slice(-6).toUpperCase()}
                        </span>
                        <span className="text-[11px] font-medium text-slate-500">
                          Submitted: {new Date(q.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                        </span>
                        
                        {/* Status Badge */}
                        {isAccepted && (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200/80 flex items-center gap-1">
                            <CheckCircle2 size={11} /> ACCEPTED BY CUSTOMER
                          </span>
                        )}
                        {q.status === "SUBMITTED" && (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200/80 flex items-center gap-1">
                            <Clock size={11} /> PENDING REVIEW
                          </span>
                        )}
                        {isRejected && (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-800 border border-rose-200/80 flex items-center gap-1">
                            <XCircle size={11} /> NOT SELECTED / REJECTED
                          </span>
                        )}
                      </div>

                      {/* Customer info pill if available */}
                      {q.requestId?.customerId?.displayName && (
                        <div className="flex flex-wrap items-center gap-2 pt-0.5">
                          <span className="px-2.5 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-100 flex items-center gap-1 text-[11px] font-semibold">
                            <UserIcon size={12} />
                            Client: {q.requestId.customerId.displayName}
                          </span>
                          {q.requestId.customerId.phone && (
                            <span className="text-[11px] text-slate-500 flex items-center gap-1 font-mono">
                              <Phone size={11} className="text-blue-600" />
                              {q.requestId.customerId.phone}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Route */}
                      <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
                        <span>{q.requestId?.pickupAddress?.city || "Origin"}</span>
                        <ArrowRight size={14} className="text-blue-600" />
                        <span>{q.requestId?.destinationAddress?.city || "Destination"}</span>
                        <span className="text-base font-bold text-blue-600 ml-3">
                          {formatPaiseToRupees(q.totalAmountMinorUnits)}
                        </span>
                      </div>

                      <div className="text-xs text-slate-500">
                        Move Date: {q.requestId?.preferredDate ? new Date(q.requestId.preferredDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "N/A"}
                        {" • "}
                        Quote Valid Until: {new Date(q.validUntil).toLocaleDateString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </div>

                      {/* Operational Estimation Tags */}
                      {(() => {
                        const est = getEffectiveEstimation(q);
                        return (
                          <div className="flex flex-wrap items-center gap-2 pt-1">
                            <span className="px-2.5 py-1 rounded-xl text-[11px] font-medium bg-slate-50 text-slate-800 border border-slate-200/70 flex items-center gap-1.5">
                              <Truck size={12} className="text-blue-600" />
                              {est.vehicleType}
                            </span>
                            <span className="px-2.5 py-1 rounded-xl text-[11px] font-medium bg-slate-50 text-slate-800 border border-slate-200/70 flex items-center gap-1.5">
                              <Users size={12} className="text-blue-600" />
                              {est.crewCount} Dedicated Crew
                            </span>
                            <span className="px-2.5 py-1 rounded-xl text-[11px] font-medium bg-emerald-50 text-emerald-800 border border-emerald-200/80 flex items-center gap-1">
                              <Calculator size={12} className="text-emerald-600" />
                              Itemized Split Ready
                            </span>
                          </div>
                        );
                      })()}

                      {/* Common Feedback highlight pill if rejected */}
                      {hasCustomerFeedback && (
                        <div className="p-2.5 rounded-xl bg-amber-50/90 border border-amber-200/80 text-xs text-amber-900 flex items-center gap-2">
                          <HelpCircle size={14} className="text-amber-600 shrink-0" />
                          <span>
                            <strong>Customer Feedback Available:</strong>{" "}
                            {q.requestId.commonRejectionFeedback?.reasons.join(", ")}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* View Details button */}
                    <div className="shrink-0">
                      <button
                        onClick={() => setViewQuoteModal(q)}
                        className="px-4 py-2 rounded-xl bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 border border-slate-200/80 shadow-2xs transition flex items-center gap-1.5 cursor-pointer"
                      >
                        <Eye size={13} className="text-blue-600" />
                        <span>Full Estimation Sheet</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: QUOTE PERFORMANCE & CONVERSION INSIGHTS */}
      {activeTab === "insights" && (
        <div className="space-y-6">
          {loadingInsights ? (
            <div className="p-12 text-center text-xs font-medium text-slate-500 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
              <RefreshCw className="animate-spin mx-auto mb-2 text-blue-600" size={18} />
              Aggregating quotation conversion telemetry...
            </div>
          ) : !performanceData || !performanceData.hasData ? (
            <div className="p-12 text-center rounded-2xl bg-white border border-slate-200/80 shadow-xs">
              <div className="h-12 w-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-3">
                <TrendingUp size={22} />
              </div>
              <h3 className="text-sm font-bold text-slate-900 mb-1">No quotation history available yet</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Conversion metrics and customer feedback telemetry will compute automatically as your quotes are evaluated by customers.
              </p>
            </div>
          ) : (
            <>
              {/* Summary Metric Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                    Submitted
                  </span>
                  <span className="text-2xl font-bold text-slate-900">{performanceData.metrics.submitted}</span>
                  <span className="text-[11px] text-slate-400 block mt-1">Total leads quoted</span>
                </div>

                <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                    Accepted
                  </span>
                  <span className="text-2xl font-bold text-emerald-600">{performanceData.metrics.accepted}</span>
                  <span className="text-[11px] text-emerald-600/80 block mt-1">Booked orders</span>
                </div>

                <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                    Rejected
                  </span>
                  <span className="text-2xl font-bold text-rose-600">{performanceData.metrics.rejected}</span>
                  <span className="text-[11px] text-rose-600/80 block mt-1">Not selected</span>
                </div>

                <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                    Pending
                  </span>
                  <span className="text-2xl font-bold text-amber-600">{performanceData.metrics.pending}</span>
                  <span className="text-[11px] text-amber-600/80 block mt-1">Under evaluation</span>
                </div>

                <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs col-span-2 sm:col-span-1">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                    Acceptance Rate
                  </span>
                  <span className="text-2xl font-bold text-blue-600">
                    {performanceData.metrics.acceptanceRate !== null
                      ? `${performanceData.metrics.acceptanceRate}%`
                      : "N/A"}
                  </span>
                  <span className="text-[11px] text-blue-600/80 block mt-1">Real conversion rate</span>
                </div>
              </div>

              {/* Monthly Activity Trend Chart */}
              <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Monthly Quotation Activity</h3>
                    <p className="text-xs text-slate-500">Real monthly distribution of submitted, accepted, and rejected bids</p>
                  </div>
                  <div className="flex items-center gap-3 text-xs font-semibold">
                    <span className="flex items-center gap-1.5 text-blue-600">
                      <span className="h-2.5 w-2.5 rounded-full bg-blue-600" /> Submitted
                    </span>
                    <span className="flex items-center gap-1.5 text-emerald-600">
                      <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> Accepted
                    </span>
                    <span className="flex items-center gap-1.5 text-rose-600">
                      <span className="h-2.5 w-2.5 rounded-full bg-rose-500" /> Rejected
                    </span>
                  </div>
                </div>

                {performanceData.monthlyActivity.length === 0 ? (
                  <p className="text-xs text-slate-500 py-6 text-center">No monthly trend activity recorded yet.</p>
                ) : (
                  <div className="space-y-3 pt-2">
                    {performanceData.monthlyActivity.map((m, idx) => {
                      const maxVal = Math.max(
                        ...performanceData.monthlyActivity.map((item) =>
                          Math.max(item.submitted, item.accepted, item.rejected, 1)
                        )
                      );
                      return (
                        <div key={idx} className="space-y-1">
                          <div className="flex justify-between text-xs font-semibold text-slate-900">
                            <span>{m.label}</span>
                            <span className="text-slate-500 font-normal">
                              {m.submitted} submitted • {m.accepted} accepted • {m.rejected} rejected
                            </span>
                          </div>
                          <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden flex gap-0.5">
                            <div
                              style={{ width: `${(m.accepted / maxVal) * 100}%` }}
                              className="bg-emerald-500 transition-all duration-500"
                              title={`Accepted: ${m.accepted}`}
                            />
                            <div
                              style={{ width: `${(m.rejected / maxVal) * 100}%` }}
                              className="bg-rose-500 transition-all duration-500"
                              title={`Rejected: ${m.rejected}`}
                            />
                            <div
                              style={{
                                width: `${
                                  (Math.max(0, m.submitted - m.accepted - m.rejected) / maxVal) * 100
                                }%`,
                              }}
                              className="bg-blue-600 transition-all duration-500"
                              title={`Pending: ${m.submitted - m.accepted - m.rejected}`}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Common Customer Rejection Feedback Breakdown */}
              <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Common Customer Rejection Reasons</h3>
                    <p className="text-xs text-slate-500">
                      Aggregated reasons customers cited when choosing not to select your quote
                    </p>
                  </div>
                  <span className="text-xs text-slate-400 italic">Competitor bids strictly confidential</span>
                </div>

                {!performanceData.hasFeedbackData || performanceData.commonRejectionReasons.length === 0 ? (
                  <div className="p-8 text-center rounded-xl bg-slate-50 border border-slate-200/70 text-xs text-slate-500">
                    Not enough customer rejection feedback recorded yet.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {performanceData.commonRejectionReasons.map((item, i) => {
                      const totalCitations = performanceData.commonRejectionReasons.reduce(
                        (acc, curr) => acc + curr.count,
                        0
                      );
                      const pct = totalCitations > 0 ? Math.round((item.count / totalCitations) * 100) : 0;

                      return (
                        <div key={i} className="p-4 rounded-xl bg-slate-50 border border-slate-200/70 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-slate-900">{item.reason}</span>
                            <span className="text-xs font-bold text-blue-600">{item.count} citations ({pct}%)</span>
                          </div>
                          <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                            <div
                              style={{ width: `${pct}%` }}
                              className="h-full bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full transition-all duration-500"
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* MODAL 1: VIEW REQUEST DETAILS */}
      {viewRequestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fadeIn">
          <div className="max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 sm:p-7 rounded-3xl bg-white shadow-2xl border border-slate-200/80 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600">
                  Move Request Specification
                </span>
                <h3 className="text-lg font-bold text-slate-900">
                  REQ #{viewRequestModal._id.slice(-6).toUpperCase()}
                </h3>
              </div>
              <button
                onClick={() => setViewRequestModal(null)}
                className="h-8 w-8 rounded-xl bg-slate-100 text-slate-500 hover:text-slate-800 hover:bg-slate-200 transition flex items-center justify-center font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Addresses */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/70 space-y-1">
                <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wide">Pickup Location</span>
                <p className="text-xs font-bold text-slate-900">{viewRequestModal.pickupAddress.street}</p>
                <p className="text-xs text-slate-500">
                  {viewRequestModal.pickupAddress.city} - {viewRequestModal.pickupAddress.postalCode}
                </p>
                <p className="text-[11px] text-slate-400">
                  Floor: {viewRequestModal.pickupAddress.floor || 0} • Lift: {viewRequestModal.pickupAddress.hasLift ? "Yes" : "No"}
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/70 space-y-1">
                <span className="text-[10px] font-bold text-sky-600 uppercase tracking-wide">Destination Location</span>
                <p className="text-xs font-bold text-slate-900">{viewRequestModal.destinationAddress.street}</p>
                <p className="text-xs text-slate-500">
                  {viewRequestModal.destinationAddress.city} - {viewRequestModal.destinationAddress.postalCode}
                </p>
                <p className="text-[11px] text-slate-400">
                  Floor: {viewRequestModal.destinationAddress.floor || 0} • Lift: {viewRequestModal.destinationAddress.hasLift ? "Yes" : "No"}
                </p>
              </div>
            </div>

            {/* Schedule & Services */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/70 space-y-2">
              <div className="flex justify-between text-xs text-slate-900">
                <span className="text-slate-500">Scheduled Move Date:</span>
                <span className="font-semibold">
                  {new Date(viewRequestModal.preferredDate).toLocaleDateString("en-IN", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </span>
              </div>
              {viewRequestModal.preferredTimeSlot && (
                <div className="flex justify-between text-xs text-slate-900">
                  <span className="text-slate-500">Preferred Time Window:</span>
                  <span className="font-semibold">{viewRequestModal.preferredTimeSlot}</span>
                </div>
              )}
            </div>

            {/* Inventory List */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <Layers size={14} className="text-blue-600" />
                <span>Customer Inventory Checklist ({viewRequestModal.items?.length || 0} items)</span>
              </span>
              {viewRequestModal.items && viewRequestModal.items.length > 0 ? (
                <div className="max-h-48 overflow-y-auto space-y-1.5 p-3 rounded-2xl bg-slate-50 border border-slate-200/70">
                  {viewRequestModal.items.map((item, i) => (
                    <div key={i} className="flex items-center justify-between text-xs p-2.5 rounded-xl bg-white border border-slate-200/60 shadow-2xs">
                      <span className="font-medium text-slate-900">{item.name}</span>
                      <div className="flex items-center gap-2">
                        {item.isFragile && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            Fragile
                          </span>
                        )}
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                          Qty: {item.quantity}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">No specific items enumerated.</p>
              )}
            </div>

            {/* Modal Actions */}
            <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button
                onClick={() => setViewRequestModal(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700 transition cursor-pointer"
              >
                Close
              </button>
              {!viewRequestModal.hasQuoted && (
                <button
                  onClick={() => {
                    const req = viewRequestModal;
                    setViewRequestModal(null);
                    handleOpenSubmitModal(req);
                  }}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition cursor-pointer"
                >
                  Create Quotation
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: CREATE QUOTATION (DIRECT CLIENT OR MARKETPLACE REQUEST) */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fadeIn">
          <form
            onSubmit={handleSubmitQuote}
            className="max-w-3xl w-full max-h-[92vh] overflow-y-auto p-6 sm:p-7 rounded-3xl bg-white shadow-2xl border border-slate-200/80 space-y-6"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200/70 uppercase tracking-wider">
                    {quoteSourceMode === "direct" ? "Direct Client Quotation" : "Marketplace Request Quotation"}
                  </span>
                  {quoteSourceMode === "request" && (quoteTargetRequest || selectedRequestId) && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200/60">
                      REQ #{(quoteTargetRequest?._id || selectedRequestId).slice(-6).toUpperCase()}
                    </span>
                  )}
                </div>
                <h3 className="text-lg font-bold text-slate-900 mt-1">
                  {quoteSourceMode === "direct"
                    ? `${directPickupCity || "Origin"} → ${directDestCity || "Destination"}`
                    : quoteTargetRequest
                    ? `${quoteTargetRequest.pickupAddress.city} → ${quoteTargetRequest.destinationAddress.city}`
                    : "Select Moving Request"}
                </h3>
                <p className="text-xs text-slate-500">
                  {quoteSourceMode === "direct"
                    ? `Client: ${directCustomerName || "Walk-in Customer"} • Size: ${directMoveSize} • Date: ${directMoveDate}`
                    : quoteTargetRequest
                    ? `Inventory: ${quoteTargetRequest.items?.length || 0} items listed • Scheduled: ${new Date(
                        quoteTargetRequest.preferredDate
                      ).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}`
                    : "Choose an open customer moving request to prepare quotation"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsCreateModalOpen(false);
                  setQuoteTargetRequest(null);
                }}
                className="h-8 w-8 rounded-xl bg-slate-100 text-slate-500 hover:text-slate-800 hover:bg-slate-200 transition flex items-center justify-center font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Mode Switcher: Direct Quotation vs Marketplace Request */}
            <div className="flex flex-col sm:flex-row items-center gap-1.5 p-1 rounded-2xl bg-slate-100 border border-slate-200/80">
              <button
                type="button"
                onClick={() => {
                  setQuoteSourceMode("direct");
                  setQuoteTargetRequest(null);
                }}
                className={`flex-1 w-full py-2 px-3 rounded-xl text-xs transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  quoteSourceMode === "direct"
                    ? "bg-white text-blue-600 font-bold shadow-xs border border-slate-200/60"
                    : "text-slate-600 hover:text-slate-900 font-medium"
                }`}
              >
                <Plus size={14} />
                <span>Direct / Walk-in Customer Quotation</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setQuoteSourceMode("request");
                  if (!quoteTargetRequest && availableRequests.length > 0) {
                    const firstReq = availableRequests.find((r) => !r.hasQuoted) || availableRequests[0];
                    handleOpenCreateQuoteModal(firstReq);
                  }
                }}
                className={`flex-1 w-full py-2 px-3 rounded-xl text-xs transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  quoteSourceMode === "request"
                    ? "bg-white text-blue-600 font-bold shadow-xs border border-slate-200/60"
                    : "text-slate-600 hover:text-slate-900 font-medium"
                }`}
              >
                <FileText size={14} />
                <span>Select Marketplace Request ({availableRequests.filter((r) => !r.hasQuoted).length})</span>
              </button>
            </div>

            {/* If Request Mode: Show Request Dropdown Selector */}
            {quoteSourceMode === "request" && (
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/70 space-y-2">
                <label className="text-xs font-bold text-slate-900 block">
                  Select Open Moving Request <span className="text-rose-500">*</span>
                </label>
                {availableRequests.length === 0 ? (
                  <p className="text-xs text-slate-500 italic">No marketplace requests are currently open.</p>
                ) : (
                  <select
                    value={selectedRequestId || quoteTargetRequest?._id || ""}
                    onChange={(e) => {
                      const req = availableRequests.find((r) => r._id === e.target.value);
                      if (req) {
                        setQuoteTargetRequest(req);
                        setSelectedRequestId(req._id);
                        const itemCount = req.items?.reduce((acc, item) => acc + (item.quantity || 1), 0) || 0;
                        let initialPreset = VEHICLE_PRESETS[0];
                        if (itemCount > 25) initialPreset = VEHICLE_PRESETS[2];
                        else if (itemCount > 10) initialPreset = VEHICLE_PRESETS[1];
                        else if (itemCount <= 4 && itemCount > 0) initialPreset = VEHICLE_PRESETS[3];
                        applyVehiclePreset(initialPreset);
                      }
                    }}
                    className="w-full px-3 py-2.5 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition"
                  >
                    <option value="">-- Choose an Open Customer Request --</option>
                    {availableRequests.map((req) => (
                      <option key={req._id} value={req._id}>
                        REQ #{req._id.slice(-6).toUpperCase()} • {req.pickupAddress.city} → {req.destinationAddress.city} • {new Date(req.preferredDate).toLocaleDateString("en-IN")} ({req.items?.length || 0} items) {req.hasQuoted ? "• [ALREADY QUOTED]" : ""}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}

            {/* If Direct Mode: Show Customer & Move Route Input Fields */}
            {quoteSourceMode === "direct" && (
              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/70 space-y-4">
                <div className="flex items-center gap-2.5 pb-2 border-b border-slate-200/70">
                  <div className="h-7 w-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                    <UserIcon size={15} />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                      Customer & Move Route Information
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Enter client contact details, origin, destination, and inventory requirements
                    </p>
                  </div>
                </div>

                {/* Customer Name & Phone */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 block">
                      Customer Full Name
                    </label>
                    <input
                      type="text"
                      value={directCustomerName}
                      onChange={(e) => setDirectCustomerName(e.target.value)}
                      placeholder="e.g. Rahul Sharma"
                      className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 block">
                      Customer Phone Number <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={directCustomerPhone}
                      onChange={(e) => setDirectCustomerPhone(e.target.value)}
                      placeholder="e.g. 9876543210"
                      className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition"
                      required
                    />
                  </div>
                </div>

                {/* Move Size 1-Click Quick Selector */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-700">
                      House / Move Size Quick Preset
                    </label>
                    <span className="text-[11px] text-slate-400">Click to auto-configure inventory & vehicle</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {MOVE_SIZES.map((size, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSelectMoveSize(size)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border cursor-pointer ${
                          directMoveSize === size.label
                            ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                            : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                        }`}
                      >
                        {size.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Pickup & Destination Addresses */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Pickup Origin */}
                  <div className="p-3.5 rounded-xl bg-white border border-slate-200/80 shadow-2xs space-y-2">
                    <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      <MapPin size={14} className="text-blue-600" /> Pickup / Origin Location <span className="text-rose-500">*</span>
                    </span>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={directPickupCity}
                        onChange={(e) => setDirectPickupCity(e.target.value)}
                        placeholder="City (e.g. Bangalore)"
                        className="px-2.5 py-1.5 rounded-lg bg-slate-50 text-xs font-medium text-slate-900 focus:outline-none focus:bg-white border border-slate-200 transition"
                        required
                      />
                      <input
                        type="text"
                        value={directPickupPincode}
                        onChange={(e) => setDirectPickupPincode(e.target.value)}
                        placeholder="Pincode (e.g. 560001)"
                        className="px-2.5 py-1.5 rounded-lg bg-slate-50 text-xs font-medium text-slate-900 focus:outline-none focus:bg-white border border-slate-200 transition"
                      />
                    </div>
                    <input
                      type="text"
                      value={directPickupStreet}
                      onChange={(e) => setDirectPickupStreet(e.target.value)}
                      placeholder="Street, Building, Flat / House No."
                      className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 text-xs text-slate-900 focus:outline-none focus:bg-white border border-slate-200 transition"
                    />
                    <div className="flex items-center justify-between text-xs pt-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-500">Floor:</span>
                        <input
                          type="number"
                          min="0"
                          value={directPickupFloor}
                          onChange={(e) => setDirectPickupFloor(Number(e.target.value) || 0)}
                          className="w-12 px-1.5 py-0.5 rounded bg-slate-50 font-bold text-center border border-slate-200"
                        />
                      </div>
                      <label className="flex items-center gap-1.5 text-slate-600 font-medium cursor-pointer">
                        <input
                          type="checkbox"
                          checked={directPickupHasLift}
                          onChange={(e) => setDirectPickupHasLift(e.target.checked)}
                          className="rounded border-slate-300 text-blue-600 focus:ring-blue-500/20"
                        />
                        <span>Service Lift Available</span>
                      </label>
                    </div>
                  </div>

                  {/* Drop Destination */}
                  <div className="p-3.5 rounded-xl bg-white border border-slate-200/80 shadow-2xs space-y-2">
                    <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      <MapPin size={14} className="text-emerald-600" /> Delivery / Destination <span className="text-rose-500">*</span>
                    </span>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={directDestCity}
                        onChange={(e) => setDirectDestCity(e.target.value)}
                        placeholder="City (e.g. Chennai)"
                        className="px-2.5 py-1.5 rounded-lg bg-slate-50 text-xs font-medium text-slate-900 focus:outline-none focus:bg-white border border-slate-200 transition"
                        required
                      />
                      <input
                        type="text"
                        value={directDestPincode}
                        onChange={(e) => setDirectDestPincode(e.target.value)}
                        placeholder="Pincode (e.g. 600001)"
                        className="px-2.5 py-1.5 rounded-lg bg-slate-50 text-xs font-medium text-slate-900 focus:outline-none focus:bg-white border border-slate-200 transition"
                      />
                    </div>
                    <input
                      type="text"
                      value={directDestStreet}
                      onChange={(e) => setDirectDestStreet(e.target.value)}
                      placeholder="Street, Building, Flat / House No."
                      className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 text-xs text-slate-900 focus:outline-none focus:bg-white border border-slate-200 transition"
                    />
                    <div className="flex items-center justify-between text-xs pt-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-500">Floor:</span>
                        <input
                          type="number"
                          min="0"
                          value={directDestFloor}
                          onChange={(e) => setDirectDestFloor(Number(e.target.value) || 0)}
                          className="w-12 px-1.5 py-0.5 rounded bg-slate-50 font-bold text-center border border-slate-200"
                        />
                      </div>
                      <label className="flex items-center gap-1.5 text-slate-600 font-medium cursor-pointer">
                        <input
                          type="checkbox"
                          checked={directDestHasLift}
                          onChange={(e) => setDirectDestHasLift(e.target.checked)}
                          className="rounded border-slate-300 text-blue-600 focus:ring-blue-500/20"
                        />
                        <span>Service Lift Available</span>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Move Date, Time Slot & Inventory */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 block">
                      Preferred Move Date <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={directMoveDate}
                      onChange={(e) => setDirectMoveDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-medium text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 block">
                      Preferred Time Slot
                    </label>
                    <select
                      value={directTimeSlot}
                      onChange={(e) => setDirectTimeSlot(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-medium text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition"
                    >
                      <option value="Morning (8:00 AM - 12:00 PM)">Morning (8:00 AM - 12:00 PM)</option>
                      <option value="Afternoon (12:00 PM - 4:00 PM)">Afternoon (12:00 PM - 4:00 PM)</option>
                      <option value="Evening (4:00 PM - 8:00 PM)">Evening (4:00 PM - 8:00 PM)</option>
                      <option value="Flexible All Day">Flexible All Day</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 block">
                      Inventory Description / Notes
                    </label>
                    <input
                      type="text"
                      value={directCustomItemsText}
                      onChange={(e) => setDirectCustomItemsText(e.target.value)}
                      placeholder="e.g. Beds, Sofa, Fridge, 10 Boxes"
                      className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Quick 1-Click Operational Presets */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 shadow-xs space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <Sparkles size={14} className="text-sky-600" />
                  1-Click Estimation Presets (Vehicle, Crew & Split Charges)
                </span>
                <span className="text-[11px] text-slate-500">Select to auto-fill, then customize</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {VEHICLE_PRESETS.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => applyVehiclePreset(preset)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 border ${
                      selectedVehicleType === preset.type
                        ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                        : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100 shadow-xs"
                    }`}
                  >
                    <Truck size={12} />
                    {preset.name}
                  </button>
                ))}
              </div>
            </div>

            {/* SECTION 1: VEHICLE & TRANSPORT ALLOCATION */}
            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
                <div className="h-8 w-8 rounded-lg bg-sky-50 text-sky-600 border border-sky-100 flex items-center justify-center shrink-0">
                  <Truck size={16} />
                </div>
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                    1. Dedicated Vehicle & Fleet Allocation
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Specify the dedicated carrier truck assigned for this move
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 block">
                    Vehicle Type & Dimensions <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={selectedVehicleType}
                    onChange={(e) => setSelectedVehicleType(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition"
                  >
                    <option value="14ft Closed Container Truck">14ft Closed Container Truck (1-2 BHK)</option>
                    <option value="17ft Multi-Axle Container Truck">17ft Multi-Axle Container Truck (2-3 BHK)</option>
                    <option value="22ft High-Cube Heavy Container Truck">22ft High-Cube Heavy Container Truck (3-4 BHK / Villa)</option>
                    <option value="Tata Ace 9ft Mini Truck">Tata Ace 9ft Mini Truck (Studio / 1 RK)</option>
                    <option value="Dedicated Enclosed Vehicle Carrier">Dedicated Enclosed Vehicle Carrier (Car / Bike)</option>
                    <option value="Open Tarpaulin High-Body Truck">Open Tarpaulin High-Body Truck</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 block">
                    Vehicle Features & Specs
                  </label>
                  <input
                    type="text"
                    value={vehicleSpecs}
                    onChange={(e) => setVehicleSpecs(e.target.value)}
                    placeholder="e.g. Hydraulic Ramp, GPS Tracking, Weatherproof Closed Container"
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition"
                  />
                </div>
              </div>
            </div>

            {/* SECTION 2: CREW & PERSONNEL ALLOCATION */}
            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
                <div className="h-8 w-8 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center shrink-0">
                  <Users size={16} />
                </div>
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                    2. Dedicated Moving Crew & Personnel Allocation
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Define team size and operational roles for handling, packing, and transit
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 block">
                    Assigned Personnel Count <span className="text-rose-500">*</span>
                  </label>
                  <div className="flex items-center gap-2">
                    {[2, 3, 4, 5, 6].map((cnt) => (
                      <button
                        key={cnt}
                        type="button"
                        onClick={() => setCrewCount(cnt)}
                        className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all border ${
                          crewCount === cnt
                            ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                            : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        {cnt}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="sm:col-span-2 space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 block">
                    Crew Roles & Expertise Breakdown
                  </label>
                  <input
                    type="text"
                    value={crewRoles}
                    onChange={(e) => setCrewRoles(e.target.value)}
                    placeholder="e.g. 1 Lead Supervisor, 2 Senior Packers, 1 Furniture Specialist"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition"
                  />
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {["Trained Packers", "Heavy Loaders", "Dismantling Tech", "Background Verified"].map((tag, i) => (
                      <span key={i} className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-100">
                        ✓ {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* SECTION 3: PERFECT SPLIT CHARGES BREAKDOWN */}
            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center shrink-0">
                    <Calculator size={16} />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                      3. Perfect Split Charges Breakdown (Itemized Estimation)
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Enter exact cost breakdown. Auto-sums into the all-inclusive grand total.
                    </p>
                  </div>
                </div>

                <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Auto-Sum Active
                </span>
              </div>

              {/* 6 Split Charge Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                {/* 1. Base Freight */}
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                  <label className="font-bold text-slate-700 block">1. Freight & Transit (₹)</label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₹</span>
                    <input
                      type="number"
                      min="0"
                      value={splitFreight}
                      onChange={(e) => setSplitFreight(e.target.value)}
                      className="w-full pl-6 pr-2 py-1.5 rounded-lg bg-white text-xs font-bold text-slate-900 border border-slate-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      placeholder="6500"
                    />
                  </div>
                  <span className="text-[10px] text-slate-500 block">Fuel & vehicle transit</span>
                </div>

                {/* 2. Packing Materials */}
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                  <label className="font-bold text-slate-700 block">2. Packing Materials (₹)</label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₹</span>
                    <input
                      type="number"
                      min="0"
                      value={splitPacking}
                      onChange={(e) => setSplitPacking(e.target.value)}
                      className="w-full pl-6 pr-2 py-1.5 rounded-lg bg-white text-xs font-bold text-slate-900 border border-slate-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      placeholder="3500"
                    />
                  </div>
                  <span className="text-[10px] text-slate-500 block">Bubble wrap, boxes, foam</span>
                </div>

                {/* 3. Loading & Unloading */}
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                  <label className="font-bold text-slate-700 block">3. Loading & Unloading (₹)</label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₹</span>
                    <input
                      type="number"
                      min="0"
                      value={splitLoading}
                      onChange={(e) => setSplitLoading(e.target.value)}
                      className="w-full pl-6 pr-2 py-1.5 rounded-lg bg-white text-xs font-bold text-slate-900 border border-slate-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      placeholder="3000"
                    />
                  </div>
                  <span className="text-[10px] text-slate-500 block">Labor for {crewCount} crew</span>
                </div>

                {/* 4. Dismantling & Assembly */}
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                  <label className="font-bold text-slate-700 block">4. Dismantling / Assembly (₹)</label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₹</span>
                    <input
                      type="number"
                      min="0"
                      value={splitDismantling}
                      onChange={(e) => setSplitDismantling(e.target.value)}
                      className="w-full pl-6 pr-2 py-1.5 rounded-lg bg-white text-xs font-bold text-slate-900 border border-slate-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      placeholder="1500"
                    />
                  </div>
                  <span className="text-[10px] text-slate-500 block">Beds, wardrobes, TVs</span>
                </div>

                {/* 5. Transit Insurance */}
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                  <label className="font-bold text-slate-700 block">5. Transit Insurance (₹)</label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₹</span>
                    <input
                      type="number"
                      min="0"
                      value={splitInsurance}
                      onChange={(e) => setSplitInsurance(e.target.value)}
                      className="w-full pl-6 pr-2 py-1.5 rounded-lg bg-white text-xs font-bold text-slate-900 border border-slate-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      placeholder="1000"
                    />
                  </div>
                  <span className="text-[10px] text-slate-500 block">Goods damage coverage</span>
                </div>

                {/* 6. Toll, Parking & Other */}
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                  <label className="font-bold text-slate-700 block">6. Toll & Incidental (₹)</label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₹</span>
                    <input
                      type="number"
                      min="0"
                      value={splitOther}
                      onChange={(e) => setSplitOther(e.target.value)}
                      className="w-full pl-6 pr-2 py-1.5 rounded-lg bg-white text-xs font-bold text-slate-900 border border-slate-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      placeholder="500"
                    />
                  </div>
                  <span className="text-[10px] text-slate-500 block">Highway toll, society permits</span>
                </div>
              </div>

              {/* Taxes & GST Toggle */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-blue-50/60 border border-blue-200 text-xs">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="autoGstToggle"
                    checked={autoGst}
                    onChange={(e) => setAutoGst(e.target.checked)}
                    className="h-4 w-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                  <label htmlFor="autoGstToggle" className="font-bold text-slate-800 cursor-pointer">
                    Apply Standard 18% GST (Auto-calculated: ₹{calculatedGstRupees.toLocaleString("en-IN")})
                  </label>
                </div>
                {!autoGst && (
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-600">Manual Tax (₹):</span>
                    <input
                      type="number"
                      min="0"
                      value={manualGst}
                      onChange={(e) => setManualGst(e.target.value)}
                      placeholder="0"
                      className="w-24 px-2 py-1 rounded bg-white border border-slate-300 text-xs font-bold text-slate-900"
                    />
                  </div>
                )}
              </div>

              {/* LIVE ESTIMATION SUMMARY BANNER */}
              <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900 via-indigo-950 to-blue-900 text-white shadow-md space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-blue-300">
                      Total All-Inclusive Quotation Estimation
                    </span>
                    <div className="text-3xl font-black tracking-tight text-white">
                      ₹{grandTotalRupees.toLocaleString("en-IN")}
                    </div>
                  </div>
                  <div className="text-right text-xs space-y-0.5">
                    <div className="text-blue-200">
                      Operational Subtotal: <strong className="text-white">₹{subtotalRupees.toLocaleString("en-IN")}</strong>
                    </div>
                    <div className="text-blue-200">
                      Applicable Taxes (GST 18%): <strong className="text-white">₹{calculatedGstRupees.toLocaleString("en-IN")}</strong>
                    </div>
                  </div>
                </div>

                {/* Percentage mini breakdown */}
                {subtotalRupees > 0 && (
                  <div className="pt-2.5 border-t border-white/15 flex flex-wrap items-center justify-between text-[11px] text-blue-200 font-medium gap-2">
                    <span>Freight: {Math.round((numFreight / grandTotalRupees) * 100)}%</span>
                    <span>Packing: {Math.round((numPacking / grandTotalRupees) * 100)}%</span>
                    <span>Labor: {Math.round((numLoading / grandTotalRupees) * 100)}%</span>
                    <span>Dismantling: {Math.round((numDismantling / grandTotalRupees) * 100)}%</span>
                    <span>Insurance: {Math.round((numInsurance / grandTotalRupees) * 100)}%</span>
                    <span>GST: {Math.round((calculatedGstRupees / grandTotalRupees) * 100)}%</span>
                  </div>
                )}
              </div>
            </div>

            {/* SECTION 4: INCLUSIONS, EXCLUSIONS & OPERATIONAL TERMS */}
            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                4. Inclusions, Exclusions & Validity Window
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Inclusions (comma separated)</label>
                  <textarea
                    rows={2}
                    value={inclusionsText}
                    onChange={(e) => setInclusionsText(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Exclusions (comma separated)</label>
                  <textarea
                    rows={2}
                    value={exclusionsText}
                    onChange={(e) => setExclusionsText(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2 space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Operational Assumptions</label>
                  <input
                    type="text"
                    value={assumptionsText}
                    onChange={(e) => setAssumptionsText(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Quotation Validity</label>
                  <select
                    value={validityHours}
                    onChange={(e) => setValidityHours(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition"
                  >
                    <option value="24">24 Hours</option>
                    <option value="48">48 Hours</option>
                    <option value="72">72 Hours</option>
                    <option value="168">7 Days</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-200">
              <span className="text-xs font-semibold text-slate-500">
                Allocating: <strong className="text-slate-900">{selectedVehicleType}</strong> •{" "}
                <strong className="text-slate-900">{crewCount} Crew Personnel</strong>
              </span>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsCreateModalOpen(false);
                    setQuoteTargetRequest(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-xs transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingQuote}
                  className="px-6 py-2.5 rounded-xl bg-blue-600 text-white text-xs font-bold shadow-xs hover:bg-blue-700 transition flex items-center gap-2"
                >
                  {submittingQuote ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" /> Submitting Estimation...
                    </>
                  ) : (
                    <>
                      <Check size={14} /> Submit Full Estimation Quotation
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* MODAL 3: VIEW SUBMITTED QUOTE DETAILS & FULL ESTIMATION SHEET */}
      {viewQuoteModal && (() => {
        const est = getEffectiveEstimation(viewQuoteModal);
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-fadeIn">
            <div className="max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 rounded-2xl bg-white shadow-2xl border border-slate-200 space-y-5">
              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-sky-600">
                    Relocation Estimation Sheet • #{viewQuoteModal._id.slice(-6).toUpperCase()}
                  </span>
                  <h3 className="text-lg font-bold text-slate-900">
                    {viewQuoteModal.requestId?.pickupAddress?.city} → {viewQuoteModal.requestId?.destinationAddress?.city}
                  </h3>
                </div>
                <button
                  onClick={() => setViewQuoteModal(null)}
                  className="h-8 w-8 rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-800 flex items-center justify-center transition font-bold"
                >
                  ✕
                </button>
              </div>

              {/* Customer Contact & Route Banner */}
              {viewQuoteModal.requestId?.customerId && (
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                      Customer Contact Details
                    </span>
                    <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                      <UserIcon size={14} className="text-blue-600" />
                      {viewQuoteModal.requestId.customerId.displayName || "Direct Client"}
                    </h4>
                    {viewQuoteModal.requestId.customerId.phone && (
                      <p className="text-xs text-slate-600 flex items-center gap-1.5">
                        <Phone size={12} className="text-sky-600" />
                        {viewQuoteModal.requestId.customerId.phone}
                      </p>
                    )}
                  </div>
                  {viewQuoteModal.requestId.customerId.phone && (
                    <a
                      href={`https://wa.me/${viewQuoteModal.requestId.customerId.phone.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(
                        `Hello ${viewQuoteModal.requestId.customerId.displayName || "Customer"}, your relocation quotation for ${viewQuoteModal.requestId?.pickupAddress?.city} to ${viewQuoteModal.requestId?.destinationAddress?.city} is ready for review: Total ${formatPaiseToRupees(viewQuoteModal.totalAmountMinorUnits)} (${est.vehicleType} with ${est.crewCount} crew). Thank you!`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3.5 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold shadow-xs hover:bg-emerald-700 transition flex items-center gap-1.5 shrink-0"
                    >
                      <MessageSquare size={13} />
                      Chat on WhatsApp
                    </a>
                  )}
                </div>
              )}

              {/* Status & Amount Banner */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Total All-Inclusive Quotation</span>
                  <p className="text-2xl font-black text-blue-600">
                    {formatPaiseToRupees(viewQuoteModal.totalAmountMinorUnits)}
                  </p>
                </div>
                <div>
                  {viewQuoteModal.status === "ACCEPTED" && (
                    <span className="px-3 py-1.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      ACCEPTED BY CUSTOMER
                    </span>
                  )}
                  {viewQuoteModal.status === "SUBMITTED" && (
                    <span className="px-3 py-1.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                      PENDING SELECTION
                    </span>
                  )}
                  {(viewQuoteModal.status === "NOT_SELECTED" || viewQuoteModal.status === "REJECTED") && (
                    <span className="px-3 py-1.5 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                      NOT SELECTED / REJECTED
                    </span>
                  )}
                </div>
              </div>

              {/* OPERATIONAL ESTIMATION: VEHICLE & CREW CARDS */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Vehicle Card */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                  <div className="flex items-center gap-2 text-sky-600">
                    <Truck size={16} />
                    <span className="text-[10px] font-bold uppercase tracking-wider">Allocated Vehicle</span>
                  </div>
                  <h4 className="text-xs font-bold text-slate-900">
                    {est.vehicleType}
                  </h4>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    {est.vehicleSpecs}
                  </p>
                </div>

                {/* Crew Card */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                  <div className="flex items-center gap-2 text-blue-600">
                    <Users size={16} />
                    <span className="text-[10px] font-bold uppercase tracking-wider">Dedicated Crew</span>
                  </div>
                  <h4 className="text-xs font-bold text-slate-900">
                    {est.crewCount} Personnel Team
                  </h4>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    {est.crewRoles}
                  </p>
                </div>
              </div>

              {/* CRITICAL FEATURE: CUSTOMER COMMON REJECTION FEEDBACK CONTAINER */}
              {(viewQuoteModal.status === "NOT_SELECTED" || viewQuoteModal.status === "REJECTED") && (
                <div className="p-5 rounded-xl bg-rose-50 border border-rose-200 space-y-3">
                  <div className="flex items-center gap-2 text-rose-900">
                    <ShieldAlert size={18} className="text-rose-600" />
                    <h4 className="text-xs font-bold uppercase tracking-wide">
                      Customer Common Rejection Feedback
                    </h4>
                  </div>

                  {viewQuoteModal.requestId?.commonRejectionFeedback?.reasons &&
                  viewQuoteModal.requestId.commonRejectionFeedback.reasons.length > 0 ? (
                    <div className="space-y-2">
                      <div>
                        <span className="text-[11px] font-bold text-rose-800 block mb-1">CITED REASONS:</span>
                        <div className="flex flex-wrap gap-1.5">
                          {viewQuoteModal.requestId.commonRejectionFeedback.reasons.map((r, i) => (
                            <span
                              key={i}
                              className="px-2.5 py-1 rounded-lg text-xs font-bold bg-white text-rose-800 border border-rose-200 shadow-xs"
                            >
                              {r}
                            </span>
                          ))}
                        </div>
                      </div>

                      {viewQuoteModal.requestId.commonRejectionFeedback.comment && (
                        <div>
                          <span className="text-[11px] font-bold text-rose-800 block mb-1">CUSTOMER NOTE:</span>
                          <div className="p-3 rounded-xl bg-white border border-rose-200 text-xs text-slate-800 italic">
                            "{viewQuoteModal.requestId.commonRejectionFeedback.comment}"
                          </div>
                        </div>
                      )}

                      <div className="pt-2 text-[10px] text-rose-700/80 border-t border-rose-200">
                        Feedback provided after customer rejected bids for this request. Competitor identities and pricing remain confidential.
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-rose-800 italic">
                      The customer declined quotations without submitting optional feedback.
                    </p>
                  )}
                </div>
              )}

              {/* ITEMIZATION: PERFECT SPLIT CHARGES BREAKDOWN TABLE */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <Calculator size={14} className="text-sky-600" />
                    Itemized Cost Estimation Breakdown
                  </span>
                  <span className="text-[11px] text-slate-500">All-inclusive pricing</span>
                </div>

                <div className="rounded-xl bg-white border border-slate-200 overflow-hidden shadow-xs">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold text-[11px]">
                        <th className="py-2.5 px-3.5">Service / Component</th>
                        <th className="py-2.5 px-3.5 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-800">
                      <tr>
                        <td className="py-2.5 px-3.5 font-medium">1. Base Freight & Vehicle Transit ({est.vehicleType})</td>
                        <td className="py-2.5 px-3.5 text-right font-bold">{formatPaiseToRupees(est.splitCharges?.freightMinorUnits || 0)}</td>
                      </tr>
                      <tr>
                        <td className="py-2.5 px-3.5 font-medium">2. Professional Packing Materials & Packaging</td>
                        <td className="py-2.5 px-3.5 text-right font-bold">{formatPaiseToRupees(est.splitCharges?.packingMaterialsMinorUnits || 0)}</td>
                      </tr>
                      <tr>
                        <td className="py-2.5 px-3.5 font-medium">3. Loading & Doorstep Unloading ({est.crewCount} Crew)</td>
                        <td className="py-2.5 px-3.5 text-right font-bold">{formatPaiseToRupees(est.splitCharges?.loadingUnloadingMinorUnits || 0)}</td>
                      </tr>
                      <tr>
                        <td className="py-2.5 px-3.5 font-medium">4. Furniture Dismantling & Assembly Services</td>
                        <td className="py-2.5 px-3.5 text-right font-bold">{formatPaiseToRupees(est.splitCharges?.dismantlingAssemblyMinorUnits || 0)}</td>
                      </tr>
                      <tr>
                        <td className="py-2.5 px-3.5 font-medium">5. Goods Transit Protection & Insurance</td>
                        <td className="py-2.5 px-3.5 text-right font-bold">{formatPaiseToRupees(est.splitCharges?.insuranceMinorUnits || 0)}</td>
                      </tr>
                      <tr>
                        <td className="py-2.5 px-3.5 font-medium">6. Toll, Parking & Incidental Handling</td>
                        <td className="py-2.5 px-3.5 text-right font-bold">{formatPaiseToRupees(est.splitCharges?.otherMinorUnits || 0)}</td>
                      </tr>
                      <tr className="bg-blue-50/50">
                        <td className="py-2.5 px-3.5 font-bold text-blue-900">7. Applicable Taxes & GST (18%)</td>
                        <td className="py-2.5 px-3.5 text-right font-black text-blue-900">{formatPaiseToRupees(est.splitCharges?.taxGstMinorUnits || 0)}</td>
                      </tr>
                      <tr className="bg-slate-50 font-black border-t-2 border-slate-200">
                        <td className="py-3 px-3.5 text-sm text-slate-900">Grand Total Quotation</td>
                        <td className="py-3 px-3.5 text-right text-sm text-blue-600">{formatPaiseToRupees(viewQuoteModal.totalAmountMinorUnits)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Inclusions & Exclusions */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                  <span className="font-bold text-blue-700 block">Inclusions</span>
                  <ul className="list-disc list-inside text-slate-600 space-y-0.5">
                    {(viewQuoteModal.inclusions && viewQuoteModal.inclusions.length > 0 ? viewQuoteModal.inclusions : [
                      "Multi-layer bubble wrap, foam sheeting & corrugated cartons",
                      "Doorstep loading, GPS transit and unloading",
                      "Goods transit insurance protection coverage",
                    ]).map((inc, i) => (
                      <li key={i}>{inc}</li>
                    ))}
                  </ul>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                  <span className="font-bold text-rose-600 block">Exclusions</span>
                  <ul className="list-disc list-inside text-slate-600 space-y-0.5">
                    {(viewQuoteModal.exclusions && viewQuoteModal.exclusions.length > 0 ? viewQuoteModal.exclusions : [
                      "Custom wall carpentry outside standard furniture dismantling",
                      "Hazardous flammable chemicals or liquids",
                      "Warehousing beyond 48 hours without prior notice",
                    ]).map((exc, i) => (
                      <li key={i}>{exc}</li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-200">
                <button
                  onClick={() => {
                    const text = `📦 PACKAGE MOVERS - QUOTATION ESTIMATION\nQuote Ref: #${viewQuoteModal._id.slice(-6).toUpperCase()}\nClient: ${viewQuoteModal.requestId?.customerId?.displayName || "Valued Client"}\nRoute: ${viewQuoteModal.requestId?.pickupAddress?.city} → ${viewQuoteModal.requestId?.destinationAddress?.city}\nVehicle: ${est.vehicleType}\nCrew: ${est.crewCount} Dedicated Crew\nTotal Amount: ${formatPaiseToRupees(viewQuoteModal.totalAmountMinorUnits)}\nValid Until: ${new Date(viewQuoteModal.validUntil).toLocaleDateString("en-IN")}`;
                    navigator.clipboard.writeText(text);
                    setFeedbackBanner({ type: "success", text: "Quotation summary copied to clipboard!" });
                  }}
                  className="px-4 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-xs transition flex items-center gap-1.5"
                >
                  <Copy size={13} />
                  Copy Quote Summary
                </button>

                <button
                  onClick={() => setViewQuoteModal(null)}
                  className="px-5 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold shadow-xs hover:bg-slate-800 transition"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
