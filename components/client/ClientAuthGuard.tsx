"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { setUser, userFromSession, type User } from "@/lib/auth";
import { bootstrapClientData } from "@/lib/data-bootstrap";
import { ClientSidebar } from "./ClientSidebar";
import { ClientTopBar } from "./ClientTopBar";
import { ClientPromoBanner } from "./ClientPromoBanner";
import { ClientCartDrawer } from "./ClientCartDrawer";
import { HomeWhatsAppFloat } from "@/components/home/HomeWhatsAppFloat";
import { NewsPopup } from "@/components/news/NewsPopup";
import { PageAmbient } from "@/components/ui/PageAmbient";

export function ClientAuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [user, setUserState] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      if (status === "loading") return;

      if (!session?.user?.email) {
        router.replace("/login");
        return;
      }

      const current = userFromSession({
        email: session.user.email,
        name: session.user.name ?? session.user.email.split("@")[0],
        avatarUrl: session.user.image ?? undefined,
        provider: session.provider,
      });

      setUser(current);
      await bootstrapClientData(current.email);
      if (cancelled) return;
      setUserState(current);
      setReady(true);
    }

    void init();
    return () => {
      cancelled = true;
    };
  }, [router, session, status]);

  if (!ready || !user) {
    return (
      <div className="client-loading site-shell">
        <PageAmbient variant="minimal" />
        <div className="client-loading__spinner" />
        <p>Loading client area...</p>
      </div>
    );
  }

  return (
    <div className="client-layout client-layout--ocean site-shell">
      <PageAmbient variant="minimal" />
      <NewsPopup enabled={ready} />
      <Suspense fallback={null}>
        <ClientSidebar
          userName={user.name}
          userEmail={user.email}
          userAvatar={user.avatarUrl}
        />
      </Suspense>
      <div className="client-body">
        <ClientPromoBanner />
        <ClientTopBar onCartOpen={() => setCartOpen(true)} />
        <div className="client-main client-main--ocean">{children}</div>
      </div>
      <ClientCartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
      <HomeWhatsAppFloat />
    </div>
  );
}
