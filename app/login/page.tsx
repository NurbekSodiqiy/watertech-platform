import { AlertTriangle } from "lucide-react";
import { Logo } from "@/components/Logo";
import { GoogleSignInButton } from "./GoogleSignInButton";

// Fixed, full-viewport overlay. AppShell now only mounts inside the
// app/(app) route group, so this route has no shell to cover any more —
// kept as a harmless belt-and-braces guard against anything ever being
// rendered behind it.
export default function LoginPage({ searchParams }: { searchParams: { error?: string } }) {
  const notAllowed = searchParams.error === "not_allowed";

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-surface p-8 text-center shadow-soft">
        <Logo className="mx-auto h-12 w-12" />
        <h1 className="mt-4 text-[20px] font-bold text-primary-dark">WaterTech Bilimlar Bazasi</h1>
        <p className="mt-1 text-[13px] text-text-secondary">Davom etish uchun tizimga kiring</p>

        {notAllowed && (
          <div className="mt-5 flex items-start gap-2.5 rounded-xl border border-status-warning/40 bg-status-warning/10 px-4 py-3 text-left">
            <AlertTriangle size={16} className="mt-0.5 shrink-0 text-status-warning" />
            <p className="text-[13px] leading-relaxed text-primary-dark">
              Sizga kirish huquqi berilmagan, administrator bilan bog&apos;laning.
            </p>
          </div>
        )}

        <GoogleSignInButton />
      </div>
    </div>
  );
}
