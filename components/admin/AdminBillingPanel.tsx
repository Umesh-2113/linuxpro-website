import { invoices } from "@/lib/client-data";

export function AdminBillingPanel() {
  const totalDue = invoices
    .filter((i) => i.status === "due")
    .reduce((s, i) => s + i.amount, 0);
  const totalPaid = invoices
    .filter((i) => i.status === "paid")
    .reduce((s, i) => s + i.amount, 0);

  return (
    <>
      <header className="admin-topbar">
        <div>
          <h1>Billing</h1>
          <p>Overview of invoices and payment status.</p>
        </div>
      </header>

      <div className="admin-stats-grid admin-stats-grid--3">
        <div className="admin-stat-card glass">
          <span className="admin-stat-card__label">Total Invoices</span>
          <span className="admin-stat-card__value">{invoices.length}</span>
        </div>
        <div className="admin-stat-card glass admin-stat-card--danger">
          <span className="admin-stat-card__label">Amount Due</span>
          <span className="admin-stat-card__value">₹{totalDue}</span>
        </div>
        <div className="admin-stat-card glass admin-stat-card--primary">
          <span className="admin-stat-card__label">Total Paid</span>
          <span className="admin-stat-card__value">₹{totalPaid}</span>
        </div>
      </div>

      <section className="admin-panel glass">
        <h2>All Invoices</h2>
        <div className="client-table-wrap">
          <table className="client-table">
            <thead>
              <tr>
                <th>Invoice</th>
                <th>Date</th>
                <th>Description</th>
                <th>Amount</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <tr key={inv.id}>
                  <td><strong>{inv.id}</strong></td>
                  <td>{inv.date}</td>
                  <td>{inv.item}</td>
                  <td>₹{inv.amount}</td>
                  <td>
                    <span className={`status-badge status-badge--${inv.status}`}>
                      {inv.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
