import { DailyTimeline } from "@/components/DailyTimeline";
import Link from "next/link";
import { Headphones, Package } from "lucide-react";

const UZ_WEEKDAYS = ["Yakshanba", "Dushanba", "Seshanba", "Chorshanba", "Payshanba", "Juma", "Shanba"];
const UZ_MONTHS_FULL = [
  "Yanvar", "Fevral", "Mart", "Aprel", "May", "Iyun",
  "Iyul", "Avgust", "Sentabr", "Oktabr", "Noyabr", "Dekabr",
];

const quickAccess = [
  {
    icon: Headphones,
    title: "Jonli skriptlar va Yordamchi",
    description: "Sotuv skriptlari va e'tirozlar bo'limiga o'tish",
    href: "/sales-process/scripts",
  },
  {
    icon: Package,
    title: "Mahsulotlar va narxlar",
    description: "To'liq mahsulot katalogi va narxnoma",
    href: "/products",
  },
];

export const dynamic = "force-dynamic";

export default function HomePage() {
  const now = new Date();
  const dateLabel = `${now.getDate()}-${UZ_MONTHS_FULL[now.getMonth()]}, ${UZ_WEEKDAYS[now.getDay()]}`;

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-6 py-8">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-[32px] font-extrabold tracking-tight text-primary-dark">Salom, Operator</h1>
        <span className="text-[14px] text-text-secondary">{dateLabel}</span>
      </div>

      <div>
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-text-secondary">
          Tezkor o'tish
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          {quickAccess.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-start gap-4 rounded-2xl border border-border bg-surface p-5 shadow-soft hover:bg-primary/5"
            >
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <item.icon size={24} />
              </span>
              <span>
                <span className="block text-[15px] font-semibold text-primary-dark">{item.title}</span>
                <span className="mt-0.5 block text-[13px] text-text-secondary">{item.description}</span>
              </span>
            </Link>
          ))}
        </div>
      </div>

      <DailyTimeline />
    </div>
  );
}
