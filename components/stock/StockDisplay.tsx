"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { BuyStockModal } from "@/components/stock/BuyStockModal";
import {
  formatStockPrice,
  formatStockSpecs,
  getProductSeriesName,
  getRamPlans,
  getStock,
  fetchStock,
  getStockByType,
  getStockStatus,
  getStockStatusLabel,
  stockTypeLabels,
  type StockItem,
  type StockType,
} from "@/lib/stock";

type Filter = "all" | StockType;
type ViewMode = "grid" | "list";
type SortMode = "qty-desc" | "qty-asc" | "series";

const filterLabels: Record<Filter, string> = {
  all: "All IP Stock",
  vps: "VPS",
  linux: "Linux Servers",
  proxy: "Proxy",
};

const typeIcons: Record<StockType, string> = {
  vps: "⚡",
  linux: "🐧",
  proxy: "🔀",
};

const typeGradients: Record<StockType, string> = {
  vps: "stock-card--vps",
  linux: "stock-card--linux",
  proxy: "stock-card--proxy",
};

const regionFlags: Record<string, string> = {
  Mumbai: "🇮🇳",
  Singapore: "🇸🇬",
  Frankfurt: "🇩🇪",
  London: "🇬🇧",
  "New York": "🇺🇸",
  Tokyo: "🇯🇵",
};

type Props = {
  variant?: "public" | "client";
};

function getStockDescription(item: StockItem): string {
  if (item.type === "proxy") {
    return `Premium proxy IP series ${getProductSeriesName(item.series)} on port ${item.port} in ${item.region}. High anonymity, low latency, and ready for production workloads.`;
  }
  const plans = getRamPlans(item);
  const specs =
    plans.length > 0
      ? plans.map((p) => `${p.vcpu}c/${p.ram}GB`).join(", ")
      : formatStockSpecs(item);
  return `${stockTypeLabels[item.type]} on IP series ${getProductSeriesName(item.series)} — ${specs}, ${item.storage} GB NVMe in ${item.region}. Ships with ${item.os} pre-installed.`;
}

