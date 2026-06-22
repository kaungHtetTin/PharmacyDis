import MetricCard from '../../components/shared/MetricCard';
import DataTable from '../../components/shared/DataTable';
import PageHeader from '../../components/shared/PageHeader';
import Panel from '../../components/shared/Panel';
import StatusBadge from '../../components/shared/StatusBadge';
import useApiResource from '../../hooks/useApiResource';
import { mapOrders } from '../../services/screenAdapters';

export default function DashboardPage({ activePage }) {
    const dashboard = useApiResource('/office/dashboard');
    const orders = useApiResource('/office/orders?per_page=5');
    const title = activePage === 'dashboard'
        ? 'Management Dashboard'
        : `${activePage.replace('-', ' ')} workspace`;
    const liveMetrics = [
        { label: 'Pending orders', value: dashboard.data ? dashboard.data.pending_orders : '-', note: 'Waiting office review' },
        { label: 'Unpaid invoices', value: dashboard.data ? dashboard.data.unpaid_invoices : '-', note: 'Receivables follow-up' },
        { label: 'Monthly sales', value: dashboard.data ? Number(dashboard.data.monthly_sales || 0).toLocaleString() : '-', note: 'Issued invoices' },
        { label: 'Low stock products', value: dashboard.data ? dashboard.data.low_stock_products : '-', note: 'Need stock review' },
    ];
    const liveOrderQueue = orders.data ? mapOrders(orders.data) : [];
    const operationalAlerts = dashboard.data?.alerts || [];
    const topProducts = dashboard.data?.top_products || [];
    const topPharmacies = dashboard.data?.top_customers || [];
    const topRepresentatives = dashboard.data?.top_representatives || [];

    return (
        <div className="page-stack">
            <PageHeader
                description="Operational overview for sales, inventory, receivables, payables, and field team activity."
                eyebrow="Office System"
                title={title}
            />

            <div className="metrics-grid">
                {liveMetrics.map((metric) => (
                    <MetricCard key={metric.label} {...metric} />
                ))}
            </div>

            <div className="admin-grid">
                <Panel eyebrow="Approval Queue" title="Live Sales Orders" className="wide">
                    <DataTable
                        columns={[
                            { key: 'order', label: 'Order' },
                            { key: 'pharmacy', label: 'Pharmacy' },
                            { key: 'rep', label: 'Sales Rep' },
                            { key: 'company', label: 'Company' },
                            { key: 'total', label: 'Total', type: 'money' },
                            { key: 'status', label: 'Status', type: 'status' },
                        ]}
                        error={orders.error}
                        loading={orders.loading}
                        rows={liveOrderQueue}
                    />
                </Panel>

                <Panel eyebrow="Risk Monitor" title="Operational Alerts">
                    <div className="alert-list">
                        {operationalAlerts.length === 0 && <span className="muted">No operational alerts.</span>}
                        {operationalAlerts.map((alert) => (
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
                        loading={dashboard.loading}
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
                        loading={dashboard.loading}
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
                        loading={dashboard.loading}
                        rows={topRepresentatives}
                    />
                </Panel>
            </div>

        </div>
    );
}
