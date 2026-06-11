import MetricCard from '../../components/shared/MetricCard';
import PageHeader from '../../components/shared/PageHeader';
import Panel from '../../components/shared/Panel';
import { salesMetrics, salesStatusCounts } from '../../data/mock/salesDashboard';
import { salesPerformance } from '../../data/mock/salesModules';
import useApiResource from '../../hooks/useApiResource';

export default function SalesDashboardPage({ activePage, onNavigate }) {
    const dashboard = useApiResource('/sales/dashboard');
    const title = activePage === 'dashboard'
        ? 'Field Dashboard'
        : `${activePage.replace('-', ' ')} workspace`;
    const dashboardStats = dashboard.data ? [
        { label: 'Submitted orders', value: dashboard.data.submitted_orders, note: 'Waiting approval' },
        { label: 'Approved orders', value: dashboard.data.approved_orders, note: 'Ready for invoice' },
        { label: 'Monthly sales', value: Number(dashboard.data.monthly_sales || 0).toLocaleString(), note: 'Issued invoices' },
    ] : [salesMetrics[0], salesStatusCounts[0], salesMetrics[1]];

    return (
        <div className="sales-page">
            <PageHeader
                action={<button className="btn primary" onClick={() => onNavigate?.('new-order')} type="button">New order</button>}
                description="Mobile-first overview for order status, monthly sales, and order performance."
                eyebrow="Sales Representative"
                title={title}
            />

            <div className="sales-dashboard-stats">
                {dashboardStats.map((metric) => (
                    <MetricCard key={metric.label} {...metric} />
                ))}
            </div>

            <Panel eyebrow="Performance" title="Monthly performance">
                <div className="monthly-performance-chart">
                    <div className="monthly-chart-legend">
                        <span><i className="legend-sales" />Sales</span>
                        <span><i className="legend-orders" />Orders</span>
                    </div>
                    {salesPerformance.chart.map((month) => (
                        <article key={month.label}>
                            <div className="monthly-bar-group">
                                <div className="monthly-bar sales-bar" style={{ height: `${month.salesPercent}%` }} title={`Sales ${month.sales}`} />
                                <div className="monthly-bar orders-bar" style={{ height: `${month.orderPercent}%` }} title={`Orders ${month.orders}`} />
                            </div>
                            <strong className="monthly-chart-month">{month.label}</strong>
                            <div className="monthly-chart-values">
                                <span>{month.sales}</span>
                                <span>{month.orders}</span>
                            </div>
                        </article>
                    ))}
                </div>
            </Panel>
        </div>
    );
}
