import DataTable from './DataTable';

function toNumber(value) {
    return Number(value || 0);
}

function FinanceLineChart({ chart }) {
    const labels = chart?.labels || [];
    const series = chart?.series || [];

    if (!labels.length || !series.length) {
        return <span className="muted">No finance trend found for the selected period.</span>;
    }

    const width = 720;
    const height = 230;
    const padding = { top: 18, right: 22, bottom: 38, left: 58 };
    const values = series.flatMap((item) => item.values || []).map(toNumber);
    const rawMaxValue = Math.max(0, ...values);
    const rawMinValue = Math.min(0, ...values);
    const maxValue = rawMaxValue === 0 && rawMinValue === 0 ? 1 : rawMaxValue;
    const minValue = rawMaxValue === 0 && rawMinValue === 0 ? -1 : rawMinValue;
    const range = maxValue - minValue || 1;
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;
    const xFor = (index) => padding.left + (labels.length === 1 ? chartWidth / 2 : (index / (labels.length - 1)) * chartWidth);
    const yFor = (value) => padding.top + ((maxValue - value) / range) * chartHeight;
    const zeroY = yFor(0);
    const labelStep = Math.max(1, Math.ceil(labels.length / 8));

    return (
        <div className="finance-line-chart">
            <svg aria-label={chart.title} className="finance-line-svg" role="img" viewBox={`0 0 ${width} ${height}`}>
                {[0, 0.25, 0.5, 0.75, 1].map((tick) => {
                    const y = padding.top + tick * chartHeight;
                    return <line className="finance-grid-line" key={tick} x1={padding.left} x2={width - padding.right} y1={y} y2={y} />;
                })}
                <line className="finance-zero-line" x1={padding.left} x2={width - padding.right} y1={zeroY} y2={zeroY} />
                {series.map((item) => {
                    const points = (item.values || []).map((value, index) => `${xFor(index)},${yFor(toNumber(value))}`).join(' ');

                    return (
                        <g key={item.label}>
                            <polyline className="finance-line-path" fill="none" points={points} stroke={item.color || '#2563eb'} />
                            {(item.values || []).map((value, index) => (
                                <circle
                                    className="finance-line-point"
                                    cx={xFor(index)}
                                    cy={yFor(toNumber(value))}
                                    fill={item.color || '#2563eb'}
                                    key={`${item.label}-${labels[index]}`}
                                    r="3"
                                />
                            ))}
                        </g>
                    );
                })}
                {labels.map((label, index) => (
                    index % labelStep === 0 || index === labels.length - 1 ? (
                        <text className="finance-axis-label" key={label} textAnchor="middle" x={xFor(index)} y={height - 12}>{label}</text>
                    ) : null
                ))}
                <text className="finance-axis-label" textAnchor="end" x={padding.left - 8} y={padding.top + 4}>{Math.round(maxValue).toLocaleString()}</text>
                <text className="finance-axis-label" textAnchor="end" x={padding.left - 8} y={zeroY + 4}>0</text>
                {minValue < 0 && <text className="finance-axis-label" textAnchor="end" x={padding.left - 8} y={height - padding.bottom}>{Math.round(minValue).toLocaleString()}</text>}
            </svg>
            <div className="finance-line-legend">
                {series.map((item) => (
                    <span key={item.label}>
                        <i style={{ background: item.color || '#2563eb' }} />
                        {item.label}
                        <strong>{item.total}</strong>
                    </span>
                ))}
            </div>
        </div>
    );
}

function FinanceBarChart({ chart }) {
    const series = chart?.series || [];

    if (!series.length) {
        return <span className="muted">No sales performance found for the selected period.</span>;
    }

    return (
        <div className="finance-bar-chart">
            {series.map((item, index) => (
                <article key={item.label}>
                    <strong>{item.displayValue || Number(item.value || 0).toLocaleString()}</strong>
                    <div className="finance-bar-track">
                        <span style={{ height: `${Math.max(4, item.percent || 0)}%` }} />
                    </div>
                    <b>#{index + 1}</b>
                    <small>{item.label}</small>
                    {item.note && <em>{item.note}</em>}
                </article>
            ))}
        </div>
    );
}

