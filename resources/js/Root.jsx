import { useEffect, useState } from 'react';
import OfficeLayout from './layouts/OfficeLayout';
import SalesRepLayout from './layouts/SalesRepLayout';
import { officeNav, salesNav } from './data/navigation';
import ActivityLogPage from './pages/office/ActivityLogPage';
import DashboardPage from './pages/office/DashboardPage';
import InvoiceDetailPage from './pages/office/InvoiceDetailPage';
import OfficeLoginPage from './pages/office/OfficeLoginPage';
import OfficeModulePage from './pages/office/OfficeModulePage';
import OfficeProfilePage from './pages/office/OfficeProfilePage';
import OfficeUsersPage from './pages/office/OfficeUsersPage';
import OrderDetailPage from './pages/office/OrderDetailPage';
import OrderCreateWizard from './components/shared/OrderCreateWizard';
import PayableDetailPage from './pages/office/PayableDetailPage';
import PaymentDetailPage from './pages/office/PaymentDetailPage';
import PharmacyDetailPage from './pages/office/PharmacyDetailPage';
import ProductDetailPage from './pages/office/ProductDetailPage';
import RepresentativeDetailPage from './pages/office/RepresentativeDetailPage';
import StockReceivingCreatePage from './pages/office/StockReceivingCreatePage';
import StockTransferDetailPage from './pages/office/StockTransferDetailPage';
import StockReceivingDetailPage from './pages/office/StockReceivingDetailPage';
import SalesDashboardPage from './pages/sales/SalesDashboardPage';
import SalesLoginPage from './pages/sales/SalesLoginPage';
import SalesModulePage from './pages/sales/SalesModulePage';
import SalesOrderDetailPage from './pages/sales/SalesOrderDetailPage';
import SalesPharmacyDetailPage from './pages/sales/SalesPharmacyDetailPage';
import SalesProfilePage from './pages/sales/SalesProfilePage';
import { useAuth } from './services/auth.jsx';

const officePages = [...officeNav.map(([key]) => key), 'login', 'profile', 'pharmacies-detail', 'product-detail', 'representatives-detail', 'inventory-detail', 'invoice-detail', 'order-create', 'order-edit', 'order-detail', 'payable-detail', 'payment-detail', 'receiving-create', 'receiving-detail', 'stock-transfer-create', 'stock-transfer-detail'];
const salesPages = [...salesNav.map(([key]) => key), 'login', 'profile', 'pharmacies-detail', 'order-detail', 'order-submitted'];
const detailParentPages = {
    'inventory-detail': 'inventory',
    'invoice-detail': 'invoices',
    'order-create': 'orders',
    'order-edit': 'orders',
    'order-detail': 'orders',
    'payable-detail': 'payables',
    'payment-detail': 'payments',
    'pharmacies-detail': 'pharmacies',
    'product-detail': 'products',
    'receiving-create': 'receiving',
    'receiving-detail': 'receiving',
    'representatives-detail': 'representatives',
    'stock-transfer-create': 'stock-transfers',
    'stock-transfer-detail': 'stock-transfers',
};

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
    const searchParams = new URLSearchParams(window.location.search);
    const requestedPage = initialApp === 'office' && appConfig.currentPage === 'orders' && searchParams.get('order_id')
        ? 'order-detail'
        : appConfig.currentPage;
    const initialPage = allowedPages.includes(requestedPage) ? requestedPage : 'dashboard';

    return { appMode: initialApp, page: initialPage };
}

function canAccess(user, permission) {
    if (!permission) {
        return true;
    }

    const permissions = user?.role?.permissions || user?.permissions || [];

    return permissions.includes('*') || permissions.includes(permission) || ['admin', 'super_admin'].includes(user?.role?.name);
}

