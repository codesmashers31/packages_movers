"use client";

import { useState, useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import AdminSidebar from "./components/AdminSidebar";
import AdminHeader from "./components/AdminHeader";
import ClientErrorHandler from "./components/ClientErrorHandler";
import { fetchApi } from "@/lib/api";
import { Loader2, AlertTriangle } from "lucide-react";

export default function AdminLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isLoginPage = Boolean(
    pathname === "/admin/login" ||
    pathname?.startsWith("/admin/login/") ||
    pathname?.startsWith("/admin/login?") ||
    pathname?.includes("/admin/login")
  );

  const [checkingAuth, setCheckingAuth] = useState(!isLoginPage);
  const [isAuthorized, setIsAuthorized] = useState(true);
  const [missingPerm, setMissingPerm] = useState("");

  useEffect(() => {
    if (isLoginPage) {
      setCheckingAuth(false);
      return;
    }

    const verifyAdminAuthorization = async () => {
      if (typeof window === "undefined") return;
      const token = localStorage.getItem("auth_token");
      const userStr = localStorage.getItem("auth_user");

      if (!token || !userStr) {
        setCheckingAuth(false);
        window.location.replace("/admin/login");
        return;
      }

      try {
        let user = JSON.parse(userStr);
        if (user.role !== "admin") {
          localStorage.removeItem("auth_token");
          localStorage.removeItem("auth_user");
          setCheckingAuth(false);
          window.location.replace("/admin/login");
          return;
        }

        // Authoritatively query /auth/me from backend to avoid relying on stale local storage
        try {
          const meRes = await fetchApi<{ user: any }>("/auth/me");
          if (meRes?.user) {
            user = { ...user, ...meRes.user, id: meRes.user._id || meRes.user.id };
            localStorage.setItem("auth_user", JSON.stringify(user));
          }
        } catch (meErr) {
          // Keep cached user if network is momentarily unavailable
        }

        const userPerms: string[] = Array.isArray(user.permissions) ? user.permissions : [];
        const isSuper = user.phone === "+919876543210" || user.adminRole === "super_admin" || userPerms.includes("*");

        if (!isSuper) {
          const routeMap: Record<string, string | string[]> = {
            "/admin/users": ["users:view", "users:create", "users:edit", "users:suspend"],
            "/admin/employees": ["staff:view", "staff:manage"],
            "/admin/roles": ["permissions:manage", "staff:manage"],
            "/admin/permissions": ["permissions:manage", "staff:manage"],
            "/admin/vendors": ["vendors:view", "vendors:approve", "vendors:suspend"],
            "/admin/vendor-requests": ["vendors:approve", "vendors:view"],
            "/admin/documents": ["documents:view", "documents:verify", "vendors:view"],
            "/admin/packages": ["packages:manage"],
            "/admin/service-areas": ["service_areas:manage"],
            "/admin/bookings": ["bookings:view", "bookings:manage"],
            "/admin/disputes": ["disputes:view", "disputes:manage"],
            "/admin/reports": ["reports:view"],
            "/admin/audit-logs": ["audit:view"],
            "/admin/settings": ["settings:manage"],
          };

          let matchedPerm: string | string[] | undefined;
          for (const [route, perm] of Object.entries(routeMap)) {
            if (pathname === route || pathname.startsWith(`${route}/`)) {
              matchedPerm = perm;
              break;
            }
          }

          if (matchedPerm) {
            const hasPerm = Array.isArray(matchedPerm)
              ? matchedPerm.some((p) => userPerms.includes(p))
              : userPerms.includes(matchedPerm);
            if (!hasPerm) {
              setIsAuthorized(false);
              setMissingPerm(Array.isArray(matchedPerm) ? matchedPerm.join(" or ") : matchedPerm);
              setCheckingAuth(false);
              return;
            }
          }
        }

        setIsAuthorized(true);
      } catch (err) {
        localStorage.removeItem("auth_token");
        localStorage.removeItem("auth_user");
        setCheckingAuth(false);
        window.location.replace("/admin/login");
        return;
      } finally {
        setCheckingAuth(false);
      }
    };

    verifyAdminAuthorization();

    const onPermissionsUpdated = () => {
      verifyAdminAuthorization();
    };

    window.addEventListener("focus", onPermissionsUpdated);
    window.addEventListener("admin-permissions-updated", onPermissionsUpdated);
    window.addEventListener("permissions-updated", onPermissionsUpdated);

    return () => {
      window.removeEventListener("focus", onPermissionsUpdated);
      window.removeEventListener("admin-permissions-updated", onPermissionsUpdated);
      window.removeEventListener("permissions-updated", onPermissionsUpdated);
    };
  }, [pathname, isLoginPage, router]);

  // If on login page, don't show admin chrome
  if (isLoginPage) {
    return (
      <div className="font-sans">
        <ClientErrorHandler />
        {children}
      </div>
    );
  }

  // Loading state while checking local credentials
  if (checkingAuth) {
    return (
      <div className="font-sans min-h-screen flex items-center justify-center bg-[#EEF2F6]">
        <ClientErrorHandler />
        <div className="flex flex-col items-center gap-2">
          <Loader2 size={24} className="animate-spin text-[#2563EB]" />
          <p className="text-xs font-medium text-[#64748B]">Checking credentials...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="font-sans min-h-screen bg-[#EEF2F6] flex text-[#1E293B] antialiased selection:bg-[#2563EB] selection:text-white">
      <ClientErrorHandler />
      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-[#1E293B]/50 backdrop-blur-2xs transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative w-64 max-w-[80vw] h-full shadow-2xl z-10 bg-[#EEF2F6]">
            <AdminSidebar onClose={() => setMobileMenuOpen(false)} />
          </div>
        </div>
      )}

      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-64 shrink-0 h-screen sticky top-0 z-30">
        <AdminSidebar />
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <AdminHeader onMenuToggle={() => setMobileMenuOpen(true)} />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {!isAuthorized ? (
            <div className="py-16 flex flex-col items-center justify-center text-center">
              <div className="p-6 rounded-2xl bg-[#EEF2F6] border border-white/80 max-w-md shadow-neu-raised">
                <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto mb-3 shadow-neu-flat">
                  <AlertTriangle size={24} />
                </div>
                <h2 className="text-base font-bold text-[#1E293B] mb-1.5">Access Restricted</h2>
                <p className="text-xs text-[#64748B] mb-4 leading-relaxed">
                  Your platform administrative role does not possess the capability grant for this module. Required permission:{" "}
                  <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 font-mono text-[11px] font-semibold">{missingPerm}</span>.
                </p>
                <button
                  onClick={() => router.push("/admin")}
                  className="px-5 py-2.5 rounded-xl bg-[#2563EB] text-white text-xs font-bold hover:bg-blue-700 shadow-neu-raised transition cursor-pointer"
                >
                  Return to Admin Dashboard
                </button>
              </div>
            </div>
          ) : (
            children
          )}
        </main>
      </div>
    </div>
  );

}
