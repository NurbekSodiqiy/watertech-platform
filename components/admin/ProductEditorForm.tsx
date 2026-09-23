"use client";

import type { DefaultValues } from "react-hook-form";
import { EntityForm, type EntityFieldDef } from "@/components/admin/EntityForm";
import { productFormSchema, type ProductFormInput } from "@/lib/admin/schemas";
import { upsertProduct } from "@/lib/admin/actions/products";

/** The product editor's client boundary. A zod schema is a class instance, and
 * React will not serialize one from a Server Component into a Client
 * Component's props ("Only plain objects … can be passed to Client
 * Components") — so the schema, and the save action that goes with it, are
 * bound here, on the client side, and the page passes only plain data: the
 * translated field list (whose image field carries the upload Server Action
 * reference, which does serialize) and the row's values. */
export function ProductEditorForm({
  defaultValues,
  fields,
}: {
  defaultValues: DefaultValues<ProductFormInput>;
  fields: EntityFieldDef<ProductFormInput>[];
}) {
  return (
    <EntityForm
      schema={productFormSchema}
      defaultValues={defaultValues}
      fields={fields}
      onSubmit={upsertProduct}
      backHref="/admin/products"
      editAfterCreate
      titleField="name_ru"
      table="content_products"
    />
  );
}
