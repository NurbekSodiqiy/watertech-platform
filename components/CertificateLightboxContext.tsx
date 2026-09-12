"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import type { CertificateItem } from "@/lib/content/certificates";

interface CertificateLightboxValue {
  selectedCert: CertificateItem | null;
  currentImageIndex: number;
  open: (cert: CertificateItem) => void;
  close: () => void;
  nextImage: () => void;
  prevImage: () => void;
}

const CertificateLightboxContext = createContext<CertificateLightboxValue | null>(null);

/** Owns which certificate (if any) is open in the lightbox, so the static
 * card grid (a Server Component) only needs a tiny client trigger per card
 * instead of the whole grid being a Client Component. */
export function CertificateLightboxProvider({ children }: { children: ReactNode }) {
  const [selectedCert, setSelectedCert] = useState<CertificateItem | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const value = useMemo<CertificateLightboxValue>(
    () => ({
      selectedCert,
      currentImageIndex,
      open: (cert) => {
        setSelectedCert(cert);
        setCurrentImageIndex(0);
      },
      close: () => setSelectedCert(null),
      nextImage: () =>
        setCurrentImageIndex((prev) =>
          selectedCert && prev < selectedCert.images.length - 1 ? prev + 1 : prev
        ),
      prevImage: () => setCurrentImageIndex((prev) => (prev > 0 ? prev - 1 : prev)),
    }),
    [selectedCert, currentImageIndex]
  );

  return <CertificateLightboxContext.Provider value={value}>{children}</CertificateLightboxContext.Provider>;
}

export function useCertificateLightbox() {
  const ctx = useContext(CertificateLightboxContext);
  if (!ctx) throw new Error("useCertificateLightbox must be used within a CertificateLightboxProvider");
  return ctx;
}
