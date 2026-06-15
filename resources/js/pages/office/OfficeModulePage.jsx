import { useEffect, useState } from 'react';
import CompanyProductAssignment from '../../components/shared/CompanyProductAssignment';
import CreditStatusGrid from '../../components/shared/CreditStatusGrid';
import DataTable from '../../components/shared/DataTable';
import DocumentPreviewSet from '../../components/shared/DocumentPreviewSet';
import Drawer from '../../components/shared/Drawer';
import FilterToolbar from '../../components/shared/FilterToolbar';
import FinanceReview from '../../components/shared/FinanceReview';
import FormField from '../../components/shared/FormField';
import Icon from '../../components/shared/Icon';
import InvoiceDetailDrawer from '../../components/shared/InvoiceDetailDrawer';
import Modal from '../../components/shared/Modal';
import OrderCreateForm from '../../components/shared/OrderCreateForm';
import { getCompanyCreditStatus, isBlockedCredit, normalizeCreditStatuses } from '../../components/shared/OrderCreditGate';
import OrderLineBuilder from '../../components/shared/OrderLineBuilder';
import PageHeader from '../../components/shared/PageHeader';
import PaginationBar from '../../components/shared/PaginationBar';
import Panel from '../../components/shared/Panel';
import PrintPreview from '../../components/shared/PrintPreview';
import ProductUnitGrid from '../../components/shared/ProductUnitGrid';
import RepAssignmentGrid from '../../components/shared/RepAssignmentGrid';
import ReportsWorkspace from '../../components/shared/ReportsWorkspace';
import RuleSetupPreview from '../../components/shared/RuleSetupPreview';
import SalesOrderDetail from '../../components/shared/SalesOrderDetail';
import SettingsWorkspace from '../../components/shared/SettingsWorkspace';
import StatusBadge from '../../components/shared/StatusBadge';
import StockReceivingDetail from '../../components/shared/StockReceivingDetail';
import StockReceivingForm from '../../components/shared/StockReceivingForm';
import StockMovementTimeline from '../../components/shared/StockMovementTimeline';
import SummaryCard from '../../components/shared/SummaryCard';
import Tabs from '../../components/shared/Tabs';
import UnitConversionPreview from '../../components/shared/UnitConversionPreview';
import { officeModules } from '../../data/officeModules';
import useApiResource from '../../hooks/useApiResource';
import { api } from '../../services/apiClient';
import { mergeGeneratedInvoiceRows, rememberGeneratedInvoice } from '../../services/generatedInvoiceCache';
import { applyLiveRows, getOfficeEndpoint, mapOfficeRows, mapProducts, unwrapCollection } from '../../services/screenAdapters';

const blankCompanyForm = {
    name: '',
    code: '',
    contact_person: '',
    phone: '',
    email: '',
    address: '',
    status: 'active',
};

const blankPharmacyForm = {
    name: '',
    code: '',
    owner_name: '',
    phone: '',
    email: '',
    address: '',
    township: '',
    city: '',
    region: '',
    status: 'active',
};

const blankProductCategoryForm = {
    name: '',
    code: '',
    parent_id: '',
    status: 'active',
};

const blankUnitForm = {
    name: '',
    abbreviation: '',
    status: 'active',
};

const blankWarehouseForm = {
    name: '',
    code: '',
    address: '',
    status: 'active',
};

const blankStockReceiptItem = {
    product_id: '',
    unit_id: '',
    foc_unit_id: '',
    quantity: '1',
    foc_quantity: '0',
    unit_cost: '0',
    batch_no: '',
    manufactured_date: '',
    expiry_date: '',
};

const blankStockReceiptForm = {
    company_id: '',
    warehouse_id: '',
    supplier_invoice_no: '',
    received_date: '',
    payable_due_date: '',
    paid_amount: '0',
    items: [{ ...blankStockReceiptItem }],
};

const blankStockAdjustmentForm = {
    company_id: '',
    company_name: '',
    warehouse_id: '',
    product_id: '',
    product_name: '',
    product_locked: false,
    unit_id: '',
    adjustment_type: 'increase',
    quantity: '1',
    batch_no: '',
    expiry_date: '',
    reason: '',
};

const blankCustomerPaymentForm = {
    company_id: '',
    customer_id: '',
    invoice_id: '',
    payment_date: '',
    amount: '',
    payment_method: 'cash',
    reference_no: '',
    note: '',
};

const blankCompanyPaymentForm = {
    company_id: '',
    company_payable_id: '',
    pay_all: false,
    payment_date: '',
    amount: '',
    payment_method: 'cash',
    reference_no: '',
    note: '',
};

const blankOfficeOrderLine = {
    id: 'office-order-line-1',
    product_id: '',
    unit_id: '',
    quantity: '1',
};

const blankOfficeOrderForm = {
    company_id: '',
    customer_id: '',
    sales_representative_id: '',
    requested_delivery_date: '',
    note: '',
    auto_approve: true,
};

const blankSalesRepresentativeForm = {
    name: '',
    email: '',
    phone: '',
    employee_code: '',
    company_id: '',
    region: '',
    joined_at: '',
    password: '',
    status: 'active',
};

const blankFocRuleForm = {
    id: '',
    enabled: false,
    rule_type: 'quantity',
    minimum_quantity_base_units: '',
    minimum_order_value: '',
    reward_quantity_base_units: '',
    starts_at: '',
    ends_at: '',
    status: 'active',
};

const blankProductForm = {
    company_id: '',
    product_category_id: '',
    brand: '',
    base_unit_id: '',
    sku: '',
    barcode: '',
    name: '',
    description: '',
    primary_image_path: '',
    primary_image: null,
    primary_image_preview: '',
    default_discount_percentage: '0',
    commission_rate_percentage: '0',
    low_stock_threshold_base_units: '0',
    base_unit_selling_price: '0',
    product_units: [],
    foc_rule: { ...blankFocRuleForm },
    status: 'active',
};

