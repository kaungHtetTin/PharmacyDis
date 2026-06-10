import './bootstrap';
import React from 'react';
import { createRoot } from 'react-dom/client';
import Root from './Root.jsx';

const rootElement = document.getElementById('app');

if (rootElement) {
    createRoot(rootElement).render(React.createElement(Root));
}
