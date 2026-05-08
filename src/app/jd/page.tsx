"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { TopNav } from "@/components/top-nav";
import { isActiveJob, mapJobDescriptionRecord } from "@/lib/job-utils";
import type { AccountUser, JobDescription } from "@/types/hr";

type LoadState = "idle" | "loading" | "error";
type UploadState = "idle" | "uploading" | "success" | "error";

function badgeClass(status: string) {
  return isActiveJob(status)
    ? "border-emerald-400/50 bg-emerald-500/10 text-emerald-700"
    : "border-slate-300 bg-slate-100 text-slate-600";
}

function statusLabel(status: string) {
  if (isActiveJob(status)) return "Đang tuyển";
  return status || "Không xác định";
}

function formatDate(value: unknown) {
  if (!value) return "-";

  const text = String(value).trim();
  const slashDate = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slashDate) {
    const [, month, day, year] = slashDate;
    return `${day.padStart(2, "0")}/${month.padStart(2, "0")}/${year}`;
  }

  const date = new Date(text);
  if (Number.isNaN(date.getTime())) return text;
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(date);
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

export default function JDPage() {
  const [records, setRecords] = useState<Record<string, unknown>[]>([]);
  const [state, setState] = useState<LoadState>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [selectedJob, setSelectedJob] = useState<JobDescription | null>(null);
  const [search, setSearch] = useState("");
  const [sessionUser, setSessionUser] = useState<AccountUser | null>(null);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState("");
  const [uploadState, setUploadState] = useState<UploadState>("idle");
  const [uploadSuccessMessage, setUploadSuccessMessage] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const loadJobs = async (options?: { silent?: boolean }) => {
    const silent = options?.silent ?? false;
    try {
      if (!silent) {
        setState("loading");
        setErrorMessage("");
      }
      const response = await fetch("/api/jobs", { cache: "no-store" });
      const data = (await response.json()) as { jobs?: Record<string, unknown>[]; error?: string };
      if (!response.ok) throw new Error(data.error ?? "Không thể tải danh sách job.");
      setRecords(data.jobs ?? []);
      if (!silent) setState("idle");
    } catch (error) {
      if (!silent) {
        setState("error");
        setErrorMessage(error instanceof Error ? error.message : "Đã xảy ra lỗi.");
      }
    }
  };

  useEffect(() => {
    setSessionUser(readSessionUser());
    void loadJobs();
    const intervalId = window.setInterval(() => void loadJobs({ silent: true }), 15000);
    return () => window.clearInterval(intervalId);
  }, []);

  const jobs: JobDescription[] = useMemo(() => records.map(mapJobDescriptionRecord).filter((job) => isActiveJob(job.status)), [records]);
  const filteredJobs = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return jobs;
    return jobs.filter((job) => [job.title, job.department, job.jobCode, job.workplace].join(" ").toLowerCase().includes(term));
  }, [jobs, search]);

  const acceptFiles = (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    if (file.type !== "application/pdf") {
      setUploadFile(null);
      setUploadError("Chỉ hỗ trợ file PDF.");
      return;
    }
    setUploadError("");
    setUploadSuccessMessage("");
    setUploadFile(file);
  };

  const closeUploadModal = () => {
    setIsUploadModalOpen(false);
    setUploadFile(null);
    setUploadError("");
    setUploadState("idle");
    setUploadSuccessMessage("");
  };

  const handleUpload = async () => {
    if (!uploadFile) {
      setUploadError("Vui lòng chọn file JD PDF trước khi upload.");
      return;
    }

    try {
      setUploadState("uploading");
      setUploadError("");
      const formData = new FormData();
      formData.append("file", uploadFile);
      formData.append("folderPath", "JD");
      const response = await fetch("/api/jobs/upload", { method: "POST", body: formData });
      const data = (await response.json()) as { success?: boolean; error?: string; fileName?: string; folderPath?: string; itemUrl?: string };
      if (!response.ok || !data.success) throw new Error(data.error ?? "Không thể upload file JD.");
      setUploadState("success");
      setUploadSuccessMessage(`Đã upload ${data.fileName ?? uploadFile.name} vào ${data.folderPath ?? "JD"}.`);
      setUploadFile(null);
      await loadJobs();
    } catch (error) {
      setUploadState("error");
      setUploadError(error instanceof Error ? error.message : "Đã xảy ra lỗi khi upload.");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-100 via-indigo-100 to-cyan-100 text-slate-800">
      <TopNav user={sessionUser ? { name: sessionUser.fullName || sessionUser.username } : null} onLogout={() => { window.localStorage.removeItem("hrms_session_user"); window.location.replace("/login"); }} />
      <div className="mx-auto w-full max-w-7xl px-3 py-4 sm:px-4 lg:px-6">
        <section className="rounded-2xl border border-indigo-200/70 bg-white/90 p-3 shadow-xl sm:p-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-0 flex-1">
              <label className="block text-xs font-medium text-slate-600">Tìm kiếm JD theo tên job hoặc phòng ban</label>
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Nhập tên job hoặc phòng ban..." className="mt-1 w-full rounded-lg border border-indigo-200 bg-white px-3 py-2 text-sm outline-none ring-indigo-400 transition placeholder:text-slate-400 focus:ring-2" />
            </div>
            <button onClick={() => setSearch("")} className="rounded-lg border border-indigo-300 px-3 py-2 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-50">Xóa lọc</button>
            <button onClick={() => void loadJobs()} className="rounded-lg bg-gradient-to-r from-orange-500 via-amber-500 to-rose-500 px-3 py-2 text-xs font-semibold text-white transition hover:from-orange-400 hover:via-amber-400 hover:to-rose-400">Tải lại dữ liệu</button>
            <button onClick={() => setIsUploadModalOpen(true)} className="rounded-lg bg-gradient-to-r from-indigo-600 via-blue-600 to-cyan-600 px-3 py-2 text-xs font-semibold text-white transition hover:from-indigo-500 hover:via-blue-500 hover:to-cyan-500">Upload JD</button>
          </div>
        </section>

        <section className="mt-3 rounded-2xl border border-indigo-200/70 bg-white/90 px-4 py-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="min-w-[220px] flex-1 rounded-xl border border-indigo-200 bg-indigo-50/70 px-4 py-3"><p className="text-[10px] uppercase tracking-wide text-indigo-500">Tổng job</p><p className="text-2xl font-bold text-slate-800">{records.length}</p></div>
            <div className="min-w-[220px] flex-1 rounded-xl border border-emerald-200 bg-emerald-50/70 px-4 py-3"><p className="text-[10px] uppercase tracking-wide text-emerald-600">Đang tuyển</p><p className="text-2xl font-bold text-emerald-700">{filteredJobs.length}</p></div>
          </div>
        </section>

        {state === "loading" ? <div className="mt-3 rounded-xl border border-indigo-200 bg-white p-5 text-slate-600">Đang tải dữ liệu job...</div> : null}
        {state === "error" ? <div className="mt-3 rounded-xl border border-rose-300 bg-rose-50 p-5 text-rose-700">{errorMessage}</div> : null}

        <section className="mt-3 space-y-3">
          {filteredJobs.map((job) => (
            <button key={job.id} onClick={() => setSelectedJob(job)} className="w-full rounded-2xl border border-indigo-200/70 bg-white/95 p-4 text-left shadow-md transition hover:-translate-y-0.5 hover:shadow-lg">
              <div className="grid gap-3 md:grid-cols-[1.4fr_1fr_1fr_auto] md:items-center">
                <div className="min-w-0">
                  <p className="truncate text-[11px] font-semibold uppercase tracking-wide text-indigo-500">{job.jobCode}</p>
                  <h2 className="mt-1 truncate text-base font-bold text-slate-900">{job.title}</h2>
                  <p className="mt-1 line-clamp-1 text-sm text-slate-600">{job.content || "Chưa có nội dung mô tả."}</p>
                </div>
                <div className="text-sm text-slate-600"><p className="font-semibold text-slate-800">Phòng ban</p><p className="truncate">{job.department}</p></div>
                <div className="text-sm text-slate-600"><p className="font-semibold text-slate-800">Địa điểm</p><p className="truncate">{job.workplace}</p></div>
                <div className="flex items-center justify-start gap-2 md:justify-end"><span className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold ${badgeClass(job.status)}`}>{statusLabel(job.status)}</span><span className="rounded-full bg-indigo-50 px-2.5 py-1 text-[11px] font-semibold text-indigo-700">Chi tiết</span></div>
              </div>
            </button>
          ))}
        </section>

        {state !== "loading" && filteredJobs.length === 0 ? <section className="mt-3 rounded-2xl border border-dashed border-indigo-300 bg-white/80 p-8 text-center text-slate-600">Không tìm thấy JD phù hợp.</section> : null}
      </div>

      {isUploadModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-3 backdrop-blur-sm">
          <div className="w-full max-w-2xl overflow-hidden rounded-[28px] border border-indigo-200 bg-white shadow-[0_28px_80px_-28px_rgba(15,23,42,0.6)]">
            <div className="flex items-center justify-between border-b border-indigo-100 bg-gradient-to-r from-indigo-50 via-white to-cyan-50 px-5 py-4">
              <div><p className="text-[10px] uppercase tracking-[0.24em] text-indigo-500">Upload JD PDF</p><h3 className="text-2xl font-bold text-slate-900">Tải JD lên OneDrive</h3></div>
              <button onClick={closeUploadModal} className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Đóng</button>
            </div>
            <div className="space-y-4 px-5 py-5">
              <label onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); acceptFiles(event.dataTransfer.files); }} className="flex min-h-56 cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-dashed border-indigo-300 bg-indigo-50/60 px-6 py-8 text-center transition hover:border-indigo-400 hover:bg-indigo-50">
                <input ref={fileInputRef} type="file" accept="application/pdf" className="hidden" onChange={(event) => acceptFiles(event.target.files)} />
                <div className="max-w-md space-y-2">
                  <p className="text-lg font-semibold text-slate-900">Kéo thả file JD PDF vào đây</p>
                  <p className="text-sm text-slate-600">Hoặc bấm để chọn file từ máy tính. Chỉ hỗ trợ định dạng PDF.</p>
                  {uploadFile ? <p className="rounded-full bg-white px-4 py-2 text-sm font-medium text-indigo-700 shadow-sm">Đã chọn: {uploadFile.name}</p> : <p className="text-xs text-slate-500">Chưa có file nào được chọn</p>}
                </div>
              </label>
              {uploadError ? <div className="rounded-xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-700">{uploadError}</div> : null}
              {uploadSuccessMessage ? <div className="rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{uploadSuccessMessage}</div> : null}
              <div className="flex flex-wrap items-center justify-end gap-3">
                <button onClick={closeUploadModal} className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Hủy</button>
                <button onClick={handleUpload} disabled={uploadState === "uploading"} className="rounded-xl bg-gradient-to-r from-indigo-600 via-blue-600 to-cyan-600 px-5 py-2 text-sm font-semibold text-white transition hover:from-indigo-500 hover:via-blue-500 hover:to-cyan-500 disabled:cursor-not-allowed disabled:opacity-70">{uploadState === "uploading" ? "Đang upload..." : "Upload"}</button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {selectedJob ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-3 backdrop-blur-md">
          <div className="relative w-full max-w-7xl overflow-hidden rounded-[32px] border border-white/20 bg-white/95 shadow-[0_30px_90px_-28px_rgba(15,23,42,0.6)]">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-indigo-600 via-blue-600 to-cyan-500" />
            <div className="pointer-events-none absolute -left-10 top-0 h-36 w-36 rounded-full bg-indigo-100/70 blur-3xl" />
            <div className="pointer-events-none absolute -right-10 top-6 h-40 w-40 rounded-full bg-cyan-100/70 blur-3xl" />
            <div className="relative z-10 flex flex-wrap items-start justify-between gap-4 border-b border-indigo-100 bg-gradient-to-r from-indigo-50 via-white to-cyan-50 px-6 py-5">
              <div className="min-w-0"><p className="text-[10px] uppercase tracking-[0.24em] text-indigo-500">Chi tiết JD</p><h3 className="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl">{selectedJob.title}</h3></div>
              <button onClick={() => setSelectedJob(null)} aria-label="Đóng modal" className="group inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-white px-4 py-2.5 text-sm font-semibold text-indigo-700 shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-300 hover:bg-indigo-50 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 text-[11px] font-bold text-white transition group-hover:bg-indigo-700">×</span>Đóng</button>
            </div>
            <div className="max-h-[76vh] overflow-y-auto px-6 py-6">
              <div className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr] xl:grid-cols-[1.2fr_0.8fr]">
                <div className="space-y-4">
                  <div className="rounded-3xl border border-indigo-100 bg-gradient-to-br from-indigo-50/80 to-white p-5 shadow-sm">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-indigo-500">Tổng quan</p>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      {[ ["Mã job", selectedJob.id], ["Tên job", selectedJob.title], ["Phòng ban", selectedJob.department], ["Địa điểm", selectedJob.workplace] ].map(([label, value]) => (
                        <div key={label} className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-indigo-500">{label}</p>
                          <p className="mt-2 text-sm leading-6 text-slate-800">{value || "-"}</p>
                        </div>
                      )) }
                    </div>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {[ ["Trạng thái", selectedJob.status], ["Thời gian tạo", formatDate(selectedJob.createdAtTime)], ["Kinh nghiệm", selectedJob.requiredExperience], ["Học vấn", selectedJob.requiredEducation] ].map(([label, value]) => (
                      <div key={label} className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-indigo-500">{label}</p>
                        <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-800">{value || "-"}</p>
                      </div>
                    )) }
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-indigo-500">Nội dung & yêu cầu</p>
                    <div className="mt-4 space-y-4 text-sm leading-6 text-slate-800">
                      <div><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Nội dung JD</p><p className="mt-2 whitespace-pre-line rounded-2xl bg-slate-50 px-4 py-3">{selectedJob.content || "-"}</p></div>
                      <div><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Kỹ năng yêu cầu</p><p className="mt-2 whitespace-pre-line rounded-2xl bg-slate-50 px-4 py-3">{selectedJob.requiredSkills || "-"}</p></div>
                      <div><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Chứng chỉ</p><p className="mt-2 whitespace-pre-line rounded-2xl bg-slate-50 px-4 py-3">{selectedJob.certificate || "-"}</p></div>
                      <div><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Từ khóa</p><p className="mt-2 whitespace-pre-line rounded-2xl bg-slate-50 px-4 py-3">{selectedJob.keywords || "-"}</p></div>
                      <div><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Từ khóa bổ sung</p><p className="mt-2 whitespace-pre-line rounded-2xl bg-slate-50 px-4 py-3">{selectedJob.extraKeywords || "-"}</p></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
