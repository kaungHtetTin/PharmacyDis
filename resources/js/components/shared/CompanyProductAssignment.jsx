export default function CompanyProductAssignment({ products = [] }) {
    return (
        <div className="assignment-grid">
            <div className="assignment-head">
                <span>Product</span>
                <span>Barcode</span>
                <span>Commission</span>
                <span>FOC</span>
                <span>Status</span>
            </div>
            {products.map((product) => (
                <div className="assignment-row" key={product.id}>
                    <div>
                        <strong>{product.name}</strong>
                        <small>{product.category}</small>
                    </div>
                    <span>{product.barcode}</span>
                    <span>{product.commissionRate}</span>
                    <span>{product.focRule}</span>
                    <span className={product.status === 'Ready' ? 'base-pill active' : 'base-pill'}>{product.status}</span>
                </div>
            ))}
        </div>
    );
}
