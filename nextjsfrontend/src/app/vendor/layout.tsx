"use client";

import { useState, useEffect, useMemo, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { fetchApi } from "@/lib/api";
import VendorSidebar, { ROUTE_PERMISSION_MAP } from "./components/VendorSidebar";
import VendorHeader from "./components/VendorHeader";
import { Loader2, ShieldAlert, ArrowLeft } from "lucide-react";

export default function VendorLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
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

    if (typeof window !== "undefined") {
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

        // Proactively refresh profile with dynamic permissions in background
        fetchApi<{ user: any }>("/auth/me")
          .then((res) => {
            if (res?.user) {
              const u = res.user;
              const merged = { ...user, ...u, id: u._id || u.id };
              if (u.vendorId) {
                localStorage.setItem("active_vendor_id", String(u.vendorId));
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
    }

    return () => clearTimeout(safetyTimer);
  }, [pathname, isLoginPage, router]);

  // Dynamic route authorization guard for non-admin employees based on permissions
  const isAuthorizedRoute = useMemo(() => {
    if (isLoginPage || !currentUser) return true;
    if (currentUser.role === "vendor" || currentUser.role === "admin") return true;

    // Overview dashboard always permitted for authenticated staff
    if (pathname === "/vendor") return true;

    const userPerms: string[] = Array.isArray(currentUser.permissions) ? currentUser.permissions : [];

    // Wildcard permission grants all routes
    if (userPerms.includes("*")) return true;

    // Dynamic permission check: find matching route in ROUTE_PERMISSION_MAP
    let matchingRoute: string | undefined = undefined;
    if (ROUTE_PERMISSION_MAP[pathname]) {
      matchingRoute = pathname;
    } else {
      // Find most specific matching route prefix, excluding base "/vendor"
      const subRoutes = Object.keys(ROUTE_PERMISSION_MAP)
        .filter((r) => r !== "/vendor")
        .sort((a, b) => b.length - a.length);
      matchingRoute = subRoutes.find((r) => pathname.startsWith(r + "/"));
    }

    if (!matchingRoute && pathname === "/vendor") {
      matchingRoute = "/vendor";
    }

    if (!matchingRoute) {
      return false;
    }

    const required = ROUTE_PERMISSION_MAP[matchingRoute];
    if (userPerms.length > 0) {
      return Boolean(required && required.some((perm) => userPerms.includes(perm)));
    }

    // Role-based fallback for unconfigured accounts (strictly matching role key, NO broad .includes('manager')!)
    const empR = (currentUser.employeeRole || "worker").toLowerCase().trim();
    if (empR === "manager") return true;

    let allowed: string[] = ["/vendor"];
    if (empR === "hr") {
      allowed = ["/vendor", "/vendor/employees", "/vendor/roles", "/vendor/permissions", "/vendor/audit-logs", "/vendor/reports"];
    } else if (empR === "lead_estimator" || empR.includes("estimate") || empR.includes("quote")) {
      allowed = ["/vendor", "/vendor/demand", "/vendor/quotations"];
    } else if (empR === "fleet_supervisor" || empR.includes("fleet") || empR.includes("transport")) {
      allowed = ["/vendor", "/vendor/bookings", "/vendor/tracking", "/vendor/workers", "/vendor/vehicles"];
    } else {
      allowed = ["/vendor", "/vendor/bookings", "/vendor/vehicles"];
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
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {isAuthorizedRoute ? (
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
