import PageHeader from '../../components/shared/PageHeader';
import Panel from '../../components/shared/Panel';
import SalesOrderDetail from '../../components/shared/SalesOrderDetail';
import StatusBadge from '../../components/shared/StatusBadge';
import useApiResource from '../../hooks/useApiResource';
import { mapOrders } from '../../services/screenAdapters';

function DetailFactGrid({ order }) {
    const facts = [
        ['Pharmacy', order.pharmacy],
        ['Company', order.company],
        ['Order date', order.submittedDate || '-'],
        ['Requested delivery', order.requestedDeliveryDate || '-'],
        ['Payment status', order.paymentStatus],
        ['Delivery status', order.deliveryStatus],
        ['Invoice', order.invoice || 'Not generated'],
        ['Balance', order.invoice_id ? order.invoiceBalance : '-'],
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

function StatusStrip({ order }) {
    const statuses = [
        ['Order', order.status],
        ['Payment', order.paymentStatus],
        ['Delivery', order.deliveryStatus],
    ];

    return (
        <div className="sales-order-status-strip">
            {statuses.map(([label, value]) => (
                <article key={label}>
                    <span>{label}</span>
                    <StatusBadge value={value} />
                </article>
            ))}
        </div>
    );
}

export default function SalesOrderDetailPage({ onNavigate }) {
    const params = new URLSearchParams(window.location.search);
    const orderId = params.get('order_id') || '';
    const orderResource = useApiResource(orderId ? `/sales/orders?order_id=${orderId}&per_page=1` : '');
    const [order] = orderResource.data ? mapOrders(orderResource.data) : [];

    if (!orderId) {
        return (
            <div className="sales-page order-detail-page">
                <PageHeader
                    action={<button className="btn secondary" onClick={() => onNavigate?.('orders')} type="button">Back to history</button>}
                    description="Open an order from order history to review products, FOC rewards, payment status, and delivery progress."
                    eyebrow="Order Detail"
                    title="Select order"
                />
                <Panel eyebrow="Order Detail" title="No order selected">
                    <p className="helper-copy">Choose an order row from order history to open the detail page.</p>
                </Panel>
            </div>
        );
    }

    return (
        <div className="sales-page order-detail-page">
            <PageHeader
                action={<button className="btn secondary" onClick={() => onNavigate?.('orders')} type="button">Back to history</button>}
                description="Review the submitted order, products, FOC rewards, payment status, and delivery status."
                eyebrow="Order Detail"
                title={order?.order || (orderResource.loading ? 'Loading order' : 'Order detail')}
            />

            {orderResource.error && <span className="error-text">{orderResource.error}</span>}
            {orderResource.loading && (
                <Panel eyebrow="Order Detail" title="Loading order">
                    <p className="helper-copy">Loading products, FOC rewards, invoice status, and delivery progress...</p>
                </Panel>
            )}
            {!orderResource.loading && !order && !orderResource.error && (
                <Panel eyebrow="Order Detail" title="Order not found">
                    <p className="helper-copy">This order is not available for the signed-in sales account.</p>
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

                    <StatusStrip order={order} />

                    <Panel eyebrow="Status" title="Payment and delivery">
                        <DetailFactGrid order={order} />
                    </Panel>

                    <Panel eyebrow="Order Lines" title="Products and FOC rewards">
                        <SalesOrderDetail
                            focItems={order.focItems}
                            orderItems={order.orderItems}
                            totals={order.totals}
                            warehouseChecklist={order.warehouseChecklist}
                        />
                    </Panel>
                </>
            )}
        </div>
    );
}
