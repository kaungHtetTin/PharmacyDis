import { useState } from 'react';
import CreditStatusGrid from '../../components/shared/CreditStatusGrid';
import DataTable from '../../components/shared/DataTable';
import Drawer from '../../components/shared/Drawer';
import FinanceReview from '../../components/shared/FinanceReview';
import FormField from '../../components/shared/FormField';
import InvoiceDetailDrawer from '../../components/shared/InvoiceDetailDrawer';
import Modal from '../../components/shared/Modal';
import OrderLineBuilder from '../../components/shared/OrderLineBuilder';
import { isBlockedCredit } from '../../components/shared/OrderCreditGate';
import PageHeader from '../../components/shared/PageHeader';
import PaginationBar from '../../components/shared/PaginationBar';
import Panel from '../../components/shared/Panel';
import StatusBadge from '../../components/shared/StatusBadge';
import SummaryCard from '../../components/shared/SummaryCard';
import useApiResource from '../../hooks/useApiResource';
import { api } from '../../services/apiClient';
import { rememberGeneratedInvoice } from '../../services/generatedInvoiceCache';
import { mapInvoices, mapOrders, mapPayments, unwrapCollection } from '../../services/screenAdapters';

function money(value) {
    return Number(value || 0).toLocaleString();
}

function titleCase(value) {
    return String(value || '')
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function dateOnly(value) {
    return value ? String(value).slice(0, 10) : '-';
}

function PaymentDetailDrawer({ onClose, open, payment }) {
    if (!payment) {
        return null;
    }

    return (
        <Drawer
            actions={<button className="btn primary" onClick={onClose} type="button">Done</button>}
            eyebrow="Payment Detail"
            onClose={onClose}
            open={open}
            title={payment.payment}
        >
            <div className="detail-stack">
                <section className="drawer-section">
                    <p className="eyebrow">Payment overview</p>
                    <div className="fact-grid">
                        {[
                            ['Payment no.', payment.payment],
                            ['Customer', payment.pharmacy],
                            ['Company', payment.company],
                            ['Payment date', payment.date],
                            ['Amount', payment.amount],
                            ['Method', payment.method],
                            ['Reference no.', payment.referenceNo],
                            ['Status', payment.status],
                        ].map(([label, value]) => (
                            <div key={label}>
                                <span>{label}</span>
                                <strong>{value || '-'}</strong>
                            </div>
                        ))}
                    </div>
                </section>
                <FinanceReview allocations={payment.allocations || []} />
            </div>
        </Drawer>
    );
}

const historyPageSize = 5;
const blankOrderLine = {
    id: 'pharmacy-order-line-1',
    product_id: '',
    unit_id: '',
    quantity: '1',
};

function findProduct(products, productId) {
    return products.find((product) => String(product.id) === String(productId));
}

function defaultProductUnit(product) {
    return product?.product_units?.find((unit) => unit.is_default_sales_unit)
        || product?.product_units?.find((unit) => unit.is_base_unit)
        || product?.product_units?.[0];
}

function HistorySection({ actions = [], columns, error = '', loading = false, onPageChange, onRowClick, page = 1, rows, title }) {
    const total = rows.length;
    const lastPage = Math.max(1, Math.ceil(total / historyPageSize));
    const currentPage = Math.min(page, lastPage);
    const from = total ? (currentPage - 1) * historyPageSize + 1 : 0;
    const to = Math.min(currentPage * historyPageSize, total);
    const visibleRows = rows.slice(from ? from - 1 : 0, to);

    return (
        <Panel eyebrow="History" title={title}>
            <DataTable
                actions={actions}
                columns={columns}
                error={error}
                loading={loading}
                onRowClick={onRowClick}
                rows={visibleRows}
            />
            <PaginationBar
                currentPage={currentPage}
                emptyLabel={`No ${title.toLowerCase()} to show`}
                from={from}
                lastPage={lastPage}
                loading={loading}
                onNext={() => onPageChange?.(currentPage + 1)}
                onPrevious={() => onPageChange?.(currentPage - 1)}
                to={to}
                total={total}
            />
        </Panel>
    );
}

function PharmacyOrderModal({
    companies = [],
    creditStatuses = [],
    customer,
    error = '',
    form,
    lines,
    onChange,
    onClose,
    onLineChange,
    onSubmit,
    open,
    products = [],
    productsLoading = false,
    representatives = [],
    representativesLoading = false,
    submitting = false,
}) {
    const selectedCredit = creditStatuses.find((credit) => String(credit.company_id) === String(form.company_id));
    const creditStatus = titleCase(selectedCredit?.credit_status || 'active');
    const blocked = isBlockedCredit(creditStatus);

    return (
        <Modal
            busy={submitting}
            onClose={onClose}
            onSubmit={onSubmit}
            open={open}
            submitDisabled={blocked || submitting}
            submitDisabledReason={error || (blocked ? 'Company credit is blocked. Order creation is not allowed.' : '')}
            submitLabel="Create and approve order"
            title={`Create order - ${customer?.name || 'Pharmacy'}`}
        >
            <div className="order-create-form sales-order-create-form">
                <section className="order-setup-card">
                    <div className="section-heading">
                        <div>
                            <p className="eyebrow">Selected pharmacy</p>
                            <h2>{customer?.name || 'Pharmacy'}</h2>
                        </div>
                    </div>
                    <div className="sales-order-context-grid">
                        <label className="form-field">
                            <span>Company</span>
                            <select disabled={submitting} name="company_id" onChange={onChange} required value={form.company_id}>
                                <option value="" disabled>Select company</option>
                                {companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}
                            </select>
                        </label>
                        <label className="form-field">
                            <span>Sales representative</span>
                            <select disabled={!form.company_id || representativesLoading || submitting} name="sales_representative_id" onChange={onChange} value={form.sales_representative_id}>
                                <option value="">{representativesLoading ? 'Loading representatives' : 'No representative'}</option>
                                {representatives.map((representative) => (
                                    <option key={representative.id} value={representative.id}>
                                        {representative.user?.name || representative.employee_code || `Rep #${representative.id}`}
                                    </option>
                                ))}
                            </select>
                        </label>
                        <FormField label="Requested delivery date" name="requested_delivery_date" onChange={onChange} type="date" value={form.requested_delivery_date} />
                        <article className={`order-credit-summary ${blocked ? 'is-blocked' : ''}`}>
                            <div>
                                <span>Company credit</span>
                                <StatusBadge value={creditStatus} />
                            </div>
                            <strong>{blocked ? 'Order creation is blocked' : 'Order creation is allowed'}</strong>
                            <small>{selectedCredit?.reason || 'No overdue balance for this company.'}</small>
                            <small>Outstanding: {money(selectedCredit?.outstanding_balance || 0)}</small>
                        </article>
                        <label className="form-field sales-order-note">
                            <span>Order note</span>
                            <textarea disabled={submitting} name="note" onChange={onChange} placeholder="Optional note for warehouse or finance" rows="3" value={form.note} />
                        </label>
                    </div>
                </section>

                <OrderLineBuilder
                    allowFallback={false}
                    disabled={!form.company_id || blocked || productsLoading || submitting}
                    onChange={onLineChange}
                    productOptions={products}
                    value={lines}
                />
                <p className="helper-copy">
                    This order is created for the selected pharmacy, approved immediately, and reserves available batch stock.
                </p>
            </div>
        </Modal>
    );
}

export default function PharmacyDetailPage({ onNavigate }) {
    const params = new URLSearchParams(window.location.search);
    const customerId = params.get('customer_id') || '';
    const detailResource = useApiResource(customerId ? `/office/customers/${customerId}/detail` : '');
    const [orderModalOpen, setOrderModalOpen] = useState(false);
    const [orderForm, setOrderForm] = useState({
        company_id: '',
        sales_representative_id: '',
        requested_delivery_date: '',
        note: '',
    });
    const [orderLines, setOrderLines] = useState([{ ...blankOrderLine }]);
    const [orderError, setOrderError] = useState('');
    const [orderSubmitting, setOrderSubmitting] = useState(false);
    const [selectedInvoice, setSelectedInvoice] = useState(null);
    const [selectedPayment, setSelectedPayment] = useState(null);
    const [orderPage, setOrderPage] = useState(1);
    const [invoicePage, setInvoicePage] = useState(1);
    const [paymentPage, setPaymentPage] = useState(1);
    const [actionError, setActionError] = useState('');
    const [actionBusy, setActionBusy] = useState(false);
    const companiesResource = useApiResource(orderModalOpen ? '/lookups/companies' : '');
    const productsResource = useApiResource(orderModalOpen && orderForm.company_id ? `/lookups/products?company_id=${orderForm.company_id}` : '');
    const representativesResource = useApiResource(orderModalOpen && orderForm.company_id ? `/lookups/sales-representatives?company_id=${orderForm.company_id}` : '');
    const detail = detailResource.data || {};
    const customer = detail.customer || {};
    const orders = detail.orders ? mapOrders({ data: detail.orders }) : [];
    const invoices = detail.invoices ? mapInvoices({ data: detail.invoices }) : [];
    const payments = detail.payments ? mapPayments({ data: detail.payments }) : [];
    const creditStatuses = (detail.credit_statuses || []).map((credit) => ({
        company: credit.company?.name || `Company #${credit.company_id}`,
        status: titleCase(credit.credit_status),
        reason: credit.reason || 'No overdue balance',
        outstanding: money(credit.outstanding_balance),
        oldestDue: credit.overdue_days ? `${credit.overdue_days} days overdue` : '-',
    }));
    const summary = detail.summary || {};
    const initials = String(customer.name || 'Pharmacy')
        .split(' ')
        .filter(Boolean)
        .map((part) => part[0])
        .join('')
        .slice(0, 3);
    const companies = unwrapCollection(companiesResource.data);
    const products = unwrapCollection(productsResource.data);
    const representatives = unwrapCollection(representativesResource.data);
    const goToPage = (setter) => (page) => setter(Math.max(1, page));
    const approveOrder = async (record) => {
        if (!record?.id || actionBusy) {
            return;
        }

        setActionBusy(true);
        setActionError('');

        try {
            await api.post(`/office/orders/${record.id}/approve`);
            window.dispatchEvent(new Event('office-submitted-orders-changed'));
            detailResource.refresh();
        } catch (error) {
            setActionError(error.message);
            window.alert(error.message);
        } finally {
            setActionBusy(false);
        }
    };
    const generateInvoice = async (record) => {
        if (!record?.id || actionBusy) {
            return;
        }

        if (!['approved', 'invoiced'].includes(String(record.status_value || '').toLowerCase())) {
            window.alert('Approve this order before generating an invoice.');
            return;
        }

        setActionBusy(true);
        setActionError('');

        try {
            const invoice = await api.post(`/office/orders/${record.id}/generate-invoice`);
            rememberGeneratedInvoice(invoice);
            detailResource.refresh();
        } catch (error) {
            setActionError(error.message);
            window.alert(error.message);
        } finally {
            setActionBusy(false);
        }
    };
    const openOrderModal = () => {
        setOrderForm({
            company_id: '',
            sales_representative_id: '',
            requested_delivery_date: '',
            note: '',
        });
        setOrderLines([{ ...blankOrderLine, id: `pharmacy-order-line-${Date.now()}` }]);
        setOrderError('');
        setOrderModalOpen(true);
    };
    const closeOrderModal = () => {
        if (!orderSubmitting) {
            setOrderModalOpen(false);
        }
    };
    const updateOrderForm = (event) => {
        const { name, value } = event.target;

        setOrderForm((current) => ({
            ...current,
            [name]: value,
            ...(name === 'company_id' ? { sales_representative_id: '' } : {}),
        }));

        if (name === 'company_id') {
            setOrderLines([{ ...blankOrderLine, id: `pharmacy-order-line-${Date.now()}` }]);
        }

        setOrderError('');
    };
    const updateOrderLines = (nextLines) => {
        setOrderLines(nextLines.map((line) => {
            if (!line.product_id || line.unit_id) {
                return line;
            }

            const unit = defaultProductUnit(findProduct(products, line.product_id));

            return {
                ...line,
                unit_id: unit?.unit_id || '',
            };
        }));
        setOrderError('');
    };
    const submitOrder = async () => {
        setOrderSubmitting(true);
        setOrderError('');

        try {
            await api.post('/office/orders', {
                ...orderForm,
                customer_id: customer.id,
                sales_representative_id: orderForm.sales_representative_id || null,
                requested_delivery_date: orderForm.requested_delivery_date || null,
                note: orderForm.note || null,
                auto_approve: true,
                items: orderLines
                    .filter((line) => line.product_id && line.unit_id && Number(line.quantity || line.orderedQuantity || 0) > 0)
                    .map((line) => ({
                        product_id: line.product_id,
                        unit_id: line.unit_id,
                        quantity: Number(line.quantity || line.orderedQuantity || 1),
                    })),
            });
            detailResource.refresh();
            setOrderModalOpen(false);
        } catch (error) {
            setOrderError(error.message);
        } finally {
            setOrderSubmitting(false);
        }
    };

    if (!customerId) {
        return (
            <div className="page-stack">
                <PageHeader
                    action={<button className="btn secondary" onClick={() => onNavigate?.('pharmacies')} type="button">Back to pharmacies</button>}
                    description="Open a pharmacy from the pharmacy list to review linked orders, invoices, and payments."
                    eyebrow="Pharmacy Detail"
                    title="Select pharmacy"
                />
            </div>
        );
    }

    return (
        <div className="page-stack">
            <PageHeader
                action={(
                    <div className="page-heading-actions">
                        <button className="btn primary" onClick={openOrderModal} type="button">Create order</button>
                        <button className="btn secondary" onClick={() => onNavigate?.('pharmacies')} type="button">Back to pharmacies</button>
                    </div>
                )}
                description="Review real pharmacy orders, invoices, payments, outstanding balances, and company-specific credit status."
                eyebrow="Pharmacy Detail"
                title={customer.name || 'Pharmacy detail'}
            />

            {detailResource.error && <span className="error-text">{detailResource.error}</span>}
            {actionError && <span className="error-text">{actionError}</span>}

            <section className="rep-detail-hero pharmacy-detail-hero glass">
                <div className="rep-avatar">{initials || 'PH'}</div>
                <div>
                    <div className="rep-title-row">
                        <h2>{customer.name || (detailResource.loading ? 'Loading pharmacy' : 'Pharmacy')}</h2>
                        <StatusBadge value={titleCase(customer.status || 'active')} />
                    </div>
                    <p>{customer.owner_name || '-'} / {customer.phone || '-'}</p>
                    <p>{customer.township || customer.city || '-'} / {customer.address || '-'}</p>
                </div>
                <div className="rep-profile-facts">
                    <span>Code</span>
                    <strong>{customer.code || '-'}</strong>
                    <span>Email</span>
                    <strong>{customer.email || '-'}</strong>
                    <span>Outstanding</span>
                    <strong>{money(summary.outstanding)}</strong>
                </div>
            </section>

            <div className="summary-grid">
                <SummaryCard label="Monthly sales" note={`${summary.monthly_order_count || 0} orders this month`} value={money(summary.monthly_sales)} />
                <SummaryCard label="Outstanding" note="Open invoice balance" value={money(summary.outstanding)} />
                <SummaryCard label="Invoices" note={`${summary.unpaid_invoice_count || 0} open invoices`} value={money(summary.invoice_count)} />
                <SummaryCard label="Payment rate" note="Paid against invoice total" value={`${summary.payment_rate || 0}%`} />
            </div>

            <Panel eyebrow="Credit" title="Company credit status">
                <CreditStatusGrid rows={creditStatuses} />
            </Panel>

            <HistorySection
                actions={[
                    { label: 'Open order detail', icon: 'V', onClick: (record) => onNavigate?.('orders', { order_id: record.id }) },
                    { label: 'Approve order', icon: 'A', onClick: approveOrder },
                    { label: 'Generate invoice', icon: 'I', onClick: generateInvoice },
                ]}
                columns={[
                    { key: 'order', label: 'Order' },
                    { key: 'company', label: 'Company' },
                    { key: 'rep', label: 'Sales Rep' },
                    { key: 'submittedDate', label: 'Date' },
                    { key: 'baseQuantity', label: 'Base Qty' },
                    { key: 'total', label: 'Total', type: 'money' },
                    { key: 'status', label: 'Status', type: 'status' },
                ]}
                error={detailResource.error}
                loading={detailResource.loading}
                onPageChange={goToPage(setOrderPage)}
                onRowClick={(record) => onNavigate?.('orders', { order_id: record.id })}
                page={orderPage}
                rows={orders}
                title="Order history"
            />

            <HistorySection
                actions={[
                    { label: 'View invoice', icon: 'V', onClick: setSelectedInvoice },
                    { label: 'Open order detail', icon: 'cart', onClick: (record) => record.sales_order_id && onNavigate?.('orders', { order_id: record.sales_order_id }) },
                ]}
                columns={[
                    { key: 'invoice', label: 'Invoice' },
                    { key: 'order', label: 'Order' },
                    { key: 'company', label: 'Company' },
                    { key: 'dueDate', label: 'Due Date' },
                    { key: 'amount', label: 'Amount', type: 'money' },
                    { key: 'paidAmount', label: 'Paid', type: 'money' },
                    { key: 'balanceAmount', label: 'Balance', type: 'money' },
                    { key: 'status', label: 'Status', type: 'status' },
                ]}
                error={detailResource.error}
                loading={detailResource.loading}
                onPageChange={goToPage(setInvoicePage)}
                onRowClick={setSelectedInvoice}
                page={invoicePage}
                rows={invoices}
                title="Invoice history"
            />

            <HistorySection
                columns={[
                    { key: 'payment', label: 'Payment' },
                    { key: 'company', label: 'Company' },
                    { key: 'date', label: 'Date' },
                    { key: 'method', label: 'Method' },
                    { key: 'amount', label: 'Amount', type: 'money' },
                    { key: 'status', label: 'Status', type: 'status' },
                ]}
                error={detailResource.error}
                loading={detailResource.loading}
                onPageChange={goToPage(setPaymentPage)}
                onRowClick={setSelectedPayment}
                page={paymentPage}
                rows={payments}
                title="Payment history"
            />

            <InvoiceDetailDrawer
                actions={(
                    <>
                        {selectedInvoice?.sales_order_id && (
                            <button className="btn secondary" onClick={() => onNavigate?.('orders', { order_id: selectedInvoice.sales_order_id })} type="button">Open order detail</button>
                        )}
                        <button className="btn primary" onClick={() => setSelectedInvoice(null)} type="button">Done</button>
                    </>
                )}
                customerName={customer.name}
                invoice={selectedInvoice}
                onClose={() => setSelectedInvoice(null)}
                open={Boolean(selectedInvoice)}
            />

            <PaymentDetailDrawer
                onClose={() => setSelectedPayment(null)}
                open={Boolean(selectedPayment)}
                payment={selectedPayment}
            />

            <PharmacyOrderModal
                companies={companies}
                creditStatuses={detail.credit_statuses || []}
                customer={customer}
                error={orderError || companiesResource.error || productsResource.error || representativesResource.error}
                form={orderForm}
                lines={orderLines}
                onChange={updateOrderForm}
                onClose={closeOrderModal}
                onLineChange={updateOrderLines}
                onSubmit={submitOrder}
                open={orderModalOpen}
                products={products}
                productsLoading={productsResource.loading}
                representatives={representatives}
                representativesLoading={representativesResource.loading}
                submitting={orderSubmitting}
            />
        </div>
    );
}
