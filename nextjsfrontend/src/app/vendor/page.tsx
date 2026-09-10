import Link from "next/link";

export default function VendorDashboard() {
  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <header className="max-w-6xl mx-auto flex items-center justify-between pb-6 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Vendor Management Portal</h1>
          <p className="text-sm text-slate-500">Manage quotes, assignments, and operations</p>
        </div>
        <Link href="/" className="text-sm text-indigo-600 hover:underline">
          &larr; Back to Home
        </Link>
      </header>

      <main className="max-w-6xl mx-auto mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
          <h2 className="font-semibold text-slate-700">Open Leads</h2>
          <p className="text-3xl font-bold text-indigo-600 mt-2">0</p>
          <span className="text-xs text-slate-400">Available requests in your service areas</span>
        </div>

        <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
          <h2 className="font-semibold text-slate-700">Active Bookings</h2>
          <p className="text-3xl font-bold text-emerald-600 mt-2">0</p>
          <span className="text-xs text-slate-400">Confirmed moves scheduled</span>
        </div>

        <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
          <h2 className="font-semibold text-slate-700">Assigned Crew</h2>
          <p className="text-3xl font-bold text-slate-800 mt-2">0</p>
          <span className="text-xs text-slate-400">Active workers in team</span>
        </div>
      </main>
    </div>
  );
}
