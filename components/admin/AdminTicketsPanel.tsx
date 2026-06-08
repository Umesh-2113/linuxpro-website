"use client";

import { useCallback, useEffect, useState } from "react";
import {
  addTicketReply,
  deleteTicket,
  formatTicketDate,
  getTicketRelativeTime,
  getTicketStats,
  getTickets,
  updateTicket,
  type SupportTicket,
  type TicketPriority,
  type TicketStatus,
} from "@/lib/tickets";

const statusLabels: Record<TicketStatus, string> = {
  open: "Open",
  answered: "Answered",
  closed: "Closed",
};

export function AdminTicketsPanel() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [selected, setSelected] = useState<SupportTicket | null>(null);
  const [reply, setReply] = useState("");
  const [filter, setFilter] = useState<"all" | TicketStatus>("all");
  const [search, setSearch] = useState("");

  const load = useCallback(() => {
    const all = getTickets();
    const q = search.toLowerCase();
    let filtered = filter === "all" ? all : all.filter((t) => t.status === filter);
    if (q) {
      filtered = filtered.filter(
        (t) =>
          t.id.toLowerCase().includes(q) ||
          t.subject.toLowerCase().includes(q) ||
          t.userName.toLowerCase().includes(q) ||
          t.userEmail.toLowerCase().includes(q)
      );
    }
    setTickets(filtered);
    setSelected((prev) => {
      if (!prev) return null;
      return all.find((t) => t.id === prev.id) ?? null;
    });
  }, [filter, search]);

  useEffect(() => {
    load();
    const onUpdate = () => load();
    window.addEventListener("tickets-updated", onUpdate);
    return () => window.removeEventListener("tickets-updated", onUpdate);
  }, [load]);

  const stats = getTicketStats();

  const handleSelect = (ticket: SupportTicket) => {
    setSelected(ticket);
    setReply("");
  };

  const handleReply = () => {
    void (async () => {
      if (!selected || !reply.trim()) return;
      await addTicketReply(selected.id, {
        author: "admin",
        authorName: "LinuxPro Support",
        message: reply.trim(),
      });
      setReply("");
      load();
    })();
  };

  const handleStatus = (status: TicketStatus) => {
    void (async () => {
      if (!selected) return;
      await updateTicket(selected.id, { status });
      load();
    })();
  };

  const handlePriority = (priority: TicketPriority) => {
    void (async () => {
      if (!selected) return;
      await updateTicket(selected.id, { priority });
      load();
    })();
  };

  const handleDelete = async (id: string) => {
    if (confirm("Delete this ticket permanently?")) {
      await deleteTicket(id);
      if (selected?.id === id) setSelected(null);
      load();
    }
  };

  return (
    <>
      <header className="admin-topbar">
        <div>
          <h1>Support Tickets</h1>
          <p>Manage and respond to client support requests.</p>
        </div>
      </header>

      <div className="ticket-stats ticket-stats--admin">
        <div className="ticket-stats__card glass">
          <strong>{stats.total}</strong>
          <span>Total</span>
        </div>
        <div className="ticket-stats__card glass ticket-stats__card--open">
          <strong>{stats.open}</strong>
          <span>Open</span>
        </div>
        <div className="ticket-stats__card glass ticket-stats__card--answered">
          <strong>{stats.answered}</strong>
          <span>Answered</span>
        </div>
        <div className="ticket-stats__card glass ticket-stats__card--closed">
          <strong>{stats.closed}</strong>
          <span>Closed</span>
        </div>
      </div>

      <div className="admin-ticket-toolbar">
        <input
          type="search"
          className="ticket-search"
          placeholder="Search by ID, subject, user..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="admin-ticket-filters">
          {(["all", "open", "answered", "closed"] as const).map((f) => (
            <button
              key={f}
              type="button"
              className={`stock-filter-btn${filter === f ? " active" : ""}`}
              onClick={() => setFilter(f)}
            >
              {f === "all" ? "All" : statusLabels[f]}
            </button>
          ))}
        </div>
      </div>

      <div className="admin-tickets-layout">
        <section className="admin-panel glass admin-tickets-list">
          <h2>Tickets ({tickets.length})</h2>
          {tickets.length === 0 ? (
            <p className="stock-empty-text">No tickets match your filters.</p>
          ) : (
            <ul className="admin-ticket-items">
              {tickets.map((t) => (
                <li key={t.id}>
                  <button
                    type="button"
                    className={`admin-ticket-item${selected?.id === t.id ? " active" : ""}`}
                    onClick={() => handleSelect(t)}
                  >
                    <div className="admin-ticket-item__top">
                      <strong>{t.id}</strong>
                      <span className={`status-badge status-badge--${t.status}`}>
                        {statusLabels[t.status]}
                      </span>
                    </div>
                    <span className="admin-ticket-item__subject">{t.subject}</span>
                    <span className="admin-ticket-item__meta">
                      {t.userName} · {getTicketRelativeTime(t)}
                    </span>
                    <span className={`priority-badge priority-badge--${t.priority}`}>
                      {t.priority}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="admin-panel glass admin-ticket-detail">
          {selected ? (
            <>
              <div className="admin-ticket-detail__header">
                <div>
                  <div className="ticket-detail__badges">
                    <span className={`status-badge status-badge--${selected.status}`}>
                      {statusLabels[selected.status]}
                    </span>
                    <span className={`priority-badge priority-badge--${selected.priority}`}>
                      {selected.priority}
                    </span>
                  </div>
                  <h2>{selected.subject}</h2>
                  <p>
                    {selected.userName} ({selected.userEmail}) · {selected.id} ·{" "}
                    {formatTicketDate(selected.createdAt)}
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

              <div className="admin-ticket-controls">
                <div className="auth-form__field">
                  <label>Status</label>
                  <select
                    value={selected.status}
                    onChange={(e) => handleStatus(e.target.value as TicketStatus)}
                  >
                    <option value="open">Open</option>
                    <option value="answered">Answered</option>
                    <option value="closed">Closed</option>
                  </select>
                </div>
                <div className="auth-form__field">
                  <label>Priority</label>
                  <select
                    value={selected.priority}
                    onChange={(e) => handlePriority(e.target.value as TicketPriority)}
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
              </div>

              <div className="ticket-thread ticket-thread--admin">
                {selected.replies.map((r) => (
                  <div
                    key={r.id}
                    className={`ticket-bubble ticket-bubble--${r.author}`}
                  >
                    <div className="ticket-bubble__avatar">
                      {r.author === "admin" ? "LP" : r.authorName.charAt(0)}
                    </div>
                    <div className="ticket-bubble__body">
                      <div className="ticket-bubble__meta">
                        <strong>
                          {r.author === "admin"
                            ? "LinuxPro Support"
                            : `${r.authorName} (Client)`}
                        </strong>
                        <span>{formatTicketDate(r.createdAt)}</span>
                      </div>
                      <p>{r.message}</p>
                    </div>
                  </div>
                ))}
              </div>

              {selected.status !== "closed" && (
                <div className="ticket-reply-box">
                  <label htmlFor="admin-reply">Reply to client</label>
                  <textarea
                    id="admin-reply"
                    rows={4}
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                    placeholder="Type your reply — client will see it in their support center..."
                  />
                  <div className="ticket-reply-box__actions">
                    <button
                      type="button"
                      className="btn btn--primary"
                      onClick={handleReply}
                      disabled={!reply.trim()}
                    >
                      Send Reply
                    </button>
                    <button
                      type="button"
                      className="btn btn--ghost btn--sm"
                      onClick={() => handleStatus("closed")}
                    >
                      Close Ticket
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="admin-ticket-empty">
              <div className="ticket-detail__empty-icon">🎫</div>
              <p>Select a ticket to view the conversation and reply.</p>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
