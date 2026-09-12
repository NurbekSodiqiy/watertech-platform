"use client";

import { useEffect } from "react";
import Image from "next/image";
import { ExternalLink, X, ChevronRight, ChevronLeft, Download } from "lucide-react";
import { useCertificateLightbox } from "@/components/CertificateLightboxContext";

/** Lightbox/modal only — the card grid lives in CertificateGrid.tsx (a
 * Server Component) so this stays the sole client-interactive piece. */
export function CertificateGallery() {
  const { selectedCert, currentImageIndex, close, nextImage, prevImage } = useCertificateLightbox();

  useEffect(() => {
    if (!selectedCert) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectedCert, close]);

  if (!selectedCert) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-primary-dark/85 p-4 backdrop-blur-md"
      onClick={close}
    >
      <div
        className="relative flex max-h-[95vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-elevated"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal bosh qismi */}
        <div className="flex items-center justify-between border-b border-border bg-surface px-5 py-4">
          <div className="min-w-0 pr-4">
            <div className="flex items-center gap-3">
              <h3 className="truncate text-[16px] font-bold text-primary-dark">
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
              title="To'liq o'lchamda ochish"
            >
              <ExternalLink size={15} />
              <span className="hidden sm:inline">To&apos;liq o&apos;lcham</span>
            </a>

            <a
              href={selectedCert.images[currentImageIndex]}
              download
              className="flex h-9 items-center gap-1.5 rounded-xl bg-primary px-3 text-[12.5px] font-medium text-surface hover:bg-primary-hover shadow-softer transition-colors"
              title="Rasmni yuklab olish"
            >
              <Download size={15} />
              <span className="hidden sm:inline">Yuklab olish</span>
            </a>

            <button
              onClick={close}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-surface-alt text-text-secondary hover:bg-primary/10 hover:text-primary-dark transition-colors ml-1"
              aria-label="Yopish"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Rasm ko'rinishi */}
        <div className="relative flex-1 flex items-center justify-center overflow-hidden bg-surface-alt/70">

          {selectedCert.images.length > 1 && (
            <button
              onClick={prevImage}
              disabled={currentImageIndex === 0}
              className="absolute left-4 z-10 flex h-12 w-12 items-center justify-center rounded-full bg-surface/90 text-primary-dark shadow-soft backdrop-blur disabled:opacity-30 disabled:cursor-not-allowed hover:bg-surface hover:text-primary hover:scale-105 transition-all"
            >
              <ChevronLeft size={28} />
            </button>
          )}

          <div className="relative h-full w-full p-4">
            <Image
              key={currentImageIndex}
              src={selectedCert.images[currentImageIndex]}
              alt={`${selectedCert.title} - ${currentImageIndex + 1}-bet`}
              fill
              sizes="(min-width: 1024px) 60vw, 90vw"
              className="rounded-lg border border-border shadow-soft object-contain"
            />
          </div>

          {selectedCert.images.length > 1 && (
            <button
              onClick={nextImage}
              disabled={currentImageIndex === selectedCert.images.length - 1}
              className="absolute right-4 z-10 flex h-12 w-12 items-center justify-center rounded-full bg-surface/90 text-primary-dark shadow-soft backdrop-blur disabled:opacity-30 disabled:cursor-not-allowed hover:bg-surface hover:text-primary hover:scale-105 transition-all"
            >
              <ChevronRight size={28} />
            </button>
          )}
        </div>

        {/* Modal tag qismi */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border bg-surface px-5 py-3 text-[12.5px] text-text-secondary">
          <span>Organ: <strong className="text-primary-dark">{selectedCert.orgName}</strong></span>
          <span>Amal qilish muddati: <strong className="text-status-ok">{selectedCert.validUntil}</strong></span>
        </div>
      </div>
    </div>
  );
}
