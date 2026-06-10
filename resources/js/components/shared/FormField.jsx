export default function FormField({ error = '', label, options = [], placeholder, type = 'text', value = '' }) {
    if (type === 'textarea') {
        return (
            <label className="form-field">
                <span>{label}</span>
                <textarea placeholder={placeholder || label} rows="3" defaultValue={value} />
                {error && <small className="field-error">{error}</small>}
            </label>
        );
    }

    if (type === 'select') {
        return (
            <label className="form-field">
                <span>{label}</span>
                <select defaultValue={value || ''}>
                    <option value="" disabled>{placeholder || `Select ${label}`}</option>
                    {options.map((option) => <option key={option}>{option}</option>)}
                </select>
                {error && <small className="field-error">{error}</small>}
            </label>
        );
    }

    return (
        <label className="form-field">
            <span>{label}</span>
            <input defaultValue={value} placeholder={placeholder || label} type={type} />
            {error && <small className="field-error">{error}</small>}
        </label>
    );
}
