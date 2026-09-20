import { config } from "dotenv";
import path from "node:path";
import type { SupabaseClient } from "@supabase/supabase-js";

// Must run before any import that reads process.env at module load time
// (lib/env.ts, pulled in transitively by lib/supabase/admin.ts) — see the
// dynamic import in main() below for why that one is deferred instead of
// imported at the top like everything else here.
config({ path: path.resolve(process.cwd(), ".env.local") });

import { scripts } from "@/lib/content/scripts";
import { objections } from "@/lib/content/objections";
import { faqs } from "@/lib/content/faq";
import { competitors } from "@/lib/content/competitors";
import { packageGroups } from "@/lib/content/packages";
import { products } from "@/lib/content/products";
import { contacts } from "@/lib/content/contacts";
import { sops } from "@/lib/content/sops";
import {
  scriptToRow,
  objectionToRow,
  faqToRow,
  competitorToRow,
  packageGroupToRow,
  packageToRow,
  productToRow,
  contactToRow,
  sopToRow,
} from "@/lib/content/db";

async function upsertTable(admin: SupabaseClient, table: string, rows: Record<string, unknown>[]): Promise<number> {
  if (rows.length === 0) return 0;
  const { error } = await admin.from(table).upsert(rows, { onConflict: "id" });
  if (error) throw new Error(`${table}: ${error.message}`);
  return rows.length;
}

async function main() {
  // Dynamically imported so lib/env.ts's eager `SUPABASE_SERVICE_ROLE_KEY`
  // validation runs after dotenv has populated process.env above — ES module
  // imports evaluate before this file's own top-level statements regardless
  // of where the import line sits, so a static import here would read an
  // empty environment and throw.
  const { createAdminClient } = await import("@/lib/supabase/admin");
  const admin = createAdminClient();

  // sort_order = array position, so the seeded DB renders in the exact same
  // order the current static TS arrays do.
  const scriptRows = scripts.map((s, i) => ({ ...scriptToRow(s), sort_order: i }));
  const objectionRows = objections.map((o, i) => ({ ...objectionToRow(o), sort_order: i }));
  const faqRows = faqs.map((f, i) => ({ ...faqToRow(f), sort_order: i }));
  const competitorRows = competitors.map((c, i) => ({ ...competitorToRow(c), sort_order: i }));
  const packageGroupRows = packageGroups.map((g, i) => ({ ...packageGroupToRow(g), sort_order: i }));
  const packageRows = packageGroups.flatMap((g) =>
    g.packages.map((p, i) => ({ ...packageToRow(p, g.id), sort_order: i }))
  );
  const productRows = products.map((p, i) => ({ ...productToRow(p), sort_order: i }));

  // The contacts are still placeholders (lib/content/contacts.ts), so they land
  // as drafts — operators see the "no contacts yet" state instead of fake
  // people and numbers until a manager fills them in and publishes. Note the
  // upsert resets every column it writes, status included, so re-running the
  // seed after publishing real contacts would put them back to draft.
  const contactRows = contacts.map((c, i) => ({ ...contactToRow(c), status: "draft", sort_order: i }));

  const sopRows = sops.map((s, i) => ({ ...sopToRow(s), sort_order: i }));

  const counts: Record<string, number> = {};

  // content_packages.group_id references content_package_groups(id) — groups
  // must land first so a fresh database doesn't reject the packages insert.
  counts.content_package_groups = await upsertTable(admin, "content_package_groups", packageGroupRows);
  counts.content_packages = await upsertTable(admin, "content_packages", packageRows);

  const [scriptsCount, objectionsCount, faqsCount, competitorsCount, productsCount] = await Promise.all([
    upsertTable(admin, "content_scripts", scriptRows),
    upsertTable(admin, "content_objections", objectionRows),
    upsertTable(admin, "content_faqs", faqRows),
    upsertTable(admin, "content_competitors", competitorRows),
    upsertTable(admin, "content_products", productRows),
  ]);
  counts.content_scripts = scriptsCount;
  counts.content_objections = objectionsCount;
  counts.content_faqs = faqsCount;
  counts.content_competitors = competitorsCount;
  counts.content_products = productsCount;
  counts.content_contacts = await upsertTable(admin, "content_contacts", contactRows);
  counts.content_sops = await upsertTable(admin, "content_sops", sopRows);

  console.log("Seeded content tables:");
  for (const [table, count] of Object.entries(counts)) {
    console.log(`  ${table}: ${count}`);
  }
}

main().catch((err) => {
  console.error("[seed:content] failed:", err);
  process.exit(1);
});
