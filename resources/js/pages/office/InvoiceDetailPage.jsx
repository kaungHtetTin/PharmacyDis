import { InvoiceDetailContent, invoicePrintPageUrl } from '../../components/shared/InvoiceDetailDrawer';
import PageHeader from '../../components/shared/PageHeader';
import Panel from '../../components/shared/Panel';
import StatusBadge from '../../components/shared/StatusBadge';
import useApiResource from '../../hooks/useApiResource';
import { mapInvoices } from '../../services/screenAdapters';

function InvoiceSnapshot({ invoice }) {
    const facts = [
        ['Order', invoice.order],
        ['Invoice date', invoice.invoiceDate],
        ['Due date', invoice.dueDate],
        ['Subtotal', invoice.subtotalAmount],
        ['Discount', invoice.discountAmount],
        ['Tax', invoice.taxAmount],
        ['Total', invoice.amount],
        ['Paid', invoice.paidAmount || invoice.paid || '-'],
        ['Balance', invoice.balanceAmount],
        ['Payments', String(invoice.paymentRecords?.length || 0)],
    ];

    return (
        <div className="fact-grid invoice-detail-facts">
            {facts.map(([label, value]) => (
                <div key={label}>
                    <span>{label}</span>
                    <strong>{value || '-'}</strong>
                </div>
            ))}
        </div>
    );
}

export default function InvoiceDetailPage({ onNavigate }) {
    const params = new URLSearchParams(window.location.search);
    const invoiceId = params.get('invoice_id') || '';
    const invoiceResource = useApiResource(invoiceId ? `/office/invoices?invoice_id=${invoiceId}&per_page=1` : '');
    const [invoice] = invoiceResource.data ? mapInvoices(invoiceResource.data) : [];
    const printUrl = invoice ? invoicePrintPageUrl(invoice.id) : '';

    if (!invoiceId) {
        return (
            <div className="page-stack">
                <PageHeader
                    description="Open an invoice from the invoice or pharmacy page to view and print it."
                    eyebrow="Invoice"
                    title="Select invoice"
                />
                <Panel eyebrow="Invoice Detail" title="No invoice selected">
                    <p className="helper-copy">Choose an invoice row to open the printable invoice detail page.</p>
                </Panel>
            </div>
        );
    }

    return (
        <div className="page-stack invoice-detail-page">
            <PageHeader
                action={(
                    <div className="page-heading-actions">
                        {printUrl && (
                            <button className="btn primary" onClick={() => window.open(printUrl, '_blank', 'noopener,noreferrer')} type="button">Print invoice</button>
                        )}
                        {invoice?.sales_order_id && (
                            <button className="btn secondary" onClick={() => onNavigate?.('order-detail', { order_id: invoice.sales_order_id })} type="button">Open order detail</button>
                        )}
                    </div>
                )}
                description="Review invoice status, payment allocation, and open the standalone print page when needed."
                eyebrow="Invoice"
                title={invoiceResource.loading ? 'Loading invoice' : 'Invoice detail'}
            />

            {invoiceResource.error && <span className="error-text">{invoiceResource.error}</span>}
            {invoiceResource.loading && (
                <Panel eyebrow="Invoice Detail" title="Loading invoice">
                    <p className="helper-copy">Loading invoice detail and print preview...</p>
                </Panel>
            )}
            {!invoiceResource.loading && !invoice && !invoiceResource.error && (
                <Panel eyebrow="Invoice Detail" title="Invoice not found">
                    <p className="helper-copy">The selected invoice could not be found.</p>
                </Panel>
            )}
            {invoice && (
                <>
                    <section className="invoice-detail-hero glass">
                        <div className="invoice-detail-icon">INV</div>
                        <div>
                            <div className="rep-title-row">
                                <h2>{invoice.invoice}</h2>
                                <StatusBadge value={invoice.status} />
                            </div>
                            <p>{invoice.pharmacy} / {invoice.company}</p>
                        </div>
                        <div className="invoice-detail-total">
                            <span>Invoice amount</span>
                            <strong>{invoice.amount}</strong>
                            <small>Balance {invoice.balanceAmount}</small>
                        </div>
                    </section>

                    <Panel eyebrow="Operational Snapshot" title="Dates, order, and payment status">
                        <div className="invoice-detail-dense-grid">
                            <InvoiceSnapshot invoice={invoice} />
                            <InvoiceDetailContent invoice={invoice} />
                        </div>
                    </Panel>
                </>
            )}
        </div>
    );
}
