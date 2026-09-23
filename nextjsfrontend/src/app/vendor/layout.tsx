"use client";

import { useState, useEffect, useMemo, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { fetchApi } from "@/lib/api";
import VendorSidebar, { ROUTE_PERMISSION_MAP } from "./components/VendorSidebar";
import VendorHeader from "./components/VendorHeader";
import { Loader2, ShieldAlert, ArrowLeft, Building2, Lock } from "lucide-react";

export default function VendorLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [vendorStatus, setVendorStatus] = useState<string>("APPROVED");
  const [verificationAccess, setVerificationAccess] = useState<string>("ALLOWED");
  const [verificationStatus, setVerificationStatus] = useState<string>("APPROVED");
  const [blockingItem, setBlockingItem] = useState<string | null>(null);
  const [reviewReason, setReviewReason] = useState<string | null>(null);
  const isLoginPage = Boolean(
    pathname === "/vendor/login" ||
    pathname?.startsWith("/vendor/login/") ||
    pathname?.startsWith("/vendor/login?") ||
    pathname?.includes("/vendor/login")
  );

  const [checkingAuth, setCheckingAuth] = useState(!isLoginPage);
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    setMounted(true);
    if (isLoginPage) {
      setCheckingAuth(false);
      return;
    }

    // Safety timeout: loading screen will NEVER show for more than 600ms
    const safetyTimer = setTimeout(() => {
      setCheckingAuth(false);
    }, 600);

    const verifyVendorAuthorization = () => {
      if (typeof window === "undefined") return;
      const token = localStorage.getItem("auth_token");
      const userStr = localStorage.getItem("auth_user");

      if (!token || !userStr) {
        clearTimeout(safetyTimer);
        setCheckingAuth(false);
        window.location.replace("/vendor/login");
        return;
      }

      try {
        const user = JSON.parse(userStr);
        if (user.role !== "vendor" && user.role !== "worker" && user.role !== "admin") {
          localStorage.removeItem("auth_token");
          localStorage.removeItem("auth_user");
          clearTimeout(safetyTimer);
          setCheckingAuth(false);
          window.location.replace("/vendor/login");
          return;
        }
        setCurrentUser(user);

        // Proactively refresh profile with dynamic permissions and verification gate in background
        fetchApi<{ user: any }>("/auth/me")
          .then((res) => {
            if (res?.user) {
              const u = res.user;
              const merged = { ...user, ...u, id: u._id || u.id };
              if (u.vendorId) {
                localStorage.setItem("active_vendor_id", String(u.vendorId));
              }

              if (u.companyVerificationAccess) {
                setVerificationAccess(u.companyVerificationAccess);
                localStorage.setItem("active_vendor_verification_access", u.companyVerificationAccess);
              }
              if (u.companyVerificationStatus) {
                setVerificationStatus(u.companyVerificationStatus);
                localStorage.setItem("active_vendor_verification_status", u.companyVerificationStatus);
              }
              if (u.vendorStatus) {
                setVendorStatus(u.vendorStatus);
                localStorage.setItem("active_vendor_status", u.vendorStatus);
              }
              if (u.companyVerification?.blockingItem) {
                setBlockingItem(u.companyVerification.blockingItem);
              }
              if (u.companyVerification?.reason) {
                setReviewReason(u.companyVerification.reason);
              }

              if (!merged.permissions || merged.permissions.length === 0) {
                // Secondary fallback lookup in /vendor/roles
                fetchApi<{ roles: any[] }>("/vendor/roles")
                  .then((roleRes) => {
                    if (roleRes?.roles) {
                      const norm = (s: string) => (s || "").toLowerCase().replace(/[^a-z0-9]/g, "");
                      const empRNorm = norm(merged.employeeRole);
                      const match = roleRes.roles.find(
                        (r) =>
                          (r.id && norm(r.id) === empRNorm) ||
                          (r.name && norm(r.name) === empRNorm)
                      );
                      if (match && Array.isArray(match.permissions)) {
                        merged.permissions = match.permissions;
                      }
                      localStorage.setItem("auth_user", JSON.stringify(merged));
                      setCurrentUser({ ...merged });
                    }
                  })
                  .catch(() => {});
              } else {
                localStorage.setItem("auth_user", JSON.stringify(merged));
                setCurrentUser(merged);
              }
            }
          })
          .catch(() => {});
      } catch (err) {
        localStorage.removeItem("auth_token");
        localStorage.removeItem("auth_user");
        clearTimeout(safetyTimer);
        setCheckingAuth(false);
        window.location.replace("/vendor/login");
        return;
      }

      clearTimeout(safetyTimer);
      setCheckingAuth(false);

      const storedStatus = localStorage.getItem("active_vendor_status");
      if (storedStatus) setVendorStatus(storedStatus);

      const storedAccess = localStorage.getItem("active_vendor_verification_access");
      if (storedAccess) setVerificationAccess(storedAccess);

      const storedVerStatus = localStorage.getItem("active_vendor_verification_status");
      if (storedVerStatus) setVerificationStatus(storedVerStatus);

      const storedBlocking = localStorage.getItem("active_vendor_blocking_item");
      if (storedBlocking) setBlockingItem(storedBlocking);

      const storedReason = localStorage.getItem("active_vendor_review_reason");
      if (storedReason) setReviewReason(storedReason);

      fetchApi<{ vendor?: any }>("/vendor/profile")
        .then((vRes) => {
          if (vRes?.vendor) {
            if (vRes.vendor.status) {
              setVendorStatus(vRes.vendor.status);
              localStorage.setItem("active_vendor_status", vRes.vendor.status);
            }
            if (vRes.vendor.verificationAccess) {
              setVerificationAccess(vRes.vendor.verificationAccess);
              localStorage.setItem("active_vendor_verification_access", vRes.vendor.verificationAccess);
            }
            if (vRes.vendor.verificationStatus) {
              setVerificationStatus(vRes.vendor.verificationStatus);
              localStorage.setItem("active_vendor_verification_status", vRes.vendor.verificationStatus);
            }
            if (vRes.vendor.blockingItem) {
              setBlockingItem(vRes.vendor.blockingItem);
            }
            if (vRes.vendor.verificationReason) {
              setReviewReason(vRes.vendor.verificationReason);
            }
          }
        })
        .catch(() => {});
    };

    verifyVendorAuthorization();

    const onPermissionsUpdated = () => {
      verifyVendorAuthorization();
    };

    window.addEventListener("focus", onPermissionsUpdated);
    window.addEventListener("vendor-permissions-updated", onPermissionsUpdated);
    window.addEventListener("vendor-status-updated", onPermissionsUpdated);
    window.addEventListener("permissions-updated", onPermissionsUpdated);

    return () => {
      clearTimeout(safetyTimer);
      window.removeEventListener("focus", onPermissionsUpdated);
      window.removeEventListener("vendor-permissions-updated", onPermissionsUpdated);
      window.removeEventListener("vendor-status-updated", onPermissionsUpdated);
      window.removeEventListener("permissions-updated", onPermissionsUpdated);
    };
  }, [pathname, isLoginPage, router]);

  const isRemediationOrDashboardRoute = useMemo(() => {
    return (
      pathname === "/vendor" ||
      pathname === "/vendor/company-profile" ||
      pathname?.startsWith("/vendor/company-profile/") ||
      pathname === "/vendor/profile" ||
      pathname === "/vendor/documents" ||
      pathname === "/vendor/my-permissions"
    );
  }, [pathname]);

  const isVerificationLocked = useMemo(() => {
    if (isLoginPage || !currentUser) return false;
    if (currentUser.role === "admin") return false;
    // Direct navigation to operational subpages (e.g. /vendor/bookings) is blocked when verification is restricted
    if ((vendorStatus !== "APPROVED" || verificationAccess === "RESTRICTED") && !isRemediationOrDashboardRoute) {
      return true;
    }
    return false;
  }, [isLoginPage, currentUser, vendorStatus, verificationAccess, isRemediationOrDashboardRoute]);

  // Dynamic route authorization guard for non-admin employees based on permissions
  const isAuthorizedRoute = useMemo(() => {
    if (isLoginPage || !currentUser) return true;
    if (currentUser.role === "vendor" || currentUser.role === "admin") return true;

    // Overview dashboard, personal capability inspector & personal profile always permitted for all authenticated staff
    if (pathname === "/vendor" || pathname === "/vendor/my-permissions" || pathname === "/vendor/profile") return true;

    const userPerms: string[] = Array.isArray(currentUser.permissions) ? currentUser.permissions : [];

    // Wildcard permission grants all routes
    if (userPerms.includes("*")) return true;

    // Dynamic permission check: find matching route in ROUTE_PERMISSION_MAP
    let matchingRoute: string | undefined = undefined;
    if (ROUTE_PERMISSION_MAP[pathname]) {
      matchingRoute = pathname;
    } else {
      // Find most specific matching route prefix, excluding base "/vendor", "/vendor/my-permissions", and "/vendor/profile"
      const subRoutes = Object.keys(ROUTE_PERMISSION_MAP)
        .filter((r) => r !== "/vendor" && r !== "/vendor/my-permissions" && r !== "/vendor/profile")
        .sort((a, b) => b.length - a.length);
      matchingRoute = subRoutes.find((r) => pathname.startsWith(r + "/"));
    }

    if (!matchingRoute && pathname === "/vendor") {
      matchingRoute = "/vendor";
    }

    if (!matchingRoute) {
      return false;
    }

    // Always allow personal permissions inspector and personal profile
    if (matchingRoute === "/vendor/my-permissions" || matchingRoute === "/vendor/profile") {
      return true;
    }

    const required = ROUTE_PERMISSION_MAP[matchingRoute];
    // If only wildcard is required and it's an open route
    if (required && required.length === 1 && required[0] === "*") {
      return true;
    }

    if (userPerms.length > 0) {
      return Boolean(required && required.some((perm) => perm !== "*" && userPerms.includes(perm)));
    }

    // Role-based fallback for unconfigured accounts (strictly matching role key, NO broad .includes('manager')!)
    const empR = (currentUser.employeeRole || "worker").toLowerCase().trim();
    if (empR === "manager") return true;

    let allowed: string[] = ["/vendor", "/vendor/my-permissions", "/vendor/profile"];
    if (empR === "hr") {
      allowed = ["/vendor", "/vendor/my-permissions", "/vendor/profile", "/vendor/employees", "/vendor/roles", "/vendor/permissions", "/vendor/audit-logs", "/vendor/reports"];
    } else if (empR === "lead_estimator" || empR.includes("estimate") || empR.includes("quote")) {
      allowed = ["/vendor", "/vendor/my-permissions", "/vendor/profile", "/vendor/demand", "/vendor/quotations"];
    } else if (empR === "fleet_supervisor" || empR.includes("fleet") || empR.includes("transport")) {
      allowed = ["/vendor", "/vendor/my-permissions", "/vendor/profile", "/vendor/bookings", "/vendor/tracking", "/vendor/workers", "/vendor/vehicles"];
    } else {
      allowed = ["/vendor", "/vendor/my-permissions", "/vendor/profile", "/vendor/bookings", "/vendor/vehicles"];
    }

    return allowed.some((p) => pathname === p || (p !== "/vendor" && pathname.startsWith(p + "/")));
  }, [pathname, isLoginPage, currentUser]);

  // Login page layout without shell
  if (isLoginPage) {
    return (
      <div className="font-sans min-h-screen bg-[#F8FAFC]" suppressHydrationWarning>
        {children}
      </div>
    );
  }

  // Session validation loading state
  if (!mounted || checkingAuth) {
    return (
      <div
        className="font-sans min-h-screen bg-[#F8FAFC] flex items-center justify-center text-slate-900 antialiased"
        suppressHydrationWarning
      >
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          <p className="text-sm font-semibold text-slate-700">Validating vendor session...</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="font-sans min-h-screen bg-[#F8FAFC] flex text-slate-900 antialiased selection:bg-blue-600 selection:text-white"
      suppressHydrationWarning
    >
      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative w-64 max-w-[80vw] h-full shadow-2xl z-10 bg-white border-r border-slate-200">
            <VendorSidebar onClose={() => setMobileMenuOpen(false)} />
          </div>
        </div>
      )}

      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-64 shrink-0 h-screen sticky top-0 z-20">
        <VendorSidebar />
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <VendorHeader onMenuToggle={() => setMobileMenuOpen(true)} />
        {!isLoginPage && (vendorStatus !== "APPROVED" || verificationAccess === "RESTRICTED") && (
          <div
            className={`px-4 py-2 text-xs font-medium border-b flex items-center justify-between ${
              vendorStatus === "SUSPENDED" || verificationStatus === "SUSPENDED"
                ? "bg-rose-50 border-rose-200 text-rose-800"
                : vendorStatus === "CHANGES_REQUESTED" || verificationStatus === "CHANGES_REQUESTED"
                ? "bg-amber-50 border-amber-200 text-amber-800"
                : "bg-blue-50 border-blue-200 text-blue-800"
            }`}
          >
            <div className="flex items-center gap-2">
              <Lock size={14} className="shrink-0" />
              <span>
                Company Verification: <strong>{(verificationStatus || vendorStatus).replace("_", " ")}</strong>
                {blockingItem ? ` (Blocking: ${blockingItem})` : ""} — Operational features unlock upon administrative approval.
              </span>
            </div>
            <Link href="/vendor/company-profile" className="underline font-semibold hover:opacity-80">
              View Profile & Documents
            </Link>
          </div>
        )}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {isVerificationLocked ? (
            <div className="p-8 sm:p-12 max-w-lg mx-auto text-center space-y-5 bg-white rounded-3xl shadow-sm border border-slate-200/80 my-12 animate-scaleUp">
              <div
                className={`h-14 w-14 rounded-2xl mx-auto flex items-center justify-center border ${
                  vendorStatus === "SUSPENDED" || verificationStatus === "SUSPENDED"
                    ? "bg-rose-50 text-rose-600 border-rose-200"
                    : vendorStatus === "CHANGES_REQUESTED" || verificationStatus === "CHANGES_REQUESTED"
                    ? "bg-amber-50 text-amber-600 border-amber-200"
                    : "bg-blue-50 text-blue-600 border-blue-200"
                }`}
              >
                <Lock size={26} />
              </div>
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider mb-2 border bg-slate-50 text-slate-700 border-slate-200">
                  {(verificationStatus || vendorStatus).replace("_", " ")}
                </div>
                <h3 className="text-lg font-bold text-slate-900">
                  {vendorStatus === "SUSPENDED" || verificationStatus === "SUSPENDED"
                    ? "Carrier Account Suspended"
                    : vendorStatus === "CHANGES_REQUESTED" || verificationStatus === "CHANGES_REQUESTED"
                    ? "Compliance Revisions Requested"
                    : vendorStatus === "REJECTED" || verificationStatus === "REJECTED"
                    ? "Carrier Application Rejected"
                    : "Verification Required"}
                </h3>
                <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                  {vendorStatus === "SUSPENDED"
                    ? "This carrier company account has been suspended by platform administration. Operational modules are disabled."
                    : "Operational modules (quotations, dispatch, live tracking, crew dispatch, and marketplace catalog) are locked until all 6 compliance documents are reviewed and approved by platform administrators."}
                </p>
                {blockingItem && (
                  <p className="text-xs font-bold text-rose-600 mt-2">
                    Action Required: {blockingItem}
                  </p>
                )}
                {reviewReason && (
                  <p className="text-xs italic text-slate-600 mt-1">
                    "{reviewReason}"
                  </p>
                )}
              </div>
              <div className="pt-2 flex justify-center gap-3">
                <Link
                  href="/vendor/company-profile"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-xs transition"
                >
                  <Building2 size={15} />
                  <span>Go to Company Profile & Verification</span>
                </Link>
              </div>
            </div>
          ) : isAuthorizedRoute ? (
            children
          ) : (
            <div className="p-8 sm:p-12 max-w-md mx-auto text-center space-y-4 bg-white rounded-3xl shadow-sm border border-slate-200/80 my-12 animate-scaleUp">
              <div className="h-12 w-12 rounded-2xl bg-amber-50 text-amber-600 mx-auto flex items-center justify-center border border-amber-200">
                <ShieldAlert size={24} />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Access Restricted</h3>
                <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                  Your assigned role designation (
                  <strong className="text-slate-800">
                    {currentUser?.employeeRole || "Crew Member"}
                  </strong>
                  ) is not authorized to access this module. Please request access from your company carrier administrator.
                </p>
              </div>
              <div className="pt-2">
                <Link
                  href="/vendor"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 transition"
                >
                  <ArrowLeft size={14} />
                  <span>Return to Dashboard</span>
                </Link>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
