import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { formatDateTime } from "@/lib/admin/format";
import {
  activityKey,
  editHref,
  historyHref,
  type AccessActivity,
  type AccessFieldChange,
  type ActivityItem,
  type GateActivity,
  type VersionActivity,
} from "@/lib/admin/activity";

type Translator = Awaited<ReturnType<typeof getTranslations>>;

const BADGE_BASE = "inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold";
const LINK_CLASS =
  "whitespace-nowrap rounded-lg border border-border bg-surface px-2.5 py-1 text-[11px] font-medium text-text-secondary transition-colors hover:bg-surface-alt hover:text-accent";

const ACCESS_BADGE: Record<AccessActivity["action"], string> = {
  insert: "bg-status-ok/15 text-status-ok",
  update: "bg-status-warning/15 text-status-warning",
  delete: "bg-status-outdated/15 text-status-outdated",
};

function describeChange(change: AccessFieldChange, t: Translator): string {
  const field = t(`fields.${change.field}`);
  if (change.field === "role") {
    return `${field}: ${change.from ?? "—"} → ${change.to ?? "—"}`;
  }
  const value = (flag: boolean | null): string => (flag === null ? "—" : flag ? t("values.active") : t("values.inactive"));
  return `${field}: ${value(change.from)} → ${value(change.to)}`;
}

function VersionCells({ item, t, tTables }: { item: VersionActivity; t: Translator; tTables: Translator }) {
  return (
    <>
      <td className="px-3 py-2.5">
        <p className="break-words font-medium text-primary-dark">{item.title}</p>
        <p className="text-[12px] text-text-secondary">{tTables(item.table)}</p>
      </td>
      <td className="px-3 py-2.5">
        <span
          className={`${BADGE_BASE} ${
            item.op === "delete" ? "bg-status-outdated/15 text-status-outdated" : "bg-primary/10 text-primary"
          }`}
        >
          {t(`op.${item.op}`)}
        </span>
      </td>
      <td className="px-3 py-2.5">
        <div className="flex flex-wrap justify-end gap-2">
          <Link href={historyHref(item.table, item.rowId)} className={LINK_CLASS}>
            {t("diff")}
          </Link>
          {item.op === "update" && (
            <Link href={editHref(item.table, item.rowId)} className={LINK_CLASS}>
              {t("open")}
            </Link>
          )}
        </div>
      </td>
    </>
  );
}

function GateCells({ item, t, tTables }: { item: GateActivity; t: Translator; tTables: Translator }) {
  return (
    <>
      <td className="px-3 py-2.5">
        <p className="break-words font-medium text-primary-dark">{item.title ?? item.rowId}</p>
        <p className="text-[12px] text-text-secondary">{tTables(item.table)}</p>
      </td>
      <td className="px-3 py-2.5">
        <span
          className={`${BADGE_BASE} ${
            item.passed ? "bg-status-ok/15 text-status-ok" : "bg-status-outdated/15 text-status-outdated"
          }`}
        >
          {item.passed ? t("gate.passed") : t("gate.blocked")}
        </span>
      </td>
      <td className="px-3 py-2.5">
        <div className="flex flex-wrap justify-end gap-2">
          <Link href={historyHref(item.table, item.rowId)} className={LINK_CLASS}>
            {t("diff")}
          </Link>
          {item.title !== null && (
            <Link href={editHref(item.table, item.rowId)} className={LINK_CLASS}>
              {t("open")}
            </Link>
          )}
        </div>
      </td>
    </>
  );
}

function AccessCells({ item, t }: { item: AccessActivity; t: Translator }) {
  return (
    <>
      <td className="px-3 py-2.5">
        <p className="break-words font-medium text-primary-dark">{item.targetEmail}</p>
        {item.changes.length > 0 && (
          <ul className="text-[12px] text-text-secondary">
            {item.changes.map((change) => (
              <li key={change.field}>{describeChange(change, t)}</li>
            ))}
          </ul>
        )}
      </td>
      <td className="px-3 py-2.5">
        <span className={`${BADGE_BASE} ${ACCESS_BADGE[item.action]}`}>{t(`access.${item.action}`)}</span>
      </td>
      <td className="px-3 py-2.5">
        <div className="flex justify-end">
          <Link href="/admin/users" className={LINK_CLASS}>
            {t("open")}
          </Link>
        </div>
      </td>
    </>
  );
}

/** The merged feed as one table: when, from which history, who, what, and the
 * way to the diff (an edit or delete opens the row's version history) or to
 * the row. Rendered on the server — dates are formatted in the office's time
 * zone, so there is nothing to hydrate. */
export async function ActivityFeed({ items }: { items: ActivityItem[] }) {
  const [t, tTables, locale] = await Promise.all([
    getTranslations("pages.admin.activity"),
    getTranslations("admin.versions.tables"),
    getLocale(),
  ]);

  return (
    <div className="relative overflow-x-auto rounded-2xl border border-border bg-surface shadow-soft">
      <table className="w-full min-w-[820px] text-left text-[13px]">
        <thead>
          <tr className="border-b border-border bg-surface-alt/60">
            <th className="px-3 py-2.5 font-semibold text-primary-dark">{t("columns.when")}</th>
            <th className="px-3 py-2.5 font-semibold text-primary-dark">{t("columns.source")}</th>
            <th className="px-3 py-2.5 font-semibold text-primary-dark">{t("columns.actor")}</th>
            <th className="px-3 py-2.5 font-semibold text-primary-dark">{t("columns.what")}</th>
            <th className="px-3 py-2.5 font-semibold text-primary-dark">{t("columns.result")}</th>
            <th className="px-3 py-2.5 font-semibold text-primary-dark">
              <span className="sr-only">{t("columns.action")}</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={activityKey(item)} className="border-b border-border align-top last:border-0">
              <td className="whitespace-nowrap px-3 py-2.5 text-text-secondary">{formatDateTime(item.at, locale)}</td>
              <td className="px-3 py-2.5 text-text-secondary">{t(`sources.${item.kind}`)}</td>
              <td className="break-all px-3 py-2.5 text-text-secondary">{item.actor ?? t("system")}</td>
              {item.kind === "version" && <VersionCells item={item} t={t} tTables={tTables} />}
              {item.kind === "gate" && <GateCells item={item} t={t} tTables={tTables} />}
              {item.kind === "access" && <AccessCells item={item} t={t} />}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
