import DataTable from '../../components/shared/DataTable';
import MetricCard from '../../components/shared/MetricCard';
import PageHeader from '../../components/shared/PageHeader';
import Panel from '../../components/shared/Panel';
import SummaryCard from '../../components/shared/SummaryCard';
import StatusBadge from '../../components/shared/StatusBadge';
import Icon from '../../components/shared/Icon';
import { assignedCompanies, assignedProducts, customerNotes, quickActions, salesMetrics, salesStatusCounts } from '../../data/mock/salesDashboard';

export default function SalesDashboardPage({ activePage, onNavigate }) {
    const title = activePage === 'dashboard'
        ? 'Field Dashboard'
        : `${activePage.replace('-', ' ')} workspace`;

    return (
        <div className="sales-page">
            <PageHeader
                action={<button className="btn primary" type="button">New order</button>}
                description="Mobile-first overview for assigned companies, order status, sales activity, and customer credit alerts."
                eyebrow="Sales Representative"
                title={title}
            />

            <div className="sales-metrics">
                {salesMetrics.map((metric) => (
                    <MetricCard key={metric.label} {...metric} />
                ))}
            </div>

            <div className="summary-grid">
                {salesStatusCounts.map((metric) => <SummaryCard key={metric.label} {...metric} />)}
            </div>

            <Panel eyebrow="Quick Actions" title="Start work">
                <div className="sales-quick-actions">
                    {quickActions.map((action) => (
                        <button key={action.label} onClick={() => onNavigate?.(action.href)} type="button">
                            <Icon name={action.icon} size={18} />
                            <span>{action.label}</span>
                        </button>
                    ))}
                </div>
            </Panel>

            <Panel eyebrow="Assigned Companies" title="Coverage">
                <DataTable
                    columns={[
                        { key: 'company', label: 'Company' },
                        { key: 'products', label: 'Products' },
                        { key: 'orders', label: 'Orders' },
                        { key: 'status', label: 'Status', type: 'status' },
                    ]}
                    rows={assignedCompanies}
                />
            </Panel>

            <Panel eyebrow="Assigned Catalog" title="Available Products">
                <div className="compact-list">
                    {assignedProducts.map((product) => (
                        <article key={product.code}>
                            <div>
                                <strong>{product.name}</strong>
                                <small>{product.code} / {product.company}</small>
                            </div>
                            <div>
                                <strong>{product.stock}</strong>
                                <StatusBadge value={product.status} />
                            </div>
                        </article>
                    ))}
                </div>
            </Panel>

            <Panel eyebrow="Credit Control" title="Customer Notes">
                <div className="compact-list">
                    {customerNotes.map((customer) => (
                        <article key={customer.name}>
                            <div>
                                <strong>{customer.name}</strong>
                                <small>{customer.company} / Outstanding balance: {customer.balance}</small>
                            </div>
                            <StatusBadge value={customer.status} />
                        </article>
                    ))}
                </div>
            </Panel>
        </div>
    );
}