export default function FinanceReportOverview({
    data,
    error = '',
    filterControls = [],
    loading = false,
    onFilterChange,
    onReset,
}) {
    const metrics = data?.metrics || [];
    const insights = data?.insights || [];
    const summary = data?.summary || [];
    const tableColumns = data?.tableColumns || [];
    const tableRows = data?.tableRows || [];
    const periodSummary = summary.find((item) => item.label === 'Duration');
    const reportTitle = data?.lineChart?.title || 'Finance overview';

    return (
        <div className="report-command-center finance-report-overview">
            <div className="report-control-band finance-report-control-band">
                <div>
                    <span>Finance scope</span>
                    <strong>{reportTitle}</strong>
                </div>
                <div className="report-control-fields">
                    {filterControls.map((filter) => (
                        <label className="report-control-field" key={filter.key}>
                            <span>{filter.label}</span>
                            {filter.type === 'date' ? (
                                <input
                                    aria-label={filter.label}
                                    onChange={(event) => onFilterChange?.(filter.key, event.target.value)}
                                    type="date"
                                    value={filter.value || ''}
                                />
                            ) : (
                                <select
                                    aria-label={filter.label}
                                    onChange={(event) => onFilterChange?.(filter.key, event.target.value)}
                                    value={filter.value}
                                >
                                    <option value="">{filter.placeholder || filter.label}</option>
                                    {filter.options.map((option) => (
                                        <option key={option.value} value={option.value}>{option.label}</option>
                                    ))}
                                </select>
                            )}
                        </label>
                    ))}
                    <button className="btn secondary filter-reset-btn" onClick={onReset} type="button">Reset</button>
                </div>
                {periodSummary && <small className="report-period-hint">{periodSummary.note}</small>}
            </div>

            {error && <span className="error-text">{error}</span>}
            {loading && <span className="muted">Loading finance report...</span>}

            <div className="report-kpi-strip finance-kpi-strip">
                {metrics.map((metric) => (
                    <article key={metric.label}>
                        <span>{metric.label}</span>
                        <strong>{metric.value}</strong>
                        <small>{metric.note}</small>
                    </article>
                ))}
            </div>

            <section className="finance-chart-card">
                <div className="section-heading">
                    <div>
                        <p className="eyebrow">{data?.lineChart?.eyebrow || 'Profit Trend'}</p>
                        <h2>{reportTitle}</h2>
                    </div>
                </div>
                <FinanceLineChart chart={data?.lineChart} />
            </section>

            <section className="finance-chart-card">
                <div className="section-heading">
                    <div>
                        <p className="eyebrow">{data?.barChart?.eyebrow || 'Performance'}</p>
                        <h2>{data?.barChart?.title || 'Top performance'}</h2>
                    </div>
                </div>
                <FinanceBarChart chart={data?.barChart} />
            </section>

            {insights.length > 0 && (
                <section className="report-insight-panel">
                    {insights.map((insight) => (
                        <article key={insight.label}>
                            <span>{insight.label}</span>
                            <strong>{insight.value}</strong>
                            <small>{insight.note}</small>
                        </article>
                    ))}
                </section>
            )}

            {summary.length > 0 && (
                <section className="finance-summary-strip">
                    {summary.map((item) => (
                        <article key={item.label}>
                            <span>{item.label}</span>
                            <strong>{item.value}</strong>
                            <small>{item.note}</small>
                        </article>
                    ))}
                </section>
            )}

            {tableRows.length > 0 && (
                <section className="report-table-panel">
                    <p className="eyebrow">Performance detail</p>
                    <DataTable actions={[]} columns={tableColumns} rows={tableRows} />
                </section>
            )}
        </div>
    );
}
