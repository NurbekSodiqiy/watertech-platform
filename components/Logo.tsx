import React from "react";
import { useTranslations } from "next-intl";

export function Logo({ className }: { className?: string }) {
  const t = useTranslations("chrome");
  return (
    <svg 
      className={className} 
      viewBox="0 0 100 100" 
      xmlns="http://www.w3.org/2000/svg" 
      role="img" 
      aria-label={t("logo")}
    >
      <polygon 
        points="50,5 88.97,27.5 88.97,72.5 50,95 11.03,72.5 11.03,27.5" 
        className="text-accent dark:text-text-primary fill-current"
      />
      <text 
        x="50" 
        y="63" 
        textAnchor="middle" 
        fontFamily="system-ui, -apple-system, 'Segoe UI', sans-serif" 
        fontSize="34" 
        fontWeight="700" 
        className="text-surface fill-current"
      >
        WT
      </text>
    </svg>
  );
}
