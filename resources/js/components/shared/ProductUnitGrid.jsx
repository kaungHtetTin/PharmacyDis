import Icon from './Icon';

export default function ProductUnitGrid({ defaultActionBusy = false, onDefaultSalesUnitChange, rows = [] }) {
    return (
        <div className="product-unit-grid">
            <div className="product-unit-head">
                <span>Unit</span>
                <span>Conversion to base</span>
                <span>Selling price</span>
                <span>Role</span>
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
                    <div className="product-unit-role-stack">
                        {row.isBase && <span className="base-pill active">Base unit</span>}
                        {row.isDefaultSalesUnit ? (
                            <span className="base-pill sales-default">Sales default</span>
                        ) : onDefaultSalesUnitChange ? (
                            <button className="unit-default-btn" disabled={defaultActionBusy} onClick={() => onDefaultSalesUnitChange(row)} type="button">
                                <Icon name="check" size={13} />
                                {defaultActionBusy ? 'Updating...' : 'Set default'}
                            </button>
                        ) : null}
                    </div>
                </div>
            ))}
        </div>
    );
}
