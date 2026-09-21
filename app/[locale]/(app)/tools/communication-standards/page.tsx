import { getTranslations, unstable_setRequestLocale } from "next-intl/server";
import { DocPageTemplate } from "@/components/DocPageTemplate";
import { findNode } from "@/lib/site-config";
import { 
  AlertTriangle, 
  Users, 
  ListTodo, 
  Type, 
  PlusCircle, 
  CopySlash, 
  CheckSquare,
  ArrowRight
} from "lucide-react";
import { Link } from "@/i18n/routing";

export default async function AmoCRMPage({ params: { locale } }: { params: { locale: string } }) {
  unstable_setRequestLocale(locale);
  const t = await getTranslations("pages.tools.communicationStandards");

  const path = "/tools/communication-standards";
  const node = findNode(path);

  return (
    <DocPageTemplate
      path={path}
      title={t("title")}
      description={node?.description}
      locked={node?.locked}
    >
      <div className="space-y-8">
        
        {/* Asosiy oltin qoida */}
        <div className="flex flex-col sm:flex-row items-start gap-4 rounded-2xl border border-primary/20 bg-primary/10 p-6 shadow-soft">
          <div className="rounded-full bg-surface p-3 text-primary shadow-softer shrink-0">
            <AlertTriangle size={28} />
          </div>
          <div>
            <h3 className="text-[18px] font-bold text-primary-dark">{t("goldenRule.heading")}</h3>
            <p className="mt-2 text-[15.5px] leading-relaxed text-text-secondary">
              {t.rich("goldenRule.text", {
                strong: (chunks) => <strong className="text-primary-dark font-bold">{chunks}</strong>,
              })}
            </p>
          </div>
        </div>

        {/* Qoidalar ro'yxati (Grid) */}
        <div className="grid gap-5 md:grid-cols-2">
          {/* 1. Lid nima? */}
          <div className="flex flex-col gap-3 rounded-2xl border border-border bg-surface-alt p-5 shadow-soft transition-all hover:border-primary/30 hover:shadow-elevated">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface text-primary shadow-softer">
                <Users size={20} />
              </span>
              <h4 className="text-[16px] font-bold text-primary-dark">{t("rules.lead.title")}</h4>
            </div>
            <p className="text-[14px] leading-relaxed text-text-secondary">
              {t("rules.lead.text")}
            </p>
          </div>

          {/* 2. Vazifasiz bitim bo'lmasin */}
          <div className="flex flex-col gap-3 rounded-2xl border border-border bg-surface-alt p-5 shadow-soft transition-all hover:border-primary/30 hover:shadow-elevated">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface text-primary shadow-softer">
                <ListTodo size={20} />
              </span>
              <h4 className="text-[16px] font-bold text-primary-dark">{t("rules.tasks.title")}</h4>
            </div>
            <p className="text-[14px] leading-relaxed text-text-secondary">
              {t("rules.tasks.text")}
            </p>
          </div>

          {/* 3. Lotin alifbosi */}
          <div className="flex flex-col gap-3 rounded-2xl border border-border bg-surface-alt p-5 shadow-soft transition-all hover:border-primary/30 hover:shadow-elevated">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface text-primary shadow-softer">
                <Type size={20} />
              </span>
              <h4 className="text-[16px] font-bold text-primary-dark">{t("rules.latin.title")}</h4>
            </div>
            <p className="text-[14px] leading-relaxed text-text-secondary">
              {t("rules.latin.text")}
            </p>
          </div>

          {/* 4. Yangi kelishuv — yangi bitim */}
          <div className="flex flex-col gap-3 rounded-2xl border border-border bg-surface-alt p-5 shadow-soft transition-all hover:border-primary/30 hover:shadow-elevated">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface text-primary shadow-softer">
                <PlusCircle size={20} />
              </span>
              <h4 className="text-[16px] font-bold text-primary-dark">{t("rules.newDeal.title")}</h4>
            </div>
            <p className="text-[14px] leading-relaxed text-text-secondary">
              {t("rules.newDeal.text")}
            </p>
          </div>

          {/* 5. Dublikatlardan saqlaning */}
          <div className="flex flex-col gap-3 rounded-2xl border border-border bg-surface-alt p-5 shadow-soft transition-all hover:border-primary/30 hover:shadow-elevated">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface text-primary shadow-softer">
                <CopySlash size={20} />
              </span>
              <h4 className="text-[16px] font-bold text-primary-dark">{t("rules.duplicates.title")}</h4>
            </div>
            <p className="text-[14px] leading-relaxed text-text-secondary">
              {t("rules.duplicates.text")}
            </p>
          </div>

          {/* 6. Harakatlarni belgilash */}
          <div className="flex flex-col gap-3 rounded-2xl border border-border bg-surface-alt p-5 shadow-soft transition-all hover:border-primary/30 hover:shadow-elevated">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface text-primary shadow-softer">
                <CheckSquare size={20} />
              </span>
              <h4 className="text-[16px] font-bold text-primary-dark">{t("rules.actions.title")}</h4>
            </div>
            <p className="text-[14px] leading-relaxed text-text-secondary">
              {t("rules.actions.text")}
            </p>
          </div>
        </div>

        {/* Keyingi bosqich tugmasi */}
        <div className="mt-8 flex justify-end border-t border-border pt-6">
          <Link
            href="/tools/sales-funnel"
            className="group flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-[14.5px] font-semibold text-surface shadow-soft transition-all hover:bg-primary-hover hover:shadow-elevated"
          >
            {t("nextButton")}
            <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
          </Link>
        </div>

      </div>
    </DocPageTemplate>
  );
}
