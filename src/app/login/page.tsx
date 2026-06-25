"use client";

import { useEffect } from "react";

const EXTERNAL_LOGIN_URL = "https://ai-platform.sotransgroup.vn/login";

export default function LoginPage() {
  useEffect(() => {
    window.location.replace(EXTERNAL_LOGIN_URL);
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 text-center text-slate-100">
      <div>
        <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Redirecting</p>
        <h1 className="mt-3 text-2xl font-semibold">Đang chuyển đến trang đăng nhập mới</h1>
        <p className="mt-2 text-sm text-slate-300">
          Nếu trình duyệt không tự chuyển, hãy mở{' '}
          <a
            href={EXTERNAL_LOGIN_URL}
            className="font-medium text-sky-300 underline decoration-sky-300/50 underline-offset-4 transition hover:text-sky-200"
          >
            trang đăng nhập mới
          </a>
          .
        </p>
      </div>
    </div>
  );
}
