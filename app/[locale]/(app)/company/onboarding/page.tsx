import { unstable_setRequestLocale } from "next-intl/server";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { OnboardingChecklist } from "@/components/OnboardingChecklist";
import { WidgetBoundary } from "@/components/ui/WidgetBoundary";

export default function OnboardingPage({ params: { locale } }: { params: { locale: string } }) {
  unstable_setRequestLocale(locale);

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-6 py-8">
      {/* Header */}
      <div className="space-y-4">
        <Breadcrumbs path="/company/onboarding" />
        <div>
          <h1 className="text-[32px] font-extrabold leading-tight tracking-tight text-primary-dark">Onboarding</h1>
        </div>
      </div>

      <WidgetBoundary>
        <OnboardingChecklist />
      </WidgetBoundary>
    </div>
  );
}
