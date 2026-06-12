export default function PaginationBar({
    currentPage = 1,
    from = 0,
    lastPage = 1,
    loading = false,
    onNext,
    onPrevious,
    to = 0,
    total = 0,
    emptyLabel = 'No records to show',
}) {
    const hasRecords = Number(total) > 0;

    return (
        <div className="pagination-bar">
            <span className="pagination-range">
                {hasRecords ? `Showing ${from}-${to} of ${total}` : emptyLabel}
            </span>
            <div className="pagination-controls">
                <button
                    aria-label="Go to previous page"
                    className="pagination-btn"
                    disabled={loading || currentPage <= 1}
                    onClick={onPrevious}
                    type="button"
                >
                    Previous
                </button>
                <span className="pagination-page">Page {currentPage} / {lastPage}</span>
                <button
                    aria-label="Go to next page"
                    className="pagination-btn"
                    disabled={loading || currentPage >= lastPage}
                    onClick={onNext}
                    type="button"
                >
                    Next
                </button>
            </div>
        </div>
    );
}
