import { Breadcrumbs } from "@/components/Breadcrumbs";
import { ComingSoon } from "@/components/ComingSoon";

export default function InternalRulesPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-6 px-6 py-8">
      <div className="space-y-4">
        <Breadcrumbs path="/company/internal-rules" />
        <div>
          <h1 className="text-[32px] font-extrabold leading-tight tracking-tight text-primary-dark">
            Ichki qoidalar
          </h1>
        </div>
      </div>
      <ComingSoon />
    </div>
  );
}
