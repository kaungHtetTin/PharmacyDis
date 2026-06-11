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
    focPreview: '-',
    lineTotal: '-',
};

function getProductUnits(product) {
    return product?.product_units || product?.productUnits || [];
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

export default function OrderLineBuilder({ disabled = false, lines = [], onChange, productOptions = [], value }) {
    const [items, setItems] = useState(lines.length ? lines : [blankLine]);
    const controlled = Array.isArray(value);
    const activeItems = controlled ? value : items;

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
                    <span>Price</span>
                    <span>Base qty</span>
                    <span>Discount</span>
                    <span>FOC</span>
                    <span>Total</span>
                    <span>Action</span>
                </div>
                {activeItems.map((item) => {
                    const selectedProduct = productOptions.find((product) => String(product.id) === String(item.product_id));
                    const unitOptions = getProductUnits(selectedProduct);
                    const preview = calculatePreview(item, productOptions);

                    return (
                        <div className="order-line-draft-row" key={item.id}>
                            <label>
                                <span>Product</span>
                                <select
                                    disabled={disabled}
                                    onChange={(event) => updateLine(item.id, {
                                        product_id: event.target.value,
                                        product: event.target.selectedOptions[0]?.textContent,
                                        unit_id: '',
                                    })}
                                    value={item.product_id || item.product || ''}
                                >
                                    <option value="" disabled>Select product</option>
                                    {productOptions.length
                                        ? productOptions.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)
                                        : fallbackProducts.map((product) => <option key={product}>{product}</option>)}
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
                                    onChange={(event) => updateLine(item.id, { unit_id: event.target.value, selectedUnit: event.target.selectedOptions[0]?.textContent })}
                                    value={item.unit_id || item.selectedUnit || ''}
                                >
                                    <option value="" disabled>Select unit</option>
                                    {unitOptions.length
                                        ? unitOptions.map((productUnit) => <option key={productUnit.id} value={productUnit.unit_id}>{productUnit.unit?.name || productUnit.unit_id}</option>)
                                        : fallbackUnits.map((unit) => <option key={unit}>{unit}</option>)}
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
                                <span>FOC</span>
                                <strong>{item.focPreview || 'Auto'}</strong>
                            </div>
                            <div className="order-line-preview">
                                <span>Total</span>
                                <strong>{preview.lineTotal}</strong>
                            </div>
                            <button className="icon-btn small" disabled={disabled || activeItems.length === 1} onClick={() => removeLine(item.id)} title="Remove product" type="button">
                                <Icon name="trash" size={14} />
                            </button>
                        </div>
                    );
                })}
            </div>
            <div className="order-line-total-strip">
                <span>Lines: {activeItems.length}</span>
                <span>Stock, discount, FOC, and base quantity recalculate per product line.</span>
            </div>
        </section>
    );
}
