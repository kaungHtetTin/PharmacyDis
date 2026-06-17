import { InvoiceDetailContent } from '../../components/shared/InvoiceDetailDrawer';
import PageHeader from '../../components/shared/PageHeader';
import Panel from '../../components/shared/Panel';
import useApiResource from '../../hooks/useApiResource';
import { mapInvoices } from '../../services/screenAdapters';

export default function InvoiceDetailPage({ onNavigate }) {
    const params = new URLSearchParams(window.location.search);
    const invoiceId = params.get('invoice_id') || '';
    const invoiceResource = useApiResource(invoiceId ? `/office/invoices?invoice_id=${invoiceId}&per_page=1` : '');
    const [invoice] = invoiceResource.data ? mapInvoices(invoiceResource.data) : [];

    if (!invoiceId) {
        return (
            <div className="page-stack">
                <PageHeader
                    action={<button className="btn secondary" onClick={() => onNavigate?.('invoices')} type="button">Back to invoices</button>}
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
                        {invoice?.sales_order_id && (
                            <button className="btn secondary" onClick={() => onNavigate?.('orders', { order_id: invoice.sales_order_id })} type="button">Open order detail</button>
                        )}
                        <button className="btn secondary" onClick={() => onNavigate?.('invoices')} type="button">Back to invoices</button>
                    </div>
                )}
                description="Review invoice detail and print invoice to pharmacy with selectable paper sizes."
                eyebrow="Invoice"
                title={invoice?.invoice || (invoiceResource.loading ? 'Loading invoice' : 'Invoice detail')}
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
                <Panel eyebrow="Invoice Detail" title="Invoice to pharmacy">
                    <InvoiceDetailContent invoice={invoice} />
                </Panel>
            )}
        </div>
    );
}
