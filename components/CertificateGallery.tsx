"use client";

import { useState } from "react";
import {
  ExternalLink,
  ZoomIn,
  X,
  Calendar,
  Building2,
  FileText,
  ChevronRight,
  ChevronLeft,
  Download,
  Layers
} from "lucide-react";
import type { CertificateItem } from "@/lib/content/certificates";

export function CertificateGallery({ certificates }: { certificates: CertificateItem[] }) {
  const [selectedCert, setSelectedCert] = useState<CertificateItem | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const handleOpenModal = (cert: CertificateItem) => {
    setSelectedCert(cert);
    setCurrentImageIndex(0);
  };

  const handleNextImage = () => {
    if (selectedCert && currentImageIndex < selectedCert.images.length - 1) {
      setCurrentImageIndex(prev => prev + 1);
    }
  };

  const handlePrevImage = () => {
    if (currentImageIndex > 0) {
      setCurrentImageIndex(prev => prev - 1);
    }
  };

  return (
    <>
      {/* Sertifikatlar kartochkalari gridi */}
      <div className="grid gap-6 md:grid-cols-2">
        {certificates.map((cert) => (
          <div
            key={cert.id}
            className="flex flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-soft transition-all hover:border-primary/40 hover:shadow-elevated"
          >
            {/* Rasm ko'rinishi qismi */}
            <div
              onClick={() => handleOpenModal(cert)}
              className="group relative flex h-80 w-full cursor-pointer items-center justify-center overflow-hidden border-b border-border bg-surface-alt p-4"
            >
              <div className="relative h-full w-full">
                <img
                  src={cert.images[0]}
                  alt={cert.title}
                  className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-105"
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
            </div>

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
                <button
                  type="button"
                  onClick={() => handleOpenModal(cert)}
                  className="flex items-center gap-1.5 rounded-xl border border-border bg-surface-alt px-4 py-2 text-[13px] font-medium text-primary-dark transition-colors hover:bg-primary/10 hover:text-primary"
                >
                  {cert.images.length > 1 ? <Layers size={16} /> : <ZoomIn size={16} />}
                  {cert.images.length > 1 ? "O'qish" : "Rasmni ochish"}
                </button>

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

      {/* Lightbox Modal (Rasmni to'liq ko'rish) */}
      {selectedCert && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-primary-dark/85 p-4 backdrop-blur-md"
          onClick={() => setSelectedCert(null)}
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
                  <span className="hidden sm:inline">To'liq o'lcham</span>
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
                  onClick={() => setSelectedCert(null)}
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
                  onClick={handlePrevImage}
                  disabled={currentImageIndex === 0}
                  className="absolute left-4 z-10 flex h-12 w-12 items-center justify-center rounded-full bg-surface/90 text-primary-dark shadow-soft backdrop-blur disabled:opacity-30 disabled:cursor-not-allowed hover:bg-surface hover:text-primary hover:scale-105 transition-all"
                >
                  <ChevronLeft size={28} />
                </button>
              )}

              <div className="h-full w-full overflow-auto p-4 flex items-center justify-center">
                <img
                  key={currentImageIndex}
                  src={selectedCert.images[currentImageIndex]}
                  alt={`${selectedCert.title} - ${currentImageIndex + 1}-bet`}
                  className="max-h-[72vh] w-auto rounded-lg border border-border shadow-soft object-contain"
                />
              </div>

              {selectedCert.images.length > 1 && (
                <button
                  onClick={handleNextImage}
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
      )}
    </>
  );
}
