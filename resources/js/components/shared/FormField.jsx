import Icon from './Icon';

export default function FormField({ accept = '', error = '', helperText = '', label, name, onChange, options = [], placeholder, required = false, type = 'text', value = '' }) {
    const fieldClassName = `form-field${error ? ' has-error' : ''}`;
    const valueProps = onChange ? { onChange, value } : { defaultValue: value };

    if (type === 'textarea') {
        return (
            <label className={fieldClassName}>
                <span>{label}</span>
                <textarea name={name} placeholder={placeholder || label} required={required} rows="3" {...valueProps} />
                {error && <small className="field-error">{error}</small>}
            </label>
        );
    }

    if (type === 'select') {
        return (
            <label className={fieldClassName}>
                <span>{label}</span>
                <select name={name} required={required} {...(onChange ? { onChange, value: value || '' } : { defaultValue: value || '' })}>
                    <option value="" disabled>{placeholder || `Select ${label}`}</option>
                    {options.map((option) => <option key={option}>{option}</option>)}
                </select>
                {error && <small className="field-error">{error}</small>}
            </label>
        );
    }

    if (type === 'file') {
        return (
            <div className={fieldClassName}>
                <span>{label}</span>
                <label className="file-upload-control">
                    <input accept={accept} aria-label={label} name={name} onChange={onChange} required={required} type="file" />
                    <span className="file-upload-icon">
                        <Icon name="image" size={20} />
                    </span>
                    <span className="file-upload-copy">
                        <strong>{placeholder || 'Choose product image'}</strong>
                        <small>{helperText || 'JPG or PNG, single primary image'}</small>
                    </span>
                </label>
                {error && <small className="field-error">{error}</small>}
            </div>
        );
    }

    return (
        <label className={fieldClassName}>
            <span>{label}</span>
            <input name={name} placeholder={placeholder || label} required={required} type={type} {...valueProps} />
            {error && <small className="field-error">{error}</small>}
        </label>
    );
}
