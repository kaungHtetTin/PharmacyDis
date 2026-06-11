import DataTable from '../../components/shared/DataTable';
import PageHeader from '../../components/shared/PageHeader';
import Panel from '../../components/shared/Panel';
import StatusBadge from '../../components/shared/StatusBadge';
import SummaryCard from '../../components/shared/SummaryCard';
import { representativeDetail } from '../../data/mock/representativeDetail';

export default function RepresentativeDetailPage({ onNavigate }) {
    const detail = representativeDetail;

    return (
        <div className="page-stack">
            <PageHeader
                action={<button className="btn secondary" onClick={() => onNavigate?.('representatives')} type="button">Back to reps</button>}
                description="Review field sales performance, weekly trend, sales history, pharmacy ranking, and product-based commission preview."
                eyebrow="Sales Representative Detail"
                title={`${detail.profile.name} Performance`}
            />

            <section className="rep-detail-hero glass">
                <div className="rep-avatar">{detail.profile.name.split(' ').map((part) => part[0]).join('')}</div>
                <div>
                    <div className="rep-title-row">
                        <h2>{detail.profile.name}</h2>
                        <StatusBadge value={detail.profile.status} />
                    </div>
                    <p>{detail.profile.code} / {detail.profile.region}</p>
                    <p>{detail.profile.phone}</p>
                </div>
                <div className="rep-profile-facts">
                    <span>Assigned company</span>
                    <strong>{detail.profile.companies}</strong>
                    <span>Product access</span>
                    <strong>{detail.profile.productAccess}</strong>
                </div>
            </section>

            <div className="summary-grid">
                {detail.metrics.map((metric) => <SummaryCard key={metric.label} {...metric} />)}
            </div>

            <div className="rep-detail-grid">
                <Panel eyebrow="Performance" title="Monthly sales chart">
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

                <Panel eyebrow="Ranking" title="Top products">
                    <div className="compact-list">
                        {detail.topProducts.map((product) => (
                            <article key={product.label}>
                                <div>
                                    <strong>{product.label}</strong>
                                    <small>{product.note}</small>
                                </div>
                                <strong>{product.value}</strong>
                            </article>
                        ))}
                    </div>
                </Panel>
            </div>

            <Panel eyebrow="Sales History" title="Orders handled by this representative">
                <DataTable
                    columns={detail.salesHistoryColumns}
                    rows={detail.salesHistoryRows}
                />
            </Panel>

            <Panel eyebrow="Customers" title="Pharmacy ranking">
                <div className="compact-list">
                    {detail.pharmacyRanking.map((pharmacy) => (
                        <article key={pharmacy.label}>
                            <div>
                                <strong>{pharmacy.label}</strong>
                                <small>{pharmacy.note}</small>
                            </div>
                            <strong>{pharmacy.value}</strong>
                        </article>
                    ))}
                </div>
            </Panel>
        </div>
    );
}
