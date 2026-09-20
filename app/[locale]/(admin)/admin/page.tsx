import { unstable_setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { countRowsByStatus } from "@/lib/admin/queries";

export const metadata = { title: "Kontent boshqaruvi — Umumiy" };

export default async function AdminOverviewPage({ params: { locale } }: { params: { locale: string } }) {
  unstable_setRequestLocale(locale);

  // Counts only (head: true) — never full rows; scripts carry large JSONB.
  const t = await getTranslations("pages.admin.changelog");
  const [scripts, objections, faqs, competitors, packages, products, changelog] = await Promise.all([
    countRowsByStatus("content_scripts"),
    countRowsByStatus("content_objections"),
    countRowsByStatus("content_faqs"),
    countRowsByStatus("content_competitors"),
    countRowsByStatus("content_packages"),
    countRowsByStatus("content_products"),
    countRowsByStatus("content_changelog"),
  ]);

  const sections = [
    { label: "Skriptlar", href: "/admin/scripts", counts: scripts },
    { label: "E'tirozlar", href: "/admin/objections", counts: objections },
    { label: "FAQ", href: "/admin/faq", counts: faqs },
    { label: "Raqobatchilar", href: "/admin/competitors", counts: competitors },
    { label: "Paketlar", href: "/admin/packages", counts: packages },
    { label: "Mahsulotlar", href: "/admin/products", counts: products },
    { label: t("nav"), href: "/admin/changelog", counts: changelog },
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-[24px] font-bold text-primary-dark">Umumiy</h1>
        <p className="mt-1 text-[13px] text-text-secondary">
          Har bir bo&apos;lim bo&apos;yicha yozuvlar soni va qoralamalar holati.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sections.map((section) => (
          <Link
            key={section.href}
            href={section.href}
            className="space-y-3 rounded-2xl border border-border bg-surface p-5 shadow-soft transition-colors hover:bg-primary/5"
          >
            <p className="text-[14px] font-semibold text-primary-dark">{section.label}</p>
            <div className="flex items-center gap-4 text-[13px] text-text-secondary">
              <span>{section.counts.total} ta yozuv</span>
              {section.counts.draft > 0 && (
                <span className="rounded-full bg-status-warning/15 px-2 py-0.5 text-[11px] font-semibold text-status-warning">
                  {section.counts.draft} qoralama
                </span>
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
