import "./globals.css";

// Pass-through: Next.js requires a root layout file to exist, but only one
// segment in the tree may render <html>/<body> — that's app/[locale]/layout.tsx,
// which needs the resolved locale for `lang`.
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
