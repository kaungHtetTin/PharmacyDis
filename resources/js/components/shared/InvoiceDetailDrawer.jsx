import Drawer from './Drawer';
import StatusBadge from './StatusBadge';

function SourceOrderPreview({ order }) {
    if (!order) {
        return null;
    }

    return (
        <section className="drawer-section">
            <div className="section-heading compact">
                <div>
                    <p className="eyebrow">Source order</p>
                    <h2>{order.order}</h2>
                </div>
                <StatusBadge value={order.status} />
            </div>
            <div className="fact-grid">
                <div>
                    <span>Pharmacy</span>
                    <strong>{order.pharmacy || '-'}</strong>
                </div>
                <div>
                    <span>Sales rep</span>
                    <strong>{order.rep || '-'}</strong>
                </div>
                <div>
                    <span>Base quantity</span>
                    <strong>{order.baseQuantity || '-'}</strong>
                </div>
                <div>
                    <span>Total</span>
                    <strong>{order.total || '-'}</strong>
                </div>
            </div>
            {order.orderItems?.length > 0 && (
                <div className="order-line-table compact">
                    <div className="order-line-head">
                        <span>Product</span>
                        <span>Qty</span>
                        <span>Base qty</span>
                        <span>Total</span>
                    </div>
                    {order.orderItems.map((item) => (
                        <div className="order-line-row" key={item.id}>
                            <strong>{item.product}</strong>
                            <span>{item.orderedQuantity} {item.selectedUnit}</span>
                            <span>{item.baseQuantity}</span>
                            <strong>{item.lineTotal}</strong>
                        </div>
                    ))}
                </div>
            )}
            {order.focItems?.length > 0 && (
                <div className="foc-list">
                    {order.focItems.map((item) => (
                        <article key={item.id}>
                            <strong>{item.product}</strong>
                            <span>{item.quantity}</span>
                            <small>{item.rule}</small>
                        </article>
                    ))}
                </div>
            )}
        </section>
    );
}

export default function InvoiceDetailDrawer({
    actions,
    customerName = '',
    fallbackInvoice = {},
    invoice,
    onClose,
    open,
}) {
    if (!invoice) {
        return null;
    }

    const invoiceDetail = {
        ...fallbackInvoice,
        ...invoice,
        pharmacy: customerName || invoice.pharmacy || fallbackInvoice.pharmacy,
        paymentRecords: invoice.paymentRecords || fallbackInvoice.paymentRecords || [],
    };

    return (
        <Drawer
            actions={actions || <button className="btn primary" onClick={onClose} type="button">Done</button>}
            eyebrow="Invoice Detail"
            open={open}
            onClose={onClose}
            title={invoiceDetail.invoice}
        >
            <div className="detail-stack">
                <section className="drawer-section">
                    <p className="eyebrow">Invoice overview</p>
                    <div className="fact-grid">
                        {[
                            ['Invoice no.', invoiceDetail.invoice],
                            ['Order', invoiceDetail.order],
                            ['Pharmacy', invoiceDetail.pharmacy],
                            ['Company', invoiceDetail.company || '-'],
                            ['Due date', invoiceDetail.dueDate],
                            ['Amount', invoiceDetail.amount],
                            ['Paid', invoiceDetail.paid || invoiceDetail.paidAmount || '-'],
                            ['Balance', invoiceDetail.balanceAmount || '-'],
                            ['Status', invoiceDetail.status],
                        ].map(([label, value]) => (
                            <div key={label}>
                                <span>{label}</span>
                                <strong>{value || '-'}</strong>
                            </div>
                        ))}
                    </div>
                </section>
                <SourceOrderPreview order={invoiceDetail.sourceOrder} />
                <section className="drawer-section">
                    <p className="eyebrow">Payment records</p>
                    {invoiceDetail.paymentRecords.length > 0 ? (
                        <div className="finance-allocation-table">
                            <div className="finance-allocation-head">
                                <span>Payment</span>
                                <span>Date</span>
                                <span>Method</span>
                                <span>Allocated</span>
                                <span>Status</span>
                            </div>
                            {invoiceDetail.paymentRecords.map((payment) => (
                                <div className="finance-allocation-row" key={payment.id}>
                                    <div>
                                        <strong>{payment.payment}</strong>
                                        <small>{payment.reference}</small>
                                    </div>
                                    <span>{payment.date}</span>
                                    <span>{payment.method}</span>
                                    <strong>{payment.allocatedAmount}</strong>
                                    <StatusBadge value={payment.status} />
                                </div>
                            ))}
                        </div>
                    ) : (
                        <span className="muted">No payment has been recorded for this invoice.</span>
                    )}
                </section>
            </div>
        </Drawer>
    );
}
