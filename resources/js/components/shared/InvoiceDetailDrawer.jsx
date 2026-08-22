import Drawer from './Drawer';
import StatusBadge from './StatusBadge';

export function invoicePrintPageUrl(invoiceId, paperSize = 'a5') {
    if (!invoiceId) {
        return '';
    }

    const baseUrl = String(window.appConfig?.baseUrl || '').replace(/\/+$/g, '');
    const query = new URLSearchParams({ paper: paperSize });

    return `${baseUrl}/office/invoices/${invoiceId}/print?${query.toString()}`;
}

export function InvoiceDetailContent({ customerName = '', fallbackInvoice = {}, invoice }) {
    const invoiceDetail = {
        ...fallbackInvoice,
        ...invoice,
        pharmacy: customerName || invoice.pharmacy || fallbackInvoice.pharmacy,
        paymentRecords: invoice.paymentRecords || fallbackInvoice.paymentRecords || [],
    };

    return (
        <section className="invoice-payment-section">
            <p className="eyebrow">Settlement summary</p>
            <div className="fact-grid invoice-settlement-grid">
                {[
                    ['Original invoice', invoiceDetail.originalAmount || invoiceDetail.amount],
                    ['Cash back', invoiceDetail.cashBackAmount],
                    ['Return credits', invoiceDetail.returnCreditAmount],
                    ['Net collectible', invoiceDetail.netCollectibleAmount],
                    ['Payments received', invoiceDetail.paidAmount || invoiceDetail.paid],
                    ['Open balance', invoiceDetail.balanceAmount],
                ].map(([label, value]) => (
                    <div key={label}><span>{label}</span><strong>{value || '0'}</strong></div>
                ))}
            </div>

            {(invoiceDetail.returnEvents || []).length > 0 && (
                <>
                    <p className="eyebrow">Returns and credit notes</p>
                    <div className="finance-allocation-table">
                        <div className="finance-allocation-head">
                            <span>Credit note</span><span>Date</span><span>Amount</span><span>Status</span><span>FOC</span>
                        </div>
                        {invoiceDetail.returnEvents.map((event) => (
                            <div className="finance-allocation-row" key={event.id}>
                                <strong>{event.reference}</strong><span>{event.date}</span><strong>{event.amount}</strong>
                                <StatusBadge value={event.status} />
                                <span>{event.focItems?.length ? `${event.focItems.length} disposition(s)` : 'None'}</span>
                            </div>
                        ))}
                    </div>
                </>
            )}

            {(invoiceDetail.adjustmentEvents || []).length > 0 && (
                <>
                    <p className="eyebrow">Customer credits and charge adjustments</p>
                    <div className="finance-allocation-table">
                        <div className="finance-allocation-head">
                            <span>Reference</span><span>Date</span><span>Type</span><span>Amount</span><span>Status</span>
                        </div>
                        {invoiceDetail.adjustmentEvents.map((event) => (
                            <div className="finance-allocation-row" key={`${event.type}-${event.id}`}>
                                <strong>{event.reference}</strong><span>{event.date}</span><span>{event.type}</span>
                                <strong>{event.amount}</strong><StatusBadge value={event.status} />
                            </div>
                        ))}
                    </div>
                </>
            )}

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
