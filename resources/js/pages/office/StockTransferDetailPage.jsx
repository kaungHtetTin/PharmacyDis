import PageHeader from '../../components/shared/PageHeader';
import Panel from '../../components/shared/Panel';
import StatusBadge from '../../components/shared/StatusBadge';
import StockTransferDetail from '../../components/shared/StockTransferDetail';
import useApiResource from '../../hooks/useApiResource';
import { mapStockTransfers } from '../../services/screenAdapters';

function TransferSnapshot({ transfer }) {
    const facts = [
        ['Transfer', transfer.transfer],
        ['Company', transfer.company],
        ['From warehouse', transfer.sourceWarehouse],
        ['To warehouse', transfer.destinationWarehouse],
        ['Products', transfer.products],
        ['Line items', transfer.lineCount],
        ['Base quantity', transfer.baseQuantity],
        ['Created date', transfer.date],
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

export default function StockTransferDetailPage({ onNavigate }) {
    const params = new URLSearchParams(window.location.search);
    const transferId = params.get('transfer_id') || params.get('record_id') || '';
    const transferResource = useApiResource(transferId ? `/office/stock/transfers/${transferId}` : '');
    const [transfer] = transferResource.data ? mapStockTransfers({ data: [transferResource.data] }) : [];

    if (!transferId) {
        return (
            <div className="page-stack">
                <PageHeader
                    action={<button className="btn secondary" onClick={() => onNavigate?.('stock-transfers')} type="button">Back to transfers</button>}
                    description="Open a stock transfer row to review the transferred products and batches."
                    eyebrow="Transfer Detail"
                    title="Select transfer"
                />
                <Panel eyebrow="Transfer Detail" title="No transfer selected">
                    <p className="helper-copy">Choose a stock transfer row to open the full detail page.</p>
                </Panel>
            </div>
        );
    }

    return (
        <div className="page-stack receiving-detail-page">
            <PageHeader
                action={<button className="btn secondary" onClick={() => onNavigate?.('stock-transfers')} type="button">Back to transfers</button>}
                description="Review the warehouse route, transferred products, batch numbers, and base-unit quantities."
                eyebrow="Transfer Detail"
                title={transfer?.transfer || (transferResource.loading ? 'Loading transfer' : 'Transfer detail')}
            />

            {transferResource.error && <span className="error-text">{transferResource.error}</span>}
            {transferResource.loading && (
                <Panel eyebrow="Transfer Detail" title="Loading transfer">
                    <p className="helper-copy">Loading transfer route, item batches, and quantity summary...</p>
                </Panel>
            )}
            {!transferResource.loading && !transfer && !transferResource.error && (
                <Panel eyebrow="Transfer Detail" title="Transfer not found">
                    <p className="helper-copy">The selected stock transfer could not be found.</p>
                </Panel>
            )}

            {transfer && (
                <>
                    <section className="receiving-detail-hero glass">
                        <div className="receiving-detail-icon">TR</div>
                        <div>
                            <div className="rep-title-row">
                                <h2>{transfer.transfer}</h2>
                                <StatusBadge value={transfer.status} />
                            </div>
                            <p>{transfer.route}</p>
                        </div>
                        <div className="receiving-detail-total">
                            <span>Total base quantity</span>
                            <strong>{transfer.baseQuantity}</strong>
                            <small>{transfer.lineCount} batch {Number(transfer.lineCount || 0) === 1 ? 'line' : 'lines'}</small>
                        </div>
                    </section>

                    <Panel eyebrow="Operational Snapshot" title="Company, route, and transfer totals">
                        <TransferSnapshot transfer={transfer} />
                    </Panel>

                    <Panel eyebrow="Transferred Stock" title="Products and batches">
                        <StockTransferDetail items={transfer.transferItems} />
                    </Panel>

                    {transfer.note && (
                        <Panel eyebrow="Transfer Note" title="Internal note">
                            <p className="helper-copy">{transfer.note}</p>
                        </Panel>
                    )}
                </>
            )}
        </div>
    );
}
