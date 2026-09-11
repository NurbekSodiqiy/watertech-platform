"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center gap-6 px-6 py-24 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
        <AlertTriangle size={32} />
      </span>
      <div className="space-y-2">
        <h1 className="text-[24px] font-bold text-primary-dark">Xatolik yuz berdi</h1>
        <p className="text-[14px] text-text-secondary">
          Sahifani yuklashda kutilmagan xatolik yuz berdi. Qayta urinib ko'ring.
        </p>
      </div>
      <button
        onClick={() => reset()}
        className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-[13px] font-medium text-surface shadow-softer transition-colors hover:bg-primary-hover"
      >
        <RefreshCw size={16} />
        Qayta urinib ko'ring
      </button>
    </div>
  );
}
