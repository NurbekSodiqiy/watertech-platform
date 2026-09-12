"use client";

import type { CertificateItem } from "@/lib/content/certificates";
import { useCertificateLightbox } from "@/components/CertificateLightboxContext";

/** Thin clickable wrapper around server-rendered card markup — this is the
 * only client-interactive part of each grid card, so the card's own content
 * (image, badges, text) stays plain server-rendered JSX passed in as
 * `children`. */
export function CertificateCardTrigger({
  cert,
  className,
  children,
}: {
  cert: CertificateItem;
  className?: string;
  children: React.ReactNode;
}) {
  const { open } = useCertificateLightbox();
  return (
    <div onClick={() => open(cert)} className={className}>
      {children}
    </div>
  );
}
