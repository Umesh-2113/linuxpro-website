import { invoices } from "@/lib/client-data";

export default function BillingPage() {
  return (
    <>
      <header className="client-topbar">
        <div>
          <h1>Billing</h1>
          <p>Invoices, payment methods, and billing history.</p>
        </div>
      </header>

      <div className="client-billing-summary">
        <div className="client-stat-card glass">
          <span className="client-stat-card__label">Current Balance</span>
          <span className="client-stat-card__value">₹1,598</span>
          <button type="button" className="btn btn--primary btn--sm">Pay Now</button>
        </div>
        <div className="client-stat-card glass">
          <span className="client-stat-card__label">Payment Method</span>
          <span className="client-stat-card__value" style={{ fontSize: "1.1rem" }}>
            •••• 4242
          </span>
          <span className="client-stat-card__label">Visa ending 4242</span>
        </div>
      </div>

      <section className="client-panel glass">
        <div className="client-panel__header">
          <h2>Invoice History</h2>
        </div>
        <div className="client-table-wrap">
          <table className="client-table">
            <thead>
              <tr>
                <th>Invoice</th>
                <th>Date</th>
                <th>Description</th>
                <th>Amount</th>
                <th>Status</th>
                <th />
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
                    <span className={`status-badge status-badge--${inv.status}`}>{inv.status}</span>
                  </td>
                  <td>
                    <button type="button" className="btn btn--ghost btn--sm">Download</button>
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
