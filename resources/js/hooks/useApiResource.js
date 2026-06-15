import { useEffect, useState } from 'react';
import { api } from '../services/apiClient';

export default function useApiResource(url, options = {}) {
    const [data, setData] = useState(options.initialData ?? null);
    const [loading, setLoading] = useState(Boolean(url));
    const [error, setError] = useState('');
    const [reloadKey, setReloadKey] = useState(0);

    useEffect(() => {
        if (!url) {
            setData(options.initialData ?? null);
            setLoading(false);
            setError('');
            return undefined;
        }

        let active = true;
        setData((current) => (options.keepPreviousData ? current : options.initialData ?? null));
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
