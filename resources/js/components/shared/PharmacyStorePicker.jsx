import { useEffect, useMemo, useRef, useState } from 'react';
import Icon from './Icon';
import StatusBadge from './StatusBadge';

function getCreditStatus(customer) {
    const value = customer?.credit_statuses?.[0]?.credit_status || customer?.creditStatus || 'active';

    return String(value)
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatMeta(customer) {
    return [
        customer?.code,
        customer?.owner_name || customer?.owner,
        customer?.phone,
        customer?.township || customer?.city,
    ].filter(Boolean).join(' / ');
}

export default function PharmacyStorePicker({
    customers = [],
    disabled = false,
    loading = false,
    name = 'customer_id',
    onChange,
    onSearchChange,
    searchValue = '',
    value = '',
}) {
    const [open, setOpen] = useState(false);
    const [activeIndex, setActiveIndex] = useState(0);
    const pickerRef = useRef(null);
    const selectedCustomer = useMemo(
        () => customers.find((customer) => String(customer.id) === String(value)),
        [customers, value],
    );
    const visibleCustomers = customers.slice(0, 30);

    useEffect(() => {
        setActiveIndex(0);
    }, [searchValue, customers.length]);

    useEffect(() => {
        function closeOnOutsideClick(event) {
            if (pickerRef.current && !pickerRef.current.contains(event.target)) {
                setOpen(false);
            }
        }

        document.addEventListener('mousedown', closeOnOutsideClick);

        return () => document.removeEventListener('mousedown', closeOnOutsideClick);
    }, []);

    function selectCustomer(customer) {
        onChange?.({ target: { name, value: String(customer.id) } });
        onSearchChange?.(customer.name || '');
        setOpen(false);
    }

    function clearSelection() {
        onChange?.({ target: { name, value: '' } });
        onSearchChange?.('');
        setOpen(true);
    }

    function handleInputChange(event) {
        onSearchChange?.(event.target.value);
        if (value) {
            onChange?.({ target: { name, value: '' } });
        }
        setOpen(true);
    }

    function handleKeyDown(event) {
        if (disabled) {
            return;
        }

        if (event.key === 'ArrowDown') {
            event.preventDefault();
            setOpen(true);
            setActiveIndex((index) => Math.min(index + 1, Math.max(visibleCustomers.length - 1, 0)));
        }

        if (event.key === 'ArrowUp') {
            event.preventDefault();
            setActiveIndex((index) => Math.max(index - 1, 0));
        }

        if (event.key === 'Enter' && open && visibleCustomers[activeIndex]) {
            event.preventDefault();
            selectCustomer(visibleCustomers[activeIndex]);
        }

        if (event.key === 'Escape') {
            setOpen(false);
        }
    }

    return (
        <div className="form-field pharmacy-store-picker" ref={pickerRef}>
            <span>Pharmacy</span>
            <div className={`pharmacy-picker-control ${open ? 'is-open' : ''} ${disabled ? 'is-disabled' : ''}`}>
                <Icon name="search" size={17} />
                <input
                    aria-autocomplete="list"
                    aria-controls="pharmacy-store-options"
                    aria-expanded={open}
                    autoComplete="off"
                    disabled={disabled}
                    name={`${name}_search`}
                    onChange={handleInputChange}
                    onFocus={() => setOpen(true)}
                    onKeyDown={handleKeyDown}
                    placeholder="Search pharmacy, owner, phone, or code"
                    role="combobox"
                    value={searchValue}
                />
                {value && (
                    <button aria-label="Clear selected pharmacy" className="pharmacy-picker-clear" disabled={disabled} onClick={clearSelection} type="button">
                        <Icon name="close" size={15} />
                    </button>
                )}
            </div>

            {selectedCustomer && (
                <div className="selected-pharmacy-chip">
                    <span>
                        <strong>{selectedCustomer.name}</strong>
                        <small>{formatMeta(selectedCustomer) || 'Selected pharmacy'}</small>
                    </span>
                    <StatusBadge value={getCreditStatus(selectedCustomer)} />
                </div>
            )}

            {open && !disabled && (
                <div className="pharmacy-picker-menu" id="pharmacy-store-options" role="listbox">
                    {loading && <div className="pharmacy-picker-empty">Loading pharmacies...</div>}
                    {!loading && visibleCustomers.length === 0 && (
                        <div className="pharmacy-picker-empty">
                            {searchValue.trim() ? 'No pharmacies found' : 'Search to find pharmacy'}
                        </div>
                    )}
                    {!loading && visibleCustomers.map((customer, index) => {
                        const selected = String(customer.id) === String(value);

                        return (
                            <button
                                aria-selected={selected}
                                className={`pharmacy-picker-option ${index === activeIndex ? 'is-active' : ''}`}
                                key={customer.id}
                                onClick={() => selectCustomer(customer)}
                                role="option"
                                type="button"
                            >
                                <span className="pharmacy-picker-main">
                                    <strong>{customer.name}</strong>
                                    <small>{formatMeta(customer) || 'No contact details'}</small>
                                </span>
                                <span className="pharmacy-picker-side">
                                    <StatusBadge value={getCreditStatus(customer)} />
                                    {selected && <Icon name="check" size={16} />}
                                </span>
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
