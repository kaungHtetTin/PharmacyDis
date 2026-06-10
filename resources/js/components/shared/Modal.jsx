import Icon from './Icon';

export default function Modal({ actions, children, open, onClose, onSubmit, title }) {
    if (!open) {
        return null;
    }

    return (
        <div className="modal-backdrop" role="presentation">
            <section aria-modal="true" className="operation-modal glass" role="dialog">
                <div className="drawer-header">
                    <div>
                        <p className="eyebrow">Form Workspace</p>
                        <h2>{title}</h2>
                    </div>
                    <button className="icon-btn small" onClick={onClose} type="button">
                        <Icon name="close" size={16} />
                    </button>
                </div>
                <div className="modal-body">{children}</div>
                <div className="modal-actions">
                    {actions || (
                        <>
                            <button className="btn secondary" onClick={onClose} type="button">Cancel</button>
                            <button className="btn primary" onClick={onSubmit} type="button">Save draft</button>
                        </>
                    )}
                </div>
            </section>
        </div>
    );
}
