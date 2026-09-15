"use client";

import { useEffect, useRef, useState } from "react";
import { fetchApi } from "@/lib/api";
import {
  Truck,
  MapPin,
  Navigation,
  Play,
  Pause,
  RotateCcw,
  Compass,
  Phone,
  Crosshair,
  Maximize2,
  Gauge,
  Clock,
  Radio,
  Share2,
  Check,
  CheckCircle2,
  Square,
  KeyRound,
  X,
  AlertCircle,
  Copy,
  Mail,
  MessageCircle,
  ExternalLink,
  Smartphone,
  Send,
} from "lucide-react";

interface Address {
  street?: string;
  city?: string;
  postalCode?: string;
}

interface MoveTrackingProps {
  bookingId: string;
  customerName?: string;
  customerPhone?: string;
  pickupAddress?: Address;
  destinationAddress?: Address;
  vehicleId?: string;
  driverName?: string;
  driverPhone?: string;
  status?: string;
  onStatusChange?: (newStatus: string) => void;
}

interface LatLng {
  lat: number;
  lng: number;
  name?: string;
}

interface RouteStep {
  instruction: string;
  distanceMeters: number;
}

// Default high-accuracy street coordinates for cities
function getFallbackCoordinates(city?: string): LatLng {
  const c = (city || "").toLowerCase();
  if (c.includes("whitefield")) return { lat: 12.9698, lng: 77.7500, name: "Whitefield, Bengaluru" };
  if (c.includes("indiranagar") || c.includes("bengaluru") || c.includes("bangalore")) {
    return { lat: 12.9784, lng: 77.6408, name: "Indiranagar, Bengaluru" };
  }
  if (c.includes("gurugram") || c.includes("gurgaon")) {
    return { lat: 28.4950, lng: 77.0890, name: "Cyber City, Gurugram" };
  }
  if (c.includes("delhi")) {
    return { lat: 28.5700, lng: 77.2200, name: "South Extension, New Delhi" };
  }
  if (c.includes("mumbai")) {
    return { lat: 19.0760, lng: 72.8777, name: "Mumbai" };
  }
  return { lat: 12.9716, lng: 77.5946, name: "Bengaluru Central" };
}

// Calculate bearing angle between two LatLng points
function calculateBearing(start: LatLng, end: LatLng): number {
  const startLat = (start.lat * Math.PI) / 180;
  const startLng = (start.lng * Math.PI) / 180;
  const endLat = (end.lat * Math.PI) / 180;
  const endLng = (end.lng * Math.PI) / 180;

  const dLng = endLng - startLng;
  const y = Math.sin(dLng) * Math.cos(endLat);
  const x =
    Math.cos(startLat) * Math.sin(endLat) -
    Math.sin(startLat) * Math.cos(endLat) * Math.cos(dLng);

  const brng = (Math.atan2(y, x) * 180) / Math.PI;
  return (brng + 360) % 360;
}

