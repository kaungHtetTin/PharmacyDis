import { useMemo, useState } from 'react';
import FormField from './FormField';

const productCatalog = {
    'Paracetamol 500mg': {
        units: [
            { name: 'Tablet', shortName: 'Tab', factor: 1, sellingPrice: 120 },
            { name: 'Card', shortName: 'Card', factor: 10, sellingPrice: 1200 },
            { name: 'Box', shortName: 'Box', factor: 100, sellingPrice: 12000 },
        ],
    },
    'Amoxicillin 250mg': {
        units: [
            { name: 'Capsule', shortName: 'Cap', factor: 1, sellingPrice: 185 },
            { name: 'Card', shortName: 'Card', factor: 10, sellingPrice: 1850 },
            { name: 'Box', shortName: 'Box', factor: 100, sellingPrice: 18500 },
        ],
    },
    'Vitamin C Syrup': {
        units: [
            { name: 'Milliliter', shortName: 'ml', factor: 1, sellingPrice: 95 },
            { name: 'Bottle', shortName: 'Btl', factor: 100, sellingPrice: 9500 },
            { name: 'Case', shortName: 'Case', factor: 1000, sellingPrice: 95000 },
        ],
    },
};

const defaultItem = {
    batch: '',
    expiryDate: '',
    manufacturingDate: '',
    product: 'Paracetamol 500mg',
    quantity: 1,
    unit: 'Box',
    unitCost: 9000,
};

function getUnit(product, unitName) {
    const units = productCatalog[product]?.units || [];
    return units.find((unit) => unit.name === unitName) || units[0];
}

function money(value) {
    return Number(value || 0).toLocaleString();
}

