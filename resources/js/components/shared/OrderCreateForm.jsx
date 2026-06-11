import OrderLineBuilder from './OrderLineBuilder';
import StatusBadge from './StatusBadge';
import { getCompanyCreditStatus, normalizeCreditStatuses } from './OrderCreditGate';

const repsByCompany = {
    'MediLife Co.': ['May Zin'],
    'Zenith Pharma': ['Ko Htet'],
    'Golden Health': ['Nilar'],
    'Company A': ['May Zin'],
    'Company B': ['Ko Htet'],
    'Company C': ['Nilar'],
};

function repsForCompany(company) {
    return repsByCompany[company] || ['May Zin', 'Ko Htet', 'Nilar'];
}

export default function OrderCreateForm({
    blocked = false,
    creditStatuses = [],
    lines = [],
    onCompanyChange,
    selectedCompany,
}) {
    const statuses = normalizeCreditStatuses(creditStatuses);
    const selectedStatus = getCompanyCreditStatus(statuses, selectedCompany || statuses[0]?.company);
    const salesReps = repsForCompany(selectedStatus.company);

    return (
        <div className="order-create-form">
            <section className="order-setup-card">
                <div className="section-heading">
                    <div>
                        <p className="eyebrow">Order setup</p>
                        <h2>Company, credit, and representative</h2>
                    </div>
                </div>

                <div className="order-setup-grid">
                    <label className="form-field order-company-field">
                        <span>Company</span>
                        <select value={selectedStatus.company} onChange={(event) => onCompanyChange?.(event.target.value)}>
                            {statuses.map((row) => <option key={row.company}>{row.company}</option>)}
                        </select>
                    </label>

                    <article className={`order-credit-summary ${blocked ? 'is-blocked' : ''}`}>
                        <div>
                            <span>Credit status</span>
                            <StatusBadge value={selectedStatus.status} />
                        </div>
                        <strong>{blocked ? 'Order creation is blocked for this company' : 'Order creation is allowed for this company'}</strong>
                        <small>{selectedStatus.reason}</small>
                        <small>Outstanding: {selectedStatus.outstanding || '0'}</small>
                    </article>

                    <label className="form-field">
                        <span>Sales representative</span>
                        <select>
                            {salesReps.map((rep) => <option key={rep}>{rep}</option>)}
                        </select>
                    </label>

                    <label className="form-field">
                        <span>Requested delivery date</span>
                        <input type="date" />
                    </label>

                    <label className="form-field order-note-field">
                        <span>Order note</span>
                        <textarea placeholder="Optional warehouse note" rows="3" />
                    </label>
                </div>
            </section>

            <OrderLineBuilder disabled={blocked} lines={lines} />
            <p className="helper-copy">Sales representatives are filtered by the selected company. Blocked company credit disables order submission until finance clears the overdue balance.</p>
        </div>
    );
}
