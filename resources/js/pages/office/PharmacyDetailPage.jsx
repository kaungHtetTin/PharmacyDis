import { useEffect, useState } from 'react';
import CreditStatusGrid from '../../components/shared/CreditStatusGrid';
import DataTable from '../../components/shared/DataTable';
import FilterToolbar from '../../components/shared/FilterToolbar';
import FormField from '../../components/shared/FormField';
import InvoiceDetailDrawer from '../../components/shared/InvoiceDetailDrawer';
import Modal from '../../components/shared/Modal';
import OrderCreateForm from '../../components/shared/OrderCreateForm';
import { getCompanyCreditStatus, isBlockedCredit, normalizeCreditStatuses } from '../../components/shared/OrderCreditGate';
import PageHeader from '../../components/shared/PageHeader';
import Panel from '../../components/shared/Panel';
import StatusBadge from '../../components/shared/StatusBadge';
import SummaryCard from '../../components/shared/SummaryCard';
import { invoices as invoiceModule } from '../../data/mock/invoices';
import { orders as orderModule } from '../../data/mock/orders';
import { pharmacyDetail } from '../../data/mock/pharmacyDetail';

function workflowConfig(workflow, record, detail) {
    const context = record?.order || record?.invoice || record?.payment || detail.profile.name;

    const configs = {
        savePharmacy: {
            title: `Save pharmacy - ${detail.profile.name}`,
            contextLabel: 'Selected pharmacy',
            context,
            note: 'Save customer profile, credit terms, and finance notes from the pharmacy detail workspace.',
            fields: [
                { label: 'Pharmacy name', value: detail.profile.name },
                { label: 'Owner name', value: detail.profile.owner },
                { label: 'Phone number', value: detail.profile.phone },
                { label: 'Township', value: detail.profile.township },
                { label: 'Credit limit', type: 'number', value: detail.profile.creditLimit.replace(/,/g, '') },
                { label: 'Payment term days', type: 'number', value: detail.profile.paymentTerm.replace(/\D/g, '') },
                { label: 'Finance note', type: 'textarea', placeholder: 'Internal finance note' },
            ],
            submitLabel: 'Save pharmacy',
        },
        deletePharmacy: {
            title: `Delete pharmacy - ${detail.profile.name}`,
            contextLabel: 'Selected pharmacy',
            context,
            note: 'Confirm before deleting this pharmacy record. Related orders, invoices, and payments should be reviewed first.',
            fields: [
                { label: 'Delete reason', type: 'textarea', placeholder: 'Required audit note before deleting' },
            ],
            submitLabel: 'Delete pharmacy',
        },
        createOrder: {
            title: `Create order - ${detail.profile.name}`,
            contextLabel: 'Selected pharmacy',
            context,
            note: 'The pharmacy is carried into the order automatically. Add one or more product lines before submitting.',
            fields: [
                { label: 'Sales representative', type: 'select', options: ['May Zin', 'Ko Htet', 'Nilar'] },
                { label: 'Requested delivery date', type: 'date' },
                { label: 'Order note', type: 'textarea', placeholder: 'Optional warehouse note' },
            ],
            creditStatuses: detail.creditStatuses,
            orderLineItems: orderModule.orderLineItems,
            submitLabel: 'Create order',
        },
        saveOrder: {
            title: `Save order - ${record?.order}`,
            contextLabel: 'Selected order',
            context,
            note: 'Save order status or review notes before invoice generation or final approval.',
            fields: [
                { label: 'Order status', type: 'select', options: ['Submitted', 'Approved', 'Prepared', 'Delivered', 'Rejected'], value: record?.status },
                { label: 'Save note', type: 'textarea', placeholder: 'Approval, delivery, or internal note' },
            ],
            submitLabel: 'Save order',
        },
        deleteOrder: {
            title: `Delete order - ${record?.order}`,
            contextLabel: 'Selected order',
            context,
            note: 'Confirm before deleting this order record. Generated invoices should be handled before deletion.',
            fields: [
                { label: 'Delete reason', type: 'textarea', placeholder: 'Required audit note before deleting' },
            ],
            submitLabel: 'Delete order',
        },
        generateInvoice: {
            title: `Generate invoice - ${record?.order}`,
            contextLabel: 'Source order',
            context,
            note: 'Order, pharmacy, products, discounts, FOC, and totals are copied into the invoice.',
            fields: [
                { label: 'Invoice date', type: 'date' },
                { label: 'Due date', type: 'date' },
                { label: 'Payment status', type: 'select', options: ['Unpaid', 'Partial Payment', 'Paid'] },
                { label: 'Print template', type: 'select', options: ['A4 Invoice', 'Delivery Voucher', 'Payment Receipt'] },
                { label: 'Document note', type: 'textarea' },
            ],
            submitLabel: 'Generate invoice',
        },
        editInvoice: {
            title: `Edit invoice - ${record?.invoice}`,
            contextLabel: 'Selected invoice',
            context,
            note: 'Update invoice dates, payment status, print template, and document note from the pharmacy detail workspace.',
            fields: [
                { label: 'Invoice date', type: 'date' },
                { label: 'Due date', type: 'date' },
                { label: 'Payment status', type: 'select', options: ['Paid', 'Unpaid', 'Partial Payment'], value: record?.status },
                { label: 'Print template', type: 'select', options: ['A4 Invoice', 'Delivery Voucher', 'Payment Receipt'] },
                { label: 'Document note', type: 'textarea' },
            ],
            submitLabel: 'Save invoice',
        },
        deleteInvoice: {
            title: `Delete invoice - ${record?.invoice}`,
            contextLabel: 'Selected invoice',
            context,
            note: 'Confirm before deleting this invoice record. Payment allocations and printed documents should be reviewed first.',
            fields: [
                { label: 'Delete reason', type: 'textarea', placeholder: 'Required audit note before deleting' },
            ],
            submitLabel: 'Delete invoice',
        },
        generatePayment: {
            title: `Record payment - ${record?.invoice}`,
            contextLabel: 'Selected invoice',
            context,
            note: 'The invoice and pharmacy are carried into the payment allocation automatically.',
            fields: [
                { label: 'Received amount', type: 'number' },
                { label: 'Payment method', type: 'select', options: ['Cash', 'Bank', 'Mobile Pay'] },
                { label: 'Payment date', type: 'date' },
                { label: 'Payment status', type: 'select', options: ['Completed', 'Partial Payment', 'Pending'] },
                { label: 'Allocation note', type: 'textarea' },
            ],
            submitLabel: 'Record payment',
        },
    };

    return configs[workflow];
}

