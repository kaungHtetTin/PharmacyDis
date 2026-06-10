import StatusBadge from './StatusBadge';

export default function SettingsWorkspace({ creditPolicies = [], permissionMatrix = [], storageSettings = [] }) {
    return (
        <div className="settings-workspace">
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
