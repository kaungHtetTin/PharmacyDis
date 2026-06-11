import { useEffect, useState } from 'react';
import CompanyProductAssignment from '../../components/shared/CompanyProductAssignment';
import CreditStatusGrid from '../../components/shared/CreditStatusGrid';
import DataTable from '../../components/shared/DataTable';
import DocumentPreviewSet from '../../components/shared/DocumentPreviewSet';
import Drawer from '../../components/shared/Drawer';
import FilterToolbar from '../../components/shared/FilterToolbar';
import FinanceReview from '../../components/shared/FinanceReview';
import FormField from '../../components/shared/FormField';
import InvoiceDetailDrawer from '../../components/shared/InvoiceDetailDrawer';
import Modal from '../../components/shared/Modal';
import OrderCreateForm from '../../components/shared/OrderCreateForm';
import { getCompanyCreditStatus, isBlockedCredit, normalizeCreditStatuses } from '../../components/shared/OrderCreditGate';
import OrderLineBuilder from '../../components/shared/OrderLineBuilder';
import PageHeader from '../../components/shared/PageHeader';
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
import { applyLiveRows, getOfficeEndpoint, mapOfficeRows, unwrapCollection } from '../../services/screenAdapters';

const blankCompanyForm = {
    name: '',
    code: '',
    contact_person: '',
    phone: '',
    email: '',
    address: '',
    status: 'active',
};

const blankProductForm = {
    company_id: '',
    product_category_id: '',
    brand_id: '',
    base_unit_id: '',
    sku: '',
    name: '',
    description: '',
    primary_image_path: '',
    default_discount_percentage: '0',
    commission_rate_percentage: '0',
    low_stock_threshold_base_units: '0',
    base_unit_selling_price: '0',
    status: 'active',
};

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

