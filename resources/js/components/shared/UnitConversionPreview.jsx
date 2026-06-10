export default function UnitConversionPreview({ conversions = [] }) {
    return (
        <div className="conversion-preview">
            {conversions.map((conversion) => (
                <article className="conversion-card" key={conversion.id}>
                    <div className="conversion-card-head">
                        <div>
                            <strong>{conversion.product}</strong>
                            <small>Base unit: {conversion.baseUnit}</small>
                        </div>
                        <span className="base-pill active">{conversion.status}</span>
                    </div>
                    <div className="conversion-chain">
                        {conversion.rules.map((rule) => (
                            <span key={rule}>{rule}</span>
                        ))}
                    </div>
                    <div className="conversion-note">{conversion.note}</div>
                </article>
            ))}
        </div>
    );
}
