import { useEffect, useState } from 'react';
import DataTable from '../../components/shared/DataTable';
import Drawer from '../../components/shared/Drawer';
import FilterToolbar from '../../components/shared/FilterToolbar';
import FormField from '../../components/shared/FormField';
import Icon from '../../components/shared/Icon';
import Modal from '../../components/shared/Modal';
import PageHeader from '../../components/shared/PageHeader';
import PaginationBar from '../../components/shared/PaginationBar';
import Panel from '../../components/shared/Panel';
import { getOrderStockStatus } from '../../components/shared/OrderLineBuilder';
import SalesOrderCreateForm from '../../components/shared/SalesOrderCreateForm';
import SalesWorkspacePreview from '../../components/shared/SalesWorkspacePreview';
import StatusBadge from '../../components/shared/StatusBadge';
import SummaryCard from '../../components/shared/SummaryCard';
import Tabs from '../../components/shared/Tabs';
import { isBlockedCredit } from '../../components/shared/OrderCreditGate';
import { salesModules } from '../../data/salesModules';
import useApiResource from '../../hooks/useApiResource';
import { useAuth } from '../../services/auth.jsx';
import { api } from '../../services/apiClient';
import { applyLiveRows, getSalesEndpoint, mapOrders, mapSalesRows, unwrapCollection } from '../../services/screenAdapters';

function readSubmittedOrderSnapshot() {
    try {
        return JSON.parse(window.sessionStorage.getItem('sales:last-submitted-order') || 'null');
    } catch {
        return null;
    }
}

function defaultPaymentDueDate() {
    const dueDays = Number(window.appConfig?.invoiceDueDays ?? 30);
    const date = new Date();
    date.setDate(date.getDate() + dueDays);

    return date.toISOString().slice(0, 10);
}

const blankStockFilters = {
    foc_active: '',
    search: '',
    status: '',
};

function buildSalesStockEndpoint(filters = blankStockFilters, page = 1) {
    const params = new URLSearchParams({ page: String(page), per_page: '15' });

    if (filters.search) {
        params.set('search', filters.search);
    }

    if (filters.status) {
        params.set('status', filters.status);
    }

    if (filters.foc_active) {
        params.set('foc_active', '1');
    }

    return `/sales/stock/current?${params.toString()}`;
}

