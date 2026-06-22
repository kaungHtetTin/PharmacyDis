import { mapInvoices } from './screenAdapters';

const generatedInvoiceRowsKey = 'pharmacy_generated_invoice_rows';

function normalizeInvoiceResponse(response) {
    return response?.data || response;
}

export function readGeneratedInvoiceRows() {
    try {
        return JSON.parse(window.sessionStorage.getItem(generatedInvoiceRowsKey) || '[]');
    } catch (error) {
        return [];
    }
}

export function rememberGeneratedInvoice(response) {
    const invoice = normalizeInvoiceResponse(response);
    const [row] = mapInvoices({ data: [invoice] });

    if (!row?.id) {
        return [];
    }

    const existingRows = readGeneratedInvoiceRows();
    const nextRows = [
        row,
        ...existingRows.filter((existingRow) => String(existingRow.id) !== String(row.id)),
    ].slice(0, 25);

    window.sessionStorage.setItem(generatedInvoiceRowsKey, JSON.stringify(nextRows));

    return nextRows;
}

export function mergeGeneratedInvoiceRows(rows = []) {
    const generatedRows = readGeneratedInvoiceRows();
    const liveIds = new Set(rows.map((row) => String(row.id)));

    return [
        ...generatedRows.filter((row) => !liveIds.has(String(row.id))),
        ...rows,
    ];
}
