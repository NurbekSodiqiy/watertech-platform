"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { ExternalLink, X, ChevronRight, ChevronLeft, Download } from "lucide-react";
import { useCertificateLightbox } from "@/components/CertificateLightboxContext";
import { Dialog } from "@/components/ui/Dialog";

const TITLE_ID = "certificate-lightbox-title";

/** Lightbox/modal only — the card grid lives in CertificateGrid.tsx (a
 * Server Component) so this stays the sole client-interactive piece.
 * Escape, the backdrop click and the focus trap come from <Dialog>. */
export function CertificateGallery() {
  const { selectedCert, currentImageIndex, close, nextImage, prevImage } = useCertificateLightbox();
  const t = useTranslations("pages.products.technicalDocs.certificates");
  const tCommon = useTranslations("common");

  if (!selectedCert) return null;

  return (
    <Dialog
      open
      onClose={close}
      labelledBy={TITLE_ID}
      containerClassName="z-50 flex items-center justify-center p-4"
      backdropClassName="bg-primary-dark/85 backdrop-blur-md"
      panelClassName="flex h-[640px] max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-elevated"
    >
    {/* Modal bosh qismi */}
    <div className="flex items-center justify-between border-b border-border bg-surface px-5 py-4">
      <div className="min-w-0 pr-4">
        <div className="flex items-center gap-3">
          <h3 id={TITLE_ID} className="truncate text-[16px] font-bold text-primary-dark">
            {selectedCert.title}
          </h3>
          {selectedCert.images.length > 1 && (
            <span className="rounded-md bg-primary/10 px-2 py-0.5 text-[12px] font-bold text-primary">
              {currentImageIndex + 1} / {selectedCert.images.length}
            </span>
          )}
        </div>
        <p className="text-[12.5px] font-mono text-text-secondary mt-0.5">
          {selectedCert.certNumber}
        </p>
      </div>

      <div className="flex items-center gap-2">
        <a
          href={selectedCert.images[currentImageIndex]}
          target="_blank"
          rel="noopener noreferrer"
          className="flex h-9 items-center gap-1.5 rounded-xl border border-border bg-surface-alt px-3 text-[12.5px] font-medium text-primary-dark hover:bg-primary/10 transition-colors"
          title={t("lightbox.openFullSize")}
        >
          <ExternalLink aria-hidden="true" size={15} />
          <span className="hidden sm:inline">{t("fullSize")}</span>
        </a>

        <a
          href={selectedCert.images[currentImageIndex]}
          download
          className="flex h-9 items-center gap-1.5 rounded-xl bg-primary px-3 text-[12.5px] font-medium text-surface hover:bg-primary-hover shadow-softer transition-colors"
          title={t("lightbox.downloadTitle")}
        >
          <Download aria-hidden="true" size={15} />
          <span className="hidden sm:inline">{t("lightbox.download")}</span>
        </a>

        <button
          onClick={close}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-surface-alt text-text-secondary hover:bg-primary/10 hover:text-primary-dark transition-colors ml-1"
          aria-label={tCommon("close")}
        >
          <X aria-hidden="true" size={18} />
        </button>
      </div>
    </div>

    {/* Rasm ko'rinishi */}
    <div className="relative flex-1 flex items-center justify-center overflow-hidden bg-surface-alt/70">

      {selectedCert.images.length > 1 && (
        <button
          onClick={prevImage}
          disabled={currentImageIndex === 0}
          aria-label={t("lightbox.prev")}
          className="absolute left-4 z-10 flex h-12 w-12 items-center justify-center rounded-full bg-surface/90 text-primary-dark shadow-soft backdrop-blur disabled:opacity-30 disabled:cursor-not-allowed hover:bg-surface hover:text-primary hover:scale-105 transition-all"
        >
          <ChevronLeft aria-hidden="true" size={28} />
        </button>
      )}

      <div className="relative h-full w-full p-4">
        <Image
          key={currentImageIndex}
          src={selectedCert.images[currentImageIndex]}
          alt={t("lightbox.pageAlt", { title: selectedCert.title, page: currentImageIndex + 1 })}
          fill
          sizes="(min-width: 1024px) 60vw, 90vw"
          className="rounded-lg border border-border shadow-soft object-contain"
        />
      </div>

      {selectedCert.images.length > 1 && (
        <button
          onClick={nextImage}
          disabled={currentImageIndex === selectedCert.images.length - 1}
          aria-label={t("lightbox.next")}
          className="absolute right-4 z-10 flex h-12 w-12 items-center justify-center rounded-full bg-surface/90 text-primary-dark shadow-soft backdrop-blur disabled:opacity-30 disabled:cursor-not-allowed hover:bg-surface hover:text-primary hover:scale-105 transition-all"
        >
          <ChevronRight aria-hidden="true" size={28} />
        </button>
      )}
    </div>

    {/* Modal tag qismi */}
    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border bg-surface px-5 py-3 text-[12.5px] text-text-secondary">
      <span>
        {t.rich("lightbox.organ", {
          name: selectedCert.orgName,
          strong: (chunks) => <strong className="text-primary-dark">{chunks}</strong>,
        })}
      </span>
      <span>
        {t.rich("validUntil", {
          date: selectedCert.validUntil,
          strong: (chunks) => <strong className="text-status-ok">{chunks}</strong>,
        })}
      </span>
    </div>
    </Dialog>
  );
}
