import { useEffect, useState } from 'react';
import OfficeLayout from './layouts/OfficeLayout';
import SalesRepLayout from './layouts/SalesRepLayout';
import { officeNav, salesNav } from './data/navigation';
import DashboardPage from './pages/office/DashboardPage';
import OfficeLoginPage from './pages/office/OfficeLoginPage';
import OfficeModulePage from './pages/office/OfficeModulePage';
import PharmacyDetailPage from './pages/office/PharmacyDetailPage';
import RepresentativeDetailPage from './pages/office/RepresentativeDetailPage';
import SalesDashboardPage from './pages/sales/SalesDashboardPage';
import SalesLoginPage from './pages/sales/SalesLoginPage';
import SalesModulePage from './pages/sales/SalesModulePage';
import SalesPharmacyDetailPage from './pages/sales/SalesPharmacyDetailPage';
import SalesProfilePage from './pages/sales/SalesProfilePage';
import { useAuth } from './services/auth.jsx';

const officePages = [...officeNav.map(([key]) => key), 'login', 'pharmacies-detail', 'representatives-detail'];
const salesPages = [...salesNav.map(([key]) => key), 'login', 'profile', 'pharmacies-detail'];

const appConfig = window.appConfig || {};
const baseUrl = String(appConfig.baseUrl || '').replace(/\/+$/g, '');

function pageUrl(appMode, page) {
    const section = appMode === 'sales' ? 'sales' : 'office';
    const cleanPage = String(page || 'dashboard').replace(/^\/+|\/+$/g, '');

    return `${baseUrl}/${section}/${cleanPage}`;
}

function getInitialRoute() {
    const initialApp = appConfig.currentApp === 'sales' ? 'sales' : 'office';
    const allowedPages = initialApp === 'sales' ? salesPages : officePages;
    const initialPage = allowedPages.includes(appConfig.currentPage) ? appConfig.currentPage : 'dashboard';

    return { appMode: initialApp, page: initialPage };
}

export default function Root() {
    const { loading, user } = useAuth();
    const [routeState, setRouteState] = useState(getInitialRoute);
    const { appMode, page } = routeState;

    useEffect(() => {
        const handlePopState = () => window.location.reload();

        window.addEventListener('popstate', handlePopState);

        return () => window.removeEventListener('popstate', handlePopState);
    }, []);

    function navigate(app, page) {
        const nextUrl = pageUrl(app, page);

        window.history.pushState({}, '', nextUrl);
        setRouteState({ appMode: app, page });
    }

    if (loading) {
        return <main className="sales-login-page"><section className="sales-login-card glass"><p className="eyebrow">Loading</p><h1>Preparing workspace</h1></section></main>;
    }

    if (appMode === 'sales') {
        if (page === 'login' || !user || user.user_type !== 'sales') {
            return <SalesLoginPage onLogin={() => navigate('sales', 'dashboard')} />;
        }

        return (
            <SalesRepLayout
                activePage={page === 'pharmacies-detail' ? 'pharmacies' : page}
                getPageUrl={(page) => pageUrl('sales', page)}
                officeUrl={pageUrl('office', 'dashboard')}
                onNavigate={(page) => navigate('sales', page)}
                onSwitchApp={() => navigate('office', 'dashboard')}
            >
                {page === 'dashboard'
                    ? <SalesDashboardPage activePage={page} onNavigate={(page) => navigate('sales', page)} />
                    : page === 'profile'
                        ? <SalesProfilePage onNavigate={(page) => navigate('sales', page)} />
                        : page === 'pharmacies-detail'
                            ? <SalesPharmacyDetailPage onNavigate={(page) => navigate('sales', page)} />
                            : <SalesModulePage pageKey={page} onNavigate={(page) => navigate('sales', page)} />}
            </SalesRepLayout>
        );
    }

    if (page === 'login' || !user || user.user_type !== 'office') {
        return <OfficeLoginPage onLogin={() => navigate('office', 'dashboard')} />;
    }

    return (
        <OfficeLayout
            activePage={page === 'representatives-detail' || page === 'pharmacies-detail' ? page.replace('-detail', '') : page}
            getPageUrl={(page) => pageUrl('office', page)}
            onNavigate={(page) => navigate('office', page)}
            onSwitchApp={() => navigate('sales', 'dashboard')}
            salesUrl={pageUrl('sales', 'dashboard')}
        >
            {page === 'dashboard' && <DashboardPage activePage={page} />}
            {page === 'pharmacies-detail' && <PharmacyDetailPage onNavigate={(page) => navigate('office', page)} />}
            {page === 'representatives-detail' && <RepresentativeDetailPage onNavigate={(page) => navigate('office', page)} />}
            {page !== 'dashboard' && page !== 'pharmacies-detail' && page !== 'representatives-detail' && (
                <OfficeModulePage pageKey={page} onNavigate={(page) => navigate('office', page)} />
            )}
        </OfficeLayout>
    );
}
