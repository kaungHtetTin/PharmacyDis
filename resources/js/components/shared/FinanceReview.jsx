import StatusBadge from './StatusBadge';

export default function FinanceReview({ allocations = [], agingBuckets = [], warningCards = [] }) {
    return (
        <div className="finance-review">
            {allocations.length > 0 && (
                <section className="drawer-section">
                    <p className="eyebrow">Payment allocation</p>
                    <div className="finance-allocation-table">
                        <div className="finance-allocation-head">
                            <span>Invoice/Receipt</span>
                            <span>Amount</span>
                            <span>Allocated</span>
                            <span>Balance</span>
                            <span>Status</span>
                        </div>
                        {allocations.map((allocation) => (
                            <div className="finance-allocation-row" key={allocation.id}>
                                <strong>{allocation.reference}</strong>
                                <span>{allocation.amount}</span>
                                <span>{allocation.allocated}</span>
                                <strong>{allocation.balance}</strong>
                                <StatusBadge value={allocation.status} />
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {agingBuckets.length > 0 && (
                <section className="drawer-section">
                    <p className="eyebrow">Aging categories</p>
                    <div className="aging-grid">
                        {agingBuckets.map((bucket) => (
                            <article key={bucket.label}>
                                <span>{bucket.label}</span>
                                <strong>{bucket.value}</strong>
                                <StatusBadge value={bucket.status} />
                            </article>
                        ))}
                    </div>
                </section>
            )}

            {warningCards.length > 0 && (
                <section className="drawer-section">
                    <p className="eyebrow">Overdue states</p>
                    <div className="finance-warning-grid">
                        {warningCards.map((card) => (
                            <article key={card.label}>
                                <StatusBadge value={card.status} />
                                <strong>{card.label}</strong>
                                <small>{card.note}</small>
                            </article>
                        ))}
                    </div>
                </section>
            )}
        </div>
    );
}
