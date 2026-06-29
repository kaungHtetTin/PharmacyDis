import { useEffect, useMemo, useState } from 'react';
import PageHeader from '../../components/shared/PageHeader';
import Panel from '../../components/shared/Panel';
import PaginationBar from '../../components/shared/PaginationBar';
import useApiResource from '../../hooks/useApiResource';
import { api } from '../../services/apiClient';
import { unwrapCollection } from '../../services/screenAdapters';

const tabs = [
    { key: 'basic', label: 'Basic information' },
    { key: 'products', label: 'Product selection' },
    { key: 'items', label: 'Quantity, cost, and batch' },
    { key: 'preview', label: 'Final preview and confirm' },
];

const PRODUCT_SELECTION_PAGE_SIZE = 12;

const blankLine = {
    batch_no: '',
    expiry_date: '',
    foc_quantity: '',
    foc_unit_id: '',
    manufactured_date: '',
    product_id: '',
    quantity: '',
    unit_cost: '',
    unit_id: '',
};

function defaultPayableDueDate() {
    const dueDays = Number(window.appConfig?.invoiceDueDays ?? 30);
    const date = new Date();
    date.setDate(date.getDate() + dueDays);

    return date.toISOString().slice(0, 10);
}

function formatAmount(value) {
    return Number(value || 0).toLocaleString();
}

function todayDate() {
    return new Date().toISOString().slice(0, 10);
}

function getProductUnits(product) {
    return product?.product_units || [];
}

function getDefaultProductUnit(product) {
    const units = getProductUnits(product);

    return units.find((unit) => unit.is_default_sales_unit)
        || units.find((unit) => unit.is_base_unit)
        || units[0];
}

function findProduct(products, productId) {
    return products.find((product) => String(product.id) === String(productId));
}

function findProductUnit(product, unitId) {
    const units = getProductUnits(product);

    return units.find((unit) => String(unit.unit_id) === String(unitId)) || units[0];
}

function makeBatchNumber(product, receivedDate = '', itemIndex = 0) {
    const source = product?.sku || product?.name || 'MED';
    const prefix = String(source).replace(/[^a-z0-9]/gi, '').toUpperCase().slice(0, 12) || 'MED';
    const date = String(receivedDate || todayDate()).replace(/-/g, '').slice(2, 8);
    const sequence = String(itemIndex + 1).padStart(3, '0');

    return `${prefix}-${date}-${sequence}`;
}

function productMatchesSearch(product, search) {
    const query = search.trim().toLowerCase();

    if (!query) {
        return true;
    }

    return [product.name, product.sku, product.barcode, product.brand]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query));
}

function linePreview(line, products) {
    const product = findProduct(products, line.product_id);
    const productUnit = findProductUnit(product, line.unit_id);
    const quantity = Number(line.quantity || 0);
    const focQuantity = Number(line.foc_quantity || 0);
    const unitCost = Number(line.unit_cost || 0);
    const conversionFactor = Number(productUnit?.conversion_factor_to_base || 1);
    const focProductUnit = focQuantity > 0 ? findProductUnit(product, line.foc_unit_id || line.unit_id) : null;
    const focConversionFactor = Number(focProductUnit?.conversion_factor_to_base || 1);
    const grossLineTotal = quantity * unitCost;
    const commissionRate = Number(product?.commission_rate_percentage || 0);
    const commissionAmount = grossLineTotal * commissionRate / 100;

    return {
        baseQuantity: (quantity * conversionFactor) + (focQuantity * focConversionFactor),
        commissionAmount,
        commissionRate,
        conversionFactor,
        focBaseQuantity: focQuantity * focConversionFactor,
        grossLineTotal,
        lineTotal: Math.max(0, grossLineTotal - commissionAmount),
        product,
        productUnit,
    };
}

function summariesFor(lines, products, paidAmount = 0) {
    const previews = lines.map((line) => linePreview(line, products));
    const subtotal = previews.reduce((sum, item) => sum + item.grossLineTotal, 0);
    const commissionTotal = previews.reduce((sum, item) => sum + item.commissionAmount, 0);
    const total = Math.max(0, subtotal - commissionTotal);
    const paid = Number(paidAmount || 0);

    return {
        baseQuantity: previews.reduce((sum, item) => sum + item.baseQuantity, 0),
        commissionTotal,
        due: Math.max(0, total - paid),
        paid,
        subtotal,
        total,
    };
}

