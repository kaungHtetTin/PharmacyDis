import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { api, configureApiClient, setStoredToken } from './apiClient';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        configureApiClient();
        api.get('/user')
            .then(setUser)
            .catch(() => setUser(null))
            .finally(() => setLoading(false));
    }, []);

    async function login(credentials) {
        const response = await api.post('/auth/login', credentials);
        setStoredToken(response.token);
        setUser(response.user);
        return response.user;
    }

    async function logout() {
        try {
            await api.post('/auth/logout');
        } finally {
            setStoredToken('');
            setUser(null);
        }
    }

    const value = useMemo(() => ({ loading, login, logout, user }), [loading, user]);

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    const context = useContext(AuthContext);

    if (!context) {
        throw new Error('useAuth must be used inside AuthProvider.');
    }

    return context;
}
