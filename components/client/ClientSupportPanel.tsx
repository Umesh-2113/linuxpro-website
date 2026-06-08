"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { getUser } from "@/lib/auth";
import {
  addTicketReply,
  closeTicket,
  createTicket,
  formatTicketDate,
  getTicketRelativeTime,
  getTicketStats,
  getTicketsByUser,
  type SupportTicket,
  type TicketPriority,
  type TicketStatus,
} from "@/lib/tickets";

const statusLabels: Record<TicketStatus, string> = {
  open: "Open",
  answered: "Answered",
  closed: "Closed",
};

export function ClientSupportPanel() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [selected, setSelected] = useState<SupportTicket | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [priority, setPriority] = useState<TicketPriority>("medium");
  const [followUp, setFollowUp] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | TicketStatus>("all");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const load = useCallback(() => {
    const user = getUser();
    if (!user) return;
    const all = getTicketsByUser(user.email);
    setTickets(all);
    setSelected((prev) => {
      if (!prev) return null;
      return all.find((t) => t.id === prev.id) ?? null;
    });
  }, []);

  useEffect(() => {
    load();
    window.addEventListener("tickets-updated", load);
    return () => window.removeEventListener("tickets-updated", load);
  }, [load]);

  const stats = getTicketStats(getUser()?.email);
  const filtered = tickets.filter((t) => {
    const matchesFilter = filter === "all" || t.status === filter;
    const q = search.toLowerCase();
    const matchesSearch =
      !q ||
      t.id.toLowerCase().includes(q) ||
      t.subject.toLowerCase().includes(q);
    return matchesFilter && matchesSearch;
  });

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    const user = getUser();
    if (!user) return;

    if (!subject.trim() || !message.trim()) {
      setError("Please fill in subject and message.");
      return;
    }

    const ticket = await createTicket({
      subject: subject.trim(),
      message: message.trim(),
      userName: user.name,
      userEmail: user.email,
      priority,
    });

    setSubject("");
    setMessage("");
    setPriority("medium");
    setShowForm(false);
    setSelected(ticket);
    setSuccess("Ticket created successfully. Our team will respond shortly.");
    load();
  };

  const handleFollowUp = () => {
    void (async () => {
      if (!selected || !followUp.trim()) return;
      const user = getUser();
      if (!user) return;

      await addTicketReply(selected.id, {
        author: "user",
        authorName: user.name,
        message: followUp.trim(),
      });
      setFollowUp("");
      setSuccess("Your message has been sent.");
      load();
    })();
  };

  const handleClose = () => {
    void (async () => {
      if (!selected) return;
      await closeTicket(selected.id);
      setSuccess("Ticket marked as closed.");
      load();
    })();
  };

  const handleSelect = (ticket: SupportTicket) => {
    setSelected(ticket);
    setFollowUp("");
    setSuccess("");
    setShowForm(false);
  };

  return (
    <>
      <header className="client-topbar">
        <div>
          <h1>Support Center</h1>
          <p>24/7 expert help — track tickets and chat with our team.</p>
        </div>
        <button
          type="button"
          className="btn btn--primary btn--sm"
          onClick={() => {
            setShowForm(!showForm);
            setSelected(null);
          }}
        >
          {showForm ? "Cancel" : "+ New Ticket"}
        </button>
      </header>

      <div className="ticket-stats">
        <div className="ticket-stats__card glass">
          <span className="ticket-stats__icon">📋</span>
          <div>
            <strong>{stats.total}</strong>
            <span>Total Tickets</span>
          </div>
        </div>
        <div className="ticket-stats__card glass ticket-stats__card--open">
          <span className="ticket-stats__icon">🔓</span>
          <div>
            <strong>{stats.open}</strong>
            <span>Open</span>
          </div>
        </div>
        <div className="ticket-stats__card glass ticket-stats__card--answered">
          <span className="ticket-stats__icon">💬</span>
          <div>
            <strong>{stats.answered}</strong>
            <span>Answered</span>
          </div>
        </div>
        <div className="ticket-stats__card glass ticket-stats__card--closed">
          <span className="ticket-stats__icon">✓</span>
          <div>
            <strong>{stats.closed}</strong>
            <span>Closed</span>
          </div>
        </div>
      </div>

      {success && <div className="ticket-toast ticket-toast--success">{success}</div>}

      {showForm && (
        <form className="ticket-form glass" onSubmit={handleSubmit}>
          <div className="ticket-form__header">
            <h2>Raise a Support Ticket</h2>
            <p>Describe your issue and we&apos;ll get back to you fast.</p>
          </div>
          {error && <div className="auth-form__error">{error}</div>}
          <div className="ticket-form__grid">
            <div className="auth-form__field">
              <label htmlFor="ticket-subject">Subject</label>
              <input
                id="ticket-subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Brief description of your issue"
                required
              />
            </div>
            <div className="auth-form__field">
              <label htmlFor="ticket-priority">Priority</label>
              <select
                id="ticket-priority"
                value={priority}
                onChange={(e) => setPriority(e.target.value as TicketPriority)}
              >
                <option value="low">Low — General question</option>
                <option value="medium">Medium — Needs attention</option>
                <option value="high">High — Urgent / server down</option>
              </select>
            </div>
          </div>
          <div className="auth-form__field">
            <label htmlFor="ticket-message">Message</label>
            <textarea
              id="ticket-message"
              rows={5}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Include server IP, error logs, or steps to reproduce..."
              required
            />
          </div>
          <button type="submit" className="btn btn--primary">
            Submit Ticket
          </button>
        </form>
      )}

      <div className="ticket-layout">
        <aside className="ticket-sidebar glass">
          <div className="ticket-sidebar__toolbar">
            <input
              type="search"
              className="ticket-search"
              placeholder="Search tickets..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <div className="ticket-filters">
              {(["all", "open", "answered", "closed"] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  className={`ticket-filter-btn${filter === f ? " active" : ""}`}
                  onClick={() => setFilter(f)}
                >
                  {f === "all" ? "All" : statusLabels[f]}
                </button>
              ))}
            </div>
          </div>

          <ul className="ticket-list">
            {filtered.length === 0 ? (
              <li className="ticket-list__empty">
                <span>🎫</span>
                <p>No tickets found.</p>
                <button
                  type="button"
                  className="btn btn--outline btn--sm"
                  onClick={() => setShowForm(true)}
                >
                  Create one
                </button>
              </li>
            ) : (
              filtered.map((t) => (
                <li key={t.id}>
                  <button
                    type="button"
                    className={`ticket-list-item${selected?.id === t.id ? " active" : ""}`}
                    onClick={() => handleSelect(t)}
                  >
                    <div className="ticket-list-item__top">
                      <strong>{t.id}</strong>
                      <span className={`status-badge status-badge--${t.status}`}>
                        {statusLabels[t.status]}
                      </span>
                    </div>
                    <span className="ticket-list-item__subject">{t.subject}</span>
                    <div className="ticket-list-item__meta">
                      <span className={`priority-badge priority-badge--${t.priority}`}>
                        {t.priority}
                      </span>
                      <span>{getTicketRelativeTime(t)}</span>
                    </div>
                  </button>
                </li>
              ))
            )}
          </ul>
        </aside>

        <section className="ticket-detail glass">
          {selected ? (
            <>
              <div className="ticket-detail__header">
                <div>
                  <div className="ticket-detail__badges">
                    <span className={`status-badge status-badge--${selected.status}`}>
                      {statusLabels[selected.status]}
                    </span>
                    <span className={`priority-badge priority-badge--${selected.priority}`}>
                      {selected.priority} priority
                    </span>
                  </div>
                  <h2>{selected.subject}</h2>
                  <p>
                    {selected.id} · Opened {formatTicketDate(selected.createdAt)}
                  </p>
                </div>
                {selected.status !== "closed" && (
                  <button
                    type="button"
                    className="btn btn--ghost btn--sm"
                    onClick={handleClose}
                  >
                    Close Ticket
                  </button>
                )}
              </div>

              <div className="ticket-thread">
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
                          {r.author === "admin" ? "LinuxPro Support" : r.authorName}
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
                  <label htmlFor="follow-up">Add a follow-up</label>
                  <textarea
                    id="follow-up"
                    rows={3}
                    value={followUp}
                    onChange={(e) => setFollowUp(e.target.value)}
                    placeholder="Reply to continue the conversation..."
                  />
                  <button
                    type="button"
                    className="btn btn--primary btn--sm"
                    onClick={handleFollowUp}
                    disabled={!followUp.trim()}
                  >
                    Send Message
                  </button>
                </div>
              )}

              {selected.status === "closed" && (
                <div className="ticket-closed-notice">
                  This ticket is closed. Open a new ticket if you need further help.
                </div>
              )}
            </>
          ) : (
            <div className="ticket-detail__empty">
              <div className="ticket-detail__empty-icon">💬</div>
              <h3>Select a ticket</h3>
              <p>Choose a ticket from the list to view the full conversation.</p>
              <button
                type="button"
                className="btn btn--primary"
                onClick={() => setShowForm(true)}
              >
                + New Ticket
              </button>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