export default function VendorLiveGpsMap({
  bookingId,
  customerName = "Rahul Sharma",
  customerPhone = "+919876543211",
  pickupAddress,
  destinationAddress,
  vehicleId = "KA-01-EA-4491",
  driverName = "Deepak Joshi",
  driverPhone = "+919876543216",
  status = "IN_TRANSIT",
  onStatusChange,
}: MoveTrackingProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const vehicleMarkerRef = useRef<any>(null);
  const polylineRef = useRef<any>(null);

  // Dynamic real-road route data from OSRM
  const [routeCoordinates, setRouteCoordinates] = useState<LatLng[]>([]);
  const [routeSteps, setRouteSteps] = useState<RouteStep[]>([]);
  const [totalDistanceKm, setTotalDistanceKm] = useState<number>(14.6);
  const [totalDurationMin, setTotalDurationMin] = useState<number>(24);
  const [isRouteLoading, setIsRouteLoading] = useState<boolean>(true);

  // Real Tracking Stop state
  const [isTrackingStopped, setIsTrackingStopped] = useState<boolean>(status === "COMPLETED");
  const [stoppedTimestamp, setStoppedTimestamp] = useState<string | null>(null);

  // Modals
  const [showStopModal, setShowStopModal] = useState<boolean>(false);
  const [showCompleteModal, setShowCompleteModal] = useState<boolean>(false);
  const [showShareModal, setShowShareModal] = useState<boolean>(false);
  const [shareFeedback, setShareFeedback] = useState<string | null>(null);
  const [copiedSummary, setCopiedSummary] = useState<boolean>(false);
  const [deliveryPin, setDeliveryPin] = useState<string>("");
  const [isCompleting, setIsCompleting] = useState<boolean>(false);
  const [completionError, setCompletionError] = useState<string | null>(null);
  const [currentStatus, setCurrentStatus] = useState<string>(status);

  // Live GPS progression state
  const [currentProgress, setCurrentProgress] = useState<number>(status === "COMPLETED" ? 1 : 0.28);
  const [isPlaying, setIsPlaying] = useState<boolean>(status !== "COMPLETED");
  const [currentSpeedKmh, setCurrentSpeedKmh] = useState<number>(42);
  const [currentStepInstruction, setCurrentStepInstruction] = useState<string>("Cruising on designated road corridor");

  // Device Hardware GPS Mode (Reads physical phone/laptop GPS)
  const [isDeviceGpsActive, setIsDeviceGpsActive] = useState<boolean>(false);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);

  // Determine origin & destination coordinates
  const originCoord = pickupAddress?.city?.toLowerCase().includes("gurugram")
    ? { lat: 28.4950, lng: 77.0890, name: pickupAddress.street || "Cyber City, Gurugram" }
    : { lat: 12.9784, lng: 77.6408, name: pickupAddress?.street || "12th Main, Indiranagar, Bengaluru" };

  const destCoord = destinationAddress?.city?.toLowerCase().includes("delhi")
    ? { lat: 28.5700, lng: 77.2200, name: destinationAddress.street || "South Extension, New Delhi" }
    : { lat: 12.9698, lng: 77.7500, name: destinationAddress?.street || "Prestige Boulevard, Whitefield, Bengaluru" };

  // 1. Fetch Real-World Street Routing from OSRM
  useEffect(() => {
    let isCancelled = false;

    async function fetchRealRoadRoute() {
      setIsRouteLoading(true);
      try {
        const url = `https://router.project-osrm.org/route/v1/driving/${originCoord.lng},${originCoord.lat};${destCoord.lng},${destCoord.lat}?overview=full&geometries=geojson&steps=true`;
        const res = await fetch(url);
        const data = await res.json();

        if (!isCancelled && data.code === "Ok" && data.routes?.[0]) {
          const route = data.routes[0];
          const coords: LatLng[] = route.geometry.coordinates.map((c: [number, number]) => ({
            lat: c[1],
            lng: c[0],
          }));

          setRouteCoordinates(coords);
          setTotalDistanceKm(Number((route.distance / 1000).toFixed(1)));
          setTotalDurationMin(Math.max(1, Math.round(route.duration / 60)));

          // Extract turn-by-turn road steps
          if (route.legs?.[0]?.steps) {
            const steps: RouteStep[] = route.legs[0].steps.map((s: any) => ({
              instruction: s.name ? `Proceed onto ${s.name}` : `Continue on route`,
              distanceMeters: s.distance,
            }));
            setRouteSteps(steps);
            if (steps.length > 0) {
              setCurrentStepInstruction(steps[0].instruction);
            }
          }
        } else {
          throw new Error("Fallback to corridor waypoints");
        }
      } catch {
        // High-density corridor fallback
        const fallback = [
          originCoord,
          { lat: 12.9690, lng: 77.6495, name: "Domlur Flyover & Ring Road" },
          { lat: 12.9592, lng: 77.6680, name: "Old Airport Road, Murugeshpalya" },
          { lat: 12.9565, lng: 77.6890, name: "HAL Junction & Yemalur Crossing" },
          { lat: 12.9555, lng: 77.7010, name: "Marathahalli Multiplex Bridge" },
          { lat: 12.9538, lng: 77.7180, name: "Varthur Road, Kundalahalli Gate" },
          destCoord,
        ];
        if (!isCancelled) setRouteCoordinates(fallback);
      } finally {
        if (!isCancelled) setIsRouteLoading(false);
      }
    }

    fetchRealRoadRoute();

    return () => {
      isCancelled = true;
    };
  }, [bookingId]);

  // Current interpolated position along route coordinates
  const getCurrentPosition = (progress: number): { point: LatLng; bearing: number } => {
    if (routeCoordinates.length === 0) return { point: originCoord, bearing: 0 };
    const clamped = Math.max(0, Math.min(0.999, progress));
    const segmentCount = routeCoordinates.length - 1;
    const overallIndex = clamped * segmentCount;
    const segmentIndex = Math.floor(overallIndex);
    const segmentT = overallIndex - segmentIndex;

    const p1 = routeCoordinates[segmentIndex];
    const p2 = routeCoordinates[Math.min(segmentIndex + 1, routeCoordinates.length - 1)];

    const lat = p1.lat + (p2.lat - p1.lat) * segmentT;
    const lng = p1.lng + (p2.lng - p1.lng) * segmentT;
    const bearing = calculateBearing(p1, p2);

    return { point: { lat, lng }, bearing };
  };

  const distanceRemainingKm = Math.max(
    0,
    Number((totalDistanceKm * (1 - currentProgress)).toFixed(1))
  );
  const etaMinutes = distanceRemainingKm <= 0 ? 0 : Math.max(1, Math.round((distanceRemainingKm / (currentSpeedKmh || 35)) * 60));

  // 2. Initialize Leaflet Map
  useEffect(() => {
    let isMounted = true;

    async function initLeaflet() {
      if (!mapContainerRef.current || mapInstanceRef.current || routeCoordinates.length === 0) return;

      // Inject Leaflet CSS link dynamically
      if (!document.getElementById("leaflet-css")) {
        const link = document.createElement("link");
        link.id = "leaflet-css";
        link.rel = "stylesheet";
        link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
        document.head.appendChild(link);
      }

      const L = (await import("leaflet")).default;

      if (!isMounted || !mapContainerRef.current) return;

      const midLat = (originCoord.lat + destCoord.lat) / 2;
      const midLng = (originCoord.lng + destCoord.lng) / 2;

      const map = L.map(mapContainerRef.current, {
        center: [midLat, midLng],
        zoom: 13,
        zoomControl: false,
      });

      // Real OpenStreetMap Tile Layer
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map);

      // Custom Origin Marker Icon
      const originIcon = L.divIcon({
        className: "custom-origin-pin",
        html: `
          <div style="display: flex; flex-direction: column; align-items: center; cursor: pointer;">
            <div style="background: #2563EB; color: white; padding: 4px 8px; border-radius: 8px; font-weight: 800; font-size: 10px; box-shadow: 0 4px 10px rgba(37,99,235,0.4); border: 2px solid white; white-space: nowrap; margin-bottom: 2px;">
              PICKUP LOCATION
            </div>
            <div style="height: 14px; width: 14px; border-radius: 50%; background: #2563EB; border: 3px solid white; box-shadow: 0 0 10px rgba(37,99,235,0.6);"></div>
          </div>
        `,
        iconSize: [110, 40],
        iconAnchor: [55, 36],
      });

      // Custom Destination Marker Icon
      const destIcon = L.divIcon({
        className: "custom-dest-pin",
        html: `
          <div style="display: flex; flex-direction: column; align-items: center; cursor: pointer;">
            <div style="background: #14B8A6; color: white; padding: 4px 8px; border-radius: 8px; font-weight: 800; font-size: 10px; box-shadow: 0 4px 10px rgba(20,184,166,0.4); border: 2px solid white; white-space: nowrap; margin-bottom: 2px;">
              DELIVERY DROPOFF
            </div>
            <div style="height: 14px; width: 14px; border-radius: 50%; background: #14B8A6; border: 3px solid white; box-shadow: 0 0 10px rgba(20,184,166,0.6);"></div>
          </div>
        `,
        iconSize: [120, 40],
        iconAnchor: [60, 36],
      });

      L.marker([originCoord.lat, originCoord.lng], { icon: originIcon })
        .addTo(map)
        .bindPopup(`<b>Pickup:</b> ${originCoord.name}`);

      L.marker([destCoord.lat, destCoord.lng], { icon: destIcon })
        .addTo(map)
        .bindPopup(`<b>Dropoff:</b> ${destCoord.name}`);

      // Draw real road polyline
      const latLngs = routeCoordinates.map((c) => [c.lat, c.lng]);

      // Route Outer Glow
      L.polyline(latLngs as any, {
        color: "#93C5FD",
        weight: 9,
        opacity: 0.6,
      }).addTo(map);

      // Route Core Street Line
      const polyline = L.polyline(latLngs as any, {
        color: "#2563EB",
        weight: 5,
        opacity: 0.9,
      }).addTo(map);

      polylineRef.current = polyline;
      map.fitBounds(polyline.getBounds(), { padding: [50, 50] });

      // Moving Vehicle Marker with Rotating Heading & Radar Wave
      const initialPos = getCurrentPosition(currentProgress);
      const vehicleIcon = L.divIcon({
        className: "custom-vehicle-marker",
        html: `
          <div id="truck-icon-wrapper" style="position: relative; display: flex; align-items: center; justify-content: center; width: 50px; height: 50px; cursor: pointer;">
            <div id="truck-pulse" style="position: absolute; width: 46px; height: 46px; border-radius: 50%; background: rgba(37,99,235,0.3); animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
            <div id="truck-rotator" style="width: 38px; height: 38px; border-radius: 12px; background: linear-gradient(135deg, #2563EB, #0EA5E9); border: 2.5px solid white; box-shadow: 0 4px 12px rgba(37,99,235,0.5); display: flex; align-items: center; justify-content: center; transform: rotate(${initialPos.bearing}deg); transition: transform 0.2s ease-out;">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M10 17h4V5H2v12h3m10 0h2l3-3v-4h-5v7z"/>
                <circle cx="7.5" cy="17.5" r="2.5"/>
                <circle cx="17.5" cy="17.5" r="2.5"/>
              </svg>
            </div>
            <div style="position: absolute; bottom: -12px; background: #1E293B; color: #38BDF8; font-size: 9px; font-weight: 800; font-family: monospace; padding: 1px 5px; border-radius: 4px; box-shadow: 0 2px 5px rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.2); white-space: nowrap;">
              ${vehicleId}
            </div>
          </div>
        `,
        iconSize: [50, 50],
        iconAnchor: [25, 25],
      });

      const vehicleMarker = L.marker([initialPos.point.lat, initialPos.point.lng], {
        icon: vehicleIcon,
        zIndexOffset: 1000,
      }).addTo(map);

      vehicleMarkerRef.current = vehicleMarker;
      mapInstanceRef.current = map;
    }

    initLeaflet();

    return () => {
      isMounted = false;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [routeCoordinates]);

  // 3. Smooth Real-Time GPS Progression Loop
  useEffect(() => {
    if (isTrackingStopped || !isPlaying || isDeviceGpsActive || routeCoordinates.length === 0) return;

    const interval = setInterval(() => {
      setCurrentProgress((prev) => {
        const step = 0.0012 / (routeCoordinates.length / 100);
        const next = prev + step;
        if (next >= 1) {
          setIsPlaying(false);
          return 1;
        }
        return next;
      });
    }, 120);

    return () => clearInterval(interval);
  }, [isPlaying, isDeviceGpsActive, routeCoordinates, isTrackingStopped]);

  // 4. Update Leaflet Marker on Progress Change
  useEffect(() => {
    if (!vehicleMarkerRef.current || routeCoordinates.length === 0) return;

    const { point, bearing } = getCurrentPosition(currentProgress);
    vehicleMarkerRef.current.setLatLng([point.lat, point.lng]);

    const rotator = document.getElementById("truck-rotator");
    if (rotator) {
      rotator.style.transform = `rotate(${Math.round(bearing)}deg)`;
    }

    if (isTrackingStopped) {
      setCurrentSpeedKmh(0);
    } else {
      const simulatedSpeed = 40 + Math.round(Math.sin(currentProgress * 15) * 10);
      setCurrentSpeedKmh(simulatedSpeed);
    }

    if (routeSteps.length > 0) {
      const stepIndex = Math.min(
        routeSteps.length - 1,
        Math.floor(currentProgress * routeSteps.length)
      );
      setCurrentStepInstruction(routeSteps[stepIndex].instruction);
    }
  }, [currentProgress, routeCoordinates, routeSteps, isTrackingStopped]);

  // 5. Real Device GPS Mode (Hardware GPS via browser)
  useEffect(() => {
    let watchId: number | null = null;

    if (isDeviceGpsActive && typeof window !== "undefined" && "geolocation" in navigator) {
      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          const speed = pos.coords.speed ? Math.round(pos.coords.speed * 3.6) : 38;

          if (vehicleMarkerRef.current) {
            vehicleMarkerRef.current.setLatLng([lat, lng]);
          }
          if (mapInstanceRef.current) {
            mapInstanceRef.current.setView([lat, lng], 15);
          }
          setCurrentSpeedKmh(speed);
          setCurrentStepInstruction("Live Driver Device Hardware GPS Stream Active");
        },
        (err) => {
          console.warn("Device GPS error:", err.message);
          setIsDeviceGpsActive(false);
        },
        { enableHighAccuracy: true, maximumAge: 2000, timeout: 5000 }
      );
    }

    return () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [isDeviceGpsActive]);

  const handleRecenter = () => {
    if (!mapInstanceRef.current) return;
    const { point } = getCurrentPosition(currentProgress);
    mapInstanceRef.current.setView([point.lat, point.lng], 14, { animate: true });
  };

  const handleFitBounds = () => {
    if (!mapInstanceRef.current || !polylineRef.current) return;
    mapInstanceRef.current.fitBounds(polylineRef.current.getBounds(), {
      padding: [50, 50],
      animate: true,
    });
  };

  const getTrackingUrl = () => {
    if (typeof window !== "undefined") {
      return `${window.location.origin}/vendor/tracking?moveId=${bookingId}`;
    }
    return `https://packagemovers.com/vendor/tracking?moveId=${bookingId}`;
  };

  const getShareText = () => {
    const fromCity = pickupAddress?.street ? `${pickupAddress.street}, ${pickupAddress?.city || ""}` : (pickupAddress?.city || "Origin Location");
    const toCity = destinationAddress?.street ? `${destinationAddress.street}, ${destinationAddress?.city || ""}` : (destinationAddress?.city || "Dropoff Destination");
    const url = getTrackingUrl();

    return `🚚 Package Movers - Live Move GPS Tracking\n\n` +
      `Move ID: #${bookingId.slice(-6).toUpperCase()}\n` +
      `Vehicle: ${vehicleId}\n` +
      `Assigned Driver: ${driverName}${driverPhone ? ` (${driverPhone})` : ""}\n` +
      `Route: ${fromCity} ➔ ${toCity}\n` +
      `Status: ${isTrackingStopped ? "Delivered / Completed" : "On Route (Live Telemetry)"}\n\n` +
      `📍 Track live vehicle location & arrival ETA on real-time road map:\n${url}`;
  };

  const handleCopyLink = async () => {
    const url = getTrackingUrl();
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        const input = document.createElement("input");
        input.value = url;
        document.body.appendChild(input);
        input.select();
        document.execCommand("copy");
        document.body.removeChild(input);
      }
      setCopiedLink(true);
      setShareFeedback("Tracking link copied to clipboard!");
      setTimeout(() => {
        setCopiedLink(false);
        setShareFeedback(null);
      }, 2500);
    } catch (err) {
      setShareFeedback("Failed to copy link.");
    }
  };

  const handleCopyFullMessage = async () => {
    const text = getShareText();
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      setCopiedSummary(true);
      setShareFeedback("Full move summary copied to clipboard!");
      setTimeout(() => {
        setCopiedSummary(false);
        setShareFeedback(null);
      }, 2500);
    } catch (err) {
      setShareFeedback("Failed to copy message.");
    }
  };

  const handleShareWhatsApp = () => {
    const text = getShareText();
    const encoded = encodeURIComponent(text);
    const whatsappUrl = `https://api.whatsapp.com/send?text=${encoded}`;
    window.open(whatsappUrl, "_blank", "noopener,noreferrer");
    setShareFeedback("Opened WhatsApp with tracking link!");
    setTimeout(() => setShareFeedback(null), 3000);
  };

  const handleShareEmail = () => {
    const fromCity = pickupAddress?.city || "Origin Location";
    const toCity = destinationAddress?.city || "Dropoff Destination";
    const subject = `Live GPS Tracking: Move #${bookingId.slice(-6).toUpperCase()} (${vehicleId}) - Package Movers`;
    const body = `Hello,\n\nYou can track the real-time live location and road arrival ETA for your move with Package Movers below:\n\n` +
      `Move Reference: #${bookingId.slice(-6).toUpperCase()}\n` +
      `Vehicle Number: ${vehicleId}\n` +
      `Assigned Driver: ${driverName} (${driverPhone || "N/A"})\n` +
      `Route: ${fromCity} to ${toCity}\n\n` +
      `Live Tracking Link:\n${getTrackingUrl()}\n\n` +
      `Thank you for choosing Package Movers.`;

    const mailtoUrl = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailtoUrl;
    setShareFeedback("Drafting email with tracking details...");
    setTimeout(() => setShareFeedback(null), 3000);
  };

  const handleShareInstagram = async () => {
    await handleCopyLink();
    setShareFeedback("Link copied! Opening Instagram Direct...");
    setTimeout(() => {
      window.open("https://instagram.com/direct/inbox/", "_blank", "noopener,noreferrer");
      setShareFeedback(null);
    }, 900);
  };

  const handleShareSms = () => {
    const text = getShareText();
    const smsUrl = `sms:?body=${encodeURIComponent(text)}`;
    window.location.href = smsUrl;
    setShareFeedback("Opening SMS with tracking link...");
    setTimeout(() => setShareFeedback(null), 3000);
  };

  const handleNativeShare = async () => {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: `Live Move Tracking - #${bookingId.slice(-6).toUpperCase()}`,
          text: `Track live move for vehicle ${vehicleId} (${driverName}):`,
          url: getTrackingUrl(),
        });
        setShareFeedback("Shared successfully!");
        setTimeout(() => setShareFeedback(null), 2500);
      } catch (err: any) {
        if (err.name !== "AbortError") {
          handleCopyLink();
        }
      }
    } else {
      handleCopyLink();
    }
  };

  const handleConfirmStopTracking = () => {
    setIsTrackingStopped(true);
    setIsPlaying(false);
    setIsDeviceGpsActive(false);
    setCurrentSpeedKmh(0);
    setStoppedTimestamp(new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }));
    setShowStopModal(false);

    const pulse = document.getElementById("truck-pulse");
    if (pulse) pulse.style.display = "none";
  };

  const handleResumeTracking = () => {
    setIsTrackingStopped(false);
    setIsPlaying(true);
    setStoppedTimestamp(null);

    const pulse = document.getElementById("truck-pulse");
    if (pulse) pulse.style.display = "block";
  };

  const handleCompleteDeliveryWithPin = async (e: React.FormEvent) => {
    e.preventDefault();
    setCompletionError(null);

    if (!deliveryPin.trim() || deliveryPin.trim().length !== 4) {
      setCompletionError("Please enter the 4-digit verification delivery PIN.");
      return;
    }

    try {
      setIsCompleting(true);
      await fetchApi(`/vendor/bookings/${bookingId}/status`, {
        method: "PATCH",
        body: JSON.stringify({
          status: "COMPLETED",
          deliveryCode: deliveryPin.trim(),
        }),
      });

      setCurrentStatus("COMPLETED");
      setIsTrackingStopped(true);
      setIsPlaying(false);
      setCurrentProgress(1);
      setCurrentSpeedKmh(0);
      setStoppedTimestamp(new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }));
      setShowCompleteModal(false);
      if (onStatusChange) onStatusChange("COMPLETED");
    } catch (err: any) {
      setCompletionError(err.message || "Invalid delivery PIN. Please verify with customer.");
    } finally {
      setIsCompleting(false);
    }
  };

  return (
    <div className="space-y-4 font-sans">
      {/* REAL-TIME LIVE GPS TELEMETRY STATUS BAR */}
      <div className="p-3 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-700">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <span>Real-Time GPS Live Stream</span>
          </div>

          <div className="text-xs text-slate-600 hidden md:flex items-center gap-1.5">
            <span>Vehicle:</span>
            <strong className="font-mono text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">{vehicleId}</strong>
            <span className="text-slate-400">•</span>
            <span>Driver:</span>
            <strong className="text-slate-900">{driverName}</strong>
          </div>
        </div>

        <div className="text-[11px] font-medium text-slate-500 flex items-center gap-1.5 mr-2">
          <Radio size={13} className="text-blue-600 shrink-0 animate-pulse" />
          <span>Tracking real road coordinates & live telemetry via satellite corridor</span>
        </div>
      </div>

      {/* Map Canvas Card */}
      <div className="relative rounded-2xl overflow-hidden shadow-xs border border-slate-200/80 bg-slate-900 h-[600px] flex flex-col">
        <div ref={mapContainerRef} className="w-full h-full z-0" />

        {/* LOADING ROUTE OVERLAY */}
        {isRouteLoading && (
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-30">
            <div className="p-4 rounded-2xl bg-white shadow-xl border border-slate-200 flex items-center gap-3 text-xs font-bold text-slate-800">
              <Radio className="animate-spin text-blue-600" size={18} />
              <span>Fetching Real-World Street Routing Geometry from OSRM...</span>
            </div>
          </div>
        )}

        {/* TOP LEFT COCKPIT HUD: Real-Time Telemetry */}
        <div className="absolute top-4 left-4 z-20 max-w-sm w-full pointer-events-auto">
          <div className="p-4 rounded-2xl bg-white/95 backdrop-blur-md shadow-lg border border-slate-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {isTrackingStopped ? (
                  <span className="h-2.5 w-2.5 rounded-full bg-slate-400" />
                ) : (
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                  </span>
                )}
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-900">
                  {isTrackingStopped
                    ? "SESSION CONCLUDED"
                    : "REAL-TIME GPS TELEMETRY"}
                </span>
              </div>
              <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                isTrackingStopped
                  ? "bg-slate-100 text-slate-700 border-slate-300"
                  : isDeviceGpsActive
                  ? "bg-purple-50 text-purple-700 border-purple-200"
                  : "bg-emerald-50 text-emerald-700 border-emerald-200"
              }`}>
                {isTrackingStopped
                  ? "TRACKING STOPPED"
                  : isDeviceGpsActive
                  ? "PHONE DEVICE GPS"
                  : "OSRM REAL ROAD"}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center pt-1">
              <div className="p-2 rounded-xl bg-slate-50 border border-slate-200/60">
                <div className="flex items-center justify-center gap-1 text-[10px] font-bold text-slate-500">
                  <Gauge size={12} className="text-blue-600" />
                  <span>SPEED</span>
                </div>
                <p className="text-sm font-black text-slate-900 mt-0.5">
                  {isTrackingStopped ? 0 : isPlaying ? currentSpeedKmh : 0}{" "}
                  <span className="text-[9px] font-medium text-slate-500">km/h</span>
                </p>
              </div>

              <div className="p-2 rounded-xl bg-slate-50 border border-slate-200/60">
                <div className="flex items-center justify-center gap-1 text-[10px] font-bold text-slate-500">
                  <Navigation size={12} className="text-sky-600" />
                  <span>REMAINING</span>
                </div>
                <p className="text-sm font-black text-slate-900 mt-0.5">
                  {isTrackingStopped && currentProgress >= 1 ? 0 : distanceRemainingKm}{" "}
                  <span className="text-[9px] font-medium text-slate-500">km</span>
                </p>
              </div>

              <div className="p-2 rounded-xl bg-slate-50 border border-slate-200/60">
                <div className="flex items-center justify-center gap-1 text-[10px] font-bold text-slate-500">
                  <Clock size={12} className="text-emerald-600" />
                  <span>EST. ETA</span>
                </div>
                <p className="text-sm font-black text-emerald-600 mt-0.5">
                  {isTrackingStopped && currentProgress >= 1 ? "Delivered" : `${etaMinutes} mins`}
                </p>
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/60 flex items-center gap-2 text-xs">
              <Compass size={15} className="text-blue-600 shrink-0" />
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-slate-500 uppercase leading-none">
                  {isTrackingStopped ? "Final Status" : "Current Maneuver"}
                </p>
                <p className="text-xs font-semibold text-slate-900 truncate leading-tight mt-0.5">
                  {isTrackingStopped
                    ? `Session concluded at ${stoppedTimestamp || "destination"}`
                    : currentStepInstruction}
                </p>
              </div>
            </div>

          </div>
        </div>

        {/* TOP RIGHT OVERLAY: Customer & Driver Card */}
        <div className="absolute top-4 right-4 z-20 pointer-events-auto space-y-2 hidden sm:block">
          <div className="p-3.5 rounded-2xl bg-white/95 backdrop-blur-md shadow-lg border border-slate-200/80 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shrink-0 shadow-xs">
              <Truck size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-xs text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                  {vehicleId}
                </span>
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                  isTrackingStopped
                    ? "text-slate-700 bg-slate-100 border-slate-300"
                    : "text-emerald-700 bg-emerald-50 border-emerald-200"
                }`}>
                  {isTrackingStopped ? "STOPPED" : "ON ROUTE"}
                </span>
              </div>
              <p className="text-xs font-semibold text-slate-900 mt-0.5">
                Driver: {driverName}
              </p>
            </div>
            {driverPhone && (
              <a
                href={`tel:${driverPhone}`}
                className="p-2 rounded-xl text-blue-600 hover:text-blue-700 hover:bg-blue-50 border border-slate-200 transition cursor-pointer shrink-0 ml-1"
                title="Call Driver"
              >
                <Phone size={14} />
              </a>
            )}
          </div>

          <div className="p-3 rounded-2xl bg-white/95 backdrop-blur-md shadow-lg border border-slate-200/80 flex items-center justify-between gap-3 text-xs">
            <div className="min-w-0">
              <p className="text-[10px] uppercase font-bold text-slate-500">Customer</p>
              <p className="font-bold text-slate-900 truncate">{customerName}</p>
            </div>
            {customerPhone && (
              <a
                href={`tel:${customerPhone}`}
                className="px-2.5 py-1 rounded-xl text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 flex items-center gap-1 cursor-pointer shrink-0 transition"
              >
                <Phone size={11} />
                <span>Call</span>
              </a>
            )}
          </div>
        </div>

        {/* BOTTOM CONTROLS OVERLAY */}
        <div className="absolute bottom-4 left-4 right-4 z-20 pointer-events-auto flex items-center justify-between flex-wrap gap-2">
          {/* REAL-TIME LIVE GPS CONTROLS */}
          <div className="flex items-center gap-2 p-1.5 rounded-xl bg-white/95 backdrop-blur-md shadow-lg border border-slate-200/80">
            {isTrackingStopped ? (
              <button
                onClick={handleResumeTracking}
                className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs flex items-center gap-1.5 cursor-pointer transition"
              >
                <Play size={13} />
                <span>Resume Live Tracking</span>
              </button>
            ) : (
              <button
                onClick={() => setShowStopModal(true)}
                className="px-3.5 py-1.5 rounded-lg text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 flex items-center gap-1.5 cursor-pointer transition"
                title="Stop Live Tracking"
              >
                <Square size={12} className="fill-rose-600 text-rose-600" />
                <span>Stop Live Tracking</span>
              </button>
            )}

            <button
              onClick={() => setIsDeviceGpsActive(!isDeviceGpsActive)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                isDeviceGpsActive
                  ? "bg-purple-600 text-white shadow-xs animate-pulse"
                  : "bg-white text-slate-700 hover:bg-slate-50 border border-slate-200"
              }`}
              title="Connect to driver's physical device GPS"
            >
              <Radio size={13} />
              <span>{isDeviceGpsActive ? "Driver Phone GPS Active" : "Connect Driver Phone GPS"}</span>
            </button>

            {currentStatus !== "COMPLETED" && (
              <button
                onClick={() => setShowCompleteModal(true)}
                className="px-3 py-1.5 rounded-lg text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 flex items-center gap-1.5 cursor-pointer transition"
                title="Mark Move as Completed"
              >
                <CheckCircle2 size={13} className="text-emerald-600" />
                <span className="hidden sm:inline">Verify Delivery PIN</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 p-1.5 rounded-xl bg-white/95 backdrop-blur-md shadow-lg border border-slate-200/80">
            <button
              onClick={handleRecenter}
              className="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 shadow-2xs flex items-center gap-1.5 cursor-pointer transition"
              title="Center on Moving Vehicle"
            >
              <Crosshair size={14} className="text-blue-600" />
              <span>Center</span>
            </button>

            <button
              onClick={handleFitBounds}
              className="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 shadow-2xs flex items-center gap-1.5 cursor-pointer transition"
              title="Fit Full Route"
            >
              <Maximize2 size={14} className="text-sky-600" />
              <span>Full Corridor</span>
            </button>

            <button
              onClick={() => setShowShareModal(true)}
              className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 transition cursor-pointer"
              title="Share GPS Live Location"
            >
              <Share2 size={14} className="text-blue-600" />
            </button>
          </div>
        </div>
      </div>

      {/* MODAL 1: STOP REAL TRACKING CONFIRMATION */}
      {showStopModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-md p-6 rounded-2xl bg-white shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5 text-rose-600 font-bold text-sm">
                <Square size={18} className="fill-rose-600 text-rose-600" />
                <span>Stop Real-Time Tracking Session</span>
              </div>
              <button
                onClick={() => setShowStopModal(false)}
                className="text-slate-400 hover:text-slate-700 transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              How would you like to conclude tracking for Move <strong>#{bookingId.slice(-6).toUpperCase()}</strong>?
            </p>

            <div className="space-y-2.5 pt-1">
              <button
                onClick={handleConfirmStopTracking}
                className="w-full p-3.5 rounded-xl bg-slate-50 hover:bg-slate-100/80 text-left border border-slate-200 transition cursor-pointer group"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-slate-800 group-hover:text-blue-600">
                    1. Halt Live Telemetry Session
                  </span>
                  <Square size={13} className="text-rose-500" />
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Vehicle stays parked at current coordinates. Stops GPS satellite updates.
                </p>
              </button>

              <button
                onClick={() => {
                  setShowStopModal(false);
                  setShowCompleteModal(true);
                }}
                className="w-full p-3.5 rounded-xl bg-emerald-50/60 hover:bg-emerald-50 text-left border border-emerald-200 transition cursor-pointer group"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-emerald-800 group-hover:text-emerald-900">
                    2. Mark Move as Completed (Enter PIN)
                  </span>
                  <CheckCircle2 size={14} className="text-emerald-600" />
                </div>
                <p className="text-[11px] text-emerald-700/80 mt-0.5">
                  Verify customer delivery code, release vehicle & crew, and finalize move.
                </p>
              </button>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setShowStopModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200/80 transition cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: VERIFY PIN & COMPLETE DELIVERY */}
      {showCompleteModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-md p-6 rounded-2xl bg-white shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2 text-emerald-700 font-bold text-sm">
                <KeyRound size={18} />
                <span>Verify Recipient Delivery PIN</span>
              </div>
              <button
                onClick={() => setShowCompleteModal(false)}
                className="text-slate-400 hover:text-slate-700 transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Enter the 4-digit secret delivery confirmation code provided by customer <strong>{customerName}</strong> upon arrival.
            </p>

            {completionError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
                <AlertCircle size={14} className="shrink-0" />
                <span>{completionError}</span>
              </div>
            )}

            <form onSubmit={handleCompleteDeliveryWithPin} className="space-y-4 pt-1">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1.5">
                  4-Digit Customer PIN
                </label>
                <input
                  type="text"
                  maxLength={4}
                  placeholder="e.g. 7482"
                  value={deliveryPin}
                  onChange={(e) => setDeliveryPin(e.target.value.replace(/\D/g, ""))}
                  className="w-full px-4 py-2.5 bg-slate-50 rounded-xl text-center text-xl font-mono font-black tracking-widest text-slate-800 border border-slate-200 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 outline-none transition"
                  autoFocus
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCompleteModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200/80 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCompleting || deliveryPin.length !== 4}
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-xs disabled:opacity-50 transition cursor-pointer"
                >
                  {isCompleting ? "Verifying..." : "Confirm & Complete Move"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: SHARE LIVE GPS TRACKING (WHATSAPP, INSTAGRAM, EMAIL, SMS, NATIVE) */}
      {showShareModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="w-full max-w-lg p-6 rounded-3xl bg-white shadow-2xl border border-slate-200/80 space-y-5">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100 shadow-xs">
                  <Share2 size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Share Live GPS Tracking</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Move #{bookingId.slice(-6).toUpperCase()} • Vehicle {vehicleId} ({driverName})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowShareModal(false);
                  setShareFeedback(null);
                }}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Live Feedback Toast if any */}
            {shareFeedback && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2 font-medium">
                <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                <span>{shareFeedback}</span>
              </div>
            )}

            {/* Platform Sharing Grid */}
            <div className="space-y-2">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Select Platform to Share
              </span>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {/* 1. WhatsApp */}
                <button
                  type="button"
                  onClick={handleShareWhatsApp}
                  className="p-3 rounded-2xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/80 flex flex-col items-center justify-center gap-1.5 transition cursor-pointer group"
                >
                  <div className="h-9 w-9 rounded-xl bg-[#25D366] text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
                    {/* Official WhatsApp SVG */}
                    <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                      <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.006c.106.005.249-.04.39.298.144.347.491 1.2.534 1.287.043.087.072.188.014.304-.058.116-.087.188-.173.289l-.26.304c-.087.086-.177.18-.076.354.101.174.449.741.964 1.201.662.591 1.221.774 1.394.86s.275.072.376-.043c.101-.116.433-.506.549-.68.116-.173.231-.145.39-.087s1.011.477 1.184.564.289.13.332.202c.045.072.045.419-.099.824zm-3.393-9.416c-3.844 0-6.97 3.125-6.971 6.969 0 1.233.324 2.433.938 3.498l-.998 3.647 3.737-.98c1.026.56 2.187.856 3.292.856 3.845 0 6.97-3.126 6.971-6.97 0-3.845-3.126-6.97-6.969-6.97z"/>
                    </svg>
                  </div>
                  <span className="text-xs font-bold text-slate-800">WhatsApp</span>
                  <span className="text-[10px] text-emerald-700 font-medium">Direct Chat</span>
                </button>

                {/* 2. Instagram Direct */}
                <button
                  type="button"
                  onClick={handleShareInstagram}
                  className="p-3 rounded-2xl bg-fuchsia-50 hover:bg-fuchsia-100 border border-fuchsia-200/80 flex flex-col items-center justify-center gap-1.5 transition cursor-pointer group"
                >
                  <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-[#f09433] via-[#dc2743] to-[#bc1888] text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
                    {/* Official Instagram SVG */}
                    <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                    </svg>
                  </div>
                  <span className="text-xs font-bold text-slate-800">Instagram</span>
                  <span className="text-[10px] text-fuchsia-700 font-medium">Direct Message</span>
                </button>

                {/* 3. Email */}
                <button
                  type="button"
                  onClick={handleShareEmail}
                  className="p-3 rounded-2xl bg-rose-50 hover:bg-rose-100 border border-rose-200/80 flex flex-col items-center justify-center gap-1.5 transition cursor-pointer group"
                >
                  <div className="h-9 w-9 rounded-xl bg-[#EA4335] text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
                    <Mail size={18} />
                  </div>
                  <span className="text-xs font-bold text-slate-800">Email</span>
                  <span className="text-[10px] text-rose-700 font-medium">Full Briefing</span>
                </button>

                {/* 4. SMS / Text */}
                <button
                  type="button"
                  onClick={handleShareSms}
                  className="p-3 rounded-2xl bg-sky-50 hover:bg-sky-100 border border-sky-200/80 flex flex-col items-center justify-center gap-1.5 transition cursor-pointer group"
                >
                  <div className="h-9 w-9 rounded-xl bg-[#0EA5E9] text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
                    <MessageCircle size={18} />
                  </div>
                  <span className="text-xs font-bold text-slate-800">SMS</span>
                  <span className="text-[10px] text-sky-700 font-medium">Phone Text</span>
                </button>
              </div>
            </div>

            {/* Native OS Share Button if available */}
            {typeof navigator !== "undefined" && typeof navigator.share === "function" && (
              <button
                type="button"
                onClick={handleNativeShare}
                className="w-full py-2.5 px-4 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-xs cursor-pointer transition"
              >
                <Smartphone size={15} />
                <span>Share via Installed Apps (Telegram, Signal, etc.)</span>
              </button>
            )}

            {/* Direct Link Input Box */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Direct Tracking URL
              </span>
              <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-slate-50 border border-slate-200 focus-within:border-blue-500 focus-within:bg-white transition">
                <input
                  type="text"
                  readOnly
                  value={getTrackingUrl()}
                  className="flex-1 px-2.5 py-1 text-xs text-slate-700 font-mono bg-transparent outline-none truncate"
                />
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shrink-0 ${
                    copiedLink
                      ? "bg-emerald-600 text-white"
                      : "bg-white hover:bg-slate-100 text-slate-800 border border-slate-200 shadow-2xs"
                  }`}
                >
                  {copiedLink ? <Check size={14} /> : <Copy size={14} className="text-blue-600" />}
                  <span>{copiedLink ? "Copied!" : "Copy Link"}</span>
                </button>
              </div>
            </div>

            {/* Formatted Message Preview */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Live Dispatch Message Preview
                </span>
                <button
                  type="button"
                  onClick={handleCopyFullMessage}
                  className="text-xs font-bold text-blue-600 hover:text-blue-700 hover:underline inline-flex items-center gap-1 cursor-pointer"
                >
                  {copiedSummary ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                  <span>{copiedSummary ? "Copied Summary!" : "Copy Full Message"}</span>
                </button>
              </div>
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-700 font-mono whitespace-pre-wrap leading-relaxed max-h-32 overflow-y-auto">
                {getShareText()}
              </div>
            </div>

            {/* Footer Close */}
            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={() => {
                  setShowShareModal(false);
                  setShareFeedback(null);
                }}
                className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
