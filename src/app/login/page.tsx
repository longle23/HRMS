"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { AccountUser } from "@/types/hr";

export default function LoginPage() {
  const router = useRouter();
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  useEffect(() => {
    const rawUser = window.localStorage.getItem("hrms_session_user");
    if (!rawUser) return;

    try {
      const parsed = JSON.parse(rawUser) as { username?: string };
      if (parsed?.username) {
        router.replace("/welcome");
      } else {
        window.localStorage.removeItem("hrms_session_user");
      }
    } catch {
      window.localStorage.removeItem("hrms_session_user");
    }
  }, [router]);

  async function handleLogin() {
    try {
      setLoginLoading(true);
      setLoginError("");
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: loginUsername.trim(),
          password: loginPassword,
        }),
      });

      const data = (await response.json()) as { user?: AccountUser; error?: string };
      if (!response.ok || !data.user) {
        throw new Error(data.error ?? "Đăng nhập thất bại.");
      }

      window.localStorage.setItem("hrms_session_user", JSON.stringify(data.user));
      setLoginPassword("");
      router.replace("/welcome");
    } catch (error) {
      setLoginError(error instanceof Error ? error.message : "Đăng nhập thất bại.");
    } finally {
      setLoginLoading(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!loginLoading) {
      void handleLogin();
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-100 via-indigo-100 to-cyan-100 text-slate-800">
      <div className="mx-auto flex min-h-screen w-full max-w-xl items-center px-4 py-8">
        <section className="w-full rounded-3xl border border-indigo-200/80 bg-white/90 p-8 shadow-[0_30px_80px_-40px_rgba(59,130,246,0.6)] backdrop-blur">
          <div className="mb-6 flex justify-center">
            <Image
              src="/images/logo.png"
              alt="Sotrans Group"
              width={220}
              height={55}
              className="h-auto w-auto max-w-[220px]"
              priority
            />
          </div>
          <p className="text-center text-xs uppercase tracking-[0.28em] text-indigo-500">HR Internal Login</p>
          <h1 className="mt-3 text-center text-2xl font-bold text-slate-800">Đăng nhập hệ thống HR</h1>
          <p className="mt-2 text-center text-sm text-slate-600">
            Vui lòng đăng nhập để thao tác hồ sơ ứng viên.
          </p>

          <form onSubmit={handleSubmit} className="mt-6">
            <div className="space-y-3">
              <input
                value={loginUsername}
                onChange={(event) => setLoginUsername(event.target.value)}
                placeholder="Tài khoản"
                className="w-full rounded-xl border border-indigo-200 bg-white px-4 py-3 text-base text-slate-800 outline-none ring-indigo-400 transition placeholder:text-slate-400 focus:ring-2"
              />
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={loginPassword}
                  onChange={(event) => setLoginPassword(event.target.value)}
                  placeholder="Mật khẩu"
                  className="w-full rounded-xl border border-indigo-200 bg-white px-4 py-3 pr-11 text-base text-slate-800 outline-none ring-indigo-400 transition placeholder:text-slate-400 focus:ring-2"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-lg text-slate-500 transition hover:text-indigo-600"
                  aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                  title={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                >
                  {showPassword ? "🙈" : "👁️"}
                </button>
              </div>
            </div>

            {loginError ? (
              <p className="mt-4 rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-center text-sm text-rose-700">
                {loginError}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={loginLoading}
              className="mt-6 w-full rounded-xl bg-indigo-600 px-4 py-3 text-base font-semibold text-white transition hover:bg-indigo-500 disabled:opacity-60"
            >
              {loginLoading ? "Đang đăng nhập..." : "Đăng nhập"}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}

