"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback: ReactNode | ((reset: () => void) => ReactNode);
  onError?: (error: Error, info: ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

/** Contains a render crash to one widget instead of the whole page. A class
 * component because React 18 has no hook equivalent of componentDidCatch.
 * A function `fallback` can only be passed from a Client Component — Server
 * Components use WidgetBoundary instead. */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("[ErrorBoundary]", error, info.componentStack);
    // Browser-only lazy import: Next's compiler folds `typeof window` on the
    // server build, so @sentry/node + OpenTelemetry never enter the SSR
    // bundle (componentDidCatch only runs in the browser anyway). getClient()
    // is undefined when Sentry.init was skipped (no DSN / no Sentry build).
    if (typeof window !== "undefined") {
      import("@sentry/nextjs")
        .then((Sentry) => {
          if (Sentry.getClient()) {
            Sentry.captureException(error, { contexts: { react: { componentStack: info.componentStack } } });
          }
        })
        .catch(() => {
          // Reporting is best-effort; the console.error above already fired.
        });
    }
    this.props.onError?.(error, info);
  }

  reset = (): void => {
    this.setState({ hasError: false });
  };

  render(): ReactNode {
    if (!this.state.hasError) return this.props.children;
    const { fallback } = this.props;
    return typeof fallback === "function" ? fallback(this.reset) : fallback;
  }
}
