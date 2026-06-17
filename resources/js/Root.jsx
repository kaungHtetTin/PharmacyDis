import { useEffect, useState } from 'react';
import OfficeLayout from './layouts/OfficeLayout';
import SalesRepLayout from './layouts/SalesRepLayout';
import { officeNav, salesNav } from './data/navigation';
import DashboardPage from './pages/office/DashboardPage';
import InvoiceDetailPage from './pages/office/InvoiceDetailPage';
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

const officePages = [...officeNav.map(([key]) => key), 'login', 'pharmacies-detail', 'representatives-detail', 'inventory-detail', 'invoice-detail', 'stock-transfer-create'];
const salesPages = [...salesNav.map(([key]) => key), 'login', 'profile', 'pharmacies-detail'];

const appConfig = window.appConfig || {};
const baseUrl = String(appConfig.baseUrl || '').replace(/\/+$/g, '');

function pageUrl(appMode, page, params = null) {
    const section = appMode === 'sales' ? 'sales' : 'office';
    const cleanPage = String(page || 'dashboard').replace(/^\/+|\/+$/g, '');
    const query = params ? `?${new URLSearchParams(params).toString()}` : '';

    return `${baseUrl}/${section}/${cleanPage}${query}`;
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

    function navigate(app, page, params = null) {
        const nextUrl = pageUrl(app, page, params);

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
                onNavigate={(page, params) => navigate('sales', page, params)}
            >
                {page === 'dashboard'
                    ? <SalesDashboardPage activePage={page} onNavigate={(page) => navigate('sales', page)} />
                    : page === 'profile'
                        ? <SalesProfilePage onNavigate={(page) => navigate('sales', page)} />
                        : page === 'pharmacies-detail'
                            ? <SalesPharmacyDetailPage onNavigate={(page, params) => navigate('sales', page, params)} />
                            : <SalesModulePage pageKey={page} onNavigate={(page, params) => navigate('sales', page, params)} />}
            </SalesRepLayout>
        );
    }

    if (page === 'login' || !user || user.user_type !== 'office') {
        return <OfficeLoginPage onLogin={() => navigate('office', 'dashboard')} />;
    }

    return (
        <OfficeLayout
            activePage={page === 'stock-transfer-create' ? 'stock-transfers' : page === 'inventory-detail' ? 'inventory' : page === 'invoice-detail' ? 'invoices' : page === 'representatives-detail' || page === 'pharmacies-detail' ? page.replace('-detail', '') : page}
            getPageUrl={(page) => pageUrl('office', page)}
            onNavigate={(page, params) => navigate('office', page, params)}
        >
            {page === 'dashboard' && <DashboardPage activePage={page} />}
            {page === 'pharmacies-detail' && <PharmacyDetailPage onNavigate={(page, params) => navigate('office', page, params)} />}
            {page === 'representatives-detail' && <RepresentativeDetailPage onNavigate={(page) => navigate('office', page)} />}
            {page === 'invoice-detail' && <InvoiceDetailPage onNavigate={(page, params) => navigate('office', page, params)} />}
            {page !== 'dashboard' && page !== 'pharmacies-detail' && page !== 'representatives-detail' && page !== 'invoice-detail' && (
                <OfficeModulePage pageKey={page} onNavigate={(page, params) => navigate('office', page, params)} />
            )}
        </OfficeLayout>
    );
}
