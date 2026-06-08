import { AnimateOnScroll } from "./AnimateOnScroll";
import { compareRows } from "@/lib/data";

export function Compare() {
  const columns = ["Starter", "Business", "Pro", "Enterprise"];

  return (
    <section className="compare" id="compare">
      <div className="container">
        <AnimateOnScroll className="section-header">
          <span className="section-tag">Compare</span>
          <h2 className="section-title">Plan Comparison</h2>
          <p className="section-desc">
            Find the right plan for your workload with our detailed comparison table.
          </p>
        </AnimateOnScroll>
        <AnimateOnScroll>
          <div className="compare__wrapper glass">
            <table className="compare__table">
              <thead>
                <tr>
                  <th>Feature</th>
                  {columns.map((col, i) => (
                    <th key={col} className={i === 1 ? "highlight" : undefined}>
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {compareRows.map((row) => (
                  <tr key={row.feature}>
                    <td>{row.feature}</td>
                    {row.values.map((val, i) => (
                      <td key={i} className={i === 1 ? "highlight" : undefined}>
                        {typeof val === "boolean" ? (
                          val ? <span className="check">✓</span> : "—"
                        ) : (
                          val
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </AnimateOnScroll>
      </div>
    </section>
  );
}
