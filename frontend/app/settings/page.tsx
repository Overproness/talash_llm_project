"use client";

import Sidebar from "@/components/ui/Sidebar";
import TopBar from "@/components/ui/TopBar";
import { api } from "@/lib/api";
import { useEffect, useState } from "react";

export default function SettingsPage() {
  const [health, setHealth] = useState<{
    status: string;
    ollama: string;
  } | null>(null);

  useEffect(() => {
    api.health().then(setHealth).catch(console.error);
  }, []);

  return (
    <div className="flex min-h-screen bg-surface">
      <Sidebar />
      <main className="ml-[220px] flex-1">
        <TopBar />
        <div className="pt-24 px-8 pb-12">
          <div className="mb-8">
            <h1 className="text-3xl font-extrabold tracking-tight text-on-surface">
              Settings
            </h1>
            <p className="text-on-surface-variant mt-1 text-sm">
              System configuration and status
            </p>
          </div>

          <div className="space-y-6 max-w-2xl">
            {/* System Status */}
            <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm">
              <h2 className="text-sm font-bold text-on-surface-variant uppercase tracking-widest mb-5">
                System Status
              </h2>
              <div className="space-y-4">
                {[
                  {
                    label: "API Backend",
                    value: health?.status === "ok" ? "Connected" : "Checking…",
                    ok: health?.status === "ok",
                  },
                  {
                    label: "Ollama LLM",
                    value:
                      health?.ollama === "available"
                        ? "Online (llama3.2)"
                        : "Offline — rule-based fallback active",
                    ok: health?.ollama === "available",
                  },
                  {
                    label: "PDF Parser",
                    value: "PyMuPDF + pdfplumber",
                    ok: true,
                  },
                  { label: "Database", value: "MongoDB", ok: true },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center justify-between"
                  >
                    <span className="text-sm text-on-surface">
                      {item.label}
                    </span>
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-2 h-2 rounded-full ${item.ok ? "bg-emerald-400" : "bg-amber-400"}`}
                      ></span>
                      <span className="text-sm text-on-surface-variant">
                        {item.value}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Configuration */}
            <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm">
              <h2 className="text-sm font-bold text-on-surface-variant uppercase tracking-widest mb-5">
                LLM Configuration
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="text-xs text-on-surface-variant uppercase tracking-widest font-bold block mb-2">
                    Ollama Host
                  </label>
                  <input
                    defaultValue="http://localhost:11434"
                    className="w-full bg-surface-container-low rounded-xl px-4 py-2.5 text-sm border-none outline-none focus:ring-2 focus:ring-primary/20"
                    placeholder="http://localhost:11434"
                    readOnly
                  />
                </div>
                <div>
                  <label className="text-xs text-on-surface-variant uppercase tracking-widest font-bold block mb-2">
                    Model
                  </label>
                  <input
                    defaultValue="llama3.2:3b"
                    className="w-full bg-surface-container-low rounded-xl px-4 py-2.5 text-sm border-none outline-none focus:ring-2 focus:ring-primary/20"
                    placeholder="llama3.2:3b"
                    readOnly
                  />
                </div>
              </div>
            </div>

            {/* Ollama setup instructions */}
            <div className="bg-surface-container rounded-2xl p-6 border-l-4 border-primary">
              <h3 className="font-semibold text-on-surface mb-3 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">
                  info
                </span>
                Ollama Setup Instructions
              </h3>
              <ol className="space-y-2 text-sm text-on-surface-variant list-decimal list-inside">
                <li>
                  Download Ollama:{" "}
                  <span className="text-primary font-mono">
                    winget install Ollama.Ollama
                  </span>
                </li>
                <li>
                  Pull the model:{" "}
                  <span className="text-primary font-mono">
                    ollama pull llama3.2:3b
                  </span>
                </li>
                <li>
                  Start Ollama:{" "}
                  <span className="text-primary font-mono">ollama serve</span>
                </li>
                <li>Refresh this page to verify connection</li>
              </ol>
              <p className="text-xs text-outline mt-3">
                When offline, the system uses regex-based CV extraction as
                fallback.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
