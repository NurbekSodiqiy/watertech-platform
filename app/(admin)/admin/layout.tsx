import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth/server-session";
import { SessionProvider } from "@/components/providers/SessionProvider";
import { AdminShell } from "@/components/admin/AdminShell";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession();
  if (!session || session.role !== "manager") redirect("/");

  return (
    <SessionProvider>
      <AdminShell>{children}</AdminShell>
    </SessionProvider>
  );
}
