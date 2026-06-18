import FinanceReview from '../../components/shared/FinanceReview';
import PageHeader from '../../components/shared/PageHeader';
import Panel from '../../components/shared/Panel';
import StatusBadge from '../../components/shared/StatusBadge';
import useApiResource from '../../hooks/useApiResource';
import { mapPayments } from '../../services/screenAdapters';

function PaymentSnapshot({ payment }) {
    const facts = [
        ['Payment no.', payment.payment],
        ['Customer', payment.pharmacy],
        ['Company', payment.company],
        ['Payment date', payment.date],
        ['Amount', payment.amount],
        ['Method', payment.method],
        ['Reference no.', payment.referenceNo],
        ['Status', payment.status],
    ];

    return (
        <div className="fact-grid invoice-detail-facts">
            {facts.map(([label, value]) => (
                <div key={label}>
                    <span>{label}</span>
                    <strong>{value || '-'}</strong>
                </div>
            ))}
        </div>
    );
}

export default function PaymentDetailPage({ onNavigate }) {
    const params = new URLSearchParams(window.location.search);
    const paymentId = params.get('payment_id') || params.get('record_id') || '';
    const paymentResource = useApiResource(paymentId ? `/office/payments/${paymentId}` : '');
    const paymentPayload = paymentResource.data?.data || paymentResource.data;
    const [payment] = paymentPayload ? mapPayments({ data: [paymentPayload] }) : [];

    if (!paymentId) {
        return (
            <div className="page-stack">
                <PageHeader
                    action={<button className="btn secondary" onClick={() => onNavigate?.('payments')} type="button">Back to payments</button>}
                    description="Open a payment from the payment list or pharmacy history to review allocation detail."
                    eyebrow="Payment Detail"
                    title="Select payment"
                />
                <Panel eyebrow="Payment Detail" title="No payment selected">
                    <p className="helper-copy">Choose a payment row to open the full payment detail page.</p>
                </Panel>
            </div>
        );
    }

    return (
        <div className="page-stack invoice-detail-page">
            <PageHeader
                action={(
                    <div className="page-heading-actions">
                        {payment?.customer_id && (
                            <button className="btn secondary" onClick={() => onNavigate?.('pharmacies-detail', { customer_id: payment.customer_id })} type="button">Open pharmacy</button>
                        )}
                        <button className="btn secondary" onClick={() => onNavigate?.('payments')} type="button">Back to payments</button>
                    </div>
                )}
                description="Review payment status, customer and company context, and invoice allocations."
                eyebrow="Payment Detail"
                title={payment?.payment || (paymentResource.loading ? 'Loading payment' : 'Payment detail')}
            />

            {paymentResource.error && <span className="error-text">{paymentResource.error}</span>}
            {paymentResource.loading && (
                <Panel eyebrow="Payment Detail" title="Loading payment">
                    <p className="helper-copy">Loading payment detail and invoice allocation...</p>
                </Panel>
            )}
            {!paymentResource.loading && !payment && !paymentResource.error && (
                <Panel eyebrow="Payment Detail" title="Payment not found">
                    <p className="helper-copy">The selected payment could not be found.</p>
                </Panel>
            )}

            {payment && (
                <>
                    <section className="invoice-detail-hero glass">
                        <div className="invoice-detail-icon">PAY</div>
                        <div>
                            <div className="rep-title-row">
                                <h2>{payment.payment}</h2>
                                <StatusBadge value={payment.status} />
                            </div>
                            <p>{payment.pharmacy} / {payment.company}</p>
                        </div>
                        <div className="invoice-detail-total">
                            <span>Payment amount</span>
                            <strong>{payment.amount}</strong>
                            <small>{payment.method}</small>
                        </div>
                    </section>

                    <Panel eyebrow="Operational Snapshot" title="Customer, company, and payment method">
                        <PaymentSnapshot payment={payment} />
                    </Panel>

                    <Panel eyebrow="Allocation" title="Invoices covered by this payment">
                        {payment.allocations?.length ? (
                            <FinanceReview allocations={payment.allocations} />
                        ) : (
                            <p className="helper-copy">No invoice allocations are linked to this payment.</p>
                        )}
                    </Panel>
                </>
            )}
        </div>
    );
}
