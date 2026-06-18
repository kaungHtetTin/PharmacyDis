export default function StockTransferDetail({ items = [] }) {
    return (
        <div className="transfer-detail-table">
            <div className="transfer-detail-head">
                <span>Product</span>
                <span>Batch</span>
                <span>Expiry</span>
                <span>Quantity</span>
            </div>
            {items.length > 0 ? items.map((item) => (
                <div className="transfer-detail-row" key={item.id || `${item.product}-${item.batch}`}>
                    <strong>{item.product}</strong>
                    <span>{item.batch}</span>
                    <span>{item.expiry}</span>
                    <span>{item.quantity}</span>
                </div>
            )) : (
                <p className="helper-copy">No transferred batch lines are available for this transfer.</p>
            )}
        </div>
    );
}
