import { useState } from 'react';
import CreditStatusGrid from '../../components/shared/CreditStatusGrid';
import DataTable from '../../components/shared/DataTable';
import FilterToolbar from '../../components/shared/FilterToolbar';
import FormField from '../../components/shared/FormField';
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
    if (!value) {
        return '-';
    }

    const text = String(value).trim();
    const match = text.match(/^(\d{4}-\d{2}-\d{2})(?:[T\s].*)?$/);

    return match ? match[1] : text.slice(0, 10);
}

function defaultPaymentDueDate() {
    const dueDays = Number(window.appConfig?.invoiceDueDays ?? 30);
    const date = new Date();
    date.setDate(date.getDate() + dueDays);

    return date.toISOString().slice(0, 10);
}

function notifyOperationalActionsChanged() {
    window.dispatchEvent(new Event('office-operational-actions-changed'));
}

function promptInvoiceTaxAmount() {
    const input = window.prompt('Total tax amount for this invoice (optional)', '0');

    if (input === null) {
        return null;
    }

    const normalized = String(input).trim() === '' ? 0 : Number(input);

    if (!Number.isFinite(normalized) || normalized < 0) {
        window.alert('Enter a valid tax amount, or leave it blank for zero.');
        return null;
    }

    return normalized;
}

const historyPageSize = 5;
const blankHistoryFilters = {
    company_id: '',
    date_from: '',
    date_to: '',
    search: '',
    status: '',
};
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

function includesText(...values) {
    const search = String(values.pop() || '').trim().toLowerCase();

    if (!search) {
        return true;
    }

    return values.some((value) => String(value || '').toLowerCase().includes(search));
}

function withinDateRange(value, from, to) {
    const date = dateOnly(value);

    if (!date) {
        return !from && !to;
    }

    return (!from || date >= from) && (!to || date <= to);
}

function filterHistoryRows(rows, filters, dateKey, searchKeys = []) {
    return rows.filter((row) => {
        const statusValue = String(row.status_value || row.status || '').toLowerCase().replace(/\s+/g, '_');

        return (!filters.company_id || String(row.company_id) === String(filters.company_id))
            && (!filters.status || statusValue === filters.status)
            && withinDateRange(row[dateKey], filters.date_from, filters.date_to)
            && includesText(...searchKeys.map((key) => row[key]), filters.search);
    });
}

