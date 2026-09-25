import { ArrowLeft, Lock } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { CopyButton } from "@/components/CopyButton";
import { RelativeTime } from "@/components/admin/RelativeTime";
import { PersonAvatar } from "@/components/admin/people/PersonAvatar";
import { RoleBadge } from "@/components/admin/people/RoleBadge";
import { formatDate, formatDateTime } from "@/lib/admin/format";
import { emailLocalPart, type PersonRecord } from "@/lib/admin/people";

export interface PersonHeaderProps {
  locale: string;
  person: PersonRecord;
  /** The signed-in admin is this person. */
  isSelf: boolean;
  /** Over all retained telemetry (admin_person_summary): null when there is
   * none yet, undefined when the summary could not be read — "—", not "never". */
  firstSeenAt: string | null | undefined;
  lastSeenAt: string | null | undefined;
}

/** Who this page is about: the way back, the avatar, the name and the gmail
 * (with a copy button), the role, whether they can sign in, and since when
 * they use the app. An admin row has no telemetry (CLAUDE.md §9), so its
 * "first / last seen" is a note, never an empty date. Server-rendered — the
 * dates are formatted in the office's time zone, so nothing to hydrate but
 * the relative "2 soat oldin". */
export async function PersonHeader({ locale, person, isSelf, firstSeenAt, lastSeenAt }: PersonHeaderProps) {
  const [t, tUsers] = await Promise.all([
    getTranslations("pages.admin.people.person.header"),
    getTranslations("pages.admin.users"),
  ]);
  const name = person.fullName?.trim() || emailLocalPart(person.email);
  const isAdmin = person.role === "admin";

  return (
    <header className="space-y-4">
      <Link
        href="/admin/users"
        className="inline-flex items-center gap-1.5 rounded-lg text-[13px] font-medium text-text-secondary transition-colors hover:text-primary-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <ArrowLeft size={14} aria-hidden="true" />
        {t("back")}
      </Link>

      <div className="space-y-4 rounded-2xl border border-border bg-surface p-4 shadow-softer sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <PersonAvatar fullName={person.fullName} email={person.email} size="lg" muted={!person.isActive} />
          <div className="min-w-0 flex-1 space-y-1.5">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
              <h1 className="min-w-0 break-words text-[24px] font-bold leading-tight text-primary-dark">{name}</h1>
              <RoleBadge role={person.role} label={tUsers(`roles.${person.role}`)} />
              <span className="inline-flex items-center gap-1.5 text-[13px] text-text-secondary">
                <span
                  aria-hidden="true"
                  className={`h-2 w-2 shrink-0 rounded-full ${person.isActive ? "bg-status-ok" : "bg-status-outdated"}`}
                />
                {person.isActive ? tUsers("status.active") : tUsers("status.inactive")}
              </span>
              {isSelf && (
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
                  {tUsers("you")}
                </span>
              )}
            </div>
            <div className="flex min-w-0 items-center gap-2">
              <span title={person.email} className="min-w-0 truncate text-[13px] text-text-secondary">
                {person.email}
              </span>
              <CopyButton value={person.email} />
            </div>
          </div>
        </div>

        <dl className="grid gap-3 border-t border-border pt-4 sm:grid-cols-3">
          <div className="min-w-0">
            <dt className="text-[12.5px] text-text-secondary">{t("added")}</dt>
            <dd className="mt-0.5 text-[13px] font-medium text-primary-dark">{formatDate(person.addedAt, locale)}</dd>
          </div>
          {isAdmin ? (
            <div className="min-w-0 sm:col-span-2">
              <dt className="sr-only">{t("noTelemetryLabel")}</dt>
              <dd className="flex items-center gap-1.5 text-[13px] text-text-secondary">
                <Lock size={13} aria-hidden="true" className="shrink-0" />
                {t("noTelemetry")}
              </dd>
            </div>
          ) : (
            <>
              <div className="min-w-0">
                <dt className="text-[12.5px] text-text-secondary">{t("firstSeen")}</dt>
                <dd className="mt-0.5 text-[13px] font-medium text-primary-dark">
                  {firstSeenAt === undefined ? "—" : firstSeenAt ? formatDate(firstSeenAt, locale) : t("never")}
                </dd>
              </div>
              <div className="min-w-0">
                <dt className="text-[12.5px] text-text-secondary">{t("lastSeen")}</dt>
                <dd className="mt-0.5 text-[13px] font-medium text-primary-dark">
                  {lastSeenAt === undefined ? (
                    "—"
                  ) : lastSeenAt ? (
                    <>
                      {formatDateTime(lastSeenAt, locale)}
                      <span className="font-normal text-text-secondary">
                        {" · "}
                        <RelativeTime iso={lastSeenAt} />
                      </span>
                    </>
                  ) : (
                    t("never")
                  )}
                </dd>
              </div>
            </>
          )}
        </dl>
      </div>
    </header>
  );
}
