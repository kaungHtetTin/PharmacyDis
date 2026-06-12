import { useState } from 'react';
import DataTable from '../../components/shared/DataTable';
import FilterToolbar from '../../components/shared/FilterToolbar';
import PageHeader from '../../components/shared/PageHeader';
import PaginationBar from '../../components/shared/PaginationBar';
import Panel from '../../components/shared/Panel';
import StatusBadge from '../../components/shared/StatusBadge';
import SummaryCard from '../../components/shared/SummaryCard';
import { salesPharmacyDetail } from '../../data/mock/salesPharmacyDetail';

function usePagination(rows, pageSize = 4) {
    const [pageIndex, setPageIndex] = useState(0);
    const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
    const pageStart = pageIndex * pageSize;
    const pageEnd = Math.min(pageStart + pageSize, rows.length);
    const visibleRows = rows.slice(pageStart, pageEnd);

    return {
        pageEnd,
        pageIndex,
        pageStart,
        setPageIndex,
        totalPages,
        visibleRows,
    };
}

function PaginatedHistoryTable({ columns, filters, rows, title }) {
    const pagination = usePagination(rows);

    return (
        <Panel eyebrow="History" title={title}>
            <FilterToolbar filters={filters} searchPlaceholder={`Search ${title.toLowerCase()}`} showDate />
            <DataTable columns={columns} rows={pagination.visibleRows} />
            <PaginationBar
                currentPage={pagination.pageIndex + 1}
                from={rows.length ? pagination.pageStart + 1 : 0}
                lastPage={pagination.totalPages}
                onNext={() => pagination.setPageIndex((page) => Math.min(pagination.totalPages - 1, page + 1))}
                onPrevious={() => pagination.setPageIndex((page) => Math.max(0, page - 1))}
                to={pagination.pageEnd}
                total={rows.length}
            />
        </Panel>
    );
}

export default function SalesPharmacyDetailPage({ onNavigate }) {
    const detail = salesPharmacyDetail;
    const initials = detail.profile.name.split(' ').map((part) => part[0]).join('');

    return (
        <div className="sales-page">
            <PageHeader
                action={(
                    <div className="page-heading-actions">
                        <button className="btn primary" onClick={() => onNavigate?.('new-order')} type="button">Create order</button>
                        <button className="btn secondary" onClick={() => onNavigate?.('pharmacies')} type="button">Back</button>
                    </div>
                )}
                description="Review customer profile, assigned-company credit status, purchase history, and payment history."
                eyebrow="Pharmacy Detail"
                title={detail.profile.name}
            />

            <section className="rep-detail-hero pharmacy-detail-hero glass">
                <div className="rep-avatar">{initials}</div>
                <div>
                    <div className="rep-title-row">
                        <h2>{detail.profile.name}</h2>
                        <StatusBadge value={detail.profile.status} />
                    </div>
                    <p>{detail.profile.owner} / {detail.profile.phone}</p>
                    <p>{detail.profile.township} / {detail.profile.address}</p>
                </div>
                <div className="rep-profile-facts">
                    <span>Assigned company</span>
                    <strong>{detail.profile.company}</strong>
                    <span>Outstanding</span>
                    <strong>{detail.profile.outstanding}</strong>
                    <span>Credit status</span>
                    <strong>{detail.profile.creditStatus}</strong>
                </div>
            </section>

            <div className="summary-grid">
                {detail.metrics.map((metric) => <SummaryCard key={metric.label} {...metric} />)}
            </div>

            <Panel eyebrow="Credit Control" title="Assigned company status">
                <div className="profile-company-list profile-company-list-wide">
                    {detail.creditNotes.map((note) => (
                        <article key={note.label}>
                            <div>
                                <strong>{note.label}</strong>
                                <small>{note.value}</small>
                            </div>
                            <StatusBadge value={note.status} />
                        </article>
                    ))}
                </div>
            </Panel>

            <PaginatedHistoryTable
                columns={detail.purchaseColumns}
                filters={detail.purchaseFilters}
                rows={detail.purchaseRows}
                title="Purchase history"
            />

            <PaginatedHistoryTable
                columns={detail.paymentColumns}
                filters={detail.paymentFilters}
                rows={detail.paymentRows}
                title="Payment history"
            />
        </div>
    );
}