function storageUrl(path) {
    if (!path) {
        return '';
    }

    if (/^(https?:)?\/\//.test(path) || path.startsWith('data:') || path.startsWith('blob:')) {
        return path;
    }

    const baseUrl = String(window.appConfig?.baseUrl || '').replace(/\/+$/g, '');
    const normalizedPath = String(path).replace(/^\/+/, '').replace(/^storage\//, '');

    return `${baseUrl}/storage/${normalizedPath}`;
}

function dateInputValue(value) {
    return value ? String(value).slice(0, 10) : '';
}

function focRuleFormFromRecord(record) {
    const rule = record?.foc_rules_raw?.[0];

    if (!rule) {
        return { ...blankFocRuleForm };
    }

    return {
        id: rule.id || '',
        enabled: true,
        rule_type: rule.rule_type || 'quantity',
        minimum_quantity_base_units: rule.minimum_quantity_base_units ? String(rule.minimum_quantity_base_units) : '',
        minimum_order_value: rule.minimum_order_value ? String(rule.minimum_order_value) : '',
        reward_quantity_base_units: rule.reward_quantity_base_units ? String(rule.reward_quantity_base_units) : '',
        starts_at: dateInputValue(rule.starts_at),
        ends_at: dateInputValue(rule.ends_at),
        status: String(rule.status || 'active').toLowerCase(),
    };
}

function FieldGrid({ fields }) {
    return (
        <div className="crud-grid">
            {fields.map((field) => <FormField key={field.label} {...field} />)}
        </div>
    );
}

function ModalExtra({ screen }) {
    if (screen.orderLineItems || screen.approvalFields) {
        return (
            <>
                {screen.orderLineItems && <OrderLineBuilder lines={screen.orderLineItems} />}
                {screen.approvalFields && (
                    <section className="form-section">
                        <div className="section-heading">
                            <div>
                                <p className="eyebrow">Approval workflow</p>
                                <h2>Approval confirmation and reject modal</h2>
                            </div>
                            <button className="btn secondary" type="button">Preview warehouse queue</button>
                        </div>
                        <FieldGrid fields={screen.approvalFields} />
                        <div className="approval-action-grid">
                            <button className="btn primary" type="button">Approve and reserve stock</button>
                            <button className="btn secondary" type="button">Reject with reason</button>
                            <button className="btn secondary" type="button">Hold for review</button>
                        </div>
                        <p className="helper-copy">Approval reserves stock in base units. Rejection requires a reason for the sales representative order history.</p>
                    </section>
                )}
            </>
        );
    }

    if (screen.stockMovements || screen.lowStockAlerts || screen.expiryAlerts) {
        return (
            <>
                {screen.stockMovements && (
                    <section className="form-section">
                        <div className="section-heading">
                            <div>
                                <p className="eyebrow">History</p>
                                <h2>Stock movement timeline</h2>
                            </div>
                        </div>
                        <StockMovementTimeline movements={screen.stockMovements} />
                    </section>
                )}
                {(screen.lowStockAlerts || screen.expiryAlerts) && (
                    <section className="form-section">
                        <div className="section-heading">
                            <div>
                                <p className="eyebrow">Alerts</p>
                                <h2>Low stock and expiry alerts</h2>
                            </div>
                        </div>
                        <div className="inventory-alert-grid">
                            {(screen.lowStockAlerts || []).map((alert) => (
                                <article key={alert.id}>
                                    <strong>{alert.product}</strong>
                                    <small>{alert.detail}</small>
                                </article>
                            ))}
                            {(screen.expiryAlerts || []).map((alert) => (
                                <article key={alert.id}>
                                    <strong>{alert.product}</strong>
                                    <small>{alert.detail}</small>
                                </article>
                            ))}
                        </div>
                    </section>
                )}
            </>
        );
    }

    if (screen.repAssignments) {
        return (
            <>
                <section className="form-section">
                    <div className="section-heading">
                        <div>
                            <p className="eyebrow">Assignment controls</p>
                            <h2>Assigned company and product access</h2>
                        </div>
                        <button className="btn secondary" type="button">Assign company</button>
                    </div>
                    <RepAssignmentGrid assignments={screen.repAssignments} />
                    <p className="helper-copy">Each sales representative is assigned to one company and can only see or sell products from that company.</p>
                </section>
                {screen.performanceCards && (
                    <section className="form-section">
                        <div className="section-heading">
                            <div>
                                <p className="eyebrow">Preview</p>
                                <h2>Performance summary</h2>
                            </div>
                        </div>
                        <div className="mini-metric-grid">
                            {screen.performanceCards.map((card) => (
                                <div key={card.label}>
                                    <span>{card.label}</span>
                                    <strong>{card.value}</strong>
                                    <small>{card.note}</small>
                                </div>
                            ))}
                        </div>
                    </section>
                )}
            </>
        );
    }

    if (screen.assignmentProducts) {
        return (
            <section className="form-section">
                <div className="section-heading">
                    <div>
                        <p className="eyebrow">Assignments</p>
                        <h2>Assigned products</h2>
                    </div>
                    <button className="btn secondary" type="button">Assign product</button>
                </div>
                <CompanyProductAssignment products={screen.assignmentProducts} />
                <p className="helper-copy">Commission rates are updated on product records. This view checks whether assigned products are ready for company review.</p>
            </section>
        );
    }

    const showConversionSetup = screen.conversionPreviews && !screen.conversionPreviewOnly;

    if (!screen.productUnitRows && !screen.focRuleFields && !showConversionSetup) {
        return null;
    }

    return (
        <>
            {screen.productUnitRows && (
                <section className="form-section">
                    <div className="section-heading">
                        <div>
                            <p className="eyebrow">Unit pricing</p>
                            <h2>Product units and prices</h2>
                        </div>
                        <button className="btn secondary" type="button">Add unit</button>
                    </div>
                    <ProductUnitGrid rows={screen.productUnitRows} />
                    <p className="helper-copy">Stock is counted in the base unit. Orders and receiving can use any product unit, then convert quantity to base quantity.</p>
                </section>
            )}
            {screen.focRuleFields && (
                <section className="form-section">
                    <div className="section-heading">
                        <div>
                            <p className="eyebrow">FOC rules</p>
                            <h2>Product-linked FOC setup</h2>
                        </div>
                        <button className="btn secondary" type="button">Add FOC rule</button>
                    </div>
                    <FieldGrid fields={screen.focRuleFields} />
                    <p className="helper-copy">The selected product is used as the eligible product and default FOC reward product. Active promotions appear in the product list and order workflow.</p>
                </section>
            )}
            {showConversionSetup && (
                <section className="form-section">
                    <div className="section-heading">
                        <div>
                            <p className="eyebrow">Conversion setup</p>
                            <h2>Product-specific conversion preview</h2>
                        </div>
                        <button className="btn secondary" type="button">Add conversion</button>
                    </div>
                    <UnitConversionPreview conversions={screen.conversionPreviews} />
                    <p className="helper-copy">Conversion factors are configured on each product unit. The base unit is the quantity stored in inventory.</p>
                </section>
            )}
        </>
    );
}

function FocRuleCards({ rules = [] }) {
    if (!rules.length) {
        return null;
    }

    return (
        <div className="rule-card-grid">
            {rules.map((rule) => (
                <article key={rule.id || rule.title}>
                    <div>
                        <strong>{rule.title}</strong>
                        <StatusBadge value={rule.status || rule.type} />
                    </div>
                    <span>{rule.condition}</span>
                    <small>{rule.reward}</small>
                    {rule.validity && <small>{rule.validity}</small>}
                </article>
            ))}
        </div>
    );
}

function RecordFacts({ record, screen }) {
    if (!screen.factFields) {
        return null;
    }

    return (
        <section className="drawer-section">
            <p className="eyebrow">Record overview</p>
            <div className="fact-grid">
                {screen.factFields.map((field) => (
                    <div key={field.key}>
                        <span>{field.label}</span>
                        <strong>{record?.[field.key] || '-'}</strong>
                    </div>
                ))}
            </div>
        </section>
    );
}

function contextualFields(screen, contextKey) {
    if (contextKey === 'orders') {
        return (screen.formFields || []).filter((field) => field.label !== 'Customer credit status');
    }

    return screen.formFields || [];
}

function ModalContent({ blocked = false, contextKey, creditStatuses = [], onCompanyChange, screen, selectedCompany }) {
    if (screen.stockReceivingForm) {
        return <StockReceivingForm headerFields={screen.headerFields || []} />;
    }

    if (contextKey === 'orders') {
        return (
            <OrderCreateForm
                blocked={blocked}
                creditStatuses={creditStatuses}
                lines={screen.orderLineItems}
                onCompanyChange={onCompanyChange}
                selectedCompany={selectedCompany}
            />
        );
    }

    return (
        <>
            <FieldGrid fields={contextualFields(screen, contextKey)} />
            <ModalExtra screen={screen} />
        </>
    );
}

function CompanyForm({ form, onChange }) {
    return (
        <div className="company-form-layout">
            <div className="crud-grid">
                <FormField label="Company name" name="name" onChange={onChange} required value={form.name} />
                <FormField label="Company code" name="code" onChange={onChange} placeholder="Auto-generated if empty" value={form.code} />
                <FormField label="Contact person" name="contact_person" onChange={onChange} value={form.contact_person} />
                <FormField label="Phone number" name="phone" onChange={onChange} value={form.phone} />
                <FormField label="Email" name="email" onChange={onChange} type="email" value={form.email} />
                <label className="form-field">
                    <span>Status</span>
                    <select name="status" onChange={onChange} value={form.status}>
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                    </select>
                </label>
            </div>
            <FormField label="Address" name="address" onChange={onChange} type="textarea" value={form.address} />
        </div>
    );
}

function PharmacyForm({ form, onChange }) {
    return (
        <div className="company-form-layout">
            <div className="crud-grid">
                <FormField label="Pharmacy name" name="name" onChange={onChange} required value={form.name} />
                <FormField label="Pharmacy code" name="code" onChange={onChange} placeholder="Auto-generated if empty" value={form.code} />
                <FormField label="Owner name" name="owner_name" onChange={onChange} value={form.owner_name} />
                <FormField label="Phone number" name="phone" onChange={onChange} value={form.phone} />
                <FormField label="Email" name="email" onChange={onChange} type="email" value={form.email} />
                <FormField label="Township" name="township" onChange={onChange} value={form.township} />
                <FormField label="City" name="city" onChange={onChange} value={form.city} />
                <FormField label="Region" name="region" onChange={onChange} value={form.region} />
                <label className="form-field">
                    <span>Status</span>
                    <select name="status" onChange={onChange} value={form.status}>
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                    </select>
                </label>
            </div>
            <FormField label="Address" name="address" onChange={onChange} type="textarea" value={form.address} />
        </div>
    );
}

function ProductCategoryForm({ form, onChange, parentOptions = [], selectedId = null }) {
    const availableParents = parentOptions.filter((category) => String(category.id) !== String(selectedId || ''));

    return (
        <div className="company-form-layout">
            <div className="crud-grid">
                <FormField label="Category name" name="name" onChange={onChange} required value={form.name} />
                <FormField label="Category code" name="code" onChange={onChange} placeholder="Auto-generated if empty" value={form.code} />
                <label className="form-field">
                    <span>Parent category</span>
                    <select name="parent_id" onChange={onChange} value={form.parent_id}>
                        <option value="">No parent category</option>
                        {availableParents.map((category) => (
                            <option key={category.id} value={category.id}>{category.name}</option>
                        ))}
                    </select>
                </label>
                <label className="form-field">
                    <span>Status</span>
                    <select name="status" onChange={onChange} value={form.status}>
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                    </select>
                </label>
            </div>
        </div>
    );
}

function UnitForm({ form, onChange }) {
    return (
        <div className="company-form-layout">
            <div className="crud-grid">
                <FormField label="Unit name" name="name" onChange={onChange} required value={form.name} />
                <FormField label="Short name" name="abbreviation" onChange={onChange} required value={form.abbreviation} />
                <label className="form-field">
                    <span>Status</span>
                    <select name="status" onChange={onChange} value={form.status}>
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                    </select>
                </label>
            </div>
            <p className="helper-copy">Conversion factors and selling prices are configured per product in Product CRUD.</p>
        </div>
    );
}

function WarehouseForm({ form, onChange }) {
    return (
        <div className="company-form-layout">
            <div className="crud-grid">
                <FormField label="Warehouse name" name="name" onChange={onChange} required value={form.name} />
                <FormField label="Warehouse code" name="code" onChange={onChange} placeholder="Auto-generated if empty" value={form.code} />
                <label className="form-field">
                    <span>Status</span>
                    <select name="status" onChange={onChange} value={form.status}>
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                    </select>
                </label>
            </div>
            <FormField label="Address" name="address" onChange={onChange} type="textarea" value={form.address} />
        </div>
    );
}

function formatAmount(value) {
    return Number(value || 0).toLocaleString();
}

function titleCase(value) {
    return String(value || '')
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function findReceiptProduct(products, productId) {
    return products.find((product) => String(product.id) === String(productId));
}

function findReceiptProductUnit(product, unitId) {
    const units = product?.product_units || [];
    return units.find((unit) => String(unit.unit_id) === String(unitId)) || units[0];
}

function makeReceiptBatchNumber(product, receivedDate = '', itemIndex = 0) {
    const source = product?.sku || product?.name || 'MED';
    const prefix = String(source).replace(/[^a-z0-9]/gi, '').toUpperCase().slice(0, 12) || 'MED';
    const date = String(receivedDate || new Date().toISOString().slice(0, 10)).replace(/-/g, '').slice(2, 8);
    const sequence = String(itemIndex + 1).padStart(3, '0');

    return `${prefix}-${date}-${sequence}`;
}

function StockReceiptForm({
    companies = [],
    form,
    onAddItem,
    onChange,
    onItemChange,
    onRemoveItem,
    products = [],
    productsLoading = false,
    warehouses = [],
}) {
    const preparedItems = (form.items || []).map((item) => {
        const product = findReceiptProduct(products, item.product_id);
        const productUnit = findReceiptProductUnit(product, item.unit_id);
        const quantity = Number(item.quantity || 0);
        const focQuantity = Number(item.foc_quantity || 0);
        const unitCost = Number(item.unit_cost || 0);
        const conversionFactor = Number(productUnit?.conversion_factor_to_base || 1);
        const focProductUnit = focQuantity > 0 ? findReceiptProductUnit(product, item.foc_unit_id || item.unit_id) : null;
        const focConversionFactor = Number(focProductUnit?.conversion_factor_to_base || 1);
        const grossLineTotal = quantity * unitCost;
        const commissionRate = Number(product?.commission_rate_percentage || 0);
        const commissionAmount = grossLineTotal * commissionRate / 100;

        return {
            ...item,
            baseQuantity: (quantity * conversionFactor) + (focQuantity * focConversionFactor),
            commissionAmount,
            commissionRate,
            conversionFactor,
            focBaseQuantity: focQuantity * focConversionFactor,
            focConversionFactor,
            focProductUnit,
            grossLineTotal,
            lineTotal: Math.max(0, grossLineTotal - commissionAmount),
            product,
            productUnit,
        };
    });
    const subtotal = preparedItems.reduce((sum, item) => sum + item.grossLineTotal, 0);
    const commissionTotal = preparedItems.reduce((sum, item) => sum + item.commissionAmount, 0);
    const total = Math.max(0, subtotal - commissionTotal);
    const paid = Number(form.paid_amount || 0);
    const due = Math.max(0, total - paid);

    return (
        <div className="receiving-form">
            <div className="crud-grid">
                <label className="form-field">
                    <span>Company</span>
                    <select name="company_id" onChange={onChange} required value={form.company_id}>
                        <option value="" disabled>Select company</option>
                        {companies.map((company) => (
                            <option key={company.id} value={company.id}>{company.name}</option>
                        ))}
                    </select>
                </label>
                <label className="form-field">
                    <span>Warehouse</span>
                    <select name="warehouse_id" onChange={onChange} required value={form.warehouse_id}>
                        <option value="" disabled>Select warehouse</option>
                        {warehouses.map((warehouse) => (
                            <option key={warehouse.id} value={warehouse.id}>{warehouse.name}</option>
                        ))}
                    </select>
                </label>
                <FormField label="Company invoice number" name="supplier_invoice_no" onChange={onChange} value={form.supplier_invoice_no} />
                <FormField label="Received date" name="received_date" onChange={onChange} type="date" value={form.received_date} />
                <FormField label="Payable due date" name="payable_due_date" onChange={onChange} type="date" value={form.payable_due_date} />
                <FormField label="Paid amount" name="paid_amount" onChange={onChange} type="number" value={form.paid_amount} />
            </div>

            <section className="form-section">
                <div className="section-heading">
                    <div>
                        <p className="eyebrow">Stock items</p>
                        <h2>Products received into warehouse</h2>
                    </div>
                    <button className="btn secondary" disabled={!form.company_id || productsLoading} onClick={onAddItem} type="button">Add item</button>
                </div>

                <div className="receiving-items">
                    {preparedItems.map((item, index) => {
                        const units = item.product?.product_units || [];

                        return (
                            <article className="receiving-item" key={`receipt-item-${index}`}>
                                <div className="receiving-item-head">
                                    <strong>Item #{index + 1}</strong>
                                    <button className="btn secondary" disabled={form.items.length === 1} onClick={() => onRemoveItem(index)} type="button">Remove</button>
                                </div>

                                <div className="receiving-item-grid">
                                    <label className="form-field">
                                        <span>Product</span>
                                        <select disabled={!form.company_id || productsLoading} onChange={(event) => onItemChange(index, event)} name="product_id" required value={item.product_id}>
                                            <option value="" disabled>{productsLoading ? 'Loading products' : 'Select product'}</option>
                                            {products.map((product) => (
                                                <option key={product.id} value={product.id}>{product.name}</option>
                                            ))}
                                        </select>
                                    </label>
                                    <label className="form-field">
                                        <span>Received unit</span>
                                        <select disabled={!item.product_id} onChange={(event) => onItemChange(index, event)} name="unit_id" required value={item.unit_id}>
                                            <option value="" disabled>Select unit</option>
                                            {units.map((unit) => (
                                                <option key={unit.unit_id} value={unit.unit_id}>{unit.unit?.name || `Unit #${unit.unit_id}`}</option>
                                            ))}
                                        </select>
                                    </label>
                                    <FormField label="Received quantity" name="quantity" onChange={(event) => onItemChange(index, event)} required type="number" value={item.quantity} />
                                    <FormField label="FOC quantity" name="foc_quantity" onChange={(event) => onItemChange(index, event)} type="number" value={item.foc_quantity} />
                                    <label className="form-field">
                                        <span>FOC unit</span>
                                        <select disabled={!item.product_id || Number(item.foc_quantity || 0) <= 0} onChange={(event) => onItemChange(index, event)} name="foc_unit_id" value={item.foc_unit_id}>
                                            <option value="">Same as received unit</option>
                                            {units.map((unit) => (
                                                <option key={unit.unit_id} value={unit.unit_id}>{unit.unit?.name || `Unit #${unit.unit_id}`}</option>
                                            ))}
                                        </select>
                                    </label>
                                    <FormField label="Unit cost" name="unit_cost" onChange={(event) => onItemChange(index, event)} required type="number" value={item.unit_cost} />
                                    <FormField label="Batch number" name="batch_no" onChange={(event) => onItemChange(index, event)} placeholder="Auto-generated, editable" value={item.batch_no} />
                                    <FormField label="Manufacturing date" name="manufactured_date" onChange={(event) => onItemChange(index, event)} type="date" value={item.manufactured_date} />
                                    <FormField label="Expiry date" name="expiry_date" onChange={(event) => onItemChange(index, event)} type="date" value={item.expiry_date} />
                                </div>

                                <div className="receiving-preview">
                                    <span><strong>{formatAmount(item.conversionFactor)}</strong><small>Conversion factor</small></span>
                                    <span><strong>{formatAmount(item.baseQuantity)}</strong><small>Base stock quantity</small></span>
                                    <span><strong>{formatAmount(item.commissionAmount)}</strong><small>{formatAmount(item.commissionRate)}% commission</small></span>
                                    <span><strong>{formatAmount(item.lineTotal)}</strong><small>Payable line total</small></span>
                                </div>
                            </article>
                        );
                    })}
                </div>
            </section>

            <section className="receiving-summary">
                <div><span>Subtotal</span><strong>{formatAmount(subtotal)}</strong></div>
                <div><span>Commission deducted</span><strong>{formatAmount(commissionTotal)}</strong></div>
                <div><span>Payable after commission</span><strong>{formatAmount(total)}</strong></div>
                <div><span>Paid amount</span><strong>{formatAmount(paid)}</strong></div>
                <div><span>Company payable due</span><strong>{formatAmount(due)}</strong></div>
            </section>
        </div>
    );
}

function StockAdjustmentForm({
    companies = [],
    form,
    onChange,
    products = [],
    productsLoading = false,
    warehouses = [],
}) {
    const product = findReceiptProduct(products, form.product_id);
    const productUnit = findReceiptProductUnit(product, form.unit_id);
    const quantity = Number(form.quantity || 0);
    const conversionFactor = Number(productUnit?.conversion_factor_to_base || 1);
    const baseQuantity = quantity * conversionFactor;
    const units = product?.product_units || [];
    const showBatchFields = form.adjustment_type === 'increase';
    const productName = product?.name || form.product_name || 'Selected product';

    return (
        <div className="company-form-layout">
            <div className="crud-grid">
                <label className="form-field">
                    <span>Company</span>
                    <select disabled={form.product_locked} name="company_id" onChange={onChange} required value={form.company_id}>
                        <option value="" disabled>Select company</option>
                        {companies.map((company) => (
                            <option key={company.id} value={company.id}>{company.name}</option>
                        ))}
                    </select>
                </label>
                <label className="form-field">
                    <span>Warehouse</span>
                    <select name="warehouse_id" onChange={onChange} required value={form.warehouse_id}>
                        <option value="" disabled>Select warehouse</option>
                        {warehouses.map((warehouse) => (
                            <option key={warehouse.id} value={warehouse.id}>{warehouse.name}</option>
                        ))}
                    </select>
                </label>
                {form.product_locked ? (
                    <FormField label="Product" name="product_name" onChange={() => {}} readOnly value={productName} />
                ) : (
                    <label className="form-field">
                        <span>Product</span>
                        <select disabled={!form.company_id || productsLoading} name="product_id" onChange={onChange} required value={form.product_id}>
                            <option value="" disabled>{productsLoading ? 'Loading products' : 'Select product'}</option>
                            {products.map((item) => (
                                <option key={item.id} value={item.id}>{item.name}</option>
                            ))}
                        </select>
                    </label>
                )}
                <label className="form-field">
                    <span>Unit</span>
                    <select disabled={!form.product_id} name="unit_id" onChange={onChange} required value={form.unit_id}>
                        <option value="" disabled>Select unit</option>
                        {units.map((unit) => (
                            <option key={unit.unit_id} value={unit.unit_id}>{unit.unit?.name || `Unit #${unit.unit_id}`}</option>
                        ))}
                    </select>
                </label>
                <label className="form-field">
                    <span>Adjustment type</span>
                    <select name="adjustment_type" onChange={onChange} value={form.adjustment_type}>
                        <option value="increase">Increase stock</option>
                        <option value="decrease">Decrease stock</option>
                        <option value="damage">Mark damaged</option>
                        <option value="expiry">Mark expired</option>
                    </select>
                </label>
                <FormField label="Quantity" name="quantity" onChange={onChange} required type="number" value={form.quantity} />
                {showBatchFields && (
                    <>
                        <FormField label="Batch number" name="batch_no" onChange={onChange} placeholder="Auto-generated if empty" value={form.batch_no} />
                        <FormField label="Expiry date" name="expiry_date" onChange={onChange} type="date" value={form.expiry_date} />
                    </>
                )}
            </div>

            <div className="receiving-preview">
                <span><strong>{formatAmount(conversionFactor)}</strong><small>Conversion factor</small></span>
                <span><strong>{formatAmount(baseQuantity)}</strong><small>Base stock quantity</small></span>
                <span><strong>{product?.base_unit?.name || product?.baseUnit?.name || 'Base unit'}</strong><small>Stored inventory unit</small></span>
            </div>

            <FormField label="Reason" name="reason" onChange={onChange} placeholder="Adjustment note" type="textarea" value={form.reason} />
        </div>
    );
}

function CustomerPaymentForm({ form, onChange, record }) {
    return (
        <div className="company-form-layout">
            <div className="workflow-context-card">
                <span>Receivable invoice</span>
                <strong>{record?.invoice || 'Select an invoice from receivables'}</strong>
                <small>{record?.pharmacy || '-'} / Balance {record?.balanceAmount || '-'}</small>
            </div>
            <div className="crud-grid">
                <FormField label="Payment date" name="payment_date" onChange={onChange} type="date" value={form.payment_date} />
                <FormField label="Amount" name="amount" onChange={onChange} required type="number" value={form.amount} />
                <label className="form-field">
                    <span>Payment method</span>
                    <select name="payment_method" onChange={onChange} value={form.payment_method}>
                        <option value="cash">Cash</option>
                        <option value="bank_transfer">Bank transfer</option>
                        <option value="cheque">Cheque</option>
                        <option value="mobile_money">Mobile money</option>
                        <option value="other">Other</option>
                    </select>
                </label>
                <FormField label="Reference no." name="reference_no" onChange={onChange} value={form.reference_no} />
            </div>
            <FormField label="Note" name="note" onChange={onChange} type="textarea" value={form.note} />
        </div>
    );
}

function CompanyPaymentForm({ companies = [], form, onChange, record }) {
    const bulkMode = Boolean(form.pay_all);

    return (
        <div className="company-form-layout">
            <div className="workflow-context-card">
                <span>{bulkMode ? 'Company settlement' : 'Company payable'}</span>
                <strong>{bulkMode ? 'Settle all open payables' : record?.company || 'Select a payable row'}</strong>
                <small>{bulkMode ? 'All unpaid and partial payables for the selected company will be marked paid.' : `${record?.receipt || '-'} / Balance ${record?.balanceAmount || '-'}`}</small>
            </div>
            <div className="crud-grid">
                {bulkMode ? (
                    <label className="form-field">
                        <span>Company</span>
                        <select name="company_id" onChange={onChange} required value={form.company_id}>
                            <option value="" disabled>Select company</option>
                            {companies.map((company) => (
                                <option key={company.id} value={company.id}>{company.name}</option>
                            ))}
                        </select>
                    </label>
                ) : null}
                <FormField label="Payment date" name="payment_date" onChange={onChange} type="date" value={form.payment_date} />
                {!bulkMode && <FormField label="Amount" name="amount" onChange={onChange} required type="number" value={form.amount} />}
                <label className="form-field">
                    <span>Payment method</span>
                    <select name="payment_method" onChange={onChange} value={form.payment_method}>
                        <option value="cash">Cash</option>
                        <option value="bank_transfer">Bank transfer</option>
                        <option value="cheque">Cheque</option>
                        <option value="mobile_money">Mobile money</option>
                        <option value="other">Other</option>
                    </select>
                </label>
                <FormField label="Reference no." name="reference_no" onChange={onChange} value={form.reference_no} />
            </div>
            <FormField label="Note" name="note" onChange={onChange} type="textarea" value={form.note} />
        </div>
    );
}

function OfficeOrderForm({
    companies = [],
    customers = [],
    error = '',
    form,
    lines,
    lockedCustomer = null,
    onChange,
    onLineChange,
    products = [],
    productsLoading = false,
    representatives = [],
    representativesLoading = false,
    submitting = false,
}) {
    const selectedCustomer = customers.find((customer) => String(customer.id) === String(form.customer_id)) || lockedCustomer;
    const selectedCredit = selectedCustomer?.credit_statuses?.find((credit) => String(credit.company_id) === String(form.company_id))
        || selectedCustomer?.creditStatuses?.find((credit) => String(credit.company_id) === String(form.company_id));
    const creditStatus = titleCase(selectedCredit?.credit_status || selectedCredit?.status || 'ready');
    const outstandingBalance = selectedCredit?.outstanding_balance ?? selectedCredit?.outstanding ?? 0;
    const blocked = isBlockedCredit(creditStatus);
    const customerOptions = selectedCustomer?.id && !customers.some((customer) => String(customer.id) === String(selectedCustomer.id))
        ? [selectedCustomer, ...customers]
        : customers;

    return (
        <div className="order-create-form sales-order-create-form">
            <section className="order-setup-card">
                <div className="section-heading">
                    <div>
                        <p className="eyebrow">Admin order</p>
                        <h2>Pharmacy, company, and approval setup</h2>
                    </div>
                </div>
                <div className="sales-order-context-grid">
                    <label className="form-field">
                        <span>Company</span>
                        <select disabled={submitting} name="company_id" onChange={onChange} required value={form.company_id}>
                            <option value="" disabled>Select company</option>
                            {companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}
                        </select>
                    </label>
                    <label className="form-field">
                        <span>Pharmacy</span>
                        <select disabled={Boolean(lockedCustomer?.id) || submitting} name="customer_id" onChange={onChange} required value={form.customer_id}>
                            <option value="" disabled>Select pharmacy</option>
                            {customerOptions.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}</option>)}
                        </select>
                    </label>
                    <label className="form-field">
                        <span>Sales representative</span>
                        <select disabled={!form.company_id || representativesLoading || submitting} name="sales_representative_id" onChange={onChange} value={form.sales_representative_id}>
                            <option value="">{representativesLoading ? 'Loading representatives' : 'No representative'}</option>
                            {representatives.map((representative) => (
                                <option key={representative.id} value={representative.id}>
                                    {representative.user?.name || representative.employee_code || `Rep #${representative.id}`}
                                </option>
                            ))}
                        </select>
                    </label>
                    <FormField label="Requested delivery date" name="requested_delivery_date" onChange={onChange} type="date" value={form.requested_delivery_date} />
                    <article className={`order-credit-summary ${blocked ? 'is-blocked' : ''}`}>
                        <div>
                            <span>Company credit</span>
                            <StatusBadge value={creditStatus} />
                        </div>
                        <strong>{blocked ? 'Order creation is blocked' : 'Order creation is allowed'}</strong>
                        <small>{selectedCredit?.reason || 'No overdue balance for this company.'}</small>
                        <small>Outstanding: {formatAmount(outstandingBalance)}</small>
                    </article>
                    <label className="form-field sales-order-note">
                        <span>Order note</span>
                        <textarea disabled={submitting} name="note" onChange={onChange} placeholder="Optional note for warehouse or finance" rows="3" value={form.note} />
                    </label>
                </div>
            </section>

            <OrderLineBuilder
                allowFallback={false}
                disabled={!form.company_id || blocked || productsLoading || submitting}
                onChange={onLineChange}
                productOptions={products}
                value={lines}
            />
            {error && <span className="error-text">{error}</span>}
            <p className="helper-copy">
                Admin-created orders are approved immediately, reserve available batch stock, and are then ready for invoice generation.
            </p>
        </div>
    );
}

function SalesRepresentativeForm({ companies = [], form, onChange }) {
    return (
        <div className="company-form-layout">
            <div className="crud-grid">
                <FormField label="Name" name="name" onChange={onChange} required value={form.name} />
                <FormField label="Email" name="email" onChange={onChange} required type="email" value={form.email} />
                <FormField label="Phone number" name="phone" onChange={onChange} value={form.phone} />
                <FormField label="Employee code" name="employee_code" onChange={onChange} placeholder="Auto-generated if empty" value={form.employee_code} />
                <label className="form-field">
                    <span>Assigned company</span>
                    <select name="company_id" onChange={onChange} required value={form.company_id}>
                        <option value="" disabled>Select assigned company</option>
                        {companies.map((company) => (
                            <option key={company.id} value={company.id}>{company.name}</option>
                        ))}
                    </select>
                </label>
                <FormField label="Region" name="region" onChange={onChange} value={form.region} />
                <FormField label="Joined date" name="joined_at" onChange={onChange} type="date" value={form.joined_at} />
                <FormField label="Password" name="password" onChange={onChange} placeholder="Leave blank to keep current password" type="password" value={form.password} />
                <label className="form-field">
                    <span>Status</span>
                    <select name="status" onChange={onChange} value={form.status}>
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                    </select>
                </label>
            </div>
            <p className="helper-copy">A sales rep can sell all active products from the assigned company.</p>
        </div>
    );
}

function ProductImagePicker({ imageName = '', onChange, preview = '' }) {
    return (
        <div className="product-image-picker">
            <label className="product-image-cropper">
                <input accept="image/*" aria-label="Primary product image" name="primary_image" onChange={onChange} type="file" />
                {preview ? (
                    <img alt="Selected product preview" src={preview} />
                ) : (
                    <span className="product-image-placeholder">
                        <Icon name="image" size={28} />
                        <strong>Product image</strong>
                        <small>Square preview</small>
                    </span>
                )}
            </label>
            <strong>{imageName || 'Choose primary image'}</strong>
            <small>Shown in product list and product detail.</small>
        </div>
    );
}

function ProductFormSkeleton() {
    return (
        <div className="product-form-layout">
            <div className="product-image-picker">
                <span className="skeleton-product-image" />
                <span className="skeleton-line short" />
            </div>
            <div className="crud-grid">
                {Array.from({ length: 10 }).map((_, index) => (
                    <span className="skeleton-field" key={`product-form-skeleton-${index}`} />
                ))}
            </div>
            <span className="skeleton-panel" />
            <span className="skeleton-field tall" />
        </div>
    );
}

