"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getOrderStats } from "@/lib/orders";
import { getStock } from "@/lib/stock";
import { getTickets } from "@/lib/tickets";
import { getUsers } from "@/lib/users";
import { invoices } from "@/lib/client-data";
import { ADMIN_BASE_PATH } from "@/lib/admin";

export function AdminDashboard() {
  const [stats, setStats] = useState({
    stock: 0,
    stockUnits: 0,
    openTickets: 0,
    totalTickets: 0,
    users: 0,
    dueInvoices: 0,
    pendingOrders: 0,
  } as {
    stock: number;
    stockUnits: number;
    openTickets: number;
    totalTickets: number;
    users: number;
    dueInvoices: number;
    pendingOrders: number;
  });

  useEffect(() => {
    const stock = getStock();
    const tickets = getTickets();
    const orderStats = getOrderStats();
    setStats({
      stock: stock.length,
      stockUnits: stock.reduce((s, i) => s + i.quantity, 0),
      openTickets: tickets.filter((t) => t.status === "open").length,
      totalTickets: tickets.length,
      users: getUsers().length,
      dueInvoices: invoices.filter((i) => i.status === "due").length,
      pendingOrders: orderStats.paymentPending,
    });
  }, []);

  const cards = [
    { label: "IP Stock Items", value: stats.stock, sub: `${stats.stockUnits} units`, href: `${ADMIN_BASE_PATH}/stock`, color: "primary" },
    { label: "Pending Orders", value: stats.pendingOrders, sub: "awaiting payment", href: `${ADMIN_BASE_PATH}/orders`, color: "warning" },
    { label: "Open Tickets", value: stats.openTickets, sub: `${stats.totalTickets} total`, href: `${ADMIN_BASE_PATH}/tickets`, color: "warning" },
    { label: "Registered Users", value: stats.users, sub: "client accounts", href: `${ADMIN_BASE_PATH}/users`, color: "info" },
    { label: "Due Invoices", value: stats.dueInvoices, sub: "pending payment", href: `${ADMIN_BASE_PATH}/billing`, color: "danger" },
  ];

  const quickLinks = [
    { href: `${ADMIN_BASE_PATH}/stock`, label: "Add IP Stock", desc: "Manage VPS, Linux & Proxy inventory" },
    { href: `${ADMIN_BASE_PATH}/orders`, label: "Manage Orders", desc: "Verify payment & deliver manually" },
    { href: `${ADMIN_BASE_PATH}/tickets`, label: "View Tickets", desc: "Respond to user support requests" },
    { href: `${ADMIN_BASE_PATH}/users`, label: "Manage Users", desc: "View registered client accounts" },
    { href: `${ADMIN_BASE_PATH}/billing`, label: "Billing Overview", desc: "Invoices and payments" },
  ];

  return (
    <>
      <header className="admin-topbar">
        <div>
          <h1>Admin Dashboard</h1>
          <p>Welcome back — here&apos;s your LinuxPro control center.</p>
        </div>
      </header>

      <div className="admin-stats-grid">
        {cards.map((c) => (
          <Link key={c.href} href={c.href} className={`admin-stat-card glass admin-stat-card--${c.color}`}>
            <span className="admin-stat-card__label">{c.label}</span>
            <span className="admin-stat-card__value">{c.value}</span>
            <span className="admin-stat-card__sub">{c.sub}</span>
          </Link>
        ))}
      </div>

      <section className="admin-panel glass">
        <h2>Quick Actions</h2>
        <div className="admin-quick-grid">
          {quickLinks.map((q) => (
            <Link key={q.href} href={q.href} className="admin-quick-card">
              <strong>{q.label}</strong>
              <span>{q.desc}</span>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
