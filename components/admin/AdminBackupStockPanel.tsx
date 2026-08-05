"use client";

import { useEffect, useMemo, useState } from "react";
import {
  addBackupStockBulk,
  addBackupStockItem,
  deleteBackupStockItem,
  fetchBackupStock,
  getBackupStock,
  updateBackupStockItem,
  type BackupStockItem,
  type BackupStockStatus,
} from "@/lib/backup-stock";
import { stockTypeLabels, type StockType } from "@/lib/stock";

type FormState = {
  type: StockType;
  series: string;
  ip: string;
  username: string;
  password: string;
  port: string;
  os: string;
  region: string;
  note: string;
};

const emptyForm: FormState = {
  type: "vps",
  series: "",
  ip: "",
  username: "",
  password: "",
  port: "",
  os: "Ubuntu 22.04",
  region: "Mumbai",
  note: "",
};

function defaultsForType(type: StockType): Partial<FormState> {
  if (type === "proxy") {
    return { port: "8000", os: "N/A", username: "user" };
  }
  if (type === "linux") {
    return { port: "22", os: "Ubuntu 22.04", username: "root" };
  }
  // VPS: no port field; username is separate (not root by default)
  return { port: "", os: "Ubuntu 22.04", username: "" };
}

export function AdminBackupStockPanel() {
  const [items, setItems] = useState<BackupStockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | BackupStockStatus>("all");
  const [typeFilter, setTypeFilter] = useState<"all" | StockType>("all");
  const [form, setForm] = useState<FormState>(emptyForm);
  const [bulk, setBulk] = useState("");
  const [bulkSeries, setBulkSeries] = useState("");
  const [bulkType, setBulkType] = useState<StockType>("vps");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = async () => {
    try {
      await fetchBackupStock();
      setItems(getBackupStock());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load backup stock.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    const onUpdate = () => void load();
    window.addEventListener("backup-stock-updated", onUpdate);
    return () => window.removeEventListener("backup-stock-updated", onUpdate);
  }, []);

  const counts = useMemo(() => {
    const free = items.filter((i) => i.status === "free");
    return {
      free: free.length,
      sold: items.filter((i) => i.status === "sold").length,
      reserved: items.filter((i) => i.status === "reserved").length,
      total: items.length,
      freeVps: free.filter((i) => i.type === "vps").length,
      freeLinux: free.filter((i) => i.type === "linux").length,
      freeProxy: free.filter((i) => i.type === "proxy").length,
    };
  }, [items]);

  const filtered = items.filter((item) => {
    if (statusFilter !== "all" && item.status !== statusFilter) return false;
    if (typeFilter !== "all" && item.type !== typeFilter) return false;
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return (
      item.ip.toLowerCase().includes(q) ||
      item.series.toLowerCase().includes(q) ||
      item.username.toLowerCase().includes(q) ||
      item.region.toLowerCase().includes(q) ||
      item.type.toLowerCase().includes(q) ||
      (item.orderId || "").toLowerCase().includes(q)
    );
  });

  const setFormType = (type: StockType) => {
    setForm((f) => ({ ...f, type, ...defaultsForType(type) }));
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const payload = {
        ...form,
        port: form.type === "vps" ? "" : form.port || "22",
      };
      await addBackupStockItem(payload);
      setForm({
        ...emptyForm,
        type: form.type,
        ...defaultsForType(form.type),
        region: form.region,
      });
      setMessage(`${stockTypeLabels[form.type]} backup unit added.`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add.");
    } finally {
      setSaving(false);
    }
  };

  const handleBulk = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const result = await addBackupStockBulk(bulk, {
        type: bulkType,
        series: bulkSeries || undefined,
        port: defaultsForType(bulkType).port,
        os: defaultsForType(bulkType).os,
      });
      setBulk("");
      setMessage(
        `Added ${result.created} ${stockTypeLabels[bulkType]} backup unit(s).`
      );
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bulk add failed.");
    } finally {
      setSaving(false);
    }
  };

  const handleStatus = async (id: string, status: BackupStockStatus) => {
    await updateBackupStockItem(id, {
      status,
      ...(status === "free" ? { orderId: "" } : {}),
    });
    await load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this backup unit?")) return;
    await deleteBackupStockItem(id);
    await load();
  };

  return (
    <>
      <header className="admin-topbar admin-topbar--actions">
        <div>
          <h1>Backup Stock</h1>
          <p>
            VPS, Linux IP aur Proxy warehouse. HostHeaven API pe free unit na mile to
            auto-deliver yahan se hota hai. Type order ke saath match kare (VPS ↔ Linux OK).
          </p>
        </div>
        <div className="admin-topbar__actions">
          <input
            type="search"
            className="admin-topbar__search"
            placeholder="Search IP, series, type, order…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search backup stock"
          />
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as typeof typeFilter)}
            aria-label="Filter type"
          >
            <option value="all">All types</option>
            <option value="vps">VPS</option>
            <option value="linux">Linux</option>
            <option value="proxy">Proxy</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
            aria-label="Filter status"
          >
            <option value="all">All status</option>
            <option value="free">Free</option>
            <option value="sold">Sold</option>
            <option value="reserved">Reserved</option>
          </select>
        </div>
      </header>

      <div className="admin-stats-grid" style={{ marginBottom: "1.25rem" }}>
        <div className="admin-stat-card">
          <span className="admin-stat-card__label">Free VPS</span>
          <strong className="admin-stat-card__value">{counts.freeVps}</strong>
        </div>
        <div className="admin-stat-card">
          <span className="admin-stat-card__label">Free Linux</span>
          <strong className="admin-stat-card__value">{counts.freeLinux}</strong>
        </div>
        <div className="admin-stat-card">
          <span className="admin-stat-card__label">Free Proxy</span>
          <strong className="admin-stat-card__value">{counts.freeProxy}</strong>
        </div>
        <div className="admin-stat-card">
          <span className="admin-stat-card__label">Sold / Total</span>
          <strong className="admin-stat-card__value">
            {counts.sold}/{counts.total}
          </strong>
          <span className="admin-stat-card__sub">{counts.reserved} reserved</span>
        </div>
      </div>

      {message && (
        <p className="form-success" style={{ marginBottom: "1rem" }}>
          {message}
        </p>
      )}
      {error && (
        <p className="form-error" style={{ marginBottom: "1rem" }}>
          {error}
        </p>
      )}

      <div className="admin-backup-forms">
        <form className="admin-stock__list-panel glass" onSubmit={handleAdd}>
          <div className="admin-stock__list-head">
            <h2>Add VPS / Linux / Proxy</h2>
          </div>
          <div className="admin-backup-form-body">
            <p className="stock-empty-text">
              Pehle <strong>Type</strong> choose karo. VPS pe port nahi — username alag hota hai.
              Linux IP pe <code>root</code> + port 22.
            </p>
            <div className="form-row form-row--2">
              <label className="form-field">
                <span>Type</span>
                <select
                  value={form.type}
                  onChange={(e) => setFormType(e.target.value as StockType)}
                >
                  {(Object.keys(stockTypeLabels) as StockType[]).map((t) => (
                    <option key={t} value={t}>
                      {stockTypeLabels[t]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="form-field">
                <span>Series (stock series jaisa)</span>
                <input
                  required
                  value={form.series}
                  placeholder="103.183"
                  onChange={(e) => setForm((f) => ({ ...f, series: e.target.value }))}
                />
              </label>
              <label className="form-field">
                <span>IP / Host</span>
                <input
                  required
                  value={form.ip}
                  placeholder="103.183.1.10"
                  onChange={(e) => setForm((f) => ({ ...f, ip: e.target.value }))}
                />
              </label>
              <label className="form-field">
                <span>
                  {form.type === "vps" ? "VPS Username" : "Username"}
                </span>
                <input
                  required
                  value={form.username}
                  placeholder={
                    form.type === "vps"
                      ? "VPS panel / login user"
                      : form.type === "linux"
                        ? "root"
                        : "user"
                  }
                  onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
                />
              </label>
              <label className="form-field">
                <span>Password</span>
                <input
                  required
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                />
              </label>
              {form.type !== "vps" && (
                <label className="form-field">
                  <span>Port</span>
                  <input
                    value={form.port}
                    onChange={(e) => setForm((f) => ({ ...f, port: e.target.value }))}
                  />
                </label>
              )}
              <label className="form-field">
                <span>OS</span>
                <input
                  value={form.os}
                  onChange={(e) => setForm((f) => ({ ...f, os: e.target.value }))}
                />
              </label>
              <label className="form-field">
                <span>Region</span>
                <input
                  value={form.region}
                  onChange={(e) => setForm((f) => ({ ...f, region: e.target.value }))}
                />
              </label>
            </div>
            <label className="form-field">
              <span>Note</span>
              <input
                value={form.note}
                onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
              />
            </label>
            <button type="submit" className="btn btn--primary" disabled={saving}>
              {saving ? "Saving…" : `Add backup ${stockTypeLabels[form.type]}`}
            </button>
          </div>
        </form>

        <form className="admin-stock__list-panel glass" onSubmit={handleBulk}>
          <div className="admin-stock__list-head">
            <h2>Bulk import</h2>
          </div>
          <div className="admin-backup-form-body">
            <p className="stock-empty-text">
              Default type choose karo, phir har line:{" "}
              <code>
                {bulkType === "vps"
                  ? "IP|username|password"
                  : "IP|username|password|port"}
              </code>
              {bulkType === "vps" ? " (VPS — port nahi)" : null}
            </p>
            <div className="form-row form-row--2">
              <label className="form-field">
                <span>Default type</span>
                <select
                  value={bulkType}
                  onChange={(e) => setBulkType(e.target.value as StockType)}
                >
                  {(Object.keys(stockTypeLabels) as StockType[]).map((t) => (
                    <option key={t} value={t}>
                      {stockTypeLabels[t]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="form-field">
                <span>Default series (optional)</span>
                <input
                  value={bulkSeries}
                  placeholder="Auto from IP if empty"
                  onChange={(e) => setBulkSeries(e.target.value)}
                />
              </label>
            </div>
            <label className="form-field">
              <span>Lines</span>
              <textarea
                rows={8}
                value={bulk}
                placeholder={
                  bulkType === "proxy"
                    ? "103.183.1.10|user|pass123|8000\n103.183.1.11|user|pass456|8000"
                    : bulkType === "vps"
                      ? "103.183.1.10|vpsuser|pass123\n103.183.1.11|admin|pass456"
                      : "103.183.1.10|root|pass123|22\n103.183.1.11|root|pass456|22"
                }
                onChange={(e) => setBulk(e.target.value)}
                required
              />
            </label>
            <button
              type="submit"
              className="btn btn--primary"
              disabled={saving || !bulk.trim()}
            >
              {saving
                ? "Importing…"
                : `Import as ${stockTypeLabels[bulkType]}`}
            </button>
          </div>
        </form>
      </div>

      <section className="admin-stock__list-panel glass">
        <div className="admin-stock__list-head">
          <h2>
            Backup inventory ({filtered.length})
            {typeFilter !== "all" ? ` · ${stockTypeLabels[typeFilter]}` : ""}
          </h2>
        </div>

        {loading ? (
          <p className="stock-empty-text">Loading…</p>
        ) : filtered.length === 0 ? (
          <p className="stock-empty-text">
            No backup units yet. Upar se VPS / Linux / Proxy add karo.
          </p>
        ) : (
          <div className="admin-stock-table-wrap">
            <table className="client-table admin-stock-table">
              <thead>
                <tr>
                  <th>IP / Host</th>
                  <th>Series</th>
                  <th>Type</th>
                  <th>User / Pass</th>
                  <th>Status</th>
                  <th>Order</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <strong>{item.ip}</strong>
                      {item.type !== "vps" && item.port ? (
                        <small> :{item.port}</small>
                      ) : null}
                    </td>
                    <td>{item.series}</td>
                    <td>
                      <span className={`stock-card__type stock-card__type--${item.type}`}>
                        {stockTypeLabels[item.type]}
                      </span>
                    </td>
                    <td>
                      <div>{item.username}</div>
                      <small>
                        <code>{item.password}</code>
                      </small>
                    </td>
                    <td>
                      <span
                        className={`stock-status stock-status--${
                          item.status === "free"
                            ? "in-stock"
                            : item.status === "sold"
                              ? "out-of-stock"
                              : "low-stock"
                        }`}
                      >
                        {item.status}
                      </span>
                    </td>
                    <td>
                      <small>{item.orderId || "—"}</small>
                    </td>
                    <td>
                      <div className="admin-stock-actions">
                        {item.status !== "free" && (
                          <button
                            type="button"
                            className="btn btn--ghost btn--sm"
                            onClick={() => void handleStatus(item.id, "free")}
                          >
                            Mark free
                          </button>
                        )}
                        {item.status === "free" && (
                          <button
                            type="button"
                            className="btn btn--ghost btn--sm"
                            onClick={() => void handleStatus(item.id, "reserved")}
                          >
                            Reserve
                          </button>
                        )}
                        <button
                          type="button"
                          className="btn btn--ghost btn--sm"
                          onClick={() => void handleDelete(item.id)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
