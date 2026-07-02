import { useState } from 'react';
import FormField from '../../components/shared/FormField';
import Logo from '../../components/shared/Logo';
import { useAuth } from '../../services/auth.jsx';

export default function OfficeLoginPage({ onLogin }) {
    const { login } = useAuth();
    const [credentials, setCredentials] = useState({
        email: '',
        password: '',
        user_type: 'office',
    });
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);

    function updateField(event) {
        setCredentials((current) => ({ ...current, [event.target.name]: event.target.value }));
    }

    async function submitLogin(event) {
        event.preventDefault();
        setSubmitting(true);
        setError('');

        try {
            await login(credentials);
            onLogin();
        } catch (requestError) {
            setError(requestError.message);
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <main className="sales-login-page">
            <form className="sales-login-card glass" onSubmit={submitLogin}>
                <Logo />
                <div>
                    <p className="eyebrow">Office System</p>
                    <h1>Sign in to operations</h1>
                    <p>Manage master data, stock, sales orders, invoices, payments, and reports.</p>
                </div>
                <div className="crud-grid compact">
                    <FormField label="Email" name="email" onChange={updateField} placeholder="name@company.com" required type="email" value={credentials.email} />
                    <FormField label="Password" name="password" onChange={updateField} placeholder="Enter password" required type="password" value={credentials.password} />
                </div>
                {error && <span className="error-text">{error}</span>}
                <div className="login-actions">
                    <button className="btn primary" disabled={submitting} type="submit">{submitting ? 'Signing in...' : 'Sign in'}</button>
                </div>
            </form>
        </main>
    );
}
