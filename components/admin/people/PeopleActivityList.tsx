import { ChevronRight, Clock } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { PersonAvatar } from "@/components/admin/people/PersonAvatar";
import { RoleBadge } from "@/components/admin/people/RoleBadge";
import { emailLocalPart, personPath, type PersonRecord } from "@/lib/admin/people";
import { formatDuration } from "@/lib/dashboard/format";
import type { DashboardRange } from "@/lib/dashboard/range";

export interface PeopleActivityRow {
  email: string;
  activeMs: number;
}

export interface PeopleActivityListProps {
  /** Who was active in the range, in the order the database ranked them. */
  rows: readonly PeopleActivityRow[];
  /** The allow-list by email — a row whose email is in it is a link to that
   * person's page and wears their name and role; one that is not (removed
   * since) is plain text. null when the allow-list could not be read: every
   * row is then plain, never a missing list. */
  people: ReadonlyMap<string, PersonRecord> | null;
  /** Carried onto each person page, so it opens on the range being looked at. */
  range: DashboardRange;
}

/** The dashboard's compact "Xodimlar faolligi": one row per person who was
 * active — avatar, name, gmail, role, active time — and a click opens that
 * person's page and nobody else's. Server-rendered; the per-person detail (top
 * views, copies, checklist) that used to fill a card each lives on that page. */
export async function PeopleActivityList({ rows, people, range }: PeopleActivityListProps) {
  const [tDuration, tRoles, t] = await Promise.all([
    getTranslations("dashboard.duration"),
    getTranslations("pages.admin.users.roles"),
    getTranslations("pages.admin.people.activityList"),
  ]);
  const query = new URLSearchParams({ from: range.from, to: range.to }).toString();

  return (
    <ul aria-label={t("title")} className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface shadow-soft">
      {rows.map((row) => {
        const person = people?.get(row.email) ?? null;
        const name = person ? person.fullName?.trim() || emailLocalPart(person.email) : row.email;
        const body = (
          <>
            <PersonAvatar fullName={person?.fullName ?? null} email={row.email} size="sm" muted={person ? !person.isActive : false} />
            <div className="min-w-0 flex-1">
              <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                <p className="min-w-0 max-w-full truncate text-[13.5px] font-semibold text-primary-dark">{name}</p>
                {person && <RoleBadge role={person.role} label={tRoles(person.role)} />}
              </div>
              {name !== row.email && (
                <p title={row.email} className="truncate text-[12.5px] text-text-secondary">
                  {row.email}
                </p>
              )}
            </div>
            <span className="flex shrink-0 items-center gap-1.5 text-[13px] font-medium tabular-nums text-primary-dark">
              <Clock size={14} aria-hidden="true" className="text-text-secondary" />
              {formatDuration(row.activeMs, tDuration)}
            </span>
            {person && <ChevronRight size={16} aria-hidden="true" className="shrink-0 text-text-secondary" />}
          </>
        );

        return (
          <li key={row.email}>
            {person ? (
              <Link
                href={`${personPath(person.email)}?${query}`}
                className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
              >
                {body}
              </Link>
            ) : (
              <div className="flex items-center gap-3 px-4 py-3">{body}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
