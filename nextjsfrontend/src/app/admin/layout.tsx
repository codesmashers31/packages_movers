"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import AdminSidebar from "./components/AdminSidebar";
import AdminHeader from "./components/AdminHeader";
import ClientErrorHandler from "./components/ClientErrorHandler";
import { Loader2 } from "lucide-react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  const isLoginPage = pathname === "/admin/login";

  useEffect(() => {
    if (isLoginPage) {
      setCheckingAuth(false);
      return;
    }

    if (typeof window !== "undefined") {
      const token = localStorage.getItem("auth_token");
      const userStr = localStorage.getItem("auth_user");

      if (!token || !userStr) {
        router.push("/admin/login");
        return;
      }

      try {
        const user = JSON.parse(userStr);
        if (user.role !== "admin") {
          localStorage.removeItem("auth_token");
          localStorage.removeItem("auth_user");
          router.push("/admin/login");
          return;
        }
      } catch (err) {
        router.push("/admin/login");
        return;
      }

      setCheckingAuth(false);
    }
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
      <aside className="hidden lg:block w-64 shrink-0 h-screen sticky top-0">
        <AdminSidebar />
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <AdminHeader onMenuToggle={() => setMobileMenuOpen(true)} />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );

}
