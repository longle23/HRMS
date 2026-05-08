"use client";

import { useEffect, useMemo, useState } from "react";
import { TopNav } from "@/components/top-nav";
import {
  buildInterviewInviteMail,
  buildOnboardMail,
  buildRejectMail,
  buildMailFromTemplate,
  defaultMailBuilders,
  supportedCandidateMailTypes,
  supportedMailLanguages,
  toMailTargets,
  type CandidateMailType,
  type EmailTemplate,
  type EmailTemplateKey,
  type MailLanguage,
} from "@/lib/candidate-utils";
import type { AccountUser, Candidate, CandidateAction } from "@/types/hr";

type LoadState = "idle" | "loading" | "error";
type PendingAction = { candidate: Candidate; action: CandidateAction; language: MailLanguage | null } | null;
type CandidateDetail = Candidate | null;

const statusBadgeMap: Record<string, string> = {
  new: "bg-sky-500/15 text-sky-700 border-sky-400/40",
  rejected: "bg-rose-500/15 text-rose-700 border-rose-400/40",
  interview_invited: "bg-emerald-500/15 text-emerald-700 border-emerald-400/40",
};

function renderStatusLabel(status: string) {
  if (status === "interview_invited") return "Đã mời phỏng vấn";
  if (status === "rejected") return "Từ chối";
  if (status === "new") return "Mới";
  return status;
}

function displayValue(value: unknown) {
  if (value === null || value === undefined) return "-";
  const text = String(value).trim();
  return !text || text.toLowerCase() === "none" ? "-" : text;
}

