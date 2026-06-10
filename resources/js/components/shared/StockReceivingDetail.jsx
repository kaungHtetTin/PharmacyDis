export default function StockReceivingDetail({ items = [], payable }) {
    return (
        <div className="receiving-detail">
            <div className="receiving-detail-table">
                <div className="receiving-detail-head">
                    <span>Product</span>
                    <span>Batch</span>
                    <span>Qty</span>
                    <span>Unit</span>
                    <span>Base Qty</span>
                    <span>Unit Cost</span>
                </div>
                {items.map((item) => (
                    <div className="receiving-detail-row" key={`${item.product}-${item.batch}`}>
                        <strong>{item.product}</strong>
                        <span>{item.batch}</span>
                        <span>{item.quantity}</span>
                        <span>{item.unit}</span>
                        <span>{item.baseQuantity}</span>
                        <span>{item.unitCost}</span>
                    </div>
                ))}
            </div>
            {payable && (
                <div className="payable-preview">
                    <div>
                        <span>Total</span>
                        <strong>{payable.total}</strong>
                    </div>
                    <div>
                        <span>Paid</span>
                        <strong>{payable.paid}</strong>
                    </div>
                    <div>
                        <span>Due</span>
                        <strong>{payable.due}</strong>
                    </div>
                    <div>
                        <span>Due date</span>
                        <strong>{payable.dueDate}</strong>
                    </div>
                </div>
            )}
        </div>
    );
}
