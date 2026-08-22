import { useEffect, useState } from 'react';
import FormField from './FormField';
import Modal from './Modal';
import StatusBadge from './StatusBadge';

export default function ReturnIntegrityReviewModal({ busy, error, onClose, onResolveFoc, onReviewCommission, record }) {
    const [focDrafts, setFocDrafts] = useState({});
    const [commissionReasons, setCommissionReasons] = useState({});
    const pendingFoc = (record?.focItems || []).filter((item) => item.status === 'pending_review');
    const pendingCommission = (record?.commissionAdjustments || []).filter((item) => item.status === 'pending_approval');

    useEffect(() => {
        setFocDrafts(Object.fromEntries(pendingFoc.map((item) => [item.id, { disposition: 'returned', reason: '' }])));
        setCommissionReasons(Object.fromEntries(pendingCommission.map((item) => [item.id, ''])));
    }, [record?.id]);

    return (
        <Modal
            actions={<button className="btn secondary" disabled={busy} onClick={onClose} type="button">Close</button>}
            busy={busy}
            onClose={onClose}
            open={Boolean(record)}
            title={`Financial review - ${record?.returnNo || 'return'}`}
        >
            <div className="sales-return-form">
                <div className="workflow-context-card">
                    <span>Source documents</span>
                    <strong>{record?.invoice} / {record?.creditNote || record?.returnNo}</strong>
                    <small>Every decision is retained with its approver and timestamp. Inventory changes only for confirmed physical returns.</small>
                </div>
                {error && <span className="error-text">{error}</span>}

                <section>
                    <div className="section-heading">
                        <div><p className="eyebrow">FOC control</p><h3>Pending reward dispositions</h3></div>
                        <StatusBadge value={pendingFoc.length ? 'Review required' : 'Complete'} />
                    </div>
                    {!pendingFoc.length && <p className="helper-copy">No historical FOC decisions are pending for this return.</p>}
                    <div className="sales-return-items">
                        {pendingFoc.map((item) => {
                            const draft = focDrafts[item.id] || { disposition: 'returned', reason: '' };
                            return (
                                <article className="sales-return-item" key={item.id}>
                                    <div className="sales-return-item-head">
                                        <strong>{item.product?.name || `Product #${item.product_id}`}</strong>
                                        <span>{Number(item.base_unit_quantity || 0).toLocaleString()} base units / value {Number(item.estimated_value_amount || 0).toLocaleString()}</span>
                                    </div>
                                    <div className="receiving-item-grid sales-return-item-grid">
                                        <label className="form-field">
                                            <span>Final disposition</span>
                                            <select value={draft.disposition} onChange={(event) => setFocDrafts((current) => ({ ...current, [item.id]: { ...draft, disposition: event.target.value } }))}>
                                                <option value="returned">Returned to warehouse</option>
                                                <option value="charged">Charge customer</option>
                                                <option value="waived">Waive with approval</option>
                                            </select>
                                        </label>
                                        <FormField
                                            className="span-2"
                                            label="Decision and evidence note"
                                            onChange={(event) => setFocDrafts((current) => ({ ...current, [item.id]: { ...draft, reason: event.target.value } }))}
                                            placeholder="Required: physical receipt reference or approval reason"
                                            type="textarea"
                                            value={draft.reason}
                                        />
                                    </div>
                                    <button className="btn primary" disabled={busy || !draft.reason.trim()} onClick={() => onResolveFoc(item, draft)} type="button">Confirm disposition</button>
                                </article>
                            );
                        })}
                    </div>
                </section>

                <section>
                    <div className="section-heading">
                        <div><p className="eyebrow">Commission control</p><h3>Historical reversal proposals</h3></div>
                        <StatusBadge value={pendingCommission.length ? 'Pending approval' : 'Complete'} />
                    </div>
                    {!pendingCommission.length && <p className="helper-copy">No commission proposals are pending for this return.</p>}
                    <div className="sales-return-items">
                        {pendingCommission.map((item) => (
                            <article className="sales-return-item" key={item.id}>
                                <div className="sales-return-item-head">
                                    <strong>Reversal {Number(item.reversal_amount || 0).toLocaleString()}</strong>
                                    <span>Original commission {Number(item.original_commission_amount || 0).toLocaleString()} / {item.calculation_basis}</span>
                                </div>
                                <FormField
                                    label="Approval or rejection note"
                                    onChange={(event) => setCommissionReasons((current) => ({ ...current, [item.id]: event.target.value }))}
                                    placeholder="Required finance review note"
                                    type="textarea"
                                    value={commissionReasons[item.id] || ''}
                                />
                                <div className="modal-actions">
                                    <button className="btn secondary" disabled={busy || !(commissionReasons[item.id] || '').trim()} onClick={() => onReviewCommission(item, 'reject', commissionReasons[item.id])} type="button">Reject proposal</button>
                                    <button className="btn primary" disabled={busy || !(commissionReasons[item.id] || '').trim()} onClick={() => onReviewCommission(item, 'approve', commissionReasons[item.id])} type="button">Approve reversal</button>
                                </div>
                            </article>
                        ))}
                    </div>
                </section>
            </div>
        </Modal>
    );
}
