import { useEffect, useState } from 'react';
import { InvoiceDetailContent, invoicePrintPageUrl } from '../../components/shared/InvoiceDetailDrawer';
import PageHeader from '../../components/shared/PageHeader';
import Panel from '../../components/shared/Panel';
import StatusBadge from '../../components/shared/StatusBadge';
import useApiResource from '../../hooks/useApiResource';
import { api } from '../../services/apiClient';
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
    const printUrl = invoice ? invoicePrintPageUrl(invoice.id, 'a5') : '';
    const [remark, setRemark] = useState('');
    const [remarkError, setRemarkError] = useState('');
    const [remarkSaving, setRemarkSaving] = useState(false);
    const [remarkSuccess, setRemarkSuccess] = useState('');
    const [saleType, setSaleType] = useState('cash');
    const [dueDate, setDueDate] = useState('');

    useEffect(() => {
        setRemark(invoice?.remark || '');
        setSaleType(invoice?.sale_type || 'cash');
        setDueDate(invoice?.due_date || '');
        setRemarkError('');
        setRemarkSuccess('');
    }, [invoice?.id, invoice?.remark, invoice?.sale_type, invoice?.due_date]);

    const saveRemark = async () => {
        if (!invoice?.id) {
            return;
        }

        setRemarkSaving(true);
        setRemarkError('');
        setRemarkSuccess('');

        try {
            await api.patch(`/office/invoices/${invoice.id}/print-details`, { due_date: dueDate, remark, sale_type: saleType });
            setRemarkSuccess('Invoice print details saved.');
            invoiceResource.refresh();
        } catch (error) {
            setRemarkError(error.message);
        } finally {
            setRemarkSaving(false);
        }
    };

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

                    <Panel eyebrow="Invoice Print" title="Printed invoice details">
                        {remarkError && <div className="form-error">{remarkError}</div>}
                        {remarkSuccess && <div className="form-success">{remarkSuccess}</div>}
                        <fieldset className="invoice-sale-type-field">
                            <legend>Sale type</legend>
                            <div className="invoice-sale-type-options">
                                {[
                                    ['cash', 'Cash'],
                                    ['credit', 'Credit'],
                                ].map(([value, label]) => (
                                    <label className="invoice-sale-type-radio" key={value}>
                                        <input
                                            checked={saleType === value}
                                            disabled={remarkSaving}
                                            name="sale_type"
                                            onChange={() => setSaleType(value)}
                                            type="radio"
                                            value={value}
                                        />
                                        <span>{label}</span>
                                    </label>
                                ))}
                            </div>
                        </fieldset>
                        <label className="form-field invoice-print-due-date-field">
                            <span>Payment due date</span>
                            <input
                                disabled={remarkSaving}
                                onChange={(event) => setDueDate(event.target.value)}
                                type="date"
                                value={dueDate}
                            />
                        </label>
                        <label className="form-field sales-order-note">
                            <span>Remark</span>
                            <textarea
                                disabled={remarkSaving}
                                onChange={(event) => setRemark(event.target.value)}
                                placeholder="Optional remark for this invoice"
                                rows="3"
                                value={remark}
                            />
                        </label>
                        <button className="btn primary invoice-print-save-button" disabled={remarkSaving} onClick={saveRemark} type="button">
                            {remarkSaving ? 'Saving...' : 'Save print details'}
                        </button>
                    </Panel>
                </>
            )}
        </div>
    );
}
