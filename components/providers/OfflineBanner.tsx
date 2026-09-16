"use client";

import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";
import { useTranslations } from "next-intl";

/** Slim banner shown while the browser reports no connection, so an operator
 * reading a cached script knows the content may be stale.
 *
 * `navigator.onLine` is read in an effect, never during render — a statically
 * prerendered page would otherwise ship the build-time value and hydrate with
 * a mismatch (CLAUDE.md #3). Rendering nothing until then is intentional: the
 * banner is additive chrome, so there is no layout to reserve. */
export function OfflineBanner() {
  const [offline, setOffline] = useState(false);
  const t = useTranslations("chrome.offline");

  useEffect(() => {
    const sync = () => setOffline(!navigator.onLine);
    sync();
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
  }, []);

  if (!offline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="flex items-center justify-center gap-2 border-b border-border bg-status-warning/10 px-4 py-1.5 text-[12.5px] font-medium text-primary-dark"
    >
      <WifiOff size={14} aria-hidden="true" className="shrink-0" />
      {t("banner")}
    </div>
  );
}
