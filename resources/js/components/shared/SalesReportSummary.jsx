import DataTable from './DataTable';

export default function SalesReportSummary({
    data,
    error = '',
    filterControls = [],
    loading = false,
    onFilterChange,
    onReset,
}) {
    const metrics = data?.metrics || [];
    const series = data?.chart?.series || [];
    const insights = data?.insights || [];
    const periodSummary = (data?.summary || []).find((item) => item.label === 'Duration');
    const tableColumns = data?.tableColumns || [];
    const tableRows = data?.tableRows || [];
    const reportTitle = data?.chart?.title || 'Top 10 sales';

    return (
        <div className="report-command-center">
            <div className="report-control-band">
                <div>
                    <span>Report scope</span>
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
            {loading && <span className="muted">Loading report...</span>}

            <div className="report-kpi-strip">
                {metrics.map((metric) => (
                    <article key={metric.label}>
                        <span>{metric.label}</span>
                        <strong>{metric.value}</strong>
                        <small>{metric.note}</small>
                    </article>
                ))}
            </div>

            <section className="report-ranking-panel">
                <div className="section-heading">
                    <div>
                        <p className="eyebrow">{data?.chart?.eyebrow || 'Top 10 Sales'}</p>
                        <h2>{reportTitle}</h2>
                    </div>
                </div>
                {series.length ? (
                    <div className="report-ranking-chart">
                        {series.map((item, index) => (
                            <article key={item.label}>
                                <span className="report-rank">#{index + 1}</span>
                                <strong>{item.label}</strong>
                                <div className="report-ranking-track">
                                    <span style={{ width: `${item.percent}%` }} />
                                </div>
                                <b>{item.value}</b>
                                {item.note && <small>{item.note}</small>}
                            </article>
                        ))}
                    </div>
                ) : (
                    <span className="muted">No top sales found for the selected company and duration.</span>
                )}
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

            {tableRows.length > 0 && (
                <section className="report-table-panel">
                    <p className="eyebrow">Top 10 detail</p>
                    <DataTable actions={[]} columns={tableColumns} rows={tableRows} />
                </section>
            )}
        </div>
    );
}