function StepTabs({ activeTab, onChange }) {
    return (
        <div className="order-wizard-tabs" role="tablist">
            {tabs.map((tab, index) => (
                <button
                    aria-label={`Step ${index + 1}: ${tab.label}`}
                    className={tab.key === activeTab ? 'active' : ''}
                    key={tab.key}
                    onClick={() => onChange(tab.key)}
                    title={tab.label}
                    type="button"
                >
                    <span>{index + 1}</span>
                </button>
            ))}
        </div>
    );
}

function BasicStep({ action, companies, form, onChange, warehouses, warehousesLoading }) {
    return (
        <Panel action={action} eyebrow="Step 1" title="Basic information">
            <div className="order-wizard-basic-grid">
                <label className="form-field">
                    <span>Company</span>
                    <select name="company_id" onChange={onChange} required value={form.company_id}>
                        <option value="" disabled>Select company</option>
                        {companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}
                    </select>
                </label>
                <label className="form-field">
                    <span>Warehouse</span>
                    <select disabled={warehousesLoading} name="warehouse_id" onChange={onChange} required value={form.warehouse_id}>
                        <option value="" disabled>{warehousesLoading ? 'Loading warehouses' : 'Select warehouse'}</option>
                        {warehouses.map((warehouse) => (
                            <option key={warehouse.id} value={warehouse.id}>{warehouse.name}{warehouse.code ? ` (${warehouse.code})` : ''}</option>
                        ))}
                    </select>
                </label>
                <label className="form-field">
                    <span>Company invoice number</span>
                    <input name="supplier_invoice_no" onChange={onChange} value={form.supplier_invoice_no} />
                </label>
                <label className="form-field">
                    <span>Received date</span>
                    <input name="received_date" onChange={onChange} type="date" value={form.received_date} />
                </label>
                <label className="form-field">
                    <span>Payable due date</span>
                    <input name="payable_due_date" onChange={onChange} type="date" value={form.payable_due_date} />
                </label>
                <label className="form-field">
                    <span>Paid amount</span>
                    <input min="0" name="paid_amount" onChange={onChange} type="number" value={form.paid_amount} />
                </label>
            </div>
        </Panel>
    );
}

function ProductSelectionStep({ action, disabled, loading, onClearSelection, products, search, selectedIds, setSearch, toggleProduct }) {
    const [page, setPage] = useState(1);
    const filteredProducts = products.filter((product) => productMatchesSearch(product, search));
    const totalPages = Math.max(1, Math.ceil(filteredProducts.length / PRODUCT_SELECTION_PAGE_SIZE));
    const currentPage = Math.min(page, totalPages);
    const pageStart = filteredProducts.length ? (currentPage - 1) * PRODUCT_SELECTION_PAGE_SIZE : 0;
    const pageEnd = Math.min(pageStart + PRODUCT_SELECTION_PAGE_SIZE, filteredProducts.length);
    const visibleProducts = filteredProducts.slice(pageStart, pageEnd);

    useEffect(() => {
        setPage(1);
    }, [search, products.length]);

    return (
        <Panel action={action} eyebrow="Step 2" title="Product selection">
            <div className="order-wizard-product-toolbar">
                <label className="form-field">
                    <span>Search product</span>
                    <input disabled={disabled} onChange={(event) => setSearch(event.target.value)} placeholder="Search by product name, SKU, barcode, or brand" type="search" value={search} />
                </label>
                <article>
                    <span>Selected</span>
                    <strong>{selectedIds.length}</strong>
                    <button disabled={!selectedIds.length} onClick={onClearSelection} type="button">Clear all</button>
                </article>
            </div>
            {disabled && <span className="muted">Select a company first.</span>}
            {loading && <span className="muted">Loading product list...</span>}
            {!loading && !disabled && (
                <>
                    <div className="order-wizard-product-list">
                        {visibleProducts.map((product) => {
                            const selected = selectedIds.includes(String(product.id));
                            const defaultUnit = getDefaultProductUnit(product);

                            return (
                                <button
                                    className={selected ? 'order-wizard-product-row selected' : 'order-wizard-product-row'}
                                    key={product.id}
                                    onClick={() => toggleProduct(String(product.id))}
                                    type="button"
                                >
                                    <span>
                                        <strong>{product.name}</strong>
                                        <small>{product.sku || '-'} / {product.barcode || '-'} / {product.brand || '-'}</small>
                                    </span>
                                    <span>
                                        <small>Default receiving unit</small>
                                        <strong>{defaultUnit?.unit?.name || product.base_unit?.name || 'Base unit'}</strong>
                                    </span>
                                </button>
                            );
                        })}
                        {!filteredProducts.length && <span className="muted">No products match this search.</span>}
                    </div>
                    {filteredProducts.length > PRODUCT_SELECTION_PAGE_SIZE && (
                        <PaginationBar
                            currentPage={currentPage}
                            from={pageStart + 1}
                            lastPage={totalPages}
                            onNext={() => setPage((value) => Math.min(totalPages, value + 1))}
                            onPrevious={() => setPage((value) => Math.max(1, value - 1))}
                            to={pageEnd}
                            total={filteredProducts.length}
                        />
                    )}
                </>
            )}
        </Panel>
    );
}

