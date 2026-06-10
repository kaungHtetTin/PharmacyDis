import Icon from './Icon';

export default function Drawer({ actions, children, eyebrow = 'Detail', open, onClose, title }) {
    if (!open) {
        return null;
    }

    return (
        <aside className="drawer glass">
            <div className="drawer-header">
                <div>
                    <p className="eyebrow">{eyebrow}</p>
                    <h2>{title}</h2>
                </div>
                <button className="icon-btn small" onClick={onClose} type="button">
                    <Icon name="close" size={16} />
                </button>
            </div>
            <div className="drawer-body">{children}</div>
            {actions && <div className="drawer-actions">{actions}</div>}
        </aside>
    );
}
