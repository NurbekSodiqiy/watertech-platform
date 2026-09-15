import { FileQuestion, Home } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/routing";

export default async function NotFound() {
  const t = await getTranslations("errors");

  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center gap-6 px-6 py-24 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
        <FileQuestion size={32} />
      </span>
      <div className="space-y-2">
        <h1 className="text-[24px] font-bold text-primary-dark">{t("notFoundTitle")}</h1>
        <p className="text-[14px] text-text-secondary">{t("notFoundDescription")}</p>
      </div>
      <Link
        href="/"
        className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-[13px] font-medium text-surface shadow-softer transition-colors hover:bg-primary-hover"
      >
        <Home size={16} />
        {t("backHome")}
      </Link>
    </div>
  );
}
