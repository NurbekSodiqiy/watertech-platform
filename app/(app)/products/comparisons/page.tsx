import { DocPageTemplate } from "@/components/DocPageTemplate";
import { findNode } from "@/lib/site-config";
import { Clock } from "lucide-react";

export default function ComparisonsPage() {
  const path = "/products/comparisons";
  const node = findNode(path);

  return (
    <DocPageTemplate
      path={path}
      title={node?.title || "Taqqoslash"}
      description={node?.description}
      locked={node?.locked}
    >
      <div className="flex flex-col items-center justify-center space-y-4 py-20 text-center">
        <div className="rounded-full bg-primary/10 p-5 text-primary">
          <Clock size={40} />
        </div>
        <h2 className="text-[22px] font-bold text-primary-dark">Tez orada</h2>
        <p className="max-w-md text-[15px] leading-relaxed text-text-secondary">
          Bu bo'lim ustida qizg'in ish olib borilmoqda. Yaqin kunlarda barcha raqobatchilar bilan taqqoslash jadvali va tahlillar yuklanadi.
        </p>
      </div>
    </DocPageTemplate>
  );
}