export function StockDisplay({ variant = "public" }: Props) {
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const [view, setView] = useState<ViewMode>("grid");
  const [sort, setSort] = useState<SortMode>("qty-desc");
  const [items, setItems] = useState<StockItem[]>([]);
  const [pulse, setPulse] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [buyItem, setBuyItem] = useState<StockItem | null>(null);
  const [orderSuccess, setOrderSuccess] = useState("");
  const isClient = variant === "client";

  const refresh = useCallback(async () => {
    await fetchStock();
    setItems(getStockByType(filter));
  }, [filter]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const onUpdate = () => {
      void refresh();
    };
    window.addEventListener("storage", onUpdate);
    window.addEventListener("stock-updated", onUpdate);
    return () => {
      window.removeEventListener("storage", onUpdate);
      window.removeEventListener("stock-updated", onUpdate);
    };
  }, [refresh]);

  useEffect(() => {
    const timer = setInterval(() => setPulse((p) => !p), 2000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    setSelectedId(null);
  }, [filter, search, sort]);

  const allStock = getStock();
  const totalAvailable = allStock.reduce((sum, i) => sum + i.quantity, 0);

  const displayed = useMemo(() => {
    const q = search.toLowerCase();
    let list = items.filter(
      (i) =>
        !q ||
        i.series.toLowerCase().includes(q) ||
        i.region.toLowerCase().includes(q) ||
        i.os.toLowerCase().includes(q) ||
        stockTypeLabels[i.type].toLowerCase().includes(q)
    );

    list = [...list].sort((a, b) => {
      if (sort === "qty-desc") return b.quantity - a.quantity;
      if (sort === "qty-asc") return a.quantity - b.quantity;
      return a.series.localeCompare(b.series);
    });

    return list;
  }, [items, search, sort]);

  const renderCard = (item: StockItem) => {
    const status = getStockStatus(item.quantity);
    const isSelected = selectedId === item.id;
    const flag = regionFlags[item.region] ?? "🌐";

    const buyHref =
      !isClient && item.quantity > 0
        ? "/register"
        : !isClient
          ? "/contact"
          : "/client/support";

    const buyLabel = isClient
      ? item.quantity > 0
        ? "Buy"
        : "Request Stock"
      : item.quantity > 0
        ? item.type === "proxy"
          ? "Order Proxy"
          : "Order Now"
        : "Request Availability";

    if (isClient && !isSelected) {
      return (
        <button
          key={item.id}
          type="button"
          className={`stock-card stock-card--compact glass ${typeGradients[item.type]}`}
          onClick={() => setSelectedId(item.id)}
          aria-expanded={false}
        >
          <div className="stock-card__compact-main">
            <h3 className="stock-card__series">
              <span className="stock-card__ip-prefix">IP</span>{" "}
              {getProductSeriesName(item.series)}
            </h3>
            <span className={`stock-card__compact-qty stock-card__compact-qty--${status}`}>
              <strong>{item.quantity}</strong> available
            </span>
          </div>
          <div className="stock-card__compact-footer">
            <span className={`stock-status stock-status--${status}`}>
              {status === "in-stock" && <span className="stock-status__dot" />}
              {getStockStatusLabel(status)}
            </span>
            <span className="stock-card__expand-hint">
              View details <span className="stock-card__expand-arrow">↓</span>
            </span>
          </div>
        </button>
      );
    }

    return (
      <article
        key={item.id}
        className={`stock-card glass ${typeGradients[item.type]}${isSelected ? " stock-card--expanded" : ""}${view === "list" && !isClient ? " stock-card--list" : ""}`}
      >
        <div className="stock-card__glow" aria-hidden />

        {isClient && isSelected && (
          <button
            type="button"
            className="stock-card__collapse-btn"
            onClick={() => setSelectedId(null)}
            aria-label="Close details"
          >
            ✕
          </button>
        )}

        <div className="stock-card__header">
          <div className="stock-card__identity">
            <span className={`stock-card__type stock-card__type--${item.type}`}>
              {typeIcons[item.type]} {stockTypeLabels[item.type]}
            </span>
            <h3 className="stock-card__series">
              <span className="stock-card__ip-prefix">IP</span>{" "}
              {getProductSeriesName(item.series)}
            </h3>
          </div>
          <span className={`stock-status stock-status--${status}`}>
            {status === "in-stock" && <span className="stock-status__dot" />}
            {getStockStatusLabel(status)}
          </span>
        </div>

        <div className={`stock-card__qty stock-card__qty--${status}`}>
          <span className="stock-card__qty-num">{item.quantity}</span>
          <span className="stock-card__qty-label">units available</span>
          {isClient && isSelected && (
            <span className="stock-card__price-tag">
              {formatStockPrice(item)} <small>per unit</small>
            </span>
          )}
          {item.quantity > 0 && item.quantity <= 3 && (
            <span className="stock-card__qty-warn">Almost gone!</span>
          )}
        </div>

        {(isClient && isSelected) || !isClient ? (
          <>
            {isClient && (
              <p className="stock-card__description">{getStockDescription(item)}</p>
            )}

            <ul className="stock-card__specs">
              {isClient && (
                <li>
                  <span>Price</span>
                  <strong>{formatStockPrice(item)} / unit</strong>
                </li>
              )}
              {item.type === "proxy" ? (
                <>
                  <li>
                    <span>Port</span>
                    <strong className="stock-card__port">{item.port}</strong>
                  </li>
                  <li>
                    <span>IP Series</span>
                    <strong>{getProductSeriesName(item.series)}</strong>
                  </li>
                  <li>
                    <span>Region</span>
                    <strong>{flag} {item.region}</strong>
                  </li>
                  <li>
                    <span>Type</span>
                    <strong>HTTP/S Proxy</strong>
                  </li>
                </>
              ) : (
                <>
                  {getRamPlans(item).length > 1 ? (
                    <li className="stock-card__plans-li">
                      <span>Plans</span>
                      <div className="stock-card__plans">
                        {getRamPlans(item).map((p) => (
                          <span key={p.ram} className="stock-card__plan-chip">
                            {p.ram}GB · {p.vcpu}c · ₹{p.price.toLocaleString("en-IN")}
                          </span>
                        ))}
                      </div>
                    </li>
                  ) : (
                    <>
                      <li>
                        <span>vCPU</span>
                        <strong>{getRamPlans(item)[0]?.vcpu ?? item.vcpu} cores</strong>
                      </li>
                      <li>
                        <span>RAM</span>
                        <strong>{getRamPlans(item)[0]?.ram ?? item.ram} GB</strong>
                      </li>
                    </>
                  )}
                  <li>
                    <span>Storage</span>
                    <strong>{item.storage} GB NVMe</strong>
                  </li>
                  <li>
                    <span>Region</span>
                    <strong>{flag} {item.region}</strong>
                  </li>
                  <li>
                    <span>OS</span>
                    <strong>{item.os}</strong>
                  </li>
                </>
              )}
            </ul>

            {isClient && item.quantity > 0 ? (
              <button
                type="button"
                className="btn btn--primary btn--block stock-card__cta"
                onClick={() => setBuyItem(item)}
              >
                {buyLabel}
                <span className="stock-card__cta-arrow">→</span>
              </button>
            ) : (
              <Link
                href={buyHref}
                className={`btn btn--${item.quantity > 0 ? "primary" : "outline"} btn--block stock-card__cta`}
              >
                {buyLabel}
                {item.quantity > 0 && <span className="stock-card__cta-arrow">→</span>}
              </Link>
            )}
          </>
        ) : null}
      </article>
    );
  };

  return (
    <div className={`stock-display${isClient ? " stock-display--client" : ""}`}>
      {isClient ? (
        <div className="stock-client-head glass">
          <div className="stock-client-head__info">
            <div className="stock-hero__badge stock-hero__badge--sm">
              <span className={`stock-hero__pulse${pulse ? " active" : ""}`} />
              Live Inventory
            </div>
            <h2 className="stock-client-head__title">
              IP Stock <span>Available</span>
            </h2>
            <p className="stock-client-head__desc">
              Click any IP series to expand details and buy.
            </p>
          </div>
          <div className="stock-chips">
            <div className="stock-chip stock-chip--total">
              <span className="stock-chip__icon">📦</span>
              <span className="stock-chip__label">Total IP</span>
              <strong>{totalAvailable}</strong>
            </div>
            {(["vps", "linux", "proxy"] as StockType[]).map((t) => {
              const typeItems = allStock.filter((i) => i.type === t);
              const qty = typeItems.reduce((s, i) => s + i.quantity, 0);
              return (
                <div key={t} className={`stock-chip stock-chip--${t}`}>
                  <span className="stock-chip__icon">{typeIcons[t]}</span>
                  <span className="stock-chip__label">{stockTypeLabels[t]}</span>
                  <strong>{qty}</strong>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="stock-summary stock-summary--4">
          <div className="stock-summary__card glass stock-summary__card--highlight">
            <span className="stock-summary__icon">📦</span>
            <span className="stock-summary__label">Total IP Stock</span>
            <span className="stock-summary__value">{totalAvailable}</span>
            <span className="stock-summary__sub">units available now</span>
          </div>
          {(["vps", "linux", "proxy"] as StockType[]).map((t) => {
            const typeItems = allStock.filter((i) => i.type === t);
            const qty = typeItems.reduce((s, i) => s + i.quantity, 0);
            return (
              <div key={t} className={`stock-summary__card glass stock-summary__card--${t}`}>
                <span className="stock-summary__icon">{typeIcons[t]}</span>
                <span className="stock-summary__label">{stockTypeLabels[t]} Series</span>
                <span className="stock-summary__value">{qty}</span>
                <span className="stock-summary__sub">
                  {typeItems.length} IP range{typeItems.length !== 1 ? "s" : ""}
                </span>
              </div>
            );
          })}
        </div>
      )}

      <div className="stock-toolbar">
        <div className="stock-filters">
          {(["all", "vps", "linux", "proxy"] as Filter[]).map((f) => (
            <button
              key={f}
              type="button"
              className={`stock-filter-btn${filter === f ? " active" : ""}`}
              onClick={() => setFilter(f)}
            >
              {f !== "all" && <span>{typeIcons[f as StockType]}</span>}
              {filterLabels[f]}
            </button>
          ))}
        </div>

        <div className="stock-toolbar__right">
          <input
            type="search"
            className="stock-search"
            placeholder="Search series, region, OS..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            className="stock-sort"
            value={sort}
            onChange={(e) => setSort(e.target.value as SortMode)}
            aria-label="Sort stock"
          >
            <option value="qty-desc">Most available</option>
            <option value="qty-asc">Least available</option>
            <option value="series">By IP series</option>
          </select>
          {!isClient && (
            <div className="stock-view-toggle">
              <button
                type="button"
                className={view === "grid" ? "active" : ""}
                onClick={() => setView("grid")}
                aria-label="Grid view"
              >
                ⊞
              </button>
              <button
                type="button"
                className={view === "list" ? "active" : ""}
                onClick={() => setView("list")}
                aria-label="List view"
              >
                ☰
              </button>
            </div>
          )}
        </div>
      </div>

      {orderSuccess && (
        <div className="ticket-toast ticket-toast--success">
          {orderSuccess}{" "}
          <Link href="/client/orders" style={{ textDecoration: "underline" }}>
            Manage Orders
          </Link>
        </div>
      )}

      {displayed.length === 0 ? (
        <div className="stock-empty glass stock-empty--cool">
          <div className="stock-empty__icon">🔍</div>
          <h3>No IP stock found</h3>
          <p>
            {search
              ? "Try a different search term or clear filters."
              : "No servers are available right now. Check back soon."}
          </p>
          {search && (
            <button
              type="button"
              className="btn btn--outline btn--sm"
              onClick={() => {
                setSearch("");
                setFilter("all");
              }}
            >
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <div
          className={`stock-grid${isClient ? " stock-grid--client" : ""}${view === "list" && !isClient ? " stock-grid--list" : ""}`}
        >
          {displayed.map(renderCard)}
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
                ? `Order ${orderId} placed successfully! Payment received from your wallet. Check My Servers for IP and password.`
                : `Order ${orderId} created — complete payment on Cashfree.`
            );
            refresh();
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
        />
      )}
    </div>
  );
}
