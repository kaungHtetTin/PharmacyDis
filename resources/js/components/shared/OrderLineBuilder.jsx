import { useState } from 'react';
import Icon from './Icon';

const fallbackProducts = ['Paracetamol 500mg', 'Amoxicillin 250mg', 'Cough Syrup 100ml'];
const fallbackUnits = ['Tablet', 'Card', 'Box', 'Capsule', 'Strip', 'Bottle', 'Carton'];

const blankLine = {
    id: 'draft-line',
    product: '',
    selectedUnit: '',
    orderedQuantity: '',
    unitPrice: '-',
    baseQuantity: '-',
    discount: '-',
    foc_quantity: '',
    foc_unit_id: '',
    lineTotal: '-',
};

function getProductUnits(product) {
    return product?.product_units || product?.productUnits || [];
}

function getDefaultProductUnit(product) {
    const units = getProductUnits(product);

    return units.find((unit) => unit.is_default_sales_unit)
        || units.find((unit) => unit.is_base_unit)
        || units[0];
}

function getProductFocRules(product) {
    return product?.foc_rules || product?.foc_rules_raw || product?.focRules || [];
}

function isRuleCurrent(rule) {
    const today = new Date().toISOString().slice(0, 10);
    const startsAt = rule.starts_at ? String(rule.starts_at).slice(0, 10) : '';
    const endsAt = rule.ends_at ? String(rule.ends_at).slice(0, 10) : '';

    return String(rule.status || 'active').toLowerCase() === 'active'
        && (!startsAt || startsAt <= today)
        && (!endsAt || endsAt >= today);
}

function formatAmount(value) {
    return Number(value || 0).toLocaleString();
}

function getValidFocRules(product) {
    return getProductFocRules(product).filter(isRuleCurrent);
}

function formatFocRule(rule) {
    const condition = rule.rule_type === 'value'
        ? `buy ${formatAmount(rule.minimum_order_value)} value`
        : `buy ${formatAmount(rule.minimum_quantity_base_units)} base units`;
    const validity = [rule.starts_at, rule.ends_at].filter(Boolean).length
        ? ` (${rule.starts_at || 'now'} to ${rule.ends_at || 'open'})`
        : '';

    return `${condition}, FOC ${formatAmount(rule.reward_quantity_base_units)} base units${validity}`;
}

function calculateManualFocBaseUnits(line, productOptions) {
    const product = productOptions.find((option) => String(option.id) === String(line.product_id));
    const focUnitId = line.foc_unit_id || line.unit_id;
    const focProductUnit = getProductUnits(product).find((unit) => String(unit.unit_id) === String(focUnitId));
    const focQuantity = Number(line.foc_quantity || 0);

    if (!product || !focProductUnit || focQuantity <= 0) {
        return 0;
    }

    return focQuantity * Number(focProductUnit.conversion_factor_to_base || 1);
}

function calculatePreview(line, productOptions) {
    const product = productOptions.find((option) => String(option.id) === String(line.product_id));
    const productUnit = getProductUnits(product).find((unit) => String(unit.unit_id) === String(line.unit_id));
    const quantity = Number(line.quantity || line.orderedQuantity || 0);
    const unitPrice = Number(productUnit?.selling_price || 0);
    const conversion = Number(productUnit?.conversion_factor_to_base || 1);
    const discount = Number(line.discount_percentage ?? product?.default_discount_percentage ?? 0);
    const gross = quantity * unitPrice;
    const discountAmount = gross * (discount / 100);

    return {
        unitPrice: productUnit ? unitPrice.toLocaleString() : line.unitPrice || '-',
        baseQuantity: productUnit && quantity ? `${quantity * conversion} base units` : line.baseQuantity || '-',
        discount: productUnit ? `${discount}%` : line.discount || '0%',
        lineTotal: productUnit && quantity ? Math.max(0, gross - discountAmount).toLocaleString() : line.lineTotal || '-',
    };
}

function stockUnit(product, stockRow) {
    return product?.base_unit?.abbreviation
        || product?.base_unit?.name
        || product?.baseUnit?.abbreviation
        || product?.baseUnit?.name
        || stockRow?.product?.base_unit?.abbreviation
        || stockRow?.product?.base_unit?.name
        || 'base units';
}

function calculateLineDemand(line, productOptions) {
    const product = productOptions.find((option) => String(option.id) === String(line.product_id));
    const productUnit = getProductUnits(product).find((unit) => String(unit.unit_id) === String(line.unit_id));
    const quantity = Number(line.quantity || line.orderedQuantity || 0);

    if (!product || !productUnit || quantity <= 0) {
        return null;
    }

    const conversion = Number(productUnit.conversion_factor_to_base || 1);
    const orderedQuantity = quantity * conversion;
    const focQuantity = calculateManualFocBaseUnits(line, productOptions);

    return {
        focQuantity,
        orderedQuantity,
        product,
        requiredQuantity: orderedQuantity + focQuantity,
    };
}

function previewFocQuantity(item, productOptions) {
    return calculateManualFocBaseUnits(item, productOptions);
}

