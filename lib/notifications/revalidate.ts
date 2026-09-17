import "server-only";
import { revalidatePath } from "next/cache";

/** Re-renders every view that shows notification data: the admin layout
 * (NotificationsBell in AdminShell, and /admin/notifications under it) and
 * the dashboard layout (NotificationsBell in its header). Route groups are
 * part of the path Next.js tags layouts with, hence `(admin)`. */
export function revalidateNotificationViews(): void {
  revalidatePath("/[locale]/(admin)/admin", "layout");
  revalidatePath("/[locale]/dashboard", "layout");
}
