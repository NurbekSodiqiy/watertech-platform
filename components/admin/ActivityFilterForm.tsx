import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { ACTIVITY_SOURCES, MAX_ACTOR_LENGTH, type ActivityFilters } from "@/lib/admin/activity";
import { CONTENT_REGISTRY } from "@/lib/admin/registry";
import type { DashboardTableName } from "@/lib/dashboard/content-health";

const TABLES = Object.keys(CONTENT_REGISTRY).filter((key): key is DashboardTableName => key in CONTENT_REGISTRY);

const CONTROL_CLASS =
  "rounded-lg border border-border bg-surface-alt px-3 py-1.5 text-[12.5px] text-primary-dark focus:outline-none focus:ring-2 focus:ring-primary-light";

/** A plain GET form, like the dashboard's OperatorFilter: the URL is the
 * filter state, so it survives a reload and a shared link, and it takes no
 * client JS. Submitting drops `page` — a new filter starts from the newest. */
export async function ActivityFilterForm({ filters }: { filters: ActivityFilters }) {
  const [t, tTables] = await Promise.all([
    getTranslations("pages.admin.activity"),
    getTranslations("admin.versions.tables"),
  ]);
  const hasFilters = Object.values(filters).some((value) => value !== null);

  return (
    <form method="get" action="/admin/activity" className="flex flex-wrap items-end gap-3">
      <label className="flex flex-col gap-1 text-[12px] text-text-secondary">
        {t("filters.source")}
        <select name="source" defaultValue={filters.source ?? ""} className={CONTROL_CLASS}>
          <option value="">{t("filters.allSources")}</option>
          {ACTIVITY_SOURCES.map((source) => (
            <option key={source} value={source}>
              {t(`sources.${source}`)}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-[12px] text-text-secondary">
        {t("filters.table")}
        <select name="table" defaultValue={filters.table ?? ""} className={CONTROL_CLASS}>
          <option value="">{t("filters.allTables")}</option>
          {TABLES.map((table) => (
            <option key={table} value={table}>
              {tTables(table)}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-[12px] text-text-secondary">
        {t("filters.actor")}
        <input
          type="text"
          name="actor"
          defaultValue={filters.actor ?? ""}
          maxLength={MAX_ACTOR_LENGTH}
          placeholder={t("filters.actorPlaceholder")}
          className={`${CONTROL_CLASS} w-56`}
        />
      </label>

      <label className="flex flex-col gap-1 text-[12px] text-text-secondary">
        {t("filters.from")}
        <input type="date" name="from" defaultValue={filters.from ?? ""} className={CONTROL_CLASS} />
      </label>

      <label className="flex flex-col gap-1 text-[12px] text-text-secondary">
        {t("filters.to")}
        <input type="date" name="to" defaultValue={filters.to ?? ""} className={CONTROL_CLASS} />
      </label>

      <div className="flex items-center gap-2">
        <button
          type="submit"
          className="rounded-lg border border-border bg-surface px-3 py-1.5 text-[12.5px] font-medium text-primary-dark transition-colors hover:bg-surface-alt"
        >
          {t("filters.apply")}
        </button>
        {hasFilters && (
          <Link
            href="/admin/activity"
            className="rounded-lg px-3 py-1.5 text-[12.5px] font-medium text-text-secondary transition-colors hover:text-primary-dark"
          >
            {t("filters.reset")}
          </Link>
        )}
      </div>
    </form>
  );
}
