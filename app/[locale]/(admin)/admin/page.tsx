import type { Metadata } from "next";
import { unstable_setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { countRowsByStatus } from "@/lib/admin/queries";

export async function generateMetadata({ params: { locale } }: { params: { locale: string } }): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: "pages.admin.overview" });
  return { title: t("title") };
}

export default async function AdminOverviewPage({ params: { locale } }: { params: { locale: string } }) {
  unstable_setRequestLocale(locale);

  // Counts only (head: true) — never full rows; scripts carry large JSONB.
  const t = await getTranslations("pages.admin.changelog");
  const tContacts = await getTranslations("pages.admin.contacts");
  const tSops = await getTranslations("pages.admin.sops");
  const tAdmin = await getTranslations("pages.admin");
  const [scripts, objections, faqs, competitors, packages, products, changelog, contacts, sops] = await Promise.all([
    countRowsByStatus("content_scripts"),
    countRowsByStatus("content_objections"),
    countRowsByStatus("content_faqs"),
    countRowsByStatus("content_competitors"),
    countRowsByStatus("content_packages"),
    countRowsByStatus("content_products"),
    countRowsByStatus("content_changelog"),
    countRowsByStatus("content_contacts"),
    countRowsByStatus("content_sops"),
  ]);

  const sections = [
    { label: tAdmin("scripts.nav"), href: "/admin/scripts", counts: scripts },
    { label: tAdmin("objections.nav"), href: "/admin/objections", counts: objections },
    { label: tAdmin("faq.nav"), href: "/admin/faq", counts: faqs },
    { label: tAdmin("competitors.nav"), href: "/admin/competitors", counts: competitors },
    { label: tAdmin("packages.nav"), href: "/admin/packages", counts: packages },
    { label: tAdmin("products.nav"), href: "/admin/products", counts: products },
    { label: t("nav"), href: "/admin/changelog", counts: changelog },
    { label: tContacts("nav"), href: "/admin/contacts", counts: contacts },
    { label: tSops("nav"), href: "/admin/sops", counts: sops },
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-[24px] font-bold text-primary-dark">{tAdmin("overview.title")}</h1>
        <p className="mt-1 text-[13px] text-text-secondary">
          {tAdmin("overview.description")}
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
              <span>{tAdmin("overview.entries", { count: section.counts.total })}</span>
              {section.counts.draft > 0 && (
                <span className="rounded-full bg-status-warning/15 px-2 py-0.5 text-[11px] font-semibold text-status-warning">
                  {tAdmin("overview.drafts", { count: section.counts.draft })}
                </span>
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
