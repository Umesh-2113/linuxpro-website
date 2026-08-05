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
      <div className="ocean-stock__head">
        <div className="ocean-stock__intro">
          <p className="ocean-stock__eyebrow">{meta.title}</p>
          <h1 className="ocean-stock__title">{meta.heading}</h1>
          <p className="ocean-stock__desc">{meta.description}</p>
        </div>
        <div className="ocean-stock__search-wrap">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
          <input
            type="search"
            className="ocean-stock__search"
            placeholder="Search OS, region, IP series..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

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
        <div className="ocean-stock__grid">
          {displayed.map((item, index) => {
            const status = getStockStatus(item.quantity);
            const outOfStock = status === "out-of-stock";
            const plan = primaryPlan(item);
            const inCart = isInCart(item.id);
            const seriesLabel = getProductSeriesName(item.series);
            void cartVersion;

            return (
              <article
                key={item.id}
                className={`ocean-plan-card ocean-plan-card--${item.type}${outOfStock ? " ocean-plan-card--sold-out" : ""}`}
                style={{ animationDelay: `${Math.min(index, 8) * 45}ms` }}
              >
                <div className="ocean-plan-card__rail" aria-hidden />
                <div className="ocean-plan-card__mesh" aria-hidden />

                <div className="ocean-plan-card__meta">
                  <span className={`ocean-plan-card__type ocean-plan-card__type--${item.type}`}>
                    {stockTypeLabels[item.type]}
                  </span>
                  <div className="ocean-plan-card__badges">
                    {hasPromo(item) && !outOfStock && (
                      <span className="ocean-badge ocean-badge--promo">Promo</span>
                    )}
                    <span className={`ocean-badge ocean-badge--${status}`}>
                      {getStockStatusLabel(status)}
                    </span>
                  </div>
                </div>

                <h3 className="ocean-plan-card__title">{planTitle(item)}</h3>
                <p className="ocean-plan-card__series">{seriesLabel}</p>

                {item.type === "proxy" ? (
                  <dl className="ocean-plan-card__specs">
                    <div>
                      <dt>Port</dt>
                      <dd>{item.port || "—"}</dd>
                    </div>
                    <div>
                      <dt>Region</dt>
                      <dd>{item.region}</dd>
                    </div>
                    <div>
                      <dt>Stock</dt>
                      <dd>{item.quantity}</dd>
                    </div>
                  </dl>
                ) : (
                  <dl className="ocean-plan-card__specs">
                    <div>
                      <dt>RAM</dt>
                      <dd>{plan.ram} GB</dd>
                    </div>
                    <div>
                      <dt>vCPU</dt>
                      <dd>{plan.vcpu} cores</dd>
                    </div>
                    <div>
                      <dt>SSD</dt>
                      <dd>{item.storage} GB</dd>
                    </div>
                  </dl>
                )}

                <div className="ocean-plan-card__bottom">
                  <div className="ocean-plan-card__price-block">
                    <span className="ocean-plan-card__price">{formatStockPrice(item)}</span>
                    <span className="ocean-plan-card__price-note">per unit</span>
                  </div>
                  {item.quantity > 0 ? (
                    <span className="ocean-plan-card__qty">{item.quantity} ready</span>
                  ) : (
                    <span className="ocean-plan-card__qty ocean-plan-card__qty--out">Sold out</span>
                  )}
                </div>

                <div className="ocean-plan-card__actions">
                  {!outOfStock ? (
                    <>
                      <button
                        type="button"
                        className={`btn btn--outline ocean-plan-card__cart-btn${inCart ? " is-added" : ""}`}
                        onClick={() => handleAddToCart(item)}
                        disabled={inCart}
                      >
                        {inCart ? "In Cart" : "Add to Cart"}
                      </button>
                      <button
                        type="button"
                        className="btn btn--primary"
                        onClick={() => setBuyItem(item)}
                      >
                        Buy Now
                      </button>
                    </>
                  ) : (
                    <Link href="/client/support" className="btn btn--outline btn--block">
                      Request Stock
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
