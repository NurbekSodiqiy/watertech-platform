import Link from "next/link";
import {
  listScriptRows,
  listObjectionRows,
  listFaqRows,
  listCompetitorRows,
  listPackageRows,
  listProductRows,
} from "@/lib/admin/queries";

export const metadata = { title: "Kontent boshqaruvi — Umumiy" };

export default async function AdminOverviewPage() {
  const [scripts, objections, faqs, competitors, packages, products] = await Promise.all([
    listScriptRows(),
    listObjectionRows(),
    listFaqRows(),
    listCompetitorRows(),
    listPackageRows(),
    listProductRows(),
  ]);

  const sections = [
    { label: "Skriptlar", href: "/admin/scripts", rows: scripts },
    { label: "E'tirozlar", href: "/admin/objections", rows: objections },
    { label: "FAQ", href: "/admin/faq", rows: faqs },
    { label: "Raqobatchilar", href: "/admin/competitors", rows: competitors },
    { label: "Paketlar", href: "/admin/packages", rows: packages },
    { label: "Mahsulotlar", href: "/admin/products", rows: products },
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
        {sections.map((section) => {
          const draftCount = section.rows.filter((r) => r.status === "draft").length;
          return (
            <Link
              key={section.href}
              href={section.href}
              className="space-y-3 rounded-2xl border border-border bg-surface p-5 shadow-soft transition-colors hover:bg-primary/5"
            >
              <p className="text-[14px] font-semibold text-primary-dark">{section.label}</p>
              <div className="flex items-center gap-4 text-[13px] text-text-secondary">
                <span>{section.rows.length} ta yozuv</span>
                {draftCount > 0 && (
                  <span className="rounded-full bg-status-warning/15 px-2 py-0.5 text-[11px] font-semibold text-status-warning">
                    {draftCount} qoralama
                  </span>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