function ItemsStep({ action, form, lines, onAddLine, onLineChange, onRemoveLine, products }) {
    return (
        <Panel
            action={action}
            eyebrow="Step 3"
            title="Quantity, cost, and batch"
        >
            <div className="section-heading">
                <div>
                    <p className="eyebrow">Stock items</p>
                    <h2>Products received into warehouse</h2>
                </div>
                <button className="btn secondary" disabled={!form.company_id} onClick={onAddLine} type="button">Add product</button>
            </div>
            <div className="receiving-items">
                {lines.map((line, index) => {
                    const product = findProduct(products, line.product_id);
                    const units = getProductUnits(product);
                    const preview = linePreview(line, products);

                    return (
                        <article className="receiving-item" key={line.product_id || `line-${index}`}>
                            <div className="receiving-item-head">
                                <strong>{product?.name || `Item #${index + 1}`}</strong>
                                <button className="btn secondary" disabled={lines.length === 1} onClick={() => onRemoveLine(line.product_id)} type="button">Remove</button>
                            </div>
                            <div className="receiving-item-grid">
                                <label className="form-field">
                                    <span>Product</span>
                                    <select name="product_id" onChange={(event) => onLineChange(line.product_id, { product_id: event.target.value })} required value={line.product_id}>
                                        <option value="" disabled>Select product</option>
                                        {products.map((item) => (
                                            <option disabled={lines.some((selected) => String(selected.product_id) === String(item.id) && String(line.product_id) !== String(item.id))} key={item.id} value={item.id}>
                                                {item.name}
                                            </option>
                                        ))}
                                    </select>
                                </label>
                                <label className="form-field">
                                    <span>Received unit</span>
                                    <select disabled={!line.product_id} name="unit_id" onChange={(event) => onLineChange(line.product_id, { unit_id: event.target.value })} required value={line.unit_id}>
                                        <option value="" disabled>Select unit</option>
                                        {units.map((unit) => (
                                            <option key={unit.unit_id} value={unit.unit_id}>{unit.unit?.name || `Unit #${unit.unit_id}`}</option>
                                        ))}
                                    </select>
                                </label>
                                <label className="form-field">
                                    <span>Received quantity</span>
                                    <input min="1" name="quantity" onChange={(event) => onLineChange(line.product_id, { quantity: event.target.value })} required type="number" value={line.quantity} />
                                </label>
                                <label className="form-field">
                                    <span>FOC quantity</span>
                                    <input min="0" name="foc_quantity" onChange={(event) => onLineChange(line.product_id, { foc_quantity: event.target.value })} type="number" value={line.foc_quantity} />
                                </label>
                                <label className="form-field">
                                    <span>FOC unit</span>
                                    <select disabled={!line.product_id || Number(line.foc_quantity || 0) <= 0} name="foc_unit_id" onChange={(event) => onLineChange(line.product_id, { foc_unit_id: event.target.value })} value={line.foc_unit_id}>
                                        <option value="">Same as received unit</option>
                                        {units.map((unit) => (
                                            <option key={unit.unit_id} value={unit.unit_id}>{unit.unit?.name || `Unit #${unit.unit_id}`}</option>
                                        ))}
                                    </select>
                                </label>
                                <label className="form-field">
                                    <span>Unit cost</span>
                                    <input min="0" name="unit_cost" onChange={(event) => onLineChange(line.product_id, { unit_cost: event.target.value })} required type="number" value={line.unit_cost} />
                                </label>
                                <label className="form-field">
                                    <span>Batch number</span>
                                    <input name="batch_no" onChange={(event) => onLineChange(line.product_id, { batch_no: event.target.value })} placeholder="Auto-generated, editable" value={line.batch_no} />
                                </label>
                                <label className="form-field">
                                    <span>Manufacturing date</span>
                                    <input name="manufactured_date" onChange={(event) => onLineChange(line.product_id, { manufactured_date: event.target.value })} type="date" value={line.manufactured_date} />
                                </label>
                                <label className="form-field">
                                    <span>Expiry date</span>
                                    <input name="expiry_date" onChange={(event) => onLineChange(line.product_id, { expiry_date: event.target.value })} type="date" value={line.expiry_date} />
                                </label>
                            </div>
                            <div className="receiving-preview">
                                <span><strong>{formatAmount(preview.conversionFactor)}</strong><small>Conversion factor</small></span>
                                <span><strong>{formatAmount(preview.baseQuantity)}</strong><small>Base stock quantity</small></span>
                                <span><strong>{formatAmount(preview.commissionAmount)}</strong><small>{formatAmount(preview.commissionRate)}% commission</small></span>
                                <span><strong>{formatAmount(preview.lineTotal)}</strong><small>Payable line total</small></span>
                            </div>
                        </article>
                    );
                })}
                {!lines.length && <span className="muted">Select products first.</span>}
            </div>
        </Panel>
    );
}

