import StatusBadge from './StatusBadge';

export default function SettingsWorkspace({
    creditPolicies = [],
    invoicePrintError = '',
    invoicePrintLoading = false,
    invoicePrintSaving = false,
    invoicePrintSettings = [],
    invoicePrintSuccess = '',
    onInvoicePrintChange,
    onInvoicePrintSave,
    permissionMatrix = [],
    storageSettings = [],
}) {
    return (
        <div className="settings-workspace">
            {(invoicePrintSettings.length > 0 || invoicePrintLoading || invoicePrintError || onInvoicePrintSave) && (
                <section className="drawer-section">
                    <div className="section-heading-row">
                        <div>
                            <p className="eyebrow">Invoice print parameters</p>
                            <h3>A5 sales invoice</h3>
                        </div>
                        <button
                            className="btn primary"
                            disabled={invoicePrintLoading || invoicePrintSaving}
                            onClick={onInvoicePrintSave}
                            type="button"
                        >
                            {invoicePrintSaving ? 'Saving...' : 'Save invoice settings'}
                        </button>
                    </div>

                    {invoicePrintError && <div className="form-error">{invoicePrintError}</div>}
                    {invoicePrintSuccess && <div className="form-success">{invoicePrintSuccess}</div>}

                    {invoicePrintLoading ? (
                        <span className="muted">Loading invoice parameters...</span>
                    ) : (
                        <div className="invoice-setting-grid">
                            {invoicePrintSettings.map((setting) => (
                                <label className="invoice-setting-card" key={setting.key}>
                                    <span>{setting.label}</span>
                                    <code>{setting.key}</code>
                                    {setting.input_type === 'textarea' ? (
                                        <textarea
                                            onChange={(event) => onInvoicePrintChange?.(setting.key, event.target.value)}
                                            rows={3}
                                            value={setting.value ?? ''}
                                        />
                                    ) : (
                                        <input
                                            min={setting.input_type === 'number' ? '0' : undefined}
                                            onChange={(event) => onInvoicePrintChange?.(setting.key, event.target.value)}
                                            step={setting.input_type === 'number' ? '0.01' : undefined}
                                            type={setting.input_type === 'number' ? 'number' : 'text'}
                                            value={setting.value ?? ''}
                                        />
                                    )}
                                    {setting.help && <small>{setting.help}</small>}
                                </label>
                            ))}
                        </div>
                    )}
                </section>
            )}

            {permissionMatrix.length > 0 && (
                <section className="drawer-section">
                    <p className="eyebrow">Role permission matrix</p>
                    <div className="permission-matrix">
                        <div className="permission-head">
                            <span>Role</span>
                            <span>Inventory</span>
                            <span>Sales</span>
                            <span>Finance</span>
                            <span>Settings</span>
                        </div>
                        {permissionMatrix.map((role) => (
                            <div className="permission-row" key={role.role}>
                                <strong>{role.role}</strong>
                                <span>{role.inventory}</span>
                                <span>{role.sales}</span>
                                <span>{role.finance}</span>
                                <span>{role.settings}</span>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {storageSettings.length > 0 && (
                <section className="drawer-section">
                    <p className="eyebrow">Local file storage</p>
                    <div className="storage-grid">
                        {storageSettings.map((setting) => (
                            <article key={setting.label}>
                                <span>{setting.label}</span>
                                <strong>{setting.value}</strong>
                                <small>{setting.note}</small>
                            </article>
                        ))}
                    </div>
                </section>
            )}

            {creditPolicies.length > 0 && (
                <section className="drawer-section">
                    <p className="eyebrow">Credit policy settings</p>
                    <div className="credit-policy-grid">
                        {creditPolicies.map((policy) => (
                            <article key={policy.label}>
                                <StatusBadge value={policy.status} />
                                <strong>{policy.label}</strong>
                                <small>{policy.rule}</small>
                            </article>
                        ))}
                    </div>
                </section>
            )}
        </div>
    );
}
