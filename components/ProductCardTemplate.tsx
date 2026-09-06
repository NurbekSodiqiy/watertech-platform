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
        description={`SKU ${product.sku} · [Bir qatorli joy egallovchi tavsif — bu mahsulot nima va kim uchun.]`}
        meta={meta}
      />

      <Section title="Umumiy ma'lumot">
        <div className="flex flex-col gap-4 sm:flex-row">
          <div className="flex h-32 w-full items-center justify-center rounded-lg border border-dashed border-border bg-surface-alt text-text-secondary sm:w-40">
            <Package size={28} />
          </div>
          <div className="flex-1 space-y-2 text-[13.5px] text-text-secondary">
            <p>Toifa: <span className="text-primary-dark">{product.category}</span></p>
            <p>Segment: <span className="text-primary-dark">{product.segment}</span></p>
            <p>
              Ombordagi holati:{" "}
              <span className={product.inStock ? "font-medium text-status-ok" : "font-medium text-status-outdated"}>
                {product.inStock ? "Mavjud" : "Mavjud emas"}
              </span>
            </p>
          </div>
        </div>
      </Section>

      <Section title="Texnik xususiyatlar">
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-left text-[13px]">
            <tbody>
              {["O'lcham", "Material", "Bosim darajasi", "Harorat oralig'i", "Sertifikat"].map((spec) => (
                <tr key={spec} className="border-b border-border last:border-0">
                  <td className="w-1/3 bg-surface-alt/60 px-3 py-2 font-medium text-primary-dark">{spec}</td>
                  <td className="px-3 py-2 text-text-secondary">[Joy egallovchi qiymat]</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="Savdo argumentlari">
        <div className="grid gap-3 sm:grid-cols-3">
          {[1, 2, 3].map((n) => (
            <div key={n} className="rounded-lg border border-border bg-surface-alt p-3 text-[13px]">
              <p className="font-semibold text-primary-dark">{n}-xususiyat — [Joy egallovchi]</p>
              <p className="mt-1 text-text-secondary">Foyda: [Joy egallovchi foyda bayoni]</p>
              <p className="mt-1 font-medium text-primary">Isbot: [+—% joy egallovchi raqam]</p>
            </div>
          ))}
        </div>
      </Section>

      <div className="grid gap-4 sm:grid-cols-2">
        <Section title="Segment bo'yicha mos/nomos">
          <ul className="space-y-1.5 text-[13.5px] text-text-secondary">
            <li>✅ [Mos keladigan segment — joy egallovchi]</li>
            <li>✅ [Mos keladigan segment — joy egallovchi]</li>
            <li>🚫 [Mos kelmaydigan segment — joy egallovchi]</li>
          </ul>
        </Section>
        <Section title="Boshqa mahsulotlarimiz bilan solishtirganda">
          <p className="text-[13.5px] text-text-secondary">
            [Joy egallovchi — bu mahsulot yondosh turkumlardan nimasi bilan farq qiladi va qachon qaysi birini tavsiya qilish kerak.]
          </p>
        </Section>
      </div>

      <Section title="Raqobatchi bilan solishtirganda">
        <p className="text-[13.5px] text-text-secondary">
          [Joy egallovchi — qisqacha taqqoslash.]{" "}
          <Link href="/sales-process/battle-cards" className="font-medium text-primary hover:underline">
            Bog'langan raqobat kartasini ko'rish →
          </Link>
        </p>
      </Section>

      <Section title="Narx">
        <p className="text-[13.5px] text-text-secondary">
          {product.price} —{" "}
          <Link href="/products/price-sheet" className="font-medium text-primary hover:underline">
            To'liq narxnomani ko'rish →
          </Link>
        </p>
      </Section>

      <Section title="Eng ko'p uchraydigan e'tirozlar va javoblar">
        <div className="space-y-2">
          {sampleObjections.map((o) => (
            <div key={o.id} className="rounded-lg border border-border bg-surface-alt p-3 text-[13px]">
              <p className="font-medium text-primary-dark">{o.objection}</p>
              <p className="mt-1 text-text-secondary">{o.response}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Eng ko'p so'raladigan texnik savollar">
        <ul className="space-y-1.5 text-[13.5px] text-text-secondary">
          <li>[Joy egallovchi texnik savol 1?]</li>
          <li>[Joy egallovchi texnik savol 2?]</li>
          <li>[Joy egallovchi texnik savol 3?]</li>
        </ul>
      </Section>

      <div className="grid gap-4 sm:grid-cols-2">
        <Section title="Video">
          <div className="flex h-32 items-center justify-center rounded-lg border border-dashed border-border bg-surface-alt text-text-secondary">
            <PlayCircle size={28} />
          </div>
        </Section>
        <Section title="Test">
          <div className="flex h-32 items-center justify-center rounded-lg border border-dashed border-border bg-surface-alt text-text-secondary">
            <FlaskConical size={28} />
          </div>
        </Section>
      </div>

      <FeedbackWidget />
    </div>
  );
}
