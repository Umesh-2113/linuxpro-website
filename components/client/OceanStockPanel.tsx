"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { BuyStockModal } from "@/components/stock/BuyStockModal";
import { addToCart, isInCart } from "@/lib/client-cart";
import type { OceanStockCategory } from "@/lib/client-ocean-data";
import { oceanStockCategories } from "@/lib/client-ocean-data";
import {
  formatStockPrice,
  fetchStock,
  getPlanPromos,
  getProductSeriesName,
  getRamPlans,
  getStock,
  getStockByType,
  getStockStatus,
  getStockStatusLabel,
  stockTypeLabels,
  type StockItem,
} from "@/lib/stock";

type Props = {
  category: OceanStockCategory;
};

function planTitle(item: StockItem): string {
  if (item.type === "proxy") return "Premium Proxy";
  if (item.os && item.os !== "N/A") return item.os;
  return stockTypeLabels[item.type];
}

function hasPromo(item: StockItem): boolean {
  const plans = getRamPlans(item);
  return plans.some((p) => getPlanPromos(p).length > 0);
}

function primaryPlan(item: StockItem) {
  const plans = getRamPlans(item);
  return plans[0] ?? { ram: item.ram, vcpu: item.vcpu, price: item.price };
}

export function OceanStockPanel({ category }: Props) {
  const meta = oceanStockCategories[category];
  const [search, setSearch] = useState("");
  const [items, setItems] = useState<StockItem[]>([]);
  const [buyItem, setBuyItem] = useState<StockItem | null>(null);
  const [orderSuccess, setOrderSuccess] = useState("");
  const [cartVersion, setCartVersion] = useState(0);

  const refresh = useCallback(async () => {
    await fetchStock();
    if (category === "all") {
      setItems(getStock());
    } else {
      setItems(getStockByType(category));
    }
  }, [category]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const onUpdate = () => void refresh();
    window.addEventListener("stock-updated", onUpdate);
    window.addEventListener("cart-updated", () => setCartVersion((v) => v + 1));
    return () => window.removeEventListener("stock-updated", onUpdate);
  }, [refresh]);

  const displayed = useMemo(() => {
    const q = search.toLowerCase().trim();
    let list = [...items];
    if (q) {
      list = list.filter(
        (i) =>
          i.series.toLowerCase().includes(q) ||
          getProductSeriesName(i.series).toLowerCase().includes(q) ||
          i.region.toLowerCase().includes(q) ||
          i.os.toLowerCase().includes(q) ||
          stockTypeLabels[i.type].toLowerCase().includes(q)
      );
    }
    return list.sort((a, b) => b.quantity - a.quantity);
  }, [items, search]);

  const handleAddToCart = (item: StockItem) => {
    if (item.quantity <= 0) return;
    addToCart(item.id);
    setCartVersion((v) => v + 1);
  };

  return (
    <div className="ocean-stock">
      <header className="ocean-stock__head">
        <div>
          <p className="ocean-stock__eyebrow">LinuxPro · {meta.title}</p>
          <h1 className="ocean-stock__title">{meta.heading}</h1>
          <p className="ocean-stock__desc">{meta.description}</p>
        </div>
        <label className="ocean-stock__search-wrap">
          <span className="sr-only">Search plans</span>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
          <input
            type="search"
            className="ocean-stock__search"
            placeholder="Search plans..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
      </header>

      {orderSuccess && (
        <div className="ocean-toast ocean-toast--success">
          {orderSuccess}{" "}
          <Link href="/client/orders">Manage Orders</Link>
        </div>
      )}

      {displayed.length === 0 ? (
        <div className="ocean-stock__empty">
          <h3>No plans found</h3>
          <p>
            {search
              ? "Try a different search term."
              : "No stock in this category right now. Check back soon."}
          </p>
          {search && (
            <button type="button" className="btn btn--outline btn--sm" onClick={() => setSearch("")}>
              Clear search
            </button>
          )}
        </div>
      ) : (
        <div className="ocean-plan-list">
          <div className="ocean-plan-list__legend" aria-hidden>
            <span>Plan</span>
            <span>Specs</span>
            <span>Price</span>
            <span />
          </div>

          {displayed.map((item) => {
            const status = getStockStatus(item.quantity);
            const outOfStock = status === "out-of-stock";
            const plan = primaryPlan(item);
            const inCart = isInCart(item.id);
            const seriesLabel = getProductSeriesName(item.series);
            void cartVersion;

            return (
              <article
                key={item.id}
                className={`ocean-plan-row ocean-plan-row--${item.type}${outOfStock ? " ocean-plan-row--sold-out" : ""}`}
              >
                <div className="ocean-plan-row__main">
                  <div className="ocean-plan-row__tags">
                    <span className={`ocean-plan-row__type ocean-plan-row__type--${item.type}`}>
                      {stockTypeLabels[item.type]}
                    </span>
                    {hasPromo(item) && !outOfStock && (
                      <span className="ocean-badge ocean-badge--promo">Promo</span>
                    )}
                    <span className={`ocean-badge ocean-badge--${status}`}>
                      {getStockStatusLabel(status)}
                    </span>
                  </div>
                  <h3 className="ocean-plan-row__title">{planTitle(item)}</h3>
                  <p className="ocean-plan-row__series">
                    {seriesLabel}
                    {item.region ? ` · ${item.region}` : ""}
                    {item.quantity > 0 ? ` · ${item.quantity} ready` : ""}
                  </p>
                </div>

                <div className="ocean-plan-row__specs">
                  {item.type === "proxy" ? (
                    <>
                      <span>
                        <strong>{item.port || "—"}</strong> port
                      </span>
                      <span>
                        <strong>{item.region}</strong>
                      </span>
                    </>
                  ) : (
                    <>
                      <span>
                        <strong>{plan.ram}GB</strong> RAM
                      </span>
                      <span>
                        <strong>{plan.vcpu}</strong> vCPU
                      </span>
                      <span>
                        <strong>{item.storage}GB</strong> SSD
                      </span>
                    </>
                  )}
                </div>

                <div className="ocean-plan-row__price">
                  <strong>{formatStockPrice(item)}</strong>
                  <span>per unit</span>
                </div>

                <div className="ocean-plan-row__actions">
                  {!outOfStock ? (
                    <>
                      <button
                        type="button"
                        className={`btn btn--ghost ocean-plan-row__cart${inCart ? " is-added" : ""}`}
                        onClick={() => handleAddToCart(item)}
                        disabled={inCart}
                      >
                        {inCart ? "Added" : "Cart"}
                      </button>
                      <button
                        type="button"
                        className="btn btn--primary"
                        onClick={() => setBuyItem(item)}
                      >
                        Buy
                      </button>
                    </>
                  ) : (
                    <Link href="/client/support" className="btn btn--outline">
                      Request
                    </Link>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {buyItem && (
        <BuyStockModal
          item={buyItem}
          onClose={() => setBuyItem(null)}
          onSuccess={(orderId, paymentMethod) => {
            setBuyItem(null);
            setOrderSuccess(
              paymentMethod === "wallet"
                ? `Order ${orderId} placed — paid from wallet. Check My Servers for IP and password.`
                : `Order ${orderId} created — complete payment on Cashfree.`
            );
            void refresh();
          }}
        />
      )}
    </div>
  );
}
