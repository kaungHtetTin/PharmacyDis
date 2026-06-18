import { useMemo, useState } from 'react';
import DataTable from '../../components/shared/DataTable';
import FormField from '../../components/shared/FormField';
import Icon from '../../components/shared/Icon';
import Modal from '../../components/shared/Modal';
import PageHeader from '../../components/shared/PageHeader';
import PaginationBar from '../../components/shared/PaginationBar';
import Panel from '../../components/shared/Panel';
import StatusBadge from '../../components/shared/StatusBadge';
import useApiResource from '../../hooks/useApiResource';
import { api } from '../../services/apiClient';
import { useAuth } from '../../services/auth.jsx';

const emptyForm = {
    email: '',
    name: '',
    password: '',
    phone: '',
    role_id: '',
    status: 'active',
};

function titleCase(value) {
    return String(value || '')
        .replace(/[_-]+/g, ' ')
        .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDateTime(value) {
    if (!value) {
        return '-';
    }

    try {
        return new Intl.DateTimeFormat('en', {
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            month: 'short',
            year: 'numeric',
        }).format(new Date(value));
    } catch {
        return String(value).slice(0, 16);
    }
}

function permissionLabel(permission) {
    if (permission === '*') {
        return 'Full access';
    }

    return titleCase(String(permission || '').replace(/^office\./, ''));
}

function buildQuery(filters, page) {
    const params = new URLSearchParams({ page: String(page), per_page: '15' });

    Object.entries(filters).forEach(([key, value]) => {
        if (value) {
            params.set(key, value);
        }
    });

    return params.toString();
}

export default function OfficeUsersPage() {
    const { user: currentUser } = useAuth();
    const [page, setPage] = useState(1);
    const [filters, setFilters] = useState({ role_id: '', search: '', status: '' });
    const [modalOpen, setModalOpen] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [editingUser, setEditingUser] = useState(null);
    const [form, setForm] = useState(emptyForm);
    const [saving, setSaving] = useState(false);
    const [formError, setFormError] = useState('');

    const query = useMemo(() => buildQuery(filters, page), [filters, page]);
    const usersResource = useApiResource(`/office/users?${query}`, { keepPreviousData: true });
    const rolesResource = useApiResource('/office/users/roles');
    const roles = Array.isArray(rolesResource.data) ? rolesResource.data : [];
    const users = usersResource.data?.data || [];

    const rows = users.map((item) => ({
        id: item.id,
        email: item.email,
        lastLogin: formatDateTime(item.last_login_at),
        name: item.name,
        phone: item.phone || '-',
        role: item.role?.display_name || titleCase(item.role?.name),
        status: titleCase(item.status),
        raw: item,
    }));

    function updateFilter(event) {
        const { name, value } = event.target;
        setFilters((current) => ({ ...current, [name]: value }));
        setPage(1);
    }

    function resetFilters() {
        setFilters({ role_id: '', search: '', status: '' });
        setPage(1);
    }

    function openCreateModal() {
        setEditingUser(null);
        setForm(emptyForm);
        setFormError('');
        setModalOpen(true);
    }

    function openEditModal(row) {
        const record = row.raw;

        setEditingUser(record);
        setForm({
            email: record.email || '',
            name: record.name || '',
            password: '',
            phone: record.phone || '',
            role_id: String(record.role_id || ''),
            status: record.status || 'active',
        });
        setFormError('');
        setModalOpen(true);
    }

    function updateForm(event) {
        const { name, value } = event.target;
        setForm((current) => ({ ...current, [name]: value }));
    }

    async function submitForm() {
        setSaving(true);
        setFormError('');

        try {
            const payload = {
                ...form,
                role_id: Number(form.role_id),
            };

            if (editingUser && !payload.password) {
                delete payload.password;
            }

            if (editingUser) {
                await api.put(`/office/users/${editingUser.id}`, payload);
            } else {
                await api.post('/office/users', payload);
            }

            setModalOpen(false);
            usersResource.refresh();
        } catch (error) {
            setFormError(error.message);
        } finally {
            setSaving(false);
        }
    }

    async function deleteUser() {
        if (!deleteTarget) {
            return;
        }

        setSaving(true);
        setFormError('');

        try {
            await api.delete(`/office/users/${deleteTarget.id}`);
            setDeleteTarget(null);
            usersResource.refresh();
        } catch (error) {
            setFormError(error.message);
        } finally {
            setSaving(false);
        }
    }

    return (
        <>
            <div className="office-users-page">
                <PageHeader
                    action={(
                        <button className="btn primary" onClick={openCreateModal} type="button">
                            <Icon name="plus" size={16} />
                            Add user
                        </button>
                    )}
                    description="Manage office admin accounts and assign access by role. Sales representative accounts stay in the Sales Reps module."
                    eyebrow="System"
                    title="Users"
                />

                <Panel eyebrow="Access Control" title="Office user management">
                    <div className="filter-toolbar user-management-filter">
                        <div className="search-box">
                            <Icon name="search" size={16} />
                            <input
                                aria-label="Search users"
                                name="search"
                                onChange={updateFilter}
                                placeholder="Search name, email, or phone"
                                value={filters.search}
                            />
                        </div>
                        <select aria-label="Filter by role" name="role_id" onChange={updateFilter} value={filters.role_id}>
                            <option value="">All roles</option>
                            {roles.map((role) => <option key={role.id} value={role.id}>{role.display_name || titleCase(role.name)}</option>)}
                        </select>
                        <select aria-label="Filter by status" name="status" onChange={updateFilter} value={filters.status}>
                            <option value="">All statuses</option>
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                        </select>
                        <button className="btn secondary filter-reset-btn" onClick={resetFilters} type="button">Reset</button>
                    </div>

                    <DataTable
                        actions={[
                            { label: 'Edit user', onClick: openEditModal },
                            {
                                label: 'Delete user',
                                onClick: (row) => setDeleteTarget(row.raw),
                                shouldShow: (row) => row.id !== currentUser?.id,
                                variant: 'danger',
                            },
                        ]}
                        columns={[
                            { key: 'name', label: 'User' },
                            { key: 'email', label: 'Email' },
                            { key: 'phone', label: 'Phone' },
                            { key: 'role', label: 'Role' },
                            { key: 'lastLogin', label: 'Last Login' },
                            { key: 'status', label: 'Status', type: 'status' },
                        ]}
                        emptyMessage="No office users match this view."
                        error={usersResource.error}
                        loading={usersResource.loading}
                        rows={rows}
                    />

                    <PaginationBar
                        currentPage={usersResource.data?.current_page || 1}
                        from={usersResource.data?.from || 0}
                        lastPage={usersResource.data?.last_page || 1}
                        loading={usersResource.loading}
                        onNext={() => setPage((current) => current + 1)}
                        onPrevious={() => setPage((current) => Math.max(1, current - 1))}
                        to={usersResource.data?.to || 0}
                        total={usersResource.data?.total || 0}
                    />
                </Panel>

                <Panel className="user-role-panel" eyebrow="Roles" title="Permission summary">
                    <div className="user-role-grid">
                        {roles.map((role) => (
                            <article className="role-summary-card" key={role.id}>
                                <div>
                                    <strong>{role.display_name || titleCase(role.name)}</strong>
                                    <StatusBadge value={role.permissions?.includes('*') ? 'Full access' : 'Scoped'} />
                                </div>
                                <p>{role.description || 'Office role'}</p>
                                <div className="permission-pill-list">
                                    {(role.permissions || []).map((permission) => <span key={`${role.id}-${permission}`}>{permissionLabel(permission)}</span>)}
                                </div>
                            </article>
                        ))}
                    </div>
                </Panel>
            </div>

            <Modal
                busy={saving}
                onClose={() => setModalOpen(false)}
                onSubmit={submitForm}
                open={modalOpen}
                submitDisabled={!form.name || !form.email || !form.role_id || (!editingUser && !form.password)}
                submitLabel={editingUser ? 'Save user' : 'Add user'}
                title={editingUser ? 'Edit office user' : 'Add office user'}
            >
                {formError && <span className="error-text">{formError}</span>}
                <div className="crud-grid">
                    <FormField label="Name" name="name" onChange={updateForm} required value={form.name} />
                    <FormField label="Email" name="email" onChange={updateForm} required type="email" value={form.email} />
                    <FormField label="Phone" name="phone" onChange={updateForm} value={form.phone} />
                    <label className="form-field">
                        <span>Role</span>
                        <select name="role_id" onChange={updateForm} required value={form.role_id}>
                            <option disabled value="">Select role</option>
                            {roles.map((role) => <option key={role.id} value={role.id}>{role.display_name || titleCase(role.name)}</option>)}
                        </select>
                    </label>
                    <label className="form-field">
                        <span>Status</span>
                        <select name="status" onChange={updateForm} required value={form.status}>
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                        </select>
                    </label>
                    <FormField
                        helperText={editingUser ? 'Leave blank to keep the current password.' : ''}
                        label={editingUser ? 'New password' : 'Password'}
                        minLength="8"
                        name="password"
                        onChange={updateForm}
                        placeholder={editingUser ? 'Optional password reset' : 'At least 8 characters'}
                        required={!editingUser}
                        type="password"
                        value={form.password}
                    />
                </div>
            </Modal>

            <Modal
                actions={(
                    <>
                        <button className="btn secondary" disabled={saving} onClick={() => setDeleteTarget(null)} type="button">Cancel</button>
                        <button className="btn danger" disabled={saving} onClick={deleteUser} type="button">{saving ? 'Deleting...' : 'Delete user'}</button>
                    </>
                )}
                busy={saving}
                onClose={() => setDeleteTarget(null)}
                open={Boolean(deleteTarget)}
                title="Delete office user"
            >
                {formError && <span className="error-text">{formError}</span>}
                <p className="helper-copy">
                    Delete {deleteTarget?.name}? This removes their office access while keeping historical activity records intact.
                </p>
            </Modal>
        </>
    );
}
