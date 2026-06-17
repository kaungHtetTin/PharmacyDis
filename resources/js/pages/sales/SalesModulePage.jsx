import { useEffect, useState } from 'react';
import DataTable from '../../components/shared/DataTable';
import Drawer from '../../components/shared/Drawer';
import FilterToolbar from '../../components/shared/FilterToolbar';
import FormField from '../../components/shared/FormField';
import Modal from '../../components/shared/Modal';
import PageHeader from '../../components/shared/PageHeader';
import PaginationBar from '../../components/shared/PaginationBar';
import Panel from '../../components/shared/Panel';
import SalesOrderCreateForm from '../../components/shared/SalesOrderCreateForm';
import SalesWorkspacePreview from '../../components/shared/SalesWorkspacePreview';
import SummaryCard from '../../components/shared/SummaryCard';
import Tabs from '../../components/shared/Tabs';
import { isBlockedCredit } from '../../components/shared/OrderCreditGate';
import { salesModules } from '../../data/salesModules';
import useApiResource from '../../hooks/useApiResource';
import { useAuth } from '../../services/auth.jsx';
import { api } from '../../services/apiClient';
import { applyLiveRows, getSalesEndpoint, mapSalesRows, unwrapCollection } from '../../services/screenAdapters';

function SalesDetails({ record, screen }) {
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
                <strong>{record?.name || record?.product || record?.order || record?.metric || 'Review record'}</strong>
            </div>
            {screen.drawerSections?.map((section) => (
                <section className="drawer-section" key={section.title}>
                    <p className="eyebrow">{section.title}</p>
                    <div className="line-list">
                        {section.items.map((item) => <span key={item}>{item}</span>)}
                    </div>
                </section>
            ))}
            <SalesWorkspacePreview record={record} screen={screen} />
            {tabs && <Tabs tabs={tabs} />}
        </div>
    );
}

