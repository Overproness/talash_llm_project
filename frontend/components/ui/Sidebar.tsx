"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/dashboard", icon: "dashboard", label: "Dashboard" },
  { href: "/upload", icon: "upload", label: "Upload" },
  { href: "/candidates", icon: "group", label: "Candidates" },
  { href: "/ranking", icon: "leaderboard", label: "Ranking" },
  { href: "/compare", icon: "compare_arrows", label: "Compare" },
  { href: "/email-drafts", icon: "mail", label: "Email Drafts" },
  { href: "/settings", icon: "settings", label: "Settings" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 h-full w-[220px] bg-[#1e1b4b] shadow-xl shadow-indigo-950/50 flex flex-col py-6 z-50">
      {/* Logo */}
      <div className="px-6 mb-10 flex items-center gap-2 text-xl font-bold text-white">
        <span className="material-symbols-outlined text-indigo-400">
          upload
        </span>
        <span className="tracking-tight">TALASH</span>
      </div>

      {/* Nav items */}
      <nav className="flex-1 space-y-1">
        {NAV.map(({ href, icon, label }) => {
          const active =
            pathname === href || (href !== "/upload" && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-4 py-3 transition-all ${
                active
                  ? "text-white bg-white/10 border-l-4 border-indigo-400"
                  : "text-white/60 hover:text-white hover:bg-white/5"
              }`}
            >
              <span className="material-symbols-outlined text-base">
                {icon}
              </span>
              <span className="text-[10px] uppercase tracking-widest font-medium">
                {label}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* Status badge */}
      <div className="px-4 mt-auto">
        <div className="p-4 rounded-xl bg-white/5 border border-white/10">
          <p className="text-[10px] text-indigo-300 font-bold uppercase mb-1">
            Smart HR Recruitment
          </p>
          <p className="text-xs text-white/50 leading-relaxed">
            Powered by TALASH Intelligence Engine.
          </p>
        </div>
      </div>
    </aside>
  );
}
