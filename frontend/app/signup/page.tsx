"use client";

import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function SignupPage() {
  const router = useRouter();
  const { login } = useAuth();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    setLoading(true);
    try {
      const tokenData = await api.signup(
        fullName,
        email,
        password,
        confirmPassword,
      );
      const userData = await api.getMe(tokenData.access_token);
      login(tokenData.access_token, userData);
      router.push("/dashboard");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Signup failed";
      if (message.includes("409")) {
        setError("An account with this email already exists.");
      } else if (message.includes("422")) {
        // Extract server-side validation message
        try {
          const detail = message.replace(/^API 422: /, "");
          const parsed = JSON.parse(detail);
          const first = parsed?.detail?.[0]?.msg;
          setError(first ?? "Please check your inputs and try again.");
        } catch {
          setError("Please check your inputs and try again.");
        }
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
                    person_add
                  </span>
                  <div className="absolute bottom-4 left-0 right-0 text-center text-primary-fixed-dim text-[10px] tracking-[0.3em] font-bold">
                    JOIN TALASH
                  </div>
                </div>
                <div className="mt-8">
                  <h2 className="text-2xl font-semibold text-on-surface mb-2">
                    Start recruiting smarter.
                  </h2>
                  <p className="text-sm text-on-surface-variant max-w-sm">
                    Create your account and gain instant access to AI-powered CV
                    analysis and intelligent candidate ranking.
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
                Create an account
              </h1>
              <p className="text-base text-on-surface-variant">
                Fill in your details to get started.
              </p>
            </div>

            {error && (
              <div className="mb-6 px-4 py-3 rounded-lg bg-error/10 border border-error/30 text-sm text-error font-medium">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Full Name */}
              <div>
                <label
                  htmlFor="fullName"
                  className="block text-[0.75rem] font-semibold tracking-widest uppercase text-on-surface-variant mb-2"
                >
                  Full Name
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <span className="material-symbols-outlined text-outline">
                      person
                    </span>
                  </div>
                  <input
                    id="fullName"
                    name="fullName"
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Your full name"
                    className="w-full pl-11 pr-4 py-3 bg-surface-container-low border border-outline-variant/50 rounded-lg text-base text-on-surface placeholder-outline focus:ring-2 focus:ring-primary focus:border-primary transition-all outline-none"
                  />
                </div>
              </div>

              {/* Email */}
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

              {/* Password */}
              <div>
                <label
                  htmlFor="password"
                  className="block text-[0.75rem] font-semibold tracking-widest uppercase text-on-surface-variant mb-2"
                >
                  Password
                </label>
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
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min. 8 characters"
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

              {/* Confirm Password */}
              <div>
                <label
                  htmlFor="confirmPassword"
                  className="block text-[0.75rem] font-semibold tracking-widest uppercase text-on-surface-variant mb-2"
                >
                  Confirm Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <span className="material-symbols-outlined text-outline">
                      lock_check
                    </span>
                  </div>
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirm ? "text" : "password"}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat your password"
                    className="w-full pl-11 pr-12 py-3 bg-surface-container-low border border-outline-variant/50 rounded-lg text-base text-on-surface placeholder-outline focus:ring-2 focus:ring-primary focus:border-primary transition-all outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm((v) => !v)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-on-surface-variant hover:text-on-surface focus:outline-none"
                  >
                    <span className="material-symbols-outlined text-lg">
                      {showConfirm ? "visibility_off" : "visibility"}
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
                    Creating account…
                  </>
                ) : (
                  <>
                    Create Account
                    <span className="material-symbols-outlined text-sm">
                      arrow_forward
                    </span>
                  </>
                )}
              </button>
            </form>

            <div className="mt-8 text-center">
              <p className="text-sm text-on-surface-variant">
                Already have an account?{" "}
                <Link
                  href="/login"
                  className="text-primary font-semibold hover:text-on-primary-fixed-variant transition-colors underline underline-offset-4"
                >
                  Log In
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
