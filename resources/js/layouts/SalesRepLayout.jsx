import { useEffect, useRef, useState } from 'react';
import Icon from '../components/shared/Icon';
import Logo from '../components/shared/Logo';
import StatusBadge from '../components/shared/StatusBadge';
import { assignedCompanies, quickActions } from '../data/mock/salesDashboard';
import { salesNav } from '../data/navigation';

export default function SalesRepLayout({ activePage, getPageUrl, officeUrl, onNavigate, onSwitchApp, children }) {
    const [profileOpen, setProfileOpen] = useState(false);
    const profileMenuRef = useRef(null);

    useEffect(() => {
        function closeProfileMenu(event) {
            if (!profileMenuRef.current?.contains(event.target)) {
                setProfileOpen(false);
            }
        }

        document.addEventListener('mousedown', closeProfileMenu);

        return () => document.removeEventListener('mousedown', closeProfileMenu);
    }, []);

    function navigateFromProfile(page) {
        setProfileOpen(false);
        onNavigate(page);
    }

    return (
        <div className="sales-app">
            <header className="sales-topbar glass">
                <Logo compact />
                <div className="sales-topbar-actions">
                    <button className="icon-btn" type="button" title="Notifications">
                        <Icon name="bell" size={17} />
                    </button>
                    <div className="sales-profile-menu" ref={profileMenuRef}>
                        <button
                            aria-expanded={profileOpen}
                            className="sales-profile"
                            onClick={() => setProfileOpen((open) => !open)}
                            type="button"
                        >
                            <span>MR</span>
                            <div>
                                <strong>May Zin</strong>
                                <small>Sales Rep</small>
                            </div>
                        </button>
                        {profileOpen && (
                            <div className="sales-profile-dropdown glass">
                                <section>
                                    <p className="eyebrow">Profile</p>
                                    <div className="profile-menu-head">
                                        <span>MR</span>
                                        <div>
                                            <strong>May Zin</strong>
                                            <small>Yangon North / Sales Representative</small>
                                        </div>
                                    </div>
                                </section>
                                <section>
                                    <p className="eyebrow">Quick Links</p>
                                    <div className="profile-quick-links">
                                        <a
                                            href={getPageUrl('profile')}
                                            onClick={(event) => {
                                                event.preventDefault();
                                                navigateFromProfile('profile');
                                            }}
                                        >
                                            <Icon name="edit" size={15} />
                                            <span>Edit profile</span>
                                        </a>
                                        {quickActions.map((action) => (
                                            <a
                                                href={getPageUrl(action.href)}
                                                key={action.label}
                                                onClick={(event) => {
                                                    event.preventDefault();
                                                    navigateFromProfile(action.href);
                                                }}
                                            >
                                                <Icon name={action.icon} size={15} />
                                                <span>{action.label}</span>
                                            </a>
                                        ))}
                                        <a
                                            href={getPageUrl('orders')}
                                            onClick={(event) => {
                                                event.preventDefault();
                                                navigateFromProfile('orders');
                                            }}
                                        >
                                            <Icon name="receipt" size={15} />
                                            <span>Order history</span>
                                        </a>
                                    </div>
                                </section>
                                <section>
                                    <p className="eyebrow">Assigned Company</p>
                                    <div className="profile-company-list">
                                        {assignedCompanies.map((company) => (
                                            <article key={company.id}>
                                                <div>
                                                    <strong>{company.company}</strong>
                                                    <small>{company.products} / {company.orders} orders</small>
                                                </div>
                                                <StatusBadge value={company.status} />
                                            </article>
                                        ))}
                                    </div>
                                </section>
                            </div>
                        )}
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
