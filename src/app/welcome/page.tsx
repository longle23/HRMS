"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { AccountUser } from "@/types/hr";
import { TopNav } from "@/components/top-nav";

export default function WelcomePage() {
  const router = useRouter();
  const [sessionUser, setSessionUser] = useState<AccountUser | null>(null);

  useEffect(() => {
    const rawUser = window.localStorage.getItem("hrms_session_user");
    if (!rawUser) {
      router.replace("/login");
      return;
    }

    try {
      const parsed = JSON.parse(rawUser) as AccountUser;
      if (parsed?.username) setSessionUser(parsed);
      else router.replace("/login");
    } catch {
      window.localStorage.removeItem("hrms_session_user");
      router.replace("/login");
    }
  }, [router]);

  return (
    <main className="min-h-screen bg-gradient-to-br from-sky-100 via-indigo-100 to-cyan-100 text-slate-800">
      <TopNav user={sessionUser ? { name: sessionUser.fullName || sessionUser.username } : null} onLogout={() => { window.localStorage.removeItem("hrms_session_user"); router.replace("/login"); }} />

      <div className="mx-auto flex min-h-[calc(100vh-70px)] w-full max-w-7xl items-center px-4 py-10">
        <section className="relative w-full overflow-hidden rounded-[36px] border border-white/40 bg-white/85 p-6 shadow-[0_40px_120px_-48px_rgba(59,130,246,0.65)] backdrop-blur md:p-8 lg:p-10">
          <div className="absolute -left-16 -top-16 h-48 w-48 rounded-full bg-indigo-200/50 blur-3xl" />
          <div className="absolute -right-20 bottom-[-3rem] h-56 w-56 rounded-full bg-cyan-200/40 blur-3xl" />
          <div className="absolute right-8 top-8 h-24 w-24 rounded-full bg-white/60 blur-2xl" />

          <div className="relative mx-auto flex max-w-4xl flex-col items-center text-center">
            <p className="inline-flex rounded-full border border-indigo-200 bg-indigo-50 px-4 py-1 text-[11px] font-semibold uppercase tracking-[0.3em] text-indigo-600">
              Welcome Portal
            </p>
            <h1 className="mt-4 text-4xl font-black tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
              Chào mừng đến
              <span className="block bg-gradient-to-r from-indigo-600 via-sky-600 to-cyan-600 bg-clip-text text-transparent">
                hệ thống HRMS
              </span>
            </h1>
            <p className="mt-4 max-w-4xl text-base leading-8 text-slate-600 sm:text-lg">
              Từ đây bạn có thể nhanh chóng chuyển sang trang ứng viên hoặc JD để theo dõi công việc và thao tác.
            </p>

            <div className="mt-8 w-full max-w-3xl rounded-[28px] border border-indigo-100 bg-gradient-to-br from-indigo-50 via-white to-cyan-50 p-5 shadow-sm md:p-7">
              <p className="text-sm font-semibold text-indigo-900">Tài khoản hiện tại</p>
              <p className="mt-2 text-2xl font-bold text-slate-900 sm:text-3xl">{sessionUser?.fullName || sessionUser?.username || "Nhân sự"}</p>
              <p className="mt-2 text-sm text-slate-600">Sẵn sàng bắt đầu phiên làm việc.</p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
