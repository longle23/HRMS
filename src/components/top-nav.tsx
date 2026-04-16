"use client";

import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";

export type TopNavUser = {
  name: string;
};

export function TopNav({
  user,
  onLogout,
}: {
  user?: TopNavUser | null;
  onLogout?: () => void;
}) {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <div className="sticky top-0 z-40 border-b border-indigo-200/70 bg-white/90 backdrop-blur">
      <div className="mx-auto flex w-full max-w-7xl items-center gap-3 px-3 py-3 sm:px-4 lg:px-6">
        <button onClick={() => router.push("/welcome")} className="shrink-0">
          <Image
            src="/images/logo.png"
            alt="Sotrans Group"
            width={132}
            height={34}
            className="h-auto w-auto max-w-[132px]"
            priority
          />
        </button>

        <nav className="flex flex-1 items-center justify-center overflow-x-auto">
          <div className="flex min-w-max items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50/70 p-1 shadow-sm">
            <NavButton label="Ứng viên" active={pathname === "/dashboard"} onClick={() => router.push("/dashboard")} />
            <NavButton label="Job" active={pathname === "/jd"} onClick={() => router.push("/jd")} />
          </div>
        </nav>

        <div className="flex shrink-0 items-center gap-2">
          <span className="rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-sm text-indigo-700">
            Xin chào {user?.name || "Nhân sự"}
          </span>
          {onLogout ? (
            <button
              onClick={onLogout}
              className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Đăng xuất
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function NavButton({ label, active, onClick }: { label: string; active?: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-4 py-2 text-sm font-semibold transition ${active ? "bg-gradient-to-r from-indigo-600 to-cyan-600 text-white shadow-lg shadow-indigo-200" : "text-indigo-700 hover:bg-white hover:shadow"}`}
    >
      {label}
    </button>
  );
}
