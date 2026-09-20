import type { Metadata } from "next";
import { getTranslations, unstable_setRequestLocale } from "next-intl/server";
import { ShieldCheck, Award } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { FeedbackWidget } from "@/components/FeedbackWidget";
import { WidgetBoundary } from "@/components/ui/WidgetBoundary";
import { CERTIFICATES } from "@/lib/content/certificates";
import { CertificateGrid } from "@/components/CertificateGrid";
import { CertificateGallery } from "@/components/CertificateGallery";
import { CertificateLightboxProvider } from "@/components/CertificateLightboxContext";

// Standard codes are identifiers and stay untranslated; the descriptions live in
// messages under standards.items.<key>.
const STANDARDS = [
  { key: "gost32415", code: "ГОСТ 32415-2013" },
  { key: "gost32414", code: "ГОСТ 32414-2013" },
  { key: "gost32412", code: "ГОСТ 32412-2013" },
  { key: "gost34292", code: "ГОСТ 34292-2017" },
  { key: "gost18599", code: "ГОСТ 18599-2001" },
] as const;

export async function generateMetadata({ params: { locale } }: { params: { locale: string } }): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: "pages.products.technicalDocs" });
  return { title: t("title") };
}

export default async function TechnicalDocsPage({ params: { locale } }: { params: { locale: string } }) {
  unstable_setRequestLocale(locale);
  const t = await getTranslations("pages.products.technicalDocs");

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-6 py-8">
      <PageHeader path="/products/technical-docs" title={t("title")} description={t("description")} />

      {/* Rasmiy tasdiqlanganlik banneri */}
      <div className="flex flex-col gap-3 rounded-2xl border border-status-ok/30 bg-status-ok/10 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-status-ok/20 text-status-ok">
            <ShieldCheck size={22} />
          </span>
          <div>
            <h3 className="font-semibold text-status-ok">{t("registry.title")}</h3>
            <p className="mt-0.5 text-[13px] leading-relaxed text-status-ok/80">{t("registry.body")}</p>
          </div>
        </div>
      </div>

      <CertificateLightboxProvider>
        <CertificateGrid certificates={CERTIFICATES} />
        <CertificateGallery />
      </CertificateLightboxProvider>

      {/* Standartlar va normativ hujjatlar ma'lumotnomasi */}
      <div className="rounded-2xl border border-border bg-surface p-6 shadow-soft space-y-4">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Award size={18} />
          </span>
          <h3 className="text-[17px] font-bold text-primary-dark">{t("standards.heading")}</h3>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 text-[13px]">
          {STANDARDS.map(({ key, code }) => (
            <div key={key} className="rounded-xl border border-border bg-surface-alt p-3.5 space-y-1">
              <span className="font-mono font-bold text-primary">{code}</span>
              <p className="text-text-secondary leading-snug">{t(`standards.items.${key}`)}</p>
            </div>
          ))}

          <div className="rounded-xl border border-border bg-surface-alt p-3.5 space-y-1">
            <span className="font-mono font-bold text-primary">{t("standards.manufacturer.label")}</span>
            <p className="text-text-secondary leading-snug">
              {t.rich("standards.manufacturer.value", { strong: (chunks) => <strong>{chunks}</strong> })}
            </p>
          </div>
        </div>
      </div>

      <WidgetBoundary>
        <FeedbackWidget />
      </WidgetBoundary>
    </div>
  );
}
