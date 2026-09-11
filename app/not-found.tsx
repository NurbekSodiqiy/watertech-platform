import Link from "next/link";
import { FileQuestion, Home } from "lucide-react";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center gap-6 px-6 py-24 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
        <FileQuestion size={32} />
      </span>
      <div className="space-y-2">
        <h1 className="text-[24px] font-bold text-primary-dark">Sahifa topilmadi</h1>
        <p className="text-[14px] text-text-secondary">
          Siz izlagan sahifa mavjud emas yoki ko'chirilgan bo'lishi mumkin.
        </p>
      </div>
      <Link
        href="/"
        className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-[13px] font-medium text-surface shadow-softer transition-colors hover:bg-primary-hover"
      >
        <Home size={16} />
        Bosh sahifaga qaytish
      </Link>
    </div>
  );
}
