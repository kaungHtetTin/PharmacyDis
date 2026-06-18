import { useState } from 'react';
import DataTable from '../../components/shared/DataTable';
import FilterToolbar from '../../components/shared/FilterToolbar';
import PageHeader from '../../components/shared/PageHeader';
import PaginationBar from '../../components/shared/PaginationBar';
import Panel from '../../components/shared/Panel';
import StatusBadge from '../../components/shared/StatusBadge';
import SummaryCard from '../../components/shared/SummaryCard';
import useApiResource from '../../hooks/useApiResource';
import { mapOrders } from '../../services/screenAdapters';

const purchaseFilters = [
    { label: 'Status', options: ['All', 'Submitted', 'Approved', 'Delivered', 'Rejected'] },
    { label: 'Period', options: ['All', 'This Month', 'Last Month', 'This Year'] },
];
const paymentFilters = [
    { label: 'Method', options: ['All', 'Cash', 'Bank', 'Mobile Pay'] },
    { label: 'Status', options: ['All', 'Completed', 'Partial Payment', 'Pending'] },
];
const purchaseColumns = [
    { key: 'order', label: 'Order' },
    { key: 'date', label: 'Date' },
    { key: 'items', label: 'Items' },
    { key: 'baseQty', label: 'Base Qty' },
    { key: 'amount', label: 'Amount', type: 'money' },
    { key: 'status', label: 'Status', type: 'status' },
];
const paymentColumns = [
    { key: 'payment', label: 'Payment' },
    { key: 'invoice', label: 'Invoice' },
    { key: 'date', label: 'Date' },
    { key: 'method', label: 'Method' },
    { key: 'amount', label: 'Amount', type: 'money' },
    { key: 'status', label: 'Status', type: 'status' },
];

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

function initials(name) {
    return String(name || 'Pharmacy')
        .split(' ')
        .filter(Boolean)
        .map((part) => part[0])
        .join('')
        .slice(0, 3);
}

function usePagination(rows, pageSize = 4) {
    const [pageIndex, setPageIndex] = useState(0);
    const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
    const pageStart = pageIndex * pageSize;
    const pageEnd = Math.min(pageStart + pageSize, rows.length);
    const visibleRows = rows.slice(pageStart, pageEnd);

    return {
        pageEnd,
        pageIndex,
        pageStart,
        setPageIndex,
        totalPages,
        visibleRows,
    };
}

function PaginatedHistoryTable({ columns, error = '', filters, loading = false, rows, title }) {
    const pagination = usePagination(rows);

    return (
        <Panel eyebrow="History" title={title}>
            <FilterToolbar filters={filters} searchPlaceholder={`Search ${title.toLowerCase()}`} showDate />
            <DataTable columns={columns} error={error} loading={loading} rows={pagination.visibleRows} />
            <PaginationBar
                currentPage={pagination.pageIndex + 1}
                from={rows.length ? pagination.pageStart + 1 : 0}
                lastPage={pagination.totalPages}
                loading={loading}
                onNext={() => pagination.setPageIndex((page) => Math.min(pagination.totalPages - 1, page + 1))}
                onPrevious={() => pagination.setPageIndex((page) => Math.max(0, page - 1))}
                to={pagination.pageEnd}
                total={rows.length}
            />
        </Panel>
    );
}

function purchaseRows(orders = []) {
    return mapOrders({ data: orders }).map((order) => ({
        id: order.id,
        order: order.order,
        date: order.submittedDate || '-',
        items: `${order.orderItems?.length || 0} products`,
        baseQty: order.baseQuantity,
        amount: order.total,
        status: order.status,
    }));
}

function paymentRows(payments = []) {
    return payments.map((payment) => ({
        id: payment.id,
        payment: payment.payment_no,
        invoice: (payment.allocations || [])
            .map((allocation) => allocation.invoice?.invoice_no)
            .filter(Boolean)
            .join(', ') || '-',
        date: dateOnly(payment.payment_date),
        method: titleCase(payment.payment_method),
        amount: money(payment.amount),
        status: 'Recorded',
    }));
}

