"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const rawUser = window.localStorage.getItem("hrms_session_user");
    if (!rawUser) {
      router.replace("/login");
      return;
    }

    try {
      const parsed = JSON.parse(rawUser) as { username?: string };
      router.replace(parsed?.username ? "/dashboard" : "/login");
    } catch {
      window.localStorage.removeItem("hrms_session_user");
      router.replace("/login");
    }
  }, [router]);

  return null;
}
