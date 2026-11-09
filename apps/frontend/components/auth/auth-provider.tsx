"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { api, type Role, type Session } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";

const AuthContext = createContext<{
  session: Session;
  loading: boolean;
  error: string;
  refresh: () => Promise<Session>;
  logout: () => Promise<void>;
} | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [session, setSession] = useState<Session>({ user: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const refresh = useCallback(async () => {
    try {
      const next = await api<Session>("/auth/session");
      setSession(next);
      setError("");
      return next;
    } catch (cause) {
      setSession({ user: null });
      setError(
        cause instanceof Error ? cause.message : "Unable to load your account.",
      );
      throw cause;
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    // Fetching the initial session is an external synchronization.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh().catch(() => {});
    const onFocus = () => void refresh().catch(() => {});
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [refresh]);
  async function logout() {
    await api("/auth/logout", { method: "POST" }, session.csrfToken);
    setSession({ user: null });
    router.replace("/");
    router.refresh();
  }
  return (
    <AuthContext.Provider value={{ session, loading, error, refresh, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("AuthProvider is required");
  return value;
}

export function AuthGate({
  children,
  role,
  onboarding = false,
}: {
  children: React.ReactNode;
  role?: Role;
  onboarding?: boolean;
}) {
  const { session, loading, error, refresh } = useAuth();
  const router = useRouter();
  const user = session.user;
  useEffect(() => {
    if (loading || error) return;
    if (!user) router.replace("/login");
    else if (onboarding && user.onboarded)
      router.replace(user.role === "tutor" ? "/tutor/swiped" : "/");
    else if (!user.onboarded && !onboarding) router.replace("/onboarding");
    else if (role && user.role !== role)
      router.replace(user.role === "tutor" ? "/tutor/swiped" : "/");
  }, [loading, error, user, role, onboarding, router]);
  if (error)
    return (
      <div className="mx-auto flex max-w-md flex-col gap-4 p-8">
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button onClick={() => void refresh().catch(() => {})}>
          Try again
        </Button>
      </div>
    );
  if (
    loading ||
    !user ||
    (onboarding && user.onboarded) ||
    (!user.onboarded && !onboarding) ||
    (role && user.role !== role)
  )
    return (
      <p role="status" className="p-8 text-center">
        Loading account…
      </p>
    );
  return children;
}
