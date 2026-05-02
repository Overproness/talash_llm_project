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
    { href: "/", label: "Home" },
    { href: "/features", label: "Features" },
  ];

  return (
    <nav className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-md shadow-sm bg-surface-container-low">
      <div className="max-w-7xl mx-auto flex items-center px-6 py-4">
        {/* Logo — left */}
        <div className="flex-1 flex items-center">
          <Link
            href="/"
            className="text-xl font-bold tracking-tighter text-on-surface"
          >
            Talash Insight
          </Link>
        </div>

        {/* Nav links — center */}
        {!minimal && (
          <div className="flex items-center gap-6 font-body text-sm font-medium tracking-tight">
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

        {/* Auth buttons — right */}
        <div className="flex-1 flex items-center justify-end gap-4">
          <Link
            href="/login"
            className="font-body text-sm font-medium tracking-tight text-on-surface-variant hover:text-primary transition-colors px-3 py-2"
          >
            Log In
          </Link>
          {!minimal && (
            <Link
              href="/signup"
              className="font-body text-sm font-semibold tracking-tight bg-primary text-on-primary px-4 py-2 rounded-lg hover:opacity-90 transition-opacity"
            >
              Sign Up
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