function formatDate(value: unknown) {
  if (!value) return "-";
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return String(value);

  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

function formatDateTime(value: unknown) {
  if (!value) return "-";
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return String(value);

  const pad = (input: number) => String(input).padStart(2, "0");
  return `${pad(date.getDate())}-${pad(date.getMonth() + 1)}-${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function getCandidateApplyTime(candidate: Candidate) {
  const value = candidate.applyTime ?? candidate.raw?.apply_time ?? candidate.raw?.ApplyTime ?? candidate.raw?.createdAt ?? candidate.raw?.created_at ?? "";
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

function getCandidateApplyTimeDisplay(candidate: Candidate) {
  return formatDateTime(candidate.applyTime ?? candidate.raw?.apply_time ?? candidate.raw?.ApplyTime ?? candidate.raw?.createdAt ?? candidate.raw?.created_at);
}

function readSessionUser() {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem("hrms_session_user");
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as AccountUser;
    return parsed?.username ? parsed : null;
  } catch {
    return null;
  }
}

export default function DashboardPage() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [state, setState] = useState<LoadState>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [search, setSearch] = useState("");
  const [savingId, setSavingId] = useState("");
  const [sessionUser, setSessionUser] = useState<AccountUser | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [selectedCandidate, setSelectedCandidate] = useState<CandidateDetail>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [templates, setTemplates] = useState<Record<string, EmailTemplate>>({});
  const [templateManagerOpen, setTemplateManagerOpen] = useState(false);
  const [templateDraft, setTemplateDraft] = useState<EmailTemplate | null>(null);
  const [templateEditingType, setTemplateEditingType] = useState<CandidateMailType | null>(null);
  const [templateEditingLanguage, setTemplateEditingLanguage] = useState<MailLanguage>("vi");
  const [templateSaving, setTemplateSaving] = useState(false);
  const [saveNotice, setSaveNotice] = useState<string | null>(null);
  const isRejected = (status: string) => status === "rejected";
  const isInvited = (status: string) => status === "interview_invited";

  useEffect(() => {
    const user = readSessionUser();
    if (!user) {
      window.location.replace("/login");
      return;
    }
    setSessionUser(user);
  }, []);

  async function loadCandidates(options?: { silent?: boolean }) {
    const silent = options?.silent ?? false;

    try {
      if (!silent) {
        setState("loading");
        setErrorMessage("");
      }
      const response = await fetch("/api/candidates", { cache: "no-store" });
      const data = (await response.json()) as { candidates?: Candidate[]; error?: string };
      if (!response.ok) throw new Error(data.error ?? "Không thể tải danh sách ứng viên.");
      setCandidates(data.candidates ?? []);
      setCurrentPage(1);
      if (!silent) setState("idle");
    } catch (error) {
      if (!silent) {
        setState("error");
        setErrorMessage(error instanceof Error ? error.message : "Đã xảy ra lỗi.");
      }
    }
  }

  useEffect(() => {
    if (!sessionUser) return;

    void loadCandidates();
    const intervalId = window.setInterval(() => {
      void loadCandidates({ silent: true });
    }, 15000);

    return () => window.clearInterval(intervalId);
  }, [sessionUser]);

  useEffect(() => {
    if (!sessionUser) return;

    async function loadTemplates() {
      try {
        const response = await fetch("/api/email-templates", { cache: "no-store" });
        const data = (await response.json()) as { templates?: EmailTemplate[]; error?: string };
        if (!response.ok) throw new Error(data.error ?? "Không thể tải template email.");
        const nextTemplates: Record<string, EmailTemplate> = {};
        for (const template of data.templates ?? []) {
          nextTemplates[template.key] = template;
        }
        setTemplates(nextTemplates);
      } catch (error) {
        console.error(error);
      }
    }

    void loadTemplates();
  }, [sessionUser]);

  const sortedCandidates = useMemo(() => {
    return [...candidates].sort((left, right) => getCandidateApplyTime(right) - getCandidateApplyTime(left));
  }, [candidates]);

  const filteredCandidates = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return sortedCandidates;
    return sortedCandidates.filter((candidate) => [candidate.name, candidate.position].join(" ").toLowerCase().includes(term));
  }, [search, sortedCandidates]);

  const itemsPerPage = 20;
  const totalPages = Math.max(1, Math.ceil(filteredCandidates.length / itemsPerPage));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const pageStart = (safeCurrentPage - 1) * itemsPerPage;
  const paginatedCandidates = filteredCandidates.slice(pageStart, pageStart + itemsPerPage);
  const visibleCandidateCount = filteredCandidates.length;

  const paginationItems = useMemo(() => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, index) => index + 1);
    }

    const items: Array<number | "…"> = [1];
    const left = Math.max(2, safeCurrentPage - 1);
    const right = Math.min(totalPages - 1, safeCurrentPage + 1);

    if (left > 2) {
      items.push("…");
    }

    for (let page = left; page <= right; page += 1) {
      items.push(page);
    }

    if (right < totalPages - 1) {
      items.push("…");
    }

    items.push(totalPages);
    return items;
  }, [safeCurrentPage, totalPages]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  function handleLogout() {
    setSessionUser(null);
    setCandidates([]);
    setSearch("");
    setTemplates({});
    window.localStorage.removeItem("hrms_session_user");
    window.location.replace("/login");
  }

  function getCandidateCvLink(candidate: Candidate) {
    return candidate.cvLink ?? (typeof candidate.raw?.link === "string" ? candidate.raw.link : "") ?? "";
  }

  function openTemplateManager() {
    setTemplateManagerOpen(true);
    setTemplateDraft(null);
    setTemplateEditingType(null);
    setTemplateEditingLanguage("vi");
    setSaveNotice(null);
  }

  function openTemplateEditor(action: CandidateMailType, language: MailLanguage) {
    const templateKey = `${action}_${language}` as EmailTemplateKey;
    const fallback = defaultMailBuilders[templateKey]({ candidateName: "{candidateName}", position: "{position}" });
    setTemplateDraft(templates[templateKey] ?? { key: templateKey, subject: fallback.subject, body: fallback.body });
    setTemplateEditingType(action);
    setTemplateEditingLanguage(language);
    setSaveNotice(null);
  }

  function closeTemplateEditor() {
    setTemplateDraft(null);
    setTemplateEditingType(null);
  }

  function switchTemplateLanguage(language: MailLanguage) {
    if (!templateEditingType) return;
    const templateKey = `${templateEditingType}_${language}` as EmailTemplateKey;
    const fallback = defaultMailBuilders[templateKey]({ candidateName: "{candidateName}", position: "{position}" });
    setTemplateDraft(templates[templateKey] ?? { key: templateKey, subject: fallback.subject, body: fallback.body });
    setTemplateEditingLanguage(language);
    setSaveNotice(null);
  }

  async function saveTemplate() {
    if (!templateDraft || !sessionUser) return;
    try {
      setTemplateSaving(true);
      const payload = {
        ...templateDraft,
        updateBy: sessionUser.fullName || sessionUser.username,
        updateAt: new Date().toISOString(),
      };
      const response = await fetch("/api/email-templates", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await response.json()) as { template?: EmailTemplate; error?: string };
      if (!response.ok) throw new Error(data.error ?? "Lưu template thất bại.");
      if (data.template) {
        setTemplates((prev) => ({ ...prev, [data.template!.key]: data.template! }));
        setTemplateDraft(data.template);
        setSaveNotice(`Đã lưu template ${data.template.key} bởi ${(data.template.updateBy ?? sessionUser.fullName) || sessionUser.username} lúc ${formatDateTime(data.template.updateAt ?? payload.updateAt)}.`);
      }
    } catch (error) {
      alert(error instanceof Error ? error.message : "Lưu template thất bại.");
    } finally {
      setTemplateSaving(false);
    }
  }

  async function executeCandidateAction(candidate: Candidate, action: CandidateAction, language: MailLanguage) {
    if (!sessionUser) return alert("Vui lòng đăng nhập.");
    if (!candidate.email) return alert("Ứng viên chưa có email.");

    const params = { candidateName: candidate.name, position: candidate.position };
    const templateKey = `${action}_${language}` as EmailTemplateKey;
    const fallback =
      action === "reject"
        ? buildRejectMail(params, language)
        : action === "onboard"
          ? buildOnboardMail(params, language)
          : buildInterviewInviteMail(params, language);
    const mail = buildMailFromTemplate(templates[templateKey], fallback, {
      candidateName: candidate.name,
      position: candidate.position,
      companyName: "SOTRANS LOGISTICS",
    });

    window.location.href = toMailTargets(candidate.email, mail.subject, mail.body).mailto;

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
      if (!response.ok) throw new Error(data.error ?? "Lưu hành động thất bại.");
      setCandidates((prev) =>
        prev.map((item) =>
          item.id === candidate.id
            ? {
                ...item,
                status:
                  action === "reject"
                    ? "rejected"
                    : action === "onboard"
                      ? "onboarded"
                      : "interview_invited",
                lastActionBy: sessionUser.fullName || sessionUser.username,
                lastActionAt: new Date().toISOString(),
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
    setPendingAction({ candidate, action, language: null });
  }

  function handleLanguageChoice(language: MailLanguage) {
    if (!pendingAction) return;
    setPendingAction({ ...pendingAction, language });
  }

  async function confirmPendingAction() {
    if (!pendingAction || !pendingAction.language) return;
    const { candidate, action, language } = pendingAction;
    await executeCandidateAction(candidate, action, language);
    setPendingAction(null);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-100 via-indigo-100 to-cyan-100 text-slate-800">
      <TopNav user={sessionUser ? { name: sessionUser.fullName || sessionUser.username } : null} onLogout={handleLogout} />
      <div className="mx-auto w-full max-w-7xl px-3 py-4 sm:px-4 lg:px-6">
        <section className="mt-3 rounded-2xl border border-indigo-200/70 bg-white/90 p-3 shadow-xl sm:p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/70 px-4 py-3">
            <div>
              <p className="text-[10px] uppercase tracking-wide text-emerald-600">Số lượng hiển thị</p>
              <p className="text-lg font-bold text-emerald-700">{paginatedCandidates.length}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-slate-600">Tổng ứng viên</p>
              <p className="text-sm font-semibold text-slate-800">{visibleCandidateCount} ứng viên</p>
            </div>
          </div>

          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-0 flex-1">
              <label className="block text-xs font-medium text-slate-600">Tìm kiếm ứng viên (Họ tên, vị trí)</label>
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Nhập tên hoặc vị trí ứng tuyển..." className="mt-1 w-full rounded-lg border border-indigo-200 bg-white px-3 py-2 text-sm outline-none ring-indigo-400 transition placeholder:text-slate-400 focus:ring-2" />
            </div>
            <button onClick={() => { setSearch(""); setCurrentPage(1); }} className="rounded-lg border border-indigo-300 px-3 py-2 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-50">Xóa lọc</button>
            <button onClick={() => void loadCandidates()} className="rounded-lg bg-gradient-to-r from-orange-500 via-amber-500 to-rose-500 px-3 py-2 text-xs font-semibold text-white transition hover:from-orange-400 hover:via-amber-400 hover:to-rose-400">Tải lại dữ liệu</button>
            <button onClick={openTemplateManager} className="rounded-lg bg-gradient-to-r from-indigo-600 via-blue-600 to-cyan-600 px-3 py-2 text-xs font-semibold text-white transition hover:from-indigo-500 hover:via-blue-500 hover:to-cyan-500">Format mail</button>
          </div>
        </section>

        <section className="mt-3">
          {state === "loading" ? <div className="rounded-xl border border-indigo-200 bg-white p-6 text-slate-600">Đang tải dữ liệu ứng viên...</div> : null}
          {state === "error" ? <div className="rounded-xl border border-rose-300 bg-rose-50 p-6 text-rose-700">{errorMessage}</div> : null}
          {state !== "loading" && candidates.length === 0 ? <div className="rounded-xl border border-indigo-200 bg-white p-6 text-slate-600">Chưa có ứng viên trong NocoDB.</div> : null}
          {state !== "loading" && candidates.length > 0 && filteredCandidates.length === 0 ? <div className="rounded-xl border border-indigo-200 bg-white p-6 text-slate-600">Không có kết quả khớp từ khóa tìm kiếm.</div> : null}

          <div className="overflow-x-auto rounded-xl border border-indigo-200 bg-white/95">
            <div className="min-w-[1120px]">
              <div className="grid grid-cols-[0.9fr_1.05fr_0.85fr_0.75fr_0.95fr_1.3fr] gap-2 border-b border-indigo-200 bg-indigo-50 px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-slate-700">
                <span>Họ tên</span><span>Thời gian apply</span><span>Vị trí</span><span>Trạng thái</span><span>Người thao tác gần nhất</span><span>Thao tác</span>
              </div>
              {paginatedCandidates.map((candidate) => (
                <article key={candidate.id} className="group grid grid-cols-[0.9fr_1.05fr_0.85fr_0.75fr_0.95fr_1.3fr] items-center gap-2 border-b border-blue-300 px-3 py-2.5 text-[13px] transition duration-200 hover:-translate-y-0.5 hover:border-blue-700 hover:bg-gradient-to-r hover:from-blue-100 hover:via-blue-50 hover:to-cyan-50 hover:shadow-[0_14px_34px_-24px_rgba(29,78,216,0.7)]">
                  <button onClick={() => setSelectedCandidate(candidate)} className="truncate text-left font-medium text-slate-800 transition group-hover:text-blue-800 group-hover:underline">{candidate.name}</button>
                  <p className="truncate text-slate-600 transition group-hover:text-blue-700">{getCandidateApplyTimeDisplay(candidate)}</p>
                  <p className="truncate text-slate-600 transition group-hover:text-blue-700">{candidate.position}</p>
                  <div className="flex items-center">
                    <span className={`inline-flex w-fit rounded-full border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide transition group-hover:scale-105 group-hover:shadow-sm ${statusBadgeMap[candidate.status] ?? "border-slate-600 bg-slate-800 text-slate-200"}`}>{renderStatusLabel(candidate.status)}</span>
                  </div>
                  <p className="truncate text-slate-600 transition group-hover:text-blue-700">{displayValue(candidate.lastActionBy)}</p>
                  <div className="flex flex-nowrap items-center gap-1.5 justify-start">
                    <a href={getCandidateCvLink(candidate)} target="_blank" rel="noreferrer" className="inline-flex h-7 items-center rounded-lg border border-blue-300 bg-white px-2.5 text-[11px] font-semibold text-blue-700 transition duration-200 hover:-translate-y-0.5 hover:border-blue-500 hover:bg-blue-50 hover:shadow-lg hover:shadow-blue-500/20 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-40" title="Mở CV tab mới">
                      📄 CV
                    </a>
                    <button onClick={() => void handleAction(candidate, "reject")} disabled={savingId === candidate.id || isRejected(candidate.status)} className="inline-flex h-7 items-center rounded-lg bg-gradient-to-r from-rose-600 to-pink-600 px-2.5 text-[11px] font-semibold text-white transition duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-rose-500/25 disabled:opacity-50">Reject</button>
                    <button onClick={() => void handleAction(candidate, "invite_interview")} disabled={savingId === candidate.id || isInvited(candidate.status)} className="inline-flex h-7 items-center rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 px-2.5 text-[11px] font-semibold text-white transition duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-emerald-500/25 disabled:opacity-50">Invite</button>
                    <button onClick={() => void handleAction(candidate, "onboard")} disabled={savingId === candidate.id || candidate.status === "onboarded"} className="inline-flex h-7 items-center rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-2.5 text-[11px] font-semibold text-white transition duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-blue-500/25 disabled:opacity-50">Onboard</button>
                  </div>
                </article>
              ))}
            </div>
          </div>

          {filteredCandidates.length > 0 ? (
            <div className="mt-4 overflow-hidden rounded-3xl border border-slate-200 bg-white/90 shadow-[0_18px_50px_-28px_rgba(15,23,42,0.35)]">
              <div className="h-1 bg-gradient-to-r from-indigo-600 via-blue-600 to-cyan-500" />
              <div className="flex flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-indigo-500">Phân trang</p>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-600">
                    <span className="rounded-full bg-indigo-50 px-3 py-1 font-semibold text-indigo-700">Trang {safeCurrentPage}</span>
                    <span>/</span>
                    <span className="font-semibold text-slate-800">{totalPages}</span>
                    <span className="hidden sm:inline">•</span>
                    <span className="rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-700">{paginatedCandidates.length} trên {visibleCandidateCount}</span>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(1)}
                    disabled={safeCurrentPage === 1}
                    className="hidden inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition hover:-translate-y-0.5 hover:border-indigo-300 hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-40 sm:inline-flex"
                  >
                    Đầu
                  </button>
                  <button
                    onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                    disabled={safeCurrentPage === 1}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition hover:-translate-y-0.5 hover:border-indigo-300 hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Trước
                  </button>
                  <div className="flex max-w-full items-center gap-1 overflow-x-auto rounded-2xl border border-slate-200 bg-slate-50 px-2 py-1.5 shadow-inner">
                    {paginationItems.map((page, index) => {
                      if (page === "…") {
                        return (
                          <span key={`ellipsis-${index}`} className="px-1.5 text-xs font-semibold text-slate-400">
                            …
                          </span>
                        );
                      }

                      const isActive = page === safeCurrentPage;
                      return (
                        <button
                          key={page}
                          onClick={() => setCurrentPage(page)}
                          className={`min-w-8 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition ${
                            isActive
                              ? "bg-gradient-to-r from-indigo-600 to-cyan-600 text-white shadow-md"
                              : "text-slate-600 hover:bg-white hover:text-indigo-700"
                          }`}
                        >
                          {page}
                        </button>
                      );
                    })}
                  </div>
                  <button
                    onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                    disabled={safeCurrentPage === totalPages}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition hover:-translate-y-0.5 hover:border-indigo-300 hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Sau
                  </button>
                  <button
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={safeCurrentPage === totalPages}
                    className="hidden inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition hover:-translate-y-0.5 hover:border-indigo-300 hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-40 sm:inline-flex"
                  >
                    Cuối
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </section>
      </div>

      {selectedCandidate ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-3 backdrop-blur-md">
          <div className="relative w-full max-w-7xl overflow-hidden rounded-[32px] border border-white/20 bg-white/95 shadow-[0_30px_90px_-28px_rgba(15,23,42,0.6)]">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-indigo-600 via-blue-600 to-cyan-500" />
            <div className="pointer-events-none absolute -left-10 top-0 h-36 w-36 rounded-full bg-indigo-100/70 blur-3xl" />
            <div className="pointer-events-none absolute -right-10 top-6 h-40 w-40 rounded-full bg-cyan-100/70 blur-3xl" />
            <div className="relative z-10 flex flex-wrap items-start justify-between gap-4 border-b border-indigo-100 bg-gradient-to-r from-indigo-50 via-white to-cyan-50 px-6 py-5">
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-[0.24em] text-indigo-500">Chi tiết ứng viên</p>
                <h3 className="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl">{selectedCandidate.name}</h3>
              </div>
              <button onClick={() => setSelectedCandidate(null)} aria-label="Đóng modal" className="group inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-white px-4 py-2.5 text-sm font-semibold text-indigo-700 shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-300 hover:bg-indigo-50 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 text-[11px] font-bold text-white transition group-hover:bg-indigo-700">×</span>
                Đóng
              </button>
            </div>
            <div className="max-h-[76vh] overflow-y-auto px-6 py-6">
              <div className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr] xl:grid-cols-[1.2fr_0.8fr]">
                <div className="space-y-4">
                  <div className="rounded-3xl border border-indigo-100 bg-gradient-to-br from-indigo-50/80 to-white p-5 shadow-sm">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-indigo-500">Tổng quan</p>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      {[["Họ và tên", selectedCandidate.name], ["Email", selectedCandidate.email], ["Vị trí ứng tuyển", selectedCandidate.position], ["Nguồn ứng tuyển", selectedCandidate.candidateSource]].map(([label, value]) => (
                        <div key={label} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm min-h-20">
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-indigo-500">{label}</p>
                          <p className="mt-2 text-sm leading-6 text-slate-800">{displayValue(value)}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {[["Địa chỉ", selectedCandidate.address], ["Kinh nghiệm", selectedCandidate.experience], ["Điểm đánh giá", selectedCandidate.score], ["Trạng thái", selectedCandidate.status]].map(([label, value]) => (
                      <div key={label} className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm min-h-24">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-indigo-500">{label}</p>
                        <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-800">{displayValue(value)}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-indigo-500">Kỹ năng & đánh giá</p>
                    <div className="mt-4 space-y-4 text-sm leading-6 text-slate-800">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Kỹ năng</p>
                        <p className="mt-2 min-h-20 whitespace-pre-line rounded-2xl bg-slate-50 px-4 py-3">{displayValue(selectedCandidate.skills)}</p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Đề xuất</p>
                        <p className="mt-2 min-h-20 whitespace-pre-line rounded-2xl bg-slate-50 px-4 py-3">{displayValue(selectedCandidate.recommendation)}</p>
                      </div>
                    </div>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
                    {[["Tên file CV", selectedCandidate.cvFileName], ["Thời gian apply", selectedCandidate.applyTime], ["Người thao tác gần nhất", selectedCandidate.lastActionBy], ["Thời gian thao tác gần nhất", selectedCandidate.lastActionAt]].map(([label, value]) => (
                      <div key={label} className="rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-4 shadow-sm">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-indigo-500">{label}</p>
                        <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-800">{displayValue(value)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {pendingAction ? (() => {
        const modalConfig =
          pendingAction.action === "reject"
            ? {
                title: "Xác nhận từ chối ứng viên",
                actionLabel: "Từ chối",
                buttonLabel: "Xác nhận từ chối",
                accent: "from-rose-600 via-pink-600 to-fuchsia-600",
                badge: "bg-rose-500/15 text-rose-700 border-rose-300",
              }
            : pendingAction.action === "invite_interview"
              ? {
                  title: "Xác nhận mời phỏng vấn",
                  actionLabel: "Mời phỏng vấn",
                  buttonLabel: "Xác nhận mời",
                  accent: "from-emerald-600 via-teal-600 to-cyan-600",
                  badge: "bg-emerald-500/15 text-emerald-700 border-emerald-300",
                }
              : {
                  title: "Xác nhận onboard ứng viên",
                  actionLabel: "Onboard",
                  buttonLabel: "Xác nhận onboard",
                  accent: "from-indigo-600 via-blue-600 to-sky-600",
                  badge: "bg-indigo-500/15 text-indigo-700 border-indigo-300",
                };

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-3 backdrop-blur-md">
            <div className="relative w-full max-w-xl overflow-hidden rounded-[32px] border border-white/20 bg-white/95 shadow-[0_30px_90px_-28px_rgba(15,23,42,0.6)]">
              <div className={`absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r ${modalConfig.accent}`} />
              <div className="absolute -right-12 -top-12 h-32 w-32 rounded-full bg-white/60 blur-3xl" />
              <div className={`absolute right-5 top-5 rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] ${modalConfig.badge}`}>
                {modalConfig.actionLabel}
              </div>
              <div className="relative p-7 pt-9">
                <h3 className="text-2xl font-bold text-slate-900">{modalConfig.title}</h3>
                <p className="mt-3 max-w-lg text-sm leading-7 text-slate-600">
                  Bạn có chắc muốn <span className="font-semibold text-slate-900">{modalConfig.actionLabel}</span> ứng viên <span className="font-semibold text-slate-900">{pendingAction.candidate.name}</span> không?
                </p>
                <div className="mt-6 rounded-2xl border border-slate-100 bg-slate-50/80 p-4 text-sm leading-6 text-slate-600">
                  Hành động này sẽ cập nhật trạng thái hồ sơ và gửi email tương ứng cho ứng viên.
                </div>
                <div className="mt-6">
                  <p className="text-sm font-semibold text-slate-700">Chọn ngôn ngữ email</p>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    {([
                      { id: "vi", label: "Tiếng Việt" },
                      { id: "en", label: "Tiếng Anh" },
                    ] as const).map((option) => {
                      const isActive = pendingAction.language === option.id;
                      return (
                        <button
                          key={option.id}
                          onClick={() => handleLanguageChoice(option.id)}
                          className={`rounded-2xl border px-4 py-3 text-sm font-semibold transition ${
                            isActive
                              ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                              : "border-slate-200 bg-white text-slate-700 hover:border-indigo-300 hover:bg-indigo-50"
                          }`}
                        >
                          {option.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="mt-7 flex items-center justify-between gap-3">
                  <button onClick={() => setPendingAction(null)} disabled={Boolean(savingId)} className="rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60">Hủy</button>
                  <button onClick={() => void confirmPendingAction()} disabled={Boolean(savingId) || !pendingAction.language} className={`rounded-2xl bg-gradient-to-r ${modalConfig.accent} px-5 py-3 text-sm font-semibold text-white shadow-lg transition hover:brightness-110 disabled:opacity-60`}>
                    {savingId ? "Đang xử lý..." : modalConfig.buttonLabel}
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })() : null}

      {templateManagerOpen ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/55 p-3 backdrop-blur-sm">
          <div className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4">
              <div className="flex-1 text-center">
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-indigo-500">Email templates</p>
                <h3 className="mt-1 text-xl font-bold text-slate-900">CHỈNH SỬA NỘI DUNG EMAIL</h3>
              </div>
              <button onClick={() => setTemplateManagerOpen(false)} className="rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50">
                Đóng
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-6">
              {!templateDraft ? (
                <div className="grid gap-5 xl:grid-cols-3">
                  {supportedCandidateMailTypes.map((key) => {
                    const palette =
                      key === "reject"
                        ? "from-rose-500 via-pink-500 to-fuchsia-600"
                        : key === "invite_interview"
                          ? "from-emerald-500 via-teal-500 to-cyan-600"
                          : "from-indigo-500 via-blue-500 to-sky-600";
                    return (
                      <button
                        key={key}
                        onClick={() => openTemplateEditor(key, "vi")}
                        className="group flex min-h-[240px] flex-col justify-between rounded-3xl border border-slate-200 bg-gradient-to-br from-white via-slate-50 to-slate-100 p-5 text-left transition hover:-translate-y-0.5 hover:border-transparent hover:shadow-lg"
                      >
                        <div>
                          <div className={`inline-flex w-fit items-center gap-2 rounded-full bg-gradient-to-r ${palette} px-4 py-1.5 text-[10px] font-semibold uppercase tracking-[0.24em] text-white shadow-sm`}>
                            <span className="h-1.5 w-1.5 rounded-full bg-white/90" />
                            {key}
                          </div>
                          <p className="mt-5 text-lg font-bold leading-7 text-slate-900">
                            {key === "reject" ? "Reject mail" : key === "invite_interview" ? "Invite interview mail" : "Onboard mail"}
                          </p>
                          <p className="mt-2 text-sm leading-6 text-slate-500">
                            Chọn để mở form chỉnh sửa, bên trong sẽ có toggle Tiếng Việt / Tiếng Anh.
                          </p>
                        </div>
                        <div className={`mt-6 inline-flex items-center rounded-full bg-gradient-to-r ${palette} px-4 py-2 text-xs font-semibold text-white shadow-sm transition group-hover:brightness-110`}>
                          Chọn mẫu
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <button onClick={closeTemplateEditor} className="text-sm font-semibold text-indigo-700 hover:underline">← Quay lại</button>
                    <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 p-1 text-xs font-semibold">
                      {supportedMailLanguages.map((language) => (
                        <button key={language} onClick={() => switchTemplateLanguage(language)} className={`rounded-full px-3 py-1.5 transition ${templateEditingLanguage === language ? "bg-indigo-600 text-white" : "text-slate-600 hover:bg-white"}`}>
                          {language === "vi" ? "Tiếng Việt" : "English"}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="grid gap-5 lg:grid-cols-[0.72fr_1.28fr] xl:grid-cols-[0.68fr_1.32fr]">
                    <div className="space-y-4 rounded-2xl border border-slate-100 bg-gradient-to-br from-slate-50 to-white p-4">
                      <div>
                        <label className="mb-2 block text-sm font-semibold text-slate-700">Subject</label>
                        <input value={templateDraft.subject} onChange={(e) => setTemplateDraft({ ...templateDraft, subject: e.target.value })} className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100" />
                      </div>
                      <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
                        <div className="font-semibold text-slate-700">Cập nhật gần nhất</div>
                        <div className="mt-2 space-y-1">
                          <div>Người sửa: <span className="font-semibold text-slate-800">{templateDraft.updateBy ?? "-"}</span></div>
                          <div>Ngày: <span className="font-semibold text-slate-800">{formatDate(templateDraft.updateAt)}</span></div>
                        </div>
                      </div>
                      {saveNotice ? <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{saveNotice}</div> : null}
                      <div className="rounded-xl border border-dashed border-slate-200 bg-gradient-to-r from-indigo-50 to-cyan-50 p-4 text-sm text-slate-600">
                        Biến hỗ trợ: <span className="font-semibold">{`{candidateName}`}</span>, <span className="font-semibold">{`{position}`}</span>, <span className="font-semibold">{`{companyName}`}</span>
                      </div>
                    </div>
                    <div className="space-y-4 rounded-2xl border border-slate-100 bg-white p-4">
                      <div>
                        <label className="mb-2 block text-sm font-semibold text-slate-700">Body</label>
                        <textarea value={templateDraft.body} onChange={(e) => setTemplateDraft({ ...templateDraft, body: e.target.value })} rows={18} className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm leading-6 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100" />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
            {templateDraft ? (
              <div className="sticky bottom-0 flex items-center justify-end gap-3 border-t border-slate-100 bg-white px-5 py-4">
                <button onClick={() => void saveTemplate()} disabled={templateSaving} className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:opacity-60">
                  {templateSaving ? "Đang lưu..." : "Lưu template"}
                </button>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
