import { redirect } from "next/navigation";
import JDClient from "./jd-client";
import { getVerifiedSessionUser } from "@/lib/server-auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function JDPage() {
  const sessionUser = await getVerifiedSessionUser();

  if (!sessionUser) {
    redirect("/login");
  }

  return <JDClient initialUser={sessionUser} />;
}
