import { redirect } from "next/navigation";
import DashboardClient from "./dashboard-client";
import { getVerifiedSessionUser } from "@/lib/server-auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function DashboardPage() {
  const sessionUser = await getVerifiedSessionUser();

  if (!sessionUser) {
    redirect("/login");
  }

  return <DashboardClient initialUser={sessionUser} />;
}
