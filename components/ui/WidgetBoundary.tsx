"use client";

import type { ReactNode } from "react";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { WidgetFallback } from "@/components/ui/WidgetFallback";

/** ErrorBoundary + WidgetFallback in one client island, so Server Components
 * can wrap a widget without passing a function prop across the RSC boundary. */
export function WidgetBoundary({ children }: { children: ReactNode }) {
  return <ErrorBoundary fallback={(reset) => <WidgetFallback reset={reset} />}>{children}</ErrorBoundary>;
}
