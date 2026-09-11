import Link from "next/link";
import { Truck, ShieldCheck, ArrowRight } from "lucide-react";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 sm:p-12 bg-[#EEF2F6]">
      <div className="max-w-3xl w-full bg-[#EEF2F6] p-8 sm:p-12 rounded-3xl shadow-neu-flat border border-white/80">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-[#2563EB] to-[#0EA5E9] flex items-center justify-center text-white font-bold text-lg shadow-neu-raised-sm">
            PM
          </div>
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-[#0EA5E9]">Enterprise Logistics</span>
            <h1 className="text-3xl font-extrabold text-[#1E293B] tracking-tight">Package Movers Platform</h1>
          </div>
        </div>
        
        <p className="text-sm text-[#64748B] mb-8 leading-relaxed">
          Welcome to the Package Movers digital marketplace. Seamlessly dispatch, manage fleet operations, and execute corporate moves with end-to-end verified telemetry.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <Link
            href="/vendor"
            className="p-6 rounded-2xl bg-[#EEF2F6] shadow-neu-raised hover:shadow-neu-flat active:shadow-neu-pressed border border-white/80 transition-all duration-200 block group"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="h-10 w-10 rounded-xl bg-sky-50 text-[#0EA5E9] flex items-center justify-center shadow-neu-inset-sm">
                <Truck size={20} />
              </div>
              <span className="text-xs font-semibold text-[#0EA5E9] group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">
                Access Portal &rarr;
              </span>
            </div>
            <h2 className="text-lg font-bold text-[#1E293B] mb-2 group-hover:text-[#0EA5E9] transition-colors">Vendor Fleet Portal</h2>
            <p className="text-xs text-[#64748B] leading-relaxed">
              Manage incoming leads, submit dispatch quotes, assign moving crews, and track active settlements.
            </p>
          </Link>

          <Link
            href="/admin"
            className="p-6 rounded-2xl bg-[#EEF2F6] shadow-neu-raised hover:shadow-neu-flat active:shadow-neu-pressed border border-white/80 transition-all duration-200 block group"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="h-10 w-10 rounded-xl bg-blue-50 text-[#2563EB] flex items-center justify-center shadow-neu-inset-sm">
                <ShieldCheck size={20} />
              </div>
              <span className="text-xs font-semibold text-[#2563EB] group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">
                Operations Console &rarr;
              </span>
            </div>
            <h2 className="text-lg font-bold text-[#1E293B] mb-2 group-hover:text-[#2563EB] transition-colors">Admin Operations</h2>
            <p className="text-xs text-[#64748B] leading-relaxed">
              Approve vendors, oversee live dispatch, audit security telemetry, and configure system policies.
            </p>
          </Link>
        </div>
      </div>
    </main>
  );
}
