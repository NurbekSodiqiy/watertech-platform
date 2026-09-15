// Untranslated root fallback — only reachable before a locale can be resolved
// (e.g. an invalid `[locale]` segment calling notFound() from the layout
// itself, before it renders <html>/<body>). The real, translated 404 page is
// app/[locale]/not-found.tsx.
export default function RootNotFound() {
  return (
    <html>
      <body>
        <div style={{ padding: 48, textAlign: "center", fontFamily: "sans-serif" }}>
          <p>Page not found.</p>
        </div>
      </body>
    </html>
  );
}
