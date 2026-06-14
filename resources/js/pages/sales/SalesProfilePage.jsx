import FormField from '../../components/shared/FormField';
import PageHeader from '../../components/shared/PageHeader';
import Panel from '../../components/shared/Panel';
import StatusBadge from '../../components/shared/StatusBadge';
import { useAuth } from '../../services/auth.jsx';

export default function SalesProfilePage({ onNavigate }) {
    const { user } = useAuth();
    const representative = user?.sales_representative;
    const assignedCompany = representative?.company;
    const profileFields = [
        { label: 'Name', value: user?.name || '' },
        { label: 'Employee code', value: representative?.employee_code || '' },
        { label: 'Phone number', value: representative?.phone || user?.phone || '' },
        { label: 'Email', value: user?.email || '', type: 'email' },
        { label: 'Region', value: representative?.region || '' },
        { label: 'Profile note', placeholder: 'Delivery area, contact preference, or office note', type: 'textarea' },
    ];

    return (
        <div className="sales-page">
            <PageHeader
                action={(
                    <div className="page-heading-actions">
                        <button className="btn primary" onClick={() => onNavigate?.('dashboard')} type="button">Save profile</button>
                        <button className="btn secondary" onClick={() => onNavigate?.('dashboard')} type="button">Cancel</button>
                    </div>
                )}
                description="Update sales representative contact information and review assigned company access."
                eyebrow="Profile"
                title="Edit profile"
            />

            <Panel eyebrow="Profile" title="Personal information">
                <div className="crud-grid">
                    {profileFields.map((field) => <FormField key={field.label} {...field} />)}
                </div>
            </Panel>

            <Panel eyebrow="Assigned Company" title="Access scope">
                <div className="profile-company-list profile-company-list-wide">
                    {assignedCompany ? (
                        <article>
                            <div>
                                <strong>{assignedCompany.name}</strong>
                                <small>Assigned product catalog</small>
                            </div>
                            <StatusBadge value={representative?.status || 'Active'} />
                        </article>
                    ) : <span className="muted">No assigned company.</span>}
                </div>
            </Panel>
        </div>
    );
}
