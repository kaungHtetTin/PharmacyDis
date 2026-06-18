import PageHeader from '../../components/shared/PageHeader';
import Panel from '../../components/shared/Panel';
import StatusBadge from '../../components/shared/StatusBadge';
import StockReceivingDetail from '../../components/shared/StockReceivingDetail';
import useApiResource from '../../hooks/useApiResource';
import { mapStockReceipts } from '../../services/screenAdapters';

function ReceivingSnapshot({ receipt }) {
    const facts = [
        ['Company', receipt.company],
        ['Warehouse', receipt.warehouse],
        ['Supplier invoice', receipt.invoice],
        ['Received date', receipt.receivedDate],
        ['Items', receipt.items],
        ['Base quantity', receipt.baseQuantity],
        ['Payment', receipt.paymentStatus],
        ['Due date', receipt.dueDate],
    ];

    return (
        <div className="fact-grid receiving-detail-facts">
            {facts.map(([label, value]) => (
                <div key={label}>
                    <span>{label}</span>
                    <strong>{value || '-'}</strong>
                </div>
            ))}
        </div>
    );
}

export default function StockReceivingDetailPage({ onNavigate }) {
    const params = new URLSearchParams(window.location.search);
    const receiptId = params.get('receipt_id') || params.get('record_id') || '';
    const receiptResource = useApiResource(receiptId ? `/office/stock-receipts/${receiptId}` : '');
    const [receipt] = receiptResource.data ? mapStockReceipts({ data: [receiptResource.data] }) : [];

    if (!receiptId) {
        return (
            <div className="page-stack">
                <PageHeader
                    action={<button className="btn secondary" onClick={() => onNavigate?.('receiving')} type="button">Back to receiving</button>}
                    description="Open a receiving row to review its posted stock, payable, and batch detail."
                    eyebrow="Receiving Detail"
                    title="Select receiving"
                />
                <Panel eyebrow="Receiving Detail" title="No receiving selected">
                    <p className="helper-copy">Choose a receiving row to open the full detail page.</p>
                </Panel>
            </div>
        );
    }

    return (
        <div className="page-stack receiving-detail-page">
            <PageHeader
                action={<button className="btn secondary" onClick={() => onNavigate?.('receiving')} type="button">Back to receiving</button>}
                description="Review received products, batch quantities, FOC, payable status, and supplier invoice detail."
                eyebrow="Receiving Detail"
                title={receipt?.receipt || (receiptResource.loading ? 'Loading receiving' : 'Receiving detail')}
            />

            {receiptResource.error && <span className="error-text">{receiptResource.error}</span>}
            {receiptResource.loading && (
                <Panel eyebrow="Receiving Detail" title="Loading receiving">
                    <p className="helper-copy">Loading receiving detail, item batches, and payable summary...</p>
                </Panel>
            )}
            {!receiptResource.loading && !receipt && !receiptResource.error && (
                <Panel eyebrow="Receiving Detail" title="Receiving not found">
                    <p className="helper-copy">The selected receiving record could not be found.</p>
                </Panel>
            )}

            {receipt && (
                <>
                    <section className="receiving-detail-hero glass">
                        <div className="receiving-detail-icon">SR</div>
                        <div>
                            <div className="rep-title-row">
                                <h2>{receipt.receipt}</h2>
                                <StatusBadge value={receipt.status} />
                            </div>
                            <p>{receipt.company} / {receipt.warehouse}</p>
                        </div>
                        <div className="receiving-detail-total">
                            <span>Payable amount</span>
                            <strong>{receipt.payable}</strong>
                            <small>Due {receipt.dueAmount}</small>
                        </div>
                    </section>

                    <Panel eyebrow="Operational Snapshot" title="Supplier, warehouse, and payment status">
                        <ReceivingSnapshot receipt={receipt} />
                    </Panel>

                    <Panel eyebrow="Received Stock" title="Products, batches, FOC, and payable">
                        <StockReceivingDetail
                            items={receipt.receivingItems}
                            payable={receipt.payablePreview}
                        />
                    </Panel>
                </>
            )}
        </div>
    );
}
