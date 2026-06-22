import { useState } from 'react';
import Modal from '../../components/shared/Modal';
import PageHeader from '../../components/shared/PageHeader';
import Panel from '../../components/shared/Panel';
import SalesOrderDetail from '../../components/shared/SalesOrderDetail';
import StatusBadge from '../../components/shared/StatusBadge';
import useApiResource from '../../hooks/useApiResource';
import { api } from '../../services/apiClient';
import { rememberGeneratedInvoice } from '../../services/generatedInvoiceCache';
import { mapOrders, unwrapCollection } from '../../services/screenAdapters';

function notifyOperationalActionsChanged() {
    window.dispatchEvent(new Event('office-operational-actions-changed'));
}

function orderStatusValue(order) {
    return String(order?.status_value || order?.status || '').toLowerCase();
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

function DetailFactGrid({ order }) {
    const facts = [
        ['Sales rep', order.rep],
        ['Order date', order.submittedDate || '-'],
        ['Requested delivery', order.requestedDeliveryDate || '-'],
        ['Stock', order.stockStatus],
        ['Credit', order.creditStatus],
        ['Invoice', order.invoice_id ? 'Generated' : 'Not generated'],
        ['Order lines', String(order.orderItems?.length || 0)],
        ['FOC rewards', String(order.focItems?.length || 0)],
    ];

    return (
        <div className="fact-grid order-detail-facts">
            {facts.map(([label, value]) => (
                <div key={label}>
                    <span>{label}</span>
                    <strong>{value || '-'}</strong>
                </div>
            ))}
        </div>
    );
}

export default function OrderDetailPage({ onNavigate }) {
    const params = new URLSearchParams(window.location.search);
    const orderId = params.get('order_id') || '';
    const orderResource = useApiResource(orderId ? `/office/orders?order_id=${orderId}&per_page=1` : '');
    const warehousesResource = useApiResource('/office/warehouses?per_page=100');
    const [approvalOpen, setApprovalOpen] = useState(false);
    const [approvalWarehouseId, setApprovalWarehouseId] = useState('');
    const [busy, setBusy] = useState(false);
    const [actionError, setActionError] = useState('');
    const [order] = orderResource.data ? mapOrders(orderResource.data) : [];
    const warehouses = unwrapCollection(warehousesResource.data);
    const status = orderStatusValue(order);
    const canApprove = status === 'submitted';
    const canGenerateInvoice = status === 'approved';
    const canDeliver = ['approved', 'invoiced'].includes(status);
    const canOpenInvoice = Boolean(order?.invoice_id);

    const closeApproval = () => {
        if (!busy) {
            setApprovalOpen(false);
            setApprovalWarehouseId('');
            setActionError('');
        }
    };

    const openApproval = () => {
        setApprovalWarehouseId(warehouses[0]?.id || '');
        setActionError('');
        setApprovalOpen(true);
    };

    const refreshAfterAction = () => {
        notifyOperationalActionsChanged();
        orderResource.refresh();
    };

    const approveOrder = async () => {
        if (!order?.id || !approvalWarehouseId || busy) {
            return;
        }

        setBusy(true);
        setActionError('');

        try {
            await api.post(`/office/orders/${order.id}/approve`, { warehouse_id: approvalWarehouseId });
            refreshAfterAction();
            setApprovalOpen(false);
            setApprovalWarehouseId('');
        } catch (error) {
            setActionError(error.message);
        } finally {
            setBusy(false);
        }
    };

    const generateInvoice = async () => {
        if (!order?.id || busy) {
            return;
        }

        setBusy(true);
        setActionError('');

        try {
            const taxAmount = Number(order.tax_amount || 0) > 0 ? Number(order.tax_amount) : promptInvoiceTaxAmount();

            if (taxAmount === null) {
                return;
            }

            const invoice = await api.post(`/office/orders/${order.id}/generate-invoice`, { tax_amount: taxAmount });
            rememberGeneratedInvoice(invoice);
            refreshAfterAction();
        } catch (error) {
            setActionError(error.message);
        } finally {
            setBusy(false);
        }
    };

    const deliverOrder = async () => {
        if (!order?.id || busy) {
            return;
        }

        setBusy(true);
        setActionError('');

        try {
            await api.post(`/office/orders/${order.id}/deliver`);
            refreshAfterAction();
        } catch (error) {
            setActionError(error.message);
        } finally {
            setBusy(false);
        }
    };

    if (!orderId) {
        return (
            <div className="page-stack">
                <PageHeader
                    action={<button className="btn secondary" onClick={() => onNavigate?.('orders')} type="button">Back to orders</button>}
                    description="Open an order from the sales order list or a pharmacy profile to review its fulfillment detail."
                    eyebrow="Order Detail"
                    title="Select order"
                />
                <Panel eyebrow="Order Detail" title="No order selected">
                    <p className="helper-copy">Choose an order row to open the full order detail page.</p>
                </Panel>
            </div>
        );
    }

    return (
        <div className="page-stack order-detail-page">
            <PageHeader
                action={(
                    <div className="page-heading-actions">
                        {canApprove && <button className="btn primary" disabled={busy || warehousesResource.loading} onClick={openApproval} type="button">Approve order</button>}
                        {canGenerateInvoice && <button className="btn primary" disabled={busy} onClick={generateInvoice} type="button">Generate invoice</button>}
                        {canDeliver && <button className="btn secondary" disabled={busy} onClick={deliverOrder} type="button">Deliver stock</button>}
                        {canOpenInvoice && <button className="btn secondary" onClick={() => onNavigate?.('invoice-detail', { invoice_id: order.invoice_id })} type="button">Open invoice</button>}
                        <button className="btn secondary" onClick={() => onNavigate?.('orders')} type="button">Back to orders</button>
                    </div>
                )}
                description="Review order lines, FOC items, approval state, warehouse preparation, invoice status, and delivery progress."
                eyebrow="Order Detail"
                title={order?.order || (orderResource.loading ? 'Loading order' : 'Order detail')}
            />

            {orderResource.error && <span className="error-text">{orderResource.error}</span>}
            {actionError && <span className="error-text">{actionError}</span>}
            {orderResource.loading && (
                <Panel eyebrow="Order Detail" title="Loading order">
                    <p className="helper-copy">Loading order detail, line items, FOC rewards, and workflow status...</p>
                </Panel>
            )}
            {!orderResource.loading && !order && !orderResource.error && (
                <Panel eyebrow="Order Detail" title="Order not found">
                    <p className="helper-copy">The selected order could not be found.</p>
                </Panel>
            )}

            {order && (
                <>
                    <section className="order-detail-hero glass">
                        <div className="order-detail-icon">SO</div>
                        <div>
                            <div className="rep-title-row">
                                <h2>{order.pharmacy}</h2>
                                <StatusBadge value={order.status} />
                            </div>
                            <p>{order.company}</p>
                        </div>
                        <div className="order-detail-total">
                            <span>Total amount</span>
                            <strong>{order.total}</strong>
                            <small>{order.baseQuantity}</small>
                        </div>
                    </section>

                    <Panel eyebrow="Operational Snapshot" title="Workflow, credit, and documents">
                        <DetailFactGrid order={order} />
                    </Panel>

                    <Panel eyebrow="Fulfillment" title="Items, totals, and warehouse progress">
                        <SalesOrderDetail
                            focItems={order.focItems}
                            orderItems={order.orderItems}
                            totals={order.totals}
                            warehouseChecklist={order.warehouseChecklist}
                        />
                    </Panel>
                </>
            )}

            <Modal
                busy={busy || warehousesResource.loading}
                onClose={closeApproval}
                onSubmit={approveOrder}
                open={approvalOpen}
                submitDisabled={busy || warehousesResource.loading || !approvalWarehouseId}
                submitDisabledReason={actionError || warehousesResource.error || (!approvalWarehouseId ? 'Select a warehouse to reserve stock.' : '')}
                submitLabel="Approve and reserve stock"
                title={`Approve order - ${order?.order || 'Order'}`}
            >
                <div className="approval-form">
                    <div className="workflow-context-card">
                        <span>{order?.pharmacy || 'Customer order'}</span>
                        <strong>{order?.order || 'Selected order'}</strong>
                        <small>{order?.company || 'Reserve stock by nearest expiry date'}</small>
                    </div>
                    <label className="form-field">
                        <span>Reserve from warehouse</span>
                        <select name="warehouse_id" onChange={(event) => setApprovalWarehouseId(event.target.value)} required value={approvalWarehouseId}>
                            <option value="" disabled>{warehousesResource.loading ? 'Loading warehouses' : 'Select warehouse'}</option>
                            {warehouses.map((warehouse) => (
                                <option key={warehouse.id} value={warehouse.id}>
                                    {warehouse.name}{warehouse.code ? ` (${warehouse.code})` : ''}
                                </option>
                            ))}
                        </select>
                    </label>
                    <p className="helper-copy">Approval reserves this order from the selected warehouse by nearest expiry date.</p>
                </div>
            </Modal>
        </div>
    );
}
