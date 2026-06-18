import FormField from './FormField';
import OrderLineBuilder, { getOrderStockStatus } from './OrderLineBuilder';
import PharmacyStorePicker from './PharmacyStorePicker';
import StatusBadge from './StatusBadge';
import { isBlockedCredit } from './OrderCreditGate';

function titleCase(value) {
    return String(value || '')
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default function SalesOrderCreateForm({
    context,
    customers = [],
    error = '',
    form,
    lines = [],
    onChange,
    onLineChange,
    onPharmacySearchChange,
    onSubmit,
    pharmacyLoading = false,
    pharmacySearch = '',
    productOptions = [],
    stockError = '',
    stockLoading = false,
    stockRows = [],
    submitting = false,
    success = '',
}) {
    const selectedCustomer = customers.find((customer) => String(customer.id) === String(form?.customer_id));
    const selectedCredit = selectedCustomer?.credit_statuses?.[0];
    const creditStatus = selectedCredit ? titleCase(selectedCredit.credit_status) : context?.creditStatus || 'Ready';
    const blocked = isBlockedCredit(creditStatus);
    const stockStatus = getOrderStockStatus(lines, productOptions, stockRows);
    const stockBlocked = stockStatus.hasDemand && (stockLoading || Boolean(stockError) || stockStatus.hasShortage);
    const stockBlockedReason = stockLoading
        ? 'Checking available stock...'
        : stockError
            ? stockError
            : stockStatus.hasShortage
                ? 'Some order quantities are higher than current available stock.'
                : '';

    return (
        <form className="order-create-form sales-order-create-form" onSubmit={onSubmit}>
            <section className="order-setup-card">
                <div className="section-heading">
                    <div>
                        <p className="eyebrow">Order setup</p>
                        <h2>Assigned account and company credit</h2>
                    </div>
                </div>

                <div className="sales-order-context-grid">
                    <article>
                        <span>Sales representative</span>
                        <strong>{context?.representative || 'Signed-in representative'}</strong>
                        <small>{context?.region || 'Assigned territory'}</small>
                    </article>
                    <article>
                        <span>Assigned company</span>
                        <strong>{context?.company || 'Assigned company'}</strong>
                        <small>Product list is limited to this company.</small>
                    </article>
                    <article className={`order-credit-summary ${blocked ? 'is-blocked' : ''}`}>
                        <div>
                            <span>Company credit</span>
                            <StatusBadge value={creditStatus} />
                        </div>
                        <strong>{blocked ? 'Order creation is blocked' : 'Order creation is allowed'}</strong>
                        <small>{selectedCredit?.reason || context?.creditReason || 'No overdue balance for this company.'}</small>
                        <small>Outstanding: {Number(selectedCredit?.outstanding_balance || 0).toLocaleString()}</small>
                    </article>
                    <PharmacyStorePicker
                        customers={customers}
                        disabled={submitting}
                        loading={pharmacyLoading}
                        onChange={onChange}
                        onSearchChange={onPharmacySearchChange}
                        searchValue={pharmacySearch}
                        value={form?.customer_id || ''}
                    />
                    <FormField
                        label="Requested delivery date"
                        name="requested_delivery_date"
                        onChange={onChange}
                        type="date"
                        value={form?.requested_delivery_date || ''}
                    />
                    <label className="form-field sales-order-note">
                        <span>Order note</span>
                        <textarea disabled={blocked || submitting} name="note" onChange={onChange} placeholder="Optional note for office approval or warehouse" rows="3" value={form?.note || ''} />
                    </label>
                </div>
            </section>

            <OrderLineBuilder
                allowFallback={false}
                disabled={blocked || submitting}
                lines={lines}
                onChange={onLineChange}
                productOptions={productOptions}
                showStockAvailability
                stockError={stockError}
                stockLoading={stockLoading}
                stockRows={stockRows}
                value={lines}
            />
            {error && <span className="error-text">{error}</span>}
            {success && <span className="success-text">{success}</span>}
            {stockBlockedReason && <span className={stockStatus.hasShortage || stockError ? 'error-text' : 'muted'}>{stockBlockedReason}</span>}
            <div className="order-submit-row">
                <p className="helper-copy">
                    Company and sales representative are fixed by the signed-in sales account. Stock availability includes ordered and FOC base quantities.
                </p>
                <button className="btn primary" disabled={blocked || stockBlocked || submitting} type="submit">
                    {submitting ? 'Submitting order...' : 'Submit order'}
                </button>
            </div>
        </form>
    );
}
