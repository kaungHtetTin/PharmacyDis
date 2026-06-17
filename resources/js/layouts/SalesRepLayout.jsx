import { useEffect, useRef, useState } from 'react';
import Icon from '../components/shared/Icon';
import Logo from '../components/shared/Logo';
import StatusBadge from '../components/shared/StatusBadge';
import { salesNav } from '../data/navigation';
import { useAuth } from '../services/auth.jsx';

const quickActions = [
    { label: 'New order', href: 'new-order', icon: 'plus' },
    { label: 'Stock', href: 'stock', icon: 'box' },
];

export default function SalesRepLayout({ activePage, getPageUrl, onNavigate, children }) {
    const { user } = useAuth();
    const [profileOpen, setProfileOpen] = useState(false);
    const profileMenuRef = useRef(null);
    const representative = user?.sales_representative;
    const profileName = user?.name || 'Sales Representative';
    const initials = profileName.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase() || 'SR';
    const assignedCompany = representative?.company;
    const region = representative?.region || 'Sales Representative';

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
                            <span>{initials}</span>
                            <div>
                                <strong>{profileName}</strong>
                                <small>Sales Rep</small>
                            </div>
                        </button>
                        {profileOpen && (
                            <div className="sales-profile-dropdown glass">
                                <section>
                                    <p className="eyebrow">Profile</p>
                                    <div className="profile-menu-head">
                                        <span>{initials}</span>
                                        <div>
                                            <strong>{profileName}</strong>
                                            <small>{region} / Sales Representative</small>
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
                                        {assignedCompany ? (
                                            <article>
                                                <div>
                                                    <strong>{assignedCompany.name}</strong>
                                                    <small>Assigned product catalog</small>
                                                </div>
                                                <StatusBadge value={representative?.status || 'Active'} />
                                            </article>
                                        ) : <span className="muted">No assigned company.</span>}
                                    </div>
                                </section>
                            </div>
                        )}
                    </div>
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
