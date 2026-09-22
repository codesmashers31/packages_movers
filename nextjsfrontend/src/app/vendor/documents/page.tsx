"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Building2, ArrowRight } from "lucide-react";

export default function VendorDocumentsPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/vendor/company-profile");
  }, [router]);

  return (
    <div className="p-8 max-w-md mx-auto text-center space-y-4 my-12">
      <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
        <Building2 size={24} />
      </div>
      <div>
        <h2 className="text-base font-bold text-slate-900">Redirecting to Company Profile</h2>
        <p className="text-xs text-slate-500 mt-1">
          Compliance documents are now unified under Company Profile & Verification.
        </p>
      </div>
      <Link
        href="/vendor/company-profile"
        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 transition"
      >
        <span>Go to Company Profile</span>
        <ArrowRight size={14} />
      </Link>
    </div>
  );
}
