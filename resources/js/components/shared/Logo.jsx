export default function Logo({ compact = false }) {
    return (
        <div className="logo-lockup">
            <span className="logo-mark">PD</span>
            {!compact && (
                <span>
                    <strong>Paramacy DIS</strong>
                    <small>Distribution system</small>
                </span>
            )}
        </div>
    );
}