export default function SalesModulePage({ onNavigate, pageKey }) {
    const { user } = useAuth();
    const baseScreen = salesModules[pageKey] || salesModules.stock;
    const liveEndpoint = getSalesEndpoint(pageKey);
    const liveResource = useApiResource(liveEndpoint);
    const [pharmacySearch, setPharmacySearch] = useState('');
    const [debouncedPharmacySearch, setDebouncedPharmacySearch] = useState('');
    const customerLookupQuery = new URLSearchParams({
        limit: '30',
        search: debouncedPharmacySearch,
    });
    const customersResource = useApiResource(pageKey === 'new-order' ? `/lookups/customers?${customerLookupQuery.toString()}` : '');
    const productsResource = useApiResource(pageKey === 'new-order' ? '/lookups/products' : '');
    const liveRows = liveResource.data ? mapSalesRows(pageKey, liveResource.data) : [];
    const screen = liveEndpoint ? applyLiveRows(baseScreen, liveRows) : baseScreen;
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [pageIndex, setPageIndex] = useState(0);
    const [selectedRecord, setSelectedRecord] = useState(screen.rows[0]);
    const [orderForm, setOrderForm] = useState({ customer_id: '', requested_delivery_date: '', note: '' });
    const [orderLines, setOrderLines] = useState([{ id: 'draft-line-1', product_id: '', unit_id: '', quantity: '' }]);
    const [submitError, setSubmitError] = useState('');
    const [submitSuccess, setSubmitSuccess] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const pageSize = screen.pageSize || 6;
    const totalPages = Math.max(1, Math.ceil(screen.rows.length / pageSize));
    const pageStart = pageIndex * pageSize;
    const pageEnd = Math.min(pageStart + pageSize, screen.rows.length);
    const visibleRows = screen.rows.slice(pageStart, pageStart + pageSize);
    const salesOrderBlocked = pageKey === 'new-order' && isBlockedCredit(screen.salesOrderContext?.creditStatus);
    const customers = unwrapCollection(customersResource.data);
    const products = unwrapCollection(productsResource.data);
    const assignedContext = {
        ...screen.salesOrderContext,
        representative: user?.name || screen.salesOrderContext?.representative,
        company: user?.sales_representative?.company?.name || screen.salesOrderContext?.company,
        region: user?.sales_representative?.region || screen.salesOrderContext?.region,
    };

    useEffect(() => {
        setPageIndex(0);
        setSelectedRecord(screen.rows[0]);
    }, [pageKey, screen.rows]);

    useEffect(() => {
        const timeout = window.setTimeout(() => {
            setDebouncedPharmacySearch(pharmacySearch.trim());
        }, 240);

        return () => window.clearTimeout(timeout);
    }, [pharmacySearch]);

    function openRecord(record) {
        if (screen.detailPageKey) {
            onNavigate?.(screen.detailPageKey, { customer_id: record?.id || '' });
            return;
        }

        setSelectedRecord(record);
        setDrawerOpen(true);
    }

    function runPrimaryAction() {
        if (screen.primaryActionTarget) {
            onNavigate?.(screen.primaryActionTarget);
            return;
        }

        setModalOpen(true);
    }

    function updateOrderForm(event) {
        setOrderForm((current) => ({ ...current, [event.target.name]: event.target.value }));
        setSubmitError('');
        setSubmitSuccess('');
    }

    async function submitSalesOrder(event) {
        event.preventDefault();
        setSubmitting(true);
        setSubmitError('');
        setSubmitSuccess('');

        try {
            const payload = {
                ...orderForm,
                items: orderLines.map((line) => ({
                    product_id: line.product_id,
                    unit_id: line.unit_id,
                    quantity: line.quantity,
                })),
            };

            await api.post('/sales/orders', payload);
            setSubmitSuccess('Order submitted for office approval.');
            setOrderForm({ customer_id: '', requested_delivery_date: '', note: '' });
            setPharmacySearch('');
            setOrderLines([{ id: `draft-line-${Date.now()}`, product_id: '', unit_id: '', quantity: '' }]);
        } catch (requestError) {
            setSubmitError(requestError.message);
        } finally {
            setSubmitting(false);
        }
    }

    if (pageKey === 'new-order') {
        return (
            <div className="sales-page">
                <PageHeader
                    action={(
                        <div className="page-heading-actions">
                            {(customersResource.loading || productsResource.loading) && <span className="submit-disabled-note">Loading assigned records...</span>}
                            {salesOrderBlocked && <span className="submit-disabled-note">Company credit is blocked. Order creation is not allowed.</span>}
                        </div>
                    )}
                    description={screen.description}
                    eyebrow={screen.eyebrow}
                    title={screen.title}
                />

                <SalesOrderCreateForm
                    context={assignedContext}
                    customers={customers}
                    error={submitError || customersResource.error || productsResource.error}
                    form={orderForm}
                    lines={orderLines}
                    onChange={updateOrderForm}
                    onLineChange={setOrderLines}
                    onPharmacySearchChange={setPharmacySearch}
                    onSubmit={submitSalesOrder}
                    pharmacyLoading={customersResource.loading}
                    pharmacySearch={pharmacySearch}
                    productOptions={products}
                    submitting={submitting}
                    success={submitSuccess}
                />
            </div>
        );
    }

    return (
        <div className="sales-page">
            <PageHeader
                action={<button className="btn primary" onClick={runPrimaryAction} type="button">{screen.primaryAction}</button>}
                description={screen.description}
                eyebrow={screen.eyebrow}
                title={screen.title}
            />

            {screen.summaries && (
                <div className="summary-grid">
                    {screen.summaries.map((summary) => <SummaryCard key={summary.label} {...summary} />)}
                </div>
            )}

            {(screen.productCards || screen.orderBuilder || screen.infoCards || screen.timeline) && (
                <Panel eyebrow="Mobile Preview" title={screen.previewTitle || 'Sales workspace'}>
                    <SalesWorkspacePreview screen={screen} />
                </Panel>
            )}

            <Panel eyebrow="Mobile Workspace" title={`${screen.title} Review`}>
                <FilterToolbar filters={screen.filters} searchPlaceholder={screen.searchPlaceholder || 'Search assigned records'} showDate={screen.showDate} />
                <DataTable
                    columns={screen.columns}
                    error={liveResource.error}
                    loading={liveResource.loading}
                    onRowClick={openRecord}
                    rows={visibleRows}
                />
                <PaginationBar
                    currentPage={pageIndex + 1}
                    from={screen.rows.length ? pageStart + 1 : 0}
                    lastPage={totalPages}
                    onNext={() => setPageIndex((page) => Math.min(totalPages - 1, page + 1))}
                    onPrevious={() => setPageIndex((page) => Math.max(0, page - 1))}
                    to={pageEnd}
                    total={screen.rows.length}
                />
            </Panel>

            <Modal
                open={modalOpen}
                onClose={() => setModalOpen(false)}
                onSubmit={() => setModalOpen(false)}
                submitDisabled={salesOrderBlocked}
                submitDisabledReason={salesOrderBlocked ? 'Company credit is blocked. Order creation is not allowed.' : ''}
                submitLabel={screen.primaryAction}
                title={`${screen.primaryAction} Form`}
            >
                <div className="crud-grid">
                    {(screen.formFields || [
                        { label: 'Search customer' },
                        { label: 'Search product' },
                        { label: 'Quantity', type: 'number' },
                        { label: 'Unit', type: 'select', options: ['Box', 'Card', 'Bottle'] },
                    ]).map((field) => <FormField key={field.label} {...field} />)}
                </div>
            </Modal>

            <Drawer
                actions={<button className="btn primary" onClick={() => setDrawerOpen(false)} type="button">Done</button>}
                eyebrow={`${screen.title} Detail`}
                open={drawerOpen}
                onClose={() => setDrawerOpen(false)}
                title={selectedRecord?.name || selectedRecord?.product || selectedRecord?.order || selectedRecord?.metric || screen.title}
            >
                <SalesDetails record={selectedRecord} screen={screen} />
            </Drawer>
        </div>
    );
}