export function getOrderStockStatus(lines = [], productOptions = [], stockRows = []) {
    const stockByProduct = stockRows.reduce((map, row) => {
        const productId = String(row.product_id || row.product?.id || '');

        if (!productId) {
            return map;
        }

        const current = map.get(productId) || { available: 0, row };
        map.set(productId, {
            available: current.available + Number(row.available_base_quantity || 0),
            row: current.row || row,
        });

        return map;
    }, new Map());
    const demandByProduct = lines.reduce((map, item) => {
        const demand = calculateLineDemand(item, productOptions);

        if (!demand) {
            return map;
        }

        const productId = String(demand.product.id);
        const current = map.get(productId) || { focQuantity: 0, orderedQuantity: 0, product: demand.product, requiredQuantity: 0 };
        map.set(productId, {
            focQuantity: current.focQuantity + demand.focQuantity,
            orderedQuantity: current.orderedQuantity + demand.orderedQuantity,
            product: current.product || demand.product,
            requiredQuantity: current.requiredQuantity + demand.requiredQuantity,
        });

        return map;
    }, new Map());
    const shortages = Array.from(demandByProduct.entries()).map(([productId, demand]) => {
        const stock = stockByProduct.get(productId);
        const availableQuantity = Number(stock?.available || 0);
        const shortageQuantity = Math.max(0, Number(demand.requiredQuantity || 0) - availableQuantity);

        return {
            availableQuantity,
            demand,
            productId,
            shortageQuantity,
            stock,
        };
    }).filter((item) => item.shortageQuantity > 0);

    return {
        demandByProduct,
        hasDemand: demandByProduct.size > 0,
        hasShortage: shortages.length > 0,
        shortages,
        stockByProduct,
    };
}

