import { DocPageTemplate } from "@/components/DocPageTemplate";
import { findNode } from "@/lib/site-config";
import { 
  AlertTriangle, 
  Users, 
  ListTodo, 
  Type, 
  PlusCircle, 
  CopySlash, 
  CheckSquare,
  ArrowRight
} from "lucide-react";
import Link from "next/link";

export default function AmoCRMPage() {
  const path = "/tools/communication-standards";
  const node = findNode(path);

  return (
    <DocPageTemplate
      path={path}
      title="amoCRM dan foydalanish bo'yicha asosiy qoidalar"
      description={node?.description}
      locked={node?.locked}
    >
      <div className="space-y-8">
        
        {/* Asosiy oltin qoida */}
        <div className="flex flex-col sm:flex-row items-start gap-4 rounded-2xl border border-primary/20 bg-primary/10 p-6 shadow-soft">
          <div className="rounded-full bg-surface p-3 text-primary shadow-softer shrink-0">
            <AlertTriangle size={28} />
          </div>
          <div>
            <h3 className="text-[18px] font-bold text-primary-dark">Asosiy Oltin Qoida</h3>
            <p className="mt-2 text-[15.5px] leading-relaxed text-text-secondary">
              <strong className="text-primary-dark font-bold">Agar CRM&apos;da yozilmagan bo&apos;lsa — bo&apos;lmagan deb hisoblanadi!</strong> Barcha qo&apos;ng&apos;iroq, uchrashuv va kelishuvlar CRM&apos;da qayd etilishi shart.
            </p>
          </div>
        </div>

        {/* Qoidalar ro'yxati (Grid) */}
        <div className="grid gap-5 md:grid-cols-2">
          {/* 1. Lid nima? */}
          <div className="flex flex-col gap-3 rounded-2xl border border-border bg-surface-alt p-5 shadow-soft transition-all hover:border-primary/30 hover:shadow-elevated">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface text-primary shadow-softer">
                <Users size={20} />
              </span>
              <h4 className="text-[16px] font-bold text-primary-dark">Lid nima?</h4>
            </div>
            <p className="text-[14px] leading-relaxed text-text-secondary">
              Lid — bu potensial mijoz yoki savdo imkoniyati.
            </p>
          </div>

          {/* 2. Vazifasiz bitim bo'lmasin */}
          <div className="flex flex-col gap-3 rounded-2xl border border-border bg-surface-alt p-5 shadow-soft transition-all hover:border-primary/30 hover:shadow-elevated">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface text-primary shadow-softer">
                <ListTodo size={20} />
              </span>
              <h4 className="text-[16px] font-bold text-primary-dark">Vazifasiz bitim bo&apos;lmasin</h4>
            </div>
            <p className="text-[14px] leading-relaxed text-text-secondary">
              Har bir voronkadagi har bir bitimda (сделка) majburiy vazifa (задача) bo&apos;lishi shart.
            </p>
          </div>

          {/* 3. Lotin alifbosi */}
          <div className="flex flex-col gap-3 rounded-2xl border border-border bg-surface-alt p-5 shadow-soft transition-all hover:border-primary/30 hover:shadow-elevated">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface text-primary shadow-softer">
                <Type size={20} />
              </span>
              <h4 className="text-[16px] font-bold text-primary-dark">Lotin alifbosi</h4>
            </div>
            <p className="text-[14px] leading-relaxed text-text-secondary">
              Bitimdagi mijoz ma&apos;lumotlarini har doim lotin alifbosida yozish shart.
            </p>
          </div>

          {/* 4. Yangi kelishuv — yangi bitim */}
          <div className="flex flex-col gap-3 rounded-2xl border border-border bg-surface-alt p-5 shadow-soft transition-all hover:border-primary/30 hover:shadow-elevated">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface text-primary shadow-softer">
                <PlusCircle size={20} />
              </span>
              <h4 className="text-[16px] font-bold text-primary-dark">Yangi kelishuv — yangi bitim</h4>
            </div>
            <p className="text-[14px] leading-relaxed text-text-secondary">
              Mijoz bilan har bir yangi kelishuv uchun yangi сделка ochish shart.
            </p>
          </div>

          {/* 5. Dublikatlardan saqlaning */}
          <div className="flex flex-col gap-3 rounded-2xl border border-border bg-surface-alt p-5 shadow-soft transition-all hover:border-primary/30 hover:shadow-elevated">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface text-primary shadow-softer">
                <CopySlash size={20} />
              </span>
              <h4 className="text-[16px] font-bold text-primary-dark">Dublikatlardan saqlaning</h4>
            </div>
            <p className="text-[14px] leading-relaxed text-text-secondary">
              CRM&apos;da kontaktni bir martadan ko&apos;p kiritmaslik muhim. Barcha aloqalar bitta karta ostida bo&apos;lishi kerak.
            </p>
          </div>

          {/* 6. Harakatlarni belgilash */}
          <div className="flex flex-col gap-3 rounded-2xl border border-border bg-surface-alt p-5 shadow-soft transition-all hover:border-primary/30 hover:shadow-elevated">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface text-primary shadow-softer">
                <CheckSquare size={20} />
              </span>
              <h4 className="text-[16px] font-bold text-primary-dark">Harakatlarni belgilash</h4>
            </div>
            <p className="text-[14px] leading-relaxed text-text-secondary">
              Har bir qo&apos;ng&apos;iroq, keyingi harakat va vazifani CRM&apos;da belgilang.
            </p>
          </div>
        </div>

        {/* Keyingi bosqich tugmasi */}
        <div className="mt-8 flex justify-end border-t border-border pt-6">
          <Link
            href="/tools/troubleshooting"
            className="group flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-[14.5px] font-semibold text-surface shadow-soft transition-all hover:bg-primary-hover hover:shadow-elevated"
          >
            Sotuv varonkasi qadamlari
            <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
          </Link>
        </div>

      </div>
    </DocPageTemplate>
  );
}