function ProductUnitEditor({ baseUnitId, onAddUnit, onRemoveUnit, onUnitChange, rows = [], units = [] }) {
    return (
        <section className="product-unit-editor">
            <div className="section-heading compact">
                <div>
                    <p className="eyebrow">Unit pricing</p>
                    <h2>Order and selling units</h2>
                </div>
                <button className="btn secondary" onClick={onAddUnit} type="button">Add unit</button>
            </div>
            <div className="product-unit-editor-head">
                <span>Unit</span>
                <span>Conversion</span>
                <span>Selling price</span>
                <span>Default</span>
                <span>Status</span>
            </div>
            <div className="product-unit-editor-list">
                {(rows.length ? rows : [{ unit_id: baseUnitId, conversion_factor_to_base: 1, selling_price: '0', is_default_sales_unit: true, status: 'active' }]).map((row, index) => {
                    const isBaseUnit = baseUnitId && String(row.unit_id) === String(baseUnitId);

                    return (
                        <div className="product-unit-editor-row" key={`${row.unit_id || 'unit'}-${index}`}>
                            <label className="form-field">
                                <span>Unit</span>
                                <select name="unit_id" onChange={(event) => onUnitChange(index, event)} required value={row.unit_id || ''}>
                                    <option value="" disabled>Select unit</option>
                                    {units.map((unit) => <option key={unit.id} value={unit.id}>{unit.name}</option>)}
                                </select>
                            </label>
                            <FormField
                                label="Conversion to base"
                                name="conversion_factor_to_base"
                                onChange={(event) => onUnitChange(index, event)}
                                type="number"
                                value={isBaseUnit ? '1' : row.conversion_factor_to_base}
                            />
                            <FormField
                                label="Selling price"
                                name="selling_price"
                                onChange={(event) => onUnitChange(index, event)}
                                type="number"
                                value={row.selling_price}
                            />
                            <label className="form-check compact">
                                <input
                                    checked={Boolean(row.is_default_sales_unit)}
                                    name="is_default_sales_unit"
                                    onChange={(event) => onUnitChange(index, event)}
                                    type="checkbox"
                                />
                                <span>Sales default</span>
                            </label>
                            <div className="product-unit-row-actions">
                                <label className="form-field">
                                    <span>Status</span>
                                    <select name="status" onChange={(event) => onUnitChange(index, event)} value={row.status || 'active'}>
                                        <option value="active">Active</option>
                                        <option value="inactive">Inactive</option>
                                    </select>
                                </label>
                                <button
                                    aria-label="Remove product unit"
                                    className="icon-btn danger"
                                    disabled={isBaseUnit || rows.length <= 1}
                                    onClick={() => onRemoveUnit(index)}
                                    type="button"
                                >
                                    <Icon name="trash" size={16} />
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>
            <p className="helper-copy">The base unit is stored in inventory with conversion 1. Other units are available in order creation and invoices.</p>
        </section>
    );
}

function ProductFocRuleEditor({ form, onChange }) {
    const rule = form.foc_rule || blankFocRuleForm;

    return (
        <section className={`product-foc-editor${rule.enabled ? '' : ' is-disabled'}`}>
            <div className="section-heading compact">
                <div>
                    <p className="eyebrow">FOC rules</p>
                    <h2>Product FOC setup</h2>
                </div>
                <label className="form-check compact">
                    <input checked={Boolean(rule.enabled)} name="enabled" onChange={onChange} type="checkbox" />
                    <span>Enable FOC</span>
                </label>
            </div>
            {rule.enabled && (
                <>
                    <div className="crud-grid">
                        <label className="form-field">
                            <span>Trigger type</span>
                            <select name="rule_type" onChange={onChange} value={rule.rule_type || 'quantity'}>
                                <option value="quantity">Quantity</option>
                                <option value="value">Order value</option>
                            </select>
                        </label>
                        {rule.rule_type === 'value' ? (
                            <FormField
                                label="Minimum order value"
                                min="1"
                                name="minimum_order_value"
                                onChange={onChange}
                                required
                                type="number"
                                value={rule.minimum_order_value}
                            />
                        ) : (
                            <FormField
                                label="Minimum quantity in base units"
                                min="1"
                                name="minimum_quantity_base_units"
                                onChange={onChange}
                                required
                                type="number"
                                value={rule.minimum_quantity_base_units}
                            />
                        )}
                        <FormField
                            label="FOC reward in base units"
                            min="1"
                            name="reward_quantity_base_units"
                            onChange={onChange}
                            required
                            type="number"
                            value={rule.reward_quantity_base_units}
                        />
                        <label className="form-field">
                            <span>Status</span>
                            <select name="status" onChange={onChange} value={rule.status || 'active'}>
                                <option value="active">Active</option>
                                <option value="inactive">Inactive</option>
                            </select>
                        </label>
                        <FormField label="Starts at" name="starts_at" onChange={onChange} type="date" value={rule.starts_at} />
                        <FormField label="Ends at" name="ends_at" onChange={onChange} type="date" value={rule.ends_at} />
                    </div>
                    <p className="helper-copy">Orders use the product base unit for the trigger and reward quantity. Leave dates empty when the rule should stay open-ended.</p>
                </>
            )}
        </section>
    );
}

function ProductForm({ categories = [], companies = [], form, onAddUnit, onChange, onFocRuleChange, onImageChange, onRemoveUnit, onUnitChange, units = [] }) {
    const imageName = form.primary_image?.name || (form.primary_image_path ? form.primary_image_path.split('/').pop() : '');

    return (
        <div className="product-form-layout">
            <ProductImagePicker imageName={imageName} onChange={onImageChange} preview={form.primary_image_preview || storageUrl(form.primary_image_path)} />
            <div className="crud-grid">
                <FormField label="Product name" name="name" onChange={onChange} required value={form.name} />
                <FormField label="SKU" name="sku" onChange={onChange} placeholder="Auto-generated if empty" value={form.sku} />
                <FormField label="Barcode" name="barcode" onChange={onChange} placeholder="Scan or enter barcode" value={form.barcode} />
                <label className="form-field">
                    <span>Company</span>
                    <select name="company_id" onChange={onChange} required value={form.company_id}>
                        <option value="" disabled>Select company</option>
                        {companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}
                    </select>
                </label>
                <label className="form-field">
                    <span>Category</span>
                    <select name="product_category_id" onChange={onChange} value={form.product_category_id}>
                        <option value="">No category</option>
                        {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
                    </select>
                </label>
                <FormField label="Brand" name="brand" onChange={onChange} placeholder="Enter brand name" value={form.brand} />
                <label className="form-field">
                    <span>Base unit</span>
                    <select name="base_unit_id" onChange={onChange} required value={form.base_unit_id}>
                        <option value="" disabled>Select base unit</option>
                        {units.map((unit) => <option key={unit.id} value={unit.id}>{unit.name}</option>)}
                    </select>
                </label>
                <FormField label="Low stock threshold" name="low_stock_threshold_base_units" onChange={onChange} type="number" value={form.low_stock_threshold_base_units} />
                <FormField label="Product discount percentage" name="default_discount_percentage" onChange={onChange} type="number" value={form.default_discount_percentage} />
                <FormField label="Product commission rate" name="commission_rate_percentage" onChange={onChange} type="number" value={form.commission_rate_percentage} />
                <label className="form-field">
                    <span>Status</span>
                    <select name="status" onChange={onChange} value={form.status}>
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                        <option value="discontinued">Discontinued</option>
                    </select>
                </label>
            </div>
            <ProductUnitEditor
                baseUnitId={form.base_unit_id}
                onAddUnit={onAddUnit}
                onRemoveUnit={onRemoveUnit}
                onUnitChange={onUnitChange}
                rows={form.product_units}
                units={units}
            />
            <ProductFocRuleEditor form={form} onChange={onFocRuleChange} />
            <FormField label="Description" name="description" onChange={onChange} type="textarea" value={form.description} />
        </div>
    );
}

function WorkflowContext({ context, screenKey }) {
    if (!context) {
        return null;
    }

    const contextCopy = {
        invoices: {
            label: 'Source order',
            note: 'Order, pharmacy, products, FOC, discounts, and totals are carried into this invoice.',
        },
    };
    const copy = contextCopy[screenKey] || {
        label: 'Selected pharmacy',
        note: 'The order will be created for this pharmacy without using a pharmacy selector.',
    };

    return (
        <div className="workflow-context-card">
            <span>{copy.label}</span>
            <strong>{context}</strong>
            <small>{copy.note}</small>
        </div>
    );
}

function ReceivingDetailView({ record }) {
    const facts = [
        { label: 'Receipt', value: record?.receipt },
        { label: 'Company invoice', value: record?.invoice },
        { label: 'Company', value: record?.company },
        { label: 'Warehouse', value: record?.warehouse },
        { label: 'Received date', value: record?.receivedDate },
        { label: 'Payment', value: record?.paymentStatus },
        { label: 'Paid amount', value: record?.paidAmount },
        { label: 'Due amount', value: record?.dueAmount },
    ];

    return (
        <div className="detail-stack">
            <section className="drawer-section">
                <p className="eyebrow">Receiving detail</p>
                <div className="fact-grid">
                    {facts.map((fact) => (
                        <div key={fact.label}>
                            <span>{fact.label}</span>
                            <strong>{fact.value || '-'}</strong>
                        </div>
                    ))}
                </div>
            </section>
            <section className="drawer-section">
                <p className="eyebrow">Received items</p>
                <StockReceivingDetail
                    items={record?.receivingItems || []}
                    payable={record?.payablePreview}
                />
            </section>
        </div>
    );
}

function Details({ defaultUnitBusy = false, onDefaultSalesUnitChange, record, screen }) {
    if (screen.stockReceivingForm) {
        return <ReceivingDetailView record={record} />;
    }

    const tabs = screen.tabs?.map((tab) => ({
        key: tab.key,
        label: tab.label,
        content: (
            <div className="line-list">
                {tab.lines.map((line) => <span key={line}>{line}</span>)}
            </div>
        ),
    }));

    return (
        <div className="detail-stack">
            {record?.productUnits && (
                <div className="product-detail-hero">
                    {record?.imageUrl
                        ? <img alt={record?.name || 'Product image'} src={record.imageUrl} />
                        : (
                            <span className="product-detail-image-placeholder">
                                <Icon name="image" size={26} />
                            </span>
                        )}
                </div>
            )}
            <div className="detail-row">
                <span>Selected record</span>
                <strong>{record?.name || record?.order || record?.invoice || record?.receipt || record?.setting || record?.company || 'Review record'}</strong>
            </div>
            <RecordFacts record={record} screen={screen} />
            {screen.drawerSections?.map((section) => (
                <section className="drawer-section" key={section.title}>
                    <p className="eyebrow">{section.title}</p>
                    <div className="line-list">
                        {section.items.map((item) => <span key={item}>{item}</span>)}
                    </div>
                </section>
            ))}
            {record?.productUnits && (
                <section className="drawer-section">
                    <p className="eyebrow">Unit pricing</p>
                    <ProductUnitGrid defaultActionBusy={defaultUnitBusy} onDefaultSalesUnitChange={onDefaultSalesUnitChange} rows={record.productUnits} />
                </section>
            )}
            {(record?.focRules || screen.focRules) && (
                <section className="drawer-section">
                    <p className="eyebrow">Product FOC rules</p>
                    <FocRuleCards rules={record?.focRules || screen.focRules} />
                </section>
            )}
            {(record?.assignedProducts || screen.assignmentProducts) && (
                <section className="drawer-section">
                    <p className="eyebrow">Assigned products</p>
                    <CompanyProductAssignment products={record?.assignedProducts || screen.assignmentProducts} />
                </section>
            )}
            {(record?.conversionPreviews || screen.conversionPreviews) && (
                <section className="drawer-section">
                    <p className="eyebrow">Conversion preview</p>
                    <UnitConversionPreview conversions={record?.conversionPreviews || screen.conversionPreviews} />
                </section>
            )}
            {(record?.creditStatuses || screen.creditStatuses) && (
                <section className="drawer-section">
                    <p className="eyebrow">Company credit status</p>
                    <CreditStatusGrid rows={record?.creditStatuses || screen.creditStatuses} />
                </section>
            )}
            {(record?.repAssignments || screen.repAssignments) && (
                <section className="drawer-section">
                    <p className="eyebrow">Assigned company and products</p>
                    <RepAssignmentGrid assignments={record?.repAssignments || screen.repAssignments} />
                </section>
            )}
            {(record?.performanceCards || screen.performanceCards) && (
                <section className="drawer-section">
                    <p className="eyebrow">Performance preview</p>
                    <div className="mini-metric-grid">
                        {(record?.performanceCards || screen.performanceCards).map((card) => (
                            <div key={card.label}>
                                <span>{card.label}</span>
                                <strong>{card.value}</strong>
                                <small>{card.note}</small>
                            </div>
                        ))}
                    </div>
                </section>
            )}
            {(record?.stockMovements || screen.stockMovements) && (
                <section className="drawer-section">
                    <p className="eyebrow">Stock movement history</p>
                    <StockMovementTimeline movements={record?.stockMovements || screen.stockMovements} />
                </section>
            )}
            {(record?.lowStockAlerts || screen.lowStockAlerts || record?.expiryAlerts || screen.expiryAlerts) && (
                <section className="drawer-section">
                    <p className="eyebrow">Inventory alerts</p>
                    <div className="inventory-alert-grid">
                        {(record?.lowStockAlerts || screen.lowStockAlerts || []).map((alert) => (
                            <article key={alert.id}>
                                <strong>{alert.product}</strong>
                                <small>{alert.detail}</small>
                            </article>
                        ))}
                        {(record?.expiryAlerts || screen.expiryAlerts || []).map((alert) => (
                            <article key={alert.id}>
                                <strong>{alert.product}</strong>
                                <small>{alert.detail}</small>
                            </article>
                        ))}
                    </div>
                </section>
            )}
            {(record?.receivingItems || screen.receivingItems) && (
                <section className="drawer-section">
                    <p className="eyebrow">Received items and payable</p>
                    <StockReceivingDetail
                        items={record?.receivingItems || screen.receivingItems}
                        payable={record?.payablePreview || screen.payablePreview}
                    />
                </section>
            )}
            {record?.orderItems && (
                <SalesOrderDetail
                    approvalCards={record.approvalCards}
                    focItems={record.focItems}
                    orderItems={record.orderItems}
                    totals={record.totals}
                    warehouseChecklist={record.warehouseChecklist}
                />
            )}
            {(record?.documents || screen.documents) && (
                <DocumentPreviewSet
                    documents={record?.documents || screen.documents}
                    invoiceItems={record?.invoiceItems || screen.invoiceItems || []}
                />
            )}
            {(record?.allocations || screen.allocations || record?.agingBuckets || screen.agingBuckets) && (
                <FinanceReview
                    agingBuckets={record?.agingBuckets || screen.agingBuckets || []}
                    allocations={record?.allocations || screen.allocations || []}
                    warningCards={record?.warningCards || screen.warningCards || []}
                />
            )}
            {record?.paymentTransactions && (
                <section className="drawer-section">
                    <p className="eyebrow">Payment transactions</p>
                    {record.paymentTransactions.length > 0 ? (
                        <div className="finance-allocation-table">
                            <div className="finance-allocation-head">
                                <span>Payment</span>
                                <span>Date</span>
                                <span>Method</span>
                                <span>Amount</span>
                                <span>Status</span>
                            </div>
                            {record.paymentTransactions.map((payment) => (
                                <div className="finance-allocation-row" key={payment.id}>
                                    <div>
                                        <strong>{payment.payment}</strong>
                                        <small>{payment.reference}</small>
                                    </div>
                                    <span>{payment.date}</span>
                                    <span>{payment.method}</span>
                                    <strong>{payment.amount}</strong>
                                    <StatusBadge value={payment.status} />
                                </div>
                            ))}
                        </div>
                    ) : (
                        <span className="muted">No company payment has been recorded for this payable.</span>
                    )}
                </section>
            )}
            {(screen.focExamples || screen.commissionPreviewRows) && (
                <RuleSetupPreview
                    commissionRows={screen.commissionPreviewRows || []}
                    focExamples={screen.focExamples || []}
                />
            )}
            {screen.reportCategories && (
                <ReportsWorkspace
                    categories={screen.reportCategories}
                    chart={screen.reportChart}
                    metrics={screen.reportMetrics || []}
                    summary={screen.reportSummary || []}
                    tableColumns={screen.reportTableColumns || []}
                    tableRows={screen.reportTableRows || []}
                />
            )}
            {screen.permissionMatrix && (
                <SettingsWorkspace
                    creditPolicies={screen.creditPolicies || []}
                    permissionMatrix={screen.permissionMatrix}
                    storageSettings={screen.storageSettings || []}
                />
            )}
            {tabs && <Tabs tabs={tabs} />}
            {screen.print && (
                <PrintPreview
                    items={record?.printItems || screen.printItems || [
                        { label: 'Reference', value: record?.id || 'Draft' },
                        { label: 'Customer', value: record?.pharmacy || record?.customer || record?.company || 'Review' },
                        { label: 'Status', value: record?.status || 'Ready' },
                    ]}
                    title={screen.print.title}
                    type={screen.print.type}
                />
            )}
        </div>
    );
}

function createScreenAction(action, onNavigate, fallback) {
    return () => {
        if (action?.target) {
            onNavigate?.(action.target);
            return;
        }

        fallback?.();
    };
}

function getRecordLabel(screen) {
    if (screen.recordLabel) {
        return screen.recordLabel;
    }

    const title = (screen.title || 'record').toLowerCase();

    if (title.endsWith('ies')) {
        return `${title.slice(0, -3)}y`;
    }

    if (title.endsWith('s')) {
        return title.slice(0, -1);
    }

    return title;
}

function getRecordTitle(record, fallback = 'Selected record') {
    return record?.name || record?.order || record?.invoice || record?.receipt || record?.setting || record?.company || fallback;
}

const blankProductListFilters = {
    company_id: '',
    page: 1,
    search: '',
    status: '',
};

const blankPharmacyListFilters = {
    page: 1,
    search: '',
    status: '',
};

const blankRepresentativeListFilters = {
    company_id: '',
    page: 1,
    search: '',
    status: '',
};

const blankWarehouseListFilters = {
    page: 1,
    search: '',
    status: '',
};

const blankReceivingListFilters = {
    company_id: '',
    page: 1,
    payment_status: '',
    search: '',
    status: '',
    warehouse_id: '',
};

const blankInventoryListFilters = {
    company_id: '',
    page: 1,
    search: '',
    status: '',
    warehouse_id: '',
};

const blankReceivableListFilters = {
    aging: '',
    company_id: '',
    page: 1,
    search: '',
    status: '',
};

const blankPayableListFilters = {
    company_id: '',
    page: 1,
    search: '',
    status: '',
};

const blankInventoryDetailFilters = {
    page: 1,
    search: '',
    status: '',
    warehouse_id: '',
};

function buildProductListEndpoint(filters) {
    const params = new URLSearchParams({
        page: String(filters.page || 1),
        per_page: '15',
    });

    if (filters.search) {
        params.set('search', filters.search);
    }

    if (filters.status) {
        params.set('status', filters.status);
    }

    if (filters.company_id) {
        params.set('company_id', filters.company_id);
    }

    return `/office/products?${params.toString()}`;
}

function buildPharmacyListEndpoint(filters) {
    const params = new URLSearchParams({
        page: String(filters.page || 1),
        per_page: '15',
    });

    if (filters.search) {
        params.set('search', filters.search);
    }

    if (filters.status) {
        params.set('status', filters.status);
    }

    return `/office/customers?${params.toString()}`;
}

function buildRepresentativeListEndpoint(filters) {
    const params = new URLSearchParams({
        page: String(filters.page || 1),
        per_page: '15',
    });

    if (filters.search) {
        params.set('search', filters.search);
    }

    if (filters.status) {
        params.set('status', filters.status);
    }

    if (filters.company_id) {
        params.set('company_id', filters.company_id);
    }

    return `/office/sales-representatives?${params.toString()}`;
}

function buildWarehouseListEndpoint(filters) {
    const params = new URLSearchParams({
        page: String(filters.page || 1),
        per_page: '15',
    });

    if (filters.search) {
        params.set('search', filters.search);
    }

    if (filters.status) {
        params.set('status', filters.status);
    }

    return `/office/warehouses?${params.toString()}`;
}

function buildReceivingListEndpoint(filters) {
    const params = new URLSearchParams({
        page: String(filters.page || 1),
        per_page: '15',
    });

    if (filters.search) {
        params.set('search', filters.search);
    }

    if (filters.company_id) {
        params.set('company_id', filters.company_id);
    }

    if (filters.warehouse_id) {
        params.set('warehouse_id', filters.warehouse_id);
    }

    if (filters.status) {
        params.set('status', filters.status);
    }

    if (filters.payment_status) {
        params.set('payment_status', filters.payment_status);
    }

    return `/office/stock-receipts?${params.toString()}`;
}

function buildInventoryListEndpoint(filters) {
    const params = new URLSearchParams({
        page: String(filters.page || 1),
        per_page: '15',
    });

    if (filters.search) {
        params.set('search', filters.search);
    }

    if (filters.company_id) {
        params.set('company_id', filters.company_id);
    }

    if (filters.warehouse_id) {
        params.set('warehouse_id', filters.warehouse_id);
    }

    if (filters.status) {
        params.set('status', filters.status);
    }

    return `/office/stock/current?${params.toString()}`;
}

function buildReceivableListEndpoint(filters) {
    const params = new URLSearchParams({
        page: String(filters.page || 1),
        per_page: '15',
    });

    if (filters.search) {
        params.set('search', filters.search);
    }

    if (filters.company_id) {
        params.set('company_id', filters.company_id);
    }

    if (filters.status) {
        params.set('status', filters.status);
    }

    if (filters.aging) {
        params.set('aging', filters.aging);
    }

    return `/office/receivables?${params.toString()}`;
}

function buildPayableListEndpoint(filters) {
    const params = new URLSearchParams({
        page: String(filters.page || 1),
        per_page: '15',
    });

    if (filters.search) {
        params.set('search', filters.search);
    }

    if (filters.company_id) {
        params.set('company_id', filters.company_id);
    }

    if (filters.status) {
        params.set('status', filters.status);
    }

    return `/office/payables?${params.toString()}`;
}

function buildOrderListEndpoint(orderId = '') {
    const params = new URLSearchParams({
        per_page: '25',
    });

    if (orderId) {
        params.set('order_id', orderId);
    }

    return `/office/orders?${params.toString()}`;
}

function buildInventoryDetailEndpoint(productId, filters) {
    if (!productId) {
        return '';
    }

    const params = new URLSearchParams({
        page: String(filters.page || 1),
        per_page: '15',
    });

    if (filters.search) {
        params.set('search', filters.search);
    }

    if (filters.warehouse_id) {
        params.set('warehouse_id', filters.warehouse_id);
    }

    if (filters.status) {
        params.set('status', filters.status);
    }

    return `/office/stock/products/${productId}/batches?${params.toString()}`;
}

export default function OfficeModulePage({ onNavigate, pageKey }) {
    const isCompaniesPage = pageKey === 'companies';
    const isInvoicesPage = pageKey === 'invoices';
    const isInventoryPage = pageKey === 'inventory';
    const isInventoryDetailPage = pageKey === 'inventory-detail';
    const isStockWorkspacePage = isInventoryPage || isInventoryDetailPage;
    const isPharmaciesPage = pageKey === 'pharmacies';
    const isProductCategoriesPage = pageKey === 'product-categories';
    const isProductsPage = pageKey === 'products';
    const isPayablesPage = pageKey === 'payables';
    const isReceivingPage = pageKey === 'receiving';
    const isReceivablesPage = pageKey === 'receivables';
    const isOrdersPage = pageKey === 'orders';
    const isFinancePage = isReceivablesPage || isPayablesPage;
    const isRepresentativesPage = pageKey === 'representatives';
    const isUnitsPage = pageKey === 'units';
    const isWarehousesPage = pageKey === 'warehouses';
    const [pharmacyListFilters, setPharmacyListFilters] = useState(blankPharmacyListFilters);
    const [productListFilters, setProductListFilters] = useState(blankProductListFilters);
    const routeSearchParams = new URLSearchParams(window.location.search);
    const selectedOrderId = routeSearchParams.get('order_id') || '';
    const inventoryDetailProductId = routeSearchParams.get('product_id') || '';
    const inventoryDetailCompanyId = routeSearchParams.get('company_id') || '';
    const inventoryDetailWarehouseId = routeSearchParams.get('warehouse_id') || '';
    const [inventoryListFilters, setInventoryListFilters] = useState(blankInventoryListFilters);
    const [receivableListFilters, setReceivableListFilters] = useState(blankReceivableListFilters);
    const [payableListFilters, setPayableListFilters] = useState(blankPayableListFilters);
    const [inventoryDetailFilters, setInventoryDetailFilters] = useState({
        ...blankInventoryDetailFilters,
        warehouse_id: inventoryDetailWarehouseId,
    });
    const [receivingListFilters, setReceivingListFilters] = useState(blankReceivingListFilters);
    const [representativeListFilters, setRepresentativeListFilters] = useState(blankRepresentativeListFilters);
    const [warehouseListFilters, setWarehouseListFilters] = useState(blankWarehouseListFilters);
    const baseScreen = officeModules[pageKey] || officeModules.companies;
    const liveEndpoint = isProductsPage
        ? buildProductListEndpoint(productListFilters)
        : isPharmaciesPage
            ? buildPharmacyListEndpoint(pharmacyListFilters)
            : isRepresentativesPage
                ? buildRepresentativeListEndpoint(representativeListFilters)
                : isWarehousesPage
                    ? buildWarehouseListEndpoint(warehouseListFilters)
                    : isReceivingPage
                        ? buildReceivingListEndpoint(receivingListFilters)
                        : isInventoryPage
                            ? buildInventoryListEndpoint(inventoryListFilters)
                            : isInventoryDetailPage
                                ? buildInventoryDetailEndpoint(inventoryDetailProductId, inventoryDetailFilters)
                                : isReceivablesPage
                                    ? buildReceivableListEndpoint(receivableListFilters)
                                        : isPayablesPage
                                            ? buildPayableListEndpoint(payableListFilters)
                                            : isOrdersPage
                                                ? buildOrderListEndpoint(selectedOrderId)
                                                : getOfficeEndpoint(pageKey);
    const liveResource = useApiResource(liveEndpoint);
    const productCompaniesResource = useApiResource(isProductsPage || isPharmaciesPage || isReceivingPage || isStockWorkspacePage || isFinancePage || isOrdersPage ? '/lookups/companies' : isRepresentativesPage ? '/office/companies?per_page=100' : '');
    const productCategoriesResource = useApiResource(isProductsPage ? '/lookups/product-categories' : '');
    const productUnitsResource = useApiResource(isProductsPage ? '/lookups/units' : '');
    const receivingWarehousesResource = useApiResource(isReceivingPage || isStockWorkspacePage ? '/office/warehouses?per_page=100' : '');
    const liveRows = liveResource.data ? mapOfficeRows(pageKey, liveResource.data) : [];
    const visibleLiveRows = isInvoicesPage ? mergeGeneratedInvoiceRows(liveRows) : liveRows;
    const hasRowsToDisplay = Boolean(liveResource.data) || (isInvoicesPage && visibleLiveRows.length > 0);
    const liveScreen = liveEndpoint ? applyLiveRows(baseScreen, visibleLiveRows, hasRowsToDisplay) : baseScreen;
    const inventoryDetailProduct = liveResource.data?.product;
    const inventoryDetailProductName = inventoryDetailProduct?.name || routeSearchParams.get('product_name') || window.sessionStorage.getItem('selected_inventory_product_name') || '';
    const inventoryDetailSummary = liveResource.data?.summary;
    const inventoryDetailUnit = inventoryDetailProduct?.base_unit?.abbreviation || inventoryDetailProduct?.base_unit?.name || 'base units';
    const financeSummary = liveResource.data?.summary;
    const screen = isFinancePage ? {
        ...liveScreen,
        summaries: financeSummary ? [
            {
                label: isReceivablesPage ? 'Open invoices' : 'Open payables',
                value: formatAmount(financeSummary.invoice_count || financeSummary.payable_count || 0),
                note: 'Filtered records',
            },
            {
                label: isReceivablesPage ? 'Receivable balance' : 'Payable balance',
                value: formatAmount(financeSummary.receivable_amount || financeSummary.payable_amount || 0),
                note: 'Outstanding amount',
            },
            {
                label: 'Overdue balance',
                value: formatAmount(financeSummary.overdue_amount || 0),
                note: 'Past due date',
            },
        ] : null,
    } : isReceivingPage || isStockWorkspacePage ? {
        ...liveScreen,
        ...(isInventoryDetailPage ? {
            title: inventoryDetailProductName ? `Inventory Detail - ${inventoryDetailProductName}` : liveScreen.title,
            description: inventoryDetailProduct?.sku
                ? `Batch-level stock for SKU ${inventoryDetailProduct.sku}. Filter by warehouse to trace where each batch is stored.`
                : liveScreen.description,
        } : {}),
        summaries: isInventoryDetailPage && inventoryDetailSummary ? [
            { label: 'Batches', value: formatAmount(inventoryDetailSummary.batch_count), note: 'Received batch rows' },
            { label: 'Available', value: `${formatAmount(inventoryDetailSummary.available_base_quantity)} ${inventoryDetailUnit}`, note: 'Ready to sell' },
            { label: 'Reserved', value: `${formatAmount(inventoryDetailSummary.reserved_base_quantity)} ${inventoryDetailUnit}`, note: 'Held by orders' },
            { label: 'Nearest expiry', value: inventoryDetailSummary.nearest_expiry_date || '-', note: 'Earliest batch date' },
        ] : null,
    } : liveScreen;
    const showFilterToolbar = isStockWorkspacePage || isProductsPage || isPharmaciesPage || isReceivingPage || isRepresentativesPage || isWarehousesPage || isFinancePage || screen.showFilterToolbar !== false;
    const showViewAction = !isStockWorkspacePage && screen.showViewAction !== false;
    const showEditAction = !isStockWorkspacePage && screen.showEditAction !== false;
    const isManagedCrudPage = isCompaniesPage || isPharmaciesPage || isProductCategoriesPage || isProductsPage || isReceivingPage || isRepresentativesPage || isUnitsPage || isWarehousesPage;
    const recordLabel = getRecordLabel(screen);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [modalScreenKey, setModalScreenKey] = useState(null);
    const [modalTitleOverride, setModalTitleOverride] = useState('');
    const [modalSubmitLabelOverride, setModalSubmitLabelOverride] = useState('');
    const [confirmAction, setConfirmAction] = useState(null);
    const [selectedRecord, setSelectedRecord] = useState(screen.rows[0]);
    const [openedLinkedOrderId, setOpenedLinkedOrderId] = useState('');
    const [selectedOrderCompany, setSelectedOrderCompany] = useState('');
    const [companyForm, setCompanyForm] = useState(blankCompanyForm);
    const [companyError, setCompanyError] = useState('');
    const [companySubmitting, setCompanySubmitting] = useState(false);
    const [pharmacyForm, setPharmacyForm] = useState(blankPharmacyForm);
    const [pharmacyError, setPharmacyError] = useState('');
    const [pharmacySubmitting, setPharmacySubmitting] = useState(false);
    const [productCategoryForm, setProductCategoryForm] = useState(blankProductCategoryForm);
    const [productCategoryError, setProductCategoryError] = useState('');
    const [productCategorySubmitting, setProductCategorySubmitting] = useState(false);
    const [unitForm, setUnitForm] = useState(blankUnitForm);
    const [unitError, setUnitError] = useState('');
    const [unitSubmitting, setUnitSubmitting] = useState(false);
    const [warehouseForm, setWarehouseForm] = useState(blankWarehouseForm);
    const [warehouseError, setWarehouseError] = useState('');
    const [warehouseSubmitting, setWarehouseSubmitting] = useState(false);
    const [salesRepresentativeForm, setSalesRepresentativeForm] = useState(blankSalesRepresentativeForm);
    const [salesRepresentativeError, setSalesRepresentativeError] = useState('');
    const [salesRepresentativeSubmitting, setSalesRepresentativeSubmitting] = useState(false);
    const [productForm, setProductForm] = useState(blankProductForm);
    const [productError, setProductError] = useState('');
    const [productSubmitting, setProductSubmitting] = useState(false);
    const [stockReceiptForm, setStockReceiptForm] = useState(blankStockReceiptForm);
    const [stockReceiptError, setStockReceiptError] = useState('');
    const [stockReceiptSubmitting, setStockReceiptSubmitting] = useState(false);
    const [stockAdjustmentForm, setStockAdjustmentForm] = useState(blankStockAdjustmentForm);
    const [stockAdjustmentError, setStockAdjustmentError] = useState('');
    const [stockAdjustmentSubmitting, setStockAdjustmentSubmitting] = useState(false);
    const [customerPaymentForm, setCustomerPaymentForm] = useState(blankCustomerPaymentForm);
    const [customerPaymentError, setCustomerPaymentError] = useState('');
    const [customerPaymentSubmitting, setCustomerPaymentSubmitting] = useState(false);
    const [companyPaymentForm, setCompanyPaymentForm] = useState(blankCompanyPaymentForm);
    const [companyPaymentError, setCompanyPaymentError] = useState('');
    const [companyPaymentSubmitting, setCompanyPaymentSubmitting] = useState(false);
    const [officeOrderForm, setOfficeOrderForm] = useState(blankOfficeOrderForm);
    const [officeOrderLines, setOfficeOrderLines] = useState([{ ...blankOfficeOrderLine }]);
    const [officeOrderError, setOfficeOrderError] = useState('');
    const [officeOrderModalOpen, setOfficeOrderModalOpen] = useState(false);
    const [officeOrderSubmitting, setOfficeOrderSubmitting] = useState(false);
    const receivingProductsResource = useApiResource(isReceivingPage && modalOpen && stockReceiptForm.company_id ? `/lookups/products?company_id=${stockReceiptForm.company_id}` : '');
    const stockAdjustmentProductsResource = useApiResource(isStockWorkspacePage && modalOpen && stockAdjustmentForm.company_id ? `/lookups/products?company_id=${stockAdjustmentForm.company_id}` : '');
    const officeOrderCustomersResource = useApiResource(officeOrderModalOpen ? '/lookups/customers' : '');
    const officeOrderRepresentativesResource = useApiResource(officeOrderModalOpen && officeOrderForm.company_id ? `/lookups/sales-representatives?company_id=${officeOrderForm.company_id}` : '');
    const officeOrderProductsResource = useApiResource(officeOrderModalOpen && officeOrderForm.company_id ? `/lookups/products?company_id=${officeOrderForm.company_id}` : '');
    const modalScreen = modalScreenKey ? officeModules[modalScreenKey] : screen;
    const modalContext = (modalScreenKey || modalTitleOverride) ? getRecordTitle(selectedRecord, '') : '';
    const modalTitle = `${modalTitleOverride || `${modalScreen.primaryAction} Form`}${modalContext ? ` - ${modalContext}` : ''}`;
    const modalSubmitLabel = modalSubmitLabelOverride || modalScreen.submitAction || modalScreen.primaryAction || `Save ${getRecordLabel(modalScreen)}`;
    const isOrderCreateModal = modalScreenKey === 'orders';
    const productLookupsLoading = isProductsPage && !modalScreenKey && (
        productCompaniesResource.loading
        || productCategoriesResource.loading
        || productUnitsResource.loading
    );
    const modalBusy = companyPaymentSubmitting || companySubmitting || customerPaymentSubmitting || officeOrderSubmitting || pharmacySubmitting || productCategorySubmitting || productSubmitting || salesRepresentativeSubmitting || stockAdjustmentSubmitting || stockReceiptSubmitting || unitSubmitting || warehouseSubmitting;
    const orderCreditStatuses = normalizeCreditStatuses(selectedRecord?.creditStatuses || modalScreen.creditStatuses || []);
    const selectedCreditStatus = getCompanyCreditStatus(orderCreditStatuses, selectedOrderCompany);
    const orderCreateBlocked = isOrderCreateModal && isBlockedCredit(selectedCreditStatus?.status);
    useEffect(() => {
        if (!isInventoryDetailPage) {
            return;
        }

        setInventoryDetailFilters({
            ...blankInventoryDetailFilters,
            warehouse_id: inventoryDetailWarehouseId,
        });
    }, [inventoryDetailProductId, inventoryDetailWarehouseId, isInventoryDetailPage]);
    const primaryAction = {
        label: screen.primaryAction,
        target: screen.primaryActionTarget,
    };
    const pharmacyPagination = isPharmaciesPage && liveResource.data ? {
        currentPage: Number(liveResource.data.current_page || 1),
        from: Number(liveResource.data.from || 0),
        lastPage: Number(liveResource.data.last_page || 1),
        perPage: Number(liveResource.data.per_page || 15),
        to: Number(liveResource.data.to || 0),
        total: Number(liveResource.data.total || 0),
    } : null;
    const pharmacyListFilterControls = [
        {
            key: 'status',
            label: 'Status',
            options: [
                { label: 'Active', value: 'active' },
                { label: 'Inactive', value: 'inactive' },
            ],
            placeholder: 'All statuses',
            value: pharmacyListFilters.status,
        },
    ];
    const updatePharmacyListSearch = (value) => {
        setPharmacyListFilters((current) => ({ ...current, page: 1, search: value }));
    };
    const updatePharmacyListFilter = (key, value) => {
        setPharmacyListFilters((current) => ({ ...current, [key]: value, page: 1 }));
    };
    const resetPharmacyListFilters = () => {
        setPharmacyListFilters(blankPharmacyListFilters);
    };
    const goToPharmacyPage = (page) => {
        setPharmacyListFilters((current) => ({ ...current, page: Math.max(1, page) }));
    };
    const productCompanies = unwrapCollection(productCompaniesResource.data);
    const receivingWarehouses = unwrapCollection(receivingWarehousesResource.data);
    const receivingProducts = unwrapCollection(receivingProductsResource.data);
    const stockAdjustmentProducts = unwrapCollection(stockAdjustmentProductsResource.data);
    const officeOrderCustomers = unwrapCollection(officeOrderCustomersResource.data);
    const officeOrderProducts = unwrapCollection(officeOrderProductsResource.data);
    const officeOrderRepresentatives = unwrapCollection(officeOrderRepresentativesResource.data);
    const officeOrderSelectedCustomer = officeOrderCustomers.find((customer) => String(customer.id) === String(officeOrderForm.customer_id));
    const officeOrderSelectedCredit = officeOrderSelectedCustomer?.credit_statuses?.find((credit) => String(credit.company_id) === String(officeOrderForm.company_id));
    const officeOrderLockedCustomer = officeOrderModalOpen ? selectedRecord : null;
    const officeOrderLockedCredit = officeOrderLockedCustomer?.creditStatuses?.find((credit) => String(credit.company_id) === String(officeOrderForm.company_id));
    const officeOrderBlocked = officeOrderModalOpen && isBlockedCredit(titleCase(officeOrderSelectedCredit?.credit_status || officeOrderLockedCredit?.credit_status || 'ready'));
    const receivingPagination = isReceivingPage && liveResource.data ? {
        currentPage: Number(liveResource.data.current_page || 1),
        from: Number(liveResource.data.from || 0),
        lastPage: Number(liveResource.data.last_page || 1),
        perPage: Number(liveResource.data.per_page || 15),
        to: Number(liveResource.data.to || 0),
        total: Number(liveResource.data.total || 0),
    } : null;
    const inventoryPagination = isInventoryPage && liveResource.data ? {
        currentPage: Number(liveResource.data.current_page || 1),
        from: Number(liveResource.data.from || 0),
        lastPage: Number(liveResource.data.last_page || 1),
        perPage: Number(liveResource.data.per_page || 15),
        to: Number(liveResource.data.to || 0),
        total: Number(liveResource.data.total || 0),
    } : null;
    const inventoryDetailPagination = isInventoryDetailPage && liveResource.data ? {
        currentPage: Number(liveResource.data.current_page || 1),
        from: Number(liveResource.data.from || 0),
        lastPage: Number(liveResource.data.last_page || 1),
        perPage: Number(liveResource.data.per_page || 15),
        to: Number(liveResource.data.to || 0),
        total: Number(liveResource.data.total || 0),
    } : null;
    const receivablePagination = isReceivablesPage && liveResource.data ? {
        currentPage: Number(liveResource.data.current_page || 1),
        from: Number(liveResource.data.from || 0),
        lastPage: Number(liveResource.data.last_page || 1),
        perPage: Number(liveResource.data.per_page || 15),
        to: Number(liveResource.data.to || 0),
        total: Number(liveResource.data.total || 0),
    } : null;
    const payablePagination = isPayablesPage && liveResource.data ? {
        currentPage: Number(liveResource.data.current_page || 1),
        from: Number(liveResource.data.from || 0),
        lastPage: Number(liveResource.data.last_page || 1),
        perPage: Number(liveResource.data.per_page || 15),
        to: Number(liveResource.data.to || 0),
        total: Number(liveResource.data.total || 0),
    } : null;
    const receivingListFilterControls = [
        {
            key: 'company_id',
            label: 'Company',
            options: productCompanies.map((company) => ({ label: company.name, value: String(company.id) })),
            placeholder: productCompaniesResource.loading ? 'Loading companies' : 'All companies',
            value: receivingListFilters.company_id,
        },
        {
            key: 'warehouse_id',
            label: 'Warehouse',
            options: receivingWarehouses.map((warehouse) => ({ label: warehouse.name, value: String(warehouse.id) })),
            placeholder: receivingWarehousesResource.loading ? 'Loading warehouses' : 'All warehouses',
            value: receivingListFilters.warehouse_id,
        },
        {
            key: 'payment_status',
            label: 'Payment',
            options: [
                { label: 'Paid', value: 'paid' },
                { label: 'Partial', value: 'partial' },
                { label: 'Unpaid', value: 'unpaid' },
                { label: 'Overdue', value: 'overdue' },
            ],
            placeholder: 'All payments',
            value: receivingListFilters.payment_status,
        },
        {
            key: 'status',
            label: 'Status',
            options: [
                { label: 'Posted', value: 'posted' },
                { label: 'Draft', value: 'draft' },
                { label: 'Cancelled', value: 'cancelled' },
            ],
            placeholder: 'All statuses',
            value: receivingListFilters.status,
        },
    ];
    const updateReceivingListSearch = (value) => {
        setReceivingListFilters((current) => ({ ...current, page: 1, search: value }));
    };
    const updateReceivingListFilter = (key, value) => {
        setReceivingListFilters((current) => ({ ...current, [key]: value, page: 1 }));
    };
    const resetReceivingListFilters = () => {
        setReceivingListFilters(blankReceivingListFilters);
    };
    const goToReceivingPage = (page) => {
        setReceivingListFilters((current) => ({ ...current, page: Math.max(1, page) }));
    };
    const inventoryListFilterControls = [
        {
            key: 'company_id',
            label: 'Company',
            options: productCompanies.map((company) => ({ label: company.name, value: String(company.id) })),
            placeholder: productCompaniesResource.loading ? 'Loading companies' : 'All companies',
            value: inventoryListFilters.company_id,
        },
        {
            key: 'warehouse_id',
            label: 'Warehouse',
            options: receivingWarehouses.map((warehouse) => ({ label: warehouse.name, value: String(warehouse.id) })),
            placeholder: receivingWarehousesResource.loading ? 'Loading warehouses' : 'All warehouses',
            value: inventoryListFilters.warehouse_id,
        },
        {
            key: 'status',
            label: 'Stock status',
            options: [
                { label: 'Available', value: 'available' },
                { label: 'Low stock', value: 'low_stock' },
                { label: 'Near expiry', value: 'near_expiry' },
                { label: 'Expired', value: 'expired' },
            ],
            placeholder: 'All stock statuses',
            value: inventoryListFilters.status,
        },
    ];
    const updateInventoryListSearch = (value) => {
        setInventoryListFilters((current) => ({ ...current, page: 1, search: value }));
    };
    const updateInventoryListFilter = (key, value) => {
        setInventoryListFilters((current) => ({ ...current, [key]: value, page: 1 }));
    };
    const resetInventoryListFilters = () => {
        setInventoryListFilters(blankInventoryListFilters);
    };
    const goToInventoryPage = (page) => {
        setInventoryListFilters((current) => ({ ...current, page: Math.max(1, page) }));
    };
    const inventoryDetailFilterControls = [
        {
            key: 'warehouse_id',
            label: 'Warehouse',
            options: receivingWarehouses.map((warehouse) => ({ label: warehouse.name, value: String(warehouse.id) })),
            placeholder: receivingWarehousesResource.loading ? 'Loading warehouses' : 'All warehouses',
            value: inventoryDetailFilters.warehouse_id,
        },
        {
            key: 'status',
            label: 'Batch status',
            options: [
                { label: 'Available', value: 'available' },
                { label: 'Reserved', value: 'reserved' },
                { label: 'Sold', value: 'sold' },
                { label: 'Damaged', value: 'damaged' },
                { label: 'Near expiry', value: 'near_expiry' },
                { label: 'Expired', value: 'expired' },
            ],
            placeholder: 'All batch statuses',
            value: inventoryDetailFilters.status,
        },
    ];
    const updateInventoryDetailSearch = (value) => {
        setInventoryDetailFilters((current) => ({ ...current, page: 1, search: value }));
    };
    const updateInventoryDetailFilter = (key, value) => {
        setInventoryDetailFilters((current) => ({ ...current, [key]: value, page: 1 }));
    };
    const resetInventoryDetailFilters = () => {
        setInventoryDetailFilters(blankInventoryDetailFilters);
    };
    const goToInventoryDetailPage = (page) => {
        setInventoryDetailFilters((current) => ({ ...current, page: Math.max(1, page) }));
    };
    const receivableListFilterControls = [
        {
            key: 'company_id',
            label: 'Company',
            options: productCompanies.map((company) => ({ label: company.name, value: String(company.id) })),
            placeholder: productCompaniesResource.loading ? 'Loading companies' : 'All companies',
            value: receivableListFilters.company_id,
        },
        {
            key: 'status',
            label: 'Invoice status',
            options: [
                { label: 'Issued', value: 'issued' },
                { label: 'Partial', value: 'partial' },
                { label: 'Overdue', value: 'overdue' },
            ],
            placeholder: 'All statuses',
            value: receivableListFilters.status,
        },
        {
            key: 'aging',
            label: 'Aging',
            options: [
                { label: 'Due soon', value: 'due_soon' },
                { label: 'Overdue', value: 'overdue' },
            ],
            placeholder: 'All aging',
            value: receivableListFilters.aging,
        },
    ];
    const updateReceivableListSearch = (value) => {
        setReceivableListFilters((current) => ({ ...current, page: 1, search: value }));
    };
    const updateReceivableListFilter = (key, value) => {
        setReceivableListFilters((current) => ({ ...current, [key]: value, page: 1 }));
    };
    const resetReceivableListFilters = () => {
        setReceivableListFilters(blankReceivableListFilters);
    };
    const goToReceivablePage = (page) => {
        setReceivableListFilters((current) => ({ ...current, page: Math.max(1, page) }));
    };
    const payableListFilterControls = [
        {
            key: 'company_id',
            label: 'Company',
            options: productCompanies.map((company) => ({ label: company.name, value: String(company.id) })),
            placeholder: productCompaniesResource.loading ? 'Loading companies' : 'All companies',
            value: payableListFilters.company_id,
        },
        {
            key: 'status',
            label: 'Payable status',
            options: [
                { label: 'Unpaid', value: 'unpaid' },
                { label: 'Partial', value: 'partial' },
                { label: 'Paid', value: 'paid' },
                { label: 'Overdue', value: 'overdue' },
            ],
            placeholder: 'All statuses',
            value: payableListFilters.status,
        },
    ];
    const updatePayableListSearch = (value) => {
        setPayableListFilters((current) => ({ ...current, page: 1, search: value }));
    };
    const updatePayableListFilter = (key, value) => {
        setPayableListFilters((current) => ({ ...current, [key]: value, page: 1 }));
    };
    const resetPayableListFilters = () => {
        setPayableListFilters(blankPayableListFilters);
    };
    const goToPayablePage = (page) => {
        setPayableListFilters((current) => ({ ...current, page: Math.max(1, page) }));
    };
    const representativePagination = isRepresentativesPage && liveResource.data ? {
        currentPage: Number(liveResource.data.current_page || 1),
        from: Number(liveResource.data.from || 0),
        lastPage: Number(liveResource.data.last_page || 1),
        perPage: Number(liveResource.data.per_page || 15),
        to: Number(liveResource.data.to || 0),
        total: Number(liveResource.data.total || 0),
    } : null;
    const representativeListFilterControls = [
        {
            key: 'company_id',
            label: 'Assigned company',
            options: productCompanies.map((company) => ({ label: company.name, value: String(company.id) })),
            placeholder: productCompaniesResource.loading ? 'Loading companies' : 'All companies',
            value: representativeListFilters.company_id,
        },
        {
            key: 'status',
            label: 'Status',
            options: [
                { label: 'Active', value: 'active' },
                { label: 'Inactive', value: 'inactive' },
            ],
            placeholder: 'All statuses',
            value: representativeListFilters.status,
        },
    ];
    const updateRepresentativeListSearch = (value) => {
        setRepresentativeListFilters((current) => ({ ...current, page: 1, search: value }));
    };
    const updateRepresentativeListFilter = (key, value) => {
        setRepresentativeListFilters((current) => ({ ...current, [key]: value, page: 1 }));
    };
    const resetRepresentativeListFilters = () => {
        setRepresentativeListFilters(blankRepresentativeListFilters);
    };
    const goToRepresentativePage = (page) => {
        setRepresentativeListFilters((current) => ({ ...current, page: Math.max(1, page) }));
    };
    const warehousePagination = isWarehousesPage && liveResource.data ? {
        currentPage: Number(liveResource.data.current_page || 1),
        from: Number(liveResource.data.from || 0),
        lastPage: Number(liveResource.data.last_page || 1),
        perPage: Number(liveResource.data.per_page || 15),
        to: Number(liveResource.data.to || 0),
        total: Number(liveResource.data.total || 0),
    } : null;
    const warehouseListFilterControls = [
        {
            key: 'status',
            label: 'Status',
            options: [
                { label: 'Active', value: 'active' },
                { label: 'Inactive', value: 'inactive' },
            ],
            placeholder: 'All statuses',
            value: warehouseListFilters.status,
        },
    ];
    const updateWarehouseListSearch = (value) => {
        setWarehouseListFilters((current) => ({ ...current, page: 1, search: value }));
    };
    const updateWarehouseListFilter = (key, value) => {
        setWarehouseListFilters((current) => ({ ...current, [key]: value, page: 1 }));
    };
    const resetWarehouseListFilters = () => {
        setWarehouseListFilters(blankWarehouseListFilters);
    };
    const goToWarehousePage = (page) => {
        setWarehouseListFilters((current) => ({ ...current, page: Math.max(1, page) }));
    };
    const productPagination = isProductsPage && liveResource.data ? {
        currentPage: Number(liveResource.data.current_page || 1),
        from: Number(liveResource.data.from || 0),
        lastPage: Number(liveResource.data.last_page || 1),
        perPage: Number(liveResource.data.per_page || 15),
        to: Number(liveResource.data.to || 0),
        total: Number(liveResource.data.total || 0),
    } : null;
    const productListFilterControls = [
        {
            key: 'status',
            label: 'Status',
            options: [
                { label: 'Active', value: 'active' },
                { label: 'Inactive', value: 'inactive' },
                { label: 'Discontinued', value: 'discontinued' },
            ],
            placeholder: 'All statuses',
            value: productListFilters.status,
        },
        {
            key: 'company_id',
            label: 'Company',
            options: productCompanies.map((company) => ({ label: company.name, value: String(company.id) })),
            placeholder: productCompaniesResource.loading ? 'Loading companies' : 'All companies',
            value: productListFilters.company_id,
        },
    ];
    const updateProductListSearch = (value) => {
        setProductListFilters((current) => ({ ...current, page: 1, search: value }));
    };
    const updateProductListFilter = (key, value) => {
        setProductListFilters((current) => ({ ...current, [key]: value, page: 1 }));
    };
    const resetProductListFilters = () => {
        setProductListFilters(blankProductListFilters);
    };
    const goToProductPage = (page) => {
        setProductListFilters((current) => ({ ...current, page: Math.max(1, page) }));
    };

    useEffect(() => {
        if (!modalOpen || modalScreenKey !== 'orders') {
            return;
        }

        const statuses = normalizeCreditStatuses(selectedRecord?.creditStatuses || []);
        setSelectedOrderCompany(statuses[0]?.company || '');
    }, [modalOpen, modalScreenKey, selectedRecord]);

    useEffect(() => {
        if (!isStockWorkspacePage || !modalOpen || !stockAdjustmentForm.product_id || stockAdjustmentForm.unit_id) {
            return;
        }

        const product = findReceiptProduct(stockAdjustmentProducts, stockAdjustmentForm.product_id);
        const defaultUnit = product?.product_units?.find((unit) => unit.is_default_sales_unit)
            || product?.product_units?.find((unit) => unit.is_base_unit)
            || product?.product_units?.[0];

        if (defaultUnit?.unit_id) {
            setStockAdjustmentForm((current) => ({
                ...current,
                unit_id: defaultUnit.unit_id,
            }));
        }
    }, [isStockWorkspacePage, modalOpen, stockAdjustmentForm.product_id, stockAdjustmentForm.unit_id, stockAdjustmentProducts]);

    useEffect(() => {
        if (!modalOpen && !drawerOpen && screen.rows.length > 0 && !screen.rows.some((row) => row.id === selectedRecord?.id)) {
            setSelectedRecord(screen.rows[0]);
        }
    }, [drawerOpen, modalOpen, screen.rows, selectedRecord?.id]);
    useEffect(() => {
        if (!isOrdersPage || !selectedOrderId || openedLinkedOrderId === selectedOrderId || !screen.rows.length) {
            return;
        }

        const linkedOrder = screen.rows.find((row) => String(row.id) === String(selectedOrderId));

        if (!linkedOrder) {
            return;
        }

        setSelectedRecord(linkedOrder);
        setDrawerOpen(true);
        setOpenedLinkedOrderId(selectedOrderId);
    }, [isOrdersPage, openedLinkedOrderId, screen.rows, selectedOrderId]);

    const closeWorkflowModal = () => {
        setModalOpen(false);
        setModalScreenKey(null);
        setOfficeOrderModalOpen(false);
        setModalTitleOverride('');
        setModalSubmitLabelOverride('');
        setCompanyError('');
        setPharmacyError('');
        setProductCategoryError('');
        setProductError('');
        setCompanyPaymentError('');
        setCustomerPaymentError('');
        setOfficeOrderError('');
        setSalesRepresentativeError('');
        setStockAdjustmentError('');
        setStockReceiptError('');
        setUnitError('');
        setWarehouseError('');
    };
    const openWorkflowModal = (targetScreenKey, record, options = {}) => {
        setSelectedRecord(record);
        setModalScreenKey(targetScreenKey || null);
        setModalTitleOverride(options.title || '');
        setModalSubmitLabelOverride(options.submitLabel || '');
        setModalOpen(true);
    };
    const openCompanyForm = (record = null) => {
        const nextForm = record ? {
            name: record.name || '',
            code: record.code || '',
            contact_person: record.contact_person || '',
            phone: record.phone || '',
            email: record.email || '',
            address: record.address || '',
            status: String(record.status || 'active').toLowerCase(),
        } : blankCompanyForm;

        setSelectedRecord(record || {});
        setCompanyForm(nextForm);
        setModalScreenKey(null);
        setModalTitleOverride(record ? 'Edit company' : 'Add company');
        setModalSubmitLabelOverride(record ? 'Save company' : 'Add company');
        setCompanyError('');
        setModalOpen(true);
    };
    const updateCompanyForm = (event) => {
        setCompanyForm((current) => ({ ...current, [event.target.name]: event.target.value }));
        setCompanyError('');
    };
    const submitCompanyForm = async () => {
        setCompanySubmitting(true);
        setCompanyError('');

        try {
            if (selectedRecord?.id) {
                await api.put(`/office/companies/${selectedRecord.id}`, companyForm);
            } else {
                await api.post('/office/companies', companyForm);
            }

            liveResource.refresh();
            closeWorkflowModal();
        } catch (requestError) {
            setCompanyError(requestError.message);
        } finally {
            setCompanySubmitting(false);
        }
    };
    const deleteCompany = async (record) => {
        setCompanySubmitting(true);
        setCompanyError('');

        try {
            await api.delete(`/office/companies/${record.id}`);
            liveResource.refresh();
            closeConfirmAction();
        } catch (requestError) {
            setCompanyError(requestError.message);
        } finally {
            setCompanySubmitting(false);
        }
    };
    const openPharmacyForm = (record = null) => {
        const nextForm = record ? {
            name: record.name || '',
            code: record.code || '',
            owner_name: record.owner_name || (record.owner === '-' ? '' : record.owner) || '',
            phone: record.phone_value || (record.phone === '-' ? '' : record.phone) || '',
            email: record.email || '',
            address: record.address || '',
            township: record.township_value || (record.township === '-' ? '' : record.township) || '',
            city: record.city || '',
            region: record.region || '',
            status: String(record.status || '').toLowerCase() === 'inactive' ? 'inactive' : 'active',
        } : blankPharmacyForm;

        setSelectedRecord(record || {});
        setPharmacyForm(nextForm);
        setModalScreenKey(null);
        setModalTitleOverride(record ? 'Edit pharmacy' : 'Add pharmacy');
        setModalSubmitLabelOverride(record ? 'Save pharmacy' : 'Add pharmacy');
        setPharmacyError('');
        setModalOpen(true);
    };
    const updatePharmacyForm = (event) => {
        setPharmacyForm((current) => ({ ...current, [event.target.name]: event.target.value }));
        setPharmacyError('');
    };
    const submitPharmacyForm = async () => {
        setPharmacySubmitting(true);
        setPharmacyError('');

        try {
            if (selectedRecord?.id) {
                await api.put(`/office/customers/${selectedRecord.id}`, pharmacyForm);
            } else {
                await api.post('/office/customers', pharmacyForm);
            }

            liveResource.refresh();
            closeWorkflowModal();
        } catch (requestError) {
            setPharmacyError(requestError.message);
        } finally {
            setPharmacySubmitting(false);
        }
    };
    const deletePharmacy = async (record) => {
        setPharmacySubmitting(true);
        setPharmacyError('');

        try {
            await api.delete(`/office/customers/${record.id}`);
            liveResource.refresh();
            closeConfirmAction();
        } catch (requestError) {
            setPharmacyError(requestError.message);
        } finally {
            setPharmacySubmitting(false);
        }
    };
    const openProductCategoryForm = (record = null) => {
        const nextForm = record ? {
            name: record.name || '',
            code: record.code || '',
            parent_id: record.parent_id || '',
            status: String(record.status || 'active').toLowerCase(),
        } : blankProductCategoryForm;

        setSelectedRecord(record || {});
        setProductCategoryForm(nextForm);
        setModalScreenKey(null);
        setModalTitleOverride(record ? 'Edit product category' : 'Add product category');
        setModalSubmitLabelOverride(record ? 'Save category' : 'Add category');
        setProductCategoryError('');
        setModalOpen(true);
    };
    const updateProductCategoryForm = (event) => {
        setProductCategoryForm((current) => ({ ...current, [event.target.name]: event.target.value }));
        setProductCategoryError('');
    };
    const submitProductCategoryForm = async () => {
        setProductCategorySubmitting(true);
        setProductCategoryError('');

        try {
            if (selectedRecord?.id) {
                await api.put(`/office/product-categories/${selectedRecord.id}`, productCategoryForm);
            } else {
                await api.post('/office/product-categories', productCategoryForm);
            }

            liveResource.refresh();
            closeWorkflowModal();
        } catch (requestError) {
            setProductCategoryError(requestError.message);
        } finally {
            setProductCategorySubmitting(false);
        }
    };
    const deleteProductCategory = async (record) => {
        setProductCategorySubmitting(true);
        setProductCategoryError('');

        try {
            await api.delete(`/office/product-categories/${record.id}`);
            liveResource.refresh();
            closeConfirmAction();
        } catch (requestError) {
            setProductCategoryError(requestError.message);
        } finally {
            setProductCategorySubmitting(false);
        }
    };
    const openUnitForm = (record = null) => {
        const nextForm = record ? {
            name: record.name || '',
            abbreviation: record.abbreviation || (record.shortName === '-' ? '' : record.shortName) || '',
            status: String(record.status || 'active').toLowerCase(),
        } : blankUnitForm;

        setSelectedRecord(record || {});
        setUnitForm(nextForm);
        setModalScreenKey(null);
        setModalTitleOverride(record ? 'Edit unit' : 'Add unit');
        setModalSubmitLabelOverride(record ? 'Save unit' : 'Add unit');
        setUnitError('');
        setModalOpen(true);
    };
    const updateUnitForm = (event) => {
        setUnitForm((current) => ({ ...current, [event.target.name]: event.target.value }));
        setUnitError('');
    };
    const submitUnitForm = async () => {
        setUnitSubmitting(true);
        setUnitError('');

        try {
            if (selectedRecord?.id) {
                await api.put(`/office/units/${selectedRecord.id}`, unitForm);
            } else {
                await api.post('/office/units', unitForm);
            }

            liveResource.refresh();
            closeWorkflowModal();
        } catch (requestError) {
            setUnitError(requestError.message);
        } finally {
            setUnitSubmitting(false);
        }
    };
    const deleteUnit = async (record) => {
        setUnitSubmitting(true);
        setUnitError('');

        try {
            await api.delete(`/office/units/${record.id}`);
            liveResource.refresh();
            closeConfirmAction();
        } catch (requestError) {
            setUnitError(requestError.message);
        } finally {
            setUnitSubmitting(false);
        }
    };
    const openWarehouseForm = (record = null) => {
        const nextForm = record ? {
            name: record.name || '',
            code: record.code || '',
            address: record.address_value || (record.address === '-' ? '' : record.address) || '',
            status: String(record.status || 'active').toLowerCase(),
        } : blankWarehouseForm;

        setSelectedRecord(record || {});
        setWarehouseForm(nextForm);
        setModalScreenKey(null);
        setModalTitleOverride(record ? 'Edit warehouse' : 'Add warehouse');
        setModalSubmitLabelOverride(record ? 'Save warehouse' : 'Add warehouse');
        setWarehouseError('');
        setModalOpen(true);
    };
    const updateWarehouseForm = (event) => {
        setWarehouseForm((current) => ({ ...current, [event.target.name]: event.target.value }));
        setWarehouseError('');
    };
    const submitWarehouseForm = async () => {
        setWarehouseSubmitting(true);
        setWarehouseError('');

        try {
            if (selectedRecord?.id) {
                await api.put(`/office/warehouses/${selectedRecord.id}`, warehouseForm);
            } else {
                await api.post('/office/warehouses', warehouseForm);
            }

            liveResource.refresh();
            closeWorkflowModal();
        } catch (requestError) {
            setWarehouseError(requestError.message);
        } finally {
            setWarehouseSubmitting(false);
        }
    };
    const deleteWarehouse = async (record) => {
        setWarehouseSubmitting(true);
        setWarehouseError('');

        try {
            await api.delete(`/office/warehouses/${record.id}`);
            liveResource.refresh();
            closeConfirmAction();
        } catch (requestError) {
            setWarehouseError(requestError.message);
        } finally {
            setWarehouseSubmitting(false);
        }
    };
    const openSalesRepresentativeForm = (record = null) => {
        const nextForm = record ? {
            name: record.name || '',
            email: record.email || '',
            phone: record.phone_value || (record.phone === '-' ? '' : record.phone) || '',
            employee_code: record.employee_code || '',
            company_id: record.company_id || '',
            region: record.region_value || (record.region === '-' ? '' : record.region) || '',
            joined_at: record.joined_at || '',
            password: '',
            status: String(record.status || 'active').toLowerCase(),
        } : blankSalesRepresentativeForm;

        setSelectedRecord(record || {});
        setSalesRepresentativeForm(nextForm);
        setModalScreenKey(null);
        setModalTitleOverride(record ? 'Edit sales rep' : 'Add sales rep');
        setModalSubmitLabelOverride(record ? 'Save sales rep' : 'Add sales rep');
        setSalesRepresentativeError('');
        setModalOpen(true);
    };
    const updateSalesRepresentativeForm = (event) => {
        setSalesRepresentativeForm((current) => ({ ...current, [event.target.name]: event.target.value }));
        setSalesRepresentativeError('');
    };
    const salesRepresentativePayload = () => Object.entries(salesRepresentativeForm).reduce((payload, [key, value]) => {
        if (key === 'password' && selectedRecord?.id && !value) {
            return payload;
        }

        return {
            ...payload,
            [key]: value,
        };
    }, {});
    const submitSalesRepresentativeForm = async () => {
        setSalesRepresentativeSubmitting(true);
        setSalesRepresentativeError('');

        try {
            if (selectedRecord?.id) {
                await api.put(`/office/sales-representatives/${selectedRecord.id}`, salesRepresentativePayload());
            } else {
                await api.post('/office/sales-representatives', salesRepresentativePayload());
            }

            liveResource.refresh();
            closeWorkflowModal();
        } catch (requestError) {
            setSalesRepresentativeError(requestError.message);
        } finally {
            setSalesRepresentativeSubmitting(false);
        }
    };
    const deleteSalesRepresentative = async (record) => {
        setSalesRepresentativeSubmitting(true);
        setSalesRepresentativeError('');

        try {
            await api.delete(`/office/sales-representatives/${record.id}`);
            liveResource.refresh();
            closeConfirmAction();
        } catch (requestError) {
            setSalesRepresentativeError(requestError.message);
        } finally {
            setSalesRepresentativeSubmitting(false);
        }
    };
    const openProductForm = (record = null) => {
        const recordProductUnits = record?.product_units_raw?.length
            ? record.product_units_raw
            : record?.base_unit_id
                ? [{
                    unit_id: record.base_unit_id,
                    conversion_factor_to_base: 1,
                    selling_price: record.base_unit_selling_price ?? 0,
                    is_default_sales_unit: true,
                    status: 'active',
                }]
                : [];
        const nextForm = record ? {
            company_id: record.company_id || '',
            product_category_id: record.product_category_id || '',
            brand: record.brand_value || record.brand || '',
            base_unit_id: record.base_unit_id || '',
            sku: record.sku || '',
            barcode: record.barcode_value || '',
            name: record.name || '',
            description: record.description || '',
            primary_image_path: record.primary_image_path || '',
            primary_image: null,
            primary_image_preview: record.imageUrl || storageUrl(record.primary_image_path),
            default_discount_percentage: String(record.default_discount_percentage ?? 0),
            commission_rate_percentage: String(record.commission_rate_percentage ?? 0),
            low_stock_threshold_base_units: String(record.low_stock_threshold_base_units ?? 0),
            base_unit_selling_price: String(record.base_unit_selling_price ?? 0),
            product_units: recordProductUnits.map((unit) => ({
                unit_id: unit.unit_id || '',
                conversion_factor_to_base: String(unit.conversion_factor_to_base || 1),
                selling_price: String(unit.selling_price ?? 0),
                is_default_sales_unit: Boolean(unit.is_default_sales_unit),
                status: unit.status || 'active',
            })),
            foc_rule: focRuleFormFromRecord(record),
            status: String(record.status || 'active').toLowerCase(),
        } : { ...blankProductForm, product_units: [], foc_rule: { ...blankFocRuleForm } };

        setSelectedRecord(record || {});
        setProductForm(nextForm);
        setModalScreenKey(null);
        setModalTitleOverride(record ? 'Edit product' : 'Add product');
        setModalSubmitLabelOverride(record ? 'Save product' : 'Add product');
        setProductError('');
        setModalOpen(true);
    };
    const updateProductForm = (event) => {
        const { name, value } = event.target;
        setProductForm((current) => {
            if (name !== 'base_unit_id') {
                return {
                    ...current,
                    [name]: value,
                };
            }

            const existingRows = current.product_units || [];
            const hasBaseRow = existingRows.some((row) => String(row.unit_id) === String(value));
            const productUnits = [
                ...existingRows.map((row) => String(row.unit_id) === String(value)
                    ? { ...row, conversion_factor_to_base: '1', status: 'active' }
                    : row),
                ...(value && !hasBaseRow ? [{
                    unit_id: value,
                    conversion_factor_to_base: '1',
                    selling_price: current.base_unit_selling_price || '0',
                    is_default_sales_unit: !existingRows.some((row) => row.is_default_sales_unit),
                    status: 'active',
                }] : []),
            ];

            return {
                ...current,
                base_unit_id: value,
                product_units: productUnits,
            };
        });
        setProductError('');
    };
    const updateProductImage = (event) => {
        const selectedFile = event.target.files?.[0] || null;
        setProductForm((current) => ({
            ...current,
            primary_image: selectedFile,
            primary_image_preview: selectedFile ? URL.createObjectURL(selectedFile) : storageUrl(current.primary_image_path),
        }));
        setProductError('');
    };
    const addProductUnit = () => {
        setProductForm((current) => ({
            ...current,
            product_units: [
                ...(current.product_units || []),
                {
                    unit_id: '',
                    conversion_factor_to_base: '1',
                    selling_price: '0',
                    is_default_sales_unit: false,
                    status: 'active',
                },
            ],
        }));
        setProductError('');
    };
    const removeProductUnit = (index) => {
        setProductForm((current) => {
            const productUnits = (current.product_units || []).filter((_, rowIndex) => rowIndex !== index);
            const hasDefaultUnit = productUnits.some((row) => row.is_default_sales_unit && row.status === 'active');

            return {
                ...current,
                product_units: hasDefaultUnit || !productUnits.length
                    ? productUnits
                    : productUnits.map((row, rowIndex) => ({ ...row, is_default_sales_unit: rowIndex === 0 })),
            };
        });
        setProductError('');
    };
    const updateProductUnit = (index, event) => {
        const { checked, name, type, value } = event.target;

        setProductForm((current) => {
            const productUnits = (current.product_units || []).map((row, rowIndex) => {
                if (rowIndex !== index) {
                    return name === 'is_default_sales_unit' && checked ? { ...row, is_default_sales_unit: false } : row;
                }

                const nextValue = type === 'checkbox' ? checked : value;
                const nextRow = {
                    ...row,
                    [name]: nextValue,
                };

                if (name === 'unit_id' && String(value) === String(current.base_unit_id)) {
                    nextRow.conversion_factor_to_base = '1';
                    nextRow.status = 'active';
                }

                if (name === 'is_default_sales_unit') {
                    nextRow.is_default_sales_unit = checked;
                }

                return nextRow;
            });
            const changedRow = productUnits[index] || {};

            return {
                ...current,
                base_unit_selling_price: String(changedRow.unit_id) === String(current.base_unit_id)
                    ? String(changedRow.selling_price ?? current.base_unit_selling_price)
                    : current.base_unit_selling_price,
                product_units: productUnits,
            };
        });
        setProductError('');
    };
    const updateProductFocRule = (event) => {
        const { checked, name, type, value } = event.target;

        setProductForm((current) => {
            const currentRule = current.foc_rule || { ...blankFocRuleForm };
            const nextRule = {
                ...currentRule,
                [name]: type === 'checkbox' ? checked : value,
            };

            if (name === 'rule_type') {
                nextRule.minimum_quantity_base_units = value === 'quantity' ? currentRule.minimum_quantity_base_units : '';
                nextRule.minimum_order_value = value === 'value' ? currentRule.minimum_order_value : '';
            }

            if (name === 'enabled' && checked) {
                nextRule.status = nextRule.status || 'active';
                nextRule.rule_type = nextRule.rule_type || 'quantity';
            }

            return {
                ...current,
                foc_rule: nextRule,
            };
        });
        setProductError('');
    };
    const syncProductFocRule = async (savedProduct) => {
        const rule = productForm.foc_rule || blankFocRuleForm;

        if (!rule.enabled) {
            if (rule.id) {
                await api.delete(`/office/foc-rules/${rule.id}`);
            }

            return;
        }

        const payload = {
            company_id: savedProduct.company_id || productForm.company_id,
            product_id: savedProduct.id || selectedRecord?.id,
            rule_type: rule.rule_type || 'quantity',
            minimum_quantity_base_units: rule.rule_type === 'quantity' ? rule.minimum_quantity_base_units : null,
            minimum_order_value: rule.rule_type === 'value' ? rule.minimum_order_value : null,
            reward_quantity_base_units: rule.reward_quantity_base_units,
            starts_at: rule.starts_at || null,
            ends_at: rule.ends_at || null,
            status: rule.status || 'active',
        };

        if (rule.id) {
            await api.put(`/office/foc-rules/${rule.id}`, payload);
            return;
        }

        await api.post('/office/foc-rules', payload);
    };
    const submitProductForm = async () => {
        setProductSubmitting(true);
        setProductError('');

        try {
            const payload = new FormData();
            Object.entries(productForm).forEach(([key, value]) => {
                if (['primary_image', 'primary_image_preview', 'product_units', 'foc_rule'].includes(key)) {
                    return;
                }

                payload.append(key, value ?? '');
            });

            if (productForm.primary_image) {
                payload.append('primary_image', productForm.primary_image);
            }

            payload.append('product_units', JSON.stringify((productForm.product_units || []).map((unit) => ({
                unit_id: unit.unit_id,
                conversion_factor_to_base: unit.conversion_factor_to_base || 1,
                selling_price: unit.selling_price || 0,
                is_default_sales_unit: Boolean(unit.is_default_sales_unit),
                status: unit.status || 'active',
            }))));

            if (selectedRecord?.id) {
                payload.append('_method', 'PUT');
                const updatedProduct = await api.post(`/office/products/${selectedRecord.id}`, payload);
                await syncProductFocRule(updatedProduct);
            } else {
                const createdProduct = await api.post('/office/products', payload);
                await syncProductFocRule(createdProduct);
            }

            liveResource.refresh();
            closeWorkflowModal();
        } catch (requestError) {
            setProductError(requestError.message);
        } finally {
            setProductSubmitting(false);
        }
    };
    const deleteProduct = async (record) => {
        setProductSubmitting(true);
        setProductError('');

        try {
            await api.delete(`/office/products/${record.id}`);
            liveResource.refresh();
            closeConfirmAction();
        } catch (requestError) {
            setProductError(requestError.message);
        } finally {
            setProductSubmitting(false);
        }
    };
    const openStockReceiptForm = (record = null) => {
        const nextForm = record ? {
            company_id: record.company_id || '',
            warehouse_id: record.warehouse_id || '',
            supplier_invoice_no: record.supplier_invoice_no || '',
            received_date: record.received_date || '',
            payable_due_date: record.payable_due_date || '',
            paid_amount: String(record.paid_amount ?? 0),
            items: (record.receipt_items_raw?.length ? record.receipt_items_raw : [{ ...blankStockReceiptItem }]).map((item) => ({
                product_id: item.product_id || '',
                unit_id: item.unit_id || '',
                foc_unit_id: item.foc_unit_id || '',
                quantity: String(item.quantity || 1),
                foc_quantity: String(item.foc_quantity || 0),
                unit_cost: String(item.unit_cost ?? 0),
                batch_no: item.batch_no || '',
                manufactured_date: item.manufactured_date || '',
                expiry_date: item.expiry_date || '',
            })),
        } : { ...blankStockReceiptForm, items: [{ ...blankStockReceiptItem }] };

        setSelectedRecord(record || {});
        setStockReceiptForm(nextForm);
        setModalScreenKey(null);
        setModalTitleOverride(record ? 'Edit receiving' : 'Receive stock');
        setModalSubmitLabelOverride(record ? 'Save receiving' : 'Save receiving');
        setStockReceiptError('');
        setModalOpen(true);
    };
    const updateStockReceiptForm = (event) => {
        const { name, value } = event.target;
        setStockReceiptForm((current) => ({
            ...current,
            [name]: value,
            items: name === 'company_id'
                ? [{ ...blankStockReceiptItem }]
                : name === 'received_date'
                    ? current.items.map((item, itemIndex) => {
                        if (!item.product_id || item.batch_no) {
                            return item;
                        }

                        return {
                            ...item,
                            batch_no: makeReceiptBatchNumber(findReceiptProduct(receivingProducts, item.product_id), value, itemIndex),
                        };
                    })
                    : current.items,
        }));
        setStockReceiptError('');
    };
    const updateStockReceiptItem = (index, event) => {
        const { name, value } = event.target;

        setStockReceiptForm((current) => ({
            ...current,
            items: current.items.map((item, itemIndex) => {
                if (itemIndex !== index) {
                    return item;
                }

                if (name !== 'product_id') {
                    return { ...item, [name]: value };
                }

                const product = findReceiptProduct(receivingProducts, value);
                const defaultUnit = product?.product_units?.find((unit) => unit.is_default_sales_unit)
                    || product?.product_units?.find((unit) => unit.is_base_unit)
                    || product?.product_units?.[0];

                return {
                    ...item,
                    batch_no: item.batch_no || makeReceiptBatchNumber(product, current.received_date, index),
                    product_id: value,
                    unit_id: defaultUnit?.unit_id || '',
                    foc_unit_id: '',
                };
            }),
        }));
        setStockReceiptError('');
    };
    const addStockReceiptItem = () => {
        setStockReceiptForm((current) => ({
            ...current,
            items: [...(current.items || []), { ...blankStockReceiptItem }],
        }));
        setStockReceiptError('');
    };
    const removeStockReceiptItem = (index) => {
        setStockReceiptForm((current) => ({
            ...current,
            items: current.items.length === 1 ? current.items : current.items.filter((_, itemIndex) => itemIndex !== index),
        }));
        setStockReceiptError('');
    };
    const stockReceiptPayload = () => ({
        ...stockReceiptForm,
        warehouse_id: stockReceiptForm.warehouse_id || null,
        items: (stockReceiptForm.items || []).map((item) => ({
            product_id: item.product_id,
            unit_id: item.unit_id,
            quantity: item.quantity || 1,
            foc_quantity: item.foc_quantity || 0,
            foc_unit_id: Number(item.foc_quantity || 0) > 0 ? item.foc_unit_id || item.unit_id || null : null,
            unit_cost: item.unit_cost || 0,
            batch_no: item.batch_no || null,
            manufactured_date: item.manufactured_date || null,
            expiry_date: item.expiry_date || null,
        })),
    });
    const submitStockReceiptForm = async () => {
        setStockReceiptSubmitting(true);
        setStockReceiptError('');

        try {
            if (selectedRecord?.id) {
                await api.put(`/office/stock-receipts/${selectedRecord.id}`, stockReceiptPayload());
            } else {
                await api.post('/office/stock-receipts', stockReceiptPayload());
            }

            liveResource.refresh();
            closeWorkflowModal();
        } catch (requestError) {
            setStockReceiptError(requestError.message);
        } finally {
            setStockReceiptSubmitting(false);
        }
    };
    const deleteStockReceipt = async (record) => {
        setStockReceiptSubmitting(true);
        setStockReceiptError('');

        try {
            await api.delete(`/office/stock-receipts/${record.id}`);
            liveResource.refresh();
            closeConfirmAction();
        } catch (requestError) {
            setStockReceiptError(requestError.message);
        } finally {
            setStockReceiptSubmitting(false);
        }
    };
    const openStockAdjustmentForm = (record = null) => {
        const defaultWarehouseId = record?.warehouse_id
            || (isInventoryDetailPage ? inventoryDetailFilters.warehouse_id : inventoryListFilters.warehouse_id)
            || '';
        const defaultCompanyId = record?.company_id
            || inventoryDetailCompanyId
            || inventoryDetailProduct?.company_id
            || inventoryListFilters.company_id
            || '';
        const defaultProductId = record?.product_id || inventoryDetailProductId || '';
        const defaultProductName = record?.product || inventoryDetailProductName || '';
        const nextForm = {
            ...blankStockAdjustmentForm,
            company_id: defaultCompanyId,
            company_name: record?.company || '',
            warehouse_id: defaultWarehouseId,
            product_id: defaultProductId,
            product_name: defaultProductName,
            product_locked: Boolean(defaultProductId),
        };

        setSelectedRecord(record || {});
        setStockAdjustmentForm(nextForm);
        setModalScreenKey(null);
        setModalTitleOverride('Adjust stock');
        setModalSubmitLabelOverride('Save adjustment');
        setStockAdjustmentError('');
        setModalOpen(true);
    };
    const openInventoryDetail = (record) => {
        if (!record?.product_id) {
            return;
        }

        window.sessionStorage.setItem('selected_inventory_product_name', record.product || '');
        onNavigate?.('inventory-detail', {
            company_id: record.company_id || '',
            product_id: record.product_id,
            product_name: record.product || '',
            ...(inventoryListFilters.warehouse_id ? { warehouse_id: inventoryListFilters.warehouse_id } : {}),
        });
    };
    const openInvoiceOrderDetail = (invoice) => {
        if (!invoice?.sales_order_id) {
            return;
        }

        setDrawerOpen(false);
        onNavigate?.('orders', { order_id: invoice.sales_order_id });
    };
    const updateStockAdjustmentForm = (event) => {
        const { name, value } = event.target;

        setStockAdjustmentForm((current) => {
            if (name === 'company_id') {
                return {
                    ...current,
                    company_id: value,
                    product_id: '',
                    unit_id: '',
                };
            }

            if (name === 'product_id') {
                const product = findReceiptProduct(stockAdjustmentProducts, value);
                const defaultUnit = product?.product_units?.find((unit) => unit.is_default_sales_unit)
                    || product?.product_units?.find((unit) => unit.is_base_unit)
                    || product?.product_units?.[0];

                return {
                    ...current,
                    product_id: value,
                    unit_id: defaultUnit?.unit_id || '',
                };
            }

            if (name === 'adjustment_type' && value !== 'increase') {
                return {
                    ...current,
                    adjustment_type: value,
                    batch_no: '',
                    expiry_date: '',
                };
            }

            return { ...current, [name]: value };
        });
        setStockAdjustmentError('');
    };
    const stockAdjustmentPayload = () => ({
        ...stockAdjustmentForm,
        batch_no: stockAdjustmentForm.adjustment_type === 'increase' ? stockAdjustmentForm.batch_no || null : null,
        expiry_date: stockAdjustmentForm.adjustment_type === 'increase' ? stockAdjustmentForm.expiry_date || null : null,
        reason: stockAdjustmentForm.reason || null,
    });
    const submitStockAdjustmentForm = async () => {
        setStockAdjustmentSubmitting(true);
        setStockAdjustmentError('');

        try {
            await api.post('/office/stock/adjustments', stockAdjustmentPayload());
            liveResource.refresh();
            closeWorkflowModal();
        } catch (requestError) {
            setStockAdjustmentError(requestError.message);
        } finally {
            setStockAdjustmentSubmitting(false);
        }
    };
    const changeProductDefaultSalesUnit = async (unit) => {
        if (!isProductsPage || !selectedRecord?.id || !unit?.unitId) {
            return;
        }

        setProductSubmitting(true);
        setProductError('');

        try {
            const payload = new FormData();
            const productUnits = (selectedRecord.product_units_raw || []).map((productUnit) => ({
                ...productUnit,
                is_default_sales_unit: Number(productUnit.unit_id) === Number(unit.unitId),
            }));

            const fields = {
                company_id: selectedRecord.company_id,
                product_category_id: selectedRecord.product_category_id || '',
                brand: selectedRecord.brand_value || '',
                base_unit_id: selectedRecord.base_unit_id,
                sku: selectedRecord.sku || '',
                barcode: selectedRecord.barcode_value || '',
                name: selectedRecord.name || '',
                description: selectedRecord.description || '',
                primary_image_path: selectedRecord.primary_image_path || '',
                default_discount_percentage: selectedRecord.default_discount_percentage ?? 0,
                commission_rate_percentage: selectedRecord.commission_rate_percentage ?? 0,
                low_stock_threshold_base_units: selectedRecord.low_stock_threshold_base_units ?? 0,
                base_unit_selling_price: selectedRecord.base_unit_selling_price ?? 0,
                status: String(selectedRecord.status || 'active').toLowerCase(),
            };

            Object.entries(fields).forEach(([key, value]) => payload.append(key, value ?? ''));
            payload.append('product_units', JSON.stringify(productUnits));
            payload.append('_method', 'PUT');

            const updatedProduct = await api.post(`/office/products/${selectedRecord.id}`, payload);
            const [mappedProduct] = mapProducts({ data: [updatedProduct] });

            setSelectedRecord(mappedProduct || selectedRecord);
            liveResource.refresh();
        } catch (requestError) {
            setProductError(requestError.message);
        } finally {
            setProductSubmitting(false);
        }
    };
    const openCustomerPaymentForm = (record = null) => {
        const nextForm = {
            ...blankCustomerPaymentForm,
            company_id: record?.company_id || '',
            customer_id: record?.customer_id || '',
            invoice_id: record?.id || '',
            amount: record?.balance_amount ? String(record.balance_amount) : '',
        };

        setSelectedRecord(record || {});
        setCustomerPaymentForm(nextForm);
        setModalScreenKey(null);
        setModalTitleOverride('Record customer payment');
        setModalSubmitLabelOverride('Save payment');
        setCustomerPaymentError('');
        setModalOpen(true);
    };
    const updateCustomerPaymentForm = (event) => {
        setCustomerPaymentForm((current) => ({ ...current, [event.target.name]: event.target.value }));
        setCustomerPaymentError('');
    };
    const submitCustomerPaymentForm = async () => {
        setCustomerPaymentSubmitting(true);
        setCustomerPaymentError('');

        try {
            await api.post('/office/payments', {
                company_id: customerPaymentForm.company_id,
                customer_id: customerPaymentForm.customer_id,
                payment_date: customerPaymentForm.payment_date || null,
                amount: customerPaymentForm.amount,
                payment_method: customerPaymentForm.payment_method,
                reference_no: customerPaymentForm.reference_no || null,
                note: customerPaymentForm.note || null,
                allocations: [{
                    invoice_id: customerPaymentForm.invoice_id,
                    allocated_amount: customerPaymentForm.amount,
                }],
            });
            liveResource.refresh();
            closeWorkflowModal();
        } catch (requestError) {
            setCustomerPaymentError(requestError.message);
        } finally {
            setCustomerPaymentSubmitting(false);
        }
    };
    const openCompanyPaymentForm = (record = null) => {
        const nextForm = {
            ...blankCompanyPaymentForm,
            company_id: record?.company_id || '',
            company_payable_id: record?.id || '',
            pay_all: !record?.id,
            amount: record?.balance_amount ? String(record.balance_amount) : '',
        };

        setSelectedRecord(record || {});
        setCompanyPaymentForm(nextForm);
        setModalScreenKey(null);
        setModalTitleOverride(record?.id ? 'Record payable payment' : 'Settle company payables');
        setModalSubmitLabelOverride(record?.id ? 'Save company payment' : 'Settle payables');
        setCompanyPaymentError('');
        setModalOpen(true);
    };
    const updateCompanyPaymentForm = (event) => {
        setCompanyPaymentForm((current) => ({ ...current, [event.target.name]: event.target.value }));
        setCompanyPaymentError('');
    };
    const submitCompanyPaymentForm = async () => {
        setCompanyPaymentSubmitting(true);
        setCompanyPaymentError('');

        try {
            await api.post('/office/company-payments', {
                ...companyPaymentForm,
                company_payable_id: companyPaymentForm.pay_all ? null : companyPaymentForm.company_payable_id,
                amount: companyPaymentForm.pay_all ? null : companyPaymentForm.amount,
                payment_date: companyPaymentForm.payment_date || null,
                reference_no: companyPaymentForm.reference_no || null,
                note: companyPaymentForm.note || null,
            });
            liveResource.refresh();
            closeWorkflowModal();
        } catch (requestError) {
            setCompanyPaymentError(requestError.message);
        } finally {
            setCompanyPaymentSubmitting(false);
        }
    };
    const openOfficeOrderForm = (record = null) => {
        setSelectedRecord(record || {});
        setOfficeOrderForm({
            ...blankOfficeOrderForm,
            customer_id: record?.id || '',
        });
        setOfficeOrderLines([{ ...blankOfficeOrderLine, id: `office-order-line-${Date.now()}` }]);
        setModalScreenKey(null);
        setOfficeOrderModalOpen(true);
        setModalTitleOverride('Create approved order');
        setModalSubmitLabelOverride('Create and approve order');
        setOfficeOrderError('');
        setModalOpen(true);
    };
    const updateOfficeOrderForm = (event) => {
        const { checked, name, type, value } = event.target;

        setOfficeOrderForm((current) => ({
            ...current,
            [name]: type === 'checkbox' ? checked : value,
            ...(name === 'company_id' ? { sales_representative_id: '' } : {}),
        }));

        if (name === 'company_id') {
            setOfficeOrderLines([{ ...blankOfficeOrderLine, id: `office-order-line-${Date.now()}` }]);
        }

        setOfficeOrderError('');
    };
    const updateOfficeOrderLines = (nextLines) => {
        setOfficeOrderLines(nextLines.map((line) => {
            if (!line.product_id || line.unit_id) {
                return line;
            }

            const product = findReceiptProduct(officeOrderProducts, line.product_id);
            const defaultUnit = product?.product_units?.find((unit) => unit.is_default_sales_unit)
                || product?.product_units?.find((unit) => unit.is_base_unit)
                || product?.product_units?.[0];

            return {
                ...line,
                unit_id: defaultUnit?.unit_id || '',
            };
        }));
        setOfficeOrderError('');
    };
    const officeOrderPayload = () => ({
        ...officeOrderForm,
        requested_delivery_date: officeOrderForm.requested_delivery_date || null,
        sales_representative_id: officeOrderForm.sales_representative_id || null,
        note: officeOrderForm.note || null,
        auto_approve: true,
        items: officeOrderLines
            .filter((line) => line.product_id && line.unit_id && Number(line.quantity || line.orderedQuantity || 0) > 0)
            .map((line) => ({
                product_id: line.product_id,
                unit_id: line.unit_id,
                quantity: Number(line.quantity || line.orderedQuantity || 1),
            })),
    });
    const submitOfficeOrderForm = async () => {
        setOfficeOrderSubmitting(true);
        setOfficeOrderError('');

        try {
            await api.post('/office/orders', officeOrderPayload());
            liveResource.refresh();
            closeWorkflowModal();
        } catch (requestError) {
            setOfficeOrderError(requestError.message);
        } finally {
            setOfficeOrderSubmitting(false);
        }
    };
    const approveOfficeOrder = async (record) => {
        if (!record?.id) {
            return;
        }

        setOfficeOrderSubmitting(true);
        setOfficeOrderError('');

        try {
            await api.post(`/office/orders/${record.id}/approve`);
            window.dispatchEvent(new Event('office-submitted-orders-changed'));
            liveResource.refresh();
        } catch (requestError) {
            setOfficeOrderError(requestError.message);
            window.alert(requestError.message);
        } finally {
            setOfficeOrderSubmitting(false);
        }
    };
    const generateInvoiceFromOrder = async (record) => {
        if (!record?.id) {
            return;
        }

        setOfficeOrderSubmitting(true);
        setOfficeOrderError('');

        try {
            if (String(record.status_value || record.status || '').toLowerCase() === 'submitted') {
                await api.post(`/office/orders/${record.id}/approve`);
                window.dispatchEvent(new Event('office-submitted-orders-changed'));
            }

            const invoice = await api.post(`/office/orders/${record.id}/generate-invoice`);
            rememberGeneratedInvoice(invoice);
            liveResource.refresh();
        } catch (requestError) {
            setOfficeOrderError(requestError.message);
            window.alert(requestError.message);
        } finally {
            setOfficeOrderSubmitting(false);
        }
    };
    const openDetailPage = (record) => {
        if (!screen.detailPageKey) {
            return;
        }

        const params = screen.detailPageKey === 'pharmacies-detail'
            ? { customer_id: record?.id || '' }
            : { record_id: record?.id || '' };

        onNavigate?.(screen.detailPageKey, params);
    };
    const closeConfirmAction = () => setConfirmAction(null);
    const inventoryRowActions = isStockWorkspacePage ? [
        ...(isInventoryPage ? [
            {
                label: 'View batches',
                onClick: (record) => openInventoryDetail(record),
            },
        ] : []),
        {
            label: 'Adjust stock',
            onClick: (record) => openStockAdjustmentForm(record),
        },
    ] : [];
    const rowActions = [
        ...inventoryRowActions,
        ...(screen.rowActions || []).map((action) => ({
            ...action,
            onClick: (record) => {
                if (action.openDrawer) {
                    setSelectedRecord(record);
                    setDrawerOpen(true);
                    return;
                }

                if (action.confirm) {
                    setSelectedRecord(record);
                    setConfirmAction({ action, record });
                    return;
                }

                if (action.modalScreenKey) {
                    openWorkflowModal(action.modalScreenKey, record, {
                        submitLabel: action.submitLabel || action.label,
                        title: action.modalTitle || action.label,
                    });
                    return;
                }

                if (action.financeAction === 'customerPayment') {
                    openCustomerPaymentForm(record);
                    return;
                }

                if (action.financeAction === 'companyPayment') {
                    openCompanyPaymentForm(record);
                    return;
                }

                if (action.orderAction === 'approve') {
                    approveOfficeOrder(record);
                    return;
                }

                if (action.orderAction === 'invoice') {
                    generateInvoiceFromOrder(record);
                    return;
                }

                if (action.orderAction === 'createForPharmacy') {
                    openOfficeOrderForm(record);
                    return;
                }

                if (action.target) {
                    setSelectedRecord(record);
                    onNavigate?.(action.target);
                    return;
                }

                openWorkflowModal(null, record, {
                    submitLabel: action.submitLabel || `Save ${recordLabel}`,
                    title: action.modalTitle || action.label,
                });
            },
        })),
    ];

    return (
        <div className="page-stack">
            <PageHeader
                action={isInventoryDetailPage ? (
                    <div className="page-heading-actions">
                        <button className="btn secondary" onClick={() => onNavigate?.('inventory')} type="button">Back to inventory</button>
                        <button className="btn primary" onClick={() => openStockAdjustmentForm(null)} type="button">{screen.primaryAction}</button>
                    </div>
                ) : screen.hidePrimaryAction ? null : (
                    <button className="btn primary" onClick={isCompaniesPage ? () => openCompanyForm() : isPharmaciesPage ? () => openPharmacyForm() : isProductCategoriesPage ? () => openProductCategoryForm() : isUnitsPage ? () => openUnitForm() : isWarehousesPage ? () => openWarehouseForm() : isProductsPage ? () => openProductForm() : isReceivingPage ? () => openStockReceiptForm() : isInventoryPage ? () => openStockAdjustmentForm(selectedRecord) : isReceivablesPage ? () => openCustomerPaymentForm(selectedRecord) : isPayablesPage ? () => openCompanyPaymentForm(null) : isRepresentativesPage ? () => openSalesRepresentativeForm() : createScreenAction(primaryAction, onNavigate, () => openWorkflowModal(null, selectedRecord))} type="button">{screen.primaryAction}</button>
                )}
                description={screen.description}
                eyebrow={screen.eyebrow}
                title={screen.title}
            />

            {screen.summaries && (
                <div className="summary-grid">
                    {screen.summaries.map((summary) => <SummaryCard key={summary.label} {...summary} />)}
                </div>
            )}

            {(screen.reportChart || screen.reportSummary) && (
                <Panel eyebrow="Report Dashboard" title={`${screen.title} Summary`}>
                    <ReportsWorkspace
                        categories={screen.reportCategories || []}
                        chart={screen.reportChart}
                        metrics={screen.reportMetrics || []}
                        summary={screen.reportSummary || []}
                    />
                </Panel>
            )}

            <Panel eyebrow="Workspace" title={`${screen.title} List`}>
                {showFilterToolbar && (isProductsPage ? (
                    <FilterToolbar
                        filters={productListFilterControls}
                        onFilterChange={updateProductListFilter}
                        onReset={resetProductListFilters}
                        onSearch={updateProductListSearch}
                        searchPlaceholder="Search barcode, product name, or brand"
                        searchValue={productListFilters.search}
                    />
                ) : isPharmaciesPage ? (
                    <FilterToolbar
                        filters={pharmacyListFilterControls}
                        onFilterChange={updatePharmacyListFilter}
                        onReset={resetPharmacyListFilters}
                        onSearch={updatePharmacyListSearch}
                        searchPlaceholder="Search pharmacy, code, owner, or phone"
                        searchValue={pharmacyListFilters.search}
                    />
                ) : isRepresentativesPage ? (
                    <FilterToolbar
                        filters={representativeListFilterControls}
                        onFilterChange={updateRepresentativeListFilter}
                        onReset={resetRepresentativeListFilters}
                        onSearch={updateRepresentativeListSearch}
                        searchPlaceholder="Search sales rep name or phone"
                        searchValue={representativeListFilters.search}
                    />
                ) : isWarehousesPage ? (
                    <FilterToolbar
                        filters={warehouseListFilterControls}
                        onFilterChange={updateWarehouseListFilter}
                        onReset={resetWarehouseListFilters}
                        onSearch={updateWarehouseListSearch}
                        searchPlaceholder="Search warehouse name or code"
                        searchValue={warehouseListFilters.search}
                    />
                ) : isReceivingPage ? (
                    <FilterToolbar
                        filters={receivingListFilterControls}
                        onFilterChange={updateReceivingListFilter}
                        onReset={resetReceivingListFilters}
                        onSearch={updateReceivingListSearch}
                        searchPlaceholder="Search receipt, invoice, company, or warehouse"
                        searchValue={receivingListFilters.search}
                    />
                ) : isInventoryPage ? (
                    <FilterToolbar
                        filters={inventoryListFilterControls}
                        onFilterChange={updateInventoryListFilter}
                        onReset={resetInventoryListFilters}
                        onSearch={updateInventoryListSearch}
                        searchPlaceholder="Search product name or SKU"
                        searchValue={inventoryListFilters.search}
                    />
                ) : isInventoryDetailPage ? (
                    <FilterToolbar
                        filters={inventoryDetailFilterControls}
                        onFilterChange={updateInventoryDetailFilter}
                        onReset={resetInventoryDetailFilters}
                        onSearch={updateInventoryDetailSearch}
                        searchPlaceholder="Search batch number"
                        searchValue={inventoryDetailFilters.search}
                    />
                ) : isReceivablesPage ? (
                    <FilterToolbar
                        filters={receivableListFilterControls}
                        onFilterChange={updateReceivableListFilter}
                        onReset={resetReceivableListFilters}
                        onSearch={updateReceivableListSearch}
                        searchPlaceholder="Search invoice, pharmacy, or company"
                        searchValue={receivableListFilters.search}
                    />
                ) : isPayablesPage ? (
                    <FilterToolbar
                        filters={payableListFilterControls}
                        onFilterChange={updatePayableListFilter}
                        onReset={resetPayableListFilters}
                        onSearch={updatePayableListSearch}
                        searchPlaceholder="Search company, receipt, or supplier invoice"
                        searchValue={payableListFilters.search}
                    />
                ) : <FilterToolbar filters={screen.filters} showDate />)}
                <DataTable
                    actions={[
                        ...(showViewAction ? [
                            { label: screen.viewActionLabel || `View ${recordLabel}`, onClick: (record) => { setSelectedRecord(record); setDrawerOpen(true); } },
                        ] : []),
                        ...rowActions,
                        ...(screen.detailPageKey ? [
                            { label: screen.detailActionLabel || `Open ${recordLabel}`, onClick: openDetailPage },
                        ] : []),
                        ...(showEditAction ? [
                            {
                                label: screen.editActionLabel || `Edit ${recordLabel}`,
                                onClick: (record) => isCompaniesPage ? openCompanyForm(record) : isPharmaciesPage ? openPharmacyForm(record) : isProductCategoriesPage ? openProductCategoryForm(record) : isUnitsPage ? openUnitForm(record) : isWarehousesPage ? openWarehouseForm(record) : isProductsPage ? openProductForm(record) : isReceivingPage ? openStockReceiptForm(record) : isRepresentativesPage ? openSalesRepresentativeForm(record) : openWorkflowModal(null, record, {
                                    submitLabel: screen.editSubmitLabel || `Save ${recordLabel}`,
                                    title: screen.editActionLabel || `Edit ${recordLabel}`,
                                }),
                            },
                        ] : []),
                        ...(isManagedCrudPage ? [
                            {
                                label: isProductsPage ? 'Delete product' : isProductCategoriesPage ? 'Delete category' : isUnitsPage ? 'Delete unit' : isWarehousesPage ? 'Delete warehouse' : isReceivingPage ? 'Delete receiving' : isPharmaciesPage ? 'Delete pharmacy' : isRepresentativesPage ? 'Delete sales rep' : 'Delete company',
                                variant: 'danger',
                                onClick: (record) => {
                                    setSelectedRecord(record);
                                    setConfirmAction({ action: { label: isProductsPage ? 'Delete product' : isProductCategoriesPage ? 'Delete category' : isUnitsPage ? 'Delete unit' : isWarehousesPage ? 'Delete warehouse' : isReceivingPage ? 'Delete receiving' : isPharmaciesPage ? 'Delete pharmacy' : isRepresentativesPage ? 'Delete sales rep' : 'Delete company', categoryDelete: isProductCategoriesPage, companyDelete: isCompaniesPage, pharmacyDelete: isPharmaciesPage, productDelete: isProductsPage, receiptDelete: isReceivingPage, representativeDelete: isRepresentativesPage, unitDelete: isUnitsPage, warehouseDelete: isWarehousesPage }, record });
                                },
                            },
                        ] : []),
                    ]}
                    columns={screen.columns}
                    error={liveResource.error}
                    loading={liveResource.loading}
                    onRowClick={isRepresentativesPage || isInventoryDetailPage ? undefined : (record) => {
                        setSelectedRecord(record);
                        if (isInventoryPage) {
                            openInventoryDetail(record);
                            return;
                        }
                        if (screen.detailPageKey) {
                            openDetailPage(record);
                            return;
                        }
                        setDrawerOpen(true);
                    }}
                    rows={screen.rows}
                />
                {isReceivingPage && liveResource.data?.summary && (
                    <div className="table-total-summary">
                        <span>Total payable due</span>
                        <strong>{formatAmount(liveResource.data.summary.due_amount)}</strong>
                    </div>
                )}
                {isProductsPage && productPagination && (
                    <PaginationBar
                        currentPage={productPagination.currentPage}
                        emptyLabel="No products to show"
                        from={productPagination.from}
                        lastPage={productPagination.lastPage}
                        loading={liveResource.loading}
                        onNext={() => goToProductPage(productPagination.currentPage + 1)}
                        onPrevious={() => goToProductPage(productPagination.currentPage - 1)}
                        to={productPagination.to}
                        total={productPagination.total}
                    />
                )}
                {isPharmaciesPage && pharmacyPagination && (
                    <PaginationBar
                        currentPage={pharmacyPagination.currentPage}
                        emptyLabel="No pharmacies to show"
                        from={pharmacyPagination.from}
                        lastPage={pharmacyPagination.lastPage}
                        loading={liveResource.loading}
                        onNext={() => goToPharmacyPage(pharmacyPagination.currentPage + 1)}
                        onPrevious={() => goToPharmacyPage(pharmacyPagination.currentPage - 1)}
                        to={pharmacyPagination.to}
                        total={pharmacyPagination.total}
                    />
                )}
                {isRepresentativesPage && representativePagination && (
                    <PaginationBar
                        currentPage={representativePagination.currentPage}
                        emptyLabel="No sales reps to show"
                        from={representativePagination.from}
                        lastPage={representativePagination.lastPage}
                        loading={liveResource.loading}
                        onNext={() => goToRepresentativePage(representativePagination.currentPage + 1)}
                        onPrevious={() => goToRepresentativePage(representativePagination.currentPage - 1)}
                        to={representativePagination.to}
                        total={representativePagination.total}
                    />
                )}
                {isWarehousesPage && warehousePagination && (
                    <PaginationBar
                        currentPage={warehousePagination.currentPage}
                        emptyLabel="No warehouses to show"
                        from={warehousePagination.from}
                        lastPage={warehousePagination.lastPage}
                        loading={liveResource.loading}
                        onNext={() => goToWarehousePage(warehousePagination.currentPage + 1)}
                        onPrevious={() => goToWarehousePage(warehousePagination.currentPage - 1)}
                        to={warehousePagination.to}
                        total={warehousePagination.total}
                    />
                )}
                {isReceivingPage && receivingPagination && (
                    <PaginationBar
                        currentPage={receivingPagination.currentPage}
                        emptyLabel="No receiving records to show"
                        from={receivingPagination.from}
                        lastPage={receivingPagination.lastPage}
                        loading={liveResource.loading}
                        onNext={() => goToReceivingPage(receivingPagination.currentPage + 1)}
                        onPrevious={() => goToReceivingPage(receivingPagination.currentPage - 1)}
                        to={receivingPagination.to}
                        total={receivingPagination.total}
                    />
                )}
                {isInventoryPage && inventoryPagination && (
                    <PaginationBar
                        currentPage={inventoryPagination.currentPage}
                        emptyLabel="No inventory to show"
                        from={inventoryPagination.from}
                        lastPage={inventoryPagination.lastPage}
                        loading={liveResource.loading}
                        onNext={() => goToInventoryPage(inventoryPagination.currentPage + 1)}
                        onPrevious={() => goToInventoryPage(inventoryPagination.currentPage - 1)}
                        to={inventoryPagination.to}
                        total={inventoryPagination.total}
                    />
                )}
                {isInventoryDetailPage && inventoryDetailPagination && (
                    <PaginationBar
                        currentPage={inventoryDetailPagination.currentPage}
                        emptyLabel="No batches to show"
                        from={inventoryDetailPagination.from}
                        lastPage={inventoryDetailPagination.lastPage}
                        loading={liveResource.loading}
                        onNext={() => goToInventoryDetailPage(inventoryDetailPagination.currentPage + 1)}
                        onPrevious={() => goToInventoryDetailPage(inventoryDetailPagination.currentPage - 1)}
                        to={inventoryDetailPagination.to}
                        total={inventoryDetailPagination.total}
                    />
                )}
                {isReceivablesPage && receivablePagination && (
                    <PaginationBar
                        currentPage={receivablePagination.currentPage}
                        emptyLabel="No receivables to show"
                        from={receivablePagination.from}
                        lastPage={receivablePagination.lastPage}
                        loading={liveResource.loading}
                        onNext={() => goToReceivablePage(receivablePagination.currentPage + 1)}
                        onPrevious={() => goToReceivablePage(receivablePagination.currentPage - 1)}
                        to={receivablePagination.to}
                        total={receivablePagination.total}
                    />
                )}
                {isPayablesPage && payablePagination && (
                    <PaginationBar
                        currentPage={payablePagination.currentPage}
                        emptyLabel="No payables to show"
                        from={payablePagination.from}
                        lastPage={payablePagination.lastPage}
                        loading={liveResource.loading}
                        onNext={() => goToPayablePage(payablePagination.currentPage + 1)}
                        onPrevious={() => goToPayablePage(payablePagination.currentPage - 1)}
                        to={payablePagination.to}
                        total={payablePagination.total}
                    />
                )}
            </Panel>

            <Modal
                actions={modalScreen.stockReceivingForm && !isReceivingPage ? (
                    <>
                        <button className="btn secondary" onClick={closeWorkflowModal} type="button">Cancel</button>
                        <button className="btn primary" onClick={closeWorkflowModal} type="button">Save receiving and update stock</button>
                    </>
                ) : null}
                busy={modalBusy}
                open={modalOpen}
                onClose={closeWorkflowModal}
                onSubmit={officeOrderModalOpen ? submitOfficeOrderForm : isCompaniesPage && !modalScreenKey ? submitCompanyForm : isPharmaciesPage && !modalScreenKey ? submitPharmacyForm : isProductCategoriesPage && !modalScreenKey ? submitProductCategoryForm : isUnitsPage && !modalScreenKey ? submitUnitForm : isWarehousesPage && !modalScreenKey ? submitWarehouseForm : isProductsPage && !modalScreenKey ? submitProductForm : isReceivingPage && !modalScreenKey ? submitStockReceiptForm : isStockWorkspacePage && !modalScreenKey ? submitStockAdjustmentForm : isReceivablesPage && !modalScreenKey ? submitCustomerPaymentForm : isPayablesPage && !modalScreenKey ? submitCompanyPaymentForm : isRepresentativesPage && !modalScreenKey ? submitSalesRepresentativeForm : closeWorkflowModal}
                submitDisabled={orderCreateBlocked || officeOrderBlocked || companyPaymentSubmitting || companySubmitting || customerPaymentSubmitting || officeOrderSubmitting || pharmacySubmitting || productCategorySubmitting || productSubmitting || salesRepresentativeSubmitting || stockAdjustmentSubmitting || stockReceiptSubmitting || unitSubmitting || warehouseSubmitting}
                submitDisabledReason={companyError || companyPaymentError || customerPaymentError || officeOrderError || pharmacyError || productCategoryError || productError || salesRepresentativeError || stockAdjustmentError || stockReceiptError || unitError || warehouseError || (orderCreateBlocked || officeOrderBlocked ? 'Company credit is blocked. Order creation is not allowed.' : '')}
                submitLabel={modalSubmitLabel}
                title={modalTitle}
            >
                {!isManagedCrudPage && !isStockWorkspacePage && <WorkflowContext context={modalContext} screenKey={modalScreenKey} />}
                {officeOrderModalOpen
                    ? (
                        <OfficeOrderForm
                            companies={productCompanies}
                            customers={officeOrderCustomers}
                            error={officeOrderError || officeOrderCustomersResource.error || officeOrderProductsResource.error || officeOrderRepresentativesResource.error}
                            form={officeOrderForm}
                            lines={officeOrderLines}
                            lockedCustomer={officeOrderLockedCustomer}
                            onChange={updateOfficeOrderForm}
                            onLineChange={updateOfficeOrderLines}
                            products={officeOrderProducts}
                            productsLoading={officeOrderProductsResource.loading}
                            representatives={officeOrderRepresentatives}
                            representativesLoading={officeOrderRepresentativesResource.loading}
                            submitting={officeOrderSubmitting}
                        />
                    )
                    : isCompaniesPage && !modalScreenKey
                    ? <CompanyForm form={companyForm} onChange={updateCompanyForm} />
                    : isPharmaciesPage && !modalScreenKey
                        ? <PharmacyForm form={pharmacyForm} onChange={updatePharmacyForm} />
                    : isProductCategoriesPage && !modalScreenKey
                        ? (
                            <ProductCategoryForm
                                form={productCategoryForm}
                                onChange={updateProductCategoryForm}
                                parentOptions={screen.rows}
                                selectedId={selectedRecord?.id}
                            />
                        )
                    : isUnitsPage && !modalScreenKey
                        ? <UnitForm form={unitForm} onChange={updateUnitForm} />
                    : isWarehousesPage && !modalScreenKey
                        ? <WarehouseForm form={warehouseForm} onChange={updateWarehouseForm} />
                    : isReceivingPage && !modalScreenKey
                        ? (
                            <StockReceiptForm
                                companies={productCompanies}
                                form={stockReceiptForm}
                                onAddItem={addStockReceiptItem}
                                onChange={updateStockReceiptForm}
                                onItemChange={updateStockReceiptItem}
                                onRemoveItem={removeStockReceiptItem}
                                products={receivingProducts}
                                productsLoading={receivingProductsResource.loading}
                                warehouses={receivingWarehouses}
                            />
                        )
                    : isStockWorkspacePage && !modalScreenKey
                        ? (
                            <StockAdjustmentForm
                                companies={productCompanies}
                                form={stockAdjustmentForm}
                                onChange={updateStockAdjustmentForm}
                                products={stockAdjustmentProducts}
                                productsLoading={stockAdjustmentProductsResource.loading}
                                warehouses={receivingWarehouses}
                            />
                        )
                    : isReceivablesPage && !modalScreenKey
                        ? (
                            <CustomerPaymentForm
                                form={customerPaymentForm}
                                onChange={updateCustomerPaymentForm}
                                record={selectedRecord}
                            />
                        )
                    : isPayablesPage && !modalScreenKey
                        ? (
                            <CompanyPaymentForm
                                companies={productCompanies}
                                form={companyPaymentForm}
                                onChange={updateCompanyPaymentForm}
                                record={selectedRecord}
                            />
                        )
                    : isProductsPage && !modalScreenKey
                        ? productLookupsLoading ? <ProductFormSkeleton /> : (
                            <ProductForm
                                categories={unwrapCollection(productCategoriesResource.data)}
                                companies={productCompanies}
                                form={productForm}
                                onAddUnit={addProductUnit}
                                onChange={updateProductForm}
                                onFocRuleChange={updateProductFocRule}
                                onImageChange={updateProductImage}
                                onRemoveUnit={removeProductUnit}
                                onUnitChange={updateProductUnit}
                                units={unwrapCollection(productUnitsResource.data)}
                            />
                        )
                    : isRepresentativesPage && !modalScreenKey
                        ? (
                            <SalesRepresentativeForm
                                companies={productCompanies}
                                form={salesRepresentativeForm}
                                onChange={updateSalesRepresentativeForm}
                            />
                        )
                    : (
                        <ModalContent
                            blocked={orderCreateBlocked}
                            contextKey={modalScreenKey}
                            creditStatuses={orderCreditStatuses}
                            onCompanyChange={setSelectedOrderCompany}
                            screen={modalScreen}
                            selectedCompany={selectedOrderCompany}
                        />
                    )}
            </Modal>

            {confirmAction && (
                <Modal
                    busy={modalBusy}
                    actions={(
                        <>
                            <button className="btn secondary" disabled={modalBusy} onClick={closeConfirmAction} type="button">Cancel</button>
                            <button className="btn primary" disabled={companySubmitting || pharmacySubmitting || productCategorySubmitting || productSubmitting || salesRepresentativeSubmitting || stockReceiptSubmitting || unitSubmitting || warehouseSubmitting} onClick={() => confirmAction.action.companyDelete ? deleteCompany(confirmAction.record) : confirmAction.action.pharmacyDelete ? deletePharmacy(confirmAction.record) : confirmAction.action.categoryDelete ? deleteProductCategory(confirmAction.record) : confirmAction.action.unitDelete ? deleteUnit(confirmAction.record) : confirmAction.action.warehouseDelete ? deleteWarehouse(confirmAction.record) : confirmAction.action.receiptDelete ? deleteStockReceipt(confirmAction.record) : confirmAction.action.productDelete ? deleteProduct(confirmAction.record) : confirmAction.action.representativeDelete ? deleteSalesRepresentative(confirmAction.record) : closeConfirmAction()} type="button">{confirmAction.action.label}</button>
                        </>
                    )}
                    open
                    onClose={closeConfirmAction}
                    onSubmit={closeConfirmAction}
                    title={`${confirmAction.action.label} - ${getRecordTitle(confirmAction.record)}`}
                >
                    <div className="workflow-context-card">
                        <span>Selected {recordLabel}</span>
                        <strong>{getRecordTitle(confirmAction.record)}</strong>
                        <small>Confirm this action with an audit note before changing the record.</small>
                    </div>
                    <div className="crud-grid">
                        <FormField label={`${confirmAction.action.label} reason`} placeholder="Required audit note before deleting" type="textarea" />
                    </div>
                </Modal>
            )}

            {isInvoicesPage || isReceivablesPage ? (
                <InvoiceDetailDrawer
                    actions={(
                        <>
                            {selectedRecord?.sales_order_id && <button className="btn secondary" onClick={() => openInvoiceOrderDetail(selectedRecord)} type="button">Open order detail</button>}
                            <button className="btn primary" onClick={() => setDrawerOpen(false)} type="button">Done</button>
                        </>
                    )}
                    fallbackInvoice={{
                        documents: screen.documents || [],
                        invoiceItems: screen.invoiceItems || [],
                    }}
                    invoice={selectedRecord}
                    onClose={() => setDrawerOpen(false)}
                    open={drawerOpen}
                />
            ) : (
                <Drawer
                    actions={(
                        <>
                            {(screen.contextActions || []).map((action) => (
                                <button
                                    className={action.variant === 'primary' ? 'btn primary' : 'btn secondary'}
                                    key={action.label}
                                    onClick={() => {
                                        if (action.modalScreenKey) {
                                            openWorkflowModal(action.modalScreenKey, selectedRecord);
                                            return;
                                        }

                                        if (action.orderAction === 'approve') {
                                            approveOfficeOrder(selectedRecord);
                                            return;
                                        }

                                        if (action.orderAction === 'invoice') {
                                            generateInvoiceFromOrder(selectedRecord);
                                            return;
                                        }

                                        createScreenAction(action, onNavigate, () => openWorkflowModal(null, selectedRecord))();
                                    }}
                                    type="button"
                                >
                                    {action.label}
                                </button>
                            ))}
                            {screen.detailPageKey && (
                                <button className="btn secondary" onClick={() => openDetailPage(selectedRecord)} type="button">
                                    Open detail
                                </button>
                            )}
                            {showEditAction && (
                                <button className="btn secondary" onClick={() => isCompaniesPage ? openCompanyForm(selectedRecord) : isPharmaciesPage ? openPharmacyForm(selectedRecord) : isProductCategoriesPage ? openProductCategoryForm(selectedRecord) : isUnitsPage ? openUnitForm(selectedRecord) : isWarehousesPage ? openWarehouseForm(selectedRecord) : isProductsPage ? openProductForm(selectedRecord) : isReceivingPage ? openStockReceiptForm(selectedRecord) : isRepresentativesPage ? openSalesRepresentativeForm(selectedRecord) : openWorkflowModal(null, selectedRecord, { submitLabel: `Save ${recordLabel}`, title: `Edit ${recordLabel}` })} type="button">Edit {recordLabel}</button>
                            )}
                            <button className="btn primary" onClick={() => setDrawerOpen(false)} type="button">Done</button>
                        </>
                    )}
                    eyebrow={`${screen.title} Detail`}
                    open={drawerOpen}
                    onClose={() => setDrawerOpen(false)}
                    title={selectedRecord?.name || selectedRecord?.order || selectedRecord?.invoice || selectedRecord?.receipt || screen.title}
                >
                    <Details
                        defaultUnitBusy={productSubmitting}
                        onDefaultSalesUnitChange={isProductsPage ? changeProductDefaultSalesUnit : undefined}
                        record={selectedRecord}
                        screen={screen}
                    />
                </Drawer>
            )}
        </div>
    );
}
