import DataTable from '../../components/shared/DataTable';
import PageHeader from '../../components/shared/PageHeader';
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

export default function RepresentativeDetailPage({ onNavigate }) {
    const params = new URLSearchParams(window.location.search);
    const recordId = params.get('record_id') || '';
    const detailResource = useApiResource(recordId ? `/office/sales-representatives/${recordId}/detail` : '');
    const detail = detailResource.data || {};
    const profile = detail.profile || {};

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
                description="Review field sales performance, weekly trend, sales history, pharmacy ranking, and product-based commission preview."
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
                <Panel eyebrow="Performance" title="Monthly sales chart">
                    <div className="performance-chart">
                        {(detail.performanceChart || []).map((point) => (
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
                        {!detailResource.loading && !(detail.performanceChart || []).length && <span className="muted">No performance data yet.</span>}
                    </div>
                </Panel>

                <Panel eyebrow="Ranking" title="Top products">
                    <div className="compact-list">
                        {(detail.topProducts || []).map((product) => (
                            <article key={product.label}>
                                <div>
                                    <strong>{product.label}</strong>
                                    <small>{product.note}</small>
                                </div>
                                <strong>{product.value}</strong>
                            </article>
                        ))}
                        {!detailResource.loading && !(detail.topProducts || []).length && <span className="muted">No product sales yet.</span>}
                    </div>
                </Panel>
            </div>

            <Panel eyebrow="Sales History" title="Orders handled by this representative">
                <DataTable
                    columns={salesHistoryColumns}
                    error={detailResource.error}
                    loading={detailResource.loading}
                    rows={detail.salesHistoryRows || []}
                />
            </Panel>

            <Panel eyebrow="Customers" title="Pharmacy ranking">
                <div className="compact-list">
                    {(detail.pharmacyRanking || []).map((pharmacy) => (
                        <article key={pharmacy.label}>
                            <div>
                                <strong>{pharmacy.label}</strong>
                                <small>{pharmacy.note}</small>
                            </div>
                            <strong>{pharmacy.value}</strong>
                        </article>
                    ))}
                    {!detailResource.loading && !(detail.pharmacyRanking || []).length && <span className="muted">No pharmacy sales yet.</span>}
                </div>
            </Panel>
        </div>
    );
}
