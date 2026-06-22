import axios from 'axios';

const appConfig = window.appConfig || {};
const baseUrl = String(appConfig.baseUrl || '').replace(/\/+$/g, '');
const tokenKey = 'pharmacy_dis_api_token';

export function getStoredToken() {
    return window.localStorage.getItem(tokenKey);
}

export function setStoredToken(token) {
    if (!token) {
        window.localStorage.removeItem(tokenKey);
        delete axios.defaults.headers.common.Authorization;
        return;
    }

    window.localStorage.setItem(tokenKey, token);
    axios.defaults.headers.common.Authorization = `Bearer ${token}`;
}

export function configureApiClient() {
    axios.defaults.baseURL = `${baseUrl}/api`;
    axios.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest';

    const token = getStoredToken();
    if (token) {
        axios.defaults.headers.common.Authorization = `Bearer ${token}`;
    }
}

export async function apiRequest(method, url, data, config = {}) {
    try {
        const response = await axios.request({ method, url, data, ...config });
        return response.data;
    } catch (error) {
        const message = error.response?.data?.message
            || Object.values(error.response?.data?.errors || {})?.flat()?.[0]
            || 'Something went wrong while connecting to the server.';

        throw new Error(message);
    }
}

export const api = {
    get: (url, config) => apiRequest('get', url, undefined, config),
    post: (url, data, config) => apiRequest('post', url, data, config),
    put: (url, data, config) => apiRequest('put', url, data, config),
    patch: (url, data, config) => apiRequest('patch', url, data, config),
    delete: (url, config) => apiRequest('delete', url, undefined, config),
};
