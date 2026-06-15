import StatusBadge from './StatusBadge';

function SummaryGrid({ cards = [] }) {
    if (!cards.length) {
        return null;
    }

    return (
        <div className="order-summary-grid">
            {cards.map((card) => (
                <div key={card.label}>
                    <span>{card.label}</span>
                    <strong>{card.value}</strong>
                    <small>{card.note}</small>
                </div>
            ))}
        </div>
    );
}

export default function SalesOrderDetail({
    approvalCards = [],
    focItems = [],
    orderItems = [],
    totals = [],
    warehouseChecklist = [],
}) {
    return (
        <div className="sales-order-detail">
            <section className="drawer-section">
                <p className="eyebrow">Approval review</p>
                <SummaryGrid cards={approvalCards} />
            </section>

            <section className="drawer-section">
                <p className="eyebrow">Ordered items</p>
                <div className="order-item-card-list">
                    {orderItems.map((item) => (
                        <article className="order-item-card" key={item.id}>
                            <div className="order-item-card-title">
                                <div>
                                    <strong>{item.product}</strong>
                                    <small>{item.company}</small>
                                </div>
                                <StatusBadge value={item.stockStatus} />
                            </div>
                            <div className="order-item-card-facts">
                                <div>
                                    <span>Selected unit</span>
                                    <strong>{item.orderedQuantity} {item.selectedUnit}</strong>
                                    <small>{item.conversion}</small>
                                </div>
                                <div>
                                    <span>Base quantity</span>
                                    <strong>{item.baseQuantity}</strong>
                                </div>
                                <div>
                                    <span>Unit price</span>
                                    <strong>{item.unitPrice}</strong>
                                </div>
                                <div>
                                    <span>Total</span>
                                    <strong>{item.lineTotal}</strong>
                                </div>
                            </div>
                        </article>
                    ))}
                </div>
            </section>

            <section className="drawer-section">
                <p className="eyebrow">FOC items</p>
                {focItems.length > 0 ? (
                    <div className="foc-list">
                        {focItems.map((item) => (
                            <article key={item.id}>
                                <div>
                                    <span>Reward product</span>
                                    <strong>{item.product}</strong>
                                </div>
                                <div>
                                    <span>Reward</span>
                                    <strong>{item.quantity}</strong>
                                </div>
                                <div>
                                    <span>Rule</span>
                                    <small>{item.rule}</small>
                                </div>
                            </article>
                        ))}
                    </div>
                ) : (
                    <p className="helper-copy">No FOC promotion is applied to this order.</p>
                )}
            </section>

            <section className="drawer-section">
                <p className="eyebrow">Totals and credit impact</p>
                <div className="order-total-grid">
                    {totals.map((total) => (
                        <div key={total.label}>
                            <span>{total.label}</span>
                            <strong>{total.value}</strong>
                        </div>
                    ))}
                </div>
            </section>

            <section className="drawer-section">
                <p className="eyebrow">Warehouse preparation checklist</p>
                <div className="warehouse-checklist">
                    {warehouseChecklist.map((item) => (
                        <label key={item.id}>
                            <input checked={item.done} readOnly type="checkbox" />
                            <span>
                                <strong>{item.label}</strong>
                                <small>{item.detail}</small>
                            </span>
                        </label>
                    ))}
                </div>
            </section>
        </div>
    );
}
