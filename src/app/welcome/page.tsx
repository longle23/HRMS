import { redirect } from "next/navigation";
import WelcomeClient from "./welcome-client";
import { getVerifiedSessionUser } from "@/lib/server-auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function WelcomePage() {
  const sessionUser = await getVerifiedSessionUser();

  if (!sessionUser) {
    redirect("/login");
  }

  return <WelcomeClient initialUser={sessionUser} />;
}
