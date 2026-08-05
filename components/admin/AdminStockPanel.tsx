"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  deleteStockItem,
  fetchStock,
  formatPromoBadge,
  formatStockSpecs,
  getPlanPromos,
  getRamPlans,
  getStock,
  getStockStatus,
  getStockStatusLabel,
  stockProviderLabels,
  stockTypeLabels,
  type StockItem,
} from "@/lib/stock";

function StockRamPriceCell({ item }: { item: StockItem }) {
  if (item.type === "proxy") {
    return (
      <span className="admin-stock-ram-cell__single">
        ₹{item.price.toLocaleString("en-IN")}/unit
      </span>
    );
  }

  const plans = getRamPlans(item);
  if (plans.length === 0) {
    return <span className="admin-stock-ram-cell__single">—</span>;
  }

  if (plans.length === 1) {
    const p = plans[0];
    const promos = getPlanPromos(p);
    return (
      <div className="admin-stock-ram-cell admin-stock-ram-cell--single">
        <div className="admin-stock-ram-cell__tier-head">
          <strong>
            {p.ram} GB · {p.vcpu}c
          </strong>
          <span>₹{p.price.toLocaleString("en-IN")}/mo</span>
        </div>
        {promos.length > 0 && (
          <div className="admin-stock-ram-cell__promo-list">
            {promos.map((promo) => (
              <span key={promo.code} className="admin-stock-ram-cell__promo">
                {formatPromoBadge(promo)}
              </span>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="admin-stock-ram-cell">
      {plans.map((plan) => {
        const promos = getPlanPromos(plan);
        return (
          <div key={plan.ram} className="admin-stock-ram-cell__tier">
            <div className="admin-stock-ram-cell__tier-head">
              <strong>
                {plan.ram} GB · {plan.vcpu}c
              </strong>
              <span>₹{plan.price.toLocaleString("en-IN")}/mo</span>
            </div>
            {promos.length > 0 && (
              <div className="admin-stock-ram-cell__promo-list">
                {promos.map((promo) => (
                  <span key={promo.code} className="admin-stock-ram-cell__promo">
                    {formatPromoBadge(promo)}
                  </span>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function AdminStockPanel() {
  const [items, setItems] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  const loadItems = async () => {
    await fetchStock();
    setItems(getStock());
    setLoading(false);
  };

  useEffect(() => {
    void loadItems();
    const onUpdate = () => void loadItems();
    window.addEventListener("stock-updated", onUpdate);
    return () => window.removeEventListener("stock-updated", onUpdate);
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this stock item? It will not be auto-recreated by HostHeaven sync.")) {
      return;
    }
    try {
      await deleteStockItem(id);
      await loadItems();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to delete stock item.";
      alert(
        message.toLowerCase().includes("unauthorized")
          ? "Admin session expired. Please log in again from Admin Login."
          : message
      );
    }
  };

  const filtered = query.trim()
    ? items.filter((i) => {
        const q = query.toLowerCase();
        return (
          i.series.toLowerCase().includes(q) ||
          i.region.toLowerCase().includes(q) ||
          i.os.toLowerCase().includes(q) ||
          stockTypeLabels[i.type].toLowerCase().includes(q)
        );
      })
    : items;

  return (
    <>
      <header className="admin-topbar admin-topbar--actions">
        <div>
          <h1>IP Stock Management</h1>
          <p>Add, edit, and manage VPS, Linux &amp; Proxy inventory.</p>
        </div>
        <div className="admin-topbar__actions">
          <input
            type="search"
            className="admin-topbar__search"
            placeholder="Search by series, region, OS…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search stock"
          />
          <Link href="/rockyelfadmin/stock/new" className="btn btn--primary">
            + Add New Stock
          </Link>
        </div>
      </header>

      <section className="admin-stock__list-panel glass">
        <div className="admin-stock__list-head">
          <h2>Current Inventory ({filtered.length})</h2>
        </div>

        {loading ? (
          <p className="stock-empty-text">Loading inventory…</p>
        ) : filtered.length === 0 ? (
          <div className="stock-empty">
            <p className="stock-empty-text">
              {items.length === 0
                ? "No items in stock. Add your first server using the button above."
                : "No items match your search."}
            </p>
            {items.length === 0 && (
              <Link href="/rockyelfadmin/stock/new" className="btn btn--primary">
                + Add Your First Stock
              </Link>
            )}
          </div>
        ) : (
          <>
            <div className="admin-stock-table-wrap">
              <table className="client-table admin-stock-table">
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Series</th>
                    <th>Provider</th>
                    <th>Specs</th>
                    <th>Plan / Price</th>
                    <th>Qty</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((item) => {
                    const status = getStockStatus(item.quantity);
                    return (
                      <tr key={item.id}>
                        <td>
                          <span className={`stock-card__type stock-card__type--${item.type}`}>
                            {stockTypeLabels[item.type]}
                          </span>
                        </td>
                        <td>
                          <strong>{item.series}</strong>
                          <br />
                          <small>
                            {item.region}
                            {item.type === "proxy" ? ` · Port ${item.port}` : ` · ${item.os}`}
                          </small>
                        </td>
                        <td>
                          <span className="admin-stock-provider">
                            {stockProviderLabels[item.provider ?? "manual"]}
                          </span>
                          {item.provider === "hostheaven" && item.providerVmId ? (
                            <>
                              <br />
                              <small>VM #{item.providerVmId}</small>
                            </>
                          ) : item.provider === "hostheaven" ? (
                            <>
                              <br />
                              <small>Auto by IP</small>
                            </>
                          ) : null}
                        </td>
                        <td>{formatStockSpecs(item)}</td>
                        <td>
                          <StockRamPriceCell item={item} />
                        </td>
                        <td>{item.quantity}</td>
                        <td>
                          <span className={`stock-status stock-status--${status}`}>
                            {getStockStatusLabel(status)}
                          </span>
                        </td>
                        <td>
                          <div className="admin-row-actions">
                            <Link
                              href={`/rockyelfadmin/stock/${item.id}/edit`}
                              className="btn btn--sm btn--outline"
                            >
                              Edit
                            </Link>
                            <button
                              type="button"
                              className="btn btn--ghost btn--sm admin-delete-btn"
                              onClick={() => handleDelete(item.id)}
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <ul className="admin-stock-cards" aria-label="Stock inventory mobile view">
              {filtered.map((item) => {
                const status = getStockStatus(item.quantity);
                return (
                  <li key={item.id} className="admin-stock-card">
                    <div className="admin-stock-card__head">
                      <span className={`stock-card__type stock-card__type--${item.type}`}>
                        {stockTypeLabels[item.type]}
                      </span>
                      <span className={`stock-status stock-status--${status}`}>
                        {getStockStatusLabel(status)}
                      </span>
                    </div>
                    <div className="admin-stock-card__title">
                      <strong>{item.series}</strong>
                      <small>
                        {item.region}
                        {item.type === "proxy" ? ` · Port ${item.port}` : ` · ${item.os}`}
                      </small>
                    </div>
                    <dl className="admin-stock-card__meta">
                      <div>
                        <dt>Provider</dt>
                        <dd>
                          {stockProviderLabels[item.provider ?? "manual"]}
                          {item.provider === "hostheaven" && item.providerVmId
                            ? ` · VM #${item.providerVmId}`
                            : item.provider === "hostheaven"
                              ? " · Auto by IP"
                              : ""}
                        </dd>
                      </div>
                      <div>
                        <dt>Specs</dt>
                        <dd>{formatStockSpecs(item)}</dd>
                      </div>
                      <div>
                        <dt>Qty</dt>
                        <dd>{item.quantity}</dd>
                      </div>
                      <div className="admin-stock-card__meta-full">
                        <dt>Plan / Price</dt>
                        <dd>
                          <StockRamPriceCell item={item} />
                        </dd>
                      </div>
                    </dl>
                    <div className="admin-stock-card__actions">
                      <Link
                        href={`/rockyelfadmin/stock/${item.id}/edit`}
                        className="btn btn--sm btn--outline"
                      >
                        Edit
                      </Link>
                      <button
                        type="button"
                        className="btn btn--ghost btn--sm admin-delete-btn"
                        onClick={() => handleDelete(item.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </section>
    </>
  );
}
