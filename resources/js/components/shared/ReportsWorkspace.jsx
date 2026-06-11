import DataTable from './DataTable';
import SummaryCard from './SummaryCard';
import Tabs from './Tabs';

function ReportChart({ chart }) {
    if (!chart?.series?.length) {
        return null;
    }

    return (
        <section className="drawer-section">
            <div className="section-heading">
                <div>
                    <p className="eyebrow">{chart.eyebrow || 'Chart'}</p>
                    <h2>{chart.title}</h2>
                </div>
            </div>
            <div className={`report-chart report-chart-${chart.type || 'bar'}`}>
                {chart.series.map((item) => (
                    <article key={item.label}>
                        <div>
                            <strong>{item.label}</strong>
                            <span>{item.value}</span>
                        </div>
                        <div className="report-chart-track">
                            <span style={{ width: `${item.percent}%` }} />
                        </div>
                        {item.note && <small>{item.note}</small>}
                    </article>
                ))}
            </div>
        </section>
    );
}

function SummaryBreakdown({ summary = [] }) {
    if (!summary.length) {
        return null;
    }

    return (
        <section className="drawer-section">
            <p className="eyebrow">Report summary</p>
            <div className="report-summary-grid">
                {summary.map((item) => (
                    <article key={item.label}>
                        <span>{item.label}</span>
                        <strong>{item.value}</strong>
                        <small>{item.note}</small>
                    </article>
                ))}
            </div>
        </section>
    );
}

export default function ReportsWorkspace({
    categories = [],
    chart,
    metrics = [],
    summary = [],
    tableColumns = [],
    tableRows = [],
}) {
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
            <ReportChart chart={chart} />
            <SummaryBreakdown summary={summary} />
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