function PreviewStep({ action, companies, form, lines, products, warehouses }) {
    const selectedCompany = companies.find((company) => String(company.id) === String(form.company_id));
    const selectedWarehouse = warehouses.find((warehouse) => String(warehouse.id) === String(form.warehouse_id));
    const summary = summariesFor(lines, products, form.paid_amount);

    return (
        <Panel action={action} eyebrow="Step 4" title="Final preview and confirm">
            <div className="order-wizard-preview-grid">
                <article><span>Company</span><strong>{selectedCompany?.name || '-'}</strong></article>
                <article><span>Warehouse</span><strong>{selectedWarehouse?.name || '-'}</strong></article>
                <article><span>Supplier invoice</span><strong>{form.supplier_invoice_no || '-'}</strong></article>
                <article><span>Received date</span><strong>{form.received_date || '-'}</strong></article>
                <article><span>Products</span><strong>{lines.length}</strong></article>
                <article><span>Base quantity</span><strong>{formatAmount(summary.baseQuantity)}</strong></article>
                <article><span>Subtotal</span><strong>{formatAmount(summary.subtotal)}</strong></article>
                <article><span>Commission deducted</span><strong>{formatAmount(summary.commissionTotal)}</strong></article>
                <article><span>Payable total</span><strong>{formatAmount(summary.total)}</strong></article>
                <article><span>Paid amount</span><strong>{formatAmount(summary.paid)}</strong></article>
                <article><span>Due amount</span><strong>{formatAmount(summary.due)}</strong></article>
                <article><span>Payable due date</span><strong>{form.payable_due_date || '-'}</strong></article>
            </div>
            <div className="order-wizard-preview-lines">
                {lines.map((line) => {
                    const product = findProduct(products, line.product_id);
                    const unit = findProductUnit(product, line.unit_id);
                    const preview = linePreview(line, products);

                    return (
                        <div key={line.product_id}>
                            <strong>{product?.name || `Product #${line.product_id}`}</strong>
                            <span>{line.quantity} {unit?.unit?.name || 'unit'} / {formatAmount(preview.baseQuantity)} base units</span>
                            <span>FOC {line.foc_quantity || 0} / Batch {line.batch_no || '-'}</span>
                        </div>
                    );
                })}
            </div>
        </Panel>
    );
}

function notifyOperationalActionsChanged() {
    window.dispatchEvent(new Event('office-operational-actions-changed'));
}

