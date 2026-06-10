import DataTable from './DataTable';
import SummaryCard from './SummaryCard';
import Tabs from './Tabs';

export default function ReportsWorkspace({ categories = [], metrics = [], tableColumns = [], tableRows = [] }) {
    const tabs = categories.map((category) => ({
        key: category.key,
        label: category.label,
        content: (
            <div className="report-category-panel">
                <div className="mini-metric-grid">
                    {category.metrics.map((metric) => (
                        <div key={metric.label}>
                            <span>{metric.label}</span>
                            <strong>{metric.value}</strong>
                            <small>{metric.note}</small>
                        </div>
                    ))}
                </div>
                <div className="line-list">
                    {category.filters.map((filter) => <span key={filter}>{filter}</span>)}
                </div>
            </div>
        ),
    }));

    return (
        <div className="reports-workspace">
            {metrics.length > 0 && (
                <section className="drawer-section">
                    <p className="eyebrow">Report metrics</p>
                    <div className="summary-grid">
                        {metrics.map((metric) => <SummaryCard key={metric.label} {...metric} />)}
                    </div>
                </section>
            )}
            {tabs.length > 0 && <Tabs tabs={tabs} />}
            {tableRows.length > 0 && (
                <section className="drawer-section">
                    <p className="eyebrow">Report table preview</p>
                    <DataTable actions={[]} columns={tableColumns} rows={tableRows} />
                </section>
            )}
        </div>
    );
}
