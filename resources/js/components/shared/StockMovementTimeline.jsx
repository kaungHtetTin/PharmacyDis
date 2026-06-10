export default function StockMovementTimeline({ movements = [] }) {
    return (
        <div className="movement-timeline">
            {movements.map((movement) => (
                <article className="movement-item" key={movement.id}>
                    <span className="movement-dot" />
                    <div>
                        <strong>{movement.type}</strong>
                        <small>{movement.date} / {movement.reference}</small>
                    </div>
                    <div>
                        <strong>{movement.quantity}</strong>
                        <small>{movement.note}</small>
                    </div>
                </article>
            ))}
        </div>
    );
}