export default function StockReceivingCreatePage({ onNavigate }) {
    const [activeTab, setActiveTab] = useState('basic');
    const [form, setForm] = useState({
        company_id: '',
        paid_amount: '0',
        payable_due_date: defaultPayableDueDate(),
        received_date: todayDate(),
        supplier_invoice_no: '',
        warehouse_id: '',
    });
    const [selectedProductIds, setSelectedProductIds] = useState([]);
    const [lines, setLines] = useState([]);
    const [productSearch, setProductSearch] = useState('');
    const [stepWarning, setStepWarning] = useState('');
    const [submitError, setSubmitError] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const companiesResource = useApiResource('/lookups/companies');
    const warehousesResource = useApiResource('/office/warehouses?per_page=100');
    const productsResource = useApiResource(form.company_id ? `/lookups/products?company_id=${form.company_id}&limit=1000` : '');
    const companies = unwrapCollection(companiesResource.data);
    const warehouses = unwrapCollection(warehousesResource.data);
    const products = unwrapCollection(productsResource.data);
    const activeIndex = tabs.findIndex((tab) => tab.key === activeTab);

    useEffect(() => {
        setLines((current) => selectedProductIds.map((productId, index) => {
            const existing = current.find((line) => String(line.product_id) === String(productId));
            const product = findProduct(products, productId);
            const defaultUnit = getDefaultProductUnit(product);

            return {
                ...blankLine,
                ...existing,
                batch_no: existing?.batch_no || makeBatchNumber(product, form.received_date, index),
                foc_unit_id: existing?.foc_unit_id || '',
                product_id: productId,
                quantity: existing?.quantity || '1',
                unit_id: existing?.unit_id || defaultUnit?.unit_id || '',
            };
        }));
    }, [selectedProductIds.join(','), productsResource.data]);

    function updateForm(event) {
        const { name, value } = event.target;

        setForm((current) => ({
            ...current,
            [name]: value,
        }));
        setStepWarning('');
        setSubmitError('');

        if (name === 'company_id') {
            setSelectedProductIds([]);
            setLines([]);
            setProductSearch('');
        }

        if (name === 'received_date') {
            setLines((current) => current.map((line, index) => {
                if (!line.product_id || line.batch_no) {
                    return line;
                }

                return {
                    ...line,
                    batch_no: makeBatchNumber(findProduct(products, line.product_id), value, index),
                };
            }));
        }
    }

    function toggleProduct(productId) {
        setSelectedProductIds((current) => current.includes(productId)
            ? current.filter((id) => id !== productId)
            : [...current, productId]);
        setStepWarning('');
        setSubmitError('');
    }

    function clearSelection() {
        setSelectedProductIds([]);
        setStepWarning('');
        setSubmitError('');
    }

    function addLine() {
        const nextProduct = products.find((product) => !selectedProductIds.includes(String(product.id)));

        if (!nextProduct) {
            setStepWarning('All available products for this company are already selected.');
            return;
        }

        setSelectedProductIds((current) => [...current, String(nextProduct.id)]);
    }

    function updateLine(productId, patch) {
        if (Object.prototype.hasOwnProperty.call(patch, 'product_id')) {
            setSelectedProductIds((ids) => ids.map((id) => (String(id) === String(productId) ? String(patch.product_id) : id)));
        }

        setLines((current) => current.map((line, index) => {
            if (String(line.product_id) !== String(productId)) {
                return line;
            }

            if (Object.prototype.hasOwnProperty.call(patch, 'product_id')) {
                const product = findProduct(products, patch.product_id);
                const defaultUnit = getDefaultProductUnit(product);

                return {
                    ...line,
                    ...patch,
                    batch_no: makeBatchNumber(product, form.received_date, index),
                    foc_unit_id: '',
                    unit_id: defaultUnit?.unit_id || '',
                };
            }

            return { ...line, ...patch };
        }));
        setStepWarning('');
        setSubmitError('');
    }

    function removeLine(productId) {
        if (selectedProductIds.length <= 1) {
            return;
        }

        setSelectedProductIds((current) => current.filter((id) => String(id) !== String(productId)));
        setStepWarning('');
        setSubmitError('');
    }

    function validateStep(tabKey) {
        if (tabKey === 'basic') {
            if (!form.company_id) {
                return 'Select a company before continuing.';
            }

            if (!form.warehouse_id) {
                return 'Select a warehouse before continuing.';
            }

            if (!form.received_date) {
                return 'Select the received date before continuing.';
            }
        }

        if (tabKey === 'products') {
            if (productsResource.loading) {
                return 'Wait for the product list to finish loading before continuing.';
            }

            if (!selectedProductIds.length) {
                return 'Select at least one product before continuing.';
            }
        }

        if (tabKey === 'items') {
            if (!lines.length) {
                return 'Select at least one product before continuing.';
            }

            if (lines.some((line) => !line.product_id || !line.unit_id)) {
                return 'Select a product and received unit for every item.';
            }

            if (lines.some((line) => Number(line.quantity || 0) <= 0)) {
                return 'Enter received quantity for every item.';
            }

            if (lines.some((line) => Number(line.unit_cost || 0) < 0 || line.unit_cost === '')) {
                return 'Enter unit cost for every item.';
            }
        }

        return '';
    }

    function goNext() {
        const warning = validateStep(activeTab);

        if (warning) {
            setStepWarning(warning);
            setSubmitError('');
            return;
        }

        setStepWarning('');
        setActiveTab(tabs[Math.min(tabs.length - 1, activeIndex + 1)].key);
    }

    function goPrevious() {
        setStepWarning('');
        setActiveTab(tabs[Math.max(0, activeIndex - 1)].key);
    }

    function goToTab(tabKey) {
        const targetIndex = tabs.findIndex((tab) => tab.key === tabKey);

        if (targetIndex <= activeIndex) {
            setStepWarning('');
            setActiveTab(tabKey);
            return;
        }

        for (let index = activeIndex; index < targetIndex; index += 1) {
            const warning = validateStep(tabs[index].key);

            if (warning) {
                setStepWarning(warning);
                setSubmitError('');
                setActiveTab(tabs[index].key);
                return;
            }
        }

        setStepWarning('');
        setActiveTab(tabKey);
    }

    const items = useMemo(() => lines
        .filter((line) => line.product_id && line.unit_id && Number(line.quantity || 0) > 0)
        .map((line) => ({
            batch_no: line.batch_no || null,
            expiry_date: line.expiry_date || null,
            foc_quantity: Number(line.foc_quantity || 0),
            foc_unit_id: Number(line.foc_quantity || 0) > 0 ? line.foc_unit_id || line.unit_id || null : null,
            manufactured_date: line.manufactured_date || null,
            product_id: line.product_id,
            quantity: Number(line.quantity || 1),
            unit_cost: line.unit_cost || 0,
            unit_id: line.unit_id,
        })), [lines]);

    async function submitReceiving() {
        const warning = validateStep('basic') || validateStep('products') || validateStep('items');

        if (warning) {
            setStepWarning(warning);
            return;
        }

        setSubmitting(true);
        setSubmitError('');

        try {
            const response = await api.post('/office/stock-receipts', {
                ...form,
                warehouse_id: form.warehouse_id || null,
                items,
            });
            const receiptId = response?.id || response?.data?.id || '';

            notifyOperationalActionsChanged();
            onNavigate?.(receiptId ? 'receiving-detail' : 'receiving', receiptId ? { receipt_id: receiptId } : undefined);
        } catch (error) {
            setSubmitError(error.message);
        } finally {
            setSubmitting(false);
        }
    }

    const stepActions = (
        <div className="order-wizard-actions">
            <button className="btn secondary" disabled={activeIndex === 0 || submitting} onClick={goPrevious} type="button">Previous</button>
            {activeTab === 'preview' ? (
                <button className="btn primary" disabled={submitting} onClick={submitReceiving} type="button">
                    {submitting ? 'Posting...' : 'Post receiving'}
                </button>
            ) : (
                <button className="btn primary" disabled={submitting} onClick={goNext} type="button">Next</button>
            )}
        </div>
    );

    const resourceError = companiesResource.error || warehousesResource.error || productsResource.error;

    return (
        <div className="page-stack order-wizard-page stock-receiving-wizard-page">
            <PageHeader
                action={<button className="btn secondary" onClick={() => onNavigate?.('receiving')} type="button">Back to receiving</button>}
                description="Receive company stock by confirming supplier details, selecting products, entering quantities, FOC, costs, and batch information."
                eyebrow="Stock Receiving"
                title="Receive stock"
            />

            <StepTabs activeTab={activeTab} onChange={goToTab} />

            {stepWarning && <div className="form-error" role="alert">{stepWarning}</div>}
            {submitError && <div className="form-error" role="alert">{submitError}</div>}
            {resourceError && <div className="form-error" role="alert">{resourceError}</div>}

            {activeTab === 'basic' && (
                <BasicStep
                    action={stepActions}
                    companies={companies}
                    form={form}
                    onChange={updateForm}
                    warehouses={warehouses}
                    warehousesLoading={warehousesResource.loading}
                />
            )}
            {activeTab === 'products' && (
                <ProductSelectionStep
                    action={stepActions}
                    disabled={!form.company_id}
                    loading={productsResource.loading}
                    onClearSelection={clearSelection}
                    products={products}
                    search={productSearch}
                    selectedIds={selectedProductIds}
                    setSearch={setProductSearch}
                    toggleProduct={toggleProduct}
                />
            )}
            {activeTab === 'items' && (
                <ItemsStep
                    action={stepActions}
                    form={form}
                    lines={lines}
                    onAddLine={addLine}
                    onLineChange={updateLine}
                    onRemoveLine={removeLine}
                    products={products}
                />
            )}
            {activeTab === 'preview' && (
                <PreviewStep
                    action={stepActions}
                    companies={companies}
                    form={form}
                    lines={lines}
                    products={products}
                    warehouses={warehouses}
                />
            )}
        </div>
    );
}
