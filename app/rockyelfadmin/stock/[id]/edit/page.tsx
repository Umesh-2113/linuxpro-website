"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AdminStockForm } from "@/components/admin/AdminStockForm";
import { fetchStock, getStock, type StockItem } from "@/lib/stock";

export default function AdminStockEditPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params.id;

  const [item, setItem] = useState<StockItem | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await fetchStock();
      if (cancelled) return;
      const found = getStock().find((s) => s.id === id) ?? null;
      setItem(found);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  return (
    <>
      <header className="admin-topbar admin-topbar--actions">
        <div>
          <Link href="/rockyelfadmin/stock" className="admin-back-link">
            ← Back to inventory
          </Link>
          <h1>{item ? `Edit Stock — ${item.series}` : "Edit Stock"}</h1>
          <p>Update inventory details, plans, and promo codes.</p>
        </div>
      </header>

      <section className="admin-stock__form-panel admin-stock__form-panel--full glass">
        {loading ? (
          <p className="stock-empty-text">Loading stock…</p>
        ) : !item ? (
          <div className="stock-empty">
            <p className="stock-empty-text">Stock item not found.</p>
            <Link href="/rockyelfadmin/stock" className="btn btn--primary">
              Back to inventory
            </Link>
          </div>
        ) : (
          <AdminStockForm
            editingItem={item}
            onSaved={() => router.push("/rockyelfadmin/stock")}
            onCancel={() => router.push("/rockyelfadmin/stock")}
          />
        )}
      </section>
    </>
  );
}
