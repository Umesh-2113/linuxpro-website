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

function rowClass(server: UserServer): string {
  if (serverIsExpired(server)) return "is-expired";
  if (server.powerState === "running") return "is-online";
  if (server.powerState === "stopped") return "is-offline";
  return "is-unknown";
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
    if (statusFilter === "active") list = list.filter((s) => !serverIsExpired(s));
    else if (statusFilter === "expired") list = list.filter((s) => serverIsExpired(s));

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

  return (
    <div className="cs-page">
      <header className="cs-head">
        <div>
          <h1>My Servers</h1>
          <p>IP, credentials, and power controls for delivered orders.</p>
        </div>
      </header>

      {servers.length === 0 ? (
        <section className="cs-empty">
          <h3>No servers yet</h3>
          <p>After admin delivers your order, the IP and password appear here.</p>
          <div className="cs-empty__actions">
            <Link href="/client/orders" className="btn btn--outline">
              My Orders
            </Link>
            <Link href="/client/ip-stock" className="btn btn--primary">
              Buy IP Stock
            </Link>
          </div>
        </section>
      ) : (
        <>
          <div className="cs-tabs" role="tablist" aria-label="Server status">
            {(
              [
                ["all", "All", counts.all],
                ["active", "Active", counts.active],
                ["expired", "Expired", counts.expired],
              ] as const
            ).map(([key, label, count]) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={statusFilter === key}
                className={`cs-tabs__btn${statusFilter === key ? " is-active" : ""}`}
                onClick={() => setStatusFilter(key)}
              >
                {label}
                <span>{count}</span>
              </button>
            ))}
          </div>

          <div className="cs-search">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18" aria-hidden>
              <circle cx="11" cy="11" r="8" />
              <path d="M21 21l-4.35-4.35" />
            </svg>
            <input
              type="search"
              placeholder="Search IP, name, region, order…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Escape" && setSearch("")}
              aria-label="Search servers"
            />
            {search ? (
              <button type="button" className="cs-search__clear" onClick={() => setSearch("")} aria-label="Clear">
                ×
              </button>
            ) : null}
          </div>

          {filteredServers.length === 0 ? (
            <section className="cs-empty cs-empty--inline">
              <h3>No servers match</h3>
              <p>Try another filter or clear search.</p>
              <button
                type="button"
                className="btn btn--outline btn--sm"
                onClick={() => {
                  setSearch("");
                  setStatusFilter("all");
                }}
              >
                Show all
              </button>
            </section>
          ) : (
            <div className="cs-list">
              {filteredServers.map((server) => {
                const expiresAt = resolveServerExpiresAt(server);
                const expired = isServerExpired(expiresAt);
                const osDisplay = server.os && server.os !== "N/A" ? server.os : "—";
                const power = expired ? "Offline" : powerLabel(server.powerState);

                return (
                  <article key={server.id} className={`cs-row ${rowClass(server)}`}>
                    <div className="cs-row__main">
                      <div className="cs-row__title-row">
                        <h2>{server.name}</h2>
                        <span className={`cs-badge ${rowClass(server)}`}>
                          {expired ? "Expired" : power}
                        </span>
                      </div>
                      <p className="cs-row__ip">{server.ip}</p>
                      <p className="cs-row__meta">
                        {stockTypeLabels[server.type]} · {server.region} · {osDisplay}
                      </p>
                      <p className="cs-row__meta">
                        Expires {formatServerExpiry(expiresAt)} · Order #{server.orderId}
                      </p>
                    </div>
                    <div className="cs-row__side">
                      <span className={`cs-status ${expired ? "is-expired" : "is-active"}`}>
                        {expired ? "Expired" : server.status}
                      </span>
                      <Link href={`/client/servers/${server.id}`} className="btn btn--primary btn--sm">
                        Manage →
                      </Link>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