export default function OrderLineBuilder({
    allowFallback = true,
    disabled = false,
    lines = [],
    onChange,
    productOptions = [],
    stockError = '',
    stockLoading = false,
    stockRows = [],
    value,
    warehouseId = '',
    showStockAvailability = false,
}) {
    const [items, setItems] = useState(lines.length ? lines : [blankLine]);
    const controlled = Array.isArray(value);
    const activeItems = controlled ? value : items;
    const { demandByProduct, stockByProduct } = getOrderStockStatus(activeItems, productOptions, stockRows);

    function updateItems(nextItems) {
        if (!controlled) {
            setItems(nextItems);
        }

        onChange?.(nextItems);
    }

    function addLine() {
        updateItems([...activeItems, { ...blankLine, id: `draft-line-${activeItems.length + 1}-${Date.now()}` }]);
    }

    function removeLine(id) {
        updateItems(activeItems.length === 1 ? activeItems : activeItems.filter((item) => item.id !== id));
    }

    function updateLine(id, patch) {
        updateItems(activeItems.map((item) => (item.id === id ? { ...item, ...patch } : item)));
    }

    const totalFocBaseUnits = activeItems.reduce((total, item) => total + previewFocQuantity(item, productOptions), 0);

    return (
        <section className={`form-section ${disabled ? 'is-disabled' : ''}`}>
            <div className="section-heading">
                <div>
                    <p className="eyebrow">Order items</p>
                    <h2>Multiple products in this pharmacy order</h2>
                </div>
                <button className="btn secondary" disabled={disabled} onClick={addLine} type="button">Add product</button>
            </div>
            <div className="order-line-builder">
                <div className="order-line-builder-head">
                    <span>Product</span>
                    <span>Qty</span>
                    <span>Unit</span>
                    <span>FOC qty</span>
                    <span>FOC unit</span>
                    <span>Price</span>
                    <span>Base qty</span>
                    <span>Discount</span>
                    <span>Total</span>
                    <span>Action</span>
                </div>
                {activeItems.map((item) => {
                    const selectedProduct = productOptions.find((product) => String(product.id) === String(item.product_id));
                    const unitOptions = getProductUnits(selectedProduct);
                    const preview = calculatePreview(item, productOptions);
                    const validFocRules = getValidFocRules(selectedProduct);
                    const lineDemand = calculateLineDemand(item, productOptions);
                    const productDemand = lineDemand ? demandByProduct.get(String(lineDemand.product.id)) : null;
                    const productStock = lineDemand ? stockByProduct.get(String(lineDemand.product.id)) : null;
                    const availableQuantity = Number(productStock?.available || 0);
                    const requiredQuantity = Number(productDemand?.requiredQuantity || 0);
                    const shortageQuantity = Math.max(0, requiredQuantity - availableQuantity);
                    const unit = stockUnit(selectedProduct, productStock?.row);
                    const showStockNote = Boolean(lineDemand && (warehouseId || showStockAvailability));

                    return (
                        <div className={`order-line-draft-row ${shortageQuantity > 0 ? 'has-stock-warning' : ''}`} key={item.id}>
                            <label>
                                <span>Product</span>
                                <select
                                    disabled={disabled}
                                    onChange={(event) => {
                                        const nextProduct = productOptions.find((product) => String(product.id) === String(event.target.value));
                                        const defaultUnit = getDefaultProductUnit(nextProduct);

                                        updateLine(item.id, {
                                            product_id: event.target.value,
                                            product: event.target.selectedOptions[0]?.textContent,
                                            unit_id: defaultUnit?.unit_id || '',
                                            foc_unit_id: defaultUnit?.unit_id || '',
                                        });
                                    }}
                                    value={item.product_id || item.product || ''}
                                >
                                    <option value="" disabled>Select product</option>
                                    {productOptions.length
                                        ? productOptions.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)
                                        : allowFallback ? fallbackProducts.map((product) => <option key={product}>{product}</option>) : null}
                                </select>
                            </label>
                            <label>
                                <span>Qty</span>
                                <input
                                    disabled={disabled}
                                    min="1"
                                    onChange={(event) => updateLine(item.id, { quantity: event.target.value, orderedQuantity: event.target.value })}
                                    placeholder="0"
                                    type="number"
                                    value={item.quantity || item.orderedQuantity || ''}
                                />
                            </label>
                            <label>
                                <span>Unit</span>
                                <select
                                    disabled={disabled || (productOptions.length > 0 && !selectedProduct)}
                                    onChange={(event) => updateLine(item.id, {
                                        unit_id: event.target.value,
                                        selectedUnit: event.target.selectedOptions[0]?.textContent,
                                        foc_unit_id: item.foc_unit_id || event.target.value,
                                    })}
                                    value={item.unit_id || item.selectedUnit || ''}
                                >
                                    <option value="" disabled>Select unit</option>
                                    {unitOptions.length
                                        ? unitOptions.map((productUnit) => <option key={productUnit.id} value={productUnit.unit_id}>{productUnit.unit?.name || productUnit.unit_id}</option>)
                                        : allowFallback ? fallbackUnits.map((unit) => <option key={unit}>{unit}</option>) : null}
                                </select>
                            </label>
                            <label>
                                <span>FOC qty</span>
                                <input
                                    disabled={disabled || (productOptions.length > 0 && !selectedProduct)}
                                    min="0"
                                    onChange={(event) => updateLine(item.id, { foc_quantity: event.target.value })}
                                    placeholder="0"
                                    type="number"
                                    value={item.foc_quantity || ''}
                                />
                            </label>
                            <label>
                                <span>FOC unit</span>
                                <select
                                    disabled={disabled || (productOptions.length > 0 && !selectedProduct)}
                                    onChange={(event) => updateLine(item.id, { foc_unit_id: event.target.value })}
                                    value={item.foc_unit_id || item.unit_id || ''}
                                >
                                    <option value="" disabled>Select unit</option>
                                    {unitOptions.length
                                        ? unitOptions.map((productUnit) => <option key={productUnit.id} value={productUnit.unit_id}>{productUnit.unit?.name || productUnit.unit_id}</option>)
                                        : allowFallback ? fallbackUnits.map((unitOption) => <option key={unitOption}>{unitOption}</option>) : null}
                                </select>
                            </label>
                            <div className="order-line-preview">
                                <span>Price</span>
                                <strong>{preview.unitPrice}</strong>
                            </div>
                            <div className="order-line-preview">
                                <span>Base qty</span>
                                <strong>{preview.baseQuantity}</strong>
                            </div>
                            <div className="order-line-preview">
                                <span>Discount</span>
                                <strong>{preview.discount}</strong>
                            </div>
                            <div className="order-line-preview">
                                <span>Total</span>
                                <strong>{preview.lineTotal}</strong>
                            </div>
                            <button className="icon-btn small" disabled={disabled || activeItems.length === 1} onClick={() => removeLine(item.id)} title="Remove product" type="button">
                                <Icon name="trash" size={14} />
                            </button>
                            {showStockNote && (
                                <div className={`order-line-stock-note ${shortageQuantity > 0 ? 'is-short' : ''}`}>
                                    <strong>{shortageQuantity > 0 ? 'Insufficient stock' : 'Stock available'}</strong>
                                    <span>Required {formatAmount(requiredQuantity)} {unit}</span>
                                    <span>Available {stockLoading ? '...' : formatAmount(availableQuantity)} {unit}</span>
                                    <small>
                                        {stockError
                                            ? stockError
                                            : shortageQuantity > 0
                                                ? `Short ${formatAmount(shortageQuantity)} ${unit}`
                                                : `Includes ${formatAmount(productDemand?.focQuantity || 0)} FOC ${unit}`}
                                    </small>
                                </div>
                            )}
                            {validFocRules.length > 0 && (
                                <div className="order-line-foc-note">
                                    <strong>Active FOC offer</strong>
                                    <span>{validFocRules.map(formatFocRule).join(' | ')}</span>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
            <div className="order-line-total-strip">
                <span>Lines: {activeItems.length}</span>
                <span>Manual FOC: {formatAmount(totalFocBaseUnits)} base units</span>
            </div>
        </section>
    );
}
