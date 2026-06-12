import Icon from './Icon';

export default function Modal({ actions, busy = false, children, open, onClose, onSubmit, submitDisabled = false, submitDisabledReason = '', submitLabel = 'Save', title }) {
    if (!open) {
        return null;
    }

    return (
        <div className="modal-backdrop" role="presentation">
            <section aria-busy={busy ? 'true' : 'false'} aria-modal="true" className="operation-modal glass" role="dialog">
                {busy && <div className="modal-progress" />}
                <div className="modal-header">
                    <div>
                        <h2>{title}</h2>
                    </div>
                    <button className="icon-btn small" disabled={busy} onClick={onClose} type="button">
                        <Icon name="close" size={16} />
                    </button>
                </div>
                <div className="modal-body">{children}</div>
                <div className="modal-actions">
                    {actions || (
                        <>
                            <button className="btn secondary" disabled={busy} onClick={onClose} type="button">Cancel</button>
                            {submitDisabledReason && <span className="submit-disabled-note">{submitDisabledReason}</span>}
                            <button className="btn primary" disabled={submitDisabled || busy} onClick={onSubmit} type="button">{busy ? 'Saving...' : submitLabel}</button>
                        </>
                    )}
                </div>
            </section>
        </div>
    );
}
