import { ShieldCheck, Award } from "lucide-react";
import { PageHeader } from "@/components/DocPageTemplate";
import { FeedbackWidget } from "@/components/FeedbackWidget";
import { CERTIFICATES } from "@/lib/content/certificates";
import { CertificateGallery } from "@/components/CertificateGallery";

export default function TechnicalDocsPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-6 px-6 py-8">
      <PageHeader
        path="/products/technical-docs"
        title="Texnik hujjatlar va sertifikatlar"
        description="WaterTech mahsulotlarining davlat GOST standartlari talablariga to'liq mosligini tasdiqlovchi rasmiy muvofiqlik sertifikatlari."
      />

      {/* Rasmiy tasdiqlanganlik banneri */}
      <div className="flex flex-col gap-3 rounded-2xl border border-status-ok/30 bg-status-ok/10 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-status-ok/20 text-status-ok">
            <ShieldCheck size={22} />
          </span>
          <div>
            <h3 className="font-semibold text-status-ok">Davlat reestrida ro'yxatdan o'tgan</h3>
            <p className="mt-0.5 text-[13px] leading-relaxed text-status-ok/80">
              Barcha sertifikatlar QR kod orqali davlat muvofiqlik tizimida tekshirilishi mumkin.
            </p>
          </div>
        </div>
      </div>

      <CertificateGallery certificates={CERTIFICATES} />

      {/* Standartlar va normativ hujjatlar ma'lumotnomasi */}
      <div className="rounded-2xl border border-border bg-surface p-6 shadow-soft space-y-4">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Award size={18} />
          </span>
          <h3 className="text-[17px] font-bold text-primary-dark">
            Amaldagi davlat standartlari (GOST) talablari
          </h3>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 text-[13px]">
          <div className="rounded-xl border border-border bg-surface-alt p-3.5 space-y-1">
            <span className="font-mono font-bold text-primary">ГОСТ 32415-2013</span>
            <p className="text-text-secondary leading-snug">
              Bosimli issiq va sovuq suv ta'minoti hamda isitish tizimlari uchun termoplast quvurlar va fitinglar.
            </p>
          </div>

          <div className="rounded-xl border border-border bg-surface-alt p-3.5 space-y-1">
            <span className="font-mono font-bold text-primary">ГОСТ 32414-2013</span>
            <p className="text-text-secondary leading-snug">
              Binolar ichki oqova (kanalizatsiya) tizimlari uchun polipropilen quvurlar (3-qatlamli PREMIUM).
            </p>
          </div>

          <div className="rounded-xl border border-border bg-surface-alt p-3.5 space-y-1">
            <span className="font-mono font-bold text-primary">ГОСТ 32412-2013</span>
            <p className="text-text-secondary leading-snug">
              Ichki kanalizatsiya tizimlari fitinglari, 90° va 45° otvodlar, troyniklar va perexodniklar.
            </p>
          </div>

          <div className="rounded-xl border border-border bg-surface-alt p-3.5 space-y-1">
            <span className="font-mono font-bold text-primary">ГОСТ 34292-2017</span>
            <p className="text-text-secondary leading-snug">
              Suv ta'minoti va isitish liniyalari uchun sharli hamda barashekli kranlar.
            </p>
          </div>

          <div className="rounded-xl border border-border bg-surface-alt p-3.5 space-y-1">
            <span className="font-mono font-bold text-primary">ГОСТ 18599-2001</span>
            <p className="text-text-secondary leading-snug">
              Polietilen va issiqqa chidamli pol isitish (PE-RT) quvurlari.
            </p>
          </div>

          <div className="rounded-xl border border-border bg-surface-alt p-3.5 space-y-1">
            <span className="font-mono font-bold text-primary">Ishlab chiqaruvchi</span>
            <p className="text-text-secondary leading-snug">
              <strong>WATER-TECH MCHJ</strong> (O'zbekiston, Namangan shahri). Seriyali ishlab chiqarish.
            </p>
          </div>
        </div>
      </div>

      <FeedbackWidget />
    </div>
  );
}