function SubmittedOrderPage({ onNavigate }) {
    const routeSearchParams = new URLSearchParams(window.location.search);
    const orderId = routeSearchParams.get('order_id') || '';
    const ordersResource = useApiResource(orderId ? '/sales/orders?per_page=25' : '');
    const mappedOrders = ordersResource.data ? mapOrders(ordersResource.data) : [];
    const liveOrder = mappedOrders.find((order) => String(order.id) === String(orderId));
    const snapshot = readSubmittedOrderSnapshot();
    const order = liveOrder || (String(snapshot?.id || '') === String(orderId) ? snapshot : null);
    const orderNo = order?.order || snapshot?.order || 'Submitted order';
    const pharmacy = order?.pharmacy || snapshot?.pharmacy || 'Selected pharmacy';
    const total = order?.total || snapshot?.total || '-';
    const invoiceNo = order?.invoice || snapshot?.invoice || '-';
    const invoiceBalance = order?.invoiceBalance || snapshot?.invoiceBalance || total;
    const submittedDate = order?.submittedDate || snapshot?.submittedDate || new Date().toISOString().slice(0, 10);
    const status = order?.status || snapshot?.status || 'Submitted';

    return (
        <div className="sales-page">
            <PageHeader
                action={(
                    <div className="page-heading-actions">
                        <button className="btn secondary" onClick={() => onNavigate?.('orders')} type="button">Order history</button>
                        <button className="btn primary" onClick={() => onNavigate?.('new-order')} type="button">New order</button>
                    </div>
                )}
                description="An unpaid invoice has been generated and the order is waiting for office approval and stock reservation."
                eyebrow="Order Submitted"
                title="Order submitted successfully"
            />

            <Panel eyebrow="Submitted" title={orderNo}>
                {ordersResource.error && <span className="error-text">{ordersResource.error}</span>}
                {ordersResource.loading && <span className="muted">Refreshing submitted order...</span>}
                <section className="sales-order-submitted-card">
                    <div className="submitted-order-mark">
                        <Icon name="check" size={28} />
                    </div>
                    <div>
                        <p className="eyebrow">Office approval queue</p>
                        <h2>{orderNo}</h2>
                        <p>{pharmacy}</p>
                    </div>
                    <StatusBadge value={status} />
                </section>
                <div className="state-grid submitted-order-summary">
                    <article>
                        <small>Invoice</small>
                        <strong>{invoiceNo}</strong>
                    </article>
                    <article>
                        <small>Balance due</small>
                        <strong>{invoiceBalance}</strong>
                    </article>
                    <article>
                        <small>Order total</small>
                        <strong>{total}</strong>
                    </article>
                    <article>
                        <small>Submitted date</small>
                        <strong>{submittedDate}</strong>
                    </article>
                    <article>
                        <small>Invoice status</small>
                        <strong>Unpaid</strong>
                    </article>
                    <article>
                        <small>Next step</small>
                        <strong>Office approval</strong>
                    </article>
                </div>
                <div className="submitted-order-actions">
                    <button className="btn secondary" onClick={() => onNavigate?.('orders')} type="button">View order history</button>
                    <button className="btn primary" onClick={() => onNavigate?.('new-order')} type="button">Create another order</button>
                </div>
            </Panel>
        </div>
    );
}

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
    const [stockFilters, setStockFilters] = useState(blankStockFilters);
    const [stockPage, setStockPage] = useState(1);
    const liveEndpoint = pageKey === 'stock' ? buildSalesStockEndpoint(stockFilters, stockPage) : getSalesEndpoint(pageKey);
    const liveResource = useApiResource(liveEndpoint);
    const [pharmacySearch, setPharmacySearch] = useState('');
    const [debouncedPharmacySearch, setDebouncedPharmacySearch] = useState('');
    const customerLookupQuery = new URLSearchParams({
        limit: '30',
        search: debouncedPharmacySearch,
    });
    const customersResource = useApiResource(pageKey === 'new-order' ? `/lookups/customers?${customerLookupQuery.toString()}` : '');
    const productsResource = useApiResource(pageKey === 'new-order' ? '/lookups/products' : '');
    const stockResource = useApiResource(pageKey === 'new-order' ? '/sales/stock/current?per_page=100' : '', { keepPreviousData: true });
    const liveRows = liveResource.data ? mapSalesRows(pageKey, liveResource.data) : [];
    const screen = liveEndpoint ? applyLiveRows(baseScreen, liveRows) : baseScreen;
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [focDialogRecord, setFocDialogRecord] = useState(null);
    const [pageIndex, setPageIndex] = useState(0);
    const [selectedRecord, setSelectedRecord] = useState(screen.rows[0]);
    const [orderForm, setOrderForm] = useState({ customer_id: '', requested_delivery_date: '', payment_due_date: defaultPaymentDueDate(), tax_amount: '0', note: '' });
    const [orderLines, setOrderLines] = useState([{ id: 'draft-line-1', product_id: '', unit_id: '', quantity: '', foc_unit_id: '', foc_quantity: '' }]);
    const [submitError, setSubmitError] = useState('');
    const [submitSuccess, setSubmitSuccess] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const pageSize = screen.pageSize || 6;
    const totalPages = Math.max(1, Math.ceil(screen.rows.length / pageSize));
    const pageStart = pageIndex * pageSize;
    const pageEnd = Math.min(pageStart + pageSize, screen.rows.length);
    const visibleRows = screen.rows.slice(pageStart, pageStart + pageSize);
    const tableColumns = pageKey === 'stock'
        ? screen.columns.map((column) => (column.key === 'focOffer'
            ? {
                ...column,
                sortable: false,
                render: (row, value) => (row.hasActiveFoc ? (
                    <button
                        className="foc-offer-btn"
                        onClick={(event) => {
                            event.stopPropagation();
                            setFocDialogRecord(row);
                        }}
                        type="button"
                    >
                        {value}
                    </button>
                ) : <span className="muted">-</span>),
            }
            : column))
        : screen.columns;
    const stockFilterControls = [
        {
            key: 'status',
            label: 'Status',
            options: [
                { label: 'Available', value: 'available' },
                { label: 'Low Stock', value: 'low_stock' },
                { label: 'Near Expiry', value: 'near_expiry' },
            ],
            placeholder: 'All statuses',
            value: stockFilters.status,
        },
        {
            key: 'foc_active',
            label: 'FOC',
            options: [{ label: 'FOC active', value: '1' }],
            placeholder: 'All FOC',
            value: stockFilters.foc_active,
        },
    ];
    const salesOrderBlocked = pageKey === 'new-order' && isBlockedCredit(screen.salesOrderContext?.creditStatus);
    const customers = unwrapCollection(customersResource.data);
    const products = unwrapCollection(productsResource.data);
    const stockRows = unwrapCollection(stockResource.data);
    const stockPagination = pageKey === 'stock' ? {
        currentPage: Number(liveResource.data?.meta?.current_page || 1),
        from: Number(liveResource.data?.meta?.from || 0),
        lastPage: Number(liveResource.data?.meta?.last_page || 1),
        to: Number(liveResource.data?.meta?.to || 0),
        total: Number(liveResource.data?.meta?.total || screen.rows.length),
    } : null;
    const displayedRows = pageKey === 'stock' ? screen.rows : visibleRows;
    const displayedPagination = stockPagination || {
        currentPage: pageIndex + 1,
        from: screen.rows.length ? pageStart + 1 : 0,
        lastPage: totalPages,
        to: pageEnd,
        total: screen.rows.length,
    };
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

    if (pageKey === 'order-submitted') {
        return <SubmittedOrderPage onNavigate={onNavigate} />;
    }

    function openRecord(record) {
        if (pageKey === 'stock') {
            return;
        }

        if (pageKey === 'orders') {
            onNavigate?.('order-detail', { order_id: record?.id || '' });
            return;
        }

        if (screen.detailPageKey) {
            onNavigate?.(screen.detailPageKey, { customer_id: record?.id || '' });
            return;
        }

        setSelectedRecord(record);
        setDrawerOpen(true);
    }

    function runPrimaryAction() {
        if (pageKey === 'stock') {
            liveResource.refresh?.();
            return;
        }

        if (screen.primaryActionTarget) {
            onNavigate?.(screen.primaryActionTarget);
            return;
        }

        setModalOpen(true);
    }

    function updateStockSearch(value) {
        setStockFilters((current) => ({ ...current, search: value }));
        setStockPage(1);
        setPageIndex(0);
    }

    function updateStockFilter(key, value) {
        setStockFilters((current) => ({ ...current, [key]: value }));
        setStockPage(1);
        setPageIndex(0);
    }

    function resetStockFilters() {
        setStockFilters(blankStockFilters);
        setStockPage(1);
        setPageIndex(0);
    }

    function updateOrderForm(event) {
        setOrderForm((current) => ({ ...current, [event.target.name]: event.target.value }));
        setSubmitError('');
        setSubmitSuccess('');
    }

    async function submitSalesOrder(event) {
        event.preventDefault();
        const stockStatus = getOrderStockStatus(orderLines, products, stockRows);

        if (stockResource.loading) {
            setSubmitError('Checking available stock. Please wait a moment before submitting.');
            return;
        }

        if (stockResource.error) {
            setSubmitError(stockResource.error);
            return;
        }

        if (stockStatus.hasShortage) {
            const firstShortage = stockStatus.shortages[0];
            const productName = firstShortage?.demand?.product?.name || 'selected product';
            setSubmitError(`${productName} does not have enough available stock for ordered and FOC quantity.`);
            return;
        }

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
                    foc_unit_id: Number(line.foc_quantity || 0) > 0 ? line.foc_unit_id || line.unit_id || null : null,
                    foc_quantity: Number(line.foc_quantity || 0),
                })),
            };

            const response = await api.post('/sales/orders', payload);
            const [submittedOrder] = mapOrders({ data: [response.data || response] });
            if (submittedOrder) {
                window.sessionStorage.setItem('sales:last-submitted-order', JSON.stringify(submittedOrder));
            }
            setOrderForm({ customer_id: '', requested_delivery_date: '', payment_due_date: defaultPaymentDueDate(), tax_amount: '0', note: '' });
            setPharmacySearch('');
            setOrderLines([{ id: `draft-line-${Date.now()}`, product_id: '', unit_id: '', quantity: '', foc_unit_id: '', foc_quantity: '' }]);
            onNavigate?.('order-submitted', { order_id: submittedOrder?.id || response.data?.id || response.id || '' });
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
                            {(customersResource.loading || productsResource.loading || stockResource.loading) && <span className="submit-disabled-note">Loading assigned records...</span>}
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
                    stockError={stockResource.error}
                    stockLoading={stockResource.loading}
                    stockRows={stockRows}
                    submitting={submitting}
                    success={submitSuccess}
                />
            </div>
        );
    }

    return (
        <div className="sales-page">
            <PageHeader
                action={screen.primaryAction ? <button className="btn primary" onClick={runPrimaryAction} type="button">{screen.primaryAction}</button> : null}
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
                <FilterToolbar
                    filters={pageKey === 'stock' ? stockFilterControls : screen.filters}
                    onFilterChange={pageKey === 'stock' ? updateStockFilter : undefined}
                    onReset={pageKey === 'stock' ? resetStockFilters : undefined}
                    onSearch={pageKey === 'stock' ? updateStockSearch : undefined}
                    searchPlaceholder={screen.searchPlaceholder || 'Search assigned records'}
                    searchValue={pageKey === 'stock' ? stockFilters.search : undefined}
                    showDate={screen.showDate}
                />
                <DataTable
                    columns={tableColumns}
                    error={liveResource.error}
                    loading={liveResource.loading}
                    onRowClick={pageKey === 'stock' ? undefined : openRecord}
                    rows={displayedRows}
                />
                <PaginationBar
                    currentPage={displayedPagination.currentPage}
                    from={displayedPagination.from}
                    lastPage={displayedPagination.lastPage}
                    loading={liveResource.loading}
                    onNext={pageKey === 'stock'
                        ? () => setStockPage((page) => Math.min(displayedPagination.lastPage, page + 1))
                        : () => setPageIndex((page) => Math.min(totalPages - 1, page + 1))}
                    onPrevious={pageKey === 'stock'
                        ? () => setStockPage((page) => Math.max(1, page - 1))
                        : () => setPageIndex((page) => Math.max(0, page - 1))}
                    to={displayedPagination.to}
                    total={displayedPagination.total}
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

            <Modal
                actions={<button className="btn primary" onClick={() => setFocDialogRecord(null)} type="button">Done</button>}
                open={Boolean(focDialogRecord)}
                onClose={() => setFocDialogRecord(null)}
                title={`FOC rules - ${focDialogRecord?.product || 'Product'}`}
            >
                <div className="foc-rule-dialog-list">
                    {(focDialogRecord?.focRules || []).map((rule) => (
                        <article key={rule.id || rule.title}>
                            <div>
                                <strong>{rule.title}</strong>
                                <StatusBadge value={rule.status || 'Active'} />
                            </div>
                            <span>{rule.condition}</span>
                            <small>{rule.reward}</small>
                            <small>{rule.validity}</small>
                        </article>
                    ))}
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
