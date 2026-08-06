"use client";

import { useCallback, useEffect, useState } from "react";
import {
  deleteOrder,
  deliverOrderToCustomer,
  formatOrderDate,
  updateOrderCredentials,
  fulfillmentStatusLabels,
  getAdminFulfillmentLabel,
  getAdminPaymentLabel,
  getOrderStats,
  getOrderSubtitle,
  getOrderTitle,
  getOrders,
  fetchOrders,
  isCashfreePaymentConfirmed,
  paymentStatusLabels,
  updateOrder,
  type FulfillmentStatus,
  type Order,
  type PaymentStatus,
} from "@/lib/orders";
import { stockTypeLabels, fetchStock, getStock } from "@/lib/stock";
import {
  defaultExpiresAt,
  fetchServers,
  formatServerExpiry,
  getServersByOrder,
  isServerExpired,
  resolveServerExpiresAt,
} from "@/lib/user-servers";

type PaymentFilter = "all" | PaymentStatus;
type FulfillmentFilter = "all" | FulfillmentStatus;

function defaultDeliverUsername(order: Order): string {
  if (order.stockType === "linux") return "root";
  if (order.stockType === "proxy") return "user";
  const os = (order.os || "").toLowerCase();
  if (os.includes("windows") || os.includes("win")) return "Administrator";
  // VPS username is filled by admin / provider — do not assume root
  return "";
}

function blankDeliverUnits(order: Order) {
  const qty = Math.max(1, order.quantity || 1);
  const username = defaultDeliverUsername(order);
  return Array.from({ length: qty }, () => ({
    ip: "",
    username,
    password: "",
  }));
}

function getOrderExpiryIso(order: Order): string {
  const linked = getServersByOrder(order.id);
  if (linked.length > 0) {
    return resolveServerExpiresAt(linked[0]);
  }
  return defaultExpiresAt(order.createdAt);
}

