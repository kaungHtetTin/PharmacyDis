import Drawer from './Drawer';
import StatusBadge from './StatusBadge';

export function invoicePrintPageUrl(invoiceId, paperSize = 'a4', autoPrint = false) {
    if (!invoiceId) {
        return '';
    }

    const baseUrl = String(window.appConfig?.baseUrl || '').replace(/\/+$/g, '');
    const query = new URLSearchParams({ paper: paperSize });

    if (autoPrint) {
        query.set('print', '1');
    }

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
