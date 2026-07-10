export function registerSalesServiceWorker() {
    const appConfig = window.appConfig || {};

    if (appConfig.currentApp !== 'sales' || !('serviceWorker' in navigator)) {
        return;
    }

    window.addEventListener('load', () => {
        navigator.serviceWorker.register(`${appConfig.baseUrl || ''}/sales-sw.js`, { scope: `${appConfig.baseUrl || ''}/sales/` })
            .catch(() => {
                // PWA registration should never block the sales app.
            });
    });
}
