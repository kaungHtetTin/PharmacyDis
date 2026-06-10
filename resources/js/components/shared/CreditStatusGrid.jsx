export default function CreditStatusGrid({ rows = [] }) {
    return (
        <div className="credit-grid">
            {rows.map((row) => (
                <article className="credit-card" key={row.company}>
                    <div className="credit-card-head">
                        <strong>{row.company}</strong>
                        <span className={`base-pill ${row.status === 'Active' || row.status === 'Current' ? 'active' : ''}`}>{row.status}</span>
                    </div>
                    <small>{row.reason}</small>
                    <div className="credit-meta">
                        <span>Outstanding: {row.outstanding}</span>
                        <span>Oldest due: {row.oldestDue}</span>
                    </div>
                </article>
            ))}
        </div>
    );
}
