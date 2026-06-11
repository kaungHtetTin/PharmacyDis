import StatusBadge from './StatusBadge';

export const fallbackCompanyCreditStatuses = [
    { company: 'MediLife Co.', status: 'Blocked', reason: 'INV-1004 overdue by 32 days', outstanding: '320,000' },
    { company: 'Zenith Pharma', status: 'Current', reason: 'No overdue balance', outstanding: '0' },
    { company: 'Golden Health', status: 'Warning', reason: 'Payment due this week', outstanding: '85,000' },
];

export function normalizeCreditStatuses(rows = []) {
    return rows.length ? rows : fallbackCompanyCreditStatuses;
}

export function getCompanyCreditStatus(rows = [], company = '') {
    const statuses = normalizeCreditStatuses(rows);

    return statuses.find((row) => row.company === company) || statuses[0];
}

export function isBlockedCredit(status = '') {
    return String(status).toLowerCase().includes('blocked');
}

export default function OrderCreditGate({ creditStatuses = [], onCompanyChange, selectedCompany }) {
    const statuses = normalizeCreditStatuses(creditStatuses);
    const selectedStatus = getCompanyCreditStatus(statuses, selectedCompany || statuses[0]?.company);
    const blocked = isBlockedCredit(selectedStatus?.status);

    return (
        <section className={`order-credit-gate ${blocked ? 'is-blocked' : ''}`}>
            <label className="form-field">
                <span>Company</span>
                <select value={selectedStatus.company} onChange={(event) => onCompanyChange?.(event.target.value)}>
                    {statuses.map((row) => <option key={row.company}>{row.company}</option>)}
                </select>
            </label>
            <article>
                <div>
                    <span>Credit status</span>
                    <StatusBadge value={selectedStatus.status} />
                </div>
                <strong>{blocked ? 'Order creation is blocked for this company' : 'Order creation is allowed for this company'}</strong>
                <small>{selectedStatus.reason}</small>
                <small>Outstanding: {selectedStatus.outstanding || '0'}</small>
            </article>
        </section>
    );
}
