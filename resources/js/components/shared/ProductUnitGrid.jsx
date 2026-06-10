export default function ProductUnitGrid({ rows = [], readonly = false }) {
    return (
        <div className="product-unit-grid">
            <div className="product-unit-head">
                <span>Unit</span>
                <span>Conversion to base</span>
                <span>Selling price</span>
                <span>Base</span>
            </div>
            {rows.map((row) => (
                <div className={row.isBase ? 'product-unit-row base' : 'product-unit-row'} key={row.id || row.unit}>
                    <div>
                        <strong>{row.unit}</strong>
                        <small>{row.shortName}</small>
                    </div>
                    <div>
                        <strong>{row.conversion}</strong>
                        <small>{row.conversionLabel}</small>
                    </div>
                    <div>
                        <strong>{row.price}</strong>
                        <small>{row.priceLabel || 'Per selected unit'}</small>
                    </div>
                    <div>
                        <span className={row.isBase ? 'base-pill active' : 'base-pill'}>{row.isBase ? 'Base' : readonly ? 'Unit' : 'Set base'}</span>
                    </div>
                </div>
            ))}
        </div>
    );
}
