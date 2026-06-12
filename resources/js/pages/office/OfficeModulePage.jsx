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
    if (contextKey === 'payments') {
        return (screen.formFields || []).filter((field) => !['Customer', 'Invoice'].includes(field.label));
    }

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

function ProductForm({ categories = [], companies = [], form, onAddUnit, onChange, onImageChange, onRemoveUnit, onUnitChange, units = [] }) {
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
        payments: {
            label: 'Selected invoice',
            note: 'Invoice and customer are carried into this payment allocation.',
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

function Details({ defaultUnitBusy = false, onDefaultSalesUnitChange, record, screen }) {
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

export default function OfficeModulePage({ onNavigate, pageKey }) {
    const isCompaniesPage = pageKey === 'companies';
    const isPharmaciesPage = pageKey === 'pharmacies';
    const isProductCategoriesPage = pageKey === 'product-categories';
    const isProductsPage = pageKey === 'products';
    const isUnitsPage = pageKey === 'units';
    const [pharmacyListFilters, setPharmacyListFilters] = useState(blankPharmacyListFilters);
    const [productListFilters, setProductListFilters] = useState(blankProductListFilters);
    const baseScreen = officeModules[pageKey] || officeModules.companies;
    const liveEndpoint = isProductsPage
        ? buildProductListEndpoint(productListFilters)
        : isPharmaciesPage
            ? buildPharmacyListEndpoint(pharmacyListFilters)
            : getOfficeEndpoint(pageKey);
    const liveResource = useApiResource(liveEndpoint);
    const productCompaniesResource = useApiResource(isProductsPage ? '/lookups/companies' : '');
    const productCategoriesResource = useApiResource(isProductsPage ? '/lookups/product-categories' : '');
    const productUnitsResource = useApiResource(isProductsPage ? '/lookups/units' : '');
    const liveRows = liveResource.data ? mapOfficeRows(pageKey, liveResource.data) : [];
    const screen = liveEndpoint ? applyLiveRows(baseScreen, liveRows, Boolean(liveResource.data)) : baseScreen;
    const showFilterToolbar = isProductsPage || isPharmaciesPage || screen.showFilterToolbar !== false;
    const showViewAction = screen.showViewAction !== false;
    const showEditAction = screen.showEditAction !== false;
    const isManagedCrudPage = isCompaniesPage || isPharmaciesPage || isProductCategoriesPage || isProductsPage || isUnitsPage;
    const recordLabel = getRecordLabel(screen);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [modalScreenKey, setModalScreenKey] = useState(null);
    const [modalTitleOverride, setModalTitleOverride] = useState('');
    const [modalSubmitLabelOverride, setModalSubmitLabelOverride] = useState('');
    const [confirmAction, setConfirmAction] = useState(null);
    const [selectedRecord, setSelectedRecord] = useState(screen.rows[0]);
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
    const [productForm, setProductForm] = useState(blankProductForm);
    const [productError, setProductError] = useState('');
    const [productSubmitting, setProductSubmitting] = useState(false);
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
    const modalBusy = companySubmitting || pharmacySubmitting || productCategorySubmitting || productSubmitting || unitSubmitting;
    const orderCreditStatuses = normalizeCreditStatuses(selectedRecord?.creditStatuses || modalScreen.creditStatuses || []);
    const selectedCreditStatus = getCompanyCreditStatus(orderCreditStatuses, selectedOrderCompany);
    const orderCreateBlocked = isOrderCreateModal && isBlockedCredit(selectedCreditStatus?.status);
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
        if (!modalOpen && !drawerOpen && screen.rows.length > 0 && !screen.rows.some((row) => row.id === selectedRecord?.id)) {
            setSelectedRecord(screen.rows[0]);
        }
    }, [drawerOpen, modalOpen, screen.rows, selectedRecord?.id]);

    const closeWorkflowModal = () => {
        setModalOpen(false);
        setModalScreenKey(null);
        setModalTitleOverride('');
        setModalSubmitLabelOverride('');
        setCompanyError('');
        setPharmacyError('');
        setProductCategoryError('');
        setProductError('');
        setUnitError('');
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
            status: String(record.status || 'active').toLowerCase(),
        } : { ...blankProductForm, product_units: [] };

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
    const submitProductForm = async () => {
        setProductSubmitting(true);
        setProductError('');

        try {
            const payload = new FormData();
            Object.entries(productForm).forEach(([key, value]) => {
                if (['primary_image', 'primary_image_preview', 'product_units'].includes(key)) {
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
                await api.post(`/office/products/${selectedRecord.id}`, payload);
            } else {
                await api.post('/office/products', payload);
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
    const closeConfirmAction = () => setConfirmAction(null);
    const rowActions = (screen.rowActions || []).map((action) => ({
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
    }));

    return (
        <div className="page-stack">
            <PageHeader
                action={<button className="btn primary" onClick={isCompaniesPage ? () => openCompanyForm() : isPharmaciesPage ? () => openPharmacyForm() : isProductCategoriesPage ? () => openProductCategoryForm() : isUnitsPage ? () => openUnitForm() : isProductsPage ? () => openProductForm() : createScreenAction(primaryAction, onNavigate, () => openWorkflowModal(null, selectedRecord))} type="button">{screen.primaryAction}</button>}
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
                ) : <FilterToolbar filters={screen.filters} showDate />)}
                <DataTable
                    actions={[
                        ...(showViewAction ? [
                            { label: screen.viewActionLabel || `View ${recordLabel}`, onClick: (record) => { setSelectedRecord(record); setDrawerOpen(true); } },
                        ] : []),
                        ...rowActions,
                        ...(screen.detailPageKey ? [
                            { label: screen.detailActionLabel || `Open ${recordLabel}`, onClick: () => onNavigate?.(screen.detailPageKey) },
                        ] : []),
                        ...(showEditAction ? [
                            {
                                label: screen.editActionLabel || `Edit ${recordLabel}`,
                                onClick: (record) => isCompaniesPage ? openCompanyForm(record) : isPharmaciesPage ? openPharmacyForm(record) : isProductCategoriesPage ? openProductCategoryForm(record) : isUnitsPage ? openUnitForm(record) : isProductsPage ? openProductForm(record) : openWorkflowModal(null, record, {
                                    submitLabel: screen.editSubmitLabel || `Save ${recordLabel}`,
                                    title: screen.editActionLabel || `Edit ${recordLabel}`,
                                }),
                            },
                        ] : []),
                        ...(isManagedCrudPage ? [
                            {
                                label: isProductsPage ? 'Delete product' : isProductCategoriesPage ? 'Delete category' : isUnitsPage ? 'Delete unit' : isPharmaciesPage ? 'Delete pharmacy' : 'Delete company',
                                variant: 'danger',
                                onClick: (record) => {
                                    setSelectedRecord(record);
                                    setConfirmAction({ action: { label: isProductsPage ? 'Delete product' : isProductCategoriesPage ? 'Delete category' : isUnitsPage ? 'Delete unit' : isPharmaciesPage ? 'Delete pharmacy' : 'Delete company', categoryDelete: isProductCategoriesPage, companyDelete: isCompaniesPage, pharmacyDelete: isPharmaciesPage, productDelete: isProductsPage, unitDelete: isUnitsPage }, record });
                                },
                            },
                        ] : []),
                    ]}
                    columns={screen.columns}
                    error={liveResource.error}
                    loading={liveResource.loading}
                    onRowClick={(record) => {
                        setSelectedRecord(record);
                        if (screen.detailPageKey) {
                            onNavigate?.(screen.detailPageKey);
                            return;
                        }
                        setDrawerOpen(true);
                    }}
                    rows={screen.rows}
                />
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
            </Panel>

            {!isManagedCrudPage && (
                <div className="state-grid">
                    <article><strong>Empty state</strong><small>Tables show a no-record message</small></article>
                    <article><strong>Loading state</strong><small>Shared table supports loading rows</small></article>
                    <article><strong>Error state</strong><small>Shared table supports inline API errors</small></article>
                </div>
            )}

            <Modal
                actions={modalScreen.stockReceivingForm ? (
                    <>
                        <button className="btn secondary" onClick={closeWorkflowModal} type="button">Cancel</button>
                        <button className="btn primary" onClick={closeWorkflowModal} type="button">Save receiving and update stock</button>
                    </>
                ) : null}
                busy={modalBusy}
                open={modalOpen}
                onClose={closeWorkflowModal}
                onSubmit={isCompaniesPage && !modalScreenKey ? submitCompanyForm : isPharmaciesPage && !modalScreenKey ? submitPharmacyForm : isProductCategoriesPage && !modalScreenKey ? submitProductCategoryForm : isUnitsPage && !modalScreenKey ? submitUnitForm : isProductsPage && !modalScreenKey ? submitProductForm : closeWorkflowModal}
                submitDisabled={orderCreateBlocked || companySubmitting || pharmacySubmitting || productCategorySubmitting || productSubmitting || unitSubmitting}
                submitDisabledReason={companyError || pharmacyError || productCategoryError || productError || unitError || (orderCreateBlocked ? 'Company credit is blocked. Order creation is not allowed.' : '')}
                submitLabel={modalSubmitLabel}
                title={modalTitle}
            >
                {!isManagedCrudPage && <WorkflowContext context={modalContext} screenKey={modalScreenKey} />}
                {isCompaniesPage && !modalScreenKey
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
                    : isProductsPage && !modalScreenKey
                        ? productLookupsLoading ? <ProductFormSkeleton /> : (
                            <ProductForm
                                categories={unwrapCollection(productCategoriesResource.data)}
                                companies={productCompanies}
                                form={productForm}
                                onAddUnit={addProductUnit}
                                onChange={updateProductForm}
                                onImageChange={updateProductImage}
                                onRemoveUnit={removeProductUnit}
                                onUnitChange={updateProductUnit}
                                units={unwrapCollection(productUnitsResource.data)}
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
                            <button className="btn primary" disabled={companySubmitting || pharmacySubmitting || productCategorySubmitting || productSubmitting || unitSubmitting} onClick={() => confirmAction.action.companyDelete ? deleteCompany(confirmAction.record) : confirmAction.action.pharmacyDelete ? deletePharmacy(confirmAction.record) : confirmAction.action.categoryDelete ? deleteProductCategory(confirmAction.record) : confirmAction.action.unitDelete ? deleteUnit(confirmAction.record) : confirmAction.action.productDelete ? deleteProduct(confirmAction.record) : closeConfirmAction()} type="button">{confirmAction.action.label}</button>
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

            {pageKey === 'invoices' ? (
                <InvoiceDetailDrawer
                    actions={(
                        <>
                            <button className="btn secondary" onClick={() => { setDrawerOpen(false); openWorkflowModal('payments', selectedRecord, { submitLabel: 'Record payment', title: 'Record payment' }); }} type="button">Record payment</button>
                            <button className="btn secondary" onClick={() => openWorkflowModal(null, selectedRecord, { submitLabel: 'Save invoice', title: 'Edit invoice' })} type="button">Edit invoice</button>
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

                                        createScreenAction(action, onNavigate, () => openWorkflowModal(null, selectedRecord))();
                                    }}
                                    type="button"
                                >
                                    {action.label}
                                </button>
                            ))}
                            {screen.detailPageKey && (
                                <button className="btn secondary" onClick={() => onNavigate?.(screen.detailPageKey)} type="button">
                                    Open detail
                                </button>
                            )}
                            <button className="btn secondary" onClick={() => isCompaniesPage ? openCompanyForm(selectedRecord) : isPharmaciesPage ? openPharmacyForm(selectedRecord) : isProductCategoriesPage ? openProductCategoryForm(selectedRecord) : isUnitsPage ? openUnitForm(selectedRecord) : isProductsPage ? openProductForm(selectedRecord) : openWorkflowModal(null, selectedRecord, { submitLabel: `Save ${recordLabel}`, title: `Edit ${recordLabel}` })} type="button">Edit {recordLabel}</button>
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
