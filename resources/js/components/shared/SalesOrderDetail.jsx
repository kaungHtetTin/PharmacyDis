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
                <div className="order-line-table">
                    <div className="order-line-head">
                        <span>Product</span>
                        <span>Selected unit</span>
                        <span>Base quantity</span>
                        <span>Unit price</span>
                        <span>Total</span>
                        <span>Stock</span>
                    </div>
                    {orderItems.map((item) => (
                        <div className="order-line-row" key={item.id}>
                            <div>
                                <strong>{item.product}</strong>
                                <small>{item.company}</small>
                            </div>
                            <div>
                                <strong>{item.orderedQuantity} {item.selectedUnit}</strong>
                                <small>{item.conversion}</small>
                            </div>
                            <strong>{item.baseQuantity}</strong>
                            <span>{item.unitPrice}</span>
                            <strong>{item.lineTotal}</strong>
                            <StatusBadge value={item.stockStatus} />
                        </div>
                    ))}
                </div>
            </section>

            <section className="drawer-section">
                <p className="eyebrow">FOC items</p>
                {focItems.length > 0 ? (
                    <div className="foc-list">
                        {focItems.map((item) => (
                            <article key={item.id}>
                                <strong>{item.product}</strong>
                                <span>{item.quantity} / {item.baseQuantity}</span>
                                <small>{item.rule}</small>
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