function HistorySection({
    actions = [],
    columns,
    error = '',
    filterBar = null,
    loading = false,
    onPageChange,
    onRowClick,
    page = 1,
    rows,
    title,
}) {
    const total = rows.length;
    const lastPage = Math.max(1, Math.ceil(total / historyPageSize));
    const currentPage = Math.min(page, lastPage);
    const from = total ? (currentPage - 1) * historyPageSize + 1 : 0;
    const to = Math.min(currentPage * historyPageSize, total);
    const visibleRows = rows.slice(from ? from - 1 : 0, to);

    return (
        <Panel eyebrow="History" title={title}>
            {filterBar}
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
    stockError = '',
    stockLoading = false,
    stockRows = [],
    submitting = false,
    warehouses = [],
    warehousesLoading = false,
}) {
    const selectedCredit = creditStatuses.find((credit) => String(credit.company_id) === String(form.company_id));
    const creditStatus = titleCase(selectedCredit?.credit_status || 'active');
    const blocked = isBlockedCredit(creditStatus);
    const missingWarehouse = !form.warehouse_id;

    return (
        <Modal
            busy={submitting}
            onClose={onClose}
            onSubmit={onSubmit}
            open={open}
            submitDisabled={blocked || missingWarehouse || submitting}
            submitDisabledReason={error || (blocked ? 'Company credit is blocked. Order creation is not allowed.' : '') || (missingWarehouse ? 'Select a warehouse before creating the approved order.' : '')}
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
                        <label className="form-field order-route-company">
                            <span>Company</span>
                            <select disabled={submitting} name="company_id" onChange={onChange} required value={form.company_id}>
                                <option value="" disabled>Select company</option>
                                {companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}
                            </select>
                        </label>
                        <label className="form-field order-route-sales">
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
                        <label className="form-field order-route-warehouse">
                            <span>Reserve from warehouse</span>
                            <select disabled={warehousesLoading || submitting} name="warehouse_id" onChange={onChange} required value={form.warehouse_id}>
                                <option value="" disabled>{warehousesLoading ? 'Loading warehouses' : 'Select warehouse'}</option>
                                {warehouses.map((warehouse) => (
                                    <option key={warehouse.id} value={warehouse.id}>
                                        {warehouse.name}{warehouse.code ? ` (${warehouse.code})` : ''}
                                    </option>
                                ))}
                            </select>
                        </label>
                        <FormField className="order-route-date" label="Requested delivery date" name="requested_delivery_date" onChange={onChange} type="date" value={form.requested_delivery_date} />
                        <FormField className="order-route-date" label="Payment due date" name="payment_due_date" onChange={onChange} required type="date" value={form.payment_due_date} />
                        <FormField className="order-route-date" label="Tax amount" name="tax_amount" onChange={onChange} type="number" value={form.tax_amount} />
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
                    stockError={stockError}
                    stockLoading={stockLoading}
                    stockRows={stockRows}
                    value={lines}
                    warehouseId={form.warehouse_id}
                />
                <p className="helper-copy">
                    This order is approved immediately. Stock is reserved from the selected warehouse by nearest expiry date.
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
        warehouse_id: '',
        requested_delivery_date: '',
        payment_due_date: defaultPaymentDueDate(),
        tax_amount: '0',
        note: '',
    });
    const [orderLines, setOrderLines] = useState([{ ...blankOrderLine }]);
    const [orderError, setOrderError] = useState('');
    const [orderSubmitting, setOrderSubmitting] = useState(false);
    const [approvalModalOpen, setApprovalModalOpen] = useState(false);
    const [approvalOrder, setApprovalOrder] = useState(null);
    const [approvalForm, setApprovalForm] = useState({ warehouse_id: '' });
    const [approvalError, setApprovalError] = useState('');
    const [approvalSubmitting, setApprovalSubmitting] = useState(false);
    const [orderPage, setOrderPage] = useState(1);
    const [invoicePage, setInvoicePage] = useState(1);
    const [paymentPage, setPaymentPage] = useState(1);
    const [orderFilters, setOrderFilters] = useState(blankHistoryFilters);
    const [invoiceFilters, setInvoiceFilters] = useState(blankHistoryFilters);
    const [paymentFilters, setPaymentFilters] = useState(blankHistoryFilters);
    const [actionError, setActionError] = useState('');
    const [actionBusy, setActionBusy] = useState(false);
    const companiesResource = useApiResource(orderModalOpen ? '/lookups/companies' : '');
    const warehousesResource = useApiResource(orderModalOpen || approvalModalOpen ? '/office/warehouses?per_page=100' : '');
    const productsResource = useApiResource(orderModalOpen && orderForm.company_id ? `/lookups/products?company_id=${orderForm.company_id}` : '');
    const representativesResource = useApiResource(orderModalOpen && orderForm.company_id ? `/lookups/sales-representatives?company_id=${orderForm.company_id}` : '');
    const stockResource = useApiResource(orderModalOpen && orderForm.company_id && orderForm.warehouse_id ? `/office/stock/current?company_id=${orderForm.company_id}&warehouse_id=${orderForm.warehouse_id}&per_page=100` : '', { keepPreviousData: true });
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
    const historyCompanyOptions = (detail.credit_statuses || [])
        .map((credit) => ({ label: credit.company?.name || `Company #${credit.company_id}`, value: String(credit.company_id) }))
        .filter((company, index, companies) => company.value && companies.findIndex((item) => item.value === company.value) === index);
    const orderStatusOptions = [
        { label: 'Draft', value: 'draft' },
        { label: 'Submitted', value: 'submitted' },
        { label: 'Approved', value: 'approved' },
        { label: 'Invoiced', value: 'invoiced' },
        { label: 'Delivered', value: 'delivered' },
        { label: 'Rejected', value: 'rejected' },
        { label: 'Cancelled', value: 'cancelled' },
    ];
    const invoiceStatusOptions = [
        { label: 'Issued', value: 'issued' },
        { label: 'Partial', value: 'partial' },
        { label: 'Paid', value: 'paid' },
        { label: 'Overdue', value: 'overdue' },
        { label: 'Void', value: 'void' },
    ];
    const paymentStatusOptions = [
        { label: 'Recorded', value: 'recorded' },
    ];
    const filteredOrders = filterHistoryRows(orders, orderFilters, 'submittedDate', ['order', 'company', 'rep', 'status']);
    const filteredInvoices = filterHistoryRows(invoices, invoiceFilters, 'invoice_date', ['invoice', 'order', 'company', 'status']);
    const filteredPayments = filterHistoryRows(payments, paymentFilters, 'payment_date');
    const summary = detail.summary || {};
    const initials = String(customer.name || 'Pharmacy')
        .split(' ')
        .filter(Boolean)
        .map((part) => part[0])
        .join('')
        .slice(0, 3);
    const companies = unwrapCollection(companiesResource.data);
    const warehouses = unwrapCollection(warehousesResource.data);
    const products = unwrapCollection(productsResource.data);
    const representatives = unwrapCollection(representativesResource.data);
    const stockRows = unwrapCollection(stockResource.data);
    const goToPage = (setter) => (page) => setter(Math.max(1, page));
    const updateHistoryFilter = (setter, pageSetter) => (key, value) => {
        setter((current) => ({ ...current, [key]: value }));
        pageSetter(1);
    };
    const resetHistoryFilters = (setter, pageSetter) => () => {
        setter(blankHistoryFilters);
        pageSetter(1);
    };
    const orderHistoryFilterControls = [
        {
            key: 'company_id',
            label: 'Company',
            options: historyCompanyOptions,
            placeholder: 'All companies',
            value: orderFilters.company_id,
        },
        {
            key: 'status',
            label: 'Status',
            options: orderStatusOptions,
            placeholder: 'All statuses',
            value: orderFilters.status,
        },
    ];
    const invoiceHistoryFilterControls = [
        {
            key: 'company_id',
            label: 'Company',
            options: historyCompanyOptions,
            placeholder: 'All companies',
            value: invoiceFilters.company_id,
        },
        {
            key: 'status',
            label: 'Status',
            options: invoiceStatusOptions,
            placeholder: 'All statuses',
            value: invoiceFilters.status,
        },
    ];
    const paymentHistoryFilterControls = [
        {
            key: 'company_id',
            label: 'Company',
            options: historyCompanyOptions,
            placeholder: 'All companies',
            value: paymentFilters.company_id,
        },
        {
            key: 'status',
            label: 'Status',
            options: paymentStatusOptions,
            placeholder: 'All statuses',
            value: paymentFilters.status,
        },
    ];
    const openInvoiceDetail = (invoice) => {
        if (!invoice?.id) {
            return;
        }

        onNavigate?.('invoice-detail', { invoice_id: invoice.id });
    };
    const openPaymentDetail = (payment) => {
        if (!payment?.id) {
            return;
        }

        onNavigate?.('payment-detail', { payment_id: payment.id });
    };
    const approveOrder = async (record) => {
        if (!record?.id || actionBusy) {
            return;
        }

        setApprovalOrder(record);
        setApprovalForm({ warehouse_id: record?.warehouse_id || warehouses[0]?.id || '' });
        setApprovalError('');
        setApprovalModalOpen(true);
    };
    const closeApprovalModal = (force = false) => {
        if (force || !approvalSubmitting) {
            setApprovalModalOpen(false);
            setApprovalOrder(null);
            setApprovalForm({ warehouse_id: '' });
            setApprovalError('');
        }
    };
    const updateApprovalForm = (event) => {
        const { name, value } = event.target;

        setApprovalForm((current) => ({ ...current, [name]: value }));
        setApprovalError('');
    };
    const submitApproval = async () => {
        if (!approvalOrder?.id || actionBusy || approvalSubmitting) {
            return;
        }

        if (!approvalForm.warehouse_id) {
            setApprovalError('Select a warehouse before approving this order.');
            return;
        }

        setActionBusy(true);
        setApprovalSubmitting(true);
        setActionError('');
        setApprovalError('');

        try {
            await api.post(`/office/orders/${approvalOrder.id}/approve`, {
                warehouse_id: approvalForm.warehouse_id,
            });
            notifyOperationalActionsChanged();
            detailResource.refresh();
            closeApprovalModal(true);
        } catch (error) {
            setActionError(error.message);
            setApprovalError(error.message);
        } finally {
            setActionBusy(false);
            setApprovalSubmitting(false);
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
            const taxAmount = Number(record.tax_amount || 0) > 0 ? Number(record.tax_amount) : promptInvoiceTaxAmount();

            if (taxAmount === null) {
                return;
            }

            const invoice = await api.post(`/office/orders/${record.id}/generate-invoice`, { tax_amount: taxAmount });
            rememberGeneratedInvoice(invoice);
            notifyOperationalActionsChanged();
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
            warehouse_id: '',
            requested_delivery_date: '',
            payment_due_date: defaultPaymentDueDate(),
            tax_amount: '0',
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
                warehouse_id: orderForm.warehouse_id || null,
                requested_delivery_date: orderForm.requested_delivery_date || null,
                payment_due_date: orderForm.payment_due_date || null,
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
            notifyOperationalActionsChanged();
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
                <CreditStatusGrid compact rows={creditStatuses} />
            </Panel>

            <HistorySection
                actions={[
                    { label: 'Open order detail', icon: 'V', onClick: (record) => onNavigate?.('order-detail', { order_id: record.id }) },
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
                filterBar={(
                    <FilterToolbar
                        className="adaptive-filter-toolbar pharmacy-history-filter"
                        collapsibleSearch
                        dateFromValue={orderFilters.date_from}
                        dateToValue={orderFilters.date_to}
                        filters={orderHistoryFilterControls}
                        onDateFromChange={(value) => updateHistoryFilter(setOrderFilters, setOrderPage)('date_from', value)}
                        onDateToChange={(value) => updateHistoryFilter(setOrderFilters, setOrderPage)('date_to', value)}
                        onFilterChange={updateHistoryFilter(setOrderFilters, setOrderPage)}
                        onReset={resetHistoryFilters(setOrderFilters, setOrderPage)}
                        onSearch={(value) => updateHistoryFilter(setOrderFilters, setOrderPage)('search', value)}
                        searchPlaceholder="Search order, company, or sales rep"
                        searchValue={orderFilters.search}
                    />
                )}
                loading={detailResource.loading}
                onPageChange={goToPage(setOrderPage)}
                onRowClick={(record) => onNavigate?.('order-detail', { order_id: record.id })}
                page={orderPage}
                rows={filteredOrders}
                title="Order history"
            />

            <HistorySection
                actions={[
                    { label: 'View invoice', icon: 'V', onClick: openInvoiceDetail },
                    { label: 'Open order detail', icon: 'cart', onClick: (record) => record.sales_order_id && onNavigate?.('order-detail', { order_id: record.sales_order_id }) },
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
                filterBar={(
                    <FilterToolbar
                        className="adaptive-filter-toolbar pharmacy-history-filter"
                        collapsibleSearch
                        dateFromValue={invoiceFilters.date_from}
                        dateToValue={invoiceFilters.date_to}
                        filters={invoiceHistoryFilterControls}
                        onDateFromChange={(value) => updateHistoryFilter(setInvoiceFilters, setInvoicePage)('date_from', value)}
                        onDateToChange={(value) => updateHistoryFilter(setInvoiceFilters, setInvoicePage)('date_to', value)}
                        onFilterChange={updateHistoryFilter(setInvoiceFilters, setInvoicePage)}
                        onReset={resetHistoryFilters(setInvoiceFilters, setInvoicePage)}
                        onSearch={(value) => updateHistoryFilter(setInvoiceFilters, setInvoicePage)('search', value)}
                        searchPlaceholder="Search invoice, order, or company"
                        searchValue={invoiceFilters.search}
                    />
                )}
                loading={detailResource.loading}
                onPageChange={goToPage(setInvoicePage)}
                onRowClick={openInvoiceDetail}
                page={invoicePage}
                rows={filteredInvoices}
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
                filterBar={(
                    <FilterToolbar
                        className="adaptive-filter-toolbar pharmacy-history-filter no-search"
                        dateFromValue={paymentFilters.date_from}
                        dateToValue={paymentFilters.date_to}
                        filters={paymentHistoryFilterControls}
                        onDateFromChange={(value) => updateHistoryFilter(setPaymentFilters, setPaymentPage)('date_from', value)}
                        onDateToChange={(value) => updateHistoryFilter(setPaymentFilters, setPaymentPage)('date_to', value)}
                        onFilterChange={updateHistoryFilter(setPaymentFilters, setPaymentPage)}
                        onReset={resetHistoryFilters(setPaymentFilters, setPaymentPage)}
                        showSearch={false}
                    />
                )}
                loading={detailResource.loading}
                onPageChange={goToPage(setPaymentPage)}
                onRowClick={openPaymentDetail}
                page={paymentPage}
                rows={filteredPayments}
                title="Payment history"
            />

            <Modal
                busy={approvalSubmitting || warehousesResource.loading}
                onClose={closeApprovalModal}
                onSubmit={submitApproval}
                open={approvalModalOpen}
                submitDisabled={approvalSubmitting || warehousesResource.loading || !approvalForm.warehouse_id}
                submitDisabledReason={approvalError || warehousesResource.error || (!approvalForm.warehouse_id ? 'Select a warehouse to reserve stock.' : '')}
                submitLabel="Approve and reserve stock"
                title={`Approve order - ${approvalOrder?.order || 'Order'}`}
            >
                <div className="approval-form">
                    <div className="workflow-context-card">
                        <span>{customer?.name || 'Customer order'}</span>
                        <strong>{approvalOrder?.order || 'Selected order'}</strong>
                        <small>{approvalOrder?.company || 'Reserve stock by nearest expiry date'}</small>
                    </div>
                    {approvalError && <p className="form-error">{approvalError}</p>}
                    <label className="form-field">
                        <span>Reserve from warehouse</span>
                        <select name="warehouse_id" onChange={updateApprovalForm} required value={approvalForm.warehouse_id}>
                            <option value="" disabled>{warehousesResource.loading ? 'Loading warehouses' : 'Select warehouse'}</option>
                            {warehouses.map((warehouse) => (
                                <option key={warehouse.id} value={warehouse.id}>
                                    {warehouse.name}{warehouse.code ? ` (${warehouse.code})` : ''}
                                </option>
                            ))}
                        </select>
                    </label>
                    <p className="helper-copy">The system reserves this order from the selected warehouse by nearest expiry date.</p>
                </div>
            </Modal>

            <PharmacyOrderModal
                companies={companies}
                creditStatuses={detail.credit_statuses || []}
                customer={customer}
                error={orderError || companiesResource.error || productsResource.error || representativesResource.error || warehousesResource.error}
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
                stockError={stockResource.error}
                stockLoading={stockResource.loading}
                stockRows={stockRows}
                submitting={orderSubmitting}
                warehouses={warehouses}
                warehousesLoading={warehousesResource.loading}
            />
        </div>
    );
}
