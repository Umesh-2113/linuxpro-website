"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getUser } from "@/lib/auth";
import { buildInvoiceView, canViewInvoice } from "@/lib/invoice";
import { fetchOrders, getOrderById, type Order } from "@/lib/orders";

type Props = {
  orderId: string;
};

export function OrderInvoicePanel({ orderId }: Props) {
  const router = useRouter();
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const user = getUser();
    if (!user) {
      setError("Please sign in to view this invoice.");
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      await fetchOrders(user.email);
      const found = getOrderById(orderId);
      if (!found || found.userEmail.trim().toLowerCase() !== user.email.trim().toLowerCase()) {
        setOrder(null);
        setError("Invoice not found.");
        return;
      }
      if (!canViewInvoice(found)) {
        setOrder(null);
        setError("Invoice is available after payment is confirmed.");
        return;
      }
      setOrder(found);
      setError("");
    } catch {
      setError("Failed to load invoice.");
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <div className="inv-page">
        <p className="inv-muted">Loading invoice…</p>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="inv-page">
        <div className="inv-empty">
          <h1>Invoice</h1>
          <p>{error || "Invoice not found."}</p>
          <Link href="/client/orders" className="btn btn--primary btn--sm">
            Back to Orders
          </Link>
        </div>
      </div>
    );
  }

  const inv = buildInvoiceView(order);

  return (
    <div className="inv-page">
      <div className="inv-toolbar no-print">
        <button type="button" className="inv-back" onClick={() => router.push("/client/orders")}>
          ← Orders
        </button>
        <div className="inv-toolbar__actions">
          <button type="button" className="btn btn--outline btn--sm" onClick={() => window.print()}>
            Print / Save PDF
          </button>
        </div>
      </div>

      <article className="inv-sheet" id="linuxpro-invoice">
        <header className="inv-sheet__head">
          <div>
            <p className="inv-brand">{inv.brand}</p>
            <p className="inv-muted">{inv.domain}</p>
            <p className="inv-muted">{inv.supportEmail}</p>
            <p className="inv-muted">{inv.supportPhone}</p>
          </div>
          <div className="inv-sheet__meta">
            <h1>Tax Invoice</h1>
            <p>
              <span>Invoice No.</span>
              <strong>{inv.number}</strong>
            </p>
            <p>
              <span>Order ID</span>
              <strong>{inv.orderId}</strong>
            </p>
            <p>
              <span>Date</span>
              <strong>{inv.issuedAt}</strong>
            </p>
            <p>
              <span>Status</span>
              <strong className="inv-paid">{inv.status}</strong>
            </p>
          </div>
        </header>

        <section className="inv-parties">
          <div>
            <h2>Bill To</h2>
            <p className="inv-strong">{inv.billToName}</p>
            <p>{inv.billToEmail}</p>
            {inv.billToPhone ? <p>{inv.billToPhone}</p> : null}
          </div>
          <div>
            <h2>Payment</h2>
            <p>
              Method: <strong>{inv.paymentMethod}</strong>
            </p>
            {inv.paymentRef ? <p>Ref: {inv.paymentRef}</p> : null}
            {inv.promoCode ? <p>Promo: {inv.promoCode}</p> : null}
          </div>
        </section>

        <table className="inv-table">
          <thead>
            <tr>
              <th>Description</th>
              <th>Qty</th>
              <th>Unit</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <strong>{inv.lineTitle}</strong>
                <span>{inv.lineSubtitle}</span>
              </td>
              <td>{inv.quantity}</td>
              <td>₹{inv.unitPrice.toLocaleString("en-IN")}</td>
              <td>₹{inv.subtotal.toLocaleString("en-IN")}</td>
            </tr>
          </tbody>
        </table>

        <div className="inv-totals">
          <div className="inv-totals__row">
            <span>Subtotal</span>
            <strong>₹{inv.subtotal.toLocaleString("en-IN")}</strong>
          </div>
          {inv.discount > 0 ? (
            <div className="inv-totals__row">
              <span>Discount{inv.promoCode ? ` (${inv.promoCode})` : ""}</span>
              <strong>−₹{inv.discount.toLocaleString("en-IN")}</strong>
            </div>
          ) : null}
          <div className="inv-totals__row inv-totals__row--grand">
            <span>Total Paid</span>
            <strong>₹{inv.total.toLocaleString("en-IN")}</strong>
          </div>
        </div>

        <footer className="inv-foot">
          <p>Thank you for your purchase. This is a computer-generated invoice from {inv.brand}.</p>
          <p>
            Support: {inv.supportEmail} · {inv.supportPhone} · {inv.siteUrl}
          </p>
        </footer>
      </article>
    </div>
  );
}
