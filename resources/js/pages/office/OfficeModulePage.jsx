import { useEffect, useState } from 'react';
import CompanyProductAssignment from '../../components/shared/CompanyProductAssignment';
import CreditStatusGrid from '../../components/shared/CreditStatusGrid';
import DataTable from '../../components/shared/DataTable';
import DocumentPreviewSet from '../../components/shared/DocumentPreviewSet';
import Drawer from '../../components/shared/Drawer';
import FilterToolbar from '../../components/shared/FilterToolbar';
import FinanceReportOverview from '../../components/shared/FinanceReportOverview';
import FinanceReview from '../../components/shared/FinanceReview';
import FormField from '../../components/shared/FormField';
import Icon from '../../components/shared/Icon';
import { invoicePrintPageUrl } from '../../components/shared/InvoiceDetailDrawer';
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
import SalesReportSummary from '../../components/shared/SalesReportSummary';
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
import { applyLiveRows, getOfficeEndpoint, mapInvoices, mapOfficeRows, mapProducts, unwrapCollection } from '../../services/screenAdapters';

function notifyOperationalActionsChanged() {
    window.dispatchEvent(new Event('office-operational-actions-changed'));
}

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

const blankStockTransferForm = {
    company_id: '',
    company_name: '',
    source_warehouse_id: '',
    destination_warehouse_id: '',
    lines: [],
    note: '',
};

const blankSalesReturnForm = {
    invoice_id: '',
    warehouse_id: '',
    return_date: '',
    reason: '',
    items: [],
};

function newStockTransferLine(productId = '', productName = '') {
    return {
        id: `stock-transfer-line-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        product_id: productId,
        product_name: productName,
        batches: [],
        batches_error: '',
        batches_loading: false,
        items: [],
    };
}

function newSalesReturnLine(item) {
    return {
        id: `sales-return-line-${item.id}`,
        invoice_item_id: item.id,
        product: item.product,
        unit: item.unit,
        max_quantity: Number(item.quantity || 0),
        base_unit_quantity: Number(item.base_unit_quantity || 0),
        line_total: Number(item.line_total || 0),
        quantity: '',
        condition: 'sellable',
        batch_no: '',
        expiry_date: '',
        reason: '',
    };
}

function forceShowAllOnSearch(current, value) {
    return {
        ...current,
        action_only: String(value || '').trim() ? false : current.action_only,
        page: 1,
        search: value,
    };
}

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

const blankFinanceTransactionForm = {
    direction: 'income',
    category: 'sales_collection',
    transaction_date: '',
    amount: '',
    payment_method: 'cash',
    reference_no: '',
    description: '',
    status: 'recorded',
};

const blankFinanceCategoryForm = {
    name: '',
    code: '',
    direction: 'income',
    description: '',
    status: 'active',
};

const blankApprovalForm = {
    warehouse_id: '',
};

const blankOfficeOrderLine = {
    id: 'office-order-line-1',
    product_id: '',
    unit_id: '',
    quantity: '1',
    foc_unit_id: '',
    foc_quantity: '',
};

const blankOfficeOrderForm = {
    company_id: '',
    customer_id: '',
    sales_representative_id: '',
    warehouse_id: '',
    requested_delivery_date: '',
    payment_due_date: '',
    tax_amount: '0',
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
    low_stock_threshold_sales_units: '0',
    base_unit_selling_price: '0',
    product_units: [],
    foc_rules: [],
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

function defaultPaymentDueDate() {
    const dueDays = Number(window.appConfig?.invoiceDueDays ?? 30);
    const date = new Date();
    date.setDate(date.getDate() + dueDays);

    return date.toISOString().slice(0, 10);
}

function promptInvoiceTaxAmount() {
    const input = window.prompt('Total tax amount for this invoice (optional)', '0');

    if (input === null) {
        return null;
    }

    const normalized = String(input).trim() === '' ? 0 : Number(input);

    if (!Number.isFinite(normalized) || normalized < 0) {
        window.alert('Enter a valid tax amount, or leave it blank for zero.');
        return null;
    }

    return normalized;
}

function defaultSalesUnitLabel(form, units = []) {
    const defaultRow = (form.product_units || []).find((row) => row.is_default_sales_unit && row.status !== 'inactive')
        || (form.product_units || []).find((row) => String(row.unit_id) === String(form.base_unit_id))
        || {};
    const unit = units.find((item) => String(item.id) === String(defaultRow.unit_id || form.base_unit_id));

    return unit?.abbreviation || unit?.name || 'sales unit';
}

function focRuleFormFromRecord(record) {
    const rule = record;

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

function focRuleFormsFromRecord(record) {
    return (record?.foc_rules_raw || []).map(focRuleFormFromRecord);
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

function formatRecordFactValue(value) {
    if (!value) {
        return '-';
    }

    if (typeof value !== 'string') {
        return value;
    }

    const text = value.trim();
    const match = text.match(/^(\d{4}-\d{2}-\d{2})(?:[T\s](\d{2}):(\d{2})(?::(\d{2}))?(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?)?$/);

    if (!match) {
        return value;
    }

    const [, datePart, hour = '00', minute = '00', second = '00'] = match;

    if (hour === '00' && minute === '00' && second === '00') {
        return datePart;
    }

    const date = new Date(text);

    if (Number.isNaN(date.getTime())) {
        return datePart;
    }

    return new Intl.DateTimeFormat('en', {
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        month: 'short',
        year: 'numeric',
    }).format(date);
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
                        <strong>{formatRecordFactValue(record?.[field.key])}</strong>
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

function FinanceCategoryForm({ form, onChange }) {
    return (
        <div className="company-form-layout">
            <div className="crud-grid">
                <FormField label="Category name" name="name" onChange={onChange} required value={form.name} />
                <FormField label="Category code" name="code" onChange={onChange} placeholder="Auto-generated if empty" value={form.code} />
                <label className="form-field">
                    <span>Type</span>
                    <select name="direction" onChange={onChange} required value={form.direction}>
                        <option value="income">Income</option>
                        <option value="outcome">Outcome</option>
                        <option value="both">Both</option>
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
            <FormField label="Description" name="description" onChange={onChange} type="textarea" value={form.description} />
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

function isDeletedProductRecord(record) {
    return Boolean(record?.isDeleted || record?.deleted_at || record?.status_value === 'deleted' || String(record?.status || '').toLowerCase() === 'deleted');
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

function StockTransferWorkspace({
    companies = [],
    error = '',
    form,
    onAddLine,
    onBatchQuantityChange,
    onBatchToggle,
    onChange,
    onLineProductChange,
    onRemoveLine,
    onSubmit,
    products = [],
    productsLoading = false,
    submitting = false,
    warehouses = [],
}) {
    const selectedTotal = (form.lines || []).reduce((lineSum, line) => (
        lineSum + (line.items || []).reduce((itemSum, item) => itemSum + Number(item.base_unit_quantity || 0), 0)
    ), 0);
    const selectedBatchCount = (form.lines || []).reduce((sum, line) => sum + (line.items || []).length, 0);
    const selectedProductCount = (form.lines || []).filter((line) => line.product_id && (line.items || []).length > 0).length;
    const routeReady = Boolean(form.company_id && form.source_warehouse_id && form.destination_warehouse_id);
    const selectedCompany = companies.find((company) => String(company.id) === String(form.company_id));
    const sourceWarehouse = warehouses.find((warehouse) => String(warehouse.id) === String(form.source_warehouse_id));
    const destinationWarehouse = warehouses.find((warehouse) => String(warehouse.id) === String(form.destination_warehouse_id));

    return (
        <div className="transfer-workspace">
            <Panel eyebrow="Transfer Setup" title="Warehouse route">
                <div className={`transfer-route-strip ${routeReady ? 'is-ready' : ''}`}>
                    <div>
                        <span>Company</span>
                        <strong>{selectedCompany?.name || 'Select company'}</strong>
                    </div>
                    <Icon name="arrowRight" size={18} />
                    <div>
                        <span>From</span>
                        <strong>{sourceWarehouse?.name || 'Source warehouse'}</strong>
                    </div>
                    <Icon name="arrowRight" size={18} />
                    <div>
                        <span>To</span>
                        <strong>{destinationWarehouse?.name || 'Destination warehouse'}</strong>
                    </div>
                </div>
                <div className="transfer-route-fields">
                    <label className="form-field">
                        <span>Company</span>
                        <select disabled={submitting} name="company_id" onChange={onChange} required value={form.company_id}>
                            <option value="" disabled>Select company</option>
                            {companies.map((company) => (
                                <option key={company.id} value={company.id}>{company.name}</option>
                            ))}
                        </select>
                    </label>
                    <label className="form-field">
                        <span>From warehouse</span>
                        <select disabled={submitting} name="source_warehouse_id" onChange={onChange} required value={form.source_warehouse_id}>
                            <option value="" disabled>Select source</option>
                            {warehouses.map((warehouse) => (
                                <option key={warehouse.id} value={warehouse.id}>{warehouse.name}</option>
                            ))}
                        </select>
                    </label>
                    <label className="form-field">
                        <span>To warehouse</span>
                        <select disabled={submitting} name="destination_warehouse_id" onChange={onChange} required value={form.destination_warehouse_id}>
                            <option value="" disabled>Select destination</option>
                            {warehouses
                                .filter((warehouse) => String(warehouse.id) !== String(form.source_warehouse_id))
                                .map((warehouse) => (
                                    <option key={warehouse.id} value={warehouse.id}>{warehouse.name}</option>
                                ))}
                        </select>
                    </label>
                </div>
            </Panel>

            <Panel
                eyebrow="Batch Selection"
                title="Products and available batches"
                action={<button className="btn secondary" disabled={!routeReady || productsLoading || submitting} onClick={onAddLine} type="button">Add product</button>}
            >
                {error && <span className="error-text">{error}</span>}
                {!routeReady ? (
                    <p className="helper-copy">Select company, source warehouse, and destination warehouse before adding products.</p>
                ) : (
                    <div className="receiving-items">
                        {(form.lines || []).map((line, index) => {
                            const selectedItemsByBatch = new Map((line.items || []).map((item) => [String(item.stock_batch_id), item]));
                            const product = findReceiptProduct(products, line.product_id);
                            const lineTotal = (line.items || []).reduce((sum, item) => sum + Number(item.base_unit_quantity || 0), 0);

                            return (
                                <article className="receiving-item transfer-product-item" key={line.id}>
                                    <div className="transfer-product-header">
                                        <strong>Product #{index + 1}</strong>
                                        <button className="btn secondary transfer-remove-btn" disabled={submitting} onClick={() => onRemoveLine(line.id)} type="button">Remove</button>
                                    </div>
                                    <div className="transfer-product-toolbar">
                                        <label className="form-field transfer-product-field">
                                            <span>Product</span>
                                            <select disabled={productsLoading || submitting} onChange={(event) => onLineProductChange(line.id, event.target.value)} required value={line.product_id}>
                                                <option value="" disabled>{productsLoading ? 'Loading products' : 'Select product'}</option>
                                                {products.map((item) => (
                                                    <option key={item.id} value={item.id}>{item.name}</option>
                                                ))}
                                            </select>
                                        </label>
                                        <div className="transfer-line-stats">
                                            <span><strong>{formatAmount(lineTotal)}</strong><small>Base qty</small></span>
                                            <span><strong>{product?.base_unit?.name || product?.baseUnit?.name || 'Base unit'}</strong><small>Unit</small></span>
                                            <span><strong>{formatAmount((line.items || []).length)}</strong><small>Batches</small></span>
                                        </div>
                                    </div>
                                    {line.batches_error && <span className="error-text">{line.batches_error}</span>}
                                    {!line.product_id ? (
                                        <p className="helper-copy">Choose a product to show source warehouse batches.</p>
                                    ) : line.batches_loading ? (
                                        <p className="helper-copy">Loading available batches...</p>
                                    ) : (line.batches || []).length === 0 ? (
                                        <p className="helper-copy">No available batches for this product in the source warehouse.</p>
                                    ) : (
                                        <div className="transfer-batch-list">
                                            <div className="transfer-batch-header">
                                                <span>Batch</span>
                                                <span>Expiry</span>
                                                <span>Available</span>
                                                <span>Transfer qty</span>
                                            </div>
                                            {line.batches.map((batch) => {
                                                const selectedItem = selectedItemsByBatch.get(String(batch.id));
                                                const checked = Boolean(selectedItem);
                                                const available = Number(batch.available_base_quantity || 0);
                                                const unit = batch.product?.base_unit?.abbreviation || batch.product?.base_unit?.name || product?.base_unit?.abbreviation || product?.base_unit?.name || 'base units';
                                                const expiry = batch.expiry_date ? String(batch.expiry_date).slice(0, 10) : '-';
                                                const quantity = Number(selectedItem?.base_unit_quantity || 0);
                                                const quantityInvalid = checked && (quantity < 1 || quantity > available);

                                                return (
                                                    <div className={`transfer-batch-row ${checked ? 'is-selected' : ''} ${quantityInvalid ? 'has-error' : ''}`} key={batch.id}>
                                                        <label className="checkbox-field">
                                                            <input checked={checked} disabled={submitting} onChange={(event) => onBatchToggle(line.id, batch, event.target.checked)} type="checkbox" />
                                                            <span>{batch.batch_no || `Batch #${batch.id}`}</span>
                                                        </label>
                                                        <span>{expiry}</span>
                                                        <span>{formatAmount(available)} {unit}</span>
                                                        <div className="transfer-qty-control">
                                                            <input
                                                                aria-label={`Transfer quantity for ${batch.batch_no || `Batch #${batch.id}`}`}
                                                                disabled={!checked || submitting}
                                                                max={available}
                                                                min="1"
                                                                onChange={(event) => onBatchQuantityChange(line.id, batch.id, event.target.value)}
                                                                type="number"
                                                                value={selectedItem?.base_unit_quantity || ''}
                                                            />
                                                            <button
                                                                className="transfer-max-btn"
                                                                disabled={!checked || submitting}
                                                                onClick={() => onBatchQuantityChange(line.id, batch.id, String(available))}
                                                                type="button"
                                                            >
                                                                Max
                                                            </button>
                                                            <small>{unit}</small>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </article>
                            );
                        })}
                    </div>
                )}
                {routeReady && (form.lines || []).length === 0 && (
                    <p className="helper-copy">Add a product to start selecting available batches.</p>
                )}
            </Panel>

            <Panel eyebrow="Transfer Summary" title="Review and submit" className="transfer-summary-panel">
                <div className="receiving-summary">
                    <div><span>Products</span><strong>{formatAmount(selectedProductCount)}</strong></div>
                    <div><span>Batches</span><strong>{formatAmount(selectedBatchCount)}</strong></div>
                    <div><span>Total base quantity</span><strong>{formatAmount(selectedTotal)}</strong></div>
                </div>
                <FormField label="Note" name="note" onChange={onChange} placeholder="Optional transfer note" type="textarea" value={form.note} />
                <div className="page-heading-actions transfer-submit-actions">
                    <button className="btn primary" disabled={!routeReady || selectedTotal <= 0 || submitting} onClick={onSubmit} type="button">
                        {submitting ? 'Transferring...' : 'Create transfer'}
                    </button>
                </div>
            </Panel>
        </div>
    );
}

function ApprovalWarehouseForm({
    error = '',
    form,
    onChange,
    order,
    warehouses = [],
}) {
    return (
        <div className="approval-form">
            <div className="workflow-context-card">
                <span>{order?.pharmacy || 'Customer order'}</span>
                <strong>{order?.order || 'Selected order'}</strong>
                <small>{order?.company || '-'} / {order?.baseQuantity || 'Ready to reserve'}</small>
            </div>

            {error && <p className="form-error">{error}</p>}

            <label className="form-field">
                <span>Reserve from warehouse</span>
                <select name="warehouse_id" onChange={onChange} required value={form.warehouse_id}>
                    <option value="" disabled>Select warehouse</option>
                    {warehouses.map((warehouse) => (
                        <option key={warehouse.id} value={warehouse.id}>
                            {warehouse.name}{warehouse.code ? ` (${warehouse.code})` : ''}
                        </option>
                    ))}
                </select>
            </label>
            <div className="approval-note">
                <Icon name="packageCheck" size={18} />
                <span>The system will reserve stock from this warehouse by nearest expiry date, including FOC quantities.</span>
            </div>
        </div>
    );
}

