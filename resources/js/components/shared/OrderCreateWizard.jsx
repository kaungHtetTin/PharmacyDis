import { useEffect, useMemo, useState } from 'react';
import PageHeader from './PageHeader';
import Panel from './Panel';
import PaginationBar from './PaginationBar';
import PharmacyStorePicker from './PharmacyStorePicker';
import StatusBadge from './StatusBadge';
import { isBlockedCredit } from './OrderCreditGate';
import useApiResource from '../../hooks/useApiResource';
import { api } from '../../services/apiClient';
import { mapOrders, unwrapCollection } from '../../services/screenAdapters';
import { useAuth } from '../../services/auth.jsx';

const tabs = [
    { key: 'basic', label: 'Basic information' },
    { key: 'products', label: 'Product selection' },
    { key: 'quantity', label: 'Unit quantity and FOC' },
    { key: 'preview', label: 'Final preview and confirm' },
];

const PRODUCT_SELECTION_PAGE_SIZE = 12;

function defaultPaymentDueDate() {
    const dueDays = Number(window.appConfig?.invoiceDueDays ?? 30);
    const date = new Date();
    date.setDate(date.getDate() + dueDays);

    return date.toISOString().slice(0, 10);
}

function formatAmount(value) {
    return Number(value || 0).toLocaleString();
}

function titleCase(value) {
    return String(value || '')
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (letter) => letter.toUpperCase());
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

function stockUnit(product) {
    return product?.base_unit?.abbreviation || product?.base_unit?.name || 'base units';
}

function isRuleCurrent(rule) {
    const today = new Date().toISOString().slice(0, 10);
    const startsAt = rule.starts_at ? String(rule.starts_at).slice(0, 10) : '';
    const endsAt = rule.ends_at ? String(rule.ends_at).slice(0, 10) : '';

    return String(rule.status || 'active').toLowerCase() === 'active'
        && (!startsAt || startsAt <= today)
        && (!endsAt || endsAt >= today);
}

function formatFocRule(rule) {
    return rule.rule_type === 'value'
        ? `Order value ${formatAmount(rule.minimum_order_value)} gives ${formatAmount(rule.reward_quantity_base_units)} base units`
        : `Buy ${formatAmount(rule.minimum_quantity_base_units)} base units, FOC ${formatAmount(rule.reward_quantity_base_units)} base units`;
}

function linePreview(line, product) {
    const productUnit = getProductUnits(product).find((unit) => String(unit.unit_id) === String(line.unit_id));
    const quantity = Number(line.quantity || 0);
    const unitPrice = Number(productUnit?.selling_price || 0);
    const conversion = Number(productUnit?.conversion_factor_to_base || 1);
    const discount = Number(line.discount_percentage ?? product?.default_discount_percentage ?? 0);
    const gross = quantity * unitPrice;
    const discountAmount = gross * (discount / 100);
    const orderedBaseQuantity = quantity * conversion;
    const focUnit = getProductUnits(product).find((unit) => String(unit.unit_id) === String(line.foc_unit_id || line.unit_id));
    const focBaseQuantity = Number(line.foc_quantity || 0) * Number(focUnit?.conversion_factor_to_base || 1);

    return {
        discount,
        focBaseQuantity,
        lineTotal: Math.max(0, gross - discountAmount),
        orderedBaseQuantity,
        requiredBaseQuantity: orderedBaseQuantity + focBaseQuantity,
        unitPrice,
    };
}

function productMatchesSearch(product, search) {
    const query = search.trim().toLowerCase();

    if (!query) {
        return true;
    }

    return [product.name, product.barcode, product.sku]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query));
}

function productDetailUrl(selectedProductIds) {
    if (!selectedProductIds.length) {
        return '';
    }

    return `/lookups/products?ids=${selectedProductIds.join(',')}`;
}

function productListUrl(companyId, warehouseId = '', isOffice = false) {
    if (!companyId) {
        return '';
    }

    const params = new URLSearchParams({
        company_id: companyId,
        lightweight: '1',
        limit: '1000',
    });

    if (isOffice && warehouseId) {
        params.set('warehouse_id', warehouseId);
    }

    return `/lookups/products?${params.toString()}`;
}

function customerLookupUrl(search, selectedId = '') {
    const params = new URLSearchParams({
        limit: '30',
        search_only: '1',
    });
    const query = search.trim();

    if (query) {
        params.set('search', query);
    }

    if (selectedId) {
        params.set('selected_id', selectedId);
    }

    return `/lookups/customers?${params.toString()}`;
}