function WorkflowModal({ detail, onClose, record, workflow }) {
    const config = workflowConfig(workflow, record, detail);
    const [selectedOrderCompany, setSelectedOrderCompany] = useState('');
    const isOrderCreate = workflow === 'createOrder';
    const creditStatuses = normalizeCreditStatuses(config?.creditStatuses || []);
    const selectedCreditStatus = getCompanyCreditStatus(creditStatuses, selectedOrderCompany);
    const orderCreateBlocked = isOrderCreate && isBlockedCredit(selectedCreditStatus?.status);

    useEffect(() => {
        if (!isOrderCreate) {
            return;
        }

        setSelectedOrderCompany(creditStatuses[0]?.company || '');
    }, [isOrderCreate, workflow]);

    if (!config) {
        return null;
    }

    return (
        <Modal
            actions={(
                <>
                    <button className="btn secondary" onClick={onClose} type="button">Cancel</button>
                    {orderCreateBlocked && <span className="submit-disabled-note">Company credit is blocked. Order creation is not allowed.</span>}
                    <button className="btn primary" disabled={orderCreateBlocked} onClick={onClose} type="button">{config.submitLabel}</button>
                </>
            )}
            open
            onClose={onClose}
            onSubmit={onClose}
            title={config.title}
        >
            <div className="workflow-context-card">
                <span>{config.contextLabel}</span>
                <strong>{config.context}</strong>
                <small>{config.note}</small>
            </div>
            {isOrderCreate ? (
                <OrderCreateForm
                    blocked={orderCreateBlocked}
                    creditStatuses={creditStatuses}
                    lines={config.orderLineItems}
                    onCompanyChange={setSelectedOrderCompany}
                    selectedCompany={selectedOrderCompany}
                />
            ) : (
                <div className="crud-grid">
                    {config.fields.map((field) => <FormField key={field.label} {...field} />)}
                </div>
            )}
        </Modal>
    );
}

function PaginatedTableSection({ actions = [], columns, filters, onRowClick, pageLabel, rows, title }) {
    return (
        <Panel eyebrow={pageLabel} title={title}>
            <FilterToolbar filters={filters} searchPlaceholder={`Search ${title.toLowerCase()}`} showDate />
            <DataTable actions={actions} columns={columns} onRowClick={onRowClick} rows={rows} />
            <div className="pagination-bar">
                <span>Showing 1-{Math.min(rows.length, 5)} of {rows.length}</span>
                <div>
                    <button className="btn secondary" disabled type="button">Previous</button>
                    <button className="btn secondary" type="button">Next</button>
                </div>
            </div>
        </Panel>
    );
}

