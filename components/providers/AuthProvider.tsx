"use client";

import { useEffect } from "react";
import { SessionProvider, useSession } from "next-auth/react";
import { logout, setUser, userFromSession } from "@/lib/auth";

function AuthSessionSync() {
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status === "authenticated" && session?.user?.email) {
      setUser(
        userFromSession({
          email: session.user.email,
          name: session.user.name ?? session.user.email.split("@")[0],
          avatarUrl: session.user.image ?? undefined,
          provider: session.provider,
        })
      );
      return;
    }

    if (status === "unauthenticated") {
      logout();
    }
  }, [session, status]);

  return null;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <AuthSessionSync />
      {children}
    </SessionProvider>
  );
}
