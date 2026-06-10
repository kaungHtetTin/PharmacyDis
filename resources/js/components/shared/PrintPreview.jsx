export default function PrintPreview({ items = [], title, type = 'A4' }) {
    return (
        <div className={`print-preview ${type === 'receipt' ? 'receipt' : ''}`}>
            <div className="print-header">
                <span>Paramacy DIS</span>
                <strong>{title}</strong>
                <small>{type} print preview</small>
            </div>
            <div className="print-lines">
                {items.map((item) => (
                    <div key={item.label}>
                        <span>{item.label}</span>
                        <strong>{item.value}</strong>
                    </div>
                ))}
            </div>
        </div>
    );
}
