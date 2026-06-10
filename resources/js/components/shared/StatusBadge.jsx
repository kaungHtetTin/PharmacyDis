const statusMap = {
    active: 'success',
    available: 'success',
    approved: 'success',
    current: 'success',
    completed: 'success',
    paid: 'success',
    ready: 'success',
    in_stock: 'success',
    missing_barcode: 'warning',
    missing_commission: 'warning',
    needs_review: 'warning',
    submitted: 'warning',
    pending: 'warning',
    partial_payment: 'warning',
    warning: 'warning',
    low_stock: 'warning',
    near_expiry: 'warning',
    unpaid: 'warning',
    due: 'warning',
    draft: 'neutral',
    inactive: 'neutral',
    all: 'neutral',
    cancelled: 'neutral',
    reserved: 'info',
    delivered: 'info',
    processing: 'info',
    prepared: 'info',
    printed: 'info',
    rejected: 'danger',
    blocked: 'danger',
    critical: 'danger',
    expired: 'danger',
    overdue: 'danger',
    failed: 'danger',
};

export default function StatusBadge({ value }) {
    const key = String(value || 'neutral').toLowerCase().replace(/\s+/g, '_');
    const tone = statusMap[key] || 'neutral';

    return (
        <span className={`status status-${tone}`}>
            <span className="status-dot" />
            {value}
        </span>
    );
}
