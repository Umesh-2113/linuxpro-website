"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchUsers, getUsers } from "@/lib/users";
import type { WalletAccountSummary, WalletTransaction } from "@/lib/db/wallet";

type WalletOverview = {
  accounts: WalletAccountSummary[];
  transactions: WalletTransaction[];
  totalBalance: number;
  accountCount: number;
};

function formatAmount(amount: number): string {
  return `₹${amount.toLocaleString("en-IN")}`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function AdminWalletPanel() {
  const [overview, setOverview] = useState<WalletOverview>({
    accounts: [],
    transactions: [],
    totalBalance: 0,
    accountCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [filterEmail, setFilterEmail] = useState("");

  const [email, setEmail] = useState("");
  const [adjustType, setAdjustType] = useState<"credit" | "debit">("credit");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      await fetchUsers();
      const res = await fetch("/api/admin/wallet", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load wallets.");
      setOverview(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load wallets.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const users = getUsers();
  const filteredTransactions = useMemo(() => {
    if (!filterEmail.trim()) return overview.transactions;
    const q = filterEmail.trim().toLowerCase();
    return overview.transactions.filter((tx) => tx.userEmail.includes(q));
  }, [overview.transactions, filterEmail]);

  const handleAdjust = async () => {
    setError("");
    setSuccess("");
    const value = Number(amount);
    if (!email.trim()) {
      setError("Select or enter a user email.");
      return;
    }
    if (!Number.isFinite(value) || value < 1) {
      setError("Enter a valid amount (min ₹1).");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/admin/wallet/adjust", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          type: adjustType,
          amount: Math.round(value),
          note: note.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Adjustment failed.");

      setSuccess(
        `${adjustType === "credit" ? "Credited" : "Debited"} ${formatAmount(Math.round(value))} for ${email}. New balance: ${formatAmount(data.balance)}.`
      );
      setAmount("");
      setNote("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Adjustment failed.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <header className="admin-topbar">
        <div>
          <h1>User Wallets</h1>
          <p>View balances, add or deduct money, and track all wallet transactions.</p>
        </div>
        <button type="button" className="btn btn--outline btn--sm" onClick={() => void load()}>
          Refresh
        </button>
      </header>

      <div className="admin-stats-grid admin-stats-grid--3">
        <div className="admin-stat-card glass admin-stat-card--primary">
          <span className="admin-stat-card__label">Total Wallet Balance</span>
          <span className="admin-stat-card__value">
            {loading ? "…" : formatAmount(overview.totalBalance)}
          </span>
        </div>
        <div className="admin-stat-card glass">
          <span className="admin-stat-card__label">Active Wallets</span>
          <span className="admin-stat-card__value">
            {loading ? "…" : overview.accountCount}
          </span>
        </div>
        <div className="admin-stat-card glass">
          <span className="admin-stat-card__label">Recent Transactions</span>
          <span className="admin-stat-card__value">
            {loading ? "…" : overview.transactions.length}
          </span>
        </div>
      </div>

      <div className="admin-wallet-layout">
        <section className="admin-panel glass admin-wallet-adjust">
          <h2>Adjust Wallet Balance</h2>
          <p className="admin-wallet-adjust__hint">
            Manually credit (add) or debit (remove) money from a customer wallet.
          </p>

          <div className="auth-form__field">
            <label htmlFor="admin-wallet-email">Customer email</label>
            <input
              id="admin-wallet-email"
              list="admin-wallet-users"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@example.com"
            />
            <datalist id="admin-wallet-users">
              {users.map((user) => (
                <option key={user.email} value={user.email}>
                  {user.name}
                </option>
              ))}
            </datalist>
          </div>

          <div className="admin-wallet-adjust__type">
            <button
              type="button"
              className={`btn btn--sm${adjustType === "credit" ? " btn--primary" : " btn--ghost"}`}
              onClick={() => setAdjustType("credit")}
            >
              + Add Money (Credit)
            </button>
            <button
              type="button"
              className={`btn btn--sm${adjustType === "debit" ? " btn--primary" : " btn--ghost"}`}
              onClick={() => setAdjustType("debit")}
            >
              − Deduct Money (Debit)
            </button>
          </div>

          <div className="auth-form__field">
            <label htmlFor="admin-wallet-amount">Amount (₹)</label>
            <input
              id="admin-wallet-amount"
              type="number"
              min={1}
              max={500000}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="e.g. 500"
            />
          </div>

          <div className="auth-form__field">
            <label htmlFor="admin-wallet-note">Note (optional)</label>
            <input
              id="admin-wallet-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Reason for adjustment"
              maxLength={120}
            />
          </div>

          {error && <div className="auth-form__error">{error}</div>}
          {success && <div className="auth-form__success">{success}</div>}

          <button
            type="button"
            className="btn btn--primary"
            onClick={() => void handleAdjust()}
            disabled={saving}
          >
            {saving ? "Saving…" : adjustType === "credit" ? "Add to Wallet" : "Deduct from Wallet"}
          </button>
        </section>

        <section className="admin-panel glass">
          <div className="admin-panel__header">
            <h2>All Wallet Balances</h2>
          </div>
          {overview.accounts.length === 0 ? (
            <p className="stock-empty-text">No wallet accounts yet. They appear when users add money or you credit manually.</p>
          ) : (
            <div className="client-table-wrap">
              <table className="client-table">
                <thead>
                  <tr>
                    <th>Email</th>
                    <th>Balance</th>
                    <th>Last Updated</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {overview.accounts.map((account) => (
                    <tr key={account.email}>
                      <td>{account.email}</td>
                      <td><strong>{formatAmount(account.balance)}</strong></td>
                      <td>{formatDate(account.updatedAt)}</td>
                      <td>
                        <button
                          type="button"
                          className="btn btn--ghost btn--sm"
                          onClick={() => {
                            setEmail(account.email);
                            setFilterEmail(account.email);
                          }}
                        >
                          Manage
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      <section className="admin-panel glass">
        <div className="admin-panel__header">
          <h2>Transaction History</h2>
          <input
            className="admin-wallet-filter"
            value={filterEmail}
            onChange={(e) => setFilterEmail(e.target.value)}
            placeholder="Filter by email…"
          />
        </div>
        {filteredTransactions.length === 0 ? (
          <p className="stock-empty-text">No transactions yet.</p>
        ) : (
          <div className="client-table-wrap">
            <table className="client-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Email</th>
                  <th>Type</th>
                  <th>Amount</th>
                  <th>Balance After</th>
                  <th>Description</th>
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.map((tx) => (
                  <tr key={tx.id}>
                    <td>{formatDate(tx.createdAt)}</td>
                    <td>{tx.userEmail}</td>
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
                        {formatAmount(tx.amount)}
                      </strong>
                    </td>
                    <td>{formatAmount(tx.balanceAfter)}</td>
                    <td>{tx.description}</td>
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
