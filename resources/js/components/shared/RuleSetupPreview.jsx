import StatusBadge from './StatusBadge';

export default function RuleSetupPreview({ commissionRows = [], focExamples = [] }) {
    return (
        <div className="rule-setup-preview">
            {focExamples.length > 0 && (
                <section className="drawer-section">
                    <p className="eyebrow">FOC setup forms</p>
                    <div className="rule-card-grid">
                        {focExamples.map((rule) => (
                            <article key={rule.title}>
                                <div>
                                    <strong>{rule.title}</strong>
                                    <StatusBadge value={rule.type} />
                                </div>
                                <span>{rule.condition}</span>
                                <small>{rule.reward}</small>
                            </article>
                        ))}
                    </div>
                </section>
            )}

            {commissionRows.length > 0 && (
                <section className="drawer-section">
                    <p className="eyebrow">Product commission form</p>
                    <div className="commission-preview-table">
                        <div className="commission-preview-head">
                            <span>Product</span>
                            <span>Company</span>
                            <span>Rate</span>
                            <span>Example sale</span>
                            <span>Commission</span>
                        </div>
                        {commissionRows.map((row) => (
                            <div className="commission-preview-row" key={row.id}>
                                <strong>{row.product}</strong>
                                <span>{row.company}</span>
                                <span>{row.rate}</span>
                                <span>{row.sale}</span>
                                <strong>{row.commission}</strong>
                            </div>
                        ))}
                    </div>
                </section>
            )}
        </div>
    );
}
