export default function PageHeader({ action, description, eyebrow, title }) {
    return (
        <div className="admin-page-heading">
            <div>
                {eyebrow && <p className="eyebrow">{eyebrow}</p>}
                <h1>{title}</h1>
                {description && <p>{description}</p>}
            </div>
            {action}
        </div>
    );
}
