"use client";

import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const tokenData = await api.login(email, password);
      const userData = await api.getMe(tokenData.access_token);
      login(tokenData.access_token, userData);
      const from = searchParams.get("from") || "/dashboard";
      router.push(from);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Login failed";
      if (message.includes("401")) {
        setError("Invalid email or password.");
      } else {
        setError("Something went wrong. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-surface to-primary-fixed/40">
      <main className="flex-grow flex items-center justify-center p-4 md:p-8">
        <div className="bg-surface-container-lowest rounded-2xl shadow-[0_8px_30px_rgba(30,27,75,0.04)] border border-outline-variant/30 w-full max-w-5xl flex flex-col md:flex-row overflow-hidden">
          {/* Left: branding */}
          <div className="hidden md:flex md:w-1/2 bg-surface-container-high relative overflow-hidden items-center justify-center p-12">
            <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-primary/10 to-transparent"></div>
            <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary/20 rounded-full blur-3xl opacity-50"></div>
            <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-secondary/20 rounded-full blur-3xl opacity-50"></div>
            <div className="relative z-10 flex flex-col items-start justify-between h-full w-full">
              <Link
                href="/"
                className="text-primary font-headline text-3xl font-extrabold tracking-tighter"
              >
                TALASH
              </Link>
              <div className="mt-auto">
                <div className="aspect-square w-full max-w-sm rounded-2xl bg-gradient-to-br from-[#0d1c2e] to-primary/80 shadow-lg border border-white/20 flex items-center justify-center relative overflow-hidden">
                  <div className="absolute inset-8 rounded-full border-2 border-primary-fixed-dim/30 animate-pulse"></div>
                  <div className="absolute inset-16 rounded-full border-2 border-primary-fixed-dim/40"></div>
                  <span
                    className="material-symbols-outlined text-primary-fixed text-6xl relative z-10"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    hub
                  </span>
                  <div className="absolute bottom-4 left-0 right-0 text-center text-primary-fixed-dim text-[10px] tracking-[0.3em] font-bold">
                    SAFE CONNECTIVITY
                  </div>
                </div>
                <div className="mt-8">
                  <h2 className="text-2xl font-semibold text-on-surface mb-2">
                    The Intelligent Gateway.
                  </h2>
                  <p className="text-sm text-on-surface-variant max-w-sm">
                    Connect with algorithmic precision. Unlock advanced research
                    intelligence and streamline your talent discovery.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right: form */}
          <div className="w-full md:w-1/2 p-8 md:p-12 lg:p-16 flex flex-col justify-center bg-surface-container-lowest">
            <div className="md:hidden mb-8 text-primary font-headline text-2xl tracking-tighter font-extrabold">
              TALASH
            </div>
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-on-surface mb-2">
                Welcome back
              </h1>
              <p className="text-base text-on-surface-variant">
                Please enter your details to sign in.
              </p>
            </div>

            {error && (
              <div className="mb-6 px-4 py-3 rounded-lg bg-error/10 border border-error/30 text-sm text-error font-medium">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label
                  htmlFor="email"
                  className="block text-[0.75rem] font-semibold tracking-widest uppercase text-on-surface-variant mb-2"
                >
                  Email
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <span className="material-symbols-outlined text-outline">
                      mail
                    </span>
                  </div>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    className="w-full pl-11 pr-4 py-3 bg-surface-container-low border border-outline-variant/50 rounded-lg text-base text-on-surface placeholder-outline focus:ring-2 focus:ring-primary focus:border-primary transition-all outline-none"
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label
                    htmlFor="password"
                    className="block text-[0.75rem] font-semibold tracking-widest uppercase text-on-surface-variant"
                  >
                    Password
                  </label>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <span className="material-symbols-outlined text-outline">
                      lock
                    </span>
                  </div>
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-11 pr-12 py-3 bg-surface-container-low border border-outline-variant/50 rounded-lg text-base text-on-surface placeholder-outline focus:ring-2 focus:ring-primary focus:border-primary transition-all outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-on-surface-variant hover:text-on-surface focus:outline-none"
                  >
                    <span className="material-symbols-outlined text-lg">
                      {showPassword ? "visibility_off" : "visibility"}
                    </span>
                  </button>
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 bg-gradient-to-br from-primary to-primary-container text-on-primary font-semibold rounded-lg shadow-md hover:opacity-90 transition-opacity flex justify-center items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <span className="material-symbols-outlined text-sm animate-spin">
                      progress_activity
                    </span>
                    Signing in…
                  </>
                ) : (
                  <>
                    Log In
                    <span className="material-symbols-outlined text-sm">
                      arrow_forward
                    </span>
                  </>
                )}
              </button>
            </form>

            <div className="mt-10 text-center">
              <p className="text-sm text-on-surface-variant">
                Don&apos;t have an account?{" "}
                <Link
                  href="/signup"
                  className="text-primary font-semibold hover:text-on-primary-fixed-variant transition-colors underline underline-offset-4"
                >
                  Sign Up
                </Link>
              </p>
            </div>
          </div>
        </div>
      </main>

      <footer className="py-6 px-4 md:px-8 border-t border-outline-variant/20 bg-surface-bright flex justify-center items-center gap-6">
        <Link
          href="/privacy"
          className="text-[0.75rem] font-semibold tracking-widest uppercase text-on-surface-variant hover:text-primary transition-colors"
        >
          Privacy
        </Link>
        <span className="w-1 h-1 rounded-full bg-outline-variant"></span>
        <Link
          href="/terms"
          className="text-[0.75rem] font-semibold tracking-widest uppercase text-on-surface-variant hover:text-primary transition-colors"
        >
          Terms
        </Link>
      </footer>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
