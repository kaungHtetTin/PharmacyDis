import Icon from './Icon';

export default function FilterToolbar({
    filters = [
        { label: 'Status', options: ['All', 'Active', 'Pending'] },
        { label: 'Company', options: ['All', 'Company A', 'Company B'] },
        { label: 'Date Range', options: ['All', 'Today', 'This Month'] },
    ],
    onReset,
    onFilterChange,
    onSearch,
    searchValue,
    searchPlaceholder = 'Search records',
    showDate = false,
}) {
    const readOption = (option) => (typeof option === 'object'
        ? { label: option.label, value: option.value ?? option.label }
        : { label: option, value: option });

    return (
        <div className="filter-toolbar">
            <div className="search-box">
                <Icon name="search" size={16} />
                <input
                    aria-label="Search table"
                    onChange={(event) => onSearch?.(event.target.value)}
                    placeholder={searchPlaceholder}
                    value={searchValue}
                />
            </div>
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
            <button className="btn secondary filter-reset-btn" onClick={onReset} type="button">Reset</button>
        </div>
    );
}
