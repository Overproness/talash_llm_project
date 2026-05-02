"use client";

import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";

export default function TopBar({
  title,
  breadcrumb,
  action,
  searchValue,
  onSearchChange,
}: {
  title?: string;
  breadcrumb?: string[];
  action?: React.ReactNode;
  searchValue?: string;
  onSearchChange?: (v: string) => void;
}) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [localSearch, setLocalSearch] = useState("");

  const initials = user?.full_name
    ? user.full_name
        .split(" ")
        .map((n) => n[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "?";

  return (
    <header className="fixed top-0 right-0 w-[calc(100%-220px)] h-16 z-40 bg-white/80 backdrop-blur-md flex justify-between items-center px-8">
      {/* Left: Search / breadcrumb */}
      <div className="flex items-center gap-4 flex-1">
        {breadcrumb ? (
          <nav className="flex items-center gap-2 text-[11px] font-medium text-on-surface-variant uppercase tracking-widest">
            {breadcrumb.map((crumb, i) => {
              const path =
                i === 0 ? "/" : `/${crumb.toLowerCase().replace(/\s+/g, "-")}`;

              const isLast = i === breadcrumb.length - 1;
              
              return (
                <span key={i} className="flex items-center gap-2">
                  {i > 0 && (
                    <span className="material-symbols-outlined text-[12px]">
                      chevron_right
                    </span>
                  )}

                  {isLast ? (
                    <span className="text-primary cursor-default">{crumb}</span>
                  ) : (
                    <Link
                      href={path}
                      className="hover:text-primary transition-colors"
                    >
                      {crumb}
                    </Link>
                  )}
                </span>
              );
            })}
          </nav>
        ) : (
          <div className="relative w-full max-w-md group">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors text-sm">
              search
            </span>
            <input
              className="w-full bg-surface-container-low border-none rounded-full py-2 pl-10 pr-4 text-sm focus:ring-2 focus:ring-primary/20 transition-all outline-none"
              placeholder="Search candidates..."
              type="text"
              value={
                onSearchChange !== undefined ? (searchValue ?? "") : localSearch
              }
              onChange={(e) => {
                const val = e.target.value;
                if (onSearchChange) {
                  onSearchChange(val);
                } else {
                  setLocalSearch(val);
                }
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !onSearchChange) {
                  const q = localSearch.trim();
                  if (q)
                    router.push(`/candidates?search=${encodeURIComponent(q)}`);
                }
              }}
            />
          </div>
        )}
      </div>

      {/* Right: actions */}
      <div className="flex items-center gap-6">
        {action}

        <div className="flex items-center gap-3 ml-2 border-l pl-6 border-outline-variant/30">
          <div className="text-right">
            <div className="text-xs font-semibold text-on-surface">
              {user?.full_name ?? "—"}
            </div>
            <div className="text-[10px] text-on-surface-variant uppercase tracking-wider truncate max-w-[140px]">
              {user?.email ?? ""}
            </div>
          </div>
          <div className="w-8 h-8 rounded-full bg-primary-fixed flex items-center justify-center text-on-primary-fixed font-bold text-xs">
            {initials}
          </div>
          <button
            onClick={logout}
            title="Sign out"
            className="p-1.5 text-on-surface-variant hover:text-error hover:bg-error/10 rounded-lg transition-all"
          >
            <span className="material-symbols-outlined text-[18px]">
              logout
            </span>
          </button>
        </div>
      </div>
    </header>
  );
}
