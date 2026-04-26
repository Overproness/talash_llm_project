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
}

export default function HomePage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [isDragging, setIsDragging] = useState(false);

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
            ? { ...f, status: "uploading", message: "Uploading…" }
            : f,
        ),
      );
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
                }
              : f,
          ),
        );

        // Poll until the backend finishes processing
        const candidateId = res.candidate_id;
        let attempts = 0;
        const maxAttempts = 120; // up to ~2 min (120 × 1 s)
        const poll = async () => {
          if (attempts >= maxAttempts) {
            setFiles((prev) =>
              prev.map((f) =>
                f.candidateId === candidateId
                  ? {
                      ...f,
                      status: "error",
                      message: "Timed out waiting for analysis.",
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
                      }
                    : f,
                ),
              );
            } else if (status === "failed") {
              const error = candidate.processing_error ?? "Processing failed.";
              setFiles((prev) =>
                prev.map((f) =>
                  f.candidateId === candidateId
                    ? { ...f, status: "error", message: error }
                    : f,
                ),
              );
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
              ? { ...f, status: "error", message: errorMessage }
              : f,
          ),
        );
      }
    }
  };

  const removeFile = (name: string) =>
    setFiles((prev) => prev.filter((f) => f.file.name !== name));

  const statusIcon = (s: UploadStatus) => {
    const map: Record<UploadStatus, { icon: string; color: string }> = {
      idle: { icon: "hourglass_empty", color: "text-outline" },
      uploading: { icon: "sync", color: "text-primary animate-spin" },
      parsing: { icon: "psychology", color: "text-primary animate-pulse" },
      done: { icon: "check_circle", color: "text-emerald-600" },
      error: { icon: "error", color: "text-error" },
    };
    return map[s];
  };

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
            <p className="text-on-surface-variant mt-1 text-sm">
              Drop PDF files or click to select. The AI engine will parse and
              extract structured data.
            </p>
          </div>

          {/* Stats bar */}
          <div className="grid grid-cols-4 gap-6 mb-10">
            {[
              {
                icon: "folder_zip",
                label: "Queued",
                value: files.length,
                color: "bg-primary-fixed text-on-primary-fixed",
              },
              {
                icon: "sync",
                label: "Processing",
                value: files.filter(
                  (f) => f.status === "uploading" || f.status === "parsing",
                ).length,
                color: "bg-tertiary-fixed text-on-tertiary-fixed",
              },
              {
                icon: "check_circle",
                label: "Completed",
                value: files.filter((f) => f.status === "done").length,
                color: "bg-primary-fixed text-on-primary-fixed",
              },
              {
                icon: "error",
                label: "Failed",
                value: files.filter((f) => f.status === "error").length,
                color: "bg-error-container text-on-error-container",
              },
            ].map((stat) => (
              <div
                key={stat.label}
                className="bg-surface-container-lowest p-6 rounded-2xl shadow-sm"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className={`p-2 rounded-lg ${stat.color}`}>
                    <span className="material-symbols-outlined">
                      {stat.icon}
                    </span>
                  </div>
                  <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">
                    {stat.label}
                  </span>
                </div>
                <div className="text-3xl font-bold">{stat.value}</div>
              </div>
            ))}
          </div>

          {/* Drop zone */}
          <div
            onDrop={onDrop}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onClick={() => fileInputRef.current?.click()}
            className={`rounded-2xl border-2 border-dashed p-12 flex flex-col items-center justify-center cursor-pointer transition-all mb-8 ${
              isDragging
                ? "border-primary bg-primary-fixed/30"
                : "border-outline-variant/40 bg-surface-container-low hover:border-primary/50 hover:bg-surface-container"
            }`}
          >
            <span className="material-symbols-outlined text-5xl text-primary mb-4">
              upload_file
            </span>
            <h3 className="text-lg font-semibold text-on-surface mb-1">
              Drop PDFs here or click to browse
            </h3>
            <p className="text-on-surface-variant text-sm">
              Supports PDF files up to 50 MB each
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              multiple
              className="hidden"
              onChange={(e) => addFiles(e.target.files)}
            />
          </div>

          {/* File list */}
          {files.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-bold text-on-surface-variant uppercase tracking-widest mb-4">
                Files
              </h2>
              {files.map((item) => {
                const { icon, color } = statusIcon(item.status);
                return (
                  <div
                    key={item.file.name}
                    className="bg-surface-container-lowest rounded-xl px-5 py-4 flex items-center justify-between shadow-sm"
                  >
                    <div className="flex items-center gap-4">
                      <span className="material-symbols-outlined text-primary">
                        picture_as_pdf
                      </span>
                      <div>
                        <p className="font-medium text-on-surface text-sm">
                          {item.file.name}
                        </p>
                        <p className="text-[11px] text-on-surface-variant">
                          {(item.file.size / 1024).toFixed(1)} KB
                          {item.message && ` — ${item.message}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`material-symbols-outlined ${color}`}>
                        {icon}
                      </span>
                      {item.status === "done" && item.candidateId && (
                        <button
                          onClick={() =>
                            router.push(`/candidates/${item.candidateId}`)
                          }
                          className="text-xs text-primary font-semibold hover:underline"
                        >
                          View Profile →
                        </button>
                      )}
                      {item.status === "idle" && (
                        <button
                          onClick={() => removeFile(item.file.name)}
                          className="text-outline hover:text-error transition-colors"
                        >
                          <span className="material-symbols-outlined text-sm">
                            close
                          </span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}

              {files.some((f) => f.status === "done") && (
                <div className="mt-6 flex gap-3">
                  <button
                    onClick={() => router.push("/candidates")}
                    className="primary-gradient text-white px-6 py-2.5 rounded-xl font-semibold text-sm shadow-lg shadow-primary/20"
                  >
                    View All Candidates →
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
