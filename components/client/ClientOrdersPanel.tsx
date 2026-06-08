"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  fetchOrders,
  formatOrderDate,
  getOrdersByUser,
  getAdminFulfillmentLabel,
  getAdminPaymentLabel,
  getOrderSubtitle,
  getOrderTitle,
  isCashfreePaymentConfirmed,
  type Order,
} from "@/lib/orders";
import { getUser } from "@/lib/auth";
import { getServersByOrder } from "@/lib/user-servers";

export function ClientOrdersPanel() {
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
    window.addEventListener("servers-updated", onUpdate);
    return () => {
      window.removeEventListener("orders-updated", onUpdate);
      window.removeEventListener("servers-updated", onUpdate);
    };
  }, [load]);

  return (
    <>
      <header className="client-topbar">
        <div>
          <h1>Manage Orders</h1>
          <p>Track payment, delivery status, and open your server when ready.</p>
        </div>
        <Link href="/client/ip-stock" className="btn btn--primary btn--sm">
          + Buy More
        </Link>
      </header>

      {orders.length === 0 ? (
        <div className="stock-empty glass stock-empty--cool">
          <div className="stock-empty__icon">📦</div>
          <h3>No orders yet</h3>
          <p>Browse IP stock and click Buy to place your first order.</p>
          <Link href="/client/ip-stock" className="btn btn--primary">
            Browse IP Stock
          </Link>
        </div>
      ) : (
        <div className="order-cards">
          {orders.map((o) => {
            const servers = getServersByOrder(o.id);
            const isDelivered = o.fulfillmentStatus === "delivered";

            return (
              <article key={o.id} className="order-card glass">
                <div className="order-card__header">
                  <div>
                    <strong>{o.id}</strong>
                    <h3 className="order-card__series">IP {getOrderTitle(o)}</h3>
                    <span className="order-card__subtitle">{getOrderSubtitle(o)}</span>
                    <span className="order-card__date">{formatOrderDate(o.createdAt)}</span>
                  </div>
                  <div className="order-card__badges">
                    <span
                      className={`status-badge status-badge--${
                        o.paymentStatus === "received"
                          ? "paid"
                          : o.paymentStatus === "not_received"
                            ? "closed"
                            : "pending"
                      }`}
                    >
                      {getAdminPaymentLabel(o)}
                    </span>
                    <span
                      className={`status-badge status-badge--${
                        isDelivered
                          ? "paid"
                          : o.fulfillmentStatus === "cancelled"
                            ? "closed"
                            : "open"
                      }`}
                    >
                      {getAdminFulfillmentLabel(o)}
                    </span>
                  </div>
                </div>

                {isCashfreePaymentConfirmed(o) && (
                  <p className="order-card__cashfree-note">
                    Payment confirmed via Cashfree — waiting for admin to deliver your server.
                  </p>
                )}

                <div className="order-card__meta">
                  <span>Qty: <strong>{o.quantity}</strong></span>
                  <span>Total: <strong>₹{o.totalAmount.toLocaleString("en-IN")}</strong></span>
                  <span>Region: <strong>{o.region}</strong></span>
                </div>

                {isDelivered && servers.length > 0 ? (
                  <div className="order-card__actions">
                    {servers.map((s) => (
                      <Link
                        key={s.id}
                        href={`/client/servers/${s.id}`}
                        className="btn btn--primary"
                      >
                        Manage — {s.name} →
                      </Link>
                    ))}
                  </div>
                ) : isDelivered ? (
                  <p className="order-card__waiting">
                    Delivered — server details loading… refresh the page.
                  </p>
                ) : (
                  <p className="order-card__waiting">
                    {o.paymentStatus === "pending"
                      ? "Waiting for payment verification by admin."
                      : o.fulfillmentStatus === "processing"
                        ? "Admin is preparing your server…"
                        : "Payment verified — awaiting delivery from admin."}
                  </p>
                )}
              </article>
            );
          })}
        </div>
      )}
    </>
  );
}
