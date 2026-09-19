import { getTranslations, unstable_setRequestLocale } from "next-intl/server";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { ComingSoon } from "@/components/ComingSoon";

const ITEM_KEYS = ["production", "quality", "warehouse"];

export default async function FactoryTourPage({ params: { locale } }: { params: { locale: string } }) {
  unstable_setRequestLocale(locale);
  const t = await getTranslations("pages.company.factoryTour");
  const tCommon = await getTranslations("common");

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-6 py-8">
      <div className="space-y-4">
        <Breadcrumbs path="/company/factory-tour" />
        <div>
          <h1 className="text-[32px] font-extrabold leading-tight tracking-tight text-primary-dark">
            {t("title")}
          </h1>
        </div>
      </div>
      <ComingSoon
        title={tCommon("comingSoon")}
        description={t("comingSoon.description")}
        items={ITEM_KEYS.map((key) => t(`comingSoon.items.${key}`))}
      />
    </div>
  );
}
