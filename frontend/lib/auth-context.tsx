"use client";

import { useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useState } from "react";
import { api } from "./api";
import { UserPublic } from "./types";

interface AuthContextValue {
  user: UserPublic | null;
  token: string | null;
  isLoading: boolean;
  login: (token: string, user: UserPublic) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserPublic | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const storedToken = localStorage.getItem("auth_token");
    if (!storedToken) {
      setIsLoading(false);
      return;
    }
    api
      .getMe(storedToken)
      .then((userData) => {
        setToken(storedToken);
        setUser(userData);
      })
      .catch(() => {
        // Token is invalid or expired — clear everything
        localStorage.removeItem("auth_token");
        document.cookie =
          "auth_token=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/";
      })
      .finally(() => setIsLoading(false));
  }, []);

  const login = (newToken: string, userData: UserPublic) => {
    localStorage.setItem("auth_token", newToken);
    // Mirror to cookie so Next.js Edge middleware can read it
    document.cookie = `auth_token=${newToken}; path=/; max-age=${
      7 * 24 * 60 * 60
    }; SameSite=Lax`;
    setToken(newToken);
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem("auth_token");
    document.cookie =
      "auth_token=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/";
    setToken(null);
    setUser(null);
    router.push("/login");
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