function getAvailability(productId, productAvailability = []) {
    return productAvailability.find((item) => String(item.id) === String(productId)) || null;
}

function getMaxQuantityForUnit(availableBaseQuantity, usedBaseQuantity, unit) {
    const conversion = Number(unit?.conversion_factor_to_base || 1);

    return Math.max(0, Math.floor(Math.max(0, Number(availableBaseQuantity || 0) - Number(usedBaseQuantity || 0)) / Math.max(1, conversion)));
}

function clampIntegerInput(value, maxValue) {
    if (value === '') {
        return '';
    }

    const numericValue = Math.floor(Math.max(0, Number(value || 0)));
    const resolvedMax = Number.isFinite(maxValue) ? Math.max(0, Number(maxValue)) : numericValue;

    return String(Math.min(numericValue, resolvedMax));
}

function stockShortages(lines, productDetails, productAvailability) {
    return lines.map((line) => {
        const product = productDetails.find((item) => String(item.id) === String(line.product_id));
        const availability = getAvailability(line.product_id, productAvailability);
        const preview = product ? linePreview(line, product) : null;
        const availableBaseQuantity = Number(availability?.available_base_quantity || 0);
        const shortageQuantity = Math.max(0, Number(preview?.requiredBaseQuantity || 0) - availableBaseQuantity);

        return {
            availableBaseQuantity,
            product,
            productId: line.product_id,
            requiredBaseQuantity: Number(preview?.requiredBaseQuantity || 0),
            shortageQuantity,
        };
    }).filter((item) => item.shortageQuantity > 0);
}

