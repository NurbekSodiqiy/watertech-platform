import { getTranslations, unstable_setRequestLocale } from "next-intl/server";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { OnboardingChecklist } from "@/components/OnboardingChecklist";
import { WidgetBoundary } from "@/components/ui/WidgetBoundary";
import { getOnboardingDays, getOnboardingSummaryChecklist } from "@/lib/content/loader";
import type { Locale } from "@/i18n/routing";

export default async function OnboardingPage({ params: { locale } }: { params: { locale: Locale } }) {
  unstable_setRequestLocale(locale);
  const t = await getTranslations("nav.company.onboarding");

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-6 py-8">
      {/* Header */}
      <div className="space-y-4">
        <Breadcrumbs path="/company/onboarding" />
        <div>
          <h1 className="text-[32px] font-extrabold leading-tight tracking-tight text-primary-dark">{t("title")}</h1>
        </div>
      </div>

      <WidgetBoundary>
        <OnboardingChecklist days={getOnboardingDays(locale)} summary={getOnboardingSummaryChecklist(locale)} />
      </WidgetBoundary>
    </div>
  );
}
