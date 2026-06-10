import { useState } from 'react';
import CompanyProductAssignment from '../../components/shared/CompanyProductAssignment';
import CreditStatusGrid from '../../components/shared/CreditStatusGrid';
import DataTable from '../../components/shared/DataTable';
import DocumentPreviewSet from '../../components/shared/DocumentPreviewSet';
import Drawer from '../../components/shared/Drawer';
import FilterToolbar from '../../components/shared/FilterToolbar';
import FinanceReview from '../../components/shared/FinanceReview';
import FormField from '../../components/shared/FormField';
import Modal from '../../components/shared/Modal';
import PageHeader from '../../components/shared/PageHeader';
import Panel from '../../components/shared/Panel';
import PrintPreview from '../../components/shared/PrintPreview';
import ProductImageGallery from '../../components/shared/ProductImageGallery';
import ProductUnitGrid from '../../components/shared/ProductUnitGrid';
import RepAssignmentGrid from '../../components/shared/RepAssignmentGrid';
import ReportsWorkspace from '../../components/shared/ReportsWorkspace';
import RuleSetupPreview from '../../components/shared/RuleSetupPreview';
import SalesOrderDetail from '../../components/shared/SalesOrderDetail';
import SettingsWorkspace from '../../components/shared/SettingsWorkspace';
import StockReceivingDetail from '../../components/shared/StockReceivingDetail';
import StockReceivingForm from '../../components/shared/StockReceivingForm';
import StockMovementTimeline from '../../components/shared/StockMovementTimeline';
import SummaryCard from '../../components/shared/SummaryCard';
import Tabs from '../../components/shared/Tabs';
import UnitConversionPreview from '../../components/shared/UnitConversionPreview';
import { officeModules } from '../../data/officeModules';

function FieldGrid({ fields }) {
    return (
        <div className="crud-grid">
            {fields.map((field) => <FormField key={field.label} {...field} />)}
        </div>
    );
}

function ModalExtra({ screen }) {
    if (screen.approvalFields) {
        return (
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
                            <h2>Assigned companies and product access</h2>
                        </div>
                        <button className="btn secondary" type="button">Assign company</button>
                    </div>
                    <RepAssignmentGrid assignments={screen.repAssignments} />
                    <p className="helper-copy">Sales representatives can only see and sell products from assigned companies.</p>
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

    if (!screen.productUnitRows && !screen.imageGallery && !screen.conversionPreviews) {
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
            {screen.imageGallery && (
                <section className="form-section">
                    <div className="section-heading">
                        <div>
                            <p className="eyebrow">Images</p>
                            <h2>Product gallery preview</h2>
                        </div>
                        <button className="btn secondary" type="button">Add image</button>
                    </div>
                    <ProductImageGallery images={screen.imageGallery} />
                    <p className="helper-copy">Image upload is a local storage placeholder for product photos, labels, and packaging views.</p>
                </section>
            )}
            {screen.conversionPreviews && (
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

function ModalContent({ screen }) {
    if (screen.stockReceivingForm) {
        return <StockReceivingForm headerFields={screen.headerFields || []} />;
    }

    return (
        <>
            <FieldGrid fields={screen.formFields || []} />
            <ModalExtra screen={screen} />
        </>
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
            {(record?.imageGallery || screen.imageGallery) && (
                <section className="drawer-section">
                    <p className="eyebrow">Gallery preview</p>
                    <ProductImageGallery images={record?.imageGallery || screen.imageGallery} />
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
                    <p className="eyebrow">Assigned companies and products</p>
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
                    metrics={screen.reportMetrics || []}
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

export default function OfficeModulePage({ pageKey }) {
    const screen = officeModules[pageKey] || officeModules.companies;
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedRecord, setSelectedRecord] = useState(screen.rows[0]);

    return (
        <div className="page-stack">
            <PageHeader
                action={<button className="btn primary" onClick={() => setModalOpen(true)} type="button">{screen.primaryAction}</button>}
                description={screen.description}
                eyebrow={screen.eyebrow}
                title={screen.title}
            />

            {screen.summaries && (
                <div className="summary-grid">
                    {screen.summaries.map((summary) => <SummaryCard key={summary.label} {...summary} />)}
                </div>
            )}

            <Panel eyebrow="Workspace" title={`${screen.title} List`}>
                <FilterToolbar filters={screen.filters} showDate />
                <DataTable
                    actions={[
                        { label: 'View', onClick: (record) => { setSelectedRecord(record); setDrawerOpen(true); } },
                        { label: 'Edit', onClick: (record) => { setSelectedRecord(record); setModalOpen(true); } },
                    ]}
                    columns={screen.columns}
                    onRowClick={(record) => { setSelectedRecord(record); setDrawerOpen(true); }}
                    rows={screen.rows}
                />
            </Panel>

            <div className="state-grid">
                <article><strong>Empty state</strong><small>Tables show a no-record message</small></article>
                <article><strong>Loading state</strong><small>Shared table supports loading rows</small></article>
                <article><strong>Error state</strong><small>Shared table supports inline API errors</small></article>
            </div>

            <Modal
                actions={screen.stockReceivingForm ? (
                    <>
                        <button className="btn secondary" onClick={() => setModalOpen(false)} type="button">Cancel</button>
                        <button className="btn primary" onClick={() => setModalOpen(false)} type="button">Save receiving and update stock</button>
                    </>
                ) : null}
                open={modalOpen}
                onClose={() => setModalOpen(false)}
                onSubmit={() => setModalOpen(false)}
                title={`${screen.primaryAction} Form`}
            >
                <ModalContent screen={screen} />
            </Modal>

            <Drawer
                actions={(
                    <>
                        <button className="btn secondary" onClick={() => setModalOpen(true)} type="button">Edit</button>
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
        </div>
    );
}
