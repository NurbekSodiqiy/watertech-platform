"use client";

// Untranslated root fallback — only reachable before a locale can be resolved
// (e.g. an error thrown by app/layout.tsx itself). The real, translated error
// boundary is app/[locale]/error.tsx.
export default function RootError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body>
        <div style={{ padding: 48, textAlign: "center", fontFamily: "sans-serif" }}>
          <p>Something went wrong.</p>
          <button onClick={() => reset()}>Try again</button>
        </div>
      </body>
    </html>
  );
}
