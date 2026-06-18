import { useMemo, useState } from 'react';
import DataTable from '../../components/shared/DataTable';
import FilterToolbar from '../../components/shared/FilterToolbar';
import Modal from '../../components/shared/Modal';
import PageHeader from '../../components/shared/PageHeader';
import PaginationBar from '../../components/shared/PaginationBar';
import Panel from '../../components/shared/Panel';
import { api } from '../../services/apiClient';
import useApiResource from '../../hooks/useApiResource';

const blankFilters = {
    action: '',
    page: 1,
    search: '',
};

const actionOptions = [
    { label: 'Created', value: 'created' },
    { label: 'Updated', value: 'updated' },
    { label: 'Deleted', value: 'deleted' },
    { label: 'Soft Deleted', value: 'soft_deleted' },
    { label: 'Restored', value: 'restored' },
];

function titleCase(value) {
    return String(value || '')
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDateTime(value) {
    if (!value) {
        return '-';
    }

    try {
        return new Intl.DateTimeFormat('en', {
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            month: 'short',
            year: 'numeric',
        }).format(new Date(value));
    } catch {
        return String(value).slice(0, 16);
    }
}

function summarizeChanges(log) {
    const oldKeys = Object.keys(log.old_values || {});
    const newKeys = Object.keys(log.new_values || {});
    const keys = [...new Set([...oldKeys, ...newKeys])];

    if (!keys.length) {
        return '-';
    }

    return keys.slice(0, 4).join(', ') + (keys.length > 4 ? ` +${keys.length - 4}` : '');
}

function mapLogs(response) {
    const records = Array.isArray(response?.data) ? response.data : [];

    return records.map((log) => ({
        id: log.id,
        action: titleCase(log.action),
        actor: log.actor?.name || 'System',
        target: `${log.auditable_label || 'System'}${log.auditable_id ? ` #${log.auditable_id}` : ''}`,
        changed: summarizeChanges(log),
        ipAddress: log.ip_address || '-',
        createdAt: formatDateTime(log.created_at),
    }));
}

function buildEndpoint(filters) {
    const params = new URLSearchParams({
        page: String(filters.page || 1),
        per_page: '25',
    });

    if (filters.search) {
        params.set('search', filters.search);
    }

    if (filters.action) {
        params.set('action', filters.action);
    }

    return `/office/activity-logs?${params.toString()}`;
}

export default function ActivityLogPage() {
    const [filters, setFilters] = useState(blankFilters);
    const [confirmClearOpen, setConfirmClearOpen] = useState(false);
    const [clearBusy, setClearBusy] = useState(false);
    const [clearError, setClearError] = useState('');
    const logsResource = useApiResource(buildEndpoint(filters), { keepPreviousData: true });
    const rows = useMemo(() => mapLogs(logsResource.data), [logsResource.data]);
    const pagination = logsResource.data ? {
        currentPage: Number(logsResource.data.current_page || 1),
        from: Number(logsResource.data.from || 0),
        lastPage: Number(logsResource.data.last_page || 1),
        to: Number(logsResource.data.to || 0),
        total: Number(logsResource.data.total || 0),
    } : null;

    function updateSearch(search) {
        setFilters((current) => ({ ...current, page: 1, search }));
    }

    function updateFilter(key, value) {
        setFilters((current) => ({ ...current, [key]: value, page: 1 }));
    }

    function resetFilters() {
        setFilters(blankFilters);
    }

    async function clearLogs() {
        setClearBusy(true);
        setClearError('');

        try {
            await api.delete('/office/activity-logs');
            setConfirmClearOpen(false);
            setFilters(blankFilters);
            logsResource.refresh();
        } catch (error) {
            setClearError(error.message);
        } finally {
            setClearBusy(false);
        }
    }

    return (
        <div className="module-page activity-log-page">
            <PageHeader
                action={(
                    <button className="btn danger" disabled={clearBusy || logsResource.loading} onClick={() => setConfirmClearOpen(true)} type="button">
                        Clear logs
                    </button>
                )}
                description="Review office and sales activity captured from data changes across the system."
                eyebrow="System"
                title="Activity Logs"
            />

            <Panel title="Activity history">
                <FilterToolbar
                    filters={[{ key: 'action', label: 'Action', options: actionOptions, value: filters.action }]}
                    onFilterChange={updateFilter}
                    onReset={resetFilters}
                    onSearch={updateSearch}
                    searchPlaceholder="Search user, action, target, or IP"
                    searchValue={filters.search}
                />
                <DataTable
                    columns={[
                        { key: 'createdAt', label: 'Time' },
                        { key: 'actor', label: 'User' },
                        { key: 'action', label: 'Action' },
                        { key: 'target', label: 'Target' },
                        { key: 'changed', label: 'Changed Fields' },
                        { key: 'ipAddress', label: 'IP' },
                    ]}
                    emptyMessage="No activity logs found"
                    error={logsResource.error}
                    loading={logsResource.loading}
                    rows={rows}
                />
                {pagination && (
                    <PaginationBar
                        currentPage={pagination.currentPage}
                        emptyLabel="No activity logs to show"
                        from={pagination.from}
                        lastPage={pagination.lastPage}
                        loading={logsResource.loading}
                        onNext={() => setFilters((current) => ({ ...current, page: pagination.currentPage + 1 }))}
                        onPrevious={() => setFilters((current) => ({ ...current, page: pagination.currentPage - 1 }))}
                        to={pagination.to}
                        total={pagination.total}
                    />
                )}
            </Panel>

            <Modal
                actions={(
                    <>
                        <button className="btn secondary" disabled={clearBusy} onClick={() => setConfirmClearOpen(false)} type="button">Cancel</button>
                        {clearError && <span className="submit-disabled-note">{clearError}</span>}
                        <button className="btn danger" disabled={clearBusy} onClick={clearLogs} type="button">{clearBusy ? 'Clearing...' : 'Clear all logs'}</button>
                    </>
                )}
                busy={clearBusy}
                onClose={() => setConfirmClearOpen(false)}
                open={confirmClearOpen}
                title="Clear activity logs"
            >
                <p className="helper-copy">
                    This permanently removes all activity log records currently stored in the system.
                </p>
            </Modal>
        </div>
    );
}