export default function SalesPharmacyDetailPage({ onNavigate }) {
    const params = new URLSearchParams(window.location.search);
    const customerId = params.get('customer_id') || '';
    const detailResource = useApiResource(customerId ? `/sales/customers/${customerId}/detail` : '');
    const detail = detailResource.data || {};
    const customer = detail.customer || {};
    const company = detail.company || {};
    const credit = detail.credit_status || {};
    const summary = detail.summary || {};

    if (!customerId) {
        return (
            <div className="sales-page">
                <PageHeader
                    action={<button className="btn secondary" onClick={() => onNavigate?.('pharmacies')} type="button">Back</button>}
                    description="Open a pharmacy from the pharmacy list to review purchase history, payment history, and assigned-company credit status."
                    eyebrow="Pharmacy Detail"
                    title="Select pharmacy"
                />
            </div>
        );
    }

    return (
        <div className="sales-page">
            <PageHeader
                action={(
                    <div className="page-heading-actions">
                        <button className="btn secondary" onClick={() => onNavigate?.('pharmacies')} type="button">Back</button>
                    </div>
                )}
                description="Review customer profile, assigned-company credit status, purchase history, and payment history."
                eyebrow="Pharmacy Detail"
                title={customer.name || (detailResource.loading ? 'Loading pharmacy' : 'Pharmacy detail')}
            />

            {detailResource.error && <span className="error-text">{detailResource.error}</span>}

            <section className="rep-detail-hero pharmacy-detail-hero glass">
                <div className="rep-avatar">{initials(customer.name)}</div>
                <div>
                    <div className="rep-title-row">
                        <h2>{customer.name || 'Pharmacy'}</h2>
                        <StatusBadge value={titleCase(customer.status || 'active')} />
                    </div>
                    <p>{customer.owner_name || '-'} / {customer.phone || '-'}</p>
                    <p>{customer.township || customer.city || '-'} / {customer.address || '-'}</p>
                </div>
                <div className="rep-profile-facts">
                    <span>Assigned company</span>
                    <strong>{company.name || credit.company?.name || '-'}</strong>
                    <span>Outstanding</span>
                    <strong>{money(summary.outstanding)}</strong>
                    <span>Credit status</span>
                    <strong>{titleCase(credit.credit_status || 'active')}</strong>
                </div>
            </section>

            <div className="summary-grid">
                <SummaryCard label="Monthly sales" note={`${summary.monthly_order_count || 0} orders this month`} value={money(summary.monthly_sales)} />
                <SummaryCard label="Outstanding" note={`${summary.unpaid_invoice_count || 0} open invoices`} value={money(summary.outstanding)} />
                <SummaryCard label="Last order" note={summary.last_order_no || 'No recent orders'} value={summary.last_order_date || '-'} />
            </div>

            <Panel eyebrow="Credit Control" title="Assigned company status">
                <div className="profile-company-list profile-company-list-wide">
                    {[
                        { label: 'Assigned company', value: company.name || credit.company?.name || '-', status: 'Ready' },
                        { label: 'Credit status', value: credit.reason || 'No overdue balance for this company.', status: titleCase(credit.credit_status || 'active') },
                        { label: 'Oldest due', value: credit.overdue_days ? `${credit.overdue_days} days overdue` : '-', status: credit.overdue_days ? 'Warning' : 'Ready' },
                    ].map((note) => (
                        <article key={note.label}>
                            <div>
                                <strong>{note.label}</strong>
                                <small>{note.value}</small>
                            </div>
                            <StatusBadge value={note.status} />
                        </article>
                    ))}
                </div>
            </Panel>

            <PaginatedHistoryTable
                columns={purchaseColumns}
                error={detailResource.error}
                filters={purchaseFilters}
                loading={detailResource.loading}
                rows={purchaseRows(detail.orders || [])}
                title="Purchase history"
            />

            <PaginatedHistoryTable
                columns={paymentColumns}
                error={detailResource.error}
                filters={paymentFilters}
                loading={detailResource.loading}
                rows={paymentRows(detail.payments || [])}
                title="Payment history"
            />
        </div>
    );
}
