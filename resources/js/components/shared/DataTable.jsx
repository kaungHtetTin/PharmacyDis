import { useMemo, useState } from 'react';
import Icon from './Icon';
import StatusBadge from './StatusBadge';

const statusValues = ['Active', 'Available', 'Approved', 'Blocked', 'Completed', 'Critical', 'Current', 'Delivered', 'Draft', 'Due', 'Expired', 'Inactive', 'Low Stock', 'Near Expiry', 'Overdue', 'Paid', 'Prepared', 'Printed', 'Ready', 'Rejected', 'Reserved', 'Submitted', 'Unpaid', 'Warning'];
const iconAliases = {
    '+': 'plus',
    '$': 'wallet',
    D: 'trash',
    E: 'edit',
    I: 'receipt',
    P: 'printer',
    S: 'save',
    V: 'eye',
};

function normalizeColumn(column) {
    return typeof column === 'string' ? { key: column, label: column } : column;
}

function readCell(row, column, columnIndex) {
    if (Array.isArray(row)) {
        return row[columnIndex];
    }

    return row[column.key];
}

function formatIsoDateValue(value) {
    if (typeof value !== 'string') {
        return value;
    }

    const text = value.trim();
    const match = text.match(/^(\d{4}-\d{2}-\d{2})(?:[T\s](\d{2}):(\d{2})(?::(\d{2}))?(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?)?$/);

    if (!match) {
        return value;
    }

    const [, datePart, hour = '00', minute = '00', second = '00'] = match;

    if (hour === '00' && minute === '00' && second === '00') {
        return datePart;
    }

    const date = new Date(text);

    if (Number.isNaN(date.getTime())) {
        return datePart;
    }

    return new Intl.DateTimeFormat('en', {
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        month: 'short',
        year: 'numeric',
    }).format(date);
}

function renderCell(value, column, columnIndex, row) {
    if (typeof column.render === 'function') {
        return column.render(row, value);
    }

    if (column.type === 'image') {
        return (
            <span className="table-image-cell">
                {value ? <img alt="" src={value} /> : <Icon name="image" size={18} />}
            </span>
        );
    }

    if (column.type === 'status' || statusValues.includes(value)) {
        return <StatusBadge value={value} />;
    }

    if (column.type === 'money') {
        return <strong>{value}</strong>;
    }

    if (Array.isArray(value)) {
        return (
            <div className="tag-list">
                {value.map((item) => <span key={item}>{item}</span>)}
            </div>
        );
    }

    const displayValue = formatIsoDateValue(value);

    return columnIndex === 0 ? <strong>{displayValue}</strong> : displayValue;
}

function getActionIcon(action) {
    if (iconAliases[action.icon]) {
        return iconAliases[action.icon];
    }

    if (action.icon && /^[a-z]/.test(action.icon)) {
        return action.icon;
    }

    const label = action.label.toLowerCase();

    if (label.includes('view') || label.includes('open') || label.includes('detail')) {
        return 'eye';
    }

    if (label.includes('record payment') || label.includes('payment')) {
        return 'wallet';
    }

    if (label.includes('generate invoice') || label.includes('invoice') || label.includes('receipt')) {
        return 'receipt';
    }

    if (label.includes('print')) {
        return 'printer';
    }

    if (label.includes('delete') || label.includes('remove')) {
        return 'trash';
    }

    if (label.includes('restore')) {
        return 'restore';
    }

    if (label.includes('edit')) {
        return 'edit';
    }

    if (label.includes('save')) {
        return 'save';
    }

    if (label.includes('create order') || label.includes('order')) {
        return 'cart';
    }

    if (label.includes('approve')) {
        return 'check';
    }

    if (label.includes('add') || label.includes('create')) {
        return 'plus';
    }

    return 'file';
}

function RowActions({ actions, row }) {
    const visibleActions = actions.filter((action) => !action.shouldShow || action.shouldShow(row));
    const hasOverflow = visibleActions.length > 3;
    const directActions = hasOverflow ? visibleActions.slice(0, 2) : visibleActions;
    const menuActions = hasOverflow ? visibleActions.slice(2) : [];

    if (!visibleActions.length) {
        return null;
    }

    return (
        <div className="inline-actions">
            {directActions.map((action) => (
                <button
                    aria-label={action.label}
                    className={`row-action-btn ${action.variant === 'danger' ? 'danger' : ''}`}
                    key={action.label}
                    onClick={(event) => {
                        event.stopPropagation();
                        action.onClick?.(row);
                    }}
                    title={action.label}
                    type="button"
                >
                    <Icon name={getActionIcon(action)} size={15} />
                    <span className="sr-only">{action.label}</span>
                </button>
            ))}
            {menuActions.length > 0 && (
                <details className="row-more-menu" onClick={(event) => event.stopPropagation()}>
                    <summary aria-label="More actions" className="row-action-btn row-more-summary" title="More actions">
                        <Icon name="moreHorizontal" size={16} />
                        <span className="sr-only">More actions</span>
                    </summary>
                    <div className="row-more-list">
                        {menuActions.map((action) => (
                            <button
                                className={`row-menu-item ${action.variant === 'danger' ? 'danger' : ''}`}
                                key={action.label}
                                onClick={(event) => {
                                    event.preventDefault();
                                    event.stopPropagation();
                                    event.currentTarget.closest('details')?.removeAttribute('open');
                                    action.onClick?.(row);
                                }}
                                type="button"
                            >
                                <Icon name={getActionIcon(action)} size={14} />
                                {action.label}
                            </button>
                        ))}
                    </div>
                </details>
            )}
        </div>
    );
}

function SkeletonRows({ actions, columns }) {
    return Array.from({ length: 5 }).map((_, rowIndex) => (
        <tr className="skeleton-row" key={`skeleton-${rowIndex}`}>
            {columns.map((column, columnIndex) => (
                <td key={`${column.key}-${rowIndex}`}>
                    <span className={column.type === 'image' ? 'skeleton-thumb' : `skeleton-line ${columnIndex === 0 ? 'wide' : ''}`} />
                </td>
            ))}
            {actions.length > 0 && (
                <td>
                    <span className="skeleton-actions" />
                </td>
            )}
        </tr>
    ));
}

export default function DataTable({
    columns,
    rows,
    actions = [],
    emptyMessage = 'No records found',
    error = '',
    loading = false,
    onRowClick,
}) {
    const normalizedColumns = columns.map(normalizeColumn);
    const [sortKey, setSortKey] = useState(normalizedColumns[0]?.key);
    const [sortDirection, setSortDirection] = useState('asc');

    const visibleRows = useMemo(() => {
        if (!sortKey || !rows.length) {
            return rows;
        }

        return [...rows].sort((first, second) => {
            const firstValue = Array.isArray(first) ? first[0] : first[sortKey];
            const secondValue = Array.isArray(second) ? second[0] : second[sortKey];
            const result = String(firstValue || '').localeCompare(String(secondValue || ''));

            return sortDirection === 'asc' ? result : -result;
        });
    }, [rows, sortDirection, sortKey]);

    function toggleSort(column) {
        if (column.sortable === false) {
            return;
        }

        if (sortKey === column.key) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
            return;
        }

        setSortKey(column.key);
        setSortDirection('asc');
    }

    return (
        <div className="table-wrap">
            <table>
                <thead>
                    <tr>
                        {normalizedColumns.map((column) => (
                            <th key={column.key}>
                                <button className="table-sort" onClick={() => toggleSort(column)} type="button">
                                    {column.label}
                                    {sortKey === column.key && <span>{sortDirection === 'asc' ? 'A-Z' : 'Z-A'}</span>}
                                </button>
                            </th>
                        ))}
                        {actions.length > 0 && <th>Actions</th>}
                    </tr>
                </thead>
                <tbody>
                    {loading && <SkeletonRows actions={actions} columns={normalizedColumns} />}
                    {!loading && error && (
                        <tr>
                            <td colSpan={normalizedColumns.length + (actions.length ? 1 : 0)}>
                                <span className="error-text">{error}</span>
                            </td>
                        </tr>
                    )}
                    {!loading && !error && visibleRows.length === 0 && (
                        <tr>
                            <td colSpan={normalizedColumns.length + (actions.length ? 1 : 0)}>
                                <span className="muted">{emptyMessage}</span>
                            </td>
                        </tr>
                    )}
                    {!loading && !error && visibleRows.map((row) => {
                        const key = Array.isArray(row) ? row.join('-') : row.id;
                        const rowClassName = [
                            onRowClick ? 'clickable-row' : '',
                            !Array.isArray(row) ? row.rowClassName : '',
                        ].filter(Boolean).join(' ');

                        return (
                            <tr className={rowClassName} key={key} onClick={() => onRowClick?.(row)}>
                                {normalizedColumns.map((column, index) => (
                                    <td key={`${key}-${column.key}`}>
                                        {renderCell(readCell(row, column, index), column, index, row)}
                                    </td>
                                ))}
                                {actions.length > 0 && (
                                    <td>
                                        <RowActions actions={actions} row={row} />
                                    </td>
                                )}
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}
