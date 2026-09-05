import Link from "next/link";
import { ExternalLink, Clock, Sparkles, GraduationCap, LayoutGrid, Table2, FileSpreadsheet, MessageSquareText } from "lucide-react";
import { changelogEntries } from "@/lib/mock-data/changelog";
import { faqItems } from "@/lib/mock-data/faq";

const quickLinks = [
  { label: "CRM (amoCRM)", icon: LayoutGrid },
  { label: "Google Sheets", icon: FileSpreadsheet },
  { label: "Proposal Template", icon: Table2 },
  { label: "Sales Chat Bot", icon: MessageSquareText },
];

const neededToday = [
  "[Placeholder — review today's assigned leads in CRM]",
  "[Placeholder — confirm delivery status for open orders]",
  "[Placeholder — complete this week's training module]",
  "[Placeholder — log yesterday's call outcomes]",
];

function Card({ title, children, icon: Icon }: { title: string; children: React.ReactNode; icon?: any }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-5 shadow-soft">
      <div className="mb-3 flex items-center gap-2">
        {Icon && <Icon size={16} className="text-primary" />}
        <h2 className="text-[15px] font-semibold text-primary-dark">{title}</h2>
      </div>
      {children}
    </div>
  );
}

export default function HomePage() {
  const topQuestions = [...faqItems].sort((a, b) => b.timesAsked - a.timesAsked).slice(0, 10);

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-6 py-8">
      <div>
        <h1 className="text-[34px] font-extrabold tracking-tight text-primary-dark">Good to see you 👋</h1>
        <p className="mt-1 text-[15px] text-text-secondary">
          Everything the sales team needs, in one place.
        </p>
      </div>

      <div className="grid gap-2 sm:grid-cols-4">
        {quickLinks.map((q) => (
          <a
            key={q.label}
            href="#"
            className="flex items-center gap-2 rounded-xl border border-border bg-surface-alt px-3.5 py-3 text-[13px] font-medium text-primary-dark shadow-softer hover:bg-primary/5"
          >
            <q.icon size={16} className="text-primary" />
            {q.label}
            <ExternalLink size={12} className="ml-auto opacity-50" />
          </a>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <Card title="Needed Today" icon={Sparkles}>
            <ul className="space-y-2">
              {neededToday.map((item, i) => (
                <li key={i} className="flex items-center gap-2.5 rounded-lg border border-border bg-surface-alt px-3 py-2.5 text-[13.5px] text-text-secondary">
                  <input type="checkbox" className="h-4 w-4 rounded border-border accent-primary" disabled />
                  {item}
                </li>
              ))}
            </ul>
          </Card>

          <Card title="Recent Changes" icon={Clock}>
            <ul className="divide-y divide-border">
              {changelogEntries.map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-3 py-2.5 text-[13.5px]">
                  <div>
                    <p className="text-primary-dark">{c.whatChanged}</p>
                    <p className="text-[12px] text-text-secondary">
                      {c.date} · Approved by {c.approvedBy}
                    </p>
                  </div>
                  <Link href={c.linkedPage} className="shrink-0 text-primary hover:underline">
                    View →
                  </Link>
                </li>
              ))}
            </ul>
            <Link href="/changelog" className="mt-3 inline-block text-[13px] font-medium text-primary hover:underline">
              View full changelog →
            </Link>
          </Card>

          <Card title="Top 10 Most-Asked Questions">
            <ol className="space-y-2">
              {topQuestions.map((q, i) => (
                <li key={q.id} className="flex items-start gap-2.5 text-[13.5px] text-text-secondary">
                  <span className="mt-0.5 text-[11px] font-semibold text-primary-light">{i + 1}</span>
                  <span>{q.question}</span>
                </li>
              ))}
            </ol>
            <Link href="/faq" className="mt-3 inline-block text-[13px] font-medium text-primary hover:underline">
              View full FAQ →
            </Link>
          </Card>
        </div>

        <div className="space-y-5">
          <Card title="My Onboarding Progress" icon={GraduationCap}>
            <div className="space-y-3">
              <div>
                <div className="mb-1 flex items-center justify-between text-[12.5px] text-text-secondary">
                  <span>Level: Bronze</span>
                  <span>6 / 10 modules</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-border">
                  <div className="h-full w-3/5 rounded-full bg-primary" />
                </div>
              </div>
              <Link
                href="/academy/learning-paths"
                className="inline-block text-[13px] font-medium text-primary hover:underline"
              >
                Continue learning path →
              </Link>
            </div>
          </Card>

          <Card title="Jump Back In">
            <ul className="space-y-2 text-[13.5px]">
              <li><Link href="/sales-process/objections" className="text-primary hover:underline">Objections database</Link></li>
              <li><Link href="/sales-process/battle-cards" className="text-primary hover:underline">Battle cards</Link></li>
              <li><Link href="/products" className="text-primary hover:underline">Product catalog</Link></li>
              <li><Link href="/company/contacts" className="text-primary hover:underline">Internal contacts</Link></li>
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}
