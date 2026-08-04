"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getUser } from "@/lib/auth";
import {
  formatOrderDate,
  getAdminFulfillmentLabel,
  getAdminPaymentLabel,
  getOrderSubtitle,
  getOrderTitle,
  getOrdersByUser,
  type Order,
} from "@/lib/orders";
import { getTicketsByUser } from "@/lib/tickets";
import { getServersByUser, type UserServer } from "@/lib/user-servers";
import {
  fetchWallet,
  formatWalletAmount,
  getWalletBalance,
} from "@/lib/wallet";
import { stockTypeLabels } from "@/lib/stock";

function powerLabel(state: UserServer["powerState"]) {
  if (state === "running") return "Online";
  if (state === "stopped") return "Offline";
  return "Unknown";
}

export function ClientDashboard() {
  const [servers, setServers] = useState<UserServer[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [openTickets, setOpenTickets] = useState(0);
  const [userName, setUserName] = useState("there");
  const [walletBalance, setWalletBalance] = useState(0);

  const load = useCallback(() => {
    const user = getUser();
    if (!user) return;
    setUserName(user.name);
    setServers(getServersByUser(user.email));
    setOrders(getOrdersByUser(user.email));
    setWalletBalance(getWalletBalance());
    setOpenTickets(
      getTicketsByUser(user.email).filter((t) => t.status !== "closed").length
    );
  }, []);

  useEffect(() => {
    fetchWallet().then((data) => setWalletBalance(data.balance));
    load();
    window.addEventListener("servers-updated", load);
    window.addEventListener("orders-updated", load);
    window.addEventListener("tickets-updated", load);
    window.addEventListener("wallet-updated", load);
    return () => {
      window.removeEventListener("servers-updated", load);
      window.removeEventListener("orders-updated", load);
      window.removeEventListener("tickets-updated", load);
      window.removeEventListener("wallet-updated", load);
    };
  }, [load]);

  const stats = useMemo(() => {
    const online = servers.filter((s) => s.powerState === "running").length;
    const activeOrders = orders.filter(
      (o) =>
        o.fulfillmentStatus !== "delivered" && o.fulfillmentStatus !== "cancelled"
    ).length;
    const totalSpent = orders
      .filter((o) => o.paymentStatus === "received")
      .reduce((sum, o) => sum + o.totalAmount, 0);
    return {
      totalServers: servers.length,
      online,
      activeOrders,
      totalSpent,
    };
  }, [servers, orders]);

  const recentServers = servers.slice(0, 5);
  const recentOrders = orders.slice(0, 4);

  return (
    <div className="client-dash">
      <header className="client-dash-hero">
        <div className="client-dash-hero__glow" aria-hidden />
        <div className="client-dash-hero__content">
          <div>
            <h1>Welcome back, {userName}</h1>
            <p>Your live overview — servers, orders, and support from your account.</p>
          </div>
          <Link href="/client/ip-stock" className="btn btn--primary btn--sm">
            + Buy IP Stock
          </Link>
        </div>
      </header>

      <div className="client-stats">
        <div className="client-stat-card glass">
          <span className="client-stat-card__label">My Servers</span>
          <span className="client-stat-card__value">{stats.totalServers}</span>
        </div>
        <div className="client-stat-card glass client-stat-card--online">
          <span className="client-stat-card__label">Online</span>
          <span className="client-stat-card__value">{stats.online}</span>
        </div>
        <div className="client-stat-card glass">
          <span className="client-stat-card__label">Active Orders</span>
          <span className="client-stat-card__value">{stats.activeOrders}</span>
        </div>
        <div className="client-stat-card glass client-stat-card--wallet">
          <span className="client-stat-card__label">My Wallet</span>
          <span className="client-stat-card__value">{formatWalletAmount(walletBalance)}</span>
          <Link href="/client/wallet" className="btn btn--primary btn--sm">
            Add Money
          </Link>
        </div>
        <div className="client-stat-card glass">
          <span className="client-stat-card__label">Open Tickets</span>
          <span className="client-stat-card__value">{openTickets}</span>
        </div>
      </div>

      <div className="client-grid-2">
        <section className="client-panel glass">
          <div className="client-panel__header">
            <h2>Your Servers</h2>
            <Link href="/client/servers">View all</Link>
          </div>

          {recentServers.length === 0 ? (
            <div className="client-dash-empty">
              <p>No servers yet. Buy IP stock and admin will deliver your server.</p>
              <Link href="/client/ip-stock" className="btn btn--outline btn--sm">
                Browse IP Stock
              </Link>
            </div>
          ) : (
            <div className="client-table-wrap">
              <table className="client-table">
                <thead>
                  <tr>
                    <th>IP Series</th>
                    <th>IP Address</th>
                    <th>Power</th>
                    <th>Type</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {recentServers.map((s) => (
                    <tr key={s.id}>
                      <td>
                        <strong className="client-dash-series">{s.name}</strong>
                      </td>
                      <td className="client-dash-ip">{s.ip}</td>
                      <td>
                        <span className={`client-dash-power client-dash-power--${s.powerState}`}>
                          {powerLabel(s.powerState)}
                        </span>
                      </td>
                      <td>{stockTypeLabels[s.type]}</td>
                      <td>
                        <Link href={`/client/servers/${s.id}`} className="client-dash-link">
                          Manage →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="client-panel glass">
          <div className="client-panel__header">
            <h2>Recent Orders</h2>
            <Link href="/client/orders">View all</Link>
          </div>

          {recentOrders.length === 0 ? (
            <div className="client-dash-empty">
              <p>No orders yet. Start by purchasing from IP Stock.</p>
              <Link href="/client/ip-stock" className="btn btn--primary btn--sm">
                Buy Now
              </Link>
            </div>
          ) : (
            <ul className="client-list">
              {recentOrders.map((o) => (
                <li key={o.id} className="client-list__item">
                  <div>
                    <strong className="client-dash-series">IP {getOrderTitle(o)}</strong>
                    <span>{getOrderSubtitle(o)}</span>
                    <span className="client-dash-order-id">{o.id}</span>
                  </div>
                  <div className="client-list__meta">
                    <span>₹{o.totalAmount.toLocaleString("en-IN")}</span>
                    <span className={`status-badge status-badge--${o.paymentStatus === "received" ? "paid" : "pending"}`}>
                      {getAdminPaymentLabel(o)}
                    </span>
                    <span className={`status-badge status-badge--${o.fulfillmentStatus === "delivered" ? "paid" : "open"}`}>
                      {getAdminFulfillmentLabel(o)}
                    </span>
                  </div>
                  <span className="client-dash-order-date">{formatOrderDate(o.createdAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {stats.totalSpent > 0 && (
        <p className="client-dash-footnote">
          Total confirmed payments: <strong>₹{stats.totalSpent.toLocaleString("en-IN")}</strong>
        </p>
      )}
    </div>
  );
}
