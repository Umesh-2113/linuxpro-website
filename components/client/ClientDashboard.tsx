"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getUser } from "@/lib/auth";
import {
  formatOrderDate,
  getOrderSubtitle,
  getOrderTitle,
  getOrdersByUser,
  type Order,
} from "@/lib/orders";
import { getTicketsByUser } from "@/lib/tickets";
import {
  getServersByUser,
  isServerExpired,
  resolveServerExpiresAt,
  type UserServer,
} from "@/lib/user-servers";
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

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
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
    const online = servers.filter(
      (s) =>
        s.powerState === "running" &&
        !isServerExpired(resolveServerExpiresAt(s))
    ).length;
    const activeOrders = orders.filter(
      (o) =>
        o.fulfillmentStatus !== "delivered" && o.fulfillmentStatus !== "cancelled"
    ).length;
    const delivered = orders.filter((o) => o.fulfillmentStatus === "delivered").length;
    const totalSpent = orders
      .filter((o) => o.paymentStatus === "received")
      .reduce((sum, o) => sum + o.totalAmount, 0);
    return {
      totalServers: servers.length,
      online,
      activeOrders,
      delivered,
      totalSpent,
    };
  }, [servers, orders]);

  const recentServers = servers.slice(0, 4);
  const recentOrders = orders.slice(0, 3);

  return (
    <div className="client-home">
      <header className="client-home-hero">
        <div className="client-home-hero__mesh" aria-hidden />
        <div className="client-home-hero__content">
          <div>
            <span className="client-home-hero__eyebrow">Client Command Center</span>
            <h1>
              {getGreeting()}, <span>{userName}</span>
            </h1>
            <p>Servers, wallet, orders, and support — everything in one place.</p>
          </div>
          <div className="client-home-hero__actions">
            <Link href="/client/ip-stock" className="btn btn--primary">
              + Buy IP Stock
            </Link>
            <Link href="/client/wallet" className="btn btn--outline btn--sm">
              My Wallet
            </Link>
          </div>
        </div>
      </header>

      <div className="client-home-bento">
        <article className="client-home-wallet glass">
          <div className="client-home-wallet__body">
            <div className="client-home-wallet__info">
              <div className="client-home-wallet__top">
                <span className="client-home-wallet__label">My Wallet</span>
                <span className="client-home-wallet__icon" aria-hidden>
                  💳
                </span>
              </div>
              <strong className="client-home-wallet__amount">
                {formatWalletAmount(walletBalance)}
              </strong>
              <p>Pay instantly from wallet at checkout.</p>
            </div>
            <Link href="/client/wallet" className="btn btn--primary btn--sm client-home-wallet__btn">
              Add Money
            </Link>
          </div>
        </article>

        <div className="client-home-stats">
          <article className="client-home-tile glass">
            <span className="client-home-tile__value">{stats.totalServers}</span>
            <span className="client-home-tile__label">Servers</span>
          </article>
          <article className="client-home-tile glass client-home-tile--green">
            <span className="client-home-tile__value">{stats.online}</span>
            <span className="client-home-tile__label">Online</span>
          </article>
          <article className="client-home-tile glass client-home-tile--amber">
            <span className="client-home-tile__value">{stats.activeOrders}</span>
            <span className="client-home-tile__label">Orders</span>
          </article>
          <article className="client-home-tile glass">
            <span className="client-home-tile__value">{openTickets}</span>
            <span className="client-home-tile__label">Tickets</span>
          </article>
        </div>
      </div>

      <div className="client-home-quick">
        {[
          { href: "/client/servers", label: "Servers", icon: "🖥️" },
          { href: "/client/orders", label: "Orders", icon: "📋" },
          { href: "/client/wallet", label: "Wallet", icon: "💰" },
          { href: "/client/support", label: "Support", icon: "💬" },
        ].map((item) => (
          <Link key={item.href} href={item.href} className="client-home-quick__link glass">
            <span aria-hidden>{item.icon}</span>
            {item.label}
          </Link>
        ))}
      </div>

      <div className="client-home-panels">
        <section className="client-home-panel glass">
          <div className="client-home-panel__head">
            <div>
              <h2>Your Servers</h2>
              <p>Recently active VPS and Linux instances</p>
            </div>
            <Link href="/client/servers">View all →</Link>
          </div>

          {recentServers.length === 0 ? (
            <div className="client-home-empty">
              <p>No servers yet. Buy IP stock — after payment, admin delivers IP and password to My Servers.</p>
              <Link href="/client/ip-stock" className="btn btn--outline btn--sm">
                Browse IP Stock
              </Link>
            </div>
          ) : (
            <div className="client-home-server-list">
              {recentServers.map((s) => (
                <Link
                  key={s.id}
                  href={`/client/servers/${s.id}`}
                  className="client-home-server-row"
                >
                  <div className="client-home-server-row__main">
                    <strong>{s.name}</strong>
                    <span className="client-home-server-row__ip">{s.ip}</span>
                  </div>
                  <div className="client-home-server-row__meta">
                    <span className="client-home-server-row__type">
                      {stockTypeLabels[s.type]}
                    </span>
                    <span
                      className={`client-home-server-row__power client-home-server-row__power--${
                        isServerExpired(resolveServerExpiresAt(s))
                          ? "stopped"
                          : s.powerState
                      }`}
                    >
                      {isServerExpired(resolveServerExpiresAt(s))
                        ? "Offline"
                        : powerLabel(s.powerState)}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        <section className="client-home-panel glass">
          <div className="client-home-panel__head">
            <div>
              <h2>Recent Orders</h2>
              <p>Latest purchases and delivery status</p>
            </div>
            <Link href="/client/orders">View all →</Link>
          </div>

          {recentOrders.length === 0 ? (
            <div className="client-home-empty">
              <p>No orders yet. Start with IP Stock.</p>
              <Link href="/client/ip-stock" className="btn btn--primary btn--sm">
                Buy Now
              </Link>
            </div>
          ) : (
            <div className="client-home-order-list">
              {recentOrders.map((o) => (
                <Link key={o.id} href="/client/orders" className="client-home-order-row">
                  <div className="client-home-order-row__main">
                    <strong>IP {getOrderTitle(o)}</strong>
                    <span>{getOrderSubtitle(o)}</span>
                    <span className="client-home-order-row__id">{o.id}</span>
                  </div>
                  <div className="client-home-order-row__side">
                    <strong className="client-home-order-row__amount">
                      ₹{o.totalAmount.toLocaleString("en-IN")}
                    </strong>
                    <div className="client-home-order-row__chips">
                      <span
                        className={`client-order-chip client-order-chip--${
                          o.paymentStatus === "received" ? "ok" : "wait"
                        }`}
                      >
                        {o.paymentStatus === "received" ? "Paid" : "Pending"}
                      </span>
                      <span
                        className={`client-order-chip client-order-chip--${
                          o.fulfillmentStatus === "delivered" ? "ok" : "wait"
                        }`}
                      >
                        {o.fulfillmentStatus === "delivered"
                          ? "Delivered"
                          : o.fulfillmentStatus === "processing"
                            ? "Processing"
                            : "Awaiting"}
                      </span>
                    </div>
                    <span className="client-home-order-row__date">
                      {formatOrderDate(o.createdAt)}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>

      {stats.totalSpent > 0 && (
        <p className="client-home-footnote">
          Lifetime confirmed payments:{" "}
          <strong>₹{stats.totalSpent.toLocaleString("en-IN")}</strong>
        </p>
      )}
    </div>
  );
}
