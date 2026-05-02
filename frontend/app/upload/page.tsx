"use client";

import Sidebar from "@/components/ui/Sidebar";
import TopBar from "@/components/ui/TopBar";
import { api } from "@/lib/api";
import { useRouter } from "next/navigation";
import { useCallback, useRef, useState } from "react";

type UploadStatus = "idle" | "uploading" | "parsing" | "done" | "error";

interface FileItem {
  file: File;
  status: UploadStatus;
  message: string;
  candidateId?: string;
  progress: number;
}

type ActivityStatus = "processing" | "completed" | "failed";

interface ActivityItem {
  name: string;
  time: string;
  size: string;
  status: ActivityStatus;
  score?: number;
  error?: string;
}

function formatActivityTime(d: Date): string {
  const now = new Date();
  const isToday =
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear();
  const prefix = isToday ? "Today" : "Yesterday";
  return `${prefix}, ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
}

export default function UploadPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [activityHistory, setActivityHistory] = useState<ActivityItem[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [folderPath, setFolderPath] = useState(
    "C:\\Users\\HR_Team\\Recruitment\\Incoming_CVs",
  );
  const [folderMonitorActive, setFolderMonitorActive] = useState(true);
  const [showErrorLog, setShowErrorLog] = useState(false);

  const addFiles = useCallback((incoming: FileList | null) => {
    if (!incoming) return;
    const pdfs = Array.from(incoming).filter((f) =>
      f.name.toLowerCase().endsWith(".pdf"),
    );
    setFiles((prev) => [
      ...prev,
      ...pdfs.map((f) => ({
        file: f,
        status: "idle" as UploadStatus,
        message: "",
        progress: 0,
      })),
    ]);
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      addFiles(e.dataTransfer.files);
    },
    [addFiles],
  );

  const uploadAll = async () => {
    const pending = files.filter((f) => f.status === "idle");
    for (let i = 0; i < pending.length; i++) {
      const item = pending[i];
      setFiles((prev) =>
        prev.map((f) =>
          f.file.name === item.file.name
            ? { ...f, status: "uploading", message: "Uploading…", progress: 30 }
            : f,
        ),
      );
      setActivityHistory((prev) => [
        {
          name: item.file.name,
          time: formatActivityTime(new Date()),
          size: `${(item.file.size / (1024 * 1024)).toFixed(1)} MB`,
          status: "processing",
        },
        ...prev.filter((a) => a.name !== item.file.name),
      ]);
      try {
        const res = await api.uploadCV(item.file);
        setFiles((prev) =>
          prev.map((f) =>
            f.file.name === item.file.name
              ? {
                  ...f,
                  status: "parsing",
                  message: "Parsing CV with AI…",
                  candidateId: res.candidate_id,
                  progress: 60,
                }
              : f,
          ),
        );

        const candidateId = res.candidate_id;
        let attempts = 0;
        const maxAttempts = 120;
        const poll = async () => {
          if (attempts >= maxAttempts) {
            setFiles((prev) =>
              prev.map((f) =>
                f.candidateId === candidateId
                  ? {
                      ...f,
                      status: "error",
                      message: "Timed out waiting for analysis.",
                      progress: 0,
                    }
                  : f,
              ),
            );
            return;
          }
          attempts++;
          try {
            const candidate = await api.getCandidate(candidateId);
            const status = candidate.processing_status;
            if (status === "done") {
              setFiles((prev) =>
                prev.map((f) =>
                  f.candidateId === candidateId
                    ? {
                        ...f,
                        status: "done",
                        message: "CV parsed and analysed successfully.",
                        progress: 100,
                      }
                    : f,
                ),
              );
              setActivityHistory((prev) => [
                {
                  name: item.file.name,
                  time: formatActivityTime(new Date()),
                  size: `${(item.file.size / (1024 * 1024)).toFixed(1)} MB`,
                  status: "completed",
                  score: candidate.overall_score ?? undefined,
                },
                ...prev,
              ]);
            } else if (status === "failed") {
              const error = candidate.processing_error ?? "Processing failed.";
              setFiles((prev) =>
                prev.map((f) =>
                  f.candidateId === candidateId
                    ? { ...f, status: "error", message: error, progress: 0 }
                    : f,
                ),
              );
              setActivityHistory((prev) => [
                {
                  name: item.file.name,
                  time: formatActivityTime(new Date()),
                  size: `${(item.file.size / (1024 * 1024)).toFixed(1)} MB`,
                  status: "failed",
                  error,
                },
                ...prev,
              ]);
            } else {
              setTimeout(poll, 1000);
            }
          } catch {
            setTimeout(poll, 2000);
          }
        };
        setTimeout(poll, 1000);
      } catch (err: unknown) {
        const errorMessage =
          err instanceof Error ? err.message : "Upload failed";
        setFiles((prev) =>
          prev.map((f) =>
            f.file.name === item.file.name
              ? { ...f, status: "error", message: errorMessage, progress: 0 }
              : f,
          ),
        );
        setActivityHistory((prev) => [
          {
            name: item.file.name,
            time: formatActivityTime(new Date()),
            size: `${(item.file.size / (1024 * 1024)).toFixed(1)} MB`,
            status: "failed",
            error: errorMessage,
          },
          ...prev.filter((a) => a.name !== item.file.name),
        ]);
      }
    }
  };

  const removeFile = (name: string) =>
    setFiles((prev) => prev.filter((f) => f.file.name !== name));

  const getFileIcon = (name: string) => {
    if (name.endsWith(".pdf"))
      return { icon: "picture_as_pdf", color: "text-red-500" };
    if (name.endsWith(".docx") || name.endsWith(".doc"))
      return { icon: "description", color: "text-blue-500" };
    return { icon: "insert_drive_file", color: "text-on-surface-variant" };
  };

  const statusBadge = (s: UploadStatus) => {
    const map: Record<UploadStatus, { label: string; className: string }> = {
      idle: {
        label: "Queued",
        className: "bg-tertiary-fixed text-on-tertiary-fixed",
      },
      uploading: {
        label: "Uploading",
        className: "bg-primary-fixed text-on-primary-fixed",
      },
      parsing: {
        label: "Parsing",
        className: "bg-primary-fixed text-on-primary-fixed",
      },
      done: { label: "Done", className: "bg-emerald-100 text-emerald-700" },
      error: {
        label: "Failed",
        className: "bg-error-container text-on-error-container",
      },
    };
    return map[s];
  };

  const processingCount = files.filter(
    (f) => f.status === "uploading" || f.status === "parsing",
  ).length;
  const completedCount = files.filter((f) => f.status === "done").length;
  const failedCount = files.filter((f) => f.status === "error").length;

  return (
    <div className="flex min-h-screen bg-surface">
      <Sidebar />
      <main className="ml-[220px] flex-1">
        <TopBar
          breadcrumb={["TALASH", "CV Upload"]}
          action={
            <button
              onClick={uploadAll}
              disabled={files.filter((f) => f.status === "idle").length === 0}
              className="primary-gradient text-white px-6 py-2.5 rounded-xl font-semibold text-sm shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all active:scale-95 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="material-symbols-outlined text-sm">publish</span>
              Submit All to AI
            </button>
          }
        />

        <div className="pt-24 px-8 pb-12">
          {/* Header */}
          <div className="mb-10">
            <h1 className="text-3xl font-extrabold tracking-tight text-on-surface">
              Upload Candidate CVs
            </h1>
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-4 gap-6 mb-10">
            {/* Total Uploaded */}
            <div className="bg-surface-container-lowest p-6 rounded-2xl shadow-sm">
              <div className="flex justify-between items-start mb-4">
                <div className="p-2 bg-primary-fixed rounded-lg">
                  <span className="material-symbols-outlined text-on-primary-fixed">
                    folder_zip
                  </span>
                </div>
                <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">
                  Total Uploaded
                </span>
              </div>
              <div className="text-3xl font-bold">{files.length}</div>
              <div className="mt-2 text-[10px] text-on-surface-variant">
                {files.length === 1
                  ? "1 file in queue"
                  : `${files.length} files in queue`}
              </div>
            </div>

            {/* Processing */}
            <div className="bg-surface-container-lowest p-6 rounded-2xl shadow-sm">
              <div className="flex justify-between items-start mb-4">
                <div className="p-2 bg-tertiary-fixed rounded-lg">
                  <span className="material-symbols-outlined text-on-tertiary-fixed">
                    sync
                  </span>
                </div>
                <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">
                  Processing
                </span>
              </div>
              <div className="text-3xl font-bold text-tertiary">
                {processingCount}
              </div>
              <div className="mt-2 flex items-center gap-1">
                <div className="h-1 w-16 bg-surface-container rounded-full overflow-hidden">
                  <div
                    className="h-full bg-tertiary transition-all"
                    style={{
                      width:
                        files.length > 0
                          ? `${(processingCount / files.length) * 100}%`
                          : "0%",
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Completed */}
            <div className="bg-surface-container-lowest p-6 rounded-2xl shadow-sm">
              <div className="flex justify-between items-start mb-4">
                <div className="p-2 bg-emerald-100 rounded-lg">
                  <span className="material-symbols-outlined text-emerald-700">
                    check_circle
                  </span>
                </div>
                <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">
                  Completed
                </span>
              </div>
              <div className="text-3xl font-bold text-emerald-600">
                {completedCount}
              </div>
              <div className="mt-2 text-[10px] text-emerald-600 font-medium">
                {files.length > 0
                  ? `${Math.round((completedCount / files.length) * 100)}% Efficiency Rate`
                  : "No files processed yet"}
              </div>
            </div>

            {/* Failed */}
            <div className="bg-surface-container-lowest p-6 rounded-2xl shadow-sm border-l-4 border-error/20">
              <div className="flex justify-between items-start mb-4">
                <div className="p-2 bg-error-container rounded-lg">
                  <span className="material-symbols-outlined text-on-error-container">
                    error
                  </span>
                </div>
                <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">
                  Failed
                </span>
              </div>
              <div className="text-3xl font-bold text-error">{failedCount}</div>
              <div
                className="mt-2 text-[10px] text-error font-medium underline cursor-pointer"
                onClick={() => setShowErrorLog(true)}
              >
                View Error Log
              </div>
            </div>
          </div>

          {/* Two-column layout */}
          <div className="flex gap-8">
            {/* Left Column (60%) */}
            <div className="w-[60%] space-y-8">
              {/* Drop Zone */}
              <div
                onDrop={onDrop}
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onClick={() => fileInputRef.current?.click()}
                className={`bg-surface-container-lowest p-10 rounded-3xl border-2 border-dashed transition-colors group cursor-pointer text-center relative overflow-hidden ${
                  isDragging
                    ? "border-primary bg-primary/[0.02]"
                    : "border-outline-variant/50 hover:border-primary/50"
                }`}
              >
                <div className="absolute inset-0 bg-primary/0 group-hover:bg-primary/[0.02] transition-colors pointer-events-none" />
                <div className="relative z-10">
                  <div className="w-16 h-16 bg-surface-container-low rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                    <span className="material-symbols-outlined text-primary text-3xl">
                      cloud_upload
                    </span>
                  </div>
                  <h3 className="text-xl font-bold mb-2">
                    Drag CVs here or{" "}
                    <span className="text-primary underline">
                      click to browse
                    </span>
                  </h3>
                  <p className="text-on-surface-variant text-sm max-w-xs mx-auto mb-6">
                    Support for PDF, DOCX, and RTF formats. You can upload up to
                    50 files at once.
                  </p>
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-surface-container-low rounded-full text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">
                    <span className="material-symbols-outlined text-xs">
                      file_present
                    </span>
                    Max File Size: 10MB each
                  </div>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf"
                  multiple
                  className="hidden"
                  onChange={(e) => addFiles(e.target.files)}
                />
              </div>

              {/* Folder Monitor */}
              <div className="bg-surface-container-lowest p-8 rounded-3xl shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-indigo-400">
                      folder_shared
                    </span>
                    <h3 className="font-bold text-lg">Folder Monitor</h3>
                  </div>
                  <div className="flex items-center gap-3 px-4 py-1.5 bg-surface-container-low rounded-full">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        folderMonitorActive
                          ? "bg-emerald-500 animate-pulse"
                          : "bg-gray-400"
                      }`}
                    />
                    <span
                      className={`text-[10px] font-bold uppercase tracking-widest ${
                        folderMonitorActive
                          ? "text-emerald-700"
                          : "text-gray-500"
                      }`}
                    >
                      {folderMonitorActive ? "Active" : "Inactive"}
                    </span>
                    <button
                      onClick={() => setFolderMonitorActive((v) => !v)}
                      className={`w-8 h-4 rounded-full relative ml-2 transition-colors ${
                        folderMonitorActive
                          ? "bg-primary"
                          : "bg-surface-container-high"
                      }`}
                    >
                      <div
                        className={`absolute top-1 w-2 h-2 bg-white rounded-full transition-all ${
                          folderMonitorActive ? "right-1" : "left-1"
                        }`}
                      />
                    </button>
                  </div>
                </div>
                <p className="text-on-surface-variant text-xs mb-4">
                  Automatically ingest files as they are added to a specific
                  directory on your network or local drive.
                </p>
                <div className="flex gap-4">
                  <div className="flex-1 relative">
                    <input
                      type="text"
                      value={folderPath}
                      onChange={(e) => setFolderPath(e.target.value)}
                      className="w-full bg-surface-container-low border-none rounded-xl py-3 px-4 text-sm font-mono text-on-surface-variant focus:ring-2 focus:ring-primary/20 outline-none"
                    />
                    <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant text-sm cursor-pointer">
                      edit
                    </span>
                  </div>
                  <button className="bg-primary-fixed text-on-primary-fixed px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-primary-container transition-colors">
                    Change Folder
                  </button>
                </div>
              </div>

              {/* Upload Queue */}
              <div className="bg-surface-container-lowest rounded-3xl overflow-hidden shadow-sm">
                <div className="px-8 py-6 flex items-center justify-between border-b border-outline-variant/10">
                  <h3 className="font-bold text-lg">Upload Queue</h3>
                  <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">
                    {files.filter((f) => f.status === "idle").length} Items
                    Pending
                  </span>
                </div>

                {files.length === 0 ? (
                  <div className="px-8 py-12 text-center text-on-surface-variant text-sm">
                    No files queued. Drag &amp; drop or browse to add files.
                  </div>
                ) : (
                  <table className="w-full text-left">
                    <thead className="bg-surface-container-low">
                      <tr>
                        <th className="px-8 py-4 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">
                          Filename
                        </th>
                        <th className="px-6 py-4 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">
                          Size
                        </th>
                        <th className="px-6 py-4 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">
                          Progress
                        </th>
                        <th className="px-6 py-4 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">
                          Status
                        </th>
                        <th className="px-8 py-4 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest text-right">
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant/10">
                      {files.map((item) => {
                        const { icon, color } = getFileIcon(item.file.name);
                        const badge = statusBadge(item.status);
                        return (
                          <tr
                            key={item.file.name}
                            className="hover:bg-surface-container-low/50 transition-colors"
                          >
                            <td className="px-8 py-5">
                              <div className="flex items-center gap-3">
                                <span
                                  className={`material-symbols-outlined ${color}`}
                                >
                                  {icon}
                                </span>
                                <span className="text-sm font-medium">
                                  {item.file.name}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-5 text-sm text-on-surface-variant">
                              {(item.file.size / (1024 * 1024)).toFixed(1)} MB
                            </td>
                            <td className="px-6 py-5">
                              <div className="w-32 h-1.5 bg-surface-container-low rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all ${
                                    item.status === "done"
                                      ? "bg-emerald-500"
                                      : item.status === "error"
                                        ? "bg-error"
                                        : "bg-primary"
                                  }`}
                                  style={{
                                    width:
                                      item.status === "idle"
                                        ? "0%"
                                        : item.status === "uploading"
                                          ? "30%"
                                          : item.status === "parsing"
                                            ? "65%"
                                            : item.status === "done"
                                              ? "100%"
                                              : "0%",
                                  }}
                                />
                              </div>
                            </td>
                            <td className="px-6 py-5">
                              <span
                                className={`px-2 py-1 text-[9px] font-bold uppercase tracking-tighter rounded ${badge.className}`}
                              >
                                {badge.label}
                              </span>
                            </td>
                            <td className="px-8 py-5 text-right">
                              <div className="flex items-center justify-end gap-2">
                                {item.status === "done" && item.candidateId && (
                                  <button
                                    onClick={() =>
                                      router.push(
                                        `/candidates/${item.candidateId}`,
                                      )
                                    }
                                    className="text-xs text-primary font-semibold hover:underline"
                                  >
                                    View →
                                  </button>
                                )}
                                {item.status === "idle" && (
                                  <button
                                    onClick={() => removeFile(item.file.name)}
                                    className="text-on-surface-variant hover:text-error transition-colors"
                                  >
                                    <span className="material-symbols-outlined text-lg">
                                      cancel
                                    </span>
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}

                {files.some((f) => f.status === "done") && (
                  <div className="px-8 py-4 border-t border-outline-variant/10">
                    <button
                      onClick={() => router.push("/candidates")}
                      className="primary-gradient text-white px-5 py-2 rounded-xl font-semibold text-xs shadow-lg shadow-primary/20"
                    >
                      View All Candidates →
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column (40%) */}
            <div className="w-[40%]">
              <div className="bg-surface-container-lowest p-8 rounded-3xl shadow-sm flex flex-col">
                {/* Recent Activity */}
                <div className="flex items-center justify-between mb-8">
                  <h3 className="font-bold text-lg">Recent Activity</h3>
                  <button
                    onClick={() => setActivityHistory([])}
                    className="text-[10px] font-bold text-primary uppercase tracking-widest hover:underline"
                  >
                    Clear History
                  </button>
                </div>

                <div className="space-y-6">
                  {activityHistory.length === 0 ? (
                    <p className="text-sm text-on-surface-variant text-center py-6">
                      No activity yet. Upload a CV to get started.
                    </p>
                  ) : (
                    activityHistory.slice(0, 5).map((item, idx) => (
                      <div
                        key={`${item.name}-${idx}`}
                        className={`relative pl-6 border-l-2 ${
                          item.status === "processing"
                            ? "border-tertiary/20"
                            : item.status === "completed"
                              ? "border-emerald-500/20"
                              : "border-error/20"
                        }`}
                      >
                        <div
                          className={`absolute -left-[5px] top-0 w-2 h-2 rounded-full ${
                            item.status === "processing"
                              ? "bg-tertiary"
                              : item.status === "completed"
                                ? "bg-emerald-500"
                                : "bg-error"
                          }`}
                        />
                        <div className="flex justify-between items-start mb-1">
                          <div>
                            <div className="text-sm font-semibold mb-0.5">
                              {item.name}
                            </div>
                            <div className="text-[10px] text-on-surface-variant">
                              {item.time} • {item.size}
                            </div>
                          </div>
                          <span
                            className={`px-2 py-0.5 text-[8px] font-bold uppercase tracking-widest rounded-full shrink-0 ml-2 ${
                              item.status === "processing"
                                ? "bg-tertiary-fixed text-on-tertiary-fixed"
                                : item.status === "completed"
                                  ? "bg-emerald-100 text-emerald-700"
                                  : "bg-error-container text-on-error-container"
                            }`}
                          >
                            {item.status}
                          </span>
                        </div>

                        {item.status === "processing" && (
                          <div className="h-1 bg-surface-container-low rounded-full overflow-hidden mt-2">
                            <div className="h-full bg-tertiary w-1/2" />
                          </div>
                        )}

                        {item.score !== undefined && (
                          <div className="mt-3 p-3 bg-surface-container-low rounded-xl flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center text-[10px] text-white font-bold">
                                {item.score}
                              </div>
                              <div className="text-[10px] font-medium text-on-surface-variant uppercase tracking-tighter">
                                AI Talent Match Score
                              </div>
                            </div>
                          </div>
                        )}

                        {item.error && (
                          <div className="mt-2 text-[10px] text-error font-medium italic">
                            Error: {item.error}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Error Log Modal */}
      {showErrorLog && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={() => setShowErrorLog(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="font-bold text-gray-900">Error Log</h3>
              <button
                onClick={() => setShowErrorLog(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="px-6 py-4 max-h-80 overflow-y-auto space-y-3">
              {files.filter((f) => f.status === "error").length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-6">
                  No errors to display.
                </p>
              ) : (
                files
                  .filter((f) => f.status === "error")
                  .map((f) => (
                    <div
                      key={f.file.name}
                      className="p-3 bg-red-50 rounded-xl border border-red-100"
                    >
                      <p className="text-sm font-semibold text-gray-800">
                        {f.file.name}
                      </p>
                      <p className="text-xs text-red-600 mt-1">
                        {f.message || "Unknown error"}
                      </p>
                    </div>
                  ))
              )}
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end">
              <button
                onClick={() => setShowErrorLog(false)}
                className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
