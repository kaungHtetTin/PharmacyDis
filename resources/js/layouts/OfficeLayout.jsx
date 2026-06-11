import { useState } from 'react';
import Icon from '../components/shared/Icon';
import Logo from '../components/shared/Logo';
import { officeNavSections } from '../data/navigation';

export default function OfficeLayout({ activePage, getPageUrl, onNavigate, onSwitchApp, salesUrl, children }) {
    const [theme, setTheme] = useState('light');
    const nextTheme = theme === 'dark' ? 'light' : 'dark';

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
                        </button>
                        <a className="btn primary" href={getPageUrl('orders')} onClick={(event) => {
                            event.preventDefault();
                            onNavigate('orders');
                        }}>
                            <Icon name="plus" size={16} />
                            New order
                        </a>
                    </div>
                </header>
                <div className="admin-content">{children}</div>
            </main>
        </div>
    );
}
