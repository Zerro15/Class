"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

import { api, setUnauthorizedHandler, tokenStorage } from "@/lib/api";

interface SessionContextType {
  isAuthenticated: boolean;
  isChecking: boolean;
  logout: () => void;
  refreshSession: () => Promise<void>;
}

const SessionContext = createContext<SessionContextType | null>(null);

const publicPaths = new Set(["/", "/login", "/register"]);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  const logout = useCallback(() => {
    tokenStorage.clear();
    setIsAuthenticated(false);
    if (!publicPaths.has(pathname)) {
      router.push("/login");
    }
  }, [pathname, router]);

  const refreshSession = useCallback(async () => {
    const token = tokenStorage.get();
    if (!token) {
      setIsAuthenticated(false);
      setIsChecking(false);
      if (!publicPaths.has(pathname)) {
        router.push("/login");
      }
      return;
    }

    setIsChecking(true);
    try {
      await api.me();
      setIsAuthenticated(true);
      if (pathname === "/login" || pathname === "/register") {
        router.push("/dashboard");
      }
    } catch {
      tokenStorage.clear();
      setIsAuthenticated(false);
      if (!publicPaths.has(pathname)) {
        router.push("/login");
      }
    } finally {
      setIsChecking(false);
    }
  }, [pathname, router]);

  useEffect(() => {
    setUnauthorizedHandler(logout);
    return () => setUnauthorizedHandler(null);
  }, [logout]);

  useEffect(() => {
    void refreshSession();
  }, [refreshSession]);

  const value = useMemo(
    () => ({ isAuthenticated, isChecking, logout, refreshSession }),
    [isAuthenticated, isChecking, logout, refreshSession],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error("useSession must be used within SessionProvider");
  }
  return context;
}
