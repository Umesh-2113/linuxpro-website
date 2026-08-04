"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { fetchWallet, formatWalletAmount, getWalletBalance } from "@/lib/wallet";
import { getCartCount } from "@/lib/client-cart";

type Props = {
  onCartOpen: () => void;
};

export function ClientTopBar({ onCartOpen }: Props) {
  const [balance, setBalance] = useState(0);
  const [cartCount, setCartCount] = useState(0);

  const refresh = useCallback(() => {
    setBalance(getWalletBalance());
    setCartCount(getCartCount());
  }, []);

  useEffect(() => {
    void fetchWallet().then((data) => setBalance(data.balance));
    refresh();
    window.addEventListener("wallet-updated", refresh);
    window.addEventListener("cart-updated", refresh);
    return () => {
      window.removeEventListener("wallet-updated", refresh);
      window.removeEventListener("cart-updated", refresh);
    };
  }, [refresh]);

  return (
    <header className="ocean-topbar">
      <div className="ocean-topbar__spacer" />
      <div className="ocean-topbar__actions">
        <Link href="/client/wallet" className="ocean-topbar__wallet">
          <span className="ocean-topbar__wallet-label">Wallet</span>
          <strong>{formatWalletAmount(balance)}</strong>
        </Link>
        <button
          type="button"
          className="ocean-topbar__cart"
          onClick={onCartOpen}
          aria-label={`Open cart${cartCount ? `, ${cartCount} items` : ""}`}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <circle cx="9" cy="21" r="1" />
            <circle cx="20" cy="21" r="1" />
            <path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6" />
          </svg>
          Cart
          {cartCount > 0 && <span className="ocean-topbar__cart-badge">{cartCount}</span>}
        </button>
      </div>
    </header>
  );
}
