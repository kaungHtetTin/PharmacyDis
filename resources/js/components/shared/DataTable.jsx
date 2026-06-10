import { useMemo, useState } from 'react';
import StatusBadge from './StatusBadge';

const statusValues = ['Active', 'Available', 'Approved', 'Blocked', 'Completed', 'Critical', 'Current', 'Delivered', 'Draft', 'Due', 'Expired', 'Inactive', 'Low Stock', 'Near Expiry', 'Overdue', 'Paid', 'Prepared', 'Printed', 'Ready', 'Rejected', 'Reserved', 'Submitted', 'Unpaid', 'Warning'];

function normalizeColumn(column) {
    return typeof column === 'string' ? { key: column, label: column } : column;
}

function readCell(row, column, columnIndex) {
    if (Array.isArray(row)) {
        return row[columnIndex];
    }

    return row[column.key];
}

function renderCell(value, column, columnIndex) {
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

    return columnIndex === 0 ? <strong>{value}</strong> : value;
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
                    {loading && (
                        <tr>
                            <td colSpan={normalizedColumns.length + (actions.length ? 1 : 0)}>
                                <span className="muted">Loading records...</span>
                            </td>
                        </tr>
                    )}
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

                        return (
                            <tr className={onRowClick ? 'clickable-row' : ''} key={key} onClick={() => onRowClick?.(row)}>
                                {normalizedColumns.map((column, index) => (
                                    <td key={`${key}-${column.key}`}>
                                        {renderCell(readCell(row, column, index), column, index)}
                                    </td>
                                ))}
                                {actions.length > 0 && (
                                    <td>
                                        <div className="inline-actions">
                                            {actions.map((action) => (
                                                <button
                                                    className="icon-btn small"
                                                    key={action.label}
                                                    onClick={(event) => {
                                                        event.stopPropagation();
                                                        action.onClick(row);
                                                    }}
                                                    title={action.label}
                                                    type="button"
                                                >
                                                    {action.icon || action.label.slice(0, 1)}
                                                </button>
                                            ))}
                                        </div>
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
