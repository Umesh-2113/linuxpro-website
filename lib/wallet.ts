import { apiGet, apiPost } from "@/lib/api-client";
import type { WalletTransaction } from "@/lib/db/wallet";

export type WalletSummary = {
  balance: number;
  transactions: WalletTransaction[];
};

let cache: WalletSummary = { balance: 0, transactions: [] };
let fetchPromise: Promise<WalletSummary> | null = null;

function emitUpdate() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("wallet-updated"));
  }
}

export async function fetchWallet(): Promise<WalletSummary> {
  if (fetchPromise) return fetchPromise;

  fetchPromise = apiGet<WalletSummary>("/api/wallet")
    .then((data) => {
      cache = data;
      fetchPromise = null;
      emitUpdate();
      return data;
    })
    .catch((err) => {
      fetchPromise = null;
      console.error("[fetchWallet]", err);
      return cache;
    });

  return fetchPromise;
}

export function getWalletBalance(): number {
  return cache.balance;
}

export function getWalletTransactions(): WalletTransaction[] {
  return [...cache.transactions];
}

export async function payOrderWithWallet(orderId: string): Promise<void> {
  await apiPost(`/api/orders/${orderId}/wallet`, {});
  emitUpdate();
}

export async function confirmWalletTopup(
  topupId: string,
  cashfreeStatus: string
): Promise<WalletSummary> {
  const data = await apiPost<WalletSummary>("/api/wallet/topup/confirm", {
    topupId,
    cashfreeStatus,
  });
  cache = data;
  emitUpdate();
  return data;
}

export function formatWalletAmount(amount: number): string {
  return `₹${amount.toLocaleString("en-IN")}`;
}

export function formatWalletDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
