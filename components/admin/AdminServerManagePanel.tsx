"use client";

import { useCallback, useEffect, useState } from "react";
import {
  actionStatusLabels,
  deleteServerAction,
  formatActionDate,
  getActionDisplayLabel,
  getActionStats,
  getServerActions,
  reinstallOsLabels,
  updateServerAction,
  type ServerActionRequest,
  type ServerActionStatus,
} from "@/lib/server-actions";
import { getServerById, updateUserServer } from "@/lib/user-servers";

type StatusFilter = "all" | ServerActionStatus;

function powerStateForAction(action: ServerActionRequest["action"]) {
  if (action === "start" || action === "restart") return "running" as const;
  if (action === "stop") return "stopped" as const;
  return null;
}

export function AdminServerManagePanel() {
  const [actions, setActions] = useState<ServerActionRequest[]>([]);
  const [selected, setSelected] = useState<ServerActionRequest | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [search, setSearch] = useState("");
  const [adminNote, setAdminNote] = useState("");
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [deliverError, setDeliverError] = useState("");

  const load = useCallback(() => {
    let list = getServerActions();
    if (statusFilter !== "all") {
      list = list.filter((a) => a.status === statusFilter);
    }
    const q = search.toLowerCase();
    if (q) {
      list = list.filter(
        (a) =>
          a.id.toLowerCase().includes(q) ||
          a.serverIp.toLowerCase().includes(q) ||
          a.serverName.toLowerCase().includes(q) ||
          a.userName.toLowerCase().includes(q) ||
          a.userEmail.toLowerCase().includes(q) ||
          getActionDisplayLabel(a).toLowerCase().includes(q)
      );
    }
    setActions(list);
    setSelected((prev) => {
      if (!prev) return null;
      return getServerActions().find((a) => a.id === prev.id) ?? null;
    });
  }, [statusFilter, search]);

  useEffect(() => {
    load();
    window.addEventListener("server-actions-updated", load);
    return () => window.removeEventListener("server-actions-updated", load);
  }, [load]);

  useEffect(() => {
    setAdminNote(selected?.adminNote ?? "");
    if (selected?.action === "reinstall") {
      const server = getServerById(selected.serverId);
      setNewUsername(selected.newUsername ?? server?.username ?? "");
      setNewPassword(selected.newPassword ?? "");
    } else {
      setNewUsername("");
      setNewPassword("");
    }
    setDeliverError("");
  }, [selected]);

  const stats = getActionStats();

  const handleSelect = (action: ServerActionRequest) => {
    setSelected(action);
    setAdminNote(action.adminNote);
    if (action.action === "reinstall") {
      const server = getServerById(action.serverId);
      setNewUsername(action.newUsername ?? server?.username ?? "");
      setNewPassword(action.newPassword ?? "");
    } else {
      setNewUsername("");
      setNewPassword("");
    }
    setDeliverError("");
  };

  const reinstallCredentials = () => ({
    newUsername: newUsername.trim(),
    newPassword: newPassword.trim(),
  });

  const applyCompletionSideEffects = async (updated: ServerActionRequest) => {
    if (updated.action === "reinstall" && updated.newPassword && updated.newUsername) {
      await updateUserServer(updated.serverId, {
        username: updated.newUsername.trim(),
        password: updated.newPassword,
        os: updated.reinstallOs ? reinstallOsLabels[updated.reinstallOs] : undefined,
        powerState: "running",
      });
      return;
    }
    const power = powerStateForAction(updated.action);
    if (power) {
      await updateUserServer(updated.serverId, { powerState: power });
    }
  };

  const handleStatus = (status: ServerActionStatus) => {
    if (!selected) return;

    if (selected.action === "reinstall" && status === "completed") {
      const creds = reinstallCredentials();
      if (!creds.newPassword) {
        setDeliverError("Enter the new password before completing reinstall.");
        return;
      }
      if (!creds.newUsername) {
        setDeliverError("Enter the new username before completing reinstall.");
        return;
      }
    }

    const creds = reinstallCredentials();
    void (async () => {
      try {
        const updated = await updateServerAction(selected.id, {
          status,
          adminNote,
          newUsername: selected.action === "reinstall" ? creds.newUsername || undefined : undefined,
          newPassword: selected.action === "reinstall" ? creds.newPassword || undefined : undefined,
        });

        if (updated.status === "completed") {
          await applyCompletionSideEffects(updated);
        }
        setDeliverError("");
        load();
      } catch (error) {
        setDeliverError(
          error instanceof Error ? error.message : "Failed to update request."
        );
      }
    })();
  };

  const handleDeliverReinstall = () => {
    if (!selected || selected.action !== "reinstall") return;
    const creds = reinstallCredentials();
    if (!creds.newUsername) {
      setDeliverError("New username is required.");
      return;
    }
    if (!creds.newPassword) {
      setDeliverError("New password is required.");
      return;
    }

    void (async () => {
      try {
        const updated = await updateServerAction(selected.id, {
          status: "completed",
          adminNote,
          newUsername: creds.newUsername,
          newPassword: creds.newPassword,
        });

        await applyCompletionSideEffects(updated);
        setDeliverError("");
        load();
      } catch (error) {
        setDeliverError(
          error instanceof Error ? error.message : "Failed to deliver reinstall."
        );
      }
    })();
  };

  const handleSaveNote = () => {
    if (!selected) return;
    const creds = reinstallCredentials();
    void (async () => {
      await updateServerAction(selected.id, {
        adminNote,
        newUsername: selected.action === "reinstall" ? creds.newUsername || undefined : undefined,
        newPassword: selected.action === "reinstall" ? creds.newPassword || undefined : undefined,
      });
      load();
    })();
  };

  const handleDelete = async (id: string) => {
    if (confirm("Delete this action request permanently?")) {
      await deleteServerAction(id);
      if (selected?.id === id) setSelected(null);
      load();
    }
  };

  const isReinstall = selected?.action === "reinstall";

  return (
    <>
      <header className="admin-topbar">
        <div>
          <h1>Server Manage</h1>
          <p>
            Customer requests — start, stop, and OS reinstall with credential delivery.
            HostHeaven stock looks up the VM by server IP when you set Processing.
          </p>
        </div>
      </header>

      <div className="manage-stats">
        <div className="manage-stats__card glass">
          <strong>{stats.total}</strong>
          <span>Total Requests</span>
        </div>
        <div className="manage-stats__card glass manage-stats__card--pending">
          <strong>{stats.pending}</strong>
          <span>Pending</span>
        </div>
        <div className="manage-stats__card glass manage-stats__card--processing">
          <strong>{stats.processing}</strong>
          <span>Processing</span>
        </div>
        <div className="manage-stats__card glass manage-stats__card--completed">
          <strong>{stats.completed}</strong>
          <span>Completed</span>
        </div>
      </div>

      <div className="admin-order-toolbar">
        <input
          type="search"
          className="ticket-search"
          placeholder="Search IP, customer, action..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="admin-ticket-filters">
          {(["all", "pending", "processing", "completed", "rejected"] as StatusFilter[]).map(
            (f) => (
              <button
                key={f}
                type="button"
                className={`stock-filter-btn${statusFilter === f ? " active" : ""}`}
                onClick={() => setStatusFilter(f)}
              >
                {f === "all" ? "All" : actionStatusLabels[f]}
              </button>
            )
          )}
        </div>
      </div>

      <div className="admin-tickets-layout">
        <section className="admin-panel glass admin-tickets-list">
          <h2>Action Requests ({actions.length})</h2>
          {actions.length === 0 ? (
            <p className="admin-empty">No server action requests yet.</p>
          ) : (
            <ul className="manage-request-list">
              {actions.map((action) => (
                <li key={action.id}>
                  <button
                    type="button"
                    className={`manage-request-item${selected?.id === action.id ? " active" : ""}`}
                    onClick={() => handleSelect(action)}
                  >
                    <div className="manage-request-item__top">
                      <span className={`manage-action-badge manage-action-badge--${action.action}`}>
                        {getActionDisplayLabel(action)}
                      </span>
                      <span className={`manage-status-dot manage-status-dot--${action.status}`}>
                        {actionStatusLabels[action.status]}
                      </span>
                    </div>
                    <strong>{action.serverIp}</strong>
                    <span>
                      {action.userName} · {formatActionDate(action.createdAt)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="admin-panel glass admin-tickets-detail">
          {selected ? (
            <>
              <div className="manage-detail-header">
                <div>
                  <span className="manage-detail-id">{selected.id}</span>
                  <h2>{getActionDisplayLabel(selected)}</h2>
                  <p>Requested {formatActionDate(selected.createdAt)}</p>
                </div>
                <span className={`manage-status-pill manage-status-pill--${selected.status}`}>
                  {actionStatusLabels[selected.status]}
                </span>
              </div>

              <div className="manage-detail-grid">
                <div className="manage-detail-block">
                  <span>Customer</span>
                  <strong>{selected.userName}</strong>
                  <small>{selected.userEmail}</small>
                </div>
                <div className="manage-detail-block">
                  <span>Server IP</span>
                  <strong className="text-primary">{selected.serverIp}</strong>
                </div>
                <div className="manage-detail-block">
                  <span>Server Name</span>
                  <strong>{selected.serverName}</strong>
                </div>
                <div className="manage-detail-block">
                  <span>Order ID</span>
                  <strong>{selected.orderId}</strong>
                </div>
              </div>

              {isReinstall && (
                <div className="manage-reinstall-panel">
                  <h3>OS Reinstall Request</h3>
                  <div className="manage-reinstall-os">
                    <span>Requested OS</span>
                    <strong>
                      {selected.reinstallOs
                        ? reinstallOsLabels[selected.reinstallOs]
                        : "Not specified"}
                    </strong>
                  </div>

                  <div className="manage-reinstall-form">
                    <div className="manage-reinstall-form__grid">
                      <div>
                        <label htmlFor="reinstall-new-username">New Username</label>
                        <input
                          id="reinstall-new-username"
                          type="text"
                          className="auth-form__input"
                          value={newUsername}
                          onChange={(e) => setNewUsername(e.target.value)}
                          placeholder="Enter new server username"
                          disabled={selected.status === "completed"}
                        />
                      </div>
                      <div>
                        <label htmlFor="reinstall-new-password">New Password</label>
                        <input
                          id="reinstall-new-password"
                          type="text"
                          className="auth-form__input"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="Enter new server password"
                          disabled={selected.status === "completed"}
                        />
                      </div>
                    </div>
                    <p className="manage-detail-hint">
                      Username and password will be saved to the customer&apos;s server credentials
                      when you complete the request.
                    </p>
                    {deliverError && <p className="manage-reinstall-error">{deliverError}</p>}
                    {selected.status !== "completed" && (
                      <button
                        type="button"
                        className="btn btn--primary btn--block"
                        onClick={handleDeliverReinstall}
                      >
                        Deliver Credentials &amp; Mark Completed
                      </button>
                    )}
                    {selected.status === "completed" && (selected.newUsername || selected.newPassword) && (
                      <div className="manage-reinstall-delivered">
                        {selected.newUsername && (
                          <p>
                            Username delivered: <code>{selected.newUsername}</code>
                          </p>
                        )}
                        {selected.newPassword && (
                          <p>
                            Password delivered: <code>{selected.newPassword}</code>
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="manage-detail-actions">
                <h3>Update Status</h3>
                {deliverError && <p className="manage-reinstall-error">{deliverError}</p>}
                <div className="manage-status-buttons">
                  {(["pending", "processing", "completed", "rejected"] as ServerActionStatus[]).map(
                    (s) => (
                      <button
                        key={s}
                        type="button"
                        className={`btn btn--sm${selected.status === s ? " btn--primary" : " btn--outline"}`}
                        onClick={() => handleStatus(s)}
                      >
                        {actionStatusLabels[s]}
                      </button>
                    )
                  )}
                </div>
                {!isReinstall &&
                  selected.status === "completed" &&
                  (selected.action === "start" || selected.action === "stop") && (
                    <p className="manage-detail-hint">
                      Completing updates the customer&apos;s power state automatically.
                    </p>
                  )}
              </div>

              <div className="manage-detail-note">
                <label htmlFor="manage-admin-note">Admin Note</label>
                <textarea
                  id="manage-admin-note"
                  rows={3}
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                  placeholder="Internal note or message for customer..."
                />
                <button type="button" className="btn btn--outline btn--sm" onClick={handleSaveNote}>
                  Save Note
                </button>
              </div>

              <button
                type="button"
                className="btn btn--danger btn--sm manage-delete-btn"
                onClick={() => handleDelete(selected.id)}
              >
                Delete Request
              </button>
            </>
          ) : (
            <div className="admin-empty admin-empty--center">
              <p>Select a request to view customer action details.</p>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
