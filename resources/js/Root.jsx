import { useEffect, useState } from 'react';
import OfficeLayout from './layouts/OfficeLayout';
import SalesRepLayout from './layouts/SalesRepLayout';
import { officeNav, salesNav } from './data/navigation';
import DashboardPage from './pages/office/DashboardPage';
import OfficeModulePage from './pages/office/OfficeModulePage';
import SalesDashboardPage from './pages/sales/SalesDashboardPage';
import SalesModulePage from './pages/sales/SalesModulePage';

const officePages = officeNav.map(([key]) => key);
const salesPages = salesNav.map(([key]) => key);

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

    if (appMode === 'sales') {
        return (
            <SalesRepLayout
                activePage={page}
                getPageUrl={(page) => pageUrl('sales', page)}
                officeUrl={pageUrl('office', 'dashboard')}
                onNavigate={(page) => navigate('sales', page)}
                onSwitchApp={() => navigate('office', 'dashboard')}
            >
                {page === 'dashboard'
                    ? <SalesDashboardPage activePage={page} onNavigate={(page) => navigate('sales', page)} />
                    : <SalesModulePage pageKey={page} />}
            </SalesRepLayout>
        );
    }

    return (
        <OfficeLayout
            activePage={page}
            getPageUrl={(page) => pageUrl('office', page)}
            onNavigate={(page) => navigate('office', page)}
            onSwitchApp={() => navigate('sales', 'dashboard')}
            salesUrl={pageUrl('sales', 'dashboard')}
        >
            {page === 'dashboard'
                ? <DashboardPage activePage={page} />
                : <OfficeModulePage pageKey={page} />}
        </OfficeLayout>
    );
}
