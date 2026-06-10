import Icon from '../components/shared/Icon';
import Logo from '../components/shared/Logo';
import { salesNav } from '../data/navigation';

export default function SalesRepLayout({ activePage, getPageUrl, officeUrl, onNavigate, onSwitchApp, children }) {
    return (
        <div className="sales-app">
            <header className="sales-topbar glass">
                <Logo compact />
                <div className="sales-topbar-actions">
                    <button className="icon-btn" type="button" title="Notifications">
                        <Icon name="bell" size={17} />
                    </button>
                    <div className="sales-profile">
                        <span>MR</span>
                        <div>
                            <strong>May Zin</strong>
                            <small>Sales Rep</small>
                        </div>
                    </div>
                    <a
                        className="btn secondary"
                        href={officeUrl}
                        onClick={(event) => {
                            event.preventDefault();
                            onSwitchApp();
                        }}
                    >
                        Office
                    </a>
                </div>
            </header>

            <main className="sales-main">{children}</main>

            <nav className="sales-nav glass" aria-label="Sales representative navigation">
                {salesNav.map(([key, icon, label]) => (
                    <a
                        className={activePage === key ? 'active' : ''}
                        href={getPageUrl(key)}
                        key={key}
                        onClick={(event) => {
                            event.preventDefault();
                            onNavigate(key);
                        }}
                    >
                        <Icon name={icon} size={18} />
                        <span>{label}</span>
                    </a>
                ))}
            </nav>
        </div>
    );
}
