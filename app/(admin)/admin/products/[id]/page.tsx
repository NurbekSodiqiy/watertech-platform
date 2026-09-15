import Link from "next/link";
import { notFound } from "next/navigation";
import { History } from "lucide-react";
import { getProductRow } from "@/lib/admin/queries";
import { productFormSchema, type ProductFormInput } from "@/lib/admin/schemas";
import { upsertProduct } from "@/lib/admin/actions/products";
import { EntityForm, type EntityFieldDef } from "@/components/admin/EntityForm";

export const metadata = { title: "Kontent boshqaruvi — Mahsulot tahrirlash" };

function buildFields(isNew: boolean): EntityFieldDef<ProductFormInput>[] {
  return [
    { kind: "text", name: "id", label: "ID (slug)", placeholder: "masalan: truba-ppr", readOnly: !isNew },
    {
      kind: "text",
      name: "filename",
      label: "Fayl nomi",
      placeholder: "masalan: truba-ppr.jpg — public/products/ ichidagi fayl bilan bir xil bo'lishi kerak",
    },
    { kind: "text", name: "name_ru", label: "Nomi (rus tilida)" },
    { kind: "csv", name: "sizes", label: "O'lchamlar", hint: "Vergul bilan ajrating: Ø20, Ø25, Ø32" },
    {
      kind: "select",
      name: "line",
      label: "Yo'nalish",
      options: [
        { value: "ppr", label: "PPR" },
        { value: "kanalizatsiya", label: "Kanalizatsiya" },
      ],
    },
    {
      kind: "select",
      name: "category",
      label: "Kategoriya",
      options: [
        { value: "truba", label: "Truba" },
        { value: "fiting", label: "Fiting" },
        { value: "kran", label: "Kran" },
        { value: "aksessuar", label: "Aksessuar" },
      ],
    },
    {
      kind: "select",
      name: "material",
      label: "Material",
      options: [
        { value: "", label: "—" },
        { value: "latun", label: "Latun" },
      ],
    },
    {
      kind: "select",
      name: "status",
      label: "Holat",
      options: [
        { value: "draft", label: "Qoralama" },
        { value: "published", label: "Nashr etilgan" },
      ],
    },
  ];
}

export default async function AdminProductEditPage({ params }: { params: { id: string } }) {
  const isNew = params.id === "new";
  const row = isNew ? null : await getProductRow(params.id);
  if (!isNew && !row) notFound();

  const defaultValues: ProductFormInput = row
    ? {
        id: row.id,
        filename: row.filename,
        name_ru: row.name_ru,
        sizes: row.sizes.join(", "),
        line: row.line,
        category: row.category,
        material: row.material ?? "",
        status: row.status,
      }
    : { id: "", filename: "", name_ru: "", sizes: "", line: "ppr", category: "truba", material: "", status: "draft" };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[24px] font-bold text-primary-dark">{isNew ? "Yangi mahsulot" : "Mahsulotni tahrirlash"}</h1>
        {!isNew && row && (
          <Link
            href={`/admin/versions/content_products/${row.id}`}
            className="mt-1 inline-flex items-center gap-1.5 text-[13px] text-accent hover:underline"
          >
            <History size={13} />
            Versiyalar tarixi
          </Link>
        )}
      </div>
      <EntityForm
        schema={productFormSchema}
        defaultValues={defaultValues}
        fields={buildFields(isNew)}
        onSubmit={upsertProduct}
        backHref="/admin/products"
      />
    </div>
  );
}
