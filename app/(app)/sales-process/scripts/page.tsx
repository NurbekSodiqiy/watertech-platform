import { Suspense } from "react";
import { getContentBundle } from "@/lib/content/loader";
import { ScriptsWorkspace } from "@/components/scripts/ScriptsWorkspace";

export const metadata = {
  title: "Jonli skriptlar va Yordamchi",
};

export default async function ScriptsPage() {
  const content = await getContentBundle();
  return (
    <Suspense fallback={null}>
      <ScriptsWorkspace content={content} />
    </Suspense>
  );
}
