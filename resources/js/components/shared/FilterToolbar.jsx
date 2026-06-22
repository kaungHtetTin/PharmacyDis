import { useState } from 'react';
import Icon from './Icon';

export default function FilterToolbar({
    className = '',
    collapsibleSearch = false,
    filters = [
        { label: 'Status', options: ['All', 'Active', 'Pending'] },
        { label: 'Company', options: ['All', 'Company A', 'Company B'] },
        { label: 'Date Range', options: ['All', 'Today', 'This Month'] },
    ],
    onReset,
    onDateFromChange,
    onDateToChange,
    onFilterChange,
    onSearch,
    dateFromValue,
    dateToValue,
    searchValue,
    searchPlaceholder = 'Search records',
    showSearch = true,
    showDate = false,
}) {
    const [searchFocused, setSearchFocused] = useState(false);
    const readOption = (option) => (typeof option === 'object'
        ? { label: option.label, value: option.value ?? option.label }
        : { label: option, value: option });
    const toolbarClassName = [
        'filter-toolbar',
        className,
        collapsibleSearch ? 'has-collapsible-search' : '',
        searchFocused ? 'is-search-focused' : '',
    ].filter(Boolean).join(' ');

    return (
        <div className={toolbarClassName}>
            {showSearch && (
                <div className="search-box">
                    <Icon name="search" size={16} />
                    <input
                        aria-label="Search table"
                        onBlur={() => setSearchFocused(false)}
                        onChange={(event) => onSearch?.(event.target.value)}
                        onFocus={() => setSearchFocused(true)}
                        placeholder={searchPlaceholder}
                        value={searchValue}
                    />
                </div>
            )}
            {filters.map((filter) => (
                <select
                    aria-label={filter.label}
                    key={filter.key || filter.label}
                    onChange={(event) => onFilterChange?.(filter.key || filter.label, event.target.value)}
                    {...(Object.prototype.hasOwnProperty.call(filter, 'value') ? { value: filter.value } : { defaultValue: '' })}
                >
                    <option value="">{filter.placeholder || filter.label}</option>
                    {filter.options.map((option) => {
                        const normalizedOption = readOption(option);

                        return <option key={normalizedOption.value} value={normalizedOption.value}>{normalizedOption.label}</option>;
                    })}
                </select>
            ))}
            {showDate && <input aria-label="Date range" className="date-filter" type="date" />}
            {onDateFromChange && (
                <label className="date-range-filter">
                    <span className="sr-only">From</span>
                    <input
                        aria-label="Date from"
                        className="date-filter"
                        onChange={(event) => onDateFromChange(event.target.value)}
                        type="date"
                        value={dateFromValue || ''}
                    />
                </label>
            )}
            {onDateToChange && (
                <label className="date-range-filter">
                    <span className="sr-only">To</span>
                    <input
                        aria-label="Date to"
                        className="date-filter"
                        onChange={(event) => onDateToChange(event.target.value)}
                        type="date"
                        value={dateToValue || ''}
                    />
                </label>
            )}
            <button className="btn secondary filter-reset-btn" onClick={onReset} type="button">Reset</button>
        </div>
    );
}
