export default function Panel({ eyebrow, title, action, children, className = '' }) {
    return (
        <section className={`panel glass ${className}`}>
            {(eyebrow || title || action) && (
                <div className="panel-heading">
                    <div>
                        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
                        {title && <h2>{title}</h2>}
                    </div>
                    {action}
                </div>
            )}
            {children}
        </section>
    );
}
