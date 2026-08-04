"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  confirmCashfreePayment,
  fetchOrders,
  getOrderById,
  getOrderTitle,
} from "@/lib/orders";
import { confirmWalletTopup, fetchWallet } from "@/lib/wallet";

function isWalletTopup(orderId: string): boolean {
  return orderId.startsWith("WALLET-");
}

export function PaymentCallbackPanel() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("order_id");
  const [status, setStatus] = useState<"loading" | "success" | "failed" | "missing">(
    "loading"
  );
  const [message, setMessage] = useState("");
  const [walletTopup, setWalletTopup] = useState(false);
  const [creditedAmount, setCreditedAmount] = useState(0);

  useEffect(() => {
    if (!orderId) {
      setStatus("missing");
      return;
    }

    async function verify() {
      try {
        const res = await fetch(
          `/api/payments/cashfree/verify?order_id=${encodeURIComponent(orderId!)}`
        );
        const data = await res.json();

        if (!data.success) {
          setStatus("failed");
          setMessage(data.message || "Payment verification failed.");
          return;
        }

        if (data.paid) {
          if (isWalletTopup(orderId!)) {
            const wallet = await confirmWalletTopup(orderId!, data.order_status);
            setWalletTopup(true);
            setCreditedAmount(Number(data.order_amount) || 0);
            await fetchWallet();
            setStatus("success");
            setMessage(
              `₹${(Number(data.order_amount) || wallet.balance).toLocaleString("en-IN")} added to your wallet. New balance: ₹${wallet.balance.toLocaleString("en-IN")}.`
            );
          } else {
            await confirmCashfreePayment(orderId!, data.order_status);
            await fetchOrders();
            setStatus("success");
            setMessage("Payment received successfully via Cashfree.");
          }
        } else {
          setStatus("failed");
          setMessage(
            `Payment not completed. Status: ${data.order_status || "UNKNOWN"}`
          );
        }
      } catch {
        setStatus("failed");
        setMessage("Could not verify payment. Please contact support.");
      }
    }

    verify();
  }, [orderId]);

  if (status === "loading") {
    return (
      <div className="payment-callback glass">
        <div className="payment-callback__icon payment-callback__icon--spin">⏳</div>
        <h2>Verifying payment...</h2>
        <p>Please wait while we confirm your Cashfree payment.</p>
      </div>
    );
  }

  if (status === "missing") {
    return (
      <div className="payment-callback glass">
        <div className="payment-callback__icon">⚠️</div>
        <h2>Invalid payment link</h2>
        <p>No order ID found in the return URL.</p>
        <Link href="/client/orders" className="btn btn--primary">
          Manage Orders
        </Link>
      </div>
    );
  }

  if (status === "success") {
    const order = !walletTopup && orderId ? getOrderById(orderId) : null;
    return (
      <div className="payment-callback glass payment-callback--success">
        <div className="payment-callback__icon">✓</div>
        <h2>{walletTopup ? "Wallet Top-up Successful" : "Payment Successful"}</h2>
        <p>{message}</p>
        {walletTopup && creditedAmount > 0 && (
          <p className="payment-callback__product">
            Added <strong>₹{creditedAmount.toLocaleString("en-IN")}</strong> to your wallet
          </p>
        )}
        {order && (
          <p className="payment-callback__product">
            IP <strong>{getOrderTitle(order)}</strong>
          </p>
        )}
        <p className="payment-callback__order">
          Reference: <strong>{orderId}</strong>
        </p>
        {!walletTopup && (
          <p className="payment-callback__hint">
            Admin will deliver your server credentials soon. Track in Manage Orders.
          </p>
        )}
        <div className="payment-callback__actions">
          {walletTopup ? (
            <>
              <Link href="/client/wallet" className="btn btn--primary">
                View My Wallet
              </Link>
              <Link href="/client/ip-stock" className="btn btn--outline">
                Buy IP Stock
              </Link>
            </>
          ) : (
            <>
              <Link href="/client/orders" className="btn btn--primary">
                Manage Orders
              </Link>
              <Link href="/client/servers" className="btn btn--outline">
                My Servers
              </Link>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="payment-callback glass payment-callback--failed">
      <div className="payment-callback__icon">✕</div>
      <h2>Payment Failed or Pending</h2>
      <p>{message}</p>
      {orderId && (
        <p className="payment-callback__order">
          Reference: <strong>{orderId}</strong>
        </p>
      )}
      <div className="payment-callback__actions">
        <Link
          href={walletTopup || isWalletTopup(orderId || "") ? "/client/wallet" : "/client/ip-stock"}
          className="btn btn--primary"
        >
          Try Again
        </Link>
        <Link href="/client/support" className="btn btn--outline">
          Contact Support
        </Link>
      </div>
    </div>
  );
}
