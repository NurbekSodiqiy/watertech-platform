import Link from "next/link";
import { PlayCircle, FlaskConical, Package } from "lucide-react";
import { PageHeader } from "./DocPageTemplate";
import { FeedbackWidget } from "./FeedbackWidget";
import { objections } from "@/lib/mock-data/objections";
import type { MockProduct } from "@/lib/mock-data/products";
import type { PageMeta } from "@/lib/types";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3 rounded-2xl border border-border bg-surface p-5 shadow-soft">
      <h2 className="text-[18px] font-semibold text-primary-dark">{title}</h2>
      {children}
    </section>
  );
}

export function ProductCardTemplate({ product, meta }: { product: MockProduct; meta: PageMeta }) {
  const sampleObjections = objections.slice(0, 5);

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-6 py-8">
      <PageHeader
        path={`/products/${product.slug}`}
        title={product.name}
        description={`SKU ${product.sku} · [One-line placeholder description of what this product is and who it's for.]`}
        meta={meta}
      />

      <Section title="Overview">
        <div className="flex flex-col gap-4 sm:flex-row">
          <div className="flex h-32 w-full items-center justify-center rounded-lg border border-dashed border-border bg-surface-alt text-text-secondary sm:w-40">
            <Package size={28} />
          </div>
          <div className="flex-1 space-y-2 text-[13.5px] text-text-secondary">
            <p>Category: <span className="text-primary-dark">{product.category}</span></p>
            <p>Segment: <span className="text-primary-dark">{product.segment}</span></p>
            <p>
              Stock status:{" "}
              <span className={product.inStock ? "font-medium text-status-ok" : "font-medium text-status-outdated"}>
                {product.inStock ? "In stock" : "Out of stock"}
              </span>
            </p>
          </div>
        </div>
      </Section>

      <Section title="Technical Specifications">
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-left text-[13px]">
            <tbody>
              {["Dimension", "Material", "Pressure rating", "Temperature range", "Certification"].map((spec) => (
                <tr key={spec} className="border-b border-border last:border-0">
                  <td className="w-1/3 bg-surface-alt/60 px-3 py-2 font-medium text-primary-dark">{spec}</td>
                  <td className="px-3 py-2 text-text-secondary">[Placeholder value]</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="Sales Arguments">
        <div className="grid gap-3 sm:grid-cols-3">
          {[1, 2, 3].map((n) => (
            <div key={n} className="rounded-lg border border-border bg-surface-alt p-3 text-[13px]">
              <p className="font-semibold text-primary-dark">Feature {n} — [Placeholder]</p>
              <p className="mt-1 text-text-secondary">Benefit: [Placeholder benefit statement]</p>
              <p className="mt-1 font-medium text-primary">Proof: [+—% placeholder number]</p>
            </div>
          ))}
        </div>
      </Section>

      <div className="grid gap-4 sm:grid-cols-2">
        <Section title="Fits / Doesn't Fit by Segment">
          <ul className="space-y-1.5 text-[13.5px] text-text-secondary">
            <li>✅ [Placeholder segment where this fits well]</li>
            <li>✅ [Placeholder segment where this fits well]</li>
            <li>🚫 [Placeholder segment where this is a poor fit]</li>
          </ul>
        </Section>
        <Section title="Vs. Our Other Products">
          <p className="text-[13.5px] text-text-secondary">
            [Placeholder — how this differs from adjacent product lines, and when to recommend one over the other.]
          </p>
        </Section>
      </div>

      <Section title="Vs. Competitor">
        <p className="text-[13.5px] text-text-secondary">
          [Placeholder comparison summary.]{" "}
          <Link href="/sales-process/battle-cards" className="font-medium text-primary hover:underline">
            View linked battle card →
          </Link>
        </p>
      </Section>

      <Section title="Price">
        <p className="text-[13.5px] text-text-secondary">
          {product.price} —{" "}
          <Link href="/products/price-sheet" className="font-medium text-primary hover:underline">
            View full price sheet →
          </Link>
        </p>
      </Section>

      <Section title="Top Objections & Answers">
        <div className="space-y-2">
          {sampleObjections.map((o) => (
            <div key={o.id} className="rounded-lg border border-border bg-surface-alt p-3 text-[13px]">
              <p className="font-medium text-primary-dark">{o.objection}</p>
              <p className="mt-1 text-text-secondary">{o.answer1}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Top Technical FAQs">
        <ul className="space-y-1.5 text-[13.5px] text-text-secondary">
          <li>[Placeholder technical FAQ question 1?]</li>
          <li>[Placeholder technical FAQ question 2?]</li>
          <li>[Placeholder technical FAQ question 3?]</li>
        </ul>
      </Section>

      <div className="grid gap-4 sm:grid-cols-2">
        <Section title="Video">
          <div className="flex h-32 items-center justify-center rounded-lg border border-dashed border-border bg-surface-alt text-text-secondary">
            <PlayCircle size={28} />
          </div>
        </Section>
        <Section title="Quiz">
          <div className="flex h-32 items-center justify-center rounded-lg border border-dashed border-border bg-surface-alt text-text-secondary">
            <FlaskConical size={28} />
          </div>
        </Section>
      </div>

      <FeedbackWidget />
    </div>
  );
}