export default function StockReceivingForm({ headerFields = [] }) {
    const [items, setItems] = useState([{ ...defaultItem }]);
    const [paymentStatus, setPaymentStatus] = useState('Due');
    const [paidAmount, setPaidAmount] = useState(0);

    function updateItem(index, key, value) {
        setItems((current) => current.map((item, itemIndex) => {
            if (itemIndex !== index) {
                return item;
            }

            if (key === 'product') {
                const nextUnit = productCatalog[value]?.units?.[0]?.name || '';

                return { ...item, product: value, unit: nextUnit };
            }

            return { ...item, [key]: value };
        }));
    }

    function removeItem(index) {
        setItems((current) => current.length === 1 ? current : current.filter((_, itemIndex) => itemIndex !== index));
    }

    const preparedItems = useMemo(() => items.map((item) => {
        const selectedUnit = getUnit(item.product, item.unit);
        const quantity = Number(item.quantity || 0);
        const unitCost = Number(item.unitCost || 0);
        const conversionFactor = Number(selectedUnit?.factor || 1);
        const baseQuantity = quantity * conversionFactor;

        return {
            ...item,
            baseQuantity,
            conversionFactor,
            lineTotal: quantity * unitCost,
            selectedUnit,
        };
    }), [items]);

    const totalAmount = preparedItems.reduce((sum, item) => sum + item.lineTotal, 0);
    const resolvedPaidAmount = paymentStatus === 'Paid' ? totalAmount : paymentStatus === 'Due' ? 0 : Number(paidAmount || 0);
    const dueAmount = Math.max(totalAmount - resolvedPaidAmount, 0);

    return (
        <div className="receiving-form">
            <div className="crud-grid">
                {headerFields.map((field) => <FormField key={field.label} {...field} />)}
                <label className="form-field">
                    <span>Payment status</span>
                    <select value={paymentStatus} onChange={(event) => setPaymentStatus(event.target.value)}>
                        <option>Paid</option>
                        <option>Partial</option>
                        <option>Due</option>
                    </select>
                </label>
                <label className="form-field">
                    <span>Paid amount</span>
                    <input
                        disabled={paymentStatus !== 'Partial'}
                        min="0"
                        onChange={(event) => setPaidAmount(event.target.value)}
                        placeholder="Paid amount"
                        type="number"
                        value={paymentStatus === 'Paid' ? totalAmount : paymentStatus === 'Due' ? 0 : paidAmount}
                    />
                </label>
                <FormField label="Payable due date" type="date" />
            </div>

            <section className="form-section">
                <div className="section-heading">
                    <div>
                        <p className="eyebrow">Stock items</p>
                        <h2>Received products and stock quantity</h2>
                    </div>
                    <button className="btn secondary" onClick={() => setItems((current) => [...current, { ...defaultItem }])} type="button">Add item</button>
                </div>

                <div className="receiving-items">
                    {preparedItems.map((item, index) => {
                        const units = productCatalog[item.product]?.units || [];

                        return (
                            <article className="receiving-item" key={`${item.product}-${index}`}>
                                <div className="receiving-item-head">
                                    <strong>Item #{index + 1}</strong>
                                    <button className="btn secondary" disabled={items.length === 1} onClick={() => removeItem(index)} type="button">Remove</button>
                                </div>

                                <div className="receiving-item-grid">
                                    <label className="form-field">
                                        <span>Product</span>
                                        <select value={item.product} onChange={(event) => updateItem(index, 'product', event.target.value)}>
                                            {Object.keys(productCatalog).map((product) => <option key={product}>{product}</option>)}
                                        </select>
                                    </label>
                                    <label className="form-field">
                                        <span>Received unit</span>
                                        <select value={item.unit} onChange={(event) => updateItem(index, 'unit', event.target.value)}>
                                            {units.map((unit) => <option key={unit.name}>{unit.name}</option>)}
                                        </select>
                                    </label>
                                    <label className="form-field">
                                        <span>Received quantity</span>
                                        <input min="1" type="number" value={item.quantity} onChange={(event) => updateItem(index, 'quantity', event.target.value)} />
                                    </label>
                                    <label className="form-field">
                                        <span>Unit cost</span>
                                        <input min="0" type="number" value={item.unitCost} onChange={(event) => updateItem(index, 'unitCost', event.target.value)} />
                                    </label>
                                    <label className="form-field">
                                        <span>Batch number</span>
                                        <input placeholder="Auto if empty" value={item.batch} onChange={(event) => updateItem(index, 'batch', event.target.value)} />
                                    </label>
                                    <label className="form-field">
                                        <span>Manufacturing date</span>
                                        <input type="date" value={item.manufacturingDate} onChange={(event) => updateItem(index, 'manufacturingDate', event.target.value)} />
                                    </label>
                                    <label className="form-field">
                                        <span>Expiry date</span>
                                        <input type="date" value={item.expiryDate} onChange={(event) => updateItem(index, 'expiryDate', event.target.value)} />
                                    </label>
                                </div>

                                <div className="receiving-preview">
                                    <span><strong>{item.conversionFactor}</strong><small>Conversion factor</small></span>
                                    <span><strong>{money(item.baseQuantity)}</strong><small>Base stock quantity to add</small></span>
                                    <span><strong>{money(item.selectedUnit?.sellingPrice)}</strong><small>Selling price for selected unit</small></span>
                                    <span><strong>{money(item.lineTotal)}</strong><small>Line total</small></span>
                                </div>
                            </article>
                        );
                    })}
                </div>
            </section>

            <section className="receiving-summary">
                <div>
                    <span>Total receiving amount</span>
                    <strong>{money(totalAmount)}</strong>
                </div>
                <div>
                    <span>Paid amount</span>
                    <strong>{money(resolvedPaidAmount)}</strong>
                </div>
                <div>
                    <span>Company payable due</span>
                    <strong>{money(dueAmount)}</strong>
                </div>
                <div>
                    <span>Stock update</span>
                    <strong>{money(preparedItems.reduce((sum, item) => sum + item.baseQuantity, 0))} base units</strong>
                </div>
            </section>
        </div>
    );
}
