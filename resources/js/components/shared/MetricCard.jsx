import Icon from './Icon';

export default function MetricCard({ icon, label, value, note }) {
    return (
        <article className="metric-card glass">
            <span className="metric-icon">
                <Icon name={icon} size={17} />
            </span>
            <small>{label}</small>
            <strong>{value}</strong>
            <p>{note}</p>
        </article>
    );
}
