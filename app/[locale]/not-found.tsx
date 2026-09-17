import { getTranslations } from "next-intl/server";
import { EmptyState } from "@/components/EmptyState";

export default async function NotFound() {
  const t = await getTranslations("errors");

  return (
    <div className="mx-auto max-w-2xl px-6 py-24">
      <EmptyState
        stateKey="notFound"
        title={t("notFoundTitle")}
        reason={t("notFoundDescription")}
        action={{ label: t("backHome"), href: "/" }}
      />
    </div>
  );
}
