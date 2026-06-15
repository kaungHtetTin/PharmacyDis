import { useEffect, useState } from 'react';
import Icon from '../components/shared/Icon';
import Logo from '../components/shared/Logo';
import { officeNavSections } from '../data/navigation';
import { api } from '../services/apiClient';

function formatBadgeCount(value) {
    const count = Number(value || 0);

    return count > 99 ? '99+' : String(count);
}

export default function OfficeLayout({ activePage, getPageUrl, onNavigate, onSwitchApp, salesUrl, children }) {
    const [theme, setTheme] = useState('light');
    const [submittedOrderCount, setSubmittedOrderCount] = useState(0);
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    const hasSubmittedOrders = submittedOrderCount > 0;

    useEffect(() => {
        let active = true;

        async function loadSubmittedOrderCount() {
            try {
                const response = await api.get('/office/orders?status=submitted&per_page=1');

                if (active) {
                    setSubmittedOrderCount(Number(response.meta?.total ?? response.data?.length ?? 0));
                }
            } catch (error) {
                if (active) {
                    setSubmittedOrderCount(0);
                }
            }
        }

        loadSubmittedOrderCount();
        const interval = window.setInterval(loadSubmittedOrderCount, 30000);

        window.addEventListener('office-submitted-orders-changed', loadSubmittedOrderCount);

        return () => {
            active = false;
            window.removeEventListener('office-submitted-orders-changed', loadSubmittedOrderCount);
            window.clearInterval(interval);
        };
    }, [activePage]);

    return (
        <div className={`admin-app theme-${theme}`}>
            <aside className="admin-sidebar glass">
                <Logo />
                <nav aria-label="Office navigation">
                    {officeNavSections.map((section) => (
                        <div className="nav-section" key={section.label}>
                            <p>{section.label}</p>
                            {section.items.map(([key, icon, label]) => (
                                <a
                                    className={`${activePage === key ? 'active' : ''}${key === 'orders' && hasSubmittedOrders ? ' has-alert' : ''}`.trim()}
                                    href={getPageUrl(key)}
                                    key={key}
                                    onClick={(event) => {
                                        event.preventDefault();
                                        onNavigate(key);
                                    }}
                                >
                                    <Icon name={icon} size={17} />
                                    <span>{label}</span>
                                    {key === 'orders' && hasSubmittedOrders && (
                                        <strong aria-label={`${submittedOrderCount} submitted orders need review`} className="nav-alert-badge">
                                            {formatBadgeCount(submittedOrderCount)}
                                        </strong>
                                    )}
                                </a>
                            ))}
                        </div>
                    ))}
                </nav>
                <a
                    className="app-switch"
                    href={salesUrl}
                    onClick={(event) => {
                        event.preventDefault();
                        onSwitchApp();
                    }}
                >
                    <Icon name="user" size={16} />
                    <span>Sales rep app</span>
                </a>
                <div className="admin-profile">
                    <span>AD</span>
                    <div>
                        <strong>Admin User</strong>
                        <small>Office admin</small>
                    </div>
                </div>
            </aside>

            <main className="admin-main">
                <header className="admin-topbar glass">
                    <div className="search-box global-search">
                        <Icon name="search" size={16} />
                        <input aria-label="Global search" placeholder="Search orders, products, pharmacies" />
                    </div>
                    <div className="topbar-actions">
                        <button
                            className="icon-btn"
                            onClick={() => setTheme(nextTheme)}
                            type="button"
                            title={`Switch to ${nextTheme} theme`}
                        >
                            <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={17} />
                        </button>
                        <button className="icon-btn" type="button" title="Notifications">
                            <Icon name="bell" size={17} />
                            {hasSubmittedOrders && (
                                <strong aria-label={`${submittedOrderCount} submitted orders need review`} className="topbar-alert-badge">
                                    {formatBadgeCount(submittedOrderCount)}
                                </strong>
                            )}
                        </button>
                        <a className="btn primary" href={getPageUrl('pharmacies')} onClick={(event) => {
                            event.preventDefault();
                            onNavigate('pharmacies');
                        }}>
                            <Icon name="plus" size={16} />
                            Create order
                        </a>
                    </div>
                </header>
                <div className="admin-content">{children}</div>
            </main>
        </div>
    );
}
