"use client";

import { useCallback, useEffect, useState } from "react";
import { getUser } from "@/lib/auth";
import { startCashfreeCheckout } from "@/lib/cashfree-client";
import {
  fetchWallet,
  formatWalletAmount,
  formatWalletDate,
  getWalletBalance,
  getWalletTransactions,
} from "@/lib/wallet";

function sanitizeCustomerId(email: string): string {
  return email.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 50) || "linuxpro_user";
}

const QUICK_AMOUNTS = [500, 1000, 2000, 5000];

export function WalletPanel() {
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState(getWalletTransactions());
  const [amount, setAmount] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(true);
  const [topupLoading, setTopupLoading] = useState(false);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    const data = await fetchWallet();
    setBalance(data.balance);
    setTransactions(data.transactions);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
    const onUpdate = () => {
      setBalance(getWalletBalance());
      setTransactions(getWalletTransactions());
    };
    window.addEventListener("wallet-updated", onUpdate);
    return () => window.removeEventListener("wallet-updated", onUpdate);
  }, [refresh]);

  const handleTopup = async () => {
    setError("");
    const user = getUser();
    if (!user) {
      setError("Please log in to add money.");
      return;
    }

    const value = Number(amount);
    if (!Number.isFinite(value) || value < 100) {
      setError("Minimum top-up is ₹100.");
      return;
    }

    const phoneDigits = phone.replace(/\D/g, "");
    if (phoneDigits.length < 10) {
      setError("Enter a valid 10-digit phone number.");
      return;
    }

    setTopupLoading(true);

    try {
      const res = await fetch("/api/wallet/topup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: Math.round(value),
          customer_phone: phoneDigits,
          customer_name: user.name,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success || !data.payment_session_id) {
        setError(data.error || data.message || "Could not start payment.");
        setTopupLoading(false);
        return;
      }

      await startCashfreeCheckout(data.payment_session_id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Payment gateway error.");
      setTopupLoading(false);
    }
  };

  return (
    <>
      <div className="client-billing-summary">
        <div className="client-stat-card glass wallet-balance-card">
          <span className="client-stat-card__label">My Wallet Balance</span>
          <span className="client-stat-card__value">
            {loading ? "…" : formatWalletAmount(balance)}
          </span>
          <span className="wallet-balance-card__hint">
            Use wallet balance to pay for IP stock orders instantly.
          </span>
        </div>

        <div className="client-stat-card glass wallet-topup-card">
          <span className="client-stat-card__label">Add Money</span>
          <div className="wallet-topup-card__quick">
            {QUICK_AMOUNTS.map((q) => (
              <button
                key={q}
                type="button"
                className={`btn btn--ghost btn--sm${
                  Number(amount) === q ? " wallet-topup-card__quick--active" : ""
                }`}
                onClick={() => setAmount(String(q))}
              >
                ₹{q.toLocaleString("en-IN")}
              </button>
            ))}
          </div>
          <div className="wallet-topup-card__fields">
            <input
              type="number"
              min={100}
              max={100000}
              step={1}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Amount (min ₹100)"
            />
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Phone for Cashfree"
              maxLength={15}
            />
          </div>
          {process.env.NEXT_PUBLIC_CASHFREE_MODE !== "production" && (
            <small className="wallet-topup-card__sandbox">
              Sandbox mode — use test card 4111 1111 1111 1111
            </small>
          )}
          {error && <div className="auth-form__error">{error}</div>}
          <button
            type="button"
            className="btn btn--primary btn--sm"
            onClick={handleTopup}
            disabled={topupLoading}
          >
            {topupLoading ? "Redirecting…" : "Add via Cashfree"}
          </button>
        </div>
      </div>

      <section className="client-panel glass">
        <div className="client-panel__header">
          <h2>Transaction History</h2>
        </div>
        {transactions.length === 0 ? (
          <p className="wallet-empty">No wallet transactions yet. Add money to get started.</p>
        ) : (
          <div className="client-table-wrap">
            <table className="client-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Description</th>
                  <th>Type</th>
                  <th>Amount</th>
                  <th>Balance</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx) => (
                  <tr key={tx.id}>
                    <td>{formatWalletDate(tx.createdAt)}</td>
                    <td>{tx.description}</td>
                    <td>
                      <span
                        className={`status-badge status-badge--${
                          tx.type === "credit" ? "paid" : "due"
                        }`}
                      >
                        {tx.type === "credit" ? "Credit" : "Debit"}
                      </span>
                    </td>
                    <td>
                      <strong className={tx.type === "credit" ? "wallet-tx--credit" : "wallet-tx--debit"}>
                        {tx.type === "credit" ? "+" : "−"}
                        {formatWalletAmount(tx.amount)}
                      </strong>
                    </td>
                    <td>{formatWalletAmount(tx.balanceAfter)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
