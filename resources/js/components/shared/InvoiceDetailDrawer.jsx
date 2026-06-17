import { useState } from 'react';
import Drawer from './Drawer';
import StatusBadge from './StatusBadge';

const paperSizes = [
    { key: 'a4', label: 'A4', detail: '210 x 297 mm' },
    { key: 'a5', label: 'A5', detail: '148 x 210 mm' },
    { key: 'inch-4', label: '4 inch', detail: '4 in roll' },
    { key: 'inch-3', label: '3 inch', detail: '3 in roll' },
    { key: 'inch-2', label: '2 inch', detail: '2 in roll' },
];

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

function formatValue(value) {
    return value || '-';
}

function InvoicePrintView({ invoice, paperSize }) {
    const compact = paperSize.startsWith('inch-');
    const items = invoice.invoiceItems || [];

    return (
        <div className={`invoice-print-area paper-${paperSize}`}>
            <div className="invoice-paper">
                <header className="invoice-print-header">
                    <div>
                        <span>Paramacy DIS</span>
                        <strong>Invoice to Pharmacy</strong>
                        <small>Distribution system</small>
                    </div>
                    <div>
                        <strong>{formatValue(invoice.invoice)}</strong>
                        <small>Invoice date: {formatValue(invoice.invoiceDate)}</small>
                        <small>Due date: {formatValue(invoice.dueDate)}</small>
                    </div>
                </header>

                <section className="invoice-print-party">
                    <div>
                        <span>Pharmacy</span>
                        <strong>{formatValue(invoice.pharmacy)}</strong>
                    </div>
                    <div>
                        <span>Company</span>
                        <strong>{formatValue(invoice.company)}</strong>
                    </div>
                    <div>
                        <span>Order</span>
                        <strong>{formatValue(invoice.order)}</strong>
                    </div>
                    <div>
                        <span>Status</span>
                        <strong>{formatValue(invoice.status)}</strong>
                    </div>
                </section>

                <section className="invoice-print-lines">
                    <div className="invoice-print-line-head">
                        <span>Item</span>
                        {!compact && <span>Unit</span>}
                        <span>Qty</span>
                        <span>FOC</span>
                        <span>Total</span>
                    </div>
                    {items.length > 0 ? items.map((item) => (
                        <div className="invoice-print-line-row" key={item.id}>
                            <strong>{item.product}</strong>
                            {!compact && <span>{item.unit}</span>}
                            <span>{item.quantity}</span>
                            <span>{item.foc || '-'}</span>
                            <strong>{item.total}</strong>
                        </div>
                    )) : (
                        <p className="muted">No invoice items available.</p>
                    )}
                </section>

                <section className="invoice-print-totals">
                    <div>
                        <span>Total</span>
                        <strong>{formatValue(invoice.amount)}</strong>
                    </div>
                    <div>
                        <span>Paid</span>
                        <strong>{formatValue(invoice.paid || invoice.paidAmount)}</strong>
                    </div>
                    <div>
                        <span>Balance</span>
                        <strong>{formatValue(invoice.balanceAmount)}</strong>
                    </div>
                </section>

                <footer className="invoice-print-footer">
                    <span>Prepared for pharmacy settlement and delivery reference.</span>
                    <strong>Thank you</strong>
                </footer>
            </div>
        </div>
    );
}

export function InvoiceDetailContent({ customerName = '', fallbackInvoice = {}, invoice }) {
    const [paperSize, setPaperSize] = useState('a4');
    const invoiceDetail = {
        ...fallbackInvoice,
        ...invoice,
        pharmacy: customerName || invoice.pharmacy || fallbackInvoice.pharmacy,
        paymentRecords: invoice.paymentRecords || fallbackInvoice.paymentRecords || [],
    };

    return (
        <div className="detail-stack invoice-detail-page-stack">
            <section className="drawer-section invoice-print-section">
                <div className="section-heading compact">
                    <div>
                        <p className="eyebrow">Invoice to pharmacy</p>
                        <h2>Paper preview</h2>
                    </div>
                    <button className="btn secondary" onClick={() => window.print()} type="button">Print</button>
                </div>
                <div className="paper-size-selector" role="group" aria-label="Invoice paper size">
                    {paperSizes.map((size) => (
                        <button
                            className={paperSize === size.key ? 'active' : ''}
                            key={size.key}
                            onClick={() => setPaperSize(size.key)}
                            type="button"
                        >
                            <strong>{size.label}</strong>
                            <span>{size.detail}</span>
                        </button>
                    ))}
                </div>
                <InvoicePrintView invoice={invoiceDetail} paperSize={paperSize} />
            </section>
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
            <InvoiceDetailContent customerName={customerName} fallbackInvoice={fallbackInvoice} invoice={invoiceDetail} />
        </Drawer>
    );
}
