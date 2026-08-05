"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getUser } from "@/lib/auth";
import {
  formatServerExpiry,
  getServersByUser,
  isServerExpired,
  resolveServerExpiresAt,
  type UserServer,
} from "@/lib/user-servers";
import { stockTypeLabels } from "@/lib/stock";

type StatusFilter = "all" | "active" | "expired";

function powerLabel(state: UserServer["powerState"]) {
  if (state === "running") return "Online";
  if (state === "stopped") return "Offline";
  return "Unknown";
}

function serverIsExpired(server: UserServer): boolean {
  return isServerExpired(resolveServerExpiresAt(server));
}

function ServerCard({ server }: { server: UserServer }) {
  const osDisplay = server.os && server.os !== "N/A" ? server.os : "—";
  const expiresAt = resolveServerExpiresAt(server);
  const expired = isServerExpired(expiresAt);

  return (
    <article className={`servers-pro-card servers-pro-card--${server.powerState}`}>
      <div className="servers-pro-card__glow" aria-hidden />
      <div className="servers-pro-card__top">
        <div className="servers-pro-card__identity">
          <span className="servers-pro-tag">{stockTypeLabels[server.type]}</span>
          <h3>{server.name}</h3>
          <span className="servers-pro-card__region">{server.region}</span>
        </div>
        <div className={`servers-pro-card__power servers-pro-card__power--${server.powerState}`}>
          <span className="servers-pro-card__power-dot" />
          {powerLabel(server.powerState)}
        </div>
      </div>

      <div className="servers-pro-card__ip">{server.ip}</div>

      <div className="servers-pro-card__meta servers-pro-card__meta--4">
        <span>
          <small>OS</small>
          <strong>{osDisplay}</strong>
        </span>
        <span>
          <small>Plan</small>
          <strong>{server.plan}</strong>
        </span>
        <span>
          <small>Order</small>
          <strong>#{server.orderId}</strong>
        </span>
        <span className={expired ? "servers-pro-card__meta-expiry is-expired" : "servers-pro-card__meta-expiry"}>
          <small>Expires</small>
          <strong title={expiresAt}>{formatServerExpiry(expiresAt)}</strong>
        </span>
      </div>

      <div className="servers-pro-card__footer">
        <span className={`servers-pro-status servers-pro-status--${server.status}`}>
          {expired ? "expired" : server.status}
        </span>
        <Link href={`/client/servers/${server.id}`} className="servers-pro-card__btn">
          Manage
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </Link>
      </div>
    </article>
  );
}

