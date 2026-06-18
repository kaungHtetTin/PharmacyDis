import { useEffect, useRef, useState } from 'react';
import Icon from '../components/shared/Icon';
import Logo from '../components/shared/Logo';
import { officeNavSections } from '../data/navigation';
import { api } from '../services/apiClient';
import { useAuth } from '../services/auth.jsx';

function canAccess(user, permission) {
    if (!permission) {
        return true;
    }

    const permissions = user?.role?.permissions || user?.permissions || [];

    return permissions.includes('*') || permissions.includes(permission) || ['admin', 'super_admin'].includes(user?.role?.name);
}

function initials(name) {
    return String(name || 'Admin User')
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0])
        .join('')
        .toUpperCase();
}

function storageUrl(path) {
    if (!path) {
        return '';
    }

    if (/^(https?:)?\/\//.test(path) || path.startsWith('data:') || path.startsWith('blob:')) {
        return path;
    }

    const baseUrl = String(window.appConfig?.baseUrl || '').replace(/\/+$/g, '');
    const normalizedPath = String(path).replace(/^\/+/, '').replace(/^storage\//, '');

    return `${baseUrl}/storage/${normalizedPath}`;
}

function formatRoleName(role) {
    const label = role?.display_name || role?.name || '';

    return label
        ? String(label).replace(/[_-]/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
        : 'Office Admin';
}

function formatBadgeCount(value) {
    const count = Number(value || 0);

    return count > 99 ? '99+' : String(count);
}

function formatNotificationTime(value) {
    if (!value) {
        return '-';
    }

    try {
        return new Intl.DateTimeFormat('en', {
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            month: 'short',
        }).format(new Date(value));
    } catch {
        return String(value).slice(0, 16);
    }
}

function unwrapNotifications(response) {
    return Array.isArray(response?.data) ? response.data : Array.isArray(response) ? response : [];
}

const officeProfileQuickLinks = [
    { href: 'dashboard', icon: 'grid', label: 'Dashboard', permission: 'office.dashboard' },
    { href: 'orders', icon: 'cart', label: 'Orders', permission: 'office.operations' },
    { href: 'invoices', icon: 'receipt', label: 'Invoices', permission: 'office.operations' },
    { href: 'pharmacies', icon: 'users', label: 'Pharmacies', permission: 'office.master-data' },
    { href: 'inventory', icon: 'truck', label: 'Inventory', permission: 'office.operations' },
    { href: 'settings', icon: 'settings', label: 'Settings', permission: 'office.settings' },
];

export default function OfficeLayout({ activePage, getPageUrl, onNavigate, children }) {
    const { logout, user } = useAuth();
    const [theme, setTheme] = useState('light');
    const [actionCounts, setActionCounts] = useState({});
    const [actionTotal, setActionTotal] = useState(0);
    const [notifications, setNotifications] = useState([]);
    const [notificationOpen, setNotificationOpen] = useState(false);
    const [notificationLoading, setNotificationLoading] = useState(false);
    const [notificationError, setNotificationError] = useState('');
    const [profileOpen, setProfileOpen] = useState(false);
    const [loggingOut, setLoggingOut] = useState(false);
    const notificationMenuRef = useRef(null);
    const profileMenuRef = useRef(null);
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    const unreadNotificationCount = notifications.filter((notification) => !notification.read_at).length;
    const notificationBadgeCount = unreadNotificationCount + actionTotal;
    const hasNotificationBadge = notificationBadgeCount > 0;
    const profileImageUrl = storageUrl(user?.profile_image_path);
    const profileName = user?.name || 'Admin User';
    const profileRole = formatRoleName(user?.role);
    const visibleNavSections = officeNavSections
        .map((section) => ({
            ...section,
            items: section.items.filter(([, , , permission]) => canAccess(user, permission)),
        }))
        .filter((section) => section.items.length > 0);
    const actionItems = Object.entries(actionCounts)
        .filter(([, count]) => Number(count || 0) > 0)
        .map(([key, count]) => {
            const navItem = officeNavSections.flatMap((section) => section.items).find(([itemKey]) => itemKey === key);

            return {
                count: Number(count || 0),
                key,
                label: navItem?.[2] || key,
            };
        });
    const profileQuickLinks = officeProfileQuickLinks.filter((link) => canAccess(user, link.permission));

    async function loadNotifications() {
        setNotificationLoading(true);
        setNotificationError('');

        try {
            const response = await api.get('/notifications?per_page=8');
            setNotifications(unwrapNotifications(response));
        } catch (error) {
            setNotificationError(error.message);
        } finally {
            setNotificationLoading(false);
        }
    }

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

    useEffect(() => {
        loadNotifications();
    }, []);

    useEffect(() => {
        function closeTopbarMenus(event) {
            if (!notificationMenuRef.current?.contains(event.target)) {
                setNotificationOpen(false);
            }

            if (!profileMenuRef.current?.contains(event.target)) {
                setProfileOpen(false);
            }
        }

        document.addEventListener('mousedown', closeTopbarMenus);

        return () => document.removeEventListener('mousedown', closeTopbarMenus);
    }, []);

    async function toggleNotifications() {
        const nextOpen = !notificationOpen;

        setNotificationOpen(nextOpen);

        if (nextOpen) {
            await loadNotifications();
        }
    }

    async function markNotificationRead(notification) {
        if (!notification?.id || notification.read_at) {
            return;
        }

        try {
            const updatedNotification = await api.post(`/notifications/${notification.id}/mark-as-read`);
            setNotifications((current) => current.map((item) => (
                item.id === notification.id ? updatedNotification : item
            )));
        } catch (error) {
            setNotificationError(error.message);
        }
    }

    function navigateFromProfile(page) {
        setProfileOpen(false);
        onNavigate(page);
    }

    async function handleLogout() {
        setLoggingOut(true);
        setProfileOpen(false);

        try {
            await logout();
            onNavigate('login');
        } finally {
            setLoggingOut(false);
        }
    }

    return (
        <div className={`admin-app theme-${theme}`}>
            <aside className="admin-sidebar glass">
                <Logo />
                <nav aria-label="Office navigation">
                    {visibleNavSections.map((section) => (
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
                <a
                    className="admin-profile"
                    href={getPageUrl('profile')}
                    onClick={(event) => {
                        event.preventDefault();
                        onNavigate('profile');
                    }}
                >
                    <span>{profileImageUrl ? <img alt="" src={profileImageUrl} /> : initials(profileName)}</span>
                    <div>
                        <strong>{profileName}</strong>
                        <small>Edit profile</small>
                    </div>
                </a>
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
                        <div className="office-notification-menu" ref={notificationMenuRef}>
                            <button
                                aria-expanded={notificationOpen}
                                className="icon-btn"
                                onClick={toggleNotifications}
                                type="button"
                                title="Notifications"
                            >
                                <Icon name="bell" size={17} />
                                {hasNotificationBadge && (
                                    <strong aria-label={`${notificationBadgeCount} notifications or operational items need action`} className="topbar-alert-badge">
                                        {formatBadgeCount(notificationBadgeCount)}
                                    </strong>
                                )}
                            </button>
                            {notificationOpen && (
                                <div className="office-notification-dropdown glass">
                                    <header>
                                        <div>
                                            <p className="eyebrow">Notifications</p>
                                            <strong>Office activity</strong>
                                        </div>
                                        <button className="btn secondary" disabled={notificationLoading} onClick={loadNotifications} type="button">Refresh</button>
                                    </header>
                                    {notificationError && <span className="error-text">{notificationError}</span>}
                                    {notificationLoading && <span className="muted">Loading notifications...</span>}
                                    {!notificationLoading && notifications.length === 0 && (
                                        <p className="helper-copy">No notifications yet.</p>
                                    )}
                                    {!notificationLoading && notifications.length > 0 && (
                                        <div className="office-notification-list">
                                            {notifications.map((notification) => (
                                                <button
                                                    className={`office-notification-item${notification.read_at ? '' : ' unread'}`}
                                                    key={notification.id}
                                                    onClick={() => markNotificationRead(notification)}
                                                    type="button"
                                                >
                                                    <span>
                                                        <strong>{notification.title}</strong>
                                                        <small>{notification.body || notification.type}</small>
                                                    </span>
                                                    <em>{notification.read_at ? 'Read' : formatNotificationTime(notification.created_at)}</em>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                    {actionItems.length > 0 && (
                                        <section className="office-action-alerts">
                                            <p className="eyebrow">Need Action</p>
                                            {actionItems.map((item) => (
                                                <button
                                                    key={item.key}
                                                    onClick={() => {
                                                        setNotificationOpen(false);
                                                        onNavigate(item.key);
                                                    }}
                                                    type="button"
                                                >
                                                    <span>{item.label}</span>
                                                    <strong>{formatBadgeCount(item.count)}</strong>
                                                </button>
                                            ))}
                                        </section>
                                    )}
                                </div>
                            )}
                        </div>
                        <div className="office-profile-menu" ref={profileMenuRef}>
                            <button
                                aria-expanded={profileOpen}
                                className="office-profile-button"
                                onClick={() => setProfileOpen((open) => !open)}
                                type="button"
                            >
                                <span>{profileImageUrl ? <img alt="" src={profileImageUrl} /> : initials(profileName)}</span>
                                <div>
                                    <strong>{profileName}</strong>
                                    <small>{profileRole}</small>
                                </div>
                            </button>
                            {profileOpen && (
                                <div className="office-profile-dropdown glass">
                                    <section>
                                        <p className="eyebrow">Profile</p>
                                        <div className="profile-menu-head">
                                            <span>{profileImageUrl ? <img alt="" src={profileImageUrl} /> : initials(profileName)}</span>
                                            <div>
                                                <strong>{profileName}</strong>
                                                <small>{profileRole}</small>
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
                                            {profileQuickLinks.map((link) => (
                                                <a
                                                    href={getPageUrl(link.href)}
                                                    key={link.href}
                                                    onClick={(event) => {
                                                        event.preventDefault();
                                                        navigateFromProfile(link.href);
                                                    }}
                                                >
                                                    <Icon name={link.icon} size={15} />
                                                    <span>{link.label}</span>
                                                </a>
                                            ))}
                                        </div>
                                    </section>
                                    <section>
                                        <button className="profile-logout-button" disabled={loggingOut} onClick={handleLogout} type="button">
                                            <Icon name="logout" size={15} />
                                            <span>{loggingOut ? 'Logging out...' : 'Logout'}</span>
                                        </button>
                                    </section>
                                </div>
                            )}
                        </div>
                    </div>
                </header>
                <div className="admin-content">{children}</div>
            </main>
        </div>
    );
}
