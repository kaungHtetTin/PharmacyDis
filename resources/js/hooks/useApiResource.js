import { useEffect, useState } from 'react';
import { api } from '../services/apiClient';

export default function useApiResource(url, options = {}) {
    const [data, setData] = useState(options.initialData ?? null);
    const [loading, setLoading] = useState(Boolean(url));
    const [error, setError] = useState('');
    const [reloadKey, setReloadKey] = useState(0);

    useEffect(() => {
        if (!url) {
            return undefined;
        }

        let active = true;
        setLoading(true);
        setError('');

        api.get(url)
            .then((response) => {
                if (active) {
                    setData(response);
                }
            })
            .catch((requestError) => {
                if (active) {
                    setError(requestError.message);
                }
            })
            .finally(() => {
                if (active) {
                    setLoading(false);
                }
            });

        return () => {
            active = false;
        };
    }, [reloadKey, url]);

    return { data, error, loading, refresh: () => setReloadKey((key) => key + 1), setData };
}
