import DocumentPreviewSet from './DocumentPreviewSet';
import Drawer from './Drawer';

function normalizeDocuments(documents = [], invoice = {}) {
    return documents.map((document) => ({
        ...document,
        items: (document.items || []).map((item) => {
            const replacements = {
                Invoice: invoice.invoice,
                Order: invoice.order,
                Customer: invoice.pharmacy || invoice.customer,
                'Amount due': invoice.amount ? `${invoice.amount} MMK` : item.value,
                'Paid amount': invoice.paid ? `${invoice.paid} MMK` : item.value,
            };

            return replacements[item.label] ? { ...item, value: replacements[item.label] } : item;
        }),
    }));
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
        invoiceItems: invoice.invoiceItems || fallbackInvoice.invoiceItems || [],
    };
    const documents = normalizeDocuments(invoice.documents || fallbackInvoice.documents || [], invoiceDetail);

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
                            ['Paid', invoiceDetail.paid || '-'],
                            ['Status', invoiceDetail.status],
                        ].map(([label, value]) => (
                            <div key={label}>
                                <span>{label}</span>
                                <strong>{value || '-'}</strong>
                            </div>
                        ))}
                    </div>
                </section>
                <DocumentPreviewSet documents={documents} invoiceItems={invoiceDetail.invoiceItems} />
            </div>
        </Drawer>
    );
}
