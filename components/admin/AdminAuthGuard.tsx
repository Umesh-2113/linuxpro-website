"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ADMIN_BASE_PATH, isAdmin } from "@/lib/admin";
import { bootstrapAdminData } from "@/lib/data-bootstrap";
import { AdminSidebar } from "./AdminSidebar";
import { PageAmbient } from "@/components/ui/PageAmbient";

export function AdminAuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const loginPath = `${ADMIN_BASE_PATH}/login`;
    if (pathname === loginPath) {
      if (isAdmin()) {
        router.replace(ADMIN_BASE_PATH);
        return;
      }
      setReady(true);
      return;
    }
    if (!isAdmin()) {
      router.replace(loginPath);
      return;
    }
    void bootstrapAdminData().then(() => setReady(true));
  }, [pathname, router]);

  if (pathname === `${ADMIN_BASE_PATH}/login`) {
    return <>{children}</>;
  }

  if (!ready) {
    return (
      <div className="client-loading site-shell">
        <PageAmbient variant="minimal" />
        <div className="client-loading__spinner" />
        <p>Loading admin panel...</p>
      </div>
    );
  }

  return (
    <div className="admin-layout site-shell">
      <PageAmbient variant="minimal" />
      <AdminSidebar />
      <div className="admin-main">{children}</div>
    </div>
  );
}
