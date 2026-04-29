"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface PublicNavProps {
  /** When true, omits the marketing nav links (used on legal pages). */
  minimal?: boolean;
}

export default function PublicNav({ minimal = false }: PublicNavProps) {
  const pathname = usePathname();

  const links = [
    { href: "/features", label: "Features" },
    { href: "/#solutions", label: "Solutions" },
    { href: "/#resources", label: "Resources" },
  ];

  return (
    <nav className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-md shadow-sm bg-surface-container-low">
      <div className="max-w-7xl mx-auto flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-8">
          <Link
            href="/"
            className="text-xl font-bold tracking-tighter text-on-surface"
          >
            Talash Insight
          </Link>
          {!minimal && (
            <div className="hidden md:flex gap-6 font-body text-sm font-medium tracking-tight">
              {links.map((l) => {
                const active = pathname === l.href;
                return (
                  <Link
                    key={l.href}
                    href={l.href}
                    className={
                      active
                        ? "text-primary border-b-2 border-primary pb-1 transition-all"
                        : "text-on-surface-variant hover:text-primary transition-colors"
                    }
                  >
                    {l.label}
                  </Link>
                );
              })}
            </div>
          )}
        </div>
        <div className="flex items-center gap-4">
          <Link
            href="/login"
            className="font-body text-sm font-medium tracking-tight text-on-surface-variant hover:text-primary transition-colors px-3 py-2"
          >
            Log In
          </Link>
          {!minimal && (
            <Link
              href="/contact"
              className="font-body text-sm font-medium tracking-tight bg-gradient-to-br from-primary to-primary-container text-on-primary px-5 py-2.5 rounded-lg hover:opacity-90 transition-opacity shadow-md shadow-primary/20"
            >
              Request Demo
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
