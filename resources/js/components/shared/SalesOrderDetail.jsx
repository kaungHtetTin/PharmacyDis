import StatusBadge from './StatusBadge';

function buildLineRows(orderItems, focItems) {
    return [
        ...orderItems.map((item) => ({
            id: `order-${item.id}`,
            type: 'Order',
            product: item.product,
            note: item.conversion,
            quantity: `${item.orderedQuantity} ${item.selectedUnit}`,
            detail: 'Selected unit',
            baseOrRule: item.baseQuantity,
            unitPrice: item.unitPrice,
            total: item.lineTotal,
            status: item.stockStatus,
        })),
        ...focItems.map((item) => ({
            id: `foc-${item.id}`,
            type: 'FOC',
            product: item.product,
            note: item.rule,
            quantity: item.quantity,
            detail: 'Reward',
            baseOrRule: item.baseQuantity || item.quantity,
            unitPrice: '-',
            total: 'Free',
            status: 'Ready',
        })),
    ];
}

export default function SalesOrderDetail({
    focItems = [],
    orderItems = [],
    totals = [],
    warehouseChecklist = [],
}) {
    const lineRows = buildLineRows(orderItems, focItems);

    return (
        <div className="sales-order-detail">
            <section className="drawer-section">
                <p className="eyebrow">Order and FOC items</p>
                {lineRows.length > 0 ? (
                    <div className="order-detail-line-table">
                        <table>
                            <thead>
                                <tr>
                                    <th>Type</th>
                                    <th>Product</th>
                                    <th>Quantity</th>
                                    <th>Base / Rule</th>
                                    <th>Unit Price</th>
                                    <th>Total</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {lineRows.map((item) => (
                                    <tr key={item.id}>
                                        <td><StatusBadge value={item.type} /></td>
                                        <td>
                                            <strong>{item.product}</strong>
                                            <small>{item.note}</small>
                                        </td>
                                        <td>
                                            <strong>{item.quantity}</strong>
                                            <small>{item.detail}</small>
                                        </td>
                                        <td>{item.baseOrRule}</td>
                                        <td><strong>{item.unitPrice}</strong></td>
                                        <td><strong>{item.total}</strong></td>
                                        <td><StatusBadge value={item.status} /></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <p className="helper-copy">No order lines or FOC rewards are attached to this order.</p>
                )}
            </section>

            <section className="drawer-section">
                <p className="eyebrow">Totals</p>
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
