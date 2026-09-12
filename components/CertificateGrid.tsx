import Image from "next/image";
import { ExternalLink, ZoomIn, Calendar, Building2, FileText, Layers } from "lucide-react";
import type { CertificateItem } from "@/lib/content/certificates";
import { CertificateCardTrigger } from "@/components/CertificateCardTrigger";

/** Server-rendered card grid — no client JS needed for the cards themselves,
 * only the two spots that open the lightbox use the small client
 * CertificateCardTrigger wrapper. */
export function CertificateGrid({ certificates }: { certificates: CertificateItem[] }) {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      {certificates.map((cert) => (
        <div
          key={cert.id}
          className="flex flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-soft transition-all hover:border-primary/40 hover:shadow-elevated"
        >
          {/* Rasm ko'rinishi qismi */}
          <CertificateCardTrigger
            cert={cert}
            className="group relative flex h-80 w-full cursor-pointer items-center justify-center overflow-hidden border-b border-border bg-surface-alt p-4"
          >
            <div className="relative h-full w-full">
              <Image
                src={cert.images[0]}
                alt={cert.title}
                fill
                sizes="(min-width: 768px) 50vw, 100vw"
                className="object-contain transition-transform duration-300 group-hover:scale-105"
              />
            </div>

            {/* Hover overlay */}
            <div className="absolute inset-0 flex items-center justify-center bg-primary-dark/40 opacity-0 backdrop-blur-[2px] transition-opacity duration-200 group-hover:opacity-100">
              <span className="flex items-center gap-2 rounded-xl bg-surface px-4 py-2 text-[13px] font-semibold text-primary-dark shadow-soft">
                {cert.images.length > 1 ? <Layers size={16} className="text-primary" /> : <ZoomIn size={16} className="text-primary" />}
                {cert.images.length > 1 ? `Barcha hujjatlarni ochish (${cert.images.length} ta bet)` : "Kattalashtirib ko'rish"}
              </span>
            </div>

            {/* Badjlar */}
            <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
              <span className="rounded-lg bg-surface/90 px-2.5 py-1 text-[11px] font-semibold text-primary shadow-softer backdrop-blur">
                {cert.categoryLabel}
              </span>
              {cert.images.length > 1 && (
                <span className="flex items-center gap-1 rounded-lg bg-primary/15 px-2.5 py-1 text-[11px] font-bold text-primary backdrop-blur">
                  <Layers size={12} />
                  {cert.images.length} ta bet
                </span>
              )}
            </div>

            <div className="absolute bottom-3 right-3">
              <span className="rounded-lg bg-surface/90 px-2 py-0.5 text-[10.5px] font-mono text-text-secondary shadow-softer">
                QR: {cert.qrCodeNumber}
              </span>
            </div>
          </CertificateCardTrigger>

          {/* Ma'lumotlar qismi */}
          <div className="flex flex-1 flex-col justify-between p-5">
            <div className="space-y-3">
              <div>
                <h4 className="text-[17px] font-bold text-primary-dark">
                  {cert.title}
                </h4>
                <p className="mt-1 font-mono text-[12.5px] font-semibold text-primary">
                  {cert.certNumber}
                </p>
              </div>

              <div className="space-y-2.5 border-t border-border/70 pt-3 text-[13px]">
                <div className="flex items-start gap-2.5 text-text-secondary">
                  <Building2 size={16} className="mt-0.5 shrink-0 text-primary" />
                  <span className="leading-snug">{cert.orgName}</span>
                </div>

                <div className="flex items-center gap-2.5 text-text-secondary">
                  <Calendar size={16} className="shrink-0 text-primary" />
                  <span>Amal qilish muddati: <strong className="text-primary-dark">{cert.validUntil}</strong></span>
                </div>

                <div className="flex items-start gap-2.5 text-text-secondary">
                  <FileText size={16} className="mt-0.5 shrink-0 text-primary" />
                  <span className="leading-snug line-clamp-3">{cert.scope}</span>
                </div>
              </div>

              {/* GOST standartlari teglari */}
              <div className="flex flex-wrap gap-1.5 pt-2">
                {cert.standards.map((st) => (
                  <span
                    key={st}
                    className="rounded-md border border-border bg-surface-alt px-2 py-0.5 text-[11px] font-medium text-text-secondary"
                  >
                    {st}
                  </span>
                ))}
              </div>
            </div>

            {/* Pastki amallar paneli */}
            <div className="mt-6 flex items-center justify-between border-t border-border pt-4">
              <CertificateCardTrigger cert={cert} className="contents">
                <button
                  type="button"
                  className="flex items-center gap-1.5 rounded-xl border border-border bg-surface-alt px-4 py-2 text-[13px] font-medium text-primary-dark transition-colors hover:bg-primary/10 hover:text-primary"
                >
                  {cert.images.length > 1 ? <Layers size={16} /> : <ZoomIn size={16} />}
                  {cert.images.length > 1 ? "O'qish" : "Rasmni ochish"}
                </button>
              </CertificateCardTrigger>

              <a
                href={cert.images[0]}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 rounded-xl bg-primary/10 px-4 py-2 text-[13px] font-medium text-primary transition-colors hover:bg-primary hover:text-surface"
              >
                <span>{cert.images.length > 1 ? "1-bet (To'liq)" : "To'liq o'lcham"}</span>
                <ExternalLink size={15} />
              </a>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
