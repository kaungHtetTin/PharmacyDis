export default function Logo({ compact = false }) {
    const baseUrl = String(window.appConfig?.baseUrl || '').replace(/\/+$/g, '');
    const logoUrl = window.appConfig?.logoUrl || `${baseUrl}/logo.png`;

    return (
        <div className="logo-lockup">
            <span className="logo-mark">
                <img alt="Medi Mart Distribution System" src={logoUrl} />
            </span>
            {!compact && (
                <span>
                    <strong>Medi Mart</strong>
                    <small>Distribution System</small>
                </span>
            )}
        </div>
    );
}