function BasicStep({
    action,
    companies,
    customers,
    customerLoading,
    customerSearch,
    form,
    isOffice,
    lockedCompany,
    onChange,
    onCustomerSearchChange,
    representatives,
    representativesLoading,
    warehouses,
    warehousesLoading,
}) {
    return (
        <Panel action={action} eyebrow="Step 1" title="Basic information">
            <div className="order-wizard-basic-grid">
                <PharmacyStorePicker
                    customers={customers}
                    loading={customerLoading}
                    onChange={onChange}
                    onSearchChange={onCustomerSearchChange}
                    searchValue={customerSearch}
                    value={form.customer_id}
                />

                {isOffice ? (
                    <label className="form-field">
                        <span>Company</span>
                        <select name="company_id" onChange={onChange} required value={form.company_id}>
                            <option value="" disabled>Select company</option>
                            {companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}
                        </select>
                    </label>
                ) : (
                    <article className="order-wizard-fixed-card">
                        <span>Assigned company</span>
                        <strong>{lockedCompany?.name || 'Assigned company'}</strong>
                    </article>
                )}

                {isOffice && (
                    <>
                        <label className="form-field">
                            <span>Sales representative</span>
                            <select disabled={!form.company_id || representativesLoading} name="sales_representative_id" onChange={onChange} value={form.sales_representative_id}>
                                <option value="">{representativesLoading ? 'Loading representatives' : 'No representative'}</option>
                                {representatives.map((representative) => (
                                    <option key={representative.id} value={representative.id}>
                                        {representative.user?.name || representative.employee_code || `Rep #${representative.id}`}
                                    </option>
                                ))}
                            </select>
                        </label>
                    </>
                )}

                {isOffice && (
                    <>
                        <label className="form-field">
                            <span>Reserve from warehouse</span>
                            <select disabled={warehousesLoading} name="warehouse_id" onChange={onChange} required value={form.warehouse_id}>
                                <option value="" disabled>{warehousesLoading ? 'Loading warehouses' : 'Select warehouse'}</option>
                                {warehouses.map((warehouse) => (
                                    <option key={warehouse.id} value={warehouse.id}>{warehouse.name}{warehouse.code ? ` (${warehouse.code})` : ''}</option>
                                ))}
                            </select>
                        </label>
                        <label className="form-field">
                            <span>Tax amount</span>
                            <input min="0" name="tax_amount" onChange={onChange} type="number" value={form.tax_amount} />
                        </label>
                    </>
                )}

                <label className="form-field">
                    <span>Requested delivery date</span>
                    <input name="requested_delivery_date" onChange={onChange} type="date" value={form.requested_delivery_date} />
                </label>
                <label className="form-field">
                    <span>Payment due date</span>
                    <input name="payment_due_date" onChange={onChange} required type="date" value={form.payment_due_date} />
                </label>
                {!isOffice && (
                    <label className="form-field">
                        <span>Tax amount</span>
                        <input min="0" name="tax_amount" onChange={onChange} type="number" value={form.tax_amount} />
                    </label>
                )}
                <label className="form-field order-wizard-note">
                    <span>Order note</span>
                    <textarea name="note" onChange={onChange} placeholder="Optional note for office approval, warehouse, or finance" rows="3" value={form.note} />
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
                    <input disabled={disabled} onChange={(event) => setSearch(event.target.value)} placeholder="Search by product name or barcode" type="search" value={search} />
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
                            const selected = selectedIds.includes(product.id);
                            const unit = product.base_unit?.abbreviation || product.base_unit?.name || 'base units';

                            return (
                                <button
                                    className={selected ? 'order-wizard-product-row selected' : 'order-wizard-product-row'}
                                    key={product.id}
                                    onClick={() => toggleProduct(product.id)}
                                    type="button"
                                >
                                    <span>
                                        <strong>{product.name}</strong>
                                        <small>{product.sku || '-'} / {product.barcode || '-'}</small>
                                    </span>
                                    <span>
                                        <small>Available</small>
                                        <strong>{formatAmount(product.available_base_quantity)} {unit}</strong>
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

function QuantityStep({ action, lines, productAvailability, productDetails, updateLine }) {
    return (
        <Panel action={action} eyebrow="Step 3" title="Unit quantity and FOC">
            <div className="order-wizard-quantity-list">
                {lines.map((line) => {
                    const product = productDetails.find((item) => String(item.id) === String(line.product_id));
                    const units = getProductUnits(product);
                    const preview = product ? linePreview(line, product) : null;
                    const validFocRules = (product?.foc_rules || []).filter(isRuleCurrent);
                    const selectedUnit = units.find((unit) => String(unit.unit_id) === String(line.unit_id));
                    const selectedFocUnit = units.find((unit) => String(unit.unit_id) === String(line.foc_unit_id || line.unit_id));
                    const availability = getAvailability(line.product_id, productAvailability);
                    const stockLabel = availability?.base_unit?.abbreviation || availability?.base_unit?.name || stockUnit(product);
                    const availableBaseQuantity = Number(availability?.available_base_quantity || 0);
                    const maxQuantity = getMaxQuantityForUnit(availableBaseQuantity, preview?.focBaseQuantity || 0, selectedUnit);
                    const maxFocQuantity = getMaxQuantityForUnit(availableBaseQuantity, preview?.orderedBaseQuantity || 0, selectedFocUnit);
                    const shortageQuantity = Math.max(0, Number(preview?.requiredBaseQuantity || 0) - availableBaseQuantity);

                    return (
                        <article className="order-wizard-quantity-row" key={line.product_id}>
                            <div className="order-wizard-quantity-title">
                                <strong>{product?.name || `Product #${line.product_id}`}</strong>
                            </div>
                            <label className="form-field">
                                <span>Quantity</span>
                                <input
                                    max={maxQuantity}
                                    min="0"
                                    onChange={(event) => updateLine(line.product_id, { quantity: clampIntegerInput(event.target.value, maxQuantity) })}
                                    type="number"
                                    value={line.quantity}
                                />
                            </label>
                            <label className="form-field">
                                <span>Unit</span>
                                <select
                                    onChange={(event) => {
                                        const nextUnit = units.find((unit) => String(unit.unit_id) === String(event.target.value));
                                        const nextMaxQuantity = getMaxQuantityForUnit(availableBaseQuantity, preview?.focBaseQuantity || 0, nextUnit);

                                        updateLine(line.product_id, {
                                            foc_unit_id: line.foc_unit_id || event.target.value,
                                            quantity: clampIntegerInput(line.quantity, nextMaxQuantity),
                                            unit_id: event.target.value,
                                        });
                                    }}
                                    value={line.unit_id}
                                >
                                    <option value="" disabled>Select unit</option>
                                    {units.map((unit) => <option key={unit.id} value={unit.unit_id}>{unit.unit?.name || unit.unit_id}</option>)}
                                </select>
                            </label>
                            <label className="form-field">
                                <span>FOC qty</span>
                                <input
                                    max={maxFocQuantity}
                                    min="0"
                                    onChange={(event) => updateLine(line.product_id, { foc_quantity: clampIntegerInput(event.target.value, maxFocQuantity) })}
                                    type="number"
                                    value={line.foc_quantity}
                                />
                            </label>
                            <label className="form-field">
                                <span>FOC unit</span>
                                <select
                                    onChange={(event) => {
                                        const nextFocUnit = units.find((unit) => String(unit.unit_id) === String(event.target.value));
                                        const nextMaxFocQuantity = getMaxQuantityForUnit(availableBaseQuantity, preview?.orderedBaseQuantity || 0, nextFocUnit);

                                        updateLine(line.product_id, {
                                            foc_quantity: clampIntegerInput(line.foc_quantity, nextMaxFocQuantity),
                                            foc_unit_id: event.target.value,
                                        });
                                    }}
                                    value={line.foc_unit_id || line.unit_id}
                                >
                                    <option value="" disabled>Select unit</option>
                                    {units.map((unit) => <option key={unit.id} value={unit.unit_id}>{unit.unit?.name || unit.unit_id}</option>)}
                                </select>
                            </label>
                            <div className="order-wizard-line-preview">
                                <span>Price</span>
                                <strong>{formatAmount(preview?.unitPrice)}</strong>
                            </div>
                            <div className="order-wizard-line-preview">
                                <span>Total</span>
                                <strong>{formatAmount(preview?.lineTotal)}</strong>
                            </div>
                            {validFocRules.length > 0 && (
                                <div className="order-wizard-foc-note">
                                    <strong>Active FOC</strong>
                                    <span>{validFocRules.map(formatFocRule).join(' | ')}</span>
                                </div>
                            )}
                            {shortageQuantity > 0 && (
                                <div className="order-wizard-stock-warning">
                                    <strong>Insufficient stock</strong>
                                    <span>Available {formatAmount(availableBaseQuantity)} {stockLabel}</span>
                                    <span>Required {formatAmount(preview?.requiredBaseQuantity || 0)} {stockLabel}</span>
                                    <span>Short {formatAmount(shortageQuantity)} {stockLabel}</span>
                                </div>
                            )}
                        </article>
                    );
                })}
                {!lines.length && <span className="muted">Select products first.</span>}
            </div>
        </Panel>
    );
}

function PreviewStep({ action, blocked, customer, form, isOffice, lines, productDetails, selectedCompany, shortages = [] }) {
    const totals = lines.reduce((summary, line) => {
        const product = productDetails.find((item) => String(item.id) === String(line.product_id));
        const preview = product ? linePreview(line, product) : null;

        return {
            focBaseQuantity: summary.focBaseQuantity + Number(preview?.focBaseQuantity || 0),
            lineTotal: summary.lineTotal + Number(preview?.lineTotal || 0),
            requiredBaseQuantity: summary.requiredBaseQuantity + Number(preview?.requiredBaseQuantity || 0),
        };
    }, { focBaseQuantity: 0, lineTotal: 0, requiredBaseQuantity: 0 });

    return (
        <Panel action={action} eyebrow="Step 4" title="Final preview and confirm">
            <div className="order-wizard-preview-grid">
                <article>
                    <span>Company</span>
                    <strong>{selectedCompany?.name || '-'}</strong>
                </article>
                <article>
                    <span>Pharmacy</span>
                    <strong>{customer?.name || '-'}</strong>
                </article>
                <article>
                    <span>Payment due date</span>
                    <strong>{form.payment_due_date || '-'}</strong>
                </article>
                <article>
                    <span>Products</span>
                    <strong>{lines.length}</strong>
                </article>
                <article>
                    <span>Manual FOC</span>
                    <strong>{formatAmount(totals.focBaseQuantity)} base units</strong>
                </article>
                <article>
                    <span>Order total</span>
                    <strong>{formatAmount(totals.lineTotal + Number(form.tax_amount || 0))}</strong>
                </article>
            </div>
            {blocked && <div className="form-error">Company credit is blocked. Order creation is not allowed.</div>}
            {isOffice && !form.warehouse_id && <div className="form-error">Select a warehouse before creating the approved order.</div>}
            {shortages.length > 0 && <div className="form-error">Some selected products exceed available stock. Reduce quantity or FOC before confirming.</div>}
            <div className="order-wizard-preview-lines">
                {lines.map((line) => {
                    const product = productDetails.find((item) => String(item.id) === String(line.product_id));
                    const unit = getProductUnits(product).find((item) => String(item.unit_id) === String(line.unit_id));
                    const preview = product ? linePreview(line, product) : null;

                    return (
                        <div key={line.product_id}>
                            <strong>{product?.name || `Product #${line.product_id}`}</strong>
                            <span>{line.quantity} {unit?.unit?.name || 'unit'} / {formatAmount(preview?.requiredBaseQuantity)} {stockUnit(product)} required</span>
                            <span>FOC {line.foc_quantity || 0} / Line total {formatAmount(preview?.lineTotal)}</span>
                        </div>
                    );
                })}
            </div>
        </Panel>
    );
}

export default function OrderCreateWizard({ mode = 'sales', onNavigate }) {
    const { user } = useAuth();
    const params = new URLSearchParams(window.location.search);
    const isOffice = mode === 'office';
    const lockedCompany = user?.sales_representative?.company;
    const [activeTab, setActiveTab] = useState('basic');
    const [form, setForm] = useState({
        company_id: isOffice ? '' : String(lockedCompany?.id || user?.sales_representative?.company_id || ''),
        customer_id: params.get('customer_id') || '',
        note: '',
        payment_due_date: defaultPaymentDueDate(),
        requested_delivery_date: '',
        sales_representative_id: '',
        tax_amount: '0',
        warehouse_id: '',
    });
    const [customerSearch, setCustomerSearch] = useState('');
    const [debouncedCustomerSearch, setDebouncedCustomerSearch] = useState('');
    const [productSearch, setProductSearch] = useState('');
    const [selectedProductIds, setSelectedProductIds] = useState([]);
    const [lines, setLines] = useState([]);
    const [stepWarning, setStepWarning] = useState('');
    const [submitError, setSubmitError] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const companiesResource = useApiResource(isOffice ? '/lookups/companies' : '');
    const customersResource = useApiResource(customerLookupUrl(debouncedCustomerSearch, form.customer_id));
    const representativesResource = useApiResource(isOffice && form.company_id ? `/lookups/sales-representatives?company_id=${form.company_id}` : '');
    const warehousesResource = useApiResource(isOffice ? '/office/warehouses?per_page=100' : '');
    const productListResource = useApiResource(productListUrl(form.company_id, form.warehouse_id, isOffice));
    const productDetailsResource = useApiResource(productDetailUrl(selectedProductIds));
    const companies = unwrapCollection(companiesResource.data);
    const customers = unwrapCollection(customersResource.data);
    const representatives = unwrapCollection(representativesResource.data);
    const warehouses = unwrapCollection(warehousesResource.data);
    const productList = unwrapCollection(productListResource.data);
    const productDetails = unwrapCollection(productDetailsResource.data);
    const selectedCompany = isOffice ? companies.find((company) => String(company.id) === String(form.company_id)) : lockedCompany;
    const selectedCustomer = customers.find((customer) => String(customer.id) === String(form.customer_id));
    const selectedCredit = selectedCustomer?.credit_statuses?.find((credit) => String(credit.company_id) === String(form.company_id))
        || selectedCustomer?.credit_statuses?.[0];
    const creditStatus = titleCase(selectedCredit?.credit_status || 'ready');
    const blocked = isBlockedCredit(creditStatus);
    const shortages = stockShortages(lines, productDetails, productList);

    useEffect(() => {
        const timeout = window.setTimeout(() => setDebouncedCustomerSearch(customerSearch.trim()), 240);

        return () => window.clearTimeout(timeout);
    }, [customerSearch]);

    useEffect(() => {
        if (form.customer_id && selectedCustomer?.name && !customerSearch) {
            setCustomerSearch(selectedCustomer.name);
        }
    }, [customerSearch, form.customer_id, selectedCustomer?.name]);

    useEffect(() => {
        if (!isOffice && lockedCompany?.id && String(form.company_id) !== String(lockedCompany.id)) {
            setForm((current) => ({ ...current, company_id: String(lockedCompany.id) }));
        }
    }, [form.company_id, isOffice, lockedCompany?.id]);

    useEffect(() => {
        setLines((current) => selectedProductIds.map((productId) => {
            const existing = current.find((line) => String(line.product_id) === String(productId));
            const product = productDetails.find((item) => String(item.id) === String(productId));
            const defaultUnit = getDefaultProductUnit(product);

            return {
                discount_percentage: product?.default_discount_percentage || 0,
                foc_quantity: existing?.foc_quantity || '',
                foc_unit_id: existing?.foc_unit_id || defaultUnit?.unit_id || '',
                product_id: productId,
                quantity: existing?.quantity || '',
                unit_id: existing?.unit_id || defaultUnit?.unit_id || '',
            };
        }));
    }, [selectedProductIds.join(','), productDetailsResource.data]);

    function updateForm(event) {
        const { name, value } = event.target;

        setForm((current) => ({
            ...current,
            [name]: value,
            ...(name === 'company_id' ? { sales_representative_id: '' } : {}),
        }));
        setStepWarning('');
        setSubmitError('');

        if (name === 'company_id') {
            setSelectedProductIds([]);
            setProductSearch('');
        }
    }

    function toggleProduct(productId) {
        setSelectedProductIds((current) => current.includes(productId)
            ? current.filter((id) => id !== productId)
            : [...current, productId]);
        setStepWarning('');
        setSubmitError('');
    }

    function updateLine(productId, patch) {
        setLines((current) => current.map((line) => (String(line.product_id) === String(productId) ? { ...line, ...patch } : line)));
        setStepWarning('');
        setSubmitError('');
    }

    function clearSelection() {
        setSelectedProductIds([]);
        setStepWarning('');
        setSubmitError('');
    }

    function validateStep(tabKey) {
        if (tabKey === 'basic') {
            if (!form.customer_id) {
                return 'Select a pharmacy before continuing.';
            }

            if (!form.company_id) {
                return 'Select a company before continuing.';
            }

            if (isOffice && !form.warehouse_id) {
                return 'Select a warehouse before continuing.';
            }

            if (!form.payment_due_date) {
                return 'Select a payment due date before continuing.';
            }
        }

        if (tabKey === 'products') {
            if (productListResource.loading) {
                return 'Wait for the product list to finish loading before continuing.';
            }

            if (!selectedProductIds.length) {
                return 'Select at least one product before continuing.';
            }
        }

        if (tabKey === 'quantity') {
            if (productDetailsResource.loading) {
                return 'Wait for selected product details to finish loading before continuing.';
            }

            if (!lines.length) {
                return 'Select at least one product before continuing.';
            }

            if (lines.some((line) => !line.unit_id)) {
                return 'Select a unit for each selected product before continuing.';
            }

            if (lines.some((line) => Number(line.quantity || 0) <= 0)) {
                return 'Enter quantity for each selected product before continuing.';
            }

            if (shortages.length > 0) {
                return 'Some selected products exceed available stock. Reduce quantity or FOC before continuing.';
            }
        }

        return '';
    }

    function goNext() {
        const index = tabs.findIndex((tab) => tab.key === activeTab);
        const warning = validateStep(activeTab);

        if (warning) {
            setStepWarning(warning);
            setSubmitError('');
            return;
        }

        setStepWarning('');
        setActiveTab(tabs[Math.min(tabs.length - 1, index + 1)].key);
    }

    function goPrevious() {
        const index = tabs.findIndex((tab) => tab.key === activeTab);
        setStepWarning('');
        setActiveTab(tabs[Math.max(0, index - 1)].key);
    }

    function goToTab(tabKey) {
        const currentIndex = tabs.findIndex((tab) => tab.key === activeTab);
        const targetIndex = tabs.findIndex((tab) => tab.key === tabKey);

        if (targetIndex <= currentIndex) {
            setStepWarning('');
            setActiveTab(tabKey);
            return;
        }

        for (let index = currentIndex; index < targetIndex; index += 1) {
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
            discount_percentage: line.discount_percentage ?? null,
            foc_quantity: Number(line.foc_quantity || 0),
            foc_unit_id: Number(line.foc_quantity || 0) > 0 ? line.foc_unit_id || line.unit_id || null : null,
            product_id: line.product_id,
            quantity: Number(line.quantity || 1),
            unit_id: line.unit_id,
        })), [lines]);

    async function submitOrder() {
        if (!form.customer_id || !form.payment_due_date || !form.company_id || !items.length || blocked || (isOffice && !form.warehouse_id)) {
            setSubmitError('Complete required information, select products, and enter quantity before confirming.');
            return;
        }

        if (shortages.length > 0) {
            setSubmitError('Some selected products exceed available stock. Reduce quantity or FOC before confirming.');
            return;
        }

        setSubmitting(true);
        setSubmitError('');

        try {
            const payload = {
                customer_id: form.customer_id,
                items,
                note: form.note || null,
                payment_due_date: form.payment_due_date || null,
                requested_delivery_date: form.requested_delivery_date || null,
                tax_amount: form.tax_amount || '0',
                ...(isOffice ? {
                    auto_approve: true,
                    company_id: form.company_id,
                    sales_representative_id: form.sales_representative_id || null,
                    warehouse_id: form.warehouse_id,
                } : {}),
            };
            const response = await api.post(isOffice ? '/office/orders' : '/sales/orders', payload);
            const [order] = mapOrders({ data: [response.data || response] });

            if (!isOffice && order) {
                window.sessionStorage.setItem('sales:last-submitted-order', JSON.stringify(order));
            }

            onNavigate?.(isOffice ? 'order-detail' : 'order-submitted', { order_id: order?.id || response.data?.id || response.id || '' });
        } catch (error) {
            setSubmitError(error.message);
        } finally {
            setSubmitting(false);
        }
    }

    const activeIndex = tabs.findIndex((tab) => tab.key === activeTab);
    const stepActions = (
        <div className="order-wizard-actions">
            <button className="btn secondary" disabled={activeIndex === 0 || submitting} onClick={goPrevious} type="button">Previous</button>
            {activeTab === 'preview' ? (
                <button className="btn primary" disabled={submitting || blocked || shortages.length > 0} onClick={submitOrder} type="button">
                    {submitting ? 'Submitting...' : 'Confirm order'}
                </button>
            ) : (
                <button className="btn primary" disabled={submitting} onClick={goNext} type="button">Next</button>
            )}
        </div>
    );

    return (
        <div className="page-stack order-wizard-page">
            <PageHeader
                action={isOffice ? <button className="btn secondary" onClick={() => onNavigate?.('orders')} type="button">Back to orders</button> : null}
                description="Create an order by confirming account details, selecting products, entering quantities and FOC, then reviewing before submit."
                eyebrow="Order Entry"
                title="New order"
            />

            <div className="order-wizard-tabs" role="tablist">
                {tabs.map((tab, index) => (
                    <button
                        aria-label={`Step ${index + 1}: ${tab.label}`}
                        className={tab.key === activeTab ? 'active' : ''}
                        key={tab.key}
                        onClick={() => goToTab(tab.key)}
                        title={tab.label}
                        type="button"
                    >
                        <span>{index + 1}</span>
                    </button>
                ))}
            </div>

            {stepWarning && <div className="form-error" role="alert">{stepWarning}</div>}
            {submitError && <div className="form-error" role="alert">{submitError}</div>}
            {(companiesResource.error || customersResource.error || representativesResource.error || warehousesResource.error || productListResource.error || productDetailsResource.error) && (
                <div className="form-error" role="alert">
                    {companiesResource.error || customersResource.error || representativesResource.error || warehousesResource.error || productListResource.error || productDetailsResource.error}
                </div>
            )}

            {activeTab === 'basic' && (
                <BasicStep
                    action={stepActions}
                    companies={companies}
                    customers={customers}
                    customerLoading={customersResource.loading}
                    customerSearch={customerSearch}
                    form={form}
                    isOffice={isOffice}
                    lockedCompany={lockedCompany}
                    onChange={updateForm}
                    onCustomerSearchChange={(value) => {
                        setCustomerSearch(value);
                        setStepWarning('');
                    }}
                    representatives={representatives}
                    representativesLoading={representativesResource.loading}
                    warehouses={warehouses}
                    warehousesLoading={warehousesResource.loading}
                />
            )}
            {activeTab === 'products' && (
                <ProductSelectionStep
                    action={stepActions}
                    disabled={!form.company_id}
                    loading={productListResource.loading}
                    products={productList}
                    search={productSearch}
                    selectedIds={selectedProductIds}
                    setSearch={setProductSearch}
                    onClearSelection={clearSelection}
                    toggleProduct={toggleProduct}
                />
            )}
            {activeTab === 'quantity' && (
                <QuantityStep action={stepActions} lines={lines} productAvailability={productList} productDetails={productDetails} updateLine={updateLine} />
            )}
            {activeTab === 'preview' && (
                <PreviewStep
                    action={stepActions}
                    blocked={blocked}
                    customer={selectedCustomer}
                    form={form}
                    isOffice={isOffice}
                    lines={lines}
                    productDetails={productDetails}
                    selectedCompany={selectedCompany}
                    shortages={shortages}
                />
            )}
        </div>
    );
}
