import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8 bg-slate-50">
      <div className="max-w-2xl w-full bg-white p-8 rounded-xl shadow-sm border border-slate-200">
        <h1 className="text-3xl font-bold text-slate-800 mb-4">Local Movers Marketplace</h1>
        <p className="text-slate-600 mb-8">
          Welcome to the Local Movers platform. Select a portal to get started:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Link
            href="/vendor"
            className="p-6 rounded-lg border border-indigo-100 bg-indigo-50/50 hover:bg-indigo-50 transition block"
          >
            <h2 className="text-xl font-semibold text-indigo-900 mb-2">Vendor Portal &rarr;</h2>
            <p className="text-sm text-indigo-700">
              Manage leads, submit quotes, assign moving teams, and view earnings.
            </p>
          </Link>

          <Link
            href="/admin"
            className="p-6 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 transition block"
          >
            <h2 className="text-xl font-semibold text-slate-900 mb-2">Admin Operations &rarr;</h2>
            <p className="text-sm text-slate-600">
              Approve vendors, monitor bookings, handle disputes, and configure policies.
            </p>
          </Link>
        </div>
      </div>
    </main>
  );
}
