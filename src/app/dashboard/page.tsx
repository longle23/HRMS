"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  buildInterviewInviteMail,
  buildRejectMail,
  toMailTargets,
} from "@/lib/candidate-utils";
import type { AccountUser, Candidate, CandidateAction } from "@/types/hr";

type LoadState = "idle" | "loading" | "error";
type PendingAction = {
  candidate: Candidate;
  action: CandidateAction;
} | null;

const statusBadgeMap: Record<string, string> = {
  new: "bg-sky-500/15 text-sky-300 border-sky-400/40",
  rejected: "bg-rose-500/15 text-rose-300 border-rose-400/40",
  interview_invited: "bg-emerald-500/15 text-emerald-300 border-emerald-400/40",
};

function renderStatusLabel(status: string) {
  if (status === "interview_invited") return "Interview Invited";
  if (status === "rejected") return "Rejected";
  if (status === "new") return "New";
  return status;
}

export default function DashboardPage() {
  const router = useRouter();
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [state, setState] = useState<LoadState>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [search, setSearch] = useState("");
  const [savingId, setSavingId] = useState("");
  const [sessionUser, setSessionUser] = useState<AccountUser | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);

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

  async function loadCandidates() {
    try {
      setState("loading");
      setErrorMessage("");
      const response = await fetch("/api/candidates", { cache: "no-store" });
      const data = (await response.json()) as {
        candidates?: Candidate[];
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "Không thể tải danh sách ứng viên.");
      }
      setCandidates(data.candidates ?? []);
      setState("idle");
    } catch (error) {
      setState("error");
      setErrorMessage(error instanceof Error ? error.message : "Đã xảy ra lỗi.");
    }
  }

  useEffect(() => {
    if (sessionUser) {
      void loadCandidates();
    }
  }, [sessionUser]);

  const filteredCandidates = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return candidates;
    return candidates.filter((candidate) =>
      [candidate.name, candidate.email, candidate.position]
        .join(" ")
        .toLowerCase()
        .includes(term),
    );
  }, [candidates, search]);

  function handleLogout() {
    setSessionUser(null);
    setCandidates([]);
    setSearch("");
    window.localStorage.removeItem("hrms_session_user");
    router.replace("/login");
  }

  async function executeCandidateAction(candidate: Candidate, action: CandidateAction) {
    if (!sessionUser) {
      alert("Vui lòng đăng nhập.");
      return;
    }

    if (!candidate.email) {
      alert("Ứng viên chưa có email.");
      return;
    }

    const mail =
      action === "reject"
        ? buildRejectMail({ candidateName: candidate.name, position: candidate.position })
        : buildInterviewInviteMail({
            candidateName: candidate.name,
            position: candidate.position,
          });

    const targets = toMailTargets(candidate.email, mail.subject, mail.body);
    window.location.href = targets.mailto;

    try {
      setSavingId(candidate.id);
      const response = await fetch("/api/candidates/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          candidateId: candidate.id,
          candidateName: candidate.name,
          action,
          actor: sessionUser.fullName || sessionUser.username,
        }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? "Lưu hành động thất bại.");
      }

      setCandidates((prev) =>
        prev.map((item) =>
          item.id === candidate.id
            ? {
                ...item,
                status: action === "reject" ? "rejected" : "interview_invited",
                lastActionBy: sessionUser.fullName || sessionUser.username,
              }
            : item,
        ),
      );
    } catch (error) {
      alert(error instanceof Error ? error.message : "Không thể lưu hành động.");
    } finally {
      setSavingId("");
    }
  }

  function handleAction(candidate: Candidate, action: CandidateAction) {
    setPendingAction({ candidate, action });
  }

  async function confirmPendingAction() {
    if (!pendingAction) return;
    const { candidate, action } = pendingAction;
    await executeCandidateAction(candidate, action);
    setPendingAction(null);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-100 via-indigo-100 to-cyan-100 text-slate-800">
      <div className="mx-auto w-full max-w-7xl px-3 py-4 sm:px-4 lg:px-6">
        <header className="rounded-2xl border border-indigo-200/70 bg-white/90 p-4 shadow-[0_20px_50px_-35px_rgba(59,130,246,0.45)] backdrop-blur">
          <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3">
            <div className="flex items-center">
              <Image
                src="/images/logo.png"
                alt="Sotrans Group"
                width={150}
                height={38}
                className="h-auto w-auto max-w-[150px]"
                priority
              />
            </div>
            <div className="text-center">
              <p className="text-[10px] uppercase tracking-[0.28em] text-indigo-500">Internal HR Portal</p>
              <h1 className="mt-1 text-lg font-bold sm:text-xl">
                Quản lý ứng viên & gửi mail qua Outlook
              </h1>
            </div>
            <div className="flex flex-col items-end gap-1">
              <span className="rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-[11px] text-indigo-700">
                Đăng nhập: {sessionUser?.fullName || sessionUser?.username}
              </span>
              <button
                onClick={handleLogout}
                className="rounded-full border border-indigo-300 px-2.5 py-1 text-[11px] font-semibold text-indigo-700 transition hover:bg-indigo-50"
              >
                Đăng xuất
              </button>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
            <div className="rounded-xl border border-indigo-200 bg-indigo-50/70 p-3">
              <p className="text-xs uppercase tracking-wide text-indigo-500">Tổng ứng viên</p>
              <p className="mt-1 text-xl font-bold text-slate-800">{candidates.length}</p>
            </div>
            <div className="rounded-xl border border-indigo-200 bg-indigo-50/70 p-3">
              <p className="text-xs uppercase tracking-wide text-indigo-500">Đang hiển thị</p>
              <p className="mt-1 text-xl font-bold text-indigo-300">{filteredCandidates.length}</p>
            </div>
          </div>
        </header>

        <section className="mt-3 rounded-2xl border border-indigo-200/70 bg-white/90 p-3 shadow-xl sm:p-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-0 flex-1">
              <label className="block text-xs font-medium text-slate-600">
                Tìm kiếm ứng viên (Họ tên, email, vị trí)
              </label>
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Nhập tên, email hoặc vị trí ứng tuyển..."
                className="mt-1 w-full rounded-lg border border-indigo-200 bg-white px-3 py-2 text-sm outline-none ring-indigo-400 transition placeholder:text-slate-400 focus:ring-2"
              />
            </div>
            <button
              onClick={() => setSearch("")}
              className="rounded-lg border border-indigo-300 px-3 py-2 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-50"
            >
              Xóa lọc
            </button>
            <button
              onClick={() => void loadCandidates()}
              className="rounded-lg bg-indigo-500 px-3 py-2 text-xs font-semibold text-white transition hover:bg-indigo-400"
            >
              Tải lại dữ liệu
            </button>
          </div>
        </section>

        <section className="mt-3">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-base font-semibold">Danh sách ứng viên</h2>
          </div>

          {state === "loading" ? (
            <div className="rounded-xl border border-indigo-200 bg-white p-6 text-slate-600">
              Đang tải dữ liệu ứng viên...
            </div>
          ) : null}

          {state === "error" ? (
            <div className="rounded-xl border border-rose-300 bg-rose-50 p-6 text-rose-700">
              {errorMessage}
            </div>
          ) : null}

          {state !== "loading" && candidates.length === 0 ? (
            <div className="rounded-xl border border-indigo-200 bg-white p-6 text-slate-600">
              Chưa có ứng viên trong NocoDB.
            </div>
          ) : null}

          {state !== "loading" && candidates.length > 0 && filteredCandidates.length === 0 ? (
            <div className="rounded-xl border border-indigo-200 bg-white p-6 text-slate-600">
              Không có kết quả khớp từ khóa tìm kiếm.
            </div>
          ) : null}

          <div className="overflow-x-auto rounded-xl border border-indigo-200 bg-white/95">
            <div className="min-w-[1120px]">
              <div className="grid grid-cols-[1fr_1.2fr_0.9fr_0.8fr_1fr_1.3fr] gap-3 border-b border-indigo-200 bg-indigo-50 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-700">
                <span>Họ tên</span>
                <span>Email</span>
                <span>Vị trí</span>
                <span>Trạng thái</span>
                <span>Người thao tác gần nhất</span>
                <span>Thao tác</span>
              </div>
              {filteredCandidates.map((candidate) => (
                <article
                  key={candidate.id}
                  className="grid grid-cols-[1fr_1.2fr_0.9fr_0.8fr_1fr_1.3fr] items-center gap-3 border-b border-indigo-100 px-3 py-2 text-sm transition hover:bg-indigo-50/70"
                >
                  <p className="truncate font-medium text-slate-800">{candidate.name}</p>
                  <p className="truncate text-slate-600">{candidate.email || "No email"}</p>
                  <p className="truncate text-slate-600">{candidate.position}</p>
                  <span
                    className={`w-fit rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                      statusBadgeMap[candidate.status] ?? "border-slate-600 bg-slate-800 text-slate-200"
                    }`}
                  >
                    {renderStatusLabel(candidate.status)}
                  </span>
                  <p className="truncate text-slate-600">{candidate.lastActionBy || "-"}</p>
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => void handleAction(candidate, "reject")}
                      disabled={savingId === candidate.id}
                      className="inline-flex items-center rounded-lg bg-gradient-to-r from-rose-600 to-pink-600 px-3 py-1.5 text-xs font-semibold text-white shadow-[0_6px_14px_-6px_rgba(225,29,72,0.8)] transition hover:-translate-y-0.5 hover:from-rose-500 hover:to-pink-500 hover:shadow-[0_10px_18px_-8px_rgba(225,29,72,0.9)] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
                    >
                      Reject
                    </button>
                    <button
                      onClick={() => void handleAction(candidate, "invite_interview")}
                      disabled={savingId === candidate.id}
                      className="inline-flex items-center rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 px-3 py-1.5 text-xs font-semibold text-white shadow-[0_6px_14px_-6px_rgba(5,150,105,0.8)] transition hover:-translate-y-0.5 hover:from-emerald-500 hover:to-teal-500 hover:shadow-[0_10px_18px_-8px_rgba(5,150,105,0.9)] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
                    >
                      Invite
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      </div>

      {pendingAction ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-md rounded-2xl border border-indigo-200 bg-white p-5 shadow-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-500">
              Xác nhận thao tác
            </p>
            <h3 className="mt-2 text-lg font-bold text-slate-800">
              {pendingAction.action === "reject" ? "Reject ứng viên" : "Mời phỏng vấn"}
            </h3>
            <p className="mt-2 text-sm text-slate-600">
              Bạn có chắc muốn{" "}
              <span className="font-semibold text-slate-800">
                {pendingAction.action === "reject" ? "Reject" : "Invite Interview"}
              </span>{" "}
              cho ứng viên{" "}
              <span className="font-semibold text-slate-800">{pendingAction.candidate.name}</span>?
            </p>
            <div className="mt-5 flex items-center justify-between gap-3">
              <button
                onClick={() => setPendingAction(null)}
                disabled={Boolean(savingId)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-60"
              >
                Hủy
              </button>
              <button
                onClick={() => void confirmPendingAction()}
                disabled={Boolean(savingId)}
                className={`rounded-lg px-4 py-2 text-sm font-semibold text-white transition disabled:opacity-60 ${
                  pendingAction.action === "reject"
                    ? "bg-rose-600 hover:bg-rose-500"
                    : "bg-emerald-600 hover:bg-emerald-500"
                }`}
              >
                {savingId ? "Đang xử lý..." : "Xác nhận"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

