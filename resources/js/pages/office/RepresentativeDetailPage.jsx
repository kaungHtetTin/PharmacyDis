import { useEffect, useState } from 'react';
import DataTable from '../../components/shared/DataTable';
import PageHeader from '../../components/shared/PageHeader';
import PaginationBar from '../../components/shared/PaginationBar';
import Panel from '../../components/shared/Panel';
import StatusBadge from '../../components/shared/StatusBadge';
import SummaryCard from '../../components/shared/SummaryCard';
import useApiResource from '../../hooks/useApiResource';

const salesHistoryColumns = [
    { key: 'order', label: 'Order' },
    { key: 'pharmacy', label: 'Pharmacy' },
    { key: 'company', label: 'Company' },
    { key: 'date', label: 'Date' },
    { key: 'amount', label: 'Amount', type: 'money' },
    { key: 'status', label: 'Status', type: 'status' },
];

function initials(name) {
    return String(name || 'Sales Rep')
        .split(' ')
        .filter(Boolean)
        .map((part) => part[0])
        .join('')
        .slice(0, 3);
}

function SalesBarChart({ emptyLabel = 'No sales data yet.', rows = [] }) {
    const hasData = rows.some((row) => Number(row.rawValue || 0) > 0);

    if (!hasData) {
        return <span className="muted">{emptyLabel}</span>;
    }

    return (
        <div className="rep-sales-bar-chart">
            {rows.map((point) => (
                <article key={point.label}>
                    <strong>{point.value}</strong>
                    <div className="rep-sales-bar-frame">
                        <span style={{ height: `${Math.max(4, point.percent || 0)}%` }} title={`${point.label}: ${point.value}`} />
                    </div>
                    <div>
                        <b>{point.label}</b>
                        {point.note && <small>{point.note}</small>}
                    </div>
                </article>
            ))}
        </div>
    );
}

export default function RepresentativeDetailPage({ onNavigate }) {
    const params = new URLSearchParams(window.location.search);
    const recordId = params.get('record_id') || '';
    const [salesHistoryPage, setSalesHistoryPage] = useState(1);
    const detailResource = useApiResource(recordId ? `/office/sales-representatives/${recordId}/detail?sales_page=${salesHistoryPage}&sales_per_page=10` : '');
    const detail = detailResource.data || {};
    const profile = detail.profile || {};
    const salesHistoryPagination = detail.salesHistoryPagination;

    useEffect(() => {
        setSalesHistoryPage(1);
    }, [recordId]);

    if (!recordId) {
        return (
            <div className="page-stack">
                <PageHeader
                    action={<button className="btn secondary" onClick={() => onNavigate?.('representatives')} type="button">Back to reps</button>}
                    description="Open a representative from the sales team list to review live performance and order history."
                    eyebrow="Sales Representative Detail"
                    title="Select representative"
                />
            </div>
        );
    }

    return (
        <div className="page-stack">
            <PageHeader
                action={<button className="btn secondary" onClick={() => onNavigate?.('representatives')} type="button">Back to reps</button>}
                description="Review field sales performance, yearly and monthly sales charts, and paginated sales history."
                eyebrow="Sales Representative Detail"
                title={`${profile.name || (detailResource.loading ? 'Loading representative' : 'Sales Rep')} Performance`}
            />

            {detailResource.error && <span className="error-text">{detailResource.error}</span>}

            <section className="rep-detail-hero glass">
                <div className="rep-avatar">{initials(profile.name)}</div>
                <div>
                    <div className="rep-title-row">
                        <h2>{profile.name || 'Sales Rep'}</h2>
                        <StatusBadge value={profile.status || 'Active'} />
                    </div>
                    <p>{profile.code || '-'} / {profile.region || '-'}</p>
                    <p>{profile.phone || '-'}</p>
                </div>
                <div className="rep-profile-facts">
                    <span>Assigned company</span>
                    <strong>{profile.companies || '-'}</strong>
                    <span>Product access</span>
                    <strong>{profile.productAccess || '-'}</strong>
                </div>
            </section>

            <div className="summary-grid">
                {(detail.metrics || []).map((metric) => <SummaryCard key={metric.label} {...metric} />)}
            </div>

            <div className="rep-detail-grid">
                <Panel eyebrow="Annual Sales" title="Sales by year">
                    <SalesBarChart emptyLabel="No yearly sales data yet." rows={detail.yearlySalesChart || []} />
                </Panel>

                <Panel eyebrow="Monthly Sales" title={`Sales by month ${new Date().getFullYear()}`}>
                    <SalesBarChart emptyLabel="No monthly sales data yet." rows={detail.monthlySalesChart || []} />
                </Panel>
            </div>

            <Panel eyebrow="Sales History" title="Orders handled by this representative">
                <DataTable
                    columns={salesHistoryColumns}
                    error={detailResource.error}
                    loading={detailResource.loading}
                    rows={detail.salesHistoryRows || []}
                />
                {salesHistoryPagination && (
                    <PaginationBar
                        currentPage={salesHistoryPagination.currentPage}
                        emptyLabel="No sales history to show"
                        from={salesHistoryPagination.from}
                        lastPage={salesHistoryPagination.lastPage}
                        loading={detailResource.loading}
                        onNext={() => setSalesHistoryPage((page) => Math.min(salesHistoryPagination.lastPage, page + 1))}
                        onPrevious={() => setSalesHistoryPage((page) => Math.max(1, page - 1))}
                        to={salesHistoryPagination.to}
                        total={salesHistoryPagination.total}
                    />
                )}
            </Panel>
        </div>
    );
}
