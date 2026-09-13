import { AppShell } from "@/components/AppShell";
import { SessionProvider } from "@/components/providers/SessionProvider";

export default function AppGroupLayout({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <AppShell>{children}</AppShell>
    </SessionProvider>
  );
}