export default function PharmacyDetailPage({ onNavigate }) {
    const detail = pharmacyDetail;
    const [activeWorkflow, setActiveWorkflow] = useState(null);
    const [selectedInvoice, setSelectedInvoice] = useState(null);
    const initials = detail.profile.name.split(' ').map((part) => part[0]).join('');
    const openWorkflow = (workflow, record = null) => setActiveWorkflow({ workflow, record });
    const closeWorkflow = () => setActiveWorkflow(null);
    const openInvoiceDetail = (invoice) => setSelectedInvoice(invoice);
    const closeInvoiceDetail = () => setSelectedInvoice(null);
    const invoiceFallback = selectedInvoice
        ? invoiceModule.rows.find((row) => row.invoice === selectedInvoice.invoice) || invoiceModule.rows[0]
        : invoiceModule.rows[0];
    const recordPayment = (invoice) => {
        closeInvoiceDetail();
        openWorkflow('generatePayment', invoice);
    };

    return (
        <div className="page-stack">
            <PageHeader
                action={(
                    <div className="page-heading-actions">
                        <button className="btn primary" onClick={() => openWorkflow('createOrder')} type="button">Create order</button>
                        <button className="btn secondary" onClick={() => openWorkflow('savePharmacy')} type="button">Save</button>
                        <button className="btn secondary" onClick={() => openWorkflow('deletePharmacy')} type="button">Delete</button>
                        <button className="btn secondary" onClick={() => onNavigate?.('pharmacies')} type="button">Back</button>
                    </div>
                )}
                description="Review pharmacy performance, orders, invoices, payments, outstanding balances, and company-specific credit status."
                eyebrow="Pharmacy Detail"
                title={detail.profile.name}
            />

            <section className="rep-detail-hero pharmacy-detail-hero glass">
                <div className="rep-avatar">{initials}</div>
                <div>
                    <div className="rep-title-row">
                        <h2>{detail.profile.name}</h2>
                        <StatusBadge value={detail.profile.status} />
                    </div>
                    <p>{detail.profile.owner} / {detail.profile.phone}</p>
                    <p>{detail.profile.township} / {detail.profile.address}</p>
                </div>
                <div className="rep-profile-facts">
                    <span>Credit limit</span>
                    <strong>{detail.profile.creditLimit}</strong>
                    <span>Payment term</span>
                    <strong>{detail.profile.paymentTerm}</strong>
                    <span>Outstanding</span>
                    <strong>{detail.profile.outstanding}</strong>
                </div>
            </section>

            <div className="summary-grid">
                {detail.metrics.map((metric) => <SummaryCard key={metric.label} {...metric} />)}
            </div>

            <div className="rep-detail-grid pharmacy-detail-grid">
                <Panel eyebrow="Performance" title="Purchase performance">
                    <div className="performance-chart">
                        {detail.performanceChart.map((point) => (
                            <article key={point.label}>
                                <div>
                                    <strong>{point.label}</strong>
                                    <span>{point.value}</span>
                                </div>
                                <div className="chart-track">
                                    <span style={{ width: `${point.percent}%` }} />
                                </div>
                            </article>
                        ))}
                    </div>
                </Panel>

                <Panel eyebrow="Credit" title="Company credit status">
                    <CreditStatusGrid rows={detail.creditStatuses} />
                </Panel>
            </div>

            <PaginatedTableSection
                actions={[
                    { label: 'Save order', icon: 'S', onClick: (record) => openWorkflow('saveOrder', record) },
                    { label: 'Delete order', icon: 'D', onClick: (record) => openWorkflow('deleteOrder', record) },
                    { label: 'Generate invoice', icon: 'I', onClick: (record) => openWorkflow('generateInvoice', record) },
                ]}
                columns={detail.orderColumns}
                filters={detail.orderFilters}
                pageLabel="Orders"
                rows={detail.orderRows}
                title="Order history"
            />

            <PaginatedTableSection
                actions={[
                    { label: 'View invoice', icon: 'V', onClick: openInvoiceDetail },
                    { label: 'Record payment', icon: '$', onClick: (record) => openWorkflow('generatePayment', record) },
                    { label: 'Edit invoice', icon: 'E', onClick: (record) => openWorkflow('editInvoice', record) },
                    { label: 'Print invoice', icon: 'P', onClick: openInvoiceDetail },
                    { label: 'Delete invoice', icon: 'D', variant: 'danger', onClick: (record) => openWorkflow('deleteInvoice', record) },
                ]}
                columns={detail.invoiceColumns}
                filters={detail.invoiceFilters}
                onRowClick={openInvoiceDetail}
                pageLabel="Invoices"
                rows={detail.invoiceRows}
                title="Invoice list"
            />

            <PaginatedTableSection
                columns={detail.paymentColumns}
                filters={detail.paymentFilters}
                pageLabel="Payments"
                rows={detail.paymentRows}
                title="Payment history"
            />

            {activeWorkflow && (
                <WorkflowModal
                    detail={detail}
                    onClose={closeWorkflow}
                    record={activeWorkflow.record}
                    workflow={activeWorkflow.workflow}
                />
            )}

            <InvoiceDetailDrawer
                actions={(
                    <>
                        <button className="btn secondary" onClick={() => { closeInvoiceDetail(); openWorkflow('editInvoice', selectedInvoice); }} type="button">Edit invoice</button>
                        <button className="btn secondary" onClick={() => recordPayment(selectedInvoice)} type="button">Record payment</button>
                        <button className="btn primary" onClick={closeInvoiceDetail} type="button">Done</button>
                    </>
                )}
                customerName={detail.profile.name}
                fallbackInvoice={invoiceFallback}
                invoice={selectedInvoice}
                onClose={closeInvoiceDetail}
                open={Boolean(selectedInvoice)}
            />
        </div>
    );
}
