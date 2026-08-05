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
import { stockTypeLabels } from "@/lib/stock";
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
    { serverId?: string; ip: string; username: string; password: string }[]
  >([{ ip: "", username: "", password: "" }]);
  const [deliverError, setDeliverError] = useState("");
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
      await Promise.all([fetchOrders(undefined, { force: true }), fetchServers()]);
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
    <>
      <header className="admin-topbar">
        <div>
          <h1>Orders</h1>
          <p>Customer IP stock purchases — verify payment and deliver manually.</p>
          {loadError ? (
            <p className="form-error" style={{ marginTop: 8 }}>
              {loadError} — Logout karke dubara admin login karein, phir Refresh.
            </p>
          ) : null}
        </div>
        <button
          type="button"
          className="btn btn--ghost"
          onClick={() => void refreshFromApi()}
          disabled={refreshBusy}
        >
          {refreshBusy ? "Refreshing…" : "Refresh Orders"}
        </button>
      </header>

      <div className="order-stats">
        <div className="order-stats__card glass">
          <strong>{stats.total}</strong>
          <span>Total Orders</span>
        </div>
        <div className="order-stats__card glass order-stats__card--pending">
          <strong>{stats.paymentPending}</strong>
          <span>Payment Pending</span>
        </div>
        <div className="order-stats__card glass order-stats__card--received">
          <strong>{stats.paymentReceived}</strong>
          <span>Payment Confirmed</span>
        </div>
        <div className="order-stats__card glass order-stats__card--delivery">
          <strong>{stats.awaitingDelivery}</strong>
          <span>Order Pending</span>
        </div>
        <div className="order-stats__card glass order-stats__card--delivered">
          <strong>{stats.delivered}</strong>
          <span>Delivered</span>
        </div>
      </div>

      <div className="admin-order-toolbar">
        <input
          type="search"
          className="ticket-search"
          placeholder="Search order ID, IP, customer..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="admin-ticket-filters">
          {(["all", "pending", "received", "not_received"] as PaymentFilter[]).map((f) => (
            <button
              key={f}
              type="button"
              className={`stock-filter-btn${paymentFilter === f ? " active" : ""}`}
              onClick={() => setPaymentFilter(f)}
            >
              {f === "all" ? "All Payments" : paymentStatusLabels[f]}
            </button>
          ))}
        </div>
      </div>

      <div className="admin-ticket-filters" style={{ marginBottom: 20 }}>
        {(["all", "pending", "processing", "delivered", "cancelled"] as FulfillmentFilter[]).map(
          (f) => (
            <button
              key={f}
              type="button"
              className={`stock-filter-btn${fulfillmentFilter === f ? " active" : ""}`}
              onClick={() => setFulfillmentFilter(f)}
            >
              {f === "all" ? "All Status" : f === "pending" ? "Order Pending" : fulfillmentStatusLabels[f]}
            </button>
          )
        )}
      </div>

      <div className="admin-tickets-layout">
        <section className="admin-panel glass admin-tickets-list">
          <h2>Orders ({orders.length})</h2>
          {orders.length === 0 ? (
            <p className="stock-empty-text">No orders yet.</p>
          ) : (
            <ul className="admin-ticket-items">
              {orders.map((o) => {
                const expiryIso = getOrderExpiryIso(o);
                const expired = isServerExpired(expiryIso);
                return (
                <li key={o.id}>
                  <button
                    type="button"
                    className={`admin-ticket-item${selected?.id === o.id ? " active" : ""}`}
                    onClick={() => handleSelect(o)}
                  >
                    <div className="admin-ticket-item__top">
                      <strong>{o.id}</strong>
                      <span className={`status-badge status-badge--${o.paymentStatus === "received" ? "paid" : o.paymentStatus === "not_received" ? "closed" : "pending"}`}>
                        {getAdminPaymentLabel(o)}
                      </span>
                    </div>
                    <span className="admin-ticket-item__subject">
                      IP {getOrderTitle(o)} × {o.quantity}
                    </span>
                    <span className="admin-ticket-item__meta">
                      {o.userName} · ₹{o.totalAmount.toLocaleString("en-IN")}
                    </span>
                    <span className="admin-ticket-item__meta admin-ticket-item__meta--dates">
                      Ordered {formatOrderDate(o.createdAt)}
                      {" · "}
                      Exp {formatServerExpiry(expiryIso)}
                      {expired ? " · Expired" : ""}
                    </span>
                    <span className={`status-badge status-badge--${o.fulfillmentStatus === "delivered" ? "paid" : o.fulfillmentStatus === "cancelled" ? "closed" : "open"}`}>
                      {getAdminFulfillmentLabel(o)}
                    </span>
                  </button>
                </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="admin-panel glass admin-ticket-detail">
          {selected ? (
            <>
              <div className="admin-ticket-detail__header">
                <div>
                  <div className="ticket-detail__badges">
                    <span className={`status-badge status-badge--${selected.paymentStatus === "received" ? "paid" : selected.paymentStatus === "not_received" ? "closed" : "pending"}`}>
                      {getAdminPaymentLabel(selected)}
                    </span>
                    <span className={`status-badge status-badge--${selected.fulfillmentStatus === "delivered" ? "paid" : selected.fulfillmentStatus === "cancelled" ? "closed" : "open"}`}>
                      {getAdminFulfillmentLabel(selected)}
                    </span>
                  </div>
                  {isCashfreePaymentConfirmed(selected) && (
                    <div className="admin-order-alert admin-order-alert--cashfree">
                      <strong>Payment Confirmed via Cashfree</strong>
                      <span>Order Pending — deliver IP, username &amp; password to customer.</span>
                    </div>
                  )}
                  <h2 className="order-card__series">IP {getOrderTitle(selected)}</h2>
                  <p className="order-card__subtitle">{getOrderSubtitle(selected)}</p>
                  <p className="admin-order-id-line">
                    {selected.id} · {selected.userName} ({selected.userEmail})
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

              <div className="order-detail-grid">
                <div className="order-detail-box">
                  <h3>Order Details</h3>
                  <ul>
                    <li><span>Order Date</span><strong>{formatOrderDate(selected.createdAt)}</strong></li>
                    <li>
                      <span>Expiry Date</span>
                      <strong className={selectedExpired ? "admin-order-expiry--expired" : undefined}>
                        {selectedExpiry ? formatServerExpiry(selectedExpiry) : "—"}
                        {selectedExpired ? " (Expired)" : ""}
                      </strong>
                    </li>
                    <li><span>Type</span><strong>{stockTypeLabels[selected.stockType]}</strong></li>
                    <li><span>IP Series</span><strong>{selected.series}</strong></li>
                    <li><span>Quantity</span><strong>{selected.quantity} pcs</strong></li>
                    <li><span>Unit Price</span><strong>₹{selected.unitPrice.toLocaleString("en-IN")}</strong></li>
                    <li><span>Total</span><strong>₹{selected.totalAmount.toLocaleString("en-IN")}</strong></li>
                    <li><span>Region</span><strong>{selected.region}</strong></li>
                    <li><span>Specs</span><strong>{selected.specs}</strong></li>
                    {selected.port && (
                      <li><span>Port</span><strong>{selected.port}</strong></li>
                    )}
                    {selected.os && selected.os !== "N/A" && (
                      <li><span>OS</span><strong>{selected.os}</strong></li>
                    )}
                    <li>
                      <span>Payment via</span>
                      <strong>{selected.paymentGateway === "cashfree" ? "Cashfree" : "Manual"}</strong>
                    </li>
                    {selected.cashfreeOrderStatus && (
                      <li>
                        <span>Cashfree Status</span>
                        <strong>{selected.cashfreeOrderStatus}</strong>
                      </li>
                    )}
                  </ul>
                </div>

                <div className="order-detail-box">
                  <h3>Customer</h3>
                  <ul>
                    <li><span>Name</span><strong>{selected.userName}</strong></li>
                    <li><span>Email</span><strong>{selected.userEmail}</strong></li>
                  </ul>
                </div>
              </div>

              <div className="order-admin-actions">
                <h3>Payment</h3>
                {selected.paymentGateway === "cashfree" && selected.paymentStatus === "received" ? (
                  <div className="order-delivered-creds glass">
                    <p className="order-delivered-creds__title">
                      ✓ Payment Confirmed — Cashfree (auto)
                    </p>
                    <p style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
                      Status: {selected.cashfreeOrderStatus || "PAID"} · No manual payment action needed.
                    </p>
                  </div>
                ) : (
                  <div className="order-admin-actions__btns">
                    <button
                      type="button"
                      className={`btn btn--sm${selected.paymentStatus === "received" ? " btn--primary" : " btn--outline"}`}
                      onClick={() => patch({ paymentStatus: "received" })}
                    >
                      ✓ Payment Confirmed
                    </button>
                    <button
                      type="button"
                      className={`btn btn--sm${selected.paymentStatus === "not_received" ? " btn--primary" : " btn--outline"}`}
                      onClick={() => patch({ paymentStatus: "not_received" })}
                    >
                      ✕ Payment Not Received
                    </button>
                    <button
                      type="button"
                      className={`btn btn--sm${selected.paymentStatus === "pending" ? " btn--primary" : " btn--outline"}`}
                      onClick={() => patch({ paymentStatus: "pending" })}
                    >
                      Reset to Pending
                    </button>
                  </div>
                )}
              </div>

              <div className="order-admin-actions">
                <h3>Fulfillment — give IP & login to customer</h3>
                <div className="order-admin-actions__btns" style={{ marginBottom: 16 }}>
                  <button
                    type="button"
                    className={`btn btn--sm${selected.fulfillmentStatus === "processing" ? " btn--primary" : " btn--outline"}`}
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
                <p className="admin-panel__note" style={{ marginBottom: 12 }}>
                  API auto-deliver is OFF. Enter IP, username and password below, then deliver manually.
                </p>
                {saveSuccess ? (
                  <p className="admin-panel__note" style={{ marginBottom: 12 }}>
                    {saveSuccess}
                  </p>
                ) : null}

                {selected.fulfillmentStatus === "delivered" ? (
                  <div className="order-deliver-form">
                    <p className="order-delivered-creds__title">
                      ✓ Delivered — {deliverUnits.length} unit
                      {deliverUnits.length > 1 ? "s" : ""} (edit if wrong)
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
                        </div>
                      </div>
                    ))}
                    {deliverError && (
                      <div className="auth-form__error">{deliverError}</div>
                    )}
                    {saveSuccess && (
                      <div className="ticket-toast ticket-toast--success">{saveSuccess}</div>
                    )}
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
                    <p className="admin-panel__note" style={{ marginBottom: 12 }}>
                      Quantity <strong>{selected.quantity}</strong> — har unit ke liye alag
                      IP / username / password bharein.
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
                                      "Administrator / VPS user (not root)"
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
                        </div>
                      </div>
                    ))}
                    {deliverError && (
                      <div className="auth-form__error">{deliverError}</div>
                    )}
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

              <div className="auth-form__field">
                <label htmlFor="admin-order-note">Admin note (internal)</label>
                <textarea
                  id="admin-order-note"
                  rows={3}
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                  placeholder="e.g. Sent credentials via email, UPI ref: 12345..."
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
            <div className="admin-ticket-empty">
              <div className="ticket-detail__empty-icon">📦</div>
              <p>Select an order to verify payment and deliver manually.</p>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
