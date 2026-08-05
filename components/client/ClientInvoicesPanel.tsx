"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getUser } from "@/lib/auth";
import { canViewInvoice, getInvoiceNumber, getInvoiceStatusLabel } from "@/lib/invoice";
import {
  fetchOrders,
  formatOrderDate,
  getOrderTitle,
  getOrdersByUser,
  type Order,
} from "@/lib/orders";

export function ClientInvoicesPanel() {
  const [orders, setOrders] = useState<Order[]>([]);

  const load = useCallback(() => {
    const user = getUser();
    if (user) setOrders(getOrdersByUser(user.email));
  }, []);

  useEffect(() => {
    const user = getUser();
    if (user) {
      void fetchOrders(user.email).then(() => load());
    } else {
      load();
    }
    const onUpdate = () => load();
    window.addEventListener("orders-updated", onUpdate);
    return () => window.removeEventListener("orders-updated", onUpdate);
  }, [load]);

  const invoices = useMemo(
    () =>
      orders
        .filter((o) => canViewInvoice(o))
        .sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        ),
    [orders]
  );

  return (
    <div className="co-page">
      <header className="co-head">
        <div>
          <h1>Invoices</h1>
          <p>Paid order invoices — print or save as PDF.</p>
        </div>
        <Link href="/client/orders" className="btn btn--outline btn--sm">
          My Orders
        </Link>
      </header>

      {invoices.length === 0 ? (
        <div className="co-empty">
          <h3>No invoices yet</h3>
          <p>Invoices appear here after payment is confirmed.</p>
          <Link href="/client/ip-stock" className="btn btn--primary">
            Browse Plans
          </Link>
        </div>
      ) : (
        <div className="co-list">
          {invoices.map((o) => (
            <article key={o.id} className="co-row is-delivered">
              <div className="co-row__main">
                <div className="co-row__title-row">
                  <h2>{getInvoiceNumber(o)}</h2>
                  <span className="co-badge is-delivered">{getInvoiceStatusLabel(o)}</span>
                </div>
                <p className="co-row__meta">{getOrderTitle(o)}</p>
                <p className="co-row__id">
                  <code>{o.id}</code>
                  <span>·</span>
                  <span>{formatOrderDate(o.createdAt)}</span>
                </p>
              </div>
              <div className="co-row__side">
                <strong className="co-row__price">
                  ₹{o.totalAmount.toLocaleString("en-IN")}
                </strong>
                <Link href={`/client/invoice/${o.id}`} className="btn btn--primary btn--sm">
                  View Invoice
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