export function ClientServersPanel() {
  const [servers, setServers] = useState<UserServer[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const load = useCallback(() => {
    const user = getUser();
    if (user) setServers(getServersByUser(user.email));
  }, []);

  useEffect(() => {
    load();
    window.addEventListener("servers-updated", load);
    window.addEventListener("orders-updated", load);
    return () => {
      window.removeEventListener("servers-updated", load);
      window.removeEventListener("orders-updated", load);
    };
  }, [load]);

  const counts = useMemo(() => {
    let active = 0;
    let expired = 0;
    for (const s of servers) {
      if (serverIsExpired(s)) expired += 1;
      else active += 1;
    }
    return { all: servers.length, active, expired };
  }, [servers]);

  const filteredServers = useMemo(() => {
    let list = servers;
    if (statusFilter === "active") {
      list = list.filter((s) => !serverIsExpired(s));
    } else if (statusFilter === "expired") {
      list = list.filter((s) => serverIsExpired(s));
    }

    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.ip.toLowerCase().includes(q) ||
        s.region.toLowerCase().includes(q) ||
        s.orderId.toLowerCase().includes(q) ||
        s.plan.toLowerCase().includes(q) ||
        (s.os && s.os.toLowerCase().includes(q)) ||
        stockTypeLabels[s.type].toLowerCase().includes(q)
    );
  }, [servers, search, statusFilter]);

  const stats = useMemo(() => {
    const online = servers.filter((s) => s.powerState === "running").length;
    const offline = servers.filter((s) => s.powerState === "stopped").length;
    return { total: servers.length, online, offline };
  }, [servers]);

  return (
    <div className="servers-pro">
      <section className="servers-pro-hero">
        <div className="servers-pro-hero__glow" aria-hidden />
        <div className="servers-pro-hero__content">
          <div>
            <h1>My Servers</h1>
            <p>Manage power, credentials, and OS for your active infrastructure.</p>
          </div>
          <Link href="/client/orders" className="servers-pro-hero__link">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
              <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
              <rect x="9" y="3" width="6" height="4" rx="1" />
            </svg>
            Manage Orders
          </Link>
        </div>

        {servers.length > 0 && (
          <div className="servers-pro-stats">
            <div className="servers-pro-stats__item">
              <strong>{stats.total}</strong>
              <span>Total Servers</span>
            </div>
            <div className="servers-pro-stats__item servers-pro-stats__item--online">
              <strong>{stats.online}</strong>
              <span>Online</span>
            </div>
            <div className="servers-pro-stats__item servers-pro-stats__item--offline">
              <strong>{stats.offline}</strong>
              <span>Offline</span>
            </div>
          </div>
        )}
      </section>

      {servers.length === 0 ? (
        <section className="servers-pro-empty glass">
          <div className="servers-pro-empty__icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="48" height="48">
              <rect x="2" y="3" width="20" height="14" rx="2" />
              <path d="M8 21h8M12 17v4M7 8h2M7 12h6" />
            </svg>
          </div>
          <h3>No servers yet</h3>
          <p>
            Once your order is delivered, your server will appear here with full control panel access.
          </p>
          <div className="servers-pro-empty__actions">
            <Link href="/client/orders" className="btn btn--outline">
              Track Orders
            </Link>
            <Link href="/client/ip-stock" className="btn btn--primary">
              Buy IP Stock
            </Link>
          </div>
        </section>
      ) : (
        <>
          <div className="servers-pro-filters" role="tablist" aria-label="Server status">
            <button
              type="button"
              role="tab"
              aria-selected={statusFilter === "all"}
              className={`servers-pro-filter${statusFilter === "all" ? " is-active" : ""}`}
              onClick={() => setStatusFilter("all")}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                <rect x="2" y="3" width="20" height="14" rx="2" />
                <path d="M8 21h8M12 17v4" />
              </svg>
              All
              <span className="servers-pro-filter__count">{counts.all}</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={statusFilter === "active"}
              className={`servers-pro-filter${statusFilter === "active" ? " is-active" : ""}`}
              onClick={() => setStatusFilter("active")}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                <circle cx="12" cy="12" r="9" />
                <path d="M8 12l2.5 2.5L16 9" />
              </svg>
              Active
              <span className="servers-pro-filter__count">{counts.active}</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={statusFilter === "expired"}
              className={`servers-pro-filter${statusFilter === "expired" ? " is-active" : ""}`}
              onClick={() => setStatusFilter("expired")}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                <rect x="3" y="5" width="18" height="16" rx="2" />
                <path d="M8 3v4M16 3v4M3 11h18" />
              </svg>
              Expired
              <span className="servers-pro-filter__count">{counts.expired}</span>
            </button>
          </div>

          <div className="servers-pro-toolbar glass">
            <div className="servers-pro-search">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                <circle cx="11" cy="11" r="8" />
                <path d="M21 21l-4.35-4.35" />
              </svg>
              <input
                type="search"
                className="servers-pro-search__input"
                placeholder="Search by IP, name, region, order..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Escape" && setSearch("")}
              />
              {search && (
                <button
                  type="button"
                  className="servers-pro-search__clear"
                  onClick={() => setSearch("")}
                  aria-label="Clear search"
                >
                  ×
                </button>
              )}
            </div>
            <button type="button" className="servers-pro-search__btn btn btn--primary btn--sm">
              Search
            </button>
          </div>

          {filteredServers.length === 0 ? (
            <section className="servers-pro-empty glass servers-pro-empty--inline">
              <h3>
                {statusFilter === "expired"
                  ? "No expired servers"
                  : statusFilter === "active"
                    ? "No active servers"
                    : "No servers match your search"}
              </h3>
              <p>
                {search
                  ? "Try a different IP, name, or order ID."
                  : statusFilter === "expired"
                    ? "None of your servers have expired yet."
                    : "Switch filter or buy a new plan."}
              </p>
              <button
                type="button"
                className="btn btn--outline btn--sm"
                onClick={() => {
                  setSearch("");
                  setStatusFilter("all");
                }}
              >
                Show All
              </button>
            </section>
          ) : (
            <div className="servers-pro-grid">
              {filteredServers.map((s) => (
                <ServerCard key={s.id} server={s} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
