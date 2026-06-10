import MetricCard from '../../components/shared/MetricCard';
import DataTable from '../../components/shared/DataTable';
import PageHeader from '../../components/shared/PageHeader';
import Panel from '../../components/shared/Panel';
import StatusBadge from '../../components/shared/StatusBadge';
import { officeAlerts, officeMetrics, orderQueue, topPharmacies, topProducts, topRepresentatives } from '../../data/mock/officeDashboard';

export default function DashboardPage({ activePage }) {
    const title = activePage === 'dashboard'
        ? 'Management Dashboard'
        : `${activePage.replace('-', ' ')} workspace`;

    return (
        <div className="page-stack">
            <PageHeader
                action={<button className="btn primary" type="button">Create record</button>}
                description="Operational overview for sales, inventory, receivables, payables, and field team activity."
                eyebrow="Office System"
                title={title}
            />

            <div className="metrics-grid">
                {officeMetrics.map((metric) => (
                    <MetricCard key={metric.label} {...metric} />
                ))}
            </div>

            <div className="admin-grid">
                <Panel eyebrow="Approval Queue" title="Live Sales Orders" className="wide">
                    <DataTable
                        columns={[
                            { key: 'id', label: 'Order' },
                            { key: 'pharmacy', label: 'Pharmacy' },
                            { key: 'rep', label: 'Sales Rep' },
                            { key: 'company', label: 'Company' },
                            { key: 'total', label: 'Total', type: 'money' },
                            { key: 'status', label: 'Status', type: 'status' },
                        ]}
                        rows={orderQueue}
                    />
                </Panel>

                <Panel eyebrow="Risk Monitor" title="Operational Alerts">
                    <div className="alert-list">
                        {officeAlerts.map((alert) => (
                            <div key={alert.title}>
                                <span className="alert-icon">
                                    <StatusBadge value={alert.status} />
                                </span>
                                <p>
                                    <strong>{alert.title}</strong>
                                    <small>{alert.detail}</small>
                                </p>
                            </div>
                        ))}
                    </div>
                </Panel>
            </div>

            <div className="admin-grid">
                <Panel eyebrow="Product Report" title="Top Products">
                    <DataTable
                        columns={[
                            { key: 'product', label: 'Product' },
                            { key: 'company', label: 'Company' },
                            { key: 'sales', label: 'Sales', type: 'money' },
                            { key: 'orders', label: 'Orders' },
                            { key: 'status', label: 'Status', type: 'status' },
                        ]}
                        rows={topProducts}
                    />
                </Panel>
                <Panel eyebrow="Customer Report" title="Top Pharmacies">
                    <DataTable
                        columns={[
                            { key: 'pharmacy', label: 'Pharmacy' },
                            { key: 'sales', label: 'Sales', type: 'money' },
                            { key: 'outstanding', label: 'Outstanding', type: 'money' },
                            { key: 'status', label: 'Status', type: 'status' },
                        ]}
                        rows={topPharmacies}
                    />
                </Panel>
                <Panel eyebrow="Team Report" title="Top Sales Representatives" className="wide">
                    <DataTable
                        columns={[
                            { key: 'rep', label: 'Sales Rep' },
                            { key: 'company', label: 'Company' },
                            { key: 'sales', label: 'Sales', type: 'money' },
                            { key: 'orders', label: 'Orders' },
                            { key: 'status', label: 'Status', type: 'status' },
                        ]}
                        rows={topRepresentatives}
                    />
                </Panel>
            </div>

            <div className="state-grid">
                <article><strong>Empty state</strong><small>Tables show a no-record message</small></article>
                <article><strong>Loading state</strong><small>Shared table supports loading rows</small></article>
                <article><strong>Error state</strong><small>Shared table supports inline API errors</small></article>
            </div>
        </div>
    );
}
