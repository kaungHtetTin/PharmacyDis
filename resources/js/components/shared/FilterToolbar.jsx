import Icon from './Icon';

export default function FilterToolbar({
    filters = [
        { label: 'Status', options: ['All', 'Active', 'Pending'] },
        { label: 'Company', options: ['All', 'Company A', 'Company B'] },
        { label: 'Date Range', options: ['All', 'Today', 'This Month'] },
    ],
    onReset,
    onSearch,
    searchPlaceholder = 'Search records',
    showDate = false,
}) {
    return (
        <div className="filter-toolbar">
            <div className="search-box">
                <Icon name="search" size={16} />
                <input aria-label="Search table" onChange={(event) => onSearch?.(event.target.value)} placeholder={searchPlaceholder} />
            </div>
            {filters.map((filter) => (
                <select aria-label={filter.label} key={filter.label} defaultValue="">
                    <option value="" disabled>{filter.label}</option>
                    {filter.options.map((option) => <option key={option}>{option}</option>)}
                </select>
            ))}
            {showDate && <input aria-label="Date range" className="date-filter" type="date" />}
            <button className="btn secondary filter-reset-btn" onClick={onReset} type="button">Reset</button>
        </div>
    );
}
