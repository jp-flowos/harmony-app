import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/is-admin";
import AdminDashboardClient from "./AdminDashboardClient";

export default async function AdminPage() {
  const { isAdmin, userId } = await requireAdmin();
  if (!userId) redirect("/login");
  if (!isAdmin) redirect("/");
  return <AdminDashboardClient />;
}
