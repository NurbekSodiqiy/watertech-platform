"use client";

import { useTranslations } from "next-intl";
import { useSessionUser } from "@/hooks/useSessionUser";

/** Reads the display name from SessionProvider instead of calling
 * auth.getUser() itself — avoids a duplicate session read per component. */
export function HomeGreeting() {
  const { user } = useSessionUser();
  const t = useTranslations("pages.home");

  return (
    <h1 className="text-[32px] font-extrabold tracking-tight text-primary-dark">
      {user ? t("greeting", { name: user.name }) : t("greetingAnonymous")}
    </h1>
  );
}
