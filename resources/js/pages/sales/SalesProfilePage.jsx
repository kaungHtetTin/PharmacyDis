import FormField from '../../components/shared/FormField';
import PageHeader from '../../components/shared/PageHeader';
import Panel from '../../components/shared/Panel';
import StatusBadge from '../../components/shared/StatusBadge';
import { assignedCompanies } from '../../data/mock/salesDashboard';

const profileFields = [
    { label: 'Name', value: 'May Zin' },
    { label: 'Employee code', value: 'SR-001' },
    { label: 'Phone number', value: '09 450 000 001' },
    { label: 'Email', value: 'mayzin@example.com', type: 'email' },
    { label: 'Region', value: 'Yangon North' },
    { label: 'Profile note', placeholder: 'Delivery area, contact preference, or office note', type: 'textarea' },
];

export default function SalesProfilePage({ onNavigate }) {
    const assignedCompany = assignedCompanies[0];

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
                    <article>
                        <div>
                            <strong>{assignedCompany.company}</strong>
                            <small>{assignedCompany.products} / {assignedCompany.orders} orders this month</small>
                        </div>
                        <StatusBadge value={assignedCompany.status} />
                    </article>
                </div>
            </Panel>
        </div>
    );
}
