import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { EmptyState } from "@/components/EmptyState";
import { QuickActionButton } from "./QuickActionButton";
import { publishFromDashboard, touchContent } from "@/lib/dashboard/actions";
import { adminEditHref, type ContentHealth, type ContentHealthRow } from "@/lib/dashboard/content-health";
import type { EmptyStateKey } from "@/lib/empty-states";

function formatDateUz(iso: string): string {
  return new Date(iso).toLocaleDateString("uz-UZ");
}

function RowMeta({ row }: { row: ContentHealthRow }) {
  return (
    <p className="truncate text-[12px] text-text-secondary">
      {row.table.replace("content_", "")} · {formatDateUz(row.updatedAt)}
      {row.updatedBy ? ` · ${row.updatedBy}` : ""}
    </p>
  );
}

function Row({ row, action }: { row: ContentHealthRow; action?: React.ReactNode }) {
  return (
    <li className="flex items-center justify-between gap-3 border-b border-border px-1 py-2.5 last:border-0">
      <div className="min-w-0">
        <Link href={adminEditHref(row.table, row.id)} className="truncate text-[13px] font-medium text-primary hover:underline">
          {row.title}
        </Link>
        <RowMeta row={row} />
      </div>
      {action}
    </li>
  );
}

async function Section({
  heading,
  rows,
  total,
  emptyStateKey,
  renderAction,
}: {
  heading: string;
  rows: ContentHealthRow[];
  total: number;
  emptyStateKey: EmptyStateKey;
  renderAction?: (row: ContentHealthRow) => React.ReactNode;
}) {
  const t = await getTranslations(`emptyState.${emptyStateKey}`);

  return (
    <section className="space-y-3 rounded-2xl border border-border bg-surface p-5 shadow-soft">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-[15px] font-bold text-primary-dark">
          {heading} {total > 0 && <span className="text-text-secondary">({total})</span>}
        </h2>
        <Link href="/admin" className="text-[12.5px] font-medium text-accent hover:underline">
          Barchasi →
        </Link>
      </div>
      {rows.length === 0 ? (
        <EmptyState variant="inline" stateKey={emptyStateKey} title={t("title")} reason={t("reason")} />
      ) : (
        <ul>{rows.map((row) => <Row key={`${row.table}:${row.id}`} row={row} action={renderAction?.(row)} />)}</ul>
      )}
    </section>
  );
}

export async function ContentHealthPanel({ health }: { health: ContentHealth }) {
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Section
        heading="Nashr kutayotgan qoralamalar"
        rows={health.drafts}
        total={health.draftsTotal}
        emptyStateKey="dashboardNoDrafts"
        renderAction={(row) => (
          <QuickActionButton
            label="Nashr qilish"
            pendingLabel="Nashr qilinmoqda…"
            successToast="Nashr etildi"
            action={publishFromDashboard}
            table={row.table}
            id={row.id}
            version={row.version}
          />
        )}
      />
      <Section
        heading="Eskirgan kontent (90+ kun)"
        rows={health.stale}
        total={health.staleTotal}
        emptyStateKey="dashboardNoStale"
        renderAction={(row) => (
          <QuickActionButton
            label="Yangilangan deb belgilash"
            pendingLabel="Belgilanmoqda…"
            successToast="Saqlandi"
            action={touchContent}
            table={row.table}
            id={row.id}
            version={row.version}
          />
        )}
      />
      <Section
        heading="Ruscha tarjimasi yo'q"
        rows={health.missingRu}
        total={health.missingRuTotal}
        emptyStateKey="dashboardNoMissingRu"
        renderAction={(row) => (
          <Link
            href={`${adminEditHref(row.table, row.id)}#ru`}
            className="shrink-0 rounded-lg border border-border bg-surface px-2.5 py-1 text-[11px] font-medium text-text-secondary transition-colors hover:bg-surface-alt hover:text-accent"
          >
            Tarjima qilish
          </Link>
        )}
      />
    </div>
  );
}