function SalesReturnForm({
    error = '',
    form,
    invoice,
    loading = false,
    onChange,
    onItemChange,
    warehouses = [],
    warehousesLoading = false,
}) {
    const returnableItems = form.items || [];
    const estimatedReturnTotal = returnableItems.reduce((sum, item) => {
        const quantity = Number(item.quantity || 0);
        const maxQuantity = Number(item.max_quantity || 0);
        const lineTotal = Number(item.line_total || 0);

        return sum + (maxQuantity > 0 ? (lineTotal * quantity / maxQuantity) : 0);
    }, 0);
    const returnedItemCount = returnableItems.filter((item) => Number(item.quantity || 0) > 0).length;

    return (
        <div className="sales-return-form">
            <div className="workflow-context-card">
                <span>{invoice?.pharmacy || 'Customer invoice'}</span>
                <strong>{invoice?.invoice || 'Loading invoice'}</strong>
                <small>{invoice?.order || '-'} / {invoice?.company || '-'}</small>
            </div>

            {error && <p className="form-error">{error}</p>}
            {loading && <p className="helper-copy">Loading invoice items...</p>}

            <div className="crud-grid">
                <label className="form-field">
                    <span>Return to warehouse</span>
                    <select disabled={warehousesLoading} name="warehouse_id" onChange={onChange} required value={form.warehouse_id}>
                        <option value="" disabled>{warehousesLoading ? 'Loading warehouses' : 'Select warehouse'}</option>
                        {warehouses.map((warehouse) => (
                            <option key={warehouse.id} value={warehouse.id}>
                                {warehouse.name}{warehouse.code ? ` (${warehouse.code})` : ''}
                            </option>
                        ))}
                    </select>
                </label>
                <FormField label="Return date" name="return_date" onChange={onChange} required type="date" value={form.return_date} />
                <FormField className="span-2" label="Return reason" name="reason" onChange={onChange} placeholder="Why stock is being returned" type="textarea" value={form.reason} />
            </div>

            <section className="form-section">
                <div className="section-heading">
                    <div>
                        <p className="eyebrow">Return items</p>
                        <h2>Item-level return quantities</h2>
                    </div>
                    <StatusBadge value={`${returnedItemCount} selected`} />
                </div>

                <div className="sales-return-items">
                    {returnableItems.length === 0 && !loading ? (
                        <p className="helper-copy">No remaining invoice item quantity is available to return.</p>
                    ) : returnableItems.map((item, index) => {
                        const quantity = Number(item.quantity || 0);
                        const maxQuantity = Number(item.max_quantity || 0);
                        const lineEstimate = maxQuantity > 0
                            ? (Number(item.line_total || 0) * quantity / maxQuantity)
                            : 0;

                        return (
                            <article className="sales-return-item" key={item.id || item.invoice_item_id}>
                                <div className="sales-return-item-head">
                                    <div>
                                        <strong>{item.product}</strong>
                                        <small>Remaining: {formatAmount(maxQuantity)} {item.unit} / base {formatAmount(item.base_unit_quantity)}</small>
                                    </div>
                                    <strong>{formatAmount(lineEstimate)}</strong>
                                </div>

                                <div className="receiving-item-grid sales-return-item-grid">
                                    <FormField
                                        label="Return quantity"
                                        max={maxQuantity}
                                        min="0"
                                        name="quantity"
                                        onChange={(event) => onItemChange(index, event)}
                                        step="1"
                                        type="number"
                                        value={item.quantity}
                                    />
                                    <label className="form-field">
                                        <span>Condition</span>
                                        <select name="condition" onChange={(event) => onItemChange(index, event)} value={item.condition}>
                                            <option value="sellable">Sellable</option>
                                            <option value="damaged">Damaged</option>
                                            <option value="expired">Expired</option>
                                        </select>
                                    </label>
                                    <FormField label="Batch number" name="batch_no" onChange={(event) => onItemChange(index, event)} placeholder="Auto if blank" value={item.batch_no} />
                                    <FormField label="Expiry date" name="expiry_date" onChange={(event) => onItemChange(index, event)} type="date" value={item.expiry_date} />
                                    <FormField className="span-2" label="Item note" name="reason" onChange={(event) => onItemChange(index, event)} placeholder="Optional line note" value={item.reason} />
                                </div>
                            </article>
                        );
                    })}
                </div>
            </section>

            <section className="receiving-summary">
                <div><span>Items selected</span><strong>{formatAmount(returnedItemCount)}</strong></div>
                <div><span>Estimated invoice credit</span><strong>{formatAmount(estimatedReturnTotal)}</strong></div>
                <div><span>Invoice balance now</span><strong>{invoice?.balanceAmount || '-'}</strong></div>
            </section>
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

function FinanceTransactionForm({ categories: categoryOptions = fallbackFinanceCategoryOptions, form, onChange }) {
    const categories = categoryOptions.filter((category) => !category.direction || category.direction === 'both' || category.direction === form.direction);

    return (
        <div className="company-form-layout">
            <div className="crud-grid">
                <label className="form-field">
                    <span>Type</span>
                    <select name="direction" onChange={onChange} required value={form.direction}>
                        <option value="income">Income</option>
                        <option value="outcome">Outcome</option>
                    </select>
                </label>
                <label className="form-field">
                    <span>Category</span>
                    <select name="category" onChange={onChange} required value={form.category}>
                        {categories.map((category) => (
                            <option key={category.value} value={category.value}>{category.label}</option>
                        ))}
                    </select>
                </label>
                <FormField label="Date" name="transaction_date" onChange={onChange} type="date" value={form.transaction_date} />
                <FormField label="Amount" min="1" name="amount" onChange={onChange} required type="number" value={form.amount} />
                <label className="form-field">
                    <span>Payment method</span>
                    <select name="payment_method" onChange={onChange} value={form.payment_method}>
                        {paymentMethodOptions.map((method) => (
                            <option key={method.value} value={method.value}>{method.label}</option>
                        ))}
                    </select>
                </label>
                <FormField label="Reference no." name="reference_no" onChange={onChange} value={form.reference_no} />
                <label className="form-field">
                    <span>Status</span>
                    <select name="status" onChange={onChange} value={form.status}>
                        <option value="recorded">Recorded</option>
                        <option value="void">Void</option>
                    </select>
                </label>
            </div>
            <FormField label="Description" name="description" onChange={onChange} placeholder="Short finance note" type="textarea" value={form.description} />
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
    stockError = '',
    stockLoading = false,
    stockRows = [],
    submitting = false,
    warehouses = [],
    warehousesLoading = false,
    warehouseRequired = true,
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
    const warehousePlaceholder = warehousesLoading
        ? 'Loading warehouses'
        : warehouseRequired && warehouses.length === 0
            ? 'No warehouses available'
            : warehouseRequired
                ? 'Select warehouse'
                : 'Keep current reservation';

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
                    <label className="form-field order-route-company">
                        <span>Company</span>
                        <select disabled={submitting} name="company_id" onChange={onChange} required value={form.company_id}>
                            <option value="" disabled>Select company</option>
                            {companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}
                        </select>
                    </label>
                    <label className="form-field order-route-pharmacy">
                        <span>Pharmacy</span>
                        <select disabled={Boolean(lockedCustomer?.id) || submitting} name="customer_id" onChange={onChange} required value={form.customer_id}>
                            <option value="" disabled>Select pharmacy</option>
                            {customerOptions.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}</option>)}
                        </select>
                    </label>
                    <label className="form-field order-route-sales">
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
                    <label className="form-field order-route-warehouse">
                        <span>Reserve from warehouse</span>
                        <select disabled={warehousesLoading || submitting} name="warehouse_id" onChange={onChange} required={warehouseRequired} value={form.warehouse_id}>
                            <option value="" disabled={warehouseRequired}>{warehousePlaceholder}</option>
                            {warehouses.map((warehouse) => (
                                <option key={warehouse.id} value={warehouse.id}>
                                    {warehouse.name}{warehouse.code ? ` (${warehouse.code})` : ''}
                                </option>
                            ))}
                        </select>
                    </label>
                    <FormField className="order-route-date" label="Requested delivery date" name="requested_delivery_date" onChange={onChange} type="date" value={form.requested_delivery_date} />
                    <FormField className="order-route-date" label="Payment due date" name="payment_due_date" onChange={onChange} required type="date" value={form.payment_due_date} />
                    <FormField className="order-route-date" label="Tax amount" name="tax_amount" onChange={onChange} type="number" value={form.tax_amount} />
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
                stockError={stockError}
                stockLoading={stockLoading}
                stockRows={stockRows}
                value={lines}
                warehouseId={form.warehouse_id}
            />
            {error && <span className="error-text">{error}</span>}
            <p className="helper-copy">
                Orders can be changed until delivery. Approved or invoiced edits re-reserve stock from the selected warehouse by nearest expiry date.
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

function ProductFocRuleEditor({ form, onAddRule, onChange, onRemoveRule }) {
    const rules = form.foc_rules || [];

    return (
        <section className={`product-foc-editor${rules.length ? '' : ' is-disabled'}`}>
            <div className="section-heading compact">
                <div>
                    <p className="eyebrow">FOC rules</p>
                    <h2>Product FOC announcements</h2>
                </div>
                <button className="btn secondary" onClick={onAddRule} type="button">Add FOC rule</button>
            </div>
            {rules.length ? (
                <div className="product-foc-rule-list">
                    {rules.map((rule, index) => (
                        <article key={rule.local_id || rule.id || index}>
                            <div className="rule-row-heading">
                                <strong>FOC rule {index + 1}</strong>
                                <button className="icon-btn danger" onClick={() => onRemoveRule(index)} title="Remove FOC rule" type="button">
                                    <Icon name="trash" size={15} />
                                </button>
                            </div>
                            <div className="crud-grid">
                                <label className="form-field">
                                    <span>Trigger type</span>
                                    <select name="rule_type" onChange={(event) => onChange(index, event)} value={rule.rule_type || 'quantity'}>
                                        <option value="quantity">Quantity</option>
                                        <option value="value">Order value</option>
                                    </select>
                                </label>
                                {rule.rule_type === 'value' ? (
                                    <FormField
                                        label="Minimum order value"
                                        min="1"
                                        name="minimum_order_value"
                                        onChange={(event) => onChange(index, event)}
                                        required
                                        type="number"
                                        value={rule.minimum_order_value}
                                    />
                                ) : (
                                    <FormField
                                        label="Minimum quantity in base units"
                                        min="1"
                                        name="minimum_quantity_base_units"
                                        onChange={(event) => onChange(index, event)}
                                        required
                                        type="number"
                                        value={rule.minimum_quantity_base_units}
                                    />
                                )}
                                <FormField
                                    label="FOC reward in base units"
                                    min="1"
                                    name="reward_quantity_base_units"
                                    onChange={(event) => onChange(index, event)}
                                    required
                                    type="number"
                                    value={rule.reward_quantity_base_units}
                                />
                                <label className="form-field">
                                    <span>Status</span>
                                    <select name="status" onChange={(event) => onChange(index, event)} value={rule.status || 'active'}>
                                        <option value="active">Active</option>
                                        <option value="inactive">Inactive</option>
                                    </select>
                                </label>
                                <FormField label="Starts at" name="starts_at" onChange={(event) => onChange(index, event)} type="date" value={rule.starts_at} />
                                <FormField label="Ends at" name="ends_at" onChange={(event) => onChange(index, event)} type="date" value={rule.ends_at} />
                            </div>
                        </article>
                    ))}
                </div>
            ) : (
                <p className="helper-copy">No FOC announcement rules are configured for this product.</p>
            )}
            <p className="helper-copy">
                These rules are shown as announcements only. Order creation uses the manual FOC quantity and unit entered on each item.
            </p>
        </section>
    );
}

function ProductForm({ categories = [], companies = [], form, onAddFocRule, onAddUnit, onChange, onFocRuleChange, onImageChange, onRemoveFocRule, onRemoveUnit, onUnitChange, units = [] }) {
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
                <FormField label={`Low stock threshold (${defaultSalesUnitLabel(form, units)})`} name="low_stock_threshold_sales_units" onChange={onChange} type="number" value={form.low_stock_threshold_sales_units} />
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
            <ProductFocRuleEditor form={form} onAddRule={onAddFocRule} onChange={onFocRuleChange} onRemoveRule={onRemoveFocRule} />
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

function OperationListModeSwitch({ actionOnly, onChange }) {
    return (
        <div className="operation-list-mode">
            <div>
                <span>List mode</span>
                <strong>{actionOnly ? 'Need action only' : 'All records'}</strong>
                <small>{actionOnly ? 'Showing records that need office follow-up.' : 'Showing every record in this module.'}</small>
            </div>
            <div aria-label="List mode" className="operation-mode-segment" role="group">
                <button aria-pressed={actionOnly} className={actionOnly ? 'active' : ''} onClick={() => onChange(true)} type="button">
                    <Icon name="bell" size={14} />
                    <span>Need action</span>
                </button>
                <button aria-pressed={!actionOnly} className={actionOnly ? '' : 'active'} onClick={() => onChange(false)} type="button">
                    <Icon name="grid" size={14} />
                    <span>Show all</span>
                </button>
            </div>
        </div>
    );
}

const blankProductListFilters = {
    company_id: '',
    page: 1,
    search: '',
    status: '',
};

const blankCompanyListFilters = {
    page: 1,
    search: '',
    status: '',
};

const blankProductCategoryListFilters = {
    page: 1,
    search: '',
    status: '',
};

const blankUnitListFilters = {
    page: 1,
    search: '',
    status: '',
};

const blankPharmacyListFilters = {
    action_only: false,
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
    action_only: true,
    company_id: '',
    page: 1,
    payment_status: '',
    search: '',
    status: '',
    warehouse_id: '',
};

const blankStockTransferListFilters = {
    company_id: '',
    destination_warehouse_id: '',
    page: 1,
    search: '',
    source_warehouse_id: '',
};

const blankInventoryListFilters = {
    action_only: false,
    company_id: '',
    page: 1,
    search: '',
    status: '',
    warehouse_id: '',
};

const blankReceivableListFilters = {
    action_only: true,
    aging: '',
    company_id: '',
    page: 1,
    search: '',
    status: '',
};

const blankPayableListFilters = {
    action_only: true,
    company_id: '',
    page: 1,
    search: '',
    status: '',
};

const blankFinanceTransactionListFilters = {
    category: '',
    date_from: '',
    date_to: '',
    direction: '',
    page: 1,
    search: '',
};

const blankFinanceCategoryListFilters = {
    direction: '',
    page: 1,
    search: '',
    status: '',
};

const blankOrderListFilters = {
    action_only: true,
    company_id: '',
    date_from: '',
    date_to: '',
    page: 1,
    search: '',
    status: '',
};

const blankInvoiceListFilters = {
    action_only: true,
    company_id: '',
    date_from: '',
    date_to: '',
    page: 1,
    search: '',
    status: '',
};

function formatDateInput(date) {
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${date.getFullYear()}-${month}-${day}`;
}

function reportRangeForDuration(duration = 'month') {
    const now = new Date();
    const start = new Date(now);
    const end = new Date(now);

    if (duration === 'today') {
        return {
            date_from: formatDateInput(start),
            date_to: formatDateInput(end),
        };
    }

    if (duration === 'week') {
        const mondayOffset = (now.getDay() || 7) - 1;
        start.setDate(now.getDate() - mondayOffset);
        const weekEnd = new Date(start);

        weekEnd.setDate(start.getDate() + 6);

        return {
            date_from: formatDateInput(start),
            date_to: formatDateInput(weekEnd),
        };
    }

    if (duration === 'year') {
        start.setMonth(0, 1);
        end.setMonth(11, 31);

        return {
            date_from: formatDateInput(start),
            date_to: formatDateInput(end),
        };
    }

    start.setDate(1);
    end.setMonth(now.getMonth() + 1, 0);

    return {
        date_from: formatDateInput(start),
        date_to: formatDateInput(end),
    };
}

const defaultReportRange = reportRangeForDuration('month');

const blankSalesReportFilters = {
    company_id: '',
    date_from: defaultReportRange.date_from,
    date_to: defaultReportRange.date_to,
    duration: 'month',
};

const blankPaymentListFilters = {
    company_id: '',
    date_from: '',
    date_to: '',
    page: 1,
    search: '',
};

const blankSalesReturnListFilters = {
    company_id: '',
    date_from: '',
    date_to: '',
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

function buildCompanyListEndpoint(filters) {
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

    return `/office/companies?${params.toString()}`;
}

function buildProductCategoryListEndpoint(filters) {
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

    return `/office/product-categories?${params.toString()}`;
}

function buildUnitListEndpoint(filters) {
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

    return `/office/units?${params.toString()}`;
}

function buildPharmacyListEndpoint(filters) {
    const params = new URLSearchParams({
        page: String(filters.page || 1),
        per_page: '15',
    });

    if (filters.action_only) {
        params.set('action_only', '1');
    }

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

    if (filters.action_only) {
        params.set('action_only', '1');
    }

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

function buildStockTransferListEndpoint(filters) {
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

    if (filters.source_warehouse_id) {
        params.set('source_warehouse_id', filters.source_warehouse_id);
    }

    if (filters.destination_warehouse_id) {
        params.set('destination_warehouse_id', filters.destination_warehouse_id);
    }

    return `/office/stock/transfers?${params.toString()}`;
}

function buildInventoryListEndpoint(filters) {
    const params = new URLSearchParams({
        page: String(filters.page || 1),
        per_page: '15',
    });

    if (filters.action_only) {
        params.set('action_only', '1');
    }

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

function buildInventoryReportUrl(filters) {
    const baseUrl = String(window.appConfig?.baseUrl || '').replace(/\/+$/g, '');
    const params = new URLSearchParams();

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

    return `${baseUrl}/office/inventory/report?${params.toString()}`;
}

function buildReceivableListEndpoint(filters) {
    const params = new URLSearchParams({
        action_only: filters.action_only ? '1' : '0',
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

    if (filters.action_only) {
        params.set('action_only', '1');
    }

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

function buildFinanceTransactionListEndpoint(filters) {
    const params = new URLSearchParams({
        page: String(filters.page || 1),
        per_page: '15',
    });

    if (filters.search) {
        params.set('search', filters.search);
    }

    if (filters.direction) {
        params.set('direction', filters.direction);
    }

    if (filters.category) {
        params.set('category', filters.category);
    }

    if (filters.date_from) {
        params.set('from_date', filters.date_from);
    }

    if (filters.date_to) {
        params.set('to_date', filters.date_to);
    }

    return `/office/finance/transactions?${params.toString()}`;
}

function buildFinanceCategoryListEndpoint(filters) {
    const params = new URLSearchParams({
        page: String(filters.page || 1),
        per_page: '15',
    });

    if (filters.search) {
        params.set('search', filters.search);
    }

    if (filters.direction) {
        params.set('direction', filters.direction);
    }

    if (filters.status) {
        params.set('status', filters.status);
    }

    return `/office/finance-categories?${params.toString()}`;
}

function buildOrderListEndpoint(filters, orderId = '') {
    const params = new URLSearchParams({
        page: String(filters.page || 1),
        per_page: '25',
    });

    if (filters.action_only && !orderId) {
        params.set('action_only', '1');
    }

    if (filters.search) {
        params.set('search', filters.search);
    }

    if (filters.company_id) {
        params.set('company_id', filters.company_id);
    }

    if (filters.status) {
        params.set('status', filters.status);
    }

    if (filters.date_from) {
        params.set('date_from', filters.date_from);
    }

    if (filters.date_to) {
        params.set('date_to', filters.date_to);
    }

    if (orderId) {
        params.set('order_id', orderId);
    }

    return `/office/orders?${params.toString()}`;
}

function buildPaymentListEndpoint(filters) {
    const params = new URLSearchParams({
        page: String(filters.page || 1),
        per_page: '25',
    });

    if (filters.search) {
        params.set('search', filters.search);
    }

    if (filters.company_id) {
        params.set('company_id', filters.company_id);
    }

    if (filters.date_from) {
        params.set('date_from', filters.date_from);
    }

    if (filters.date_to) {
        params.set('date_to', filters.date_to);
    }

    return `/office/payments?${params.toString()}`;
}

function buildSalesReturnListEndpoint(filters) {
    const params = new URLSearchParams({
        page: String(filters.page || 1),
        per_page: '25',
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

    if (filters.date_from) {
        params.set('date_from', filters.date_from);
    }

    if (filters.date_to) {
        params.set('date_to', filters.date_to);
    }

    return `/office/sales-returns?${params.toString()}`;
}

function buildInvoiceListEndpoint(filters, invoiceId = '') {
    const params = new URLSearchParams({
        page: String(filters.page || 1),
        per_page: '25',
    });

    if (filters.action_only && !invoiceId) {
        params.set('action_only', '1');
    }

    if (filters.search) {
        params.set('search', filters.search);
    }

    if (filters.company_id) {
        params.set('company_id', filters.company_id);
    }

    if (filters.status) {
        params.set('status', filters.status);
    }

    if (filters.date_from) {
        params.set('date_from', filters.date_from);
    }

    if (filters.date_to) {
        params.set('date_to', filters.date_to);
    }

    if (invoiceId) {
        params.set('invoice_id', invoiceId);
    }

    return `/office/invoices?${params.toString()}`;
}

function buildInvoiceReportUrl(filters) {
    const baseUrl = String(window.appConfig?.baseUrl || '').replace(/\/+$/g, '');
    const params = new URLSearchParams();

    if (filters.search) {
        params.set('search', filters.search);
    }

    if (filters.company_id) {
        params.set('company_id', filters.company_id);
    }

    if (filters.status) {
        params.set('status', filters.status);
    }

    if (filters.date_from) {
        params.set('date_from', filters.date_from);
    }

    if (filters.date_to) {
        params.set('date_to', filters.date_to);
    }

    return `${baseUrl}/office/invoices/report?${params.toString()}`;
}

function buildSalesReportEndpoint(filters) {
    const params = new URLSearchParams({
        duration: filters.duration || 'month',
    });

    if (filters.company_id) {
        params.set('company_id', filters.company_id);
    }

    if (filters.date_from) {
        params.set('date_from', filters.date_from);
    }

    if (filters.date_to) {
        params.set('date_to', filters.date_to);
    }

    return `/office/reports/sales/top-representatives?${params.toString()}`;
}

function buildPharmacyReportEndpoint(filters) {
    const params = new URLSearchParams({
        duration: filters.duration || 'month',
    });

    if (filters.company_id) {
        params.set('company_id', filters.company_id);
    }

    if (filters.date_from) {
        params.set('date_from', filters.date_from);
    }

    if (filters.date_to) {
        params.set('date_to', filters.date_to);
    }

    return `/office/reports/pharmacies/top-sales?${params.toString()}`;
}

function buildFinanceReportEndpoint(filters) {
    const params = new URLSearchParams({
        duration: filters.duration || 'month',
    });

    if (filters.company_id) {
        params.set('company_id', filters.company_id);
    }

    if (filters.date_from) {
        params.set('date_from', filters.date_from);
    }

    if (filters.date_to) {
        params.set('date_to', filters.date_to);
    }

    return `/office/reports/finance/overview?${params.toString()}`;
}

function orderStatusValue(record) {
    return String(record?.status_value || record?.status || '').toLowerCase();
}

const fallbackFinanceCategoryOptions = [
    { label: 'Sales collection', value: 'sales_collection', direction: 'income' },
    { label: 'Owner capital', value: 'owner_capital', direction: 'income' },
    { label: 'Other income', value: 'other_income', direction: 'income' },
    { label: 'Supplier payment', value: 'supplier_payment', direction: 'outcome' },
    { label: 'Operating expense', value: 'operating_expense', direction: 'outcome' },
    { label: 'Salary', value: 'salary', direction: 'outcome' },
    { label: 'Transport', value: 'transport', direction: 'outcome' },
    { label: 'Other outcome', value: 'other_outcome', direction: 'outcome' },
    { label: 'Adjustment', value: 'adjustment', direction: 'both' },
];

const paymentMethodOptions = [
    { label: 'Cash', value: 'cash' },
    { label: 'Bank transfer', value: 'bank_transfer' },
    { label: 'Cheque', value: 'cheque' },
    { label: 'Mobile money', value: 'mobile_money' },
    { label: 'Other', value: 'other' },
];

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
    const isPaymentsPage = pageKey === 'payments';
    const isSalesReturnsPage = pageKey === 'sales-returns';
    const isPayablesPage = pageKey === 'payables';
    const isFinanceCategoriesPage = pageKey === 'finance-categories';
    const isFinanceTransactionsPage = pageKey === 'finance';
    const isReceivingPage = pageKey === 'receiving';
    const isReceivablesPage = pageKey === 'receivables';
    const isOrdersPage = pageKey === 'orders';
    const isStockTransfersPage = pageKey === 'stock-transfers';
    const isStockTransferCreatePage = pageKey === 'stock-transfer-create';
    const isSalesReportsPage = pageKey === 'reports-representatives';
    const isPharmacyReportsPage = pageKey === 'reports-pharmacies';
    const isFinanceReportsPage = pageKey === 'reports-finance';
    const isRankedSalesReportPage = isSalesReportsPage || isPharmacyReportsPage;
    const isLiveReportPage = isRankedSalesReportPage || isFinanceReportsPage;
    const isFinanceBalancePage = isReceivablesPage || isPayablesPage;
    const isFinancePage = isFinanceTransactionsPage || isFinanceBalancePage || isSalesReturnsPage;
    const isSettingsPage = pageKey === 'settings';
    const isRepresentativesPage = pageKey === 'representatives';
    const isUnitsPage = pageKey === 'units';
    const isWarehousesPage = pageKey === 'warehouses';
    const [invoicePrintSettings, setInvoicePrintSettings] = useState([]);
    const [invoicePrintSaving, setInvoicePrintSaving] = useState(false);
    const [invoicePrintError, setInvoicePrintError] = useState('');
    const [invoicePrintSuccess, setInvoicePrintSuccess] = useState('');
    const [pharmacyListFilters, setPharmacyListFilters] = useState(blankPharmacyListFilters);
    const [productListFilters, setProductListFilters] = useState(blankProductListFilters);
    const routeSearchParams = new URLSearchParams(window.location.search);
    const selectedOrderId = routeSearchParams.get('order_id') || '';
    const inventoryDetailProductId = routeSearchParams.get('product_id') || '';
    const inventoryDetailCompanyId = routeSearchParams.get('company_id') || '';
    const inventoryDetailWarehouseId = routeSearchParams.get('warehouse_id') || '';
    const transferProductId = routeSearchParams.get('product_id') || '';
    const transferProductName = routeSearchParams.get('product_name') || '';
    const transferCompanyId = routeSearchParams.get('company_id') || '';
    const transferSourceWarehouseId = routeSearchParams.get('source_warehouse_id') || routeSearchParams.get('warehouse_id') || '';
    const [companyListFilters, setCompanyListFilters] = useState(blankCompanyListFilters);
    const [productCategoryListFilters, setProductCategoryListFilters] = useState(blankProductCategoryListFilters);
    const [unitListFilters, setUnitListFilters] = useState(blankUnitListFilters);
    const [inventoryListFilters, setInventoryListFilters] = useState(blankInventoryListFilters);
    const [financeTransactionListFilters, setFinanceTransactionListFilters] = useState(blankFinanceTransactionListFilters);
    const [financeCategoryListFilters, setFinanceCategoryListFilters] = useState(blankFinanceCategoryListFilters);
    const [orderListFilters, setOrderListFilters] = useState(blankOrderListFilters);
    const [invoiceListFilters, setInvoiceListFilters] = useState(blankInvoiceListFilters);
    const [paymentListFilters, setPaymentListFilters] = useState(blankPaymentListFilters);
    const [salesReturnListFilters, setSalesReturnListFilters] = useState(blankSalesReturnListFilters);
    const [receivableListFilters, setReceivableListFilters] = useState(blankReceivableListFilters);
    const [payableListFilters, setPayableListFilters] = useState(blankPayableListFilters);
    const [salesReportFilters, setSalesReportFilters] = useState(blankSalesReportFilters);
    const [pharmacyReportFilters, setPharmacyReportFilters] = useState(blankSalesReportFilters);
    const [financeReportFilters, setFinanceReportFilters] = useState(blankSalesReportFilters);
    const [inventoryDetailFilters, setInventoryDetailFilters] = useState({
        ...blankInventoryDetailFilters,
        warehouse_id: inventoryDetailWarehouseId,
    });
    const [receivingListFilters, setReceivingListFilters] = useState(blankReceivingListFilters);
    const [stockTransferListFilters, setStockTransferListFilters] = useState(blankStockTransferListFilters);
    const [representativeListFilters, setRepresentativeListFilters] = useState(blankRepresentativeListFilters);
    const [warehouseListFilters, setWarehouseListFilters] = useState(blankWarehouseListFilters);
    const baseScreen = officeModules[pageKey] || officeModules.companies;
    const liveEndpoint = isProductsPage
        ? buildProductListEndpoint(productListFilters)
        : isCompaniesPage
            ? buildCompanyListEndpoint(companyListFilters)
            : isProductCategoriesPage
                ? buildProductCategoryListEndpoint(productCategoryListFilters)
                : isFinanceCategoriesPage
                    ? buildFinanceCategoryListEndpoint(financeCategoryListFilters)
                    : isUnitsPage
                        ? buildUnitListEndpoint(unitListFilters)
                        : isPharmaciesPage
                            ? buildPharmacyListEndpoint(pharmacyListFilters)
                            : isRepresentativesPage
                                ? buildRepresentativeListEndpoint(representativeListFilters)
                                : isWarehousesPage
                                    ? buildWarehouseListEndpoint(warehouseListFilters)
                                    : isReceivingPage
                                        ? buildReceivingListEndpoint(receivingListFilters)
                                        : isStockTransfersPage
                                            ? buildStockTransferListEndpoint(stockTransferListFilters)
                                            : isInventoryPage
                                                ? buildInventoryListEndpoint(inventoryListFilters)
                                                : isInventoryDetailPage
                                                    ? buildInventoryDetailEndpoint(inventoryDetailProductId, inventoryDetailFilters)
                                                        : isFinanceTransactionsPage
                                                            ? buildFinanceTransactionListEndpoint(financeTransactionListFilters)
                                                            : isReceivablesPage
                                                                ? buildReceivableListEndpoint(receivableListFilters)
                                                                    : isPayablesPage
                                                                        ? buildPayableListEndpoint(payableListFilters)
                                                                        : isPaymentsPage
                                                                            ? buildPaymentListEndpoint(paymentListFilters)
                                                                            : isSalesReturnsPage
                                                                                ? buildSalesReturnListEndpoint(salesReturnListFilters)
                                                                                : isOrdersPage
                                                                                    ? buildOrderListEndpoint(orderListFilters, selectedOrderId)
                                                                                    : isInvoicesPage
                                                                                        ? buildInvoiceListEndpoint(invoiceListFilters)
                                                                                        : getOfficeEndpoint(pageKey);
    const liveResource = useApiResource(liveEndpoint);
    const productCompaniesResource = useApiResource(isProductsPage || isPharmaciesPage || isReceivingPage || isStockTransfersPage || isStockWorkspacePage || isStockTransferCreatePage || isFinanceBalancePage || isPaymentsPage || isSalesReturnsPage || isOrdersPage || isInvoicesPage || isLiveReportPage ? '/lookups/companies' : isRepresentativesPage ? '/office/companies?per_page=100' : '');
    const productCategoriesResource = useApiResource(isProductsPage || isProductCategoriesPage ? '/lookups/product-categories' : '');
    const productUnitsResource = useApiResource(isProductsPage ? '/lookups/units' : '');
    const receivingWarehousesResource = useApiResource(isReceivingPage || isStockTransfersPage || isStockWorkspacePage || isStockTransferCreatePage || isOrdersPage || isPharmaciesPage ? '/office/warehouses?per_page=100' : '');
    const salesReportResource = useApiResource(isSalesReportsPage ? buildSalesReportEndpoint(salesReportFilters) : '');
    const pharmacyReportResource = useApiResource(isPharmacyReportsPage ? buildPharmacyReportEndpoint(pharmacyReportFilters) : '');
    const financeReportResource = useApiResource(isFinanceReportsPage ? buildFinanceReportEndpoint(financeReportFilters) : '');
    const financeCategoriesResource = useApiResource(isFinanceTransactionsPage ? '/office/finance-categories?status=active&per_page=100' : '');
    const invoicePrintSettingsResource = useApiResource(isSettingsPage ? '/office/settings/invoice-print' : '');
    const liveRows = liveResource.data ? mapOfficeRows(pageKey, liveResource.data) : [];
    const visibleLiveRows = isInvoicesPage ? mergeGeneratedInvoiceRows(liveRows) : liveRows;
    const hasRowsToDisplay = Boolean(liveResource.data) || (isInvoicesPage && visibleLiveRows.length > 0);
    const liveScreen = liveEndpoint ? applyLiveRows(baseScreen, visibleLiveRows, hasRowsToDisplay) : baseScreen;
    const inventoryDetailProduct = liveResource.data?.product;
    const inventoryDetailProductName = inventoryDetailProduct?.name || routeSearchParams.get('product_name') || window.sessionStorage.getItem('selected_inventory_product_name') || '';
    const inventoryDetailSummary = liveResource.data?.summary;
    const inventoryDetailUnit = inventoryDetailProduct?.base_unit?.abbreviation || inventoryDetailProduct?.base_unit?.name || 'base units';
    const inventorySummary = liveResource.data?.summary;
    const financeSummary = liveResource.data?.summary;
    const screen = isFinanceTransactionsPage ? {
        ...liveScreen,
        summaries: financeSummary ? [
            {
                label: 'Income',
                value: formatAmount(financeSummary.income_amount || 0),
                note: 'Recorded income',
            },
            {
                label: 'Outcome',
                value: formatAmount(financeSummary.outcome_amount || 0),
                note: 'Recorded outcome',
            },
            {
                label: 'Net cash',
                value: formatAmount(Number(financeSummary.income_amount || 0) - Number(financeSummary.outcome_amount || 0)),
                note: 'Income minus outcome',
            },
            {
                label: 'Transactions',
                value: formatAmount(financeSummary.transaction_count || 0),
                note: `${formatAmount(financeSummary.void_count || 0)} void`,
            },
        ] : null,
    } : isSalesReturnsPage ? {
        ...liveScreen,
        summaries: financeSummary ? [
            { label: 'Return records', value: formatAmount(financeSummary.return_count || 0), note: 'Filtered return history' },
            { label: 'Return amount', value: formatAmount(financeSummary.return_amount || 0), note: 'Total returned value' },
            { label: 'Payment amount', value: formatAmount(financeSummary.payment_amount || 0), note: 'Paid amount on linked invoices' },
        ] : null,
    } : isFinanceBalancePage ? {
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
            ...(isReceivablesPage ? [
                {
                    label: 'Customer credit',
                    value: formatAmount(financeSummary.customer_credit_amount || 0),
                    note: 'Returns or overpaid balance',
                },
                {
                    label: 'Net receivable',
                    value: formatAmount(financeSummary.net_receivable_amount || 0),
                    note: 'Receivable minus customer credit',
                },
            ] : []),
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
            { label: 'Stock value', value: formatAmount(inventoryDetailSummary.stock_value_amount || 0), note: 'Available stock at receipt cost' },
            { label: 'Nearest expiry', value: inventoryDetailSummary.nearest_expiry_date || '-', note: 'Earliest batch date' },
        ] : isInventoryPage && inventorySummary ? [
            { label: 'Stock rows', value: formatAmount(inventorySummary.stock_row_count || 0), note: 'Filtered product rows' },
            { label: 'Available stock', value: formatAmount(inventorySummary.available_base_quantity || 0), note: 'Total base units' },
            { label: 'Reserved stock', value: formatAmount(inventorySummary.reserved_base_quantity || 0), note: 'Held by orders' },
            { label: 'Stock value', value: formatAmount(inventorySummary.stock_value_amount || 0), note: 'Available stock at receipt cost' },
        ] : null,
    } : liveScreen;

    useEffect(() => {
        if (!isSettingsPage || !invoicePrintSettingsResource.data?.settings) {
            return;
        }

        setInvoicePrintSettings(invoicePrintSettingsResource.data.settings);
        setInvoicePrintError('');
    }, [isSettingsPage, invoicePrintSettingsResource.data]);

    const updateInvoicePrintSetting = (key, value) => {
        setInvoicePrintSuccess('');
        setInvoicePrintSettings((settings) => settings.map((setting) => (
            setting.key === key ? { ...setting, value } : setting
        )));
    };

    const saveInvoicePrintSettings = async () => {
        setInvoicePrintSaving(true);
        setInvoicePrintError('');
        setInvoicePrintSuccess('');

        try {
            const response = await api.put('/office/settings/invoice-print', {
                settings: invoicePrintSettings.map((setting) => ({
                    key: setting.key,
                    value: setting.value ?? '',
                })),
            });

            setInvoicePrintSettings(response.settings || []);
            setInvoicePrintSuccess(response.message || 'Invoice print settings saved.');
            invoicePrintSettingsResource.refresh();
        } catch (error) {
            setInvoicePrintError(error.message);
        } finally {
            setInvoicePrintSaving(false);
        }
    };

    const showFilterToolbar = isStockWorkspacePage || isCompaniesPage || isProductCategoriesPage || isProductsPage || isUnitsPage || isPharmaciesPage || isReceivingPage || isRepresentativesPage || isWarehousesPage || isFinancePage || screen.showFilterToolbar !== false;
    const showViewAction = !isStockWorkspacePage && !isRepresentativesPage && screen.showViewAction !== false;
    const disableRowDetailDialog = isCompaniesPage || isFinanceCategoriesPage || isProductCategoriesPage || isUnitsPage || isWarehousesPage;
    const showEditAction = !isStockWorkspacePage && screen.showEditAction !== false;
    const isManagedCrudPage = isCompaniesPage || isFinanceCategoriesPage || isFinanceTransactionsPage || isPharmaciesPage || isProductCategoriesPage || isProductsPage || isReceivingPage || isRepresentativesPage || isUnitsPage || isWarehousesPage;
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
    const [financeCategoryForm, setFinanceCategoryForm] = useState(blankFinanceCategoryForm);
    const [financeCategoryError, setFinanceCategoryError] = useState('');
    const [financeCategorySubmitting, setFinanceCategorySubmitting] = useState(false);
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
    const [stockTransferForm, setStockTransferForm] = useState(blankStockTransferForm);
    const [stockTransferError, setStockTransferError] = useState('');
    const [stockTransferSubmitting, setStockTransferSubmitting] = useState(false);
    const [stockTransferRouteApplied, setStockTransferRouteApplied] = useState(false);
    const [customerPaymentForm, setCustomerPaymentForm] = useState(blankCustomerPaymentForm);
    const [customerPaymentError, setCustomerPaymentError] = useState('');
    const [customerPaymentSubmitting, setCustomerPaymentSubmitting] = useState(false);
    const [companyPaymentForm, setCompanyPaymentForm] = useState(blankCompanyPaymentForm);
    const [companyPaymentError, setCompanyPaymentError] = useState('');
    const [companyPaymentSubmitting, setCompanyPaymentSubmitting] = useState(false);
    const [financeTransactionForm, setFinanceTransactionForm] = useState(blankFinanceTransactionForm);
    const [financeTransactionError, setFinanceTransactionError] = useState('');
    const [financeTransactionSubmitting, setFinanceTransactionSubmitting] = useState(false);
    const [officeOrderForm, setOfficeOrderForm] = useState(blankOfficeOrderForm);
    const [officeOrderLines, setOfficeOrderLines] = useState([{ ...blankOfficeOrderLine }]);
    const [officeOrderError, setOfficeOrderError] = useState('');
    const [officeOrderEditingRecord, setOfficeOrderEditingRecord] = useState(null);
    const [officeOrderModalOpen, setOfficeOrderModalOpen] = useState(false);
    const [officeOrderSubmitting, setOfficeOrderSubmitting] = useState(false);
    const [approvalOrder, setApprovalOrder] = useState(null);
    const [approvalForm, setApprovalForm] = useState(blankApprovalForm);
    const [approvalError, setApprovalError] = useState('');
    const [approvalModalOpen, setApprovalModalOpen] = useState(false);
    const [approvalSubmitting, setApprovalSubmitting] = useState(false);
    const [salesReturnModalOpen, setSalesReturnModalOpen] = useState(false);
    const [salesReturnForm, setSalesReturnForm] = useState(blankSalesReturnForm);
    const [salesReturnInvoice, setSalesReturnInvoice] = useState(null);
    const [salesReturnRecord, setSalesReturnRecord] = useState(null);
    const [salesReturnError, setSalesReturnError] = useState('');
    const [salesReturnLoading, setSalesReturnLoading] = useState(false);
    const [salesReturnSubmitting, setSalesReturnSubmitting] = useState(false);
    const [deliverySubmitting, setDeliverySubmitting] = useState(false);
    const receivingProductsResource = useApiResource(isReceivingPage && modalOpen && stockReceiptForm.company_id ? `/lookups/products?company_id=${stockReceiptForm.company_id}` : '');
    const stockTransferProductsResource = useApiResource(isStockTransferCreatePage && stockTransferForm.company_id ? `/lookups/products?company_id=${stockTransferForm.company_id}` : '');
    const stockAdjustmentProductsResource = useApiResource(isStockWorkspacePage && modalOpen && stockAdjustmentForm.company_id ? `/lookups/products?company_id=${stockAdjustmentForm.company_id}` : '');
    const officeOrderCustomersResource = useApiResource(officeOrderModalOpen ? '/lookups/customers' : '');
    const officeOrderRepresentativesResource = useApiResource(officeOrderModalOpen && officeOrderForm.company_id ? `/lookups/sales-representatives?company_id=${officeOrderForm.company_id}` : '');
    const officeOrderProductsResource = useApiResource(officeOrderModalOpen && officeOrderForm.company_id ? `/lookups/products?company_id=${officeOrderForm.company_id}` : '');
    const officeOrderStockResource = useApiResource(officeOrderModalOpen && officeOrderForm.company_id && officeOrderForm.warehouse_id ? `/office/stock/current?company_id=${officeOrderForm.company_id}&warehouse_id=${officeOrderForm.warehouse_id}&per_page=100` : '', { keepPreviousData: true });
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
    const modalBusy = companyPaymentSubmitting || companySubmitting || customerPaymentSubmitting || deliverySubmitting || financeCategorySubmitting || financeTransactionSubmitting || officeOrderSubmitting || pharmacySubmitting || productCategorySubmitting || productSubmitting || salesRepresentativeSubmitting || salesReturnSubmitting || stockAdjustmentSubmitting || stockReceiptSubmitting || stockTransferSubmitting || unitSubmitting || warehouseSubmitting;
    const approvalBusy = approvalSubmitting || receivingWarehousesResource.loading;
    const orderCreditStatuses = normalizeCreditStatuses(selectedRecord?.creditStatuses || modalScreen.creditStatuses || []);
    const selectedCreditStatus = getCompanyCreditStatus(orderCreditStatuses, selectedOrderCompany);
    const orderCreateBlocked = isOrderCreateModal && isBlockedCredit(selectedCreditStatus?.status);
    const productCompanies = unwrapCollection(productCompaniesResource.data);
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
    const openInvoiceReport = () => {
        window.open(buildInvoiceReportUrl(invoiceListFilters), '_blank', 'noopener,noreferrer');
    };
    const openInventoryReport = () => {
        window.open(buildInventoryReportUrl(inventoryListFilters), '_blank', 'noopener,noreferrer');
    };
    const isActionListPage = isPharmaciesPage || isOrdersPage || isInvoicesPage || isReceivingPage || isInventoryPage || isReceivablesPage || isPayablesPage;
    const actionListMode = isPharmaciesPage
        ? pharmacyListFilters.action_only
        : isOrdersPage
            ? orderListFilters.action_only
            : isInvoicesPage
                ? invoiceListFilters.action_only
                : isReceivingPage
                    ? receivingListFilters.action_only
                    : isInventoryPage
                        ? inventoryListFilters.action_only
                        : isReceivablesPage
                            ? receivableListFilters.action_only
                            : isPayablesPage
                                ? payableListFilters.action_only
                                : false;
    const updateActionListMode = (actionOnly) => {
        const updateMode = (setter) => setter((current) => ({ ...current, action_only: actionOnly, page: 1 }));

        if (isPharmaciesPage) {
            updateMode(setPharmacyListFilters);
        } else if (isOrdersPage) {
            updateMode(setOrderListFilters);
        } else if (isInvoicesPage) {
            updateMode(setInvoiceListFilters);
        } else if (isReceivingPage) {
            updateMode(setReceivingListFilters);
        } else if (isInventoryPage) {
            updateMode(setInventoryListFilters);
        } else if (isReceivablesPage) {
            updateMode(setReceivableListFilters);
        } else if (isPayablesPage) {
            updateMode(setPayableListFilters);
        }
    };
    const financeTransactionPagination = isFinanceTransactionsPage && liveResource.data ? {
        currentPage: Number(liveResource.data.current_page || 1),
        from: Number(liveResource.data.from || 0),
        lastPage: Number(liveResource.data.last_page || 1),
        perPage: Number(liveResource.data.per_page || 15),
        to: Number(liveResource.data.to || 0),
        total: Number(liveResource.data.total || 0),
    } : null;
    const financeCategoryPagination = isFinanceCategoriesPage && liveResource.data ? {
        currentPage: Number(liveResource.data.current_page || 1),
        from: Number(liveResource.data.from || 0),
        lastPage: Number(liveResource.data.last_page || 1),
        perPage: Number(liveResource.data.per_page || 15),
        to: Number(liveResource.data.to || 0),
        total: Number(liveResource.data.total || 0),
    } : null;
    const orderPagination = isOrdersPage && liveResource.data ? {
        currentPage: Number(liveResource.data.current_page || 1),
        from: Number(liveResource.data.from || 0),
        lastPage: Number(liveResource.data.last_page || 1),
        perPage: Number(liveResource.data.per_page || 25),
        to: Number(liveResource.data.to || 0),
        total: Number(liveResource.data.total || 0),
    } : null;
    const invoicePagination = isInvoicesPage && liveResource.data ? {
        currentPage: Number(liveResource.data.current_page || 1),
        from: Number(liveResource.data.from || 0),
        lastPage: Number(liveResource.data.last_page || 1),
        perPage: Number(liveResource.data.per_page || 25),
        to: Number(liveResource.data.to || 0),
        total: Number(liveResource.data.total || 0),
    } : null;
    const paymentPagination = isPaymentsPage && liveResource.data ? {
        currentPage: Number(liveResource.data.current_page || 1),
        from: Number(liveResource.data.from || 0),
        lastPage: Number(liveResource.data.last_page || 1),
        perPage: Number(liveResource.data.per_page || 25),
        to: Number(liveResource.data.to || 0),
        total: Number(liveResource.data.total || 0),
    } : null;
    const salesReturnPagination = isSalesReturnsPage && liveResource.data ? {
        currentPage: Number(liveResource.data.current_page || 1),
        from: Number(liveResource.data.from || 0),
        lastPage: Number(liveResource.data.last_page || 1),
        perPage: Number(liveResource.data.per_page || 25),
        to: Number(liveResource.data.to || 0),
        total: Number(liveResource.data.total || 0),
    } : null;
    const goToOrderPage = (page) => {
        setOrderListFilters((current) => ({ ...current, page: Math.max(1, page) }));
    };
    const goToInvoicePage = (page) => {
        setInvoiceListFilters((current) => ({ ...current, page: Math.max(1, page) }));
    };
    const goToPaymentPage = (page) => {
        setPaymentListFilters((current) => ({ ...current, page: Math.max(1, page) }));
    };
    const goToSalesReturnPage = (page) => {
        setSalesReturnListFilters((current) => ({ ...current, page: Math.max(1, page) }));
    };
    const orderListFilterControls = [
        {
            key: 'company_id',
            label: 'Company',
            options: productCompanies.map((company) => ({ label: company.name, value: String(company.id) })),
            placeholder: productCompaniesResource.loading ? 'Loading companies' : 'All companies',
            value: orderListFilters.company_id,
        },
        {
            key: 'status',
            label: 'Status',
            options: [
                { label: 'Draft', value: 'draft' },
                { label: 'Submitted', value: 'submitted' },
                { label: 'Approved', value: 'approved' },
                { label: 'Invoiced', value: 'invoiced' },
                { label: 'Delivered', value: 'delivered' },
                { label: 'Rejected', value: 'rejected' },
                { label: 'Cancelled', value: 'cancelled' },
            ],
            placeholder: 'All statuses',
            value: orderListFilters.status,
        },
    ];
    const updateOrderListSearch = (value) => {
        setOrderListFilters((current) => forceShowAllOnSearch(current, value));
    };
    const updateOrderListFilter = (key, value) => {
        setOrderListFilters((current) => ({ ...current, [key]: value, page: 1 }));
    };
    const updateOrderListDateFrom = (value) => {
        setOrderListFilters((current) => ({ ...current, date_from: value, page: 1 }));
    };
    const updateOrderListDateTo = (value) => {
        setOrderListFilters((current) => ({ ...current, date_to: value, page: 1 }));
    };
    const resetOrderListFilters = () => {
        setOrderListFilters(blankOrderListFilters);
    };
    const invoiceListFilterControls = [
        {
            key: 'company_id',
            label: 'Company',
            options: productCompanies.map((company) => ({ label: company.name, value: String(company.id) })),
            placeholder: productCompaniesResource.loading ? 'Loading companies' : 'All companies',
            value: invoiceListFilters.company_id,
        },
        {
            key: 'status',
            label: 'Status',
            options: [
                { label: 'Issued', value: 'issued' },
                { label: 'Partial', value: 'partial' },
                { label: 'Paid', value: 'paid' },
                { label: 'Void', value: 'void' },
            ],
            placeholder: 'All statuses',
            value: invoiceListFilters.status,
        },
    ];
    const updateInvoiceListSearch = (value) => {
        setInvoiceListFilters((current) => forceShowAllOnSearch(current, value));
    };
    const updateInvoiceListFilter = (key, value) => {
        setInvoiceListFilters((current) => ({ ...current, [key]: value, page: 1 }));
    };
    const updateInvoiceListDateFrom = (value) => {
        setInvoiceListFilters((current) => ({ ...current, date_from: value, page: 1 }));
    };
    const updateInvoiceListDateTo = (value) => {
        setInvoiceListFilters((current) => ({ ...current, date_to: value, page: 1 }));
    };
    const resetInvoiceListFilters = () => {
        setInvoiceListFilters(blankInvoiceListFilters);
    };
    const paymentListFilterControls = [
        {
            key: 'company_id',
            label: 'Company',
            options: productCompanies.map((company) => ({ label: company.name, value: String(company.id) })),
            placeholder: productCompaniesResource.loading ? 'Loading companies' : 'All companies',
            value: paymentListFilters.company_id,
        },
    ];
    const updatePaymentListSearch = (value) => {
        setPaymentListFilters((current) => ({ ...current, page: 1, search: value }));
    };
    const updatePaymentListFilter = (key, value) => {
        setPaymentListFilters((current) => ({ ...current, [key]: value, page: 1 }));
    };
    const updatePaymentListDateFrom = (value) => {
        setPaymentListFilters((current) => ({ ...current, date_from: value, page: 1 }));
    };
    const updatePaymentListDateTo = (value) => {
        setPaymentListFilters((current) => ({ ...current, date_to: value, page: 1 }));
    };
    const resetPaymentListFilters = () => {
        setPaymentListFilters(blankPaymentListFilters);
    };
    const salesReturnListFilterControls = [
        {
            key: 'company_id',
            label: 'Company',
            options: productCompanies.map((company) => ({ label: company.name, value: String(company.id) })),
            placeholder: productCompaniesResource.loading ? 'Loading companies' : 'All companies',
            value: salesReturnListFilters.company_id,
        },
        {
            key: 'status',
            label: 'Status',
            options: [
                { label: 'Posted', value: 'posted' },
                { label: 'Void', value: 'void' },
            ],
            placeholder: 'All statuses',
            value: salesReturnListFilters.status,
        },
    ];
    const updateSalesReturnListSearch = (value) => {
        setSalesReturnListFilters((current) => ({ ...current, page: 1, search: value }));
    };
    const updateSalesReturnListFilter = (key, value) => {
        setSalesReturnListFilters((current) => ({ ...current, [key]: value, page: 1 }));
    };
    const updateSalesReturnListDateFrom = (value) => {
        setSalesReturnListFilters((current) => ({ ...current, date_from: value, page: 1 }));
    };
    const updateSalesReturnListDateTo = (value) => {
        setSalesReturnListFilters((current) => ({ ...current, date_to: value, page: 1 }));
    };
    const resetSalesReturnListFilters = () => {
        setSalesReturnListFilters(blankSalesReturnListFilters);
    };
    const companyPagination = isCompaniesPage && liveResource.data ? {
        currentPage: Number(liveResource.data.current_page || 1),
        from: Number(liveResource.data.from || 0),
        lastPage: Number(liveResource.data.last_page || 1),
        perPage: Number(liveResource.data.per_page || 15),
        to: Number(liveResource.data.to || 0),
        total: Number(liveResource.data.total || 0),
    } : null;
    const companyListFilterControls = [
        {
            key: 'status',
            label: 'Status',
            options: [
                { label: 'Active', value: 'active' },
                { label: 'Inactive', value: 'inactive' },
            ],
            placeholder: 'All statuses',
            value: companyListFilters.status,
        },
    ];
    const updateCompanyListSearch = (value) => {
        setCompanyListFilters((current) => ({ ...current, page: 1, search: value }));
    };
    const updateCompanyListFilter = (key, value) => {
        setCompanyListFilters((current) => ({ ...current, [key]: value, page: 1 }));
    };
    const resetCompanyListFilters = () => {
        setCompanyListFilters(blankCompanyListFilters);
    };
    const goToCompanyPage = (page) => {
        setCompanyListFilters((current) => ({ ...current, page: Math.max(1, page) }));
    };
    const productCategoryPagination = isProductCategoriesPage && liveResource.data ? {
        currentPage: Number(liveResource.data.current_page || 1),
        from: Number(liveResource.data.from || 0),
        lastPage: Number(liveResource.data.last_page || 1),
        perPage: Number(liveResource.data.per_page || 15),
        to: Number(liveResource.data.to || 0),
        total: Number(liveResource.data.total || 0),
    } : null;
    const productCategoryListFilterControls = [
        {
            key: 'status',
            label: 'Status',
            options: [
                { label: 'Active', value: 'active' },
                { label: 'Inactive', value: 'inactive' },
            ],
            placeholder: 'All statuses',
            value: productCategoryListFilters.status,
        },
    ];
    const updateProductCategoryListSearch = (value) => {
        setProductCategoryListFilters((current) => ({ ...current, page: 1, search: value }));
    };
    const updateProductCategoryListFilter = (key, value) => {
        setProductCategoryListFilters((current) => ({ ...current, [key]: value, page: 1 }));
    };
    const resetProductCategoryListFilters = () => {
        setProductCategoryListFilters(blankProductCategoryListFilters);
    };
    const goToProductCategoryPage = (page) => {
        setProductCategoryListFilters((current) => ({ ...current, page: Math.max(1, page) }));
    };
    const unitPagination = isUnitsPage && liveResource.data ? {
        currentPage: Number(liveResource.data.current_page || 1),
        from: Number(liveResource.data.from || 0),
        lastPage: Number(liveResource.data.last_page || 1),
        perPage: Number(liveResource.data.per_page || 15),
        to: Number(liveResource.data.to || 0),
        total: Number(liveResource.data.total || 0),
    } : null;
    const unitListFilterControls = [
        {
            key: 'status',
            label: 'Status',
            options: [
                { label: 'Active', value: 'active' },
                { label: 'Inactive', value: 'inactive' },
            ],
            placeholder: 'All statuses',
            value: unitListFilters.status,
        },
    ];
    const updateUnitListSearch = (value) => {
        setUnitListFilters((current) => ({ ...current, page: 1, search: value }));
    };
    const updateUnitListFilter = (key, value) => {
        setUnitListFilters((current) => ({ ...current, [key]: value, page: 1 }));
    };
    const resetUnitListFilters = () => {
        setUnitListFilters(blankUnitListFilters);
    };
    const goToUnitPage = (page) => {
        setUnitListFilters((current) => ({ ...current, page: Math.max(1, page) }));
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
        setPharmacyListFilters((current) => forceShowAllOnSearch(current, value));
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
    const financeCategoryOptions = (unwrapCollection(financeCategoriesResource.data).length
        ? unwrapCollection(financeCategoriesResource.data).map((category) => ({
            label: category.name,
            value: category.code,
            direction: category.direction,
        }))
        : fallbackFinanceCategoryOptions);
    const financeTransactionFilterControls = [
        {
            key: 'direction',
            label: 'Type',
            options: [
                { label: 'Income', value: 'income' },
                { label: 'Outcome', value: 'outcome' },
            ],
            placeholder: 'All types',
            value: financeTransactionListFilters.direction,
        },
        {
            key: 'category',
            label: 'Category',
            options: financeCategoryOptions.map((category) => ({ label: category.label, value: category.value })),
            placeholder: 'All categories',
            value: financeTransactionListFilters.category,
        },
    ];
    const updateFinanceTransactionListSearch = (value) => {
        setFinanceTransactionListFilters((current) => ({ ...current, page: 1, search: value }));
    };
    const updateFinanceTransactionListFilter = (key, value) => {
        setFinanceTransactionListFilters((current) => ({ ...current, [key]: value, page: 1 }));
    };
    const resetFinanceTransactionListFilters = () => {
        setFinanceTransactionListFilters(blankFinanceTransactionListFilters);
    };
    const goToFinanceTransactionPage = (page) => {
        setFinanceTransactionListFilters((current) => ({ ...current, page: Math.max(1, page) }));
    };
    const financeCategoryListFilterControls = [
        {
            key: 'direction',
            label: 'Type',
            options: [
                { label: 'Income', value: 'income' },
                { label: 'Outcome', value: 'outcome' },
                { label: 'Both', value: 'both' },
            ],
            placeholder: 'All types',
            value: financeCategoryListFilters.direction,
        },
        {
            key: 'status',
            label: 'Status',
            options: [
                { label: 'Active', value: 'active' },
                { label: 'Inactive', value: 'inactive' },
            ],
            placeholder: 'All statuses',
            value: financeCategoryListFilters.status,
        },
    ];
    const updateFinanceCategoryListSearch = (value) => {
        setFinanceCategoryListFilters((current) => ({ ...current, page: 1, search: value }));
    };
    const updateFinanceCategoryListFilter = (key, value) => {
        setFinanceCategoryListFilters((current) => ({ ...current, [key]: value, page: 1 }));
    };
    const resetFinanceCategoryListFilters = () => {
        setFinanceCategoryListFilters(blankFinanceCategoryListFilters);
    };
    const goToFinanceCategoryPage = (page) => {
        setFinanceCategoryListFilters((current) => ({ ...current, page: Math.max(1, page) }));
    };
    const salesReportFilterControls = [
        {
            key: 'duration',
            label: 'Duration',
            options: [
                { label: 'Today', value: 'today' },
                { label: 'This week', value: 'week' },
                { label: 'Month', value: 'month' },
                { label: 'Year', value: 'year' },
            ],
            placeholder: 'Duration',
            value: salesReportFilters.duration,
        },
        {
            key: 'date_from',
            label: 'From date',
            type: 'date',
            value: salesReportFilters.date_from,
        },
        {
            key: 'date_to',
            label: 'To date',
            type: 'date',
            value: salesReportFilters.date_to,
        },
        {
            key: 'company_id',
            label: 'Company',
            options: productCompanies.map((company) => ({ label: company.name, value: String(company.id) })),
            placeholder: productCompaniesResource.loading ? 'Loading companies' : 'All companies',
            value: salesReportFilters.company_id,
        },
    ];
    const pharmacyReportFilterControls = [
        {
            key: 'duration',
            label: 'Duration',
            options: [
                { label: 'Today', value: 'today' },
                { label: 'This week', value: 'week' },
                { label: 'Month', value: 'month' },
                { label: 'Year', value: 'year' },
            ],
            placeholder: 'Duration',
            value: pharmacyReportFilters.duration,
        },
        {
            key: 'date_from',
            label: 'From date',
            type: 'date',
            value: pharmacyReportFilters.date_from,
        },
        {
            key: 'date_to',
            label: 'To date',
            type: 'date',
            value: pharmacyReportFilters.date_to,
        },
        {
            key: 'company_id',
            label: 'Company',
            options: productCompanies.map((company) => ({ label: company.name, value: String(company.id) })),
            placeholder: productCompaniesResource.loading ? 'Loading companies' : 'All companies',
            value: pharmacyReportFilters.company_id,
        },
    ];
    const financeReportFilterControls = [
        {
            key: 'duration',
            label: 'Duration',
            options: [
                { label: 'Month', value: 'month' },
                { label: 'Year', value: 'year' },
            ],
            placeholder: 'Duration',
            value: financeReportFilters.duration,
        },
        {
            key: 'date_from',
            label: 'From date',
            type: 'date',
            value: financeReportFilters.date_from,
        },
        {
            key: 'date_to',
            label: 'To date',
            type: 'date',
            value: financeReportFilters.date_to,
        },
        {
            key: 'company_id',
            label: 'Company',
            options: productCompanies.map((company) => ({ label: company.name, value: String(company.id) })),
            placeholder: productCompaniesResource.loading ? 'Loading companies' : 'All companies',
            value: financeReportFilters.company_id,
        },
    ];
    const updateSalesReportFilter = (key, value) => {
        setSalesReportFilters((current) => {
            if (key === 'duration') {
                const duration = value || blankSalesReportFilters.duration;

                return {
                    ...current,
                    ...reportRangeForDuration(duration),
                    duration,
                };
            }

            return { ...current, [key]: value };
        });
    };
    const resetSalesReportFilters = () => {
        setSalesReportFilters(blankSalesReportFilters);
    };
    const updatePharmacyReportFilter = (key, value) => {
        setPharmacyReportFilters((current) => {
            if (key === 'duration') {
                const duration = value || blankSalesReportFilters.duration;

                return {
                    ...current,
                    ...reportRangeForDuration(duration),
                    duration,
                };
            }

            return { ...current, [key]: value };
        });
    };
    const resetPharmacyReportFilters = () => {
        setPharmacyReportFilters(blankSalesReportFilters);
    };
    const updateFinanceReportFilter = (key, value) => {
        setFinanceReportFilters((current) => {
            if (key === 'duration') {
                const duration = value || blankSalesReportFilters.duration;

                return {
                    ...current,
                    ...reportRangeForDuration(duration),
                    duration,
                };
            }

            return { ...current, [key]: value };
        });
    };
    const resetFinanceReportFilters = () => {
        setFinanceReportFilters(blankSalesReportFilters);
    };
    const productCategories = unwrapCollection(productCategoriesResource.data);
    const receivingWarehouses = unwrapCollection(receivingWarehousesResource.data);
    const receivingProducts = unwrapCollection(receivingProductsResource.data);
    const stockAdjustmentProducts = unwrapCollection(stockAdjustmentProductsResource.data);
    const stockTransferProducts = unwrapCollection(stockTransferProductsResource.data);
    const officeOrderCustomers = unwrapCollection(officeOrderCustomersResource.data);
    const officeOrderProducts = unwrapCollection(officeOrderProductsResource.data);
    const officeOrderRepresentatives = unwrapCollection(officeOrderRepresentativesResource.data);
    const officeOrderStockRows = unwrapCollection(officeOrderStockResource.data);
    const officeOrderSelectedCustomer = officeOrderCustomers.find((customer) => String(customer.id) === String(officeOrderForm.customer_id));
    const officeOrderSelectedCredit = officeOrderSelectedCustomer?.credit_statuses?.find((credit) => String(credit.company_id) === String(officeOrderForm.company_id));
    const officeOrderLockedCustomer = officeOrderModalOpen && !officeOrderEditingRecord && selectedRecord?.creditStatuses ? selectedRecord : null;
    const officeOrderLockedCredit = officeOrderLockedCustomer?.creditStatuses?.find((credit) => String(credit.company_id) === String(officeOrderForm.company_id));
    const officeOrderBlocked = officeOrderModalOpen && isBlockedCredit(titleCase(officeOrderSelectedCredit?.credit_status || officeOrderLockedCredit?.credit_status || 'ready'));
    const officeOrderRequiresWarehouse = officeOrderModalOpen && !officeOrderEditingRecord;
    const officeOrderMissingWarehouse = officeOrderRequiresWarehouse && !officeOrderForm.warehouse_id;
    const stockTransferSelectedQuantity = (stockTransferForm.lines || []).reduce((lineSum, line) => (
        lineSum + (line.items || []).reduce((itemSum, item) => itemSum + Number(item.base_unit_quantity || 0), 0)
    ), 0);
    const stockTransferMissingItems = isStockTransferCreatePage && stockTransferSelectedQuantity <= 0;
    const receivingPagination = isReceivingPage && liveResource.data ? {
        currentPage: Number(liveResource.data.current_page || 1),
        from: Number(liveResource.data.from || 0),
        lastPage: Number(liveResource.data.last_page || 1),
        perPage: Number(liveResource.data.per_page || 15),
        to: Number(liveResource.data.to || 0),
        total: Number(liveResource.data.total || 0),
    } : null;
    const stockTransferPagination = isStockTransfersPage && liveResource.data ? {
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
        setReceivingListFilters((current) => forceShowAllOnSearch(current, value));
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
    const stockTransferListFilterControls = [
        {
            key: 'company_id',
            label: 'Company',
            options: productCompanies.map((company) => ({ label: company.name, value: String(company.id) })),
            placeholder: productCompaniesResource.loading ? 'Loading companies' : 'All companies',
            value: stockTransferListFilters.company_id,
        },
        {
            key: 'source_warehouse_id',
            label: 'From',
            options: receivingWarehouses.map((warehouse) => ({ label: warehouse.name, value: String(warehouse.id) })),
            placeholder: receivingWarehousesResource.loading ? 'Loading warehouses' : 'Any source',
            value: stockTransferListFilters.source_warehouse_id,
        },
        {
            key: 'destination_warehouse_id',
            label: 'To',
            options: receivingWarehouses.map((warehouse) => ({ label: warehouse.name, value: String(warehouse.id) })),
            placeholder: receivingWarehousesResource.loading ? 'Loading warehouses' : 'Any destination',
            value: stockTransferListFilters.destination_warehouse_id,
        },
    ];
    const updateStockTransferListSearch = (value) => {
        setStockTransferListFilters((current) => ({ ...current, page: 1, search: value }));
    };
    const updateStockTransferListFilter = (key, value) => {
        setStockTransferListFilters((current) => ({ ...current, [key]: value, page: 1 }));
    };
    const resetStockTransferListFilters = () => {
        setStockTransferListFilters(blankStockTransferListFilters);
    };
    const goToStockTransferPage = (page) => {
        setStockTransferListFilters((current) => ({ ...current, page: Math.max(1, page) }));
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
        setInventoryListFilters((current) => forceShowAllOnSearch(current, value));
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
        setReceivableListFilters((current) => forceShowAllOnSearch(current, value));
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
        setPayableListFilters((current) => forceShowAllOnSearch(current, value));
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
                { label: 'Deleted', value: 'deleted' },
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

        onNavigate?.('order-detail', { order_id: selectedOrderId });
        setOpenedLinkedOrderId(selectedOrderId);
    }, [isOrdersPage, onNavigate, openedLinkedOrderId, screen.rows.length, selectedOrderId]);
    const closeWorkflowModal = () => {
        setModalOpen(false);
        setModalScreenKey(null);
        setOfficeOrderModalOpen(false);
        setOfficeOrderEditingRecord(null);
        setModalTitleOverride('');
        setModalSubmitLabelOverride('');
        setCompanyError('');
        setPharmacyError('');
        setProductCategoryError('');
        setFinanceCategoryError('');
        setProductError('');
        setCompanyPaymentError('');
        setCustomerPaymentError('');
        setFinanceTransactionError('');
        setOfficeOrderError('');
        setSalesRepresentativeError('');
        setStockAdjustmentError('');
        setStockReceiptError('');
        setStockTransferError('');
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
    const openFinanceCategoryForm = (record = null) => {
        const nextForm = record ? {
            name: record.name || '',
            code: record.code || '',
            direction: record.direction_value || String(record.direction || 'income').toLowerCase(),
            description: record.description || '',
            status: String(record.status || 'active').toLowerCase(),
        } : blankFinanceCategoryForm;

        setSelectedRecord(record || {});
        setFinanceCategoryForm(nextForm);
        setModalScreenKey(null);
        setModalTitleOverride(record ? 'Edit financial category' : 'Add financial category');
        setModalSubmitLabelOverride(record ? 'Save category' : 'Add category');
        setFinanceCategoryError('');
        setModalOpen(true);
    };
    const updateFinanceCategoryForm = (event) => {
        setFinanceCategoryForm((current) => ({ ...current, [event.target.name]: event.target.value }));
        setFinanceCategoryError('');
    };
    const submitFinanceCategoryForm = async () => {
        setFinanceCategorySubmitting(true);
        setFinanceCategoryError('');

        try {
            if (selectedRecord?.id) {
                await api.put(`/office/finance-categories/${selectedRecord.id}`, financeCategoryForm);
            } else {
                await api.post('/office/finance-categories', financeCategoryForm);
            }

            liveResource.refresh();
            financeCategoriesResource.refresh?.();
            closeWorkflowModal();
        } catch (requestError) {
            setFinanceCategoryError(requestError.message);
        } finally {
            setFinanceCategorySubmitting(false);
        }
    };
    const deleteFinanceCategory = async (record) => {
        setFinanceCategorySubmitting(true);
        setFinanceCategoryError('');

        try {
            await api.delete(`/office/finance-categories/${record.id}`);
            liveResource.refresh();
            financeCategoriesResource.refresh?.();
            closeConfirmAction();
        } catch (requestError) {
            setFinanceCategoryError(requestError.message);
        } finally {
            setFinanceCategorySubmitting(false);
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
            low_stock_threshold_sales_units: String(record.low_stock_threshold_sales_units ?? record.low_stock_threshold_base_units ?? 0),
            base_unit_selling_price: String(record.base_unit_selling_price ?? 0),
            product_units: recordProductUnits.map((unit) => ({
                unit_id: unit.unit_id || '',
                conversion_factor_to_base: String(unit.conversion_factor_to_base || 1),
                selling_price: String(unit.selling_price ?? 0),
                is_default_sales_unit: Boolean(unit.is_default_sales_unit),
                status: unit.status || 'active',
            })),
            foc_rules: focRuleFormsFromRecord(record),
            status: String(record.status || 'active').toLowerCase(),
        } : { ...blankProductForm, product_units: [], foc_rules: [] };

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
    const addProductFocRule = () => {
        setProductForm((current) => ({
            ...current,
            foc_rules: [
                ...(current.foc_rules || []),
                { ...blankFocRuleForm, enabled: true, local_id: `foc-rule-${Date.now()}` },
            ],
        }));
        setProductError('');
    };
    const removeProductFocRule = (index) => {
        setProductForm((current) => ({
            ...current,
            foc_rules: (current.foc_rules || []).filter((_, ruleIndex) => ruleIndex !== index),
        }));
        setProductError('');
    };
    const updateProductFocRule = (index, event) => {
        const { name, value } = event.target;

        setProductForm((current) => ({
            ...current,
            foc_rules: (current.foc_rules || []).map((rule, ruleIndex) => {
                if (ruleIndex !== index) {
                    return rule;
                }

                const nextRule = {
                    ...rule,
                    [name]: value,
                };

                if (name === 'rule_type') {
                    nextRule.minimum_quantity_base_units = value === 'quantity' ? rule.minimum_quantity_base_units : '';
                    nextRule.minimum_order_value = value === 'value' ? rule.minimum_order_value : '';
                }

                return nextRule;
            }),
        }));
        setProductError('');
    };
    const syncProductFocRules = async (savedProduct) => {
        const productId = savedProduct.id || selectedRecord?.id;
        const existingIds = (selectedRecord?.foc_rules_raw || []).map((rule) => String(rule.id)).filter(Boolean);
        const nextRules = productForm.foc_rules || [];
        const nextIds = nextRules.map((rule) => String(rule.id || '')).filter(Boolean);
        const removedIds = existingIds.filter((id) => !nextIds.includes(id));

        await Promise.all(removedIds.map((id) => api.delete(`/office/foc-rules/${id}`)));

        for (const rule of nextRules) {
            const payload = {
                company_id: savedProduct.company_id || productForm.company_id,
                product_id: productId,
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
            } else {
                await api.post('/office/foc-rules', payload);
            }
        }
    };
    const submitProductForm = async () => {
        setProductSubmitting(true);
        setProductError('');

        try {
            const payload = new FormData();
            Object.entries(productForm).forEach(([key, value]) => {
                if (['primary_image', 'primary_image_preview', 'product_units', 'foc_rule', 'foc_rules'].includes(key)) {
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
                await syncProductFocRules(updatedProduct);
            } else {
                const createdProduct = await api.post('/office/products', payload);
                await syncProductFocRules(createdProduct);
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
    const restoreProduct = async (record) => {
        if (!record?.id) {
            return;
        }

        setProductSubmitting(true);
        setProductError('');

        try {
            await api.post(`/office/products/${record.id}/restore`);
            liveResource.refresh();
            setDrawerOpen(false);
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

            notifyOperationalActionsChanged();
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
    const openStockTransferPage = (record = null) => {
        const sourceWarehouseId = record?.warehouse_id
            || (isInventoryDetailPage ? inventoryDetailFilters.warehouse_id : inventoryListFilters.warehouse_id)
            || '';

        onNavigate?.('stock-transfer-create', {
            company_id: record?.company_id || inventoryDetailCompanyId || inventoryDetailProduct?.company_id || inventoryListFilters.company_id || '',
            product_id: record?.product_id || inventoryDetailProductId || '',
            product_name: record?.product || inventoryDetailProductName || '',
            source_warehouse_id: sourceWarehouseId,
        });
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
    const openOrderInvoiceDetail = (order) => {
        setDrawerOpen(false);
        onNavigate?.(order?.invoice_id ? 'invoice-detail' : 'invoices', order?.invoice_id ? { invoice_id: order.invoice_id } : undefined);
    };
    const closeSalesReturnDialog = () => {
        setSalesReturnModalOpen(false);
        setSalesReturnForm(blankSalesReturnForm);
        setSalesReturnInvoice(null);
        setSalesReturnRecord(null);
        setSalesReturnError('');
        setSalesReturnLoading(false);
    };
    const openSalesReturnForm = async (record) => {
        const invoiceId = record?.invoice_id;

        if (!invoiceId) {
            window.alert('This delivered order does not have an invoice to return against.');
            return;
        }

        setSelectedRecord(record);
        setSalesReturnRecord(record);
        setSalesReturnModalOpen(true);
        setSalesReturnLoading(true);
        setSalesReturnError('');
        setSalesReturnInvoice(null);
        setSalesReturnForm({
            ...blankSalesReturnForm,
            invoice_id: invoiceId,
            warehouse_id: record?.warehouse_id || receivingWarehouses[0]?.id || '',
            return_date: new Date().toISOString().slice(0, 10),
        });

        try {
            const response = await api.get(`/office/invoices?invoice_id=${invoiceId}&per_page=1`);
            const [invoice] = mapInvoices(response);
            const items = (invoice?.invoiceItems || [])
                .filter((item) => Number(item.quantity || 0) > 0)
                .map(newSalesReturnLine);

            setSalesReturnInvoice(invoice || null);
            setSalesReturnForm((current) => ({
                ...current,
                invoice_id: invoice?.id || invoiceId,
                items,
            }));

            if (!invoice) {
                setSalesReturnError('Invoice could not be loaded for this order.');
            }
        } catch (requestError) {
            setSalesReturnError(requestError.message);
        } finally {
            setSalesReturnLoading(false);
        }
    };
    const updateSalesReturnForm = (event) => {
        const { name, value } = event.target;

        setSalesReturnForm((current) => ({ ...current, [name]: value }));
        setSalesReturnError('');
    };
    const updateSalesReturnItem = (index, event) => {
        const { name, value } = event.target;

        setSalesReturnForm((current) => ({
            ...current,
            items: current.items.map((item, itemIndex) => {
                if (itemIndex !== index) {
                    return item;
                }

                if (name === 'quantity') {
                    const maxQuantity = Number(item.max_quantity || 0);
                    const nextQuantity = Math.max(0, Math.min(maxQuantity, Number(value || 0)));

                    return { ...item, [name]: value === '' ? '' : String(nextQuantity) };
                }

                return { ...item, [name]: value };
            }),
        }));
        setSalesReturnError('');
    };
    const salesReturnPayload = () => ({
        invoice_id: salesReturnForm.invoice_id,
        warehouse_id: salesReturnForm.warehouse_id,
        return_date: salesReturnForm.return_date || null,
        reason: salesReturnForm.reason || null,
        items: salesReturnForm.items
            .filter((item) => Number(item.quantity || 0) > 0)
            .map((item) => ({
                invoice_item_id: item.invoice_item_id,
                quantity: Number(item.quantity || 0),
                condition: item.condition,
                batch_no: item.batch_no || null,
                expiry_date: item.expiry_date || null,
                reason: item.reason || null,
            })),
    });
    const submitSalesReturnForm = async () => {
        const payload = salesReturnPayload();

        if (!payload.warehouse_id) {
            setSalesReturnError('Select the warehouse that receives the returned stock.');
            return;
        }

        if (payload.items.length === 0) {
            setSalesReturnError('Enter a return quantity for at least one invoice item.');
            return;
        }

        setSalesReturnSubmitting(true);
        setSalesReturnError('');

        try {
            await api.post('/office/sales-returns', payload);
            notifyOperationalActionsChanged();
            liveResource.refresh();
            closeSalesReturnDialog();
            setDrawerOpen(false);
        } catch (requestError) {
            setSalesReturnError(requestError.message);
        } finally {
            setSalesReturnSubmitting(false);
        }
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
            notifyOperationalActionsChanged();
            liveResource.refresh();
            closeWorkflowModal();
        } catch (requestError) {
            setStockAdjustmentError(requestError.message);
        } finally {
            setStockAdjustmentSubmitting(false);
        }
    };
    const loadStockTransferLineBatches = async (lineId, productId, sourceWarehouseId = stockTransferForm.source_warehouse_id) => {
        if (!productId || !sourceWarehouseId) {
            return;
        }

        setStockTransferForm((current) => ({
            ...current,
            lines: current.lines.map((line) => String(line.id) === String(lineId)
                ? { ...line, batches_loading: true, batches_error: '', batches: [], items: [] }
                : line),
        }));

        try {
            const response = await api.get(`/office/stock/products/${productId}/batches?warehouse_id=${sourceWarehouseId}&status=available&per_page=100`);
            const batches = unwrapCollection(response).filter((batch) => Number(batch.available_base_quantity || 0) > 0);

            setStockTransferForm((current) => ({
                ...current,
                lines: current.lines.map((line) => String(line.id) === String(lineId)
                    ? { ...line, batches, batches_loading: false, batches_error: '' }
                    : line),
            }));
        } catch (requestError) {
            setStockTransferForm((current) => ({
                ...current,
                lines: current.lines.map((line) => String(line.id) === String(lineId)
                    ? { ...line, batches: [], batches_loading: false, batches_error: requestError.message }
                    : line),
            }));
        }
    };
    const updateStockTransferForm = (event) => {
        const { name, value } = event.target;

        setStockTransferForm((current) => {
            if (name === 'company_id') {
                return {
                    ...current,
                    company_id: value,
                    lines: [],
                };
            }

            if (name === 'source_warehouse_id' && String(value) === String(current.destination_warehouse_id)) {
                const destination = receivingWarehouses.find((warehouse) => String(warehouse.id) !== String(value));

                return {
                    ...current,
                    source_warehouse_id: value,
                    destination_warehouse_id: destination?.id || '',
                    lines: current.lines.map((line) => ({ ...line, batches: [], items: [], batches_error: '' })),
                };
            }

            if (name === 'source_warehouse_id') {
                return {
                    ...current,
                    source_warehouse_id: value,
                    lines: current.lines.map((line) => ({ ...line, batches: [], items: [], batches_error: '' })),
                };
            }

            return { ...current, [name]: value };
        });
        setStockTransferError('');
    };
    const addStockTransferLine = () => {
        setStockTransferForm((current) => ({
            ...current,
            lines: [...current.lines, newStockTransferLine()],
        }));
        setStockTransferError('');
    };
    const removeStockTransferLine = (lineId) => {
        setStockTransferForm((current) => {
            const lines = current.lines.filter((line) => String(line.id) !== String(lineId));

            return { ...current, lines };
        });
        setStockTransferError('');
    };
    const changeStockTransferLineProduct = (lineId, productId) => {
        const product = findReceiptProduct(stockTransferProducts, productId);

        setStockTransferForm((current) => ({
            ...current,
            lines: current.lines.map((line) => String(line.id) === String(lineId)
                ? { ...line, product_id: productId, product_name: product?.name || '', batches: [], batches_error: '', items: [] }
                : line),
        }));
        setStockTransferError('');

        if (productId && stockTransferForm.source_warehouse_id) {
            loadStockTransferLineBatches(lineId, productId, stockTransferForm.source_warehouse_id);
        }
    };
    const toggleStockTransferBatch = (lineId, batch, checked) => {
        setStockTransferForm((current) => ({
            ...current,
            lines: current.lines.map((line) => {
                if (String(line.id) !== String(lineId)) {
                    return line;
                }

                if (!checked) {
                    return {
                        ...line,
                        items: line.items.filter((item) => String(item.stock_batch_id) !== String(batch.id)),
                    };
                }

                if (line.items.some((item) => String(item.stock_batch_id) === String(batch.id))) {
                    return line;
                }

                return {
                    ...line,
                    items: [
                        ...line.items,
                        {
                            stock_batch_id: batch.id,
                            base_unit_quantity: String(Math.min(1, Number(batch.available_base_quantity || 0))),
                        },
                    ],
                };
            }),
        }));
        setStockTransferError('');
    };
    const updateStockTransferBatchQuantity = (lineId, batchId, value) => {
        setStockTransferForm((current) => ({
            ...current,
            lines: current.lines.map((line) => String(line.id) === String(lineId)
                ? {
                    ...line,
                    items: line.items.map((item) => String(item.stock_batch_id) === String(batchId)
                        ? { ...item, base_unit_quantity: value }
                        : item),
                }
                : line),
        }));
        setStockTransferError('');
    };
    const stockTransferPayload = () => ({
        company_id: stockTransferForm.company_id,
        source_warehouse_id: stockTransferForm.source_warehouse_id,
        destination_warehouse_id: stockTransferForm.destination_warehouse_id,
        items: stockTransferForm.lines
            .flatMap((line) => line.items || [])
            .filter((item) => Number(item.base_unit_quantity || 0) > 0)
            .map((item) => ({
                stock_batch_id: item.stock_batch_id,
                base_unit_quantity: Number(item.base_unit_quantity || 0),
            })),
        note: stockTransferForm.note || null,
    });
    const submitStockTransferForm = async () => {
        if (stockTransferMissingItems) {
            setStockTransferError('Select at least one available batch quantity to transfer.');
            return;
        }

        setStockTransferSubmitting(true);
        setStockTransferError('');

        try {
            await api.post('/office/stock/transfers', stockTransferPayload());
            notifyOperationalActionsChanged();
            setStockTransferForm(blankStockTransferForm);
            onNavigate?.('stock-transfers');
        } catch (requestError) {
            setStockTransferError(requestError.message);
        } finally {
            setStockTransferSubmitting(false);
        }
    };
    useEffect(() => {
        if (!isStockTransferCreatePage || stockTransferRouteApplied || (!transferCompanyId && !transferSourceWarehouseId && !transferProductId)) {
            return;
        }

        const destination = receivingWarehouses.find((warehouse) => String(warehouse.id) !== String(transferSourceWarehouseId));
        const line = transferProductId ? newStockTransferLine(transferProductId, transferProductName) : null;

        setStockTransferForm({
            ...blankStockTransferForm,
            company_id: transferCompanyId,
            source_warehouse_id: transferSourceWarehouseId,
            destination_warehouse_id: destination?.id || '',
            lines: line ? [line] : [],
        });
        setStockTransferRouteApplied(true);

        if (line && transferSourceWarehouseId) {
            loadStockTransferLineBatches(line.id, transferProductId, transferSourceWarehouseId);
        }
    }, [isStockTransferCreatePage, receivingWarehouses, stockTransferRouteApplied, transferCompanyId, transferProductId, transferProductName, transferSourceWarehouseId]);
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
    const openFinanceTransactionForm = (record = null) => {
        const direction = record?.direction_value || record?.direction?.toLowerCase?.() || blankFinanceTransactionForm.direction;
        const category = record?.category_value || (direction === 'outcome' ? 'operating_expense' : 'sales_collection');

        setSelectedRecord(record || {});
        setFinanceTransactionForm({
            ...blankFinanceTransactionForm,
            direction,
            category,
            transaction_date: record?.transaction_date || '',
            amount: record?.amount_value ? String(record.amount_value) : '',
            payment_method: record?.payment_method || 'cash',
            reference_no: record?.reference_no || '',
            description: record?.description || '',
            status: record?.status_value || 'recorded',
        });
        setModalScreenKey(null);
        setModalTitleOverride(record?.id ? 'Edit finance transaction' : 'Add finance transaction');
        setModalSubmitLabelOverride(record?.id ? 'Save transaction' : 'Add transaction');
        setFinanceTransactionError('');
        setModalOpen(true);
    };
    const updateFinanceTransactionForm = (event) => {
        const { name, value } = event.target;

        setFinanceTransactionForm((current) => {
            if (name === 'direction') {
                const nextCategory = financeCategoryOptions.find((category) => category.direction === value)?.value || 'adjustment';

                return {
                    ...current,
                    direction: value,
                    category: nextCategory,
                };
            }

            return { ...current, [name]: value };
        });
        setFinanceTransactionError('');
    };
    const financeTransactionPayload = () => ({
        ...financeTransactionForm,
        company_id: null,
        transaction_date: financeTransactionForm.transaction_date || null,
        reference_no: financeTransactionForm.reference_no || null,
        description: financeTransactionForm.description || null,
    });
    const submitFinanceTransactionForm = async () => {
        setFinanceTransactionSubmitting(true);
        setFinanceTransactionError('');

        try {
            if (selectedRecord?.id) {
                await api.put(`/office/finance/transactions/${selectedRecord.id}`, financeTransactionPayload());
            } else {
                await api.post('/office/finance/transactions', financeTransactionPayload());
            }

            notifyOperationalActionsChanged();
            liveResource.refresh();
            closeWorkflowModal();
        } catch (requestError) {
            setFinanceTransactionError(requestError.message);
        } finally {
            setFinanceTransactionSubmitting(false);
        }
    };
    const deleteFinanceTransaction = async (record) => {
        setFinanceTransactionSubmitting(true);

        try {
            await api.delete(`/office/finance/transactions/${record.id}`);
            liveResource.refresh();
            closeConfirmAction();
        } catch (requestError) {
            setFinanceTransactionError(requestError.message);
        } finally {
            setFinanceTransactionSubmitting(false);
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
            notifyOperationalActionsChanged();
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
            notifyOperationalActionsChanged();
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
        setOfficeOrderEditingRecord(null);
        setOfficeOrderForm({
            ...blankOfficeOrderForm,
            customer_id: record?.id || '',
            payment_due_date: defaultPaymentDueDate(),
        });
        setOfficeOrderLines([{ ...blankOfficeOrderLine, id: `office-order-line-${Date.now()}` }]);
        setModalScreenKey(null);
        setOfficeOrderModalOpen(true);
        setModalTitleOverride('Create approved order');
        setModalSubmitLabelOverride('Create and approve order');
        setOfficeOrderError('');
        setModalOpen(true);
    };
    const openOfficeOrderEditForm = (record) => {
        if (!record?.id) {
            return;
        }

        setSelectedRecord(record);
        setOfficeOrderEditingRecord(record);
        setOfficeOrderForm({
            ...blankOfficeOrderForm,
            company_id: record.company_id || '',
            customer_id: record.customer_id || '',
            sales_representative_id: record.sales_representative_id || '',
            warehouse_id: '',
            requested_delivery_date: dateInputValue(record.requested_delivery_date),
            payment_due_date: dateInputValue(record.payment_due_date) || defaultPaymentDueDate(),
            tax_amount: String(record.tax_amount ?? 0),
            note: record.note || '',
            auto_approve: false,
        });
        setOfficeOrderLines((record.order_items_raw || []).length
            ? record.order_items_raw.map((line) => ({
                id: `office-order-line-${line.id || Date.now()}`,
                product_id: line.product_id || '',
                unit_id: line.unit_id || '',
                quantity: String(line.quantity || 1),
                foc_unit_id: line.foc_unit_id || line.unit_id || '',
                foc_quantity: String(line.foc_quantity || 0),
                discount_percentage: line.discount_percentage || 0,
            }))
            : [{ ...blankOfficeOrderLine, id: `office-order-line-${Date.now()}` }]);
        setModalScreenKey(null);
        setOfficeOrderModalOpen(true);
        setModalTitleOverride('Edit order');
        setModalSubmitLabelOverride('Save order changes');
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
                foc_unit_id: line.foc_unit_id || defaultUnit?.unit_id || '',
            };
        }));
        setOfficeOrderError('');
    };
    const officeOrderPayload = () => ({
        ...officeOrderForm,
        requested_delivery_date: officeOrderForm.requested_delivery_date || null,
        payment_due_date: officeOrderForm.payment_due_date || null,
        sales_representative_id: officeOrderForm.sales_representative_id || null,
        warehouse_id: officeOrderForm.warehouse_id || null,
        note: officeOrderForm.note || null,
        auto_approve: true,
        items: officeOrderLines
            .filter((line) => line.product_id && line.unit_id && Number(line.quantity || line.orderedQuantity || 0) > 0)
            .map((line) => ({
                product_id: line.product_id,
                unit_id: line.unit_id,
                quantity: Number(line.quantity || line.orderedQuantity || 1),
                foc_unit_id: Number(line.foc_quantity || 0) > 0 ? line.foc_unit_id || line.unit_id || null : null,
                foc_quantity: Number(line.foc_quantity || 0),
                discount_percentage: line.discount_percentage ?? null,
            })),
    });
    const submitOfficeOrderForm = async () => {
        setOfficeOrderSubmitting(true);
        setOfficeOrderError('');

        try {
            if (officeOrderEditingRecord?.id) {
                await api.put(`/office/orders/${officeOrderEditingRecord.id}`, officeOrderPayload());
            } else {
                await api.post('/office/orders', officeOrderPayload());
            }
            notifyOperationalActionsChanged();
            liveResource.refresh();
            closeWorkflowModal();
        } catch (requestError) {
            setOfficeOrderError(requestError.message);
        } finally {
            setOfficeOrderSubmitting(false);
        }
    };
    const deleteOfficeOrder = async (record) => {
        if (!record?.id) {
            return;
        }

        setOfficeOrderSubmitting(true);
        setOfficeOrderError('');

        try {
            await api.delete(`/office/orders/${record.id}`);
            notifyOperationalActionsChanged();
            setSelectedRecord((current) => String(current?.id) === String(record.id) ? null : current);
            liveResource.refresh();
            closeConfirmAction();
            setDrawerOpen(false);
        } catch (requestError) {
            setOfficeOrderError(requestError.message);
            window.alert(requestError.message);
        } finally {
            setOfficeOrderSubmitting(false);
        }
    };
    const approveOfficeOrder = async (record) => {
        if (!record?.id) {
            return;
        }

        setSelectedRecord(record);
        setApprovalOrder(record);
        setApprovalForm({
            ...blankApprovalForm,
            warehouse_id: record?.warehouse_id || receivingWarehouses[0]?.id || '',
        });
        setApprovalError('');
        setApprovalModalOpen(true);
    };
    const closeApprovalOrderDialog = () => {
        setApprovalModalOpen(false);
        setApprovalOrder(null);
        setApprovalForm(blankApprovalForm);
        setApprovalError('');
    };
    const updateApprovalForm = (event) => {
        const { name, value } = event.target;

        setApprovalForm((current) => ({ ...current, [name]: value }));
        setApprovalError('');
    };
    const submitApprovalOrder = async () => {
        if (!approvalOrder?.id) {
            return;
        }

        if (!approvalForm.warehouse_id) {
            setApprovalError('Select a warehouse before approving this order.');
            return;
        }

        setOfficeOrderSubmitting(true);
        setApprovalSubmitting(true);
        setOfficeOrderError('');
        setApprovalError('');

        try {
            await api.post(`/office/orders/${approvalOrder.id}/approve`, {
                warehouse_id: approvalForm.warehouse_id,
            });
            notifyOperationalActionsChanged();
            setSelectedRecord((current) => String(current?.id) === String(approvalOrder.id)
                ? { ...current, status: 'Approved', status_value: 'approved', stockStatus: 'Reserved' }
                : current);
            liveResource.refresh();
            closeApprovalOrderDialog();
        } catch (requestError) {
            setOfficeOrderError(requestError.message);
            setApprovalError(requestError.message);
        } finally {
            setOfficeOrderSubmitting(false);
            setApprovalSubmitting(false);
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
                setOfficeOrderError('Select a warehouse and approve this order before generating an invoice.');
                approveOfficeOrder(record);
                return;
            }

            const taxAmount = Number(record.tax_amount || 0) > 0 ? Number(record.tax_amount) : promptInvoiceTaxAmount();

            if (taxAmount === null) {
                return;
            }

            const invoice = await api.post(`/office/orders/${record.id}/generate-invoice`, { tax_amount: taxAmount });
            rememberGeneratedInvoice(invoice);
            notifyOperationalActionsChanged();
            const invoiceId = invoice?.data?.id || invoice?.id || record.invoice_id || '';
            setSelectedRecord((current) => String(current?.id) === String(record.id)
                ? { ...current, status: 'Invoiced', status_value: 'invoiced', invoice_id: invoiceId }
                : current);
            liveResource.refresh();
        } catch (requestError) {
            setOfficeOrderError(requestError.message);
            window.alert(requestError.message);
        } finally {
            setOfficeOrderSubmitting(false);
        }
    };
    const deliverOfficeOrder = async (record) => {
        if (!record?.id) {
            return;
        }

        setDeliverySubmitting(true);
        setOfficeOrderError('');

        try {
            await api.post(`/office/orders/${record.id}/deliver`);
            notifyOperationalActionsChanged();
            setSelectedRecord((current) => String(current?.id) === String(record.id)
                ? { ...current, status: 'Delivered', status_value: 'delivered', stockStatus: 'Delivered' }
                : current);
            liveResource.refresh();
        } catch (requestError) {
            setOfficeOrderError(requestError.message);
            window.alert(requestError.message);
        } finally {
            setDeliverySubmitting(false);
        }
    };
    const openDetailPage = (record) => {
        if (!screen.detailPageKey) {
            return;
        }

        let params = { record_id: record?.id || '' };

        if (screen.detailPageKey === 'pharmacies-detail') {
            params = { customer_id: record?.id || '' };
        } else if (screen.detailPageKey === 'invoice-detail') {
            params = { invoice_id: record?.invoice_id || record?.id || '' };
        } else if (screen.detailPageKey === 'order-detail') {
            params = { order_id: record?.id || record?.order_id || '' };
        } else if (screen.detailPageKey === 'payable-detail') {
            params = { payable_id: record?.id || record?.payable_id || '' };
        } else if (screen.detailPageKey === 'payment-detail') {
            params = { payment_id: record?.id || record?.payment_id || '' };
        } else if (screen.detailPageKey === 'product-detail') {
            params = { product_id: record?.id || record?.product_id || '' };
        } else if (screen.detailPageKey === 'receiving-detail') {
            params = { receipt_id: record?.id || record?.receipt_id || '' };
        } else if (screen.detailPageKey === 'stock-transfer-detail') {
            params = { transfer_id: record?.id || record?.transfer_id || '' };
        }

        onNavigate?.(screen.detailPageKey, params);
    };
    const openInvoicePrintPage = (record) => {
        const printUrl = invoicePrintPageUrl(record?.id || record?.invoice_id || '');

        if (printUrl) {
            window.location.href = printUrl;
        }
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
            icon: 'settings',
            onClick: (record) => openStockAdjustmentForm(record),
        },
        {
            label: 'Transfer stock',
            icon: 'truck',
            onClick: (record) => openStockTransferPage(record),
        },
    ] : [];
    const orderWorkflowActions = [
        { label: 'Edit order', orderAction: 'edit', icon: 'edit', shouldShow: (record) => ['submitted', 'approved', 'invoiced'].includes(orderStatusValue(record)) },
        { label: 'Delete order', orderAction: 'delete', icon: 'trash', confirm: true, shouldShow: (record) => ['submitted', 'approved', 'invoiced'].includes(orderStatusValue(record)) },
        { label: 'Approve order', orderAction: 'approve', icon: 'A', variant: 'primary', shouldShow: (record) => orderStatusValue(record) === 'submitted' },
        { label: 'Generate invoice', orderAction: 'invoice', icon: 'I', variant: 'primary', shouldShow: (record) => orderStatusValue(record) === 'approved' },
        { label: 'Deliver stock', orderAction: 'deliver', icon: 'truck', shouldShow: (record) => ['approved', 'invoiced'].includes(orderStatusValue(record)) },
        { label: 'Return stock', orderAction: 'return', icon: 'box', shouldShow: (record) => orderStatusValue(record) === 'delivered' && record?.invoice_id },
        { label: 'Open invoice', orderAction: 'openInvoice', icon: 'receipt', variant: 'primary', shouldShow: (record) => orderStatusValue(record) === 'delivered' },
    ];
    const workflowRowActions = isOrdersPage ? orderWorkflowActions : (screen.rowActions || []);
    const workflowContextActions = isOrdersPage ? orderWorkflowActions : (screen.contextActions || []);
    const rowActions = [
        ...inventoryRowActions,
        ...workflowRowActions.map((action) => ({
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

                if (action.invoiceAction === 'print') {
                    openInvoicePrintPage(record);
                    return;
                }

                if (action.orderAction === 'edit') {
                    openOfficeOrderEditForm(record);
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

                if (action.orderAction === 'deliver') {
                    deliverOfficeOrder(record);
                    return;
                }

                if (action.orderAction === 'openInvoice') {
                    openOrderInvoiceDetail(record);
                    return;
                }

                if (action.orderAction === 'return') {
                    openSalesReturnForm(record);
                    return;
                }

                if (action.orderAction === 'createForPharmacy') {
                    onNavigate?.('order-create', { customer_id: record?.id || '' });
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
                        <button className="btn secondary" onClick={() => openStockTransferPage(null)} type="button">Transfer stock</button>
                        <button className="btn primary" onClick={() => openStockAdjustmentForm(null)} type="button">{screen.primaryAction}</button>
                    </div>
                ) : isStockTransferCreatePage ? (
                    <button className="btn secondary" onClick={() => onNavigate?.('stock-transfers')} type="button">Back to history</button>
                ) : isStockTransfersPage ? (
                    <button className="btn primary" onClick={() => onNavigate?.('stock-transfer-create')} type="button">Create transfer</button>
                ) : screen.hidePrimaryAction ? null : (
                    <button className="btn primary" onClick={isSettingsPage ? saveInvoicePrintSettings : isCompaniesPage ? () => openCompanyForm() : isFinanceCategoriesPage ? () => openFinanceCategoryForm() : isFinanceTransactionsPage ? () => openFinanceTransactionForm() : isPharmaciesPage ? () => openPharmacyForm() : isProductCategoriesPage ? () => openProductCategoryForm() : isUnitsPage ? () => openUnitForm() : isWarehousesPage ? () => openWarehouseForm() : isProductsPage ? () => openProductForm() : isReceivingPage ? () => onNavigate?.('receiving-create') : isInventoryPage ? () => openStockAdjustmentForm(selectedRecord) : isReceivablesPage ? () => openCustomerPaymentForm(selectedRecord) : isPayablesPage ? () => openCompanyPaymentForm(null) : isRepresentativesPage ? () => openSalesRepresentativeForm() : createScreenAction(primaryAction, onNavigate, () => openWorkflowModal(null, selectedRecord))} type="button">{isSettingsPage && invoicePrintSaving ? 'Saving...' : screen.primaryAction}</button>
                )}
                description={screen.description}
                eyebrow={screen.eyebrow}
                title={screen.title}
            />

            {isStockTransferCreatePage && (
                <StockTransferWorkspace
                    companies={productCompanies}
                    error={stockTransferError || productCompaniesResource.error || receivingWarehousesResource.error || stockTransferProductsResource.error}
                    form={stockTransferForm}
                    onAddLine={addStockTransferLine}
                    onBatchQuantityChange={updateStockTransferBatchQuantity}
                    onBatchToggle={toggleStockTransferBatch}
                    onChange={updateStockTransferForm}
                    onLineProductChange={changeStockTransferLineProduct}
                    onRemoveLine={removeStockTransferLine}
                    onSubmit={submitStockTransferForm}
                    products={stockTransferProducts}
                    productsLoading={stockTransferProductsResource.loading}
                    submitting={stockTransferSubmitting}
                    warehouses={receivingWarehouses}
                />
            )}

            {screen.summaries && (
                <div className="summary-grid">
                    {screen.summaries.map((summary) => <SummaryCard key={summary.label} {...summary} />)}
                </div>
            )}

            {(isLiveReportPage || screen.reportChart || screen.reportSummary) && (
                <Panel eyebrow="Report Dashboard" title={`${screen.title} Summary`}>
                    {isSalesReportsPage ? (
                        <SalesReportSummary
                            data={salesReportResource.data}
                            error={salesReportResource.error}
                            filterControls={salesReportFilterControls}
                            loading={salesReportResource.loading}
                            onFilterChange={updateSalesReportFilter}
                            onReset={resetSalesReportFilters}
                        />
                    ) : isPharmacyReportsPage ? (
                        <SalesReportSummary
                            data={pharmacyReportResource.data}
                            error={pharmacyReportResource.error}
                            filterControls={pharmacyReportFilterControls}
                            loading={pharmacyReportResource.loading}
                            onFilterChange={updatePharmacyReportFilter}
                            onReset={resetPharmacyReportFilters}
                        />
                    ) : isFinanceReportsPage ? (
                        <FinanceReportOverview
                            data={financeReportResource.data}
                            error={financeReportResource.error}
                            filterControls={financeReportFilterControls}
                            loading={financeReportResource.loading}
                            onFilterChange={updateFinanceReportFilter}
                            onReset={resetFinanceReportFilters}
                        />
                    ) : (
                        <ReportsWorkspace
                            categories={screen.reportCategories || []}
                            chart={screen.reportChart}
                            metrics={screen.reportMetrics || []}
                            summary={screen.reportSummary || []}
                        />
                    )}
                </Panel>
            )}

            {isSettingsPage && (
                <Panel eyebrow="Settings" title="Invoice Parameters">
                    <SettingsWorkspace
                        invoicePrintError={invoicePrintError || invoicePrintSettingsResource.error}
                        invoicePrintLoading={invoicePrintSettingsResource.loading}
                        invoicePrintSaving={invoicePrintSaving}
                        invoicePrintSettings={invoicePrintSettings}
                        invoicePrintSuccess={invoicePrintSuccess}
                        onInvoicePrintChange={updateInvoicePrintSetting}
                        onInvoicePrintSave={saveInvoicePrintSettings}
                    />
                </Panel>
            )}

            {!isSettingsPage && !isStockTransferCreatePage && !isLiveReportPage && (
                <Panel
                    action={
                        isInvoicesPage
                            ? <button className="btn primary" onClick={openInvoiceReport} type="button">Export PDF</button>
                            : isInventoryPage
                                ? <button className="btn primary" onClick={openInventoryReport} type="button">Export PDF</button>
                                : null
                    }
                    eyebrow="Workspace"
                    title={`${screen.title} List`}
                >
                {isActionListPage && (
                    <OperationListModeSwitch
                        actionOnly={Boolean(actionListMode)}
                        onChange={updateActionListMode}
                    />
                )}
                {showFilterToolbar && (isCompaniesPage ? (
                    <FilterToolbar
                        filters={companyListFilterControls}
                        onFilterChange={updateCompanyListFilter}
                        onReset={resetCompanyListFilters}
                        onSearch={updateCompanyListSearch}
                        searchPlaceholder="Search company name or code"
                        searchValue={companyListFilters.search}
                    />
                ) : isProductCategoriesPage ? (
                    <FilterToolbar
                        filters={productCategoryListFilterControls}
                        onFilterChange={updateProductCategoryListFilter}
                        onReset={resetProductCategoryListFilters}
                        onSearch={updateProductCategoryListSearch}
                        searchPlaceholder="Search category name or code"
                        searchValue={productCategoryListFilters.search}
                    />
                ) : isFinanceCategoriesPage ? (
                    <FilterToolbar
                        filters={financeCategoryListFilterControls}
                        onFilterChange={updateFinanceCategoryListFilter}
                        onReset={resetFinanceCategoryListFilters}
                        onSearch={updateFinanceCategoryListSearch}
                        searchPlaceholder="Search financial category, code, or note"
                        searchValue={financeCategoryListFilters.search}
                    />
                ) : isUnitsPage ? (
                    <FilterToolbar
                        filters={unitListFilterControls}
                        onFilterChange={updateUnitListFilter}
                        onReset={resetUnitListFilters}
                        onSearch={updateUnitListSearch}
                        searchPlaceholder="Search unit name or abbreviation"
                        searchValue={unitListFilters.search}
                    />
                ) : isProductsPage ? (
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
                        className="adaptive-filter-toolbar"
                        collapsibleSearch
                        filters={receivingListFilterControls}
                        onFilterChange={updateReceivingListFilter}
                        onReset={resetReceivingListFilters}
                        onSearch={updateReceivingListSearch}
                        searchPlaceholder="Search receipt, invoice, company, or warehouse"
                        searchValue={receivingListFilters.search}
                    />
                ) : isStockTransfersPage ? (
                    <FilterToolbar
                        className="adaptive-filter-toolbar"
                        collapsibleSearch
                        filters={stockTransferListFilterControls}
                        onFilterChange={updateStockTransferListFilter}
                        onReset={resetStockTransferListFilters}
                        onSearch={updateStockTransferListSearch}
                        searchPlaceholder="Search transfer, company, or warehouse"
                        searchValue={stockTransferListFilters.search}
                    />
                ) : isInventoryPage ? (
                    <FilterToolbar
                        className="adaptive-filter-toolbar"
                        collapsibleSearch
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
                ) : isFinanceTransactionsPage ? (
                    <FilterToolbar
                        className="adaptive-filter-toolbar"
                        collapsibleSearch
                        dateFromValue={financeTransactionListFilters.date_from}
                        dateToValue={financeTransactionListFilters.date_to}
                        filters={financeTransactionFilterControls}
                        onDateFromChange={(value) => updateFinanceTransactionListFilter('date_from', value)}
                        onDateToChange={(value) => updateFinanceTransactionListFilter('date_to', value)}
                        onFilterChange={updateFinanceTransactionListFilter}
                        onReset={resetFinanceTransactionListFilters}
                        onSearch={updateFinanceTransactionListSearch}
                        searchPlaceholder="Search transaction, reference, company, or note"
                        searchValue={financeTransactionListFilters.search}
                    />
                ) : isPaymentsPage ? (
                    <FilterToolbar
                        className="adaptive-filter-toolbar"
                        collapsibleSearch
                        dateFromValue={paymentListFilters.date_from}
                        dateToValue={paymentListFilters.date_to}
                        filters={paymentListFilterControls}
                        onDateFromChange={updatePaymentListDateFrom}
                        onDateToChange={updatePaymentListDateTo}
                        onFilterChange={updatePaymentListFilter}
                        onReset={resetPaymentListFilters}
                        onSearch={updatePaymentListSearch}
                        searchPlaceholder="Search payment, pharmacy, company, or reference"
                        searchValue={paymentListFilters.search}
                    />
                ) : isSalesReturnsPage ? (
                    <FilterToolbar
                        className="adaptive-filter-toolbar"
                        collapsibleSearch
                        dateFromValue={salesReturnListFilters.date_from}
                        dateToValue={salesReturnListFilters.date_to}
                        filters={salesReturnListFilterControls}
                        onDateFromChange={updateSalesReturnListDateFrom}
                        onDateToChange={updateSalesReturnListDateTo}
                        onFilterChange={updateSalesReturnListFilter}
                        onReset={resetSalesReturnListFilters}
                        onSearch={updateSalesReturnListSearch}
                        searchPlaceholder="Search return, invoice, order, pharmacy, or company"
                        searchValue={salesReturnListFilters.search}
                    />
                ) : isReceivablesPage ? (
                    <FilterToolbar
                        className="adaptive-filter-toolbar"
                        collapsibleSearch
                        filters={receivableListFilterControls}
                        onFilterChange={updateReceivableListFilter}
                        onReset={resetReceivableListFilters}
                        onSearch={updateReceivableListSearch}
                        searchPlaceholder="Search invoice, pharmacy, or company"
                        searchValue={receivableListFilters.search}
                    />
                ) : isOrdersPage ? (
                    <FilterToolbar
                        className="adaptive-filter-toolbar"
                        collapsibleSearch
                        dateFromValue={orderListFilters.date_from}
                        dateToValue={orderListFilters.date_to}
                        filters={orderListFilterControls}
                        onDateFromChange={updateOrderListDateFrom}
                        onDateToChange={updateOrderListDateTo}
                        onFilterChange={updateOrderListFilter}
                        onReset={resetOrderListFilters}
                        onSearch={updateOrderListSearch}
                        searchPlaceholder="Search order, pharmacy, company, or sales rep"
                        searchValue={orderListFilters.search}
                    />
                ) : isInvoicesPage ? (
                    <FilterToolbar
                        className="adaptive-filter-toolbar invoice-filter-toolbar"
                        collapsibleSearch
                        dateFromValue={invoiceListFilters.date_from}
                        dateToValue={invoiceListFilters.date_to}
                        filters={invoiceListFilterControls}
                        onDateFromChange={updateInvoiceListDateFrom}
                        onDateToChange={updateInvoiceListDateTo}
                        onFilterChange={updateInvoiceListFilter}
                        onReset={resetInvoiceListFilters}
                        onSearch={updateInvoiceListSearch}
                        searchPlaceholder="Search invoice, order, pharmacy, or company"
                        searchValue={invoiceListFilters.search}
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
                                shouldShow: (record) => !(isProductsPage && isDeletedProductRecord(record)),
                                onClick: (record) => isCompaniesPage ? openCompanyForm(record) : isFinanceCategoriesPage ? openFinanceCategoryForm(record) : isFinanceTransactionsPage ? openFinanceTransactionForm(record) : isPharmaciesPage ? openPharmacyForm(record) : isProductCategoriesPage ? openProductCategoryForm(record) : isUnitsPage ? openUnitForm(record) : isWarehousesPage ? openWarehouseForm(record) : isProductsPage ? openProductForm(record) : isReceivingPage ? openStockReceiptForm(record) : isRepresentativesPage ? openSalesRepresentativeForm(record) : openWorkflowModal(null, record, {
                                    submitLabel: screen.editSubmitLabel || `Save ${recordLabel}`,
                                    title: screen.editActionLabel || `Edit ${recordLabel}`,
                                }),
                            },
                        ] : []),
                        ...(isProductsPage ? [
                            {
                                label: 'Restore product',
                                icon: 'restore',
                                shouldShow: isDeletedProductRecord,
                                onClick: restoreProduct,
                            },
                        ] : []),
                        ...(isManagedCrudPage ? [
                            {
                                label: isProductsPage ? 'Delete product' : isProductCategoriesPage ? 'Delete category' : isFinanceCategoriesPage ? 'Delete category' : isUnitsPage ? 'Delete unit' : isWarehousesPage ? 'Delete warehouse' : isReceivingPage ? 'Delete receiving' : isFinanceTransactionsPage ? 'Delete transaction' : isPharmaciesPage ? 'Delete pharmacy' : isRepresentativesPage ? 'Delete sales rep' : 'Delete company',
                                variant: 'danger',
                                shouldShow: (record) => !(isProductsPage && isDeletedProductRecord(record)),
                                onClick: (record) => {
                                    setSelectedRecord(record);
                                    setConfirmAction({ action: { label: isProductsPage ? 'Delete product' : isProductCategoriesPage ? 'Delete category' : isFinanceCategoriesPage ? 'Delete category' : isUnitsPage ? 'Delete unit' : isWarehousesPage ? 'Delete warehouse' : isReceivingPage ? 'Delete receiving' : isFinanceTransactionsPage ? 'Delete transaction' : isPharmaciesPage ? 'Delete pharmacy' : isRepresentativesPage ? 'Delete sales rep' : 'Delete company', categoryDelete: isProductCategoriesPage, companyDelete: isCompaniesPage, financeCategoryDelete: isFinanceCategoriesPage, financeTransactionDelete: isFinanceTransactionsPage, pharmacyDelete: isPharmaciesPage, productDelete: isProductsPage, receiptDelete: isReceivingPage, representativeDelete: isRepresentativesPage, unitDelete: isUnitsPage, warehouseDelete: isWarehousesPage }, record });
                                },
                            },
                        ] : []),
                    ]}
                    columns={screen.columns}
                    error={liveResource.error}
                    loading={liveResource.loading}
                    onRowClick={isInventoryDetailPage || disableRowDetailDialog ? undefined : (record) => {
                        setSelectedRecord(record);
                        if (isRepresentativesPage) {
                            openDetailPage(record);
                            return;
                        }
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
                {isFinanceTransactionsPage && financeTransactionPagination && (
                    <PaginationBar
                        currentPage={financeTransactionPagination.currentPage}
                        emptyLabel="No finance transactions to show"
                        from={financeTransactionPagination.from}
                        lastPage={financeTransactionPagination.lastPage}
                        loading={liveResource.loading}
                        onNext={() => goToFinanceTransactionPage(financeTransactionPagination.currentPage + 1)}
                        onPrevious={() => goToFinanceTransactionPage(financeTransactionPagination.currentPage - 1)}
                        to={financeTransactionPagination.to}
                        total={financeTransactionPagination.total}
                    />
                )}
                {isFinanceCategoriesPage && financeCategoryPagination && (
                    <PaginationBar
                        currentPage={financeCategoryPagination.currentPage}
                        emptyLabel="No financial categories to show"
                        from={financeCategoryPagination.from}
                        lastPage={financeCategoryPagination.lastPage}
                        loading={liveResource.loading}
                        onNext={() => goToFinanceCategoryPage(financeCategoryPagination.currentPage + 1)}
                        onPrevious={() => goToFinanceCategoryPage(financeCategoryPagination.currentPage - 1)}
                        to={financeCategoryPagination.to}
                        total={financeCategoryPagination.total}
                    />
                )}
                {isOrdersPage && orderPagination && (
                    <PaginationBar
                        currentPage={orderPagination.currentPage}
                        emptyLabel="No orders to show"
                        from={orderPagination.from}
                        lastPage={orderPagination.lastPage}
                        loading={liveResource.loading}
                        onNext={() => goToOrderPage(orderPagination.currentPage + 1)}
                        onPrevious={() => goToOrderPage(orderPagination.currentPage - 1)}
                        to={orderPagination.to}
                        total={orderPagination.total}
                    />
                )}
                {isInvoicesPage && invoicePagination && (
                    <PaginationBar
                        currentPage={invoicePagination.currentPage}
                        emptyLabel="No invoices to show"
                        from={invoicePagination.from}
                        lastPage={invoicePagination.lastPage}
                        loading={liveResource.loading}
                        onNext={() => goToInvoicePage(invoicePagination.currentPage + 1)}
                        onPrevious={() => goToInvoicePage(invoicePagination.currentPage - 1)}
                        to={invoicePagination.to}
                        total={invoicePagination.total}
                    />
                )}
                {isPaymentsPage && paymentPagination && (
                    <PaginationBar
                        currentPage={paymentPagination.currentPage}
                        emptyLabel="No payments to show"
                        from={paymentPagination.from}
                        lastPage={paymentPagination.lastPage}
                        loading={liveResource.loading}
                        onNext={() => goToPaymentPage(paymentPagination.currentPage + 1)}
                        onPrevious={() => goToPaymentPage(paymentPagination.currentPage - 1)}
                        to={paymentPagination.to}
                        total={paymentPagination.total}
                    />
                )}
                {isSalesReturnsPage && salesReturnPagination && (
                    <PaginationBar
                        currentPage={salesReturnPagination.currentPage}
                        emptyLabel="No returns to show"
                        from={salesReturnPagination.from}
                        lastPage={salesReturnPagination.lastPage}
                        loading={liveResource.loading}
                        onNext={() => goToSalesReturnPage(salesReturnPagination.currentPage + 1)}
                        onPrevious={() => goToSalesReturnPage(salesReturnPagination.currentPage - 1)}
                        to={salesReturnPagination.to}
                        total={salesReturnPagination.total}
                    />
                )}
                {isCompaniesPage && companyPagination && (
                    <PaginationBar
                        currentPage={companyPagination.currentPage}
                        emptyLabel="No companies to show"
                        from={companyPagination.from}
                        lastPage={companyPagination.lastPage}
                        loading={liveResource.loading}
                        onNext={() => goToCompanyPage(companyPagination.currentPage + 1)}
                        onPrevious={() => goToCompanyPage(companyPagination.currentPage - 1)}
                        to={companyPagination.to}
                        total={companyPagination.total}
                    />
                )}
                {isProductCategoriesPage && productCategoryPagination && (
                    <PaginationBar
                        currentPage={productCategoryPagination.currentPage}
                        emptyLabel="No product categories to show"
                        from={productCategoryPagination.from}
                        lastPage={productCategoryPagination.lastPage}
                        loading={liveResource.loading}
                        onNext={() => goToProductCategoryPage(productCategoryPagination.currentPage + 1)}
                        onPrevious={() => goToProductCategoryPage(productCategoryPagination.currentPage - 1)}
                        to={productCategoryPagination.to}
                        total={productCategoryPagination.total}
                    />
                )}
                {isUnitsPage && unitPagination && (
                    <PaginationBar
                        currentPage={unitPagination.currentPage}
                        emptyLabel="No units to show"
                        from={unitPagination.from}
                        lastPage={unitPagination.lastPage}
                        loading={liveResource.loading}
                        onNext={() => goToUnitPage(unitPagination.currentPage + 1)}
                        onPrevious={() => goToUnitPage(unitPagination.currentPage - 1)}
                        to={unitPagination.to}
                        total={unitPagination.total}
                    />
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
                {isStockTransfersPage && stockTransferPagination && (
                    <PaginationBar
                        currentPage={stockTransferPagination.currentPage}
                        emptyLabel="No stock transfers to show"
                        from={stockTransferPagination.from}
                        lastPage={stockTransferPagination.lastPage}
                        loading={liveResource.loading}
                        onNext={() => goToStockTransferPage(stockTransferPagination.currentPage + 1)}
                        onPrevious={() => goToStockTransferPage(stockTransferPagination.currentPage - 1)}
                        to={stockTransferPagination.to}
                        total={stockTransferPagination.total}
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
            )}

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
                onSubmit={officeOrderModalOpen ? submitOfficeOrderForm : isCompaniesPage && !modalScreenKey ? submitCompanyForm : isFinanceCategoriesPage && !modalScreenKey ? submitFinanceCategoryForm : isFinanceTransactionsPage && !modalScreenKey ? submitFinanceTransactionForm : isPharmaciesPage && !modalScreenKey ? submitPharmacyForm : isProductCategoriesPage && !modalScreenKey ? submitProductCategoryForm : isUnitsPage && !modalScreenKey ? submitUnitForm : isWarehousesPage && !modalScreenKey ? submitWarehouseForm : isProductsPage && !modalScreenKey ? submitProductForm : isReceivingPage && !modalScreenKey ? submitStockReceiptForm : isStockWorkspacePage && !modalScreenKey ? submitStockAdjustmentForm : isReceivablesPage && !modalScreenKey ? submitCustomerPaymentForm : isPayablesPage && !modalScreenKey ? submitCompanyPaymentForm : isRepresentativesPage && !modalScreenKey ? submitSalesRepresentativeForm : closeWorkflowModal}
                submitDisabled={orderCreateBlocked || officeOrderBlocked || officeOrderMissingWarehouse || companyPaymentSubmitting || companySubmitting || customerPaymentSubmitting || financeCategorySubmitting || financeTransactionSubmitting || officeOrderSubmitting || pharmacySubmitting || productCategorySubmitting || productSubmitting || salesRepresentativeSubmitting || stockAdjustmentSubmitting || stockReceiptSubmitting || unitSubmitting || warehouseSubmitting}
                submitDisabledReason={companyError || companyPaymentError || customerPaymentError || financeCategoryError || financeTransactionError || officeOrderError || pharmacyError || productCategoryError || productError || salesRepresentativeError || stockAdjustmentError || stockReceiptError || unitError || warehouseError || (orderCreateBlocked || officeOrderBlocked ? 'Company credit is blocked. Order creation is not allowed.' : '') || (officeOrderMissingWarehouse ? 'Select a warehouse before creating the approved order.' : '')}
                submitLabel={modalSubmitLabel}
                title={modalTitle}
            >
                {!isManagedCrudPage && !isStockWorkspacePage && <WorkflowContext context={modalContext} screenKey={modalScreenKey} />}
                {officeOrderModalOpen
                    ? (
                        <OfficeOrderForm
                            companies={productCompanies}
                            customers={officeOrderCustomers}
                            error={officeOrderError || officeOrderCustomersResource.error || officeOrderProductsResource.error || officeOrderRepresentativesResource.error || receivingWarehousesResource.error}
                            form={officeOrderForm}
                            lines={officeOrderLines}
                            lockedCustomer={officeOrderLockedCustomer}
                            onChange={updateOfficeOrderForm}
                            onLineChange={updateOfficeOrderLines}
                            products={officeOrderProducts}
                            productsLoading={officeOrderProductsResource.loading}
                            representatives={officeOrderRepresentatives}
                            representativesLoading={officeOrderRepresentativesResource.loading}
                            stockError={officeOrderStockResource.error}
                            stockLoading={officeOrderStockResource.loading}
                            stockRows={officeOrderStockRows}
                            submitting={officeOrderSubmitting}
                            warehouses={receivingWarehouses}
                            warehousesLoading={receivingWarehousesResource.loading}
                            warehouseRequired={officeOrderRequiresWarehouse}
                        />
                    )
                    : isCompaniesPage && !modalScreenKey
                    ? <CompanyForm form={companyForm} onChange={updateCompanyForm} />
                    : isFinanceCategoriesPage && !modalScreenKey
                        ? <FinanceCategoryForm form={financeCategoryForm} onChange={updateFinanceCategoryForm} />
                    : isFinanceTransactionsPage && !modalScreenKey
                        ? (
                            <FinanceTransactionForm
                                categories={financeCategoryOptions}
                                form={financeTransactionForm}
                                onChange={updateFinanceTransactionForm}
                            />
                        )
                    : isPharmaciesPage && !modalScreenKey
                        ? <PharmacyForm form={pharmacyForm} onChange={updatePharmacyForm} />
                    : isProductCategoriesPage && !modalScreenKey
                        ? (
                            <ProductCategoryForm
                                form={productCategoryForm}
                                onChange={updateProductCategoryForm}
                                parentOptions={productCategories}
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
                                categories={productCategories}
                                companies={productCompanies}
                                form={productForm}
                                onAddFocRule={addProductFocRule}
                                onAddUnit={addProductUnit}
                                onChange={updateProductForm}
                                onFocRuleChange={updateProductFocRule}
                                onImageChange={updateProductImage}
                                onRemoveFocRule={removeProductFocRule}
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

            {approvalModalOpen && (
                <Modal
                    busy={approvalBusy}
                    open
                    onClose={closeApprovalOrderDialog}
                    onSubmit={submitApprovalOrder}
                    submitDisabled={approvalBusy || !approvalForm.warehouse_id}
                    submitDisabledReason={approvalError || receivingWarehousesResource.error || (!approvalForm.warehouse_id ? 'Select a warehouse to reserve stock.' : '')}
                    submitLabel="Approve and reserve stock"
                    title={`Approve order - ${approvalOrder?.order || 'Order'}`}
                >
                    <ApprovalWarehouseForm
                        error={approvalError || receivingWarehousesResource.error}
                        form={approvalForm}
                        onChange={updateApprovalForm}
                        order={approvalOrder}
                        warehouses={receivingWarehouses}
                    />
                </Modal>
            )}

            {salesReturnModalOpen && (
                <Modal
                    busy={salesReturnLoading || salesReturnSubmitting}
                    open
                    onClose={closeSalesReturnDialog}
                    onSubmit={submitSalesReturnForm}
                    submitDisabled={salesReturnLoading || salesReturnSubmitting || !salesReturnForm.warehouse_id || !salesReturnForm.items.some((item) => Number(item.quantity || 0) > 0)}
                    submitDisabledReason={salesReturnError || (!salesReturnForm.warehouse_id ? 'Select a receiving warehouse.' : '')}
                    submitLabel="Post return"
                    title={`Return stock - ${salesReturnRecord?.order || salesReturnInvoice?.invoice || 'Delivered order'}`}
                >
                    <SalesReturnForm
                        error={salesReturnError}
                        form={salesReturnForm}
                        invoice={salesReturnInvoice}
                        loading={salesReturnLoading}
                        onChange={updateSalesReturnForm}
                        onItemChange={updateSalesReturnItem}
                        warehouses={receivingWarehouses}
                        warehousesLoading={receivingWarehousesResource.loading}
                    />
                </Modal>
            )}

            {confirmAction && (
                <Modal
                    busy={modalBusy}
                    actions={(
                        <>
                            <button className="btn secondary" disabled={modalBusy} onClick={closeConfirmAction} type="button">Cancel</button>
                            <button className="btn primary" disabled={companySubmitting || financeCategorySubmitting || financeTransactionSubmitting || officeOrderSubmitting || pharmacySubmitting || productCategorySubmitting || productSubmitting || salesRepresentativeSubmitting || stockReceiptSubmitting || unitSubmitting || warehouseSubmitting} onClick={() => confirmAction.action.companyDelete ? deleteCompany(confirmAction.record) : confirmAction.action.financeCategoryDelete ? deleteFinanceCategory(confirmAction.record) : confirmAction.action.financeTransactionDelete ? deleteFinanceTransaction(confirmAction.record) : confirmAction.action.orderAction === 'delete' ? deleteOfficeOrder(confirmAction.record) : confirmAction.action.pharmacyDelete ? deletePharmacy(confirmAction.record) : confirmAction.action.categoryDelete ? deleteProductCategory(confirmAction.record) : confirmAction.action.unitDelete ? deleteUnit(confirmAction.record) : confirmAction.action.warehouseDelete ? deleteWarehouse(confirmAction.record) : confirmAction.action.receiptDelete ? deleteStockReceipt(confirmAction.record) : confirmAction.action.productDelete ? deleteProduct(confirmAction.record) : confirmAction.action.representativeDelete ? deleteSalesRepresentative(confirmAction.record) : closeConfirmAction()} type="button">{confirmAction.action.label}</button>
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
                    <div className="crud-grid confirm-reason-grid">
                        <FormField className="confirm-reason-field" label={`${confirmAction.action.label} reason`} placeholder="Required audit note before deleting" type="textarea" />
                    </div>
                </Modal>
            )}

            {!isInvoicesPage && !isReceivablesPage && (
                <Drawer
                    actions={(
                        <>
                            {workflowContextActions
                                .filter((action) => !action.shouldShow || action.shouldShow(selectedRecord))
                                .map((action) => (
                                <button
                                    className={action.variant === 'primary' ? 'btn primary' : 'btn secondary'}
                                    key={action.label}
                                    onClick={() => {
                                        if (action.modalScreenKey) {
                                            openWorkflowModal(action.modalScreenKey, selectedRecord);
                                            return;
                                        }

                                        if (action.confirm) {
                                            setConfirmAction({ action, record: selectedRecord });
                                            return;
                                        }

                                        if (action.orderAction === 'edit') {
                                            openOfficeOrderEditForm(selectedRecord);
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

                                        if (action.orderAction === 'deliver') {
                                            deliverOfficeOrder(selectedRecord);
                                            return;
                                        }

                                        if (action.orderAction === 'openInvoice') {
                                            openOrderInvoiceDetail(selectedRecord);
                                            return;
                                        }

                                        if (action.orderAction === 'return') {
                                            openSalesReturnForm(selectedRecord);
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
                            {isProductsPage && isDeletedProductRecord(selectedRecord) && (
                                <button className="btn primary" disabled={productSubmitting} onClick={() => restoreProduct(selectedRecord)} type="button">
                                    {productSubmitting ? 'Restoring...' : 'Restore product'}
                                </button>
                            )}
                            {showEditAction && !(isProductsPage && isDeletedProductRecord(selectedRecord)) && (
                                <button className="btn secondary" onClick={() => isCompaniesPage ? openCompanyForm(selectedRecord) : isFinanceCategoriesPage ? openFinanceCategoryForm(selectedRecord) : isFinanceTransactionsPage ? openFinanceTransactionForm(selectedRecord) : isPharmaciesPage ? openPharmacyForm(selectedRecord) : isProductCategoriesPage ? openProductCategoryForm(selectedRecord) : isUnitsPage ? openUnitForm(selectedRecord) : isWarehousesPage ? openWarehouseForm(selectedRecord) : isProductsPage ? openProductForm(selectedRecord) : isReceivingPage ? openStockReceiptForm(selectedRecord) : isRepresentativesPage ? openSalesRepresentativeForm(selectedRecord) : openWorkflowModal(null, selectedRecord, { submitLabel: `Save ${recordLabel}`, title: `Edit ${recordLabel}` })} type="button">Edit {recordLabel}</button>
                            )}
                            <button className={isOrdersPage ? 'btn secondary' : 'btn primary'} onClick={() => setDrawerOpen(false)} type="button">Done</button>
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
