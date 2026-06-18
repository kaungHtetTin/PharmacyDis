import PageHeader from '../../components/shared/PageHeader';
import Panel from '../../components/shared/Panel';
import StatusBadge from '../../components/shared/StatusBadge';
import useApiResource from '../../hooks/useApiResource';
import { mapPayables } from '../../services/screenAdapters';

function PayableSnapshot({ payable }) {
    const facts = [
        ['Payable', payable.payable],
        ['Company', payable.company],
        ['Receiving', payable.receipt],
        ['Supplier invoice', payable.supplierInvoice],
        ['Payable date', payable.payableDate],
        ['Due date', payable.dueDate],
        ['Payable amount', payable.amount],
        ['Paid', payable.paidAmount],
        ['Balance', payable.balanceAmount],
        ['Status', payable.status],
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

function PaymentTransactions({ payments = [] }) {
    if (!payments.length) {
        return <p className="helper-copy">No company payment has been recorded for this payable.</p>;
    }

    return (
        <div className="finance-allocation-table">
            <div className="finance-allocation-head">
                <span>Payment</span>
                <span>Date</span>
                <span>Method</span>
                <span>Amount</span>
                <span>Status</span>
            </div>
            {payments.map((payment) => (
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
    );
}

export default function PayableDetailPage({ onNavigate }) {
    const params = new URLSearchParams(window.location.search);
    const payableId = params.get('payable_id') || params.get('record_id') || '';
    const payableResource = useApiResource(payableId ? `/office/payables/${payableId}` : '');
    const [payable] = payableResource.data ? mapPayables({ data: [payableResource.data] }) : [];

    if (!payableId) {
        return (
            <div className="page-stack">
                <PageHeader
                    action={<button className="btn secondary" onClick={() => onNavigate?.('payables')} type="button">Back to payables</button>}
                    description="Open a payable from the payables list to review supplier payable detail."
                    eyebrow="Payable Detail"
                    title="Select payable"
                />
                <Panel eyebrow="Payable Detail" title="No payable selected">
                    <p className="helper-copy">Choose a payable row to open the full payable detail page.</p>
                </Panel>
            </div>
        );
    }

    return (
        <div className="page-stack invoice-detail-page">
            <PageHeader
                action={(
                    <div className="page-heading-actions">
                        {payable?.stock_receipt_id && (
                            <button className="btn secondary" onClick={() => onNavigate?.('receiving-detail', { receipt_id: payable.stock_receipt_id })} type="button">Open receiving</button>
                        )}
                        <button className="btn secondary" onClick={() => onNavigate?.('payables')} type="button">Back to payables</button>
                    </div>
                )}
                description="Review supplier payable balance, due date, receiving context, and company payment transactions."
                eyebrow="Payable Detail"
                title={payable?.payable || (payableResource.loading ? 'Loading payable' : 'Payable detail')}
            />

            {payableResource.error && <span className="error-text">{payableResource.error}</span>}
            {payableResource.loading && (
                <Panel eyebrow="Payable Detail" title="Loading payable">
                    <p className="helper-copy">Loading payable detail and company payment transactions...</p>
                </Panel>
            )}
            {!payableResource.loading && !payable && !payableResource.error && (
                <Panel eyebrow="Payable Detail" title="Payable not found">
                    <p className="helper-copy">The selected payable could not be found.</p>
                </Panel>
            )}

            {payable && (
                <>
                    <section className="invoice-detail-hero glass">
                        <div className="invoice-detail-icon">DUE</div>
                        <div>
                            <div className="rep-title-row">
                                <h2>{payable.payable}</h2>
                                <StatusBadge value={payable.status} />
                            </div>
                            <p>{payable.company} / {payable.receipt}</p>
                        </div>
                        <div className="invoice-detail-total">
                            <span>Payable balance</span>
                            <strong>{payable.balanceAmount}</strong>
                            <small>Total {payable.amount}</small>
                        </div>
                    </section>

                    <Panel eyebrow="Operational Snapshot" title="Supplier invoice, receiving, and due date">
                        <PayableSnapshot payable={payable} />
                    </Panel>

                    <Panel eyebrow="Payments" title="Company payment transactions">
                        <PaymentTransactions payments={payable.paymentTransactions} />
                    </Panel>
                </>
            )}
        </div>
    );
}
