import Link from "next/link";
import { Truck, CalendarCheck, Users, ArrowLeft } from "lucide-react";

export default function VendorDashboard() {
  return (
    <div className="min-h-screen bg-[#EEF2F6] p-6 sm:p-10 font-sans text-[#1E293B]">
      <header className="max-w-6xl mx-auto flex items-center justify-between pb-6 border-b border-[#D9E2EC]">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-[#2563EB] to-[#0EA5E9] flex items-center justify-center text-white font-bold text-sm shadow-neu-raised-sm">
            VM
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[#1E293B]">Vendor Management Portal</h1>
            <p className="text-xs text-[#64748B]">Manage quotes, crew assignments, and fleet logistics</p>
          </div>
        </div>
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#EEF2F6] shadow-neu-raised-sm hover:shadow-neu-flat active:shadow-neu-pressed border border-white/80 text-xs font-semibold text-[#2563EB] transition cursor-pointer"
        >
          <ArrowLeft size={14} />
          <span>Back to Home</span>
        </Link>
      </header>

      <main className="max-w-6xl mx-auto mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-[#EEF2F6] p-6 rounded-2xl shadow-neu-flat border border-white/80 transition-all hover:shadow-neu-raised">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-xs uppercase tracking-wider text-[#64748B]">Open Leads</h2>
            <div className="p-2 rounded-xl bg-[#EEF2F6] shadow-neu-inset-sm text-[#2563EB]">
              <Truck size={18} />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-[#2563EB] mt-3">0</p>
          <span className="text-xs text-[#64748B] mt-1 block">Available requests in your service areas</span>
        </div>

        <div className="bg-[#EEF2F6] p-6 rounded-2xl shadow-neu-flat border border-white/80 transition-all hover:shadow-neu-raised">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-xs uppercase tracking-wider text-[#64748B]">Active Bookings</h2>
            <div className="p-2 rounded-xl bg-[#EEF2F6] shadow-neu-inset-sm text-[#14B8A6]">
              <CalendarCheck size={18} />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-[#14B8A6] mt-3">0</p>
          <span className="text-xs text-[#64748B] mt-1 block">Confirmed moves in dispatch</span>
        </div>

        <div className="bg-[#EEF2F6] p-6 rounded-2xl shadow-neu-flat border border-white/80 transition-all hover:shadow-neu-raised">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-xs uppercase tracking-wider text-[#64748B]">Assigned Crew</h2>
            <div className="p-2 rounded-xl bg-[#EEF2F6] shadow-neu-inset-sm text-[#0EA5E9]">
              <Users size={18} />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-[#0EA5E9] mt-3">0</p>
          <span className="text-xs text-[#64748B] mt-1 block">Active logistics operators</span>
        </div>
      </main>
    </div>
  );
}
