"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { AdminStockForm } from "@/components/admin/AdminStockForm";

export default function AdminStockNewPage() {
  const router = useRouter();

  return (
    <>
      <header className="admin-topbar admin-topbar--actions">
        <div>
          <Link href="/rockyelfadmin/stock" className="admin-back-link">
            ← Back to inventory
          </Link>
          <h1>Add New Stock</h1>
          <p>Add a new VPS, Linux server, or proxy to inventory.</p>
        </div>
      </header>

      <section className="admin-stock__form-panel admin-stock__form-panel--full glass">
        <AdminStockForm
          onSaved={() => router.push("/rockyelfadmin/stock")}
          onCancel={() => router.push("/rockyelfadmin/stock")}
        />
      </section>
    </>
  );
}
