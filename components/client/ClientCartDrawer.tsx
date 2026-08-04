"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { BuyStockModal } from "@/components/stock/BuyStockModal";
import {
  clearCart,
  getCartIds,
  removeFromCart,
} from "@/lib/client-cart";
import {
  fetchStock,
  formatStockPrice,
  getRamPlans,
  getStock,
  stockTypeLabels,
  type StockItem,
} from "@/lib/stock";

type Props = {
  open: boolean;
  onClose: () => void;
};

export function ClientCartDrawer({ open, onClose }: Props) {
  const [cartIds, setCartIds] = useState<string[]>([]);
  const [buyItem, setBuyItem] = useState<StockItem | null>(null);

  const refresh = useCallback(async () => {
    await fetchStock();
    setCartIds(getCartIds());
  }, []);

  useEffect(() => {
    if (!open) return;
    void refresh();
    window.addEventListener("cart-updated", refresh);
    window.addEventListener("stock-updated", refresh);
    return () => {
      window.removeEventListener("cart-updated", refresh);
      window.removeEventListener("stock-updated", refresh);
    };
  }, [open, refresh]);

  const items = useMemo(() => {
    const stock = getStock();
    return cartIds
      .map((id) => stock.find((s) => s.id === id))
      .filter((item): item is StockItem => Boolean(item));
  }, [cartIds]);

  if (!open) return null;

  return (
    <>
      <div className="ocean-cart-backdrop" onClick={onClose} aria-hidden />
      <aside className="ocean-cart-drawer glass" aria-label="Shopping cart">
        <div className="ocean-cart-drawer__head">
          <h2>Cart</h2>
          <button type="button" className="ocean-cart-drawer__close" onClick={onClose} aria-label="Close cart">
            ✕
          </button>
        </div>

        {items.length === 0 ? (
          <div className="ocean-cart-drawer__empty">
            <p>Your cart is empty.</p>
            <Link href="/client/ip-stock" className="btn btn--primary btn--sm" onClick={onClose}>
              Browse Plans
            </Link>
          </div>
        ) : (
          <>
            <ul className="ocean-cart-drawer__list">
              {items.map((item) => {
                const plan = getRamPlans(item)[0];
                return (
                  <li key={item.id} className="ocean-cart-drawer__item">
                    <div>
                      <strong>
                        {stockTypeLabels[item.type]} · IP {item.series}
                      </strong>
                      <span>
                        {plan
                          ? `${plan.ram}GB · ${plan.vcpu}vCPU · ${formatStockPrice(item, plan.ram)}`
                          : formatStockPrice(item)}
                      </span>
                    </div>
                    <div className="ocean-cart-drawer__item-actions">
                      <button
                        type="button"
                        className="btn btn--primary btn--sm"
                        onClick={() => setBuyItem(item)}
                      >
                        Checkout
                      </button>
                      <button
                        type="button"
                        className="ocean-cart-drawer__remove"
                        onClick={() => removeFromCart(item.id)}
                        aria-label="Remove from cart"
                      >
                        Remove
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
            <div className="ocean-cart-drawer__foot">
              <button type="button" className="btn btn--outline btn--sm" onClick={() => clearCart()}>
                Clear cart
              </button>
            </div>
          </>
        )}
      </aside>

      {buyItem && (
        <BuyStockModal
          item={buyItem}
          onClose={() => setBuyItem(null)}
          onSuccess={() => {
            removeFromCart(buyItem.id);
            setBuyItem(null);
          }}
        />
      )}
    </>
  );
}