function ProductForm({ brands = [], categories = [], companies = [], form, onChange, units = [] }) {
    const filteredBrands = brands.filter((brand) => !form.company_id || String(brand.company_id) === String(form.company_id));

    return (
        <div className="product-form-layout">
            <div className="crud-grid">
                <FormField label="Product name" name="name" onChange={onChange} required value={form.name} />
                <FormField label="SKU" name="sku" onChange={onChange} placeholder="Auto-generated if empty" value={form.sku} />
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
                <label className="form-field">
                    <span>Brand</span>
                    <select name="brand_id" onChange={onChange} value={form.brand_id}>
                        <option value="">No brand</option>
                        {filteredBrands.map((brand) => <option key={brand.id} value={brand.id}>{brand.name}</option>)}
                    </select>
                </label>
                <label className="form-field">
                    <span>Base unit</span>
                    <select name="base_unit_id" onChange={onChange} required value={form.base_unit_id}>
                        <option value="" disabled>Select base unit</option>
                        {units.map((unit) => <option key={unit.id} value={unit.id}>{unit.name}</option>)}
                    </select>
                </label>
                <FormField label="Base unit selling price" name="base_unit_selling_price" onChange={onChange} type="number" value={form.base_unit_selling_price} />
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
                <FormField label="Primary image path" name="primary_image_path" onChange={onChange} placeholder="storage/products/item.jpg" value={form.primary_image_path} />
            </div>
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

function Details({ record, screen }) {
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
                    <ProductUnitGrid readonly rows={record.productUnits} />
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

export default function OfficeModulePage({ onNavigate, pageKey }) {
    const isCompaniesPage = pageKey === 'companies';
    const isProductsPage = pageKey === 'products';
    const baseScreen = officeModules[pageKey] || officeModules.companies;
    const liveEndpoint = getOfficeEndpoint(pageKey);
    const liveResource = useApiResource(liveEndpoint);
    const productCompaniesResource = useApiResource(isProductsPage ? '/lookups/companies' : '');
    const productCategoriesResource = useApiResource(isProductsPage ? '/lookups/product-categories' : '');
    const productBrandsResource = useApiResource(isProductsPage ? '/lookups/brands' : '');
    const productUnitsResource = useApiResource(isProductsPage ? '/lookups/units' : '');
    const liveRows = liveResource.data ? mapOfficeRows(pageKey, liveResource.data) : [];
    const screen = liveEndpoint ? applyLiveRows(baseScreen, liveRows, Boolean(liveResource.data)) : baseScreen;
    const showFilterToolbar = screen.showFilterToolbar !== false;
    const showViewAction = screen.showViewAction !== false;
    const showEditAction = screen.showEditAction !== false;
    const isManagedCrudPage = isCompaniesPage || isProductsPage;
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
    const [productForm, setProductForm] = useState(blankProductForm);
    const [productError, setProductError] = useState('');
    const [productSubmitting, setProductSubmitting] = useState(false);
    const modalScreen = modalScreenKey ? officeModules[modalScreenKey] : screen;
    const modalContext = (modalScreenKey || modalTitleOverride) ? getRecordTitle(selectedRecord, '') : '';
    const modalTitle = `${modalTitleOverride || `${modalScreen.primaryAction} Form`}${modalContext ? ` - ${modalContext}` : ''}`;
    const modalSubmitLabel = modalSubmitLabelOverride || modalScreen.submitAction || modalScreen.primaryAction || `Save ${getRecordLabel(modalScreen)}`;
    const isOrderCreateModal = modalScreenKey === 'orders';
    const orderCreditStatuses = normalizeCreditStatuses(selectedRecord?.creditStatuses || modalScreen.creditStatuses || []);
    const selectedCreditStatus = getCompanyCreditStatus(orderCreditStatuses, selectedOrderCompany);
    const orderCreateBlocked = isOrderCreateModal && isBlockedCredit(selectedCreditStatus?.status);
    const primaryAction = {
        label: screen.primaryAction,
        target: screen.primaryActionTarget,
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
        setProductError('');
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
    const openProductForm = (record = null) => {
        const nextForm = record ? {
            company_id: record.company_id || '',
            product_category_id: record.product_category_id || '',
            brand_id: record.brand_id || '',
            base_unit_id: record.base_unit_id || '',
            sku: record.sku || '',
            name: record.name || '',
            description: record.description || '',
            primary_image_path: record.primary_image_path || '',
            default_discount_percentage: String(record.default_discount_percentage ?? 0),
            commission_rate_percentage: String(record.commission_rate_percentage ?? 0),
            low_stock_threshold_base_units: String(record.low_stock_threshold_base_units ?? 0),
            base_unit_selling_price: String(record.base_unit_selling_price ?? 0),
            status: String(record.status || 'active').toLowerCase(),
        } : blankProductForm;

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
        setProductForm((current) => ({
            ...current,
            [name]: value,
            ...(name === 'company_id' ? { brand_id: '' } : {}),
        }));
        setProductError('');
    };
    const submitProductForm = async () => {
        setProductSubmitting(true);
        setProductError('');

        try {
            if (selectedRecord?.id) {
                await api.put(`/office/products/${selectedRecord.id}`, productForm);
            } else {
                await api.post('/office/products', productForm);
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
                action={<button className="btn primary" onClick={isCompaniesPage ? () => openCompanyForm() : isProductsPage ? () => openProductForm() : createScreenAction(primaryAction, onNavigate, () => openWorkflowModal(null, selectedRecord))} type="button">{screen.primaryAction}</button>}
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
                {showFilterToolbar && <FilterToolbar filters={screen.filters} showDate />}
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
                                onClick: (record) => isCompaniesPage ? openCompanyForm(record) : isProductsPage ? openProductForm(record) : openWorkflowModal(null, record, {
                                    submitLabel: screen.editSubmitLabel || `Save ${recordLabel}`,
                                    title: screen.editActionLabel || `Edit ${recordLabel}`,
                                }),
                            },
                        ] : []),
                        ...(isManagedCrudPage ? [
                            {
                                label: isProductsPage ? 'Delete product' : 'Delete company',
                                variant: 'danger',
                                onClick: (record) => {
                                    setSelectedRecord(record);
                                    setConfirmAction({ action: { label: isProductsPage ? 'Delete product' : 'Delete company', companyDelete: isCompaniesPage, productDelete: isProductsPage }, record });
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
                open={modalOpen}
                onClose={closeWorkflowModal}
                onSubmit={isCompaniesPage && !modalScreenKey ? submitCompanyForm : isProductsPage && !modalScreenKey ? submitProductForm : closeWorkflowModal}
                submitDisabled={orderCreateBlocked || companySubmitting || productSubmitting}
                submitDisabledReason={companyError || productError || (orderCreateBlocked ? 'Company credit is blocked. Order creation is not allowed.' : '')}
                submitLabel={modalSubmitLabel}
                title={modalTitle}
            >
                <WorkflowContext context={modalContext} screenKey={modalScreenKey} />
                {isCompaniesPage && !modalScreenKey
                    ? <CompanyForm form={companyForm} onChange={updateCompanyForm} />
                    : isProductsPage && !modalScreenKey
                        ? (
                            <ProductForm
                                brands={unwrapCollection(productBrandsResource.data)}
                                categories={unwrapCollection(productCategoriesResource.data)}
                                companies={unwrapCollection(productCompaniesResource.data)}
                                form={productForm}
                                onChange={updateProductForm}
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
                    actions={(
                        <>
                            <button className="btn secondary" onClick={closeConfirmAction} type="button">Cancel</button>
                            <button className="btn primary" disabled={companySubmitting || productSubmitting} onClick={() => confirmAction.action.companyDelete ? deleteCompany(confirmAction.record) : confirmAction.action.productDelete ? deleteProduct(confirmAction.record) : closeConfirmAction()} type="button">{confirmAction.action.label}</button>
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
                            <button className="btn secondary" onClick={() => isCompaniesPage ? openCompanyForm(selectedRecord) : isProductsPage ? openProductForm(selectedRecord) : openWorkflowModal(null, selectedRecord, { submitLabel: `Save ${recordLabel}`, title: `Edit ${recordLabel}` })} type="button">Edit {recordLabel}</button>
                            <button className="btn primary" onClick={() => setDrawerOpen(false)} type="button">Done</button>
                        </>
                    )}
                    eyebrow={`${screen.title} Detail`}
                    open={drawerOpen}
                    onClose={() => setDrawerOpen(false)}
                    title={selectedRecord?.name || selectedRecord?.order || selectedRecord?.invoice || selectedRecord?.receipt || screen.title}
                >
                    <Details record={selectedRecord} screen={screen} />
                </Drawer>
            )}
        </div>
    );
}
