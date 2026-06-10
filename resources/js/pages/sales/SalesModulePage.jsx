import { useState } from 'react';
import DataTable from '../../components/shared/DataTable';
import Drawer from '../../components/shared/Drawer';
import FilterToolbar from '../../components/shared/FilterToolbar';
import FormField from '../../components/shared/FormField';
import Modal from '../../components/shared/Modal';
import PageHeader from '../../components/shared/PageHeader';
import Panel from '../../components/shared/Panel';
import SalesWorkspacePreview from '../../components/shared/SalesWorkspacePreview';
import SummaryCard from '../../components/shared/SummaryCard';
import Tabs from '../../components/shared/Tabs';
import { salesModules } from '../../data/salesModules';

function SalesDetails({ record, screen }) {
    const tabs = screen.tabs?.map((tab) => ({
        key: tab.key,
        label: tab.label,
        content: (
            <div className="line-list">
                {tab.lines.map((line) => <span key={line}>{line}</span>)}
            </div>
        ),
    }));

    return (
        <div className="detail-stack">
            <div className="detail-row">
                <span>Selected record</span>
                <strong>{record?.name || record?.product || record?.order || record?.metric || 'Review record'}</strong>
            </div>
            {screen.drawerSections?.map((section) => (
                <section className="drawer-section" key={section.title}>
                    <p className="eyebrow">{section.title}</p>
                    <div className="line-list">
                        {section.items.map((item) => <span key={item}>{item}</span>)}
                    </div>
                </section>
            ))}
            <SalesWorkspacePreview record={record} screen={screen} />
            {tabs && <Tabs tabs={tabs} />}
        </div>
    );
}

export default function SalesModulePage({ pageKey }) {
    const screen = salesModules[pageKey] || salesModules.products;
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedRecord, setSelectedRecord] = useState(screen.rows[0]);

    return (
        <div className="sales-page">
            <PageHeader
                action={<button className="btn primary" onClick={() => setModalOpen(true)} type="button">{screen.primaryAction}</button>}
                description={screen.description}
                eyebrow={screen.eyebrow}
                title={screen.title}
            />

            {screen.summaries && (
                <div className="summary-grid">
                    {screen.summaries.map((summary) => <SummaryCard key={summary.label} {...summary} />)}
                </div>
            )}

            {(screen.productCards || screen.orderBuilder || screen.infoCards || screen.timeline) && (
                <Panel eyebrow="Mobile Preview" title={screen.previewTitle || 'Sales workspace'}>
                    <SalesWorkspacePreview screen={screen} />
                </Panel>
            )}

            <Panel eyebrow="Mobile Workspace" title={`${screen.title} Review`}>
                <FilterToolbar filters={screen.filters} searchPlaceholder={screen.searchPlaceholder || 'Search assigned records'} showDate={screen.showDate} />
                <DataTable
                    columns={screen.columns}
                    onRowClick={(record) => { setSelectedRecord(record); setDrawerOpen(true); }}
                    rows={screen.rows}
                />
            </Panel>

            <div className="state-grid">
                <article><strong>Empty</strong><small>No assigned records</small></article>
                <article><strong>Loading</strong><small>Field network state</small></article>
                <article><strong>Error</strong><small>Retry message support</small></article>
            </div>

            <Modal
                open={modalOpen}
                onClose={() => setModalOpen(false)}
                onSubmit={() => setModalOpen(false)}
                title={`${screen.primaryAction} Form`}
            >
                <div className="crud-grid">
                    {(screen.formFields || [
                        { label: 'Search customer' },
                        { label: 'Search product' },
                        { label: 'Quantity', type: 'number' },
                        { label: 'Unit', type: 'select', options: ['Box', 'Card', 'Bottle'] },
                    ]).map((field) => <FormField key={field.label} {...field} />)}
                </div>
            </Modal>

            <Drawer
                actions={<button className="btn primary" onClick={() => setDrawerOpen(false)} type="button">Done</button>}
                eyebrow={`${screen.title} Detail`}
                open={drawerOpen}
                onClose={() => setDrawerOpen(false)}
                title={selectedRecord?.name || selectedRecord?.product || selectedRecord?.order || selectedRecord?.metric || screen.title}
            >
                <SalesDetails record={selectedRecord} screen={screen} />
            </Drawer>
        </div>
    );
}
