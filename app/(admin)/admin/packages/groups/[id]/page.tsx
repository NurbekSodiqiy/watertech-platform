import Link from "next/link";
import { notFound } from "next/navigation";
import { History } from "lucide-react";
import { getPackageGroupRow } from "@/lib/admin/queries";
import { packageGroupFormSchema, type PackageGroupFormValues } from "@/lib/admin/schemas";
import { upsertPackageGroup } from "@/lib/admin/actions/packages";
import { EntityForm, type EntityFieldDef } from "@/components/admin/EntityForm";

export const metadata = { title: "Kontent boshqaruvi — Paket guruhi tahrirlash" };

function buildFields(isNew: boolean): EntityFieldDef<PackageGroupFormValues>[] {
  return [
    { kind: "text", name: "id", label: "ID (slug)", placeholder: "masalan: guruh-standart", readOnly: !isNew },
    { kind: "text", name: "title", label: "Nomi" },
    { kind: "text", name: "subtitle", label: "Tavsif" },
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

export default async function AdminPackageGroupEditPage({ params }: { params: { id: string } }) {
  const isNew = params.id === "new";
  const row = isNew ? null : await getPackageGroupRow(params.id);
  if (!isNew && !row) notFound();

  const defaultValues: PackageGroupFormValues = row
    ? { id: row.id, title: row.title, subtitle: row.subtitle, status: row.status }
    : { id: "", title: "", subtitle: "", status: "draft" };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[24px] font-bold text-primary-dark">{isNew ? "Yangi guruh" : "Guruhni tahrirlash"}</h1>
        {!isNew && row && (
          <Link
            href={`/admin/versions/content_package_groups/${row.id}`}
            className="mt-1 inline-flex items-center gap-1.5 text-[13px] text-accent hover:underline"
          >
            <History size={13} />
            Versiyalar tarixi
          </Link>
        )}
      </div>
      <EntityForm
        schema={packageGroupFormSchema}
        defaultValues={defaultValues}
        fields={buildFields(isNew)}
        onSubmit={upsertPackageGroup}
        backHref="/admin/packages/groups"
      />
    </div>
  );
}
