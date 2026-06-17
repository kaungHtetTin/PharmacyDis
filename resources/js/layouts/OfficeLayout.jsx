import { useEffect, useState } from 'react';
import Icon from '../components/shared/Icon';
import Logo from '../components/shared/Logo';
import { officeNavSections } from '../data/navigation';
import { api } from '../services/apiClient';

function formatBadgeCount(value) {
    const count = Number(value || 0);

    return count > 99 ? '99+' : String(count);
}

export default function OfficeLayout({ activePage, getPageUrl, onNavigate, children }) {
    const [theme, setTheme] = useState('light');
    const [actionCounts, setActionCounts] = useState({});
    const [actionTotal, setActionTotal] = useState(0);
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    const hasActionAlerts = actionTotal > 0;

    useEffect(() => {
        let active = true;

        async function loadActionCounts() {
            try {
                const response = await api.get('/office/dashboard');
                const counts = response.nav_action_counts || {};

                if (active) {
                    setActionCounts(counts);
                    setActionTotal(Number(response.total_action_count ?? Object.values(counts).reduce((sum, value) => sum + Number(value || 0), 0)));
                }
            } catch (error) {
                if (active) {
                    setActionCounts({});
                    setActionTotal(0);
                }
            }
        }

        loadActionCounts();
        const interval = window.setInterval(loadActionCounts, 30000);

        window.addEventListener('office-submitted-orders-changed', loadActionCounts);
        window.addEventListener('office-operational-actions-changed', loadActionCounts);

        return () => {
            active = false;
            window.removeEventListener('office-submitted-orders-changed', loadActionCounts);
            window.removeEventListener('office-operational-actions-changed', loadActionCounts);
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
                            {section.items.map(([key, icon, label]) => {
                                const actionCount = Number(actionCounts[key] || 0);
                                const hasAlert = actionCount > 0;

                                return (
                                    <a
                                        className={activePage === key ? 'active' : ''}
                                        href={getPageUrl(key)}
                                        key={key}
                                        onClick={(event) => {
                                            event.preventDefault();
                                            onNavigate(key);
                                        }}
                                    >
                                        <Icon name={icon} size={17} />
                                        <span>{label}</span>
                                        {hasAlert && (
                                            <strong aria-label={`${actionCount} ${label} items need action`} className="nav-alert-badge">
                                                {formatBadgeCount(actionCount)}
                                            </strong>
                                        )}
                                    </a>
                                );
                            })}
                        </div>
                    ))}
                </nav>
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
                            {hasActionAlerts && (
                                <strong aria-label={`${actionTotal} operational items need action`} className="topbar-alert-badge">
                                    {formatBadgeCount(actionTotal)}
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