export function AdminOrdersPanel() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [selected, setSelected] = useState<Order | null>(null);
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>("all");
  const [fulfillmentFilter, setFulfillmentFilter] = useState<FulfillmentFilter>("all");
  const [search, setSearch] = useState("");
  const [adminNote, setAdminNote] = useState("");
  const [deliverUnits, setDeliverUnits] = useState<
    {
      serverId?: string;
      ip: string;
      username: string;
      password: string;
      providerOrderId?: string;
    }[]
  >([{ ip: "", username: "", password: "" }]);
  const [deliverError, setDeliverError] = useState("");
  const [stockProviderById, setStockProviderById] = useState<
    Record<string, string>
  >({});
  const [saveSuccess, setSaveSuccess] = useState("");
  const [serversTick, setServersTick] = useState(0);
  const [refreshBusy, setRefreshBusy] = useState(false);
  const [loadError, setLoadError] = useState("");

  const load = useCallback(() => {
    let list = getOrders();
    if (paymentFilter !== "all") {
      list = list.filter((o) => o.paymentStatus === paymentFilter);
    }
    if (fulfillmentFilter !== "all") {
      list = list.filter((o) => o.fulfillmentStatus === fulfillmentFilter);
    }
    const q = search.toLowerCase();
    if (q) {
      list = list.filter(
        (o) =>
          o.id.toLowerCase().includes(q) ||
          o.series.toLowerCase().includes(q) ||
          o.userName.toLowerCase().includes(q) ||
          o.userEmail.toLowerCase().includes(q)
      );
    }
    setOrders(list);
    setSelected((prev) => {
      if (!prev) return null;
      return list.find((o) => o.id === prev.id) ?? getOrders().find((o) => o.id === prev.id) ?? null;
    });
  }, [paymentFilter, fulfillmentFilter, search]);

  const refreshFromApi = useCallback(async () => {
    setRefreshBusy(true);
    try {
      await Promise.all([
        fetchOrders(undefined, { force: true }),
        fetchServers(),
        fetchStock(),
      ]);
      const map: Record<string, string> = {};
      for (const item of getStock()) {
        map[item.id] = item.provider ?? "manual";
      }
      setStockProviderById(map);
      setLoadError("");
      load();
      setServersTick((n) => n + 1);
    } catch (err) {
      console.error("[AdminOrdersPanel] refresh", err);
      setLoadError(
        err instanceof Error
          ? err.message
          : "Orders load failed — admin re-login karein."
      );
    } finally {
      setRefreshBusy(false);
    }
  }, [load]);

  useEffect(() => {
    void refreshFromApi();
    const poll = window.setInterval(() => {
      void refreshFromApi();
    }, 20000);
    const onOrders = () => load();
    const onServers = () => {
      setServersTick((n) => n + 1);
      load();
    };
    window.addEventListener("orders-updated", onOrders);
    window.addEventListener("servers-updated", onServers);
    return () => {
      window.clearInterval(poll);
      window.removeEventListener("orders-updated", onOrders);
      window.removeEventListener("servers-updated", onServers);
    };
  }, [load, refreshFromApi]);

  useEffect(() => {
    setAdminNote(selected?.adminNote ?? "");
    setDeliverError("");
    setSaveSuccess("");
    if (!selected) {
      setDeliverUnits([{ ip: "", username: "", password: "" }]);
      return;
    }
    const linked = getServersByOrder(selected.id);
    if (linked.length > 0) {
      const fallbackUser = defaultDeliverUsername(selected);
      setDeliverUnits(
        linked.map((s) => {
          let username = s.username || "";
          if (
            fallbackUser === "Administrator" &&
            (!username || username.toLowerCase() === "root")
          ) {
            username = "Administrator";
          }
          return {
            serverId: s.id,
            ip: s.ip || "",
            username,
            password: s.password || "",
            providerOrderId: s.providerOrderId || "",
          };
        })
      );
      return;
    }
    const blank = blankDeliverUnits(selected);
    if (selected.deliverIp) {
      blank[0] = {
        ip: selected.deliverIp,
        username:
          selected.deliverUsername || defaultDeliverUsername(selected),
        password: selected.deliverPassword || "",
      };
    }
    setDeliverUnits(blank);
  }, [selected, serversTick]);

  const stats = getOrderStats();
  void serversTick;

  const selectedExpiry = selected ? getOrderExpiryIso(selected) : null;
  const selectedExpired = selectedExpiry ? isServerExpired(selectedExpiry) : false;
  const selectedIsOceanLinux =
    selected && stockProviderById[selected.stockId] === "oceanlinux";

  const handleSelect = (order: Order) => {
    setSelected(order);
    setAdminNote(order.adminNote);
  };

  const patch = async (updates: Parameters<typeof updateOrder>[1]) => {
    if (!selected) return;
    const updated = await updateOrder(selected.id, updates);
    if (updated) {
      setSelected(updated);
      load();
    }
  };

  const handleSaveNote = () => {
    void patch({ adminNote });
  };

  const handleDelete = async (id: string) => {
    if (confirm("Delete this order permanently?")) {
      await deleteOrder(id);
      if (selected?.id === id) setSelected(null);
      load();
    }
  };

  return (
    <div className="ao-page">
      <header className="ao-head">
        <div>
          <h1>Orders</h1>
          <p>Verify payment, then deliver IP / username / password manually.</p>
          {loadError ? (
            <p className="form-error" style={{ marginTop: 8 }}>
              {loadError} — Logout karke dubara admin login karein, phir Refresh.
            </p>
          ) : null}
        </div>
        <button
          type="button"
          className="btn btn--ghost btn--sm"
          onClick={() => void refreshFromApi()}
          disabled={refreshBusy}
        >
          {refreshBusy ? "Refreshing…" : "Refresh"}
        </button>
      </header>

      <div className="ao-stats">
        <span>
          <strong>{stats.total}</strong> total
        </span>
        <span>
          <strong>{stats.paymentPending}</strong> pay pending
        </span>
        <span>
          <strong>{stats.awaitingDelivery}</strong> to deliver
        </span>
        <span>
          <strong>{stats.delivered}</strong> delivered
        </span>
      </div>

      <div className="ao-toolbar">
        <input
          type="search"
          className="ao-search"
          placeholder="Search order, customer, series…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="ao-filters" role="tablist" aria-label="Payment">
          {(["all", "pending", "received", "not_received"] as PaymentFilter[]).map((f) => (
            <button
              key={f}
              type="button"
              role="tab"
              aria-selected={paymentFilter === f}
              className={`ao-chip${paymentFilter === f ? " is-active" : ""}`}
              onClick={() => setPaymentFilter(f)}
            >
              {f === "all" ? "Pay: All" : paymentStatusLabels[f]}
            </button>
          ))}
        </div>
        <div className="ao-filters" role="tablist" aria-label="Fulfillment">
          {(["all", "pending", "processing", "delivered", "cancelled"] as FulfillmentFilter[]).map(
            (f) => (
              <button
                key={f}
                type="button"
                role="tab"
                aria-selected={fulfillmentFilter === f}
                className={`ao-chip${fulfillmentFilter === f ? " is-active" : ""}`}
                onClick={() => setFulfillmentFilter(f)}
              >
                {f === "all"
                  ? "Status: All"
                  : f === "pending"
                    ? "Order Pending"
                    : fulfillmentStatusLabels[f]}
              </button>
            )
          )}
        </div>
      </div>

      <div className="ao-layout">
        <section className="ao-list-panel">
          <h2>
            Orders <span>{orders.length}</span>
          </h2>
          {orders.length === 0 ? (
            <p className="ao-empty-text">No orders match.</p>
          ) : (
            <ul className="ao-list">
              {orders.map((o) => {
                const expiryIso = getOrderExpiryIso(o);
                const expired = isServerExpired(expiryIso);
                const payOk = o.paymentStatus === "received";
                const done = o.fulfillmentStatus === "delivered";
                return (
                  <li key={o.id}>
                    <button
                      type="button"
                      className={`ao-row${selected?.id === o.id ? " is-active" : ""}${
                        payOk && !done ? " is-action" : ""
                      }`}
                      onClick={() => handleSelect(o)}
                    >
                      <div className="ao-row__top">
                        <code>{o.id}</code>
                        <strong>₹{o.totalAmount.toLocaleString("en-IN")}</strong>
                      </div>
                      <p className="ao-row__title">
                        {getOrderTitle(o)} × {o.quantity}
                      </p>
                      <p className="ao-row__meta">
                        {o.userName} · {formatOrderDate(o.createdAt)}
                        {expired ? " · Expired" : ""}
                      </p>
                      <div className="ao-row__badges">
                        <span className={`ao-tag${payOk ? " is-ok" : " is-warn"}`}>
                          {getAdminPaymentLabel(o)}
                        </span>
                        <span className={`ao-tag${done ? " is-ok" : " is-mute"}`}>
                          {getAdminFulfillmentLabel(o)}
                        </span>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="ao-detail">
          {selected ? (
            <>
              <div className="ao-detail__head">
                <div>
                  <div className="ao-row__badges" style={{ marginBottom: 8 }}>
                    <span
                      className={`ao-tag${
                        selected.paymentStatus === "received" ? " is-ok" : " is-warn"
                      }`}
                    >
                      {getAdminPaymentLabel(selected)}
                    </span>
                    <span
                      className={`ao-tag${
                        selected.fulfillmentStatus === "delivered" ? " is-ok" : " is-mute"
                      }`}
                    >
                      {getAdminFulfillmentLabel(selected)}
                    </span>
                  </div>
                  <h2>{getOrderTitle(selected)}</h2>
                  <p>
                    {getOrderSubtitle(selected)} · Qty {selected.quantity} · ₹
                    {selected.totalAmount.toLocaleString("en-IN")}
                  </p>
                  <p className="ao-detail__id">
                    <code>{selected.id}</code>
                  </p>
                </div>
                <button
                  type="button"
                  className="btn btn--ghost btn--sm admin-delete-btn"
                  onClick={() => handleDelete(selected.id)}
                >
                  Delete
                </button>
              </div>

              {isCashfreePaymentConfirmed(selected) && (
                <div className="ao-banner">
                  Cashfree payment confirmed — deliver IP credentials below.
                </div>
              )}

              <dl className="ao-facts">
                <div>
                  <dt>Customer</dt>
                  <dd>
                    {selected.userName}
                    <br />
                    <a href={`mailto:${selected.userEmail}`}>{selected.userEmail}</a>
                  </dd>
                </div>
                <div>
                  <dt>Ordered</dt>
                  <dd>{formatOrderDate(selected.createdAt)}</dd>
                </div>
                <div>
                  <dt>Expires</dt>
                  <dd className={selectedExpired ? "is-expired" : undefined}>
                    {selectedExpiry ? formatServerExpiry(selectedExpiry) : "—"}
                    {selectedExpired ? " (Expired)" : ""}
                  </dd>
                </div>
                <div>
                  <dt>Type</dt>
                  <dd>{stockTypeLabels[selected.stockType]}</dd>
                </div>
                <div>
                  <dt>Series</dt>
                  <dd>{selected.series}</dd>
                </div>
                <div>
                  <dt>Region</dt>
                  <dd>{selected.region}</dd>
                </div>
                <div>
                  <dt>Specs</dt>
                  <dd>{selected.specs || "—"}</dd>
                </div>
                <div>
                  <dt>Pay via</dt>
                  <dd>
                    {selected.paymentGateway === "cashfree"
                      ? "Cashfree"
                      : selected.paymentGateway === "wallet"
                        ? "Wallet"
                        : "Manual"}
                    {selected.cashfreeOrderStatus
                      ? ` · ${selected.cashfreeOrderStatus}`
                      : ""}
                  </dd>
                </div>
              </dl>

              <div className="ao-block">
                <h3>Payment</h3>
                {selected.paymentGateway === "cashfree" &&
                selected.paymentStatus === "received" ? (
                  <p className="ao-note">Auto-confirmed via Cashfree — no manual action.</p>
                ) : (
                  <div className="ao-btns">
                    <button
                      type="button"
                      className={`btn btn--sm${
                        selected.paymentStatus === "received" ? " btn--primary" : " btn--outline"
                      }`}
                      onClick={() => patch({ paymentStatus: "received" })}
                    >
                      Payment Confirmed
                    </button>
                    <button
                      type="button"
                      className={`btn btn--sm${
                        selected.paymentStatus === "not_received"
                          ? " btn--primary"
                          : " btn--outline"
                      }`}
                      onClick={() => patch({ paymentStatus: "not_received" })}
                    >
                      Not Received
                    </button>
                    <button
                      type="button"
                      className={`btn btn--sm${
                        selected.paymentStatus === "pending" ? " btn--primary" : " btn--outline"
                      }`}
                      onClick={() => patch({ paymentStatus: "pending" })}
                    >
                      Reset Pending
                    </button>
                  </div>
                )}
              </div>

              <div className="ao-block">
                <h3>Deliver credentials</h3>
                <div className="ao-btns" style={{ marginBottom: 12 }}>
                  <button
                    type="button"
                    className={`btn btn--sm${
                      selected.fulfillmentStatus === "processing"
                        ? " btn--primary"
                        : " btn--outline"
                    }`}
                    onClick={() => patch({ fulfillmentStatus: "processing" })}
                    disabled={selected.fulfillmentStatus === "delivered"}
                  >
                    Mark Processing
                  </button>
                  <button
                    type="button"
                    className="btn btn--ghost btn--sm"
                    onClick={() => patch({ fulfillmentStatus: "cancelled" })}
                    disabled={selected.fulfillmentStatus === "delivered"}
                  >
                    Cancel Order
                  </button>
                </div>
                <p className="ao-note">
                  API auto-deliver is ON. Paid orders try OceanLinux / HostHeaven / Backup
                  Stock automatically. Manual deliver still works if API has no free unit.
                </p>
                {saveSuccess ? <p className="ao-note ao-note--ok">{saveSuccess}</p> : null}

                {selected.fulfillmentStatus === "delivered" ? (
                  <div className="order-deliver-form">
                    <p className="order-delivered-creds__title">
                      Delivered — {deliverUnits.length} unit
                      {deliverUnits.length > 1 ? "s" : ""} (edit if needed)
                    </p>
                    {deliverUnits.map((unit, idx) => (
                      <div key={unit.serverId || idx} className="order-deliver-unit">
                        <h4 className="order-deliver-unit__title">
                          Unit {idx + 1}
                          {unit.serverId ? <small> · {unit.serverId}</small> : null}
                        </h4>
                        <div className="order-deliver-form__grid">
                          <div className="auth-form__field">
                            <label htmlFor={`edit-deliver-ip-${idx}`}>IP Address</label>
                            <input
                              id={`edit-deliver-ip-${idx}`}
                              value={unit.ip}
                              onChange={(e) => {
                                const next = [...deliverUnits];
                                next[idx] = { ...next[idx], ip: e.target.value };
                                setDeliverUnits(next);
                              }}
                              placeholder="e.g. 162.4.12.55"
                            />
                          </div>
                          <div className="auth-form__field">
                            <label htmlFor={`edit-deliver-user-${idx}`}>Username</label>
                            <input
                              id={`edit-deliver-user-${idx}`}
                              value={unit.username}
                              onChange={(e) => {
                                const next = [...deliverUnits];
                                next[idx] = { ...next[idx], username: e.target.value };
                                setDeliverUnits(next);
                              }}
                              placeholder="Username"
                            />
                          </div>
                          <div className="auth-form__field">
                            <label htmlFor={`edit-deliver-pass-${idx}`}>Password</label>
                            <input
                              id={`edit-deliver-pass-${idx}`}
                              type="text"
                              value={unit.password}
                              onChange={(e) => {
                                const next = [...deliverUnits];
                                next[idx] = { ...next[idx], password: e.target.value };
                                setDeliverUnits(next);
                              }}
                              placeholder="Password"
                            />
                          </div>
                          {selectedIsOceanLinux ? (
                            <div className="auth-form__field">
                              <label htmlFor={`edit-deliver-ol-${idx}`}>
                                OceanLinux Order ID
                              </label>
                              <input
                                id={`edit-deliver-ol-${idx}`}
                                value={unit.providerOrderId || ""}
                                onChange={(e) => {
                                  const next = [...deliverUnits];
                                  next[idx] = {
                                    ...next[idx],
                                    providerOrderId: e.target.value,
                                  };
                                  setDeliverUnits(next);
                                }}
                                placeholder="OceanLinux order id for API manage/sync"
                              />
                            </div>
                          ) : null}
                        </div>
                      </div>
                    ))}
                    {deliverError ? <div className="auth-form__error">{deliverError}</div> : null}
                    <button
                      type="button"
                      className="btn btn--primary"
                      onClick={() => {
                        void (async () => {
                          setDeliverError("");
                          setSaveSuccess("");
                          try {
                            const result = await updateOrderCredentials(
                              selected.id,
                              deliverUnits
                            );
                            if (!result) {
                              setDeliverError(
                                "Fill IP, username and password for every unit."
                              );
                              return;
                            }
                            setSelected(result);
                            setSaveSuccess(
                              "Credentials updated — customer sees new details instantly."
                            );
                            await fetchServers();
                            load();
                          } catch (err) {
                            setDeliverError(
                              err instanceof Error ? err.message : "Update failed."
                            );
                          }
                        })();
                      }}
                    >
                      Save Credential Changes
                    </button>
                  </div>
                ) : (
                  <div className="order-deliver-form">
                    {selected.paymentStatus !== "received" && (
                      <p className="order-deliver-form__warn">
                        Mark payment as received before delivering credentials.
                      </p>
                    )}
                    <p className="ao-note">
                      Quantity <strong>{selected.quantity}</strong> — fill each unit.
                    </p>
                    {deliverUnits.map((unit, idx) => (
                      <div key={idx} className="order-deliver-unit">
                        <h4 className="order-deliver-unit__title">Unit {idx + 1}</h4>
                        <div className="order-deliver-form__grid">
                          <div className="auth-form__field">
                            <label htmlFor={`deliver-ip-${idx}`}>IP Address</label>
                            <input
                              id={`deliver-ip-${idx}`}
                              value={unit.ip}
                              onChange={(e) => {
                                const next = [...deliverUnits];
                                next[idx] = { ...next[idx], ip: e.target.value };
                                setDeliverUnits(next);
                              }}
                              placeholder="e.g. 162.4.12.55"
                              disabled={selected.paymentStatus !== "received"}
                            />
                          </div>
                          <div className="auth-form__field">
                            <label htmlFor={`deliver-user-${idx}`}>Username</label>
                            <input
                              id={`deliver-user-${idx}`}
                              value={unit.username}
                              onChange={(e) => {
                                const next = [...deliverUnits];
                                next[idx] = { ...next[idx], username: e.target.value };
                                setDeliverUnits(next);
                              }}
                              placeholder={
                                selected.stockType === "linux"
                                  ? "root"
                                  : selected.stockType === "proxy"
                                    ? "user"
                                    : defaultDeliverUsername(selected) ||
                                      "Administrator / VPS user"
                              }
                              disabled={selected.paymentStatus !== "received"}
                            />
                          </div>
                          <div className="auth-form__field">
                            <label htmlFor={`deliver-pass-${idx}`}>Password</label>
                            <input
                              id={`deliver-pass-${idx}`}
                              type="text"
                              value={unit.password}
                              onChange={(e) => {
                                const next = [...deliverUnits];
                                next[idx] = { ...next[idx], password: e.target.value };
                                setDeliverUnits(next);
                              }}
                              placeholder="Login password"
                              disabled={selected.paymentStatus !== "received"}
                            />
                          </div>
                          {selectedIsOceanLinux ? (
                            <div className="auth-form__field">
                              <label htmlFor={`deliver-ol-${idx}`}>OceanLinux Order ID</label>
                              <input
                                id={`deliver-ol-${idx}`}
                                value={unit.providerOrderId || ""}
                                onChange={(e) => {
                                  const next = [...deliverUnits];
                                  next[idx] = {
                                    ...next[idx],
                                    providerOrderId: e.target.value,
                                  };
                                  setDeliverUnits(next);
                                }}
                                placeholder="Required for start/stop/sync via API"
                                disabled={selected.paymentStatus !== "received"}
                              />
                            </div>
                          ) : null}
                        </div>
                      </div>
                    ))}
                    {deliverError ? <div className="auth-form__error">{deliverError}</div> : null}
                    <button
                      type="button"
                      className="btn btn--primary"
                      disabled={selected.paymentStatus !== "received"}
                      onClick={() => {
                        void (async () => {
                          setDeliverError("");
                          try {
                            const result = await deliverOrderToCustomer(
                              selected.id,
                              deliverUnits
                            );
                            if (!result) {
                              setDeliverError(
                                `Fill all ${selected.quantity} unit(s). Payment must be received.`
                              );
                              return;
                            }
                            setSelected(result);
                            setSaveSuccess(
                              `Delivered ${selected.quantity} unit(s) to customer.`
                            );
                            await fetchServers();
                            load();
                          } catch (err) {
                            setDeliverError(
                              err instanceof Error ? err.message : "Delivery failed."
                            );
                          }
                        })();
                      }}
                    >
                      Deliver {selected.quantity} unit
                      {selected.quantity > 1 ? "s" : ""} to Customer
                    </button>
                  </div>
                )}
              </div>

              <div className="ao-block">
                <label htmlFor="admin-order-note">Admin note (internal)</label>
                <textarea
                  id="admin-order-note"
                  rows={3}
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                  placeholder="Internal note…"
                />
                <button
                  type="button"
                  className="btn btn--outline btn--sm"
                  style={{ marginTop: 10 }}
                  onClick={handleSaveNote}
                >
                  Save Note
                </button>
              </div>
            </>
          ) : (
            <div className="ao-detail-empty">
              <p>Select an order to verify payment and deliver credentials.</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
