import PrintPreview from './PrintPreview';
import StatusBadge from './StatusBadge';

export default function DocumentPreviewSet({ documents = [], invoiceItems = [] }) {
    return (
        <div className="document-preview-set">
            {invoiceItems.length > 0 && (
                <section className="drawer-section">
                    <p className="eyebrow">Invoice detail</p>
                    <div className="document-line-table">
                        <div className="document-line-head">
                            <span>Product</span>
                            <span>Qty</span>
                            <span>FOC</span>
                            <span>Total</span>
                            <span>Status</span>
                        </div>
                        {invoiceItems.map((item) => (
                            <div className="document-line-row" key={item.id}>
                                <div>
                                    <strong>{item.product}</strong>
                                    <small>{item.unit}</small>
                                </div>
                                <span>{item.quantity}</span>
                                <span>{item.foc}</span>
                                <strong>{item.total}</strong>
                                <StatusBadge value={item.status} />
                            </div>
                        ))}
                    </div>
                </section>
            )}
            <section className="drawer-section">
                <p className="eyebrow">Print preview set</p>
                <div className="print-preview-grid">
                    {documents.map((document) => (
                        <PrintPreview
                            items={document.items}
                            key={document.title}
                            title={document.title}
                            type={document.type}
                        />
                    ))}
                </div>
            </section>
        </div>
    );
}