function canAccessOfficePage(user, page) {
    const navKey = detailParentPages[page] || page;
    const navItem = officeNav.find(([key]) => key === navKey);

    return canAccess(user, navItem?.[3]);
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
                activePage={page === 'pharmacies-detail' ? 'pharmacies' : page === 'order-submitted' || page === 'order-detail' ? 'orders' : page}
                getPageUrl={(page) => pageUrl('sales', page)}
                onNavigate={(page, params) => navigate('sales', page, params)}
            >
                {page === 'dashboard'
                    ? <SalesDashboardPage activePage={page} onNavigate={(page) => navigate('sales', page)} />
                    : page === 'profile'
                        ? <SalesProfilePage onNavigate={(page) => navigate('sales', page)} />
                        : page === 'pharmacies-detail'
                            ? <SalesPharmacyDetailPage onNavigate={(page, params) => navigate('sales', page, params)} />
                            : page === 'order-detail'
                                ? <SalesOrderDetailPage onNavigate={(page, params) => navigate('sales', page, params)} />
                                : page === 'new-order'
                                    ? <OrderCreateWizard mode="sales" onNavigate={(page, params) => navigate('sales', page, params)} />
                                    : <SalesModulePage pageKey={page} onNavigate={(page, params) => navigate('sales', page, params)} />}
            </SalesRepLayout>
        );
    }

    if (page === 'login' || !user || user.user_type !== 'office') {
        return <OfficeLoginPage onLogin={() => navigate('office', 'dashboard')} />;
    }

    const officeAccessAllowed = canAccessOfficePage(user, page);

    return (
        <OfficeLayout
            activePage={page === 'stock-transfer-create' || page === 'stock-transfer-detail' ? 'stock-transfers' : page === 'inventory-detail' ? 'inventory' : page === 'invoice-detail' ? 'invoices' : page === 'order-create' || page === 'order-edit' || page === 'order-detail' ? 'orders' : page === 'payable-detail' ? 'payables' : page === 'payment-detail' ? 'payments' : page === 'product-detail' ? 'products' : page === 'receiving-create' || page === 'receiving-detail' ? 'receiving' : page === 'representatives-detail' || page === 'pharmacies-detail' ? page.replace('-detail', '') : page}
            getPageUrl={(page) => pageUrl('office', page)}
            onNavigate={(page, params) => navigate('office', page, params)}
        >
            {!officeAccessAllowed && (
                <section className="panel glass">
                    <div className="panel-heading">
                        <div>
                            <p className="eyebrow">Access Control</p>
                            <h2>Permission required</h2>
                        </div>
                    </div>
                    <p className="helper-copy">Your current role does not have access to this office page.</p>
                </section>
            )}
            {officeAccessAllowed && page === 'dashboard' && <DashboardPage activePage={page} />}
            {officeAccessAllowed && page === 'pharmacies-detail' && <PharmacyDetailPage onNavigate={(page, params) => navigate('office', page, params)} />}
            {officeAccessAllowed && page === 'representatives-detail' && <RepresentativeDetailPage onNavigate={(page) => navigate('office', page)} />}
            {officeAccessAllowed && page === 'invoice-detail' && <InvoiceDetailPage onNavigate={(page, params) => navigate('office', page, params)} />}
            {officeAccessAllowed && page === 'order-create' && <OrderCreateWizard mode="office" onNavigate={(page, params) => navigate('office', page, params)} />}
            {officeAccessAllowed && page === 'order-edit' && <OrderCreateWizard mode="office" onNavigate={(page, params) => navigate('office', page, params)} />}
            {officeAccessAllowed && page === 'order-detail' && <OrderDetailPage onNavigate={(page, params) => navigate('office', page, params)} />}
            {officeAccessAllowed && page === 'payable-detail' && <PayableDetailPage onNavigate={(page, params) => navigate('office', page, params)} />}
            {officeAccessAllowed && page === 'payment-detail' && <PaymentDetailPage onNavigate={(page, params) => navigate('office', page, params)} />}
            {officeAccessAllowed && page === 'product-detail' && <ProductDetailPage onNavigate={(page, params) => navigate('office', page, params)} />}
            {officeAccessAllowed && page === 'receiving-create' && <StockReceivingCreatePage onNavigate={(page, params) => navigate('office', page, params)} />}
            {officeAccessAllowed && page === 'receiving-detail' && <StockReceivingDetailPage onNavigate={(page, params) => navigate('office', page, params)} />}
            {officeAccessAllowed && page === 'stock-transfer-detail' && <StockTransferDetailPage onNavigate={(page, params) => navigate('office', page, params)} />}
            {officeAccessAllowed && page === 'profile' && <OfficeProfilePage onNavigate={(page) => navigate('office', page)} />}
            {officeAccessAllowed && page === 'users' && <OfficeUsersPage />}
            {officeAccessAllowed && page === 'activity-logs' && <ActivityLogPage />}
            {officeAccessAllowed && page !== 'dashboard' && page !== 'pharmacies-detail' && page !== 'representatives-detail' && page !== 'invoice-detail' && page !== 'order-create' && page !== 'order-edit' && page !== 'order-detail' && page !== 'payable-detail' && page !== 'payment-detail' && page !== 'product-detail' && page !== 'receiving-create' && page !== 'receiving-detail' && page !== 'stock-transfer-detail' && page !== 'profile' && page !== 'users' && page !== 'activity-logs' && (
                <OfficeModulePage pageKey={page} onNavigate={(page, params) => navigate('office', page, params)} />
            )}
        </OfficeLayout>
    );
}
