import './bootstrap';
import React from 'react';
import { createRoot } from 'react-dom/client';
import Root from './Root.jsx';
import { AuthProvider } from './services/auth.jsx';
import { registerSalesServiceWorker } from './pwa';

const rootElement = document.getElementById('app');

if (rootElement) {
    createRoot(rootElement).render(
        React.createElement(AuthProvider, null, React.createElement(Root))
    );
}

registerSalesServiceWorker();
