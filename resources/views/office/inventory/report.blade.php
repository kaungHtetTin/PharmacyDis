@php
    $formatMoney = fn ($value) => number_format((float) ($value ?? 0));
    $formatQty = fn ($value) => number_format((float) ($value ?? 0));
    $formatDate = fn ($value) => $value ? \Carbon\Carbon::parse($value)->format('d-M-Y') : '-';
    $formatProductQuantity = function ($baseQuantity, $product) use ($formatQty) {
        $remaining = (int) ($baseQuantity ?? 0);
        $units = collect($product?->productUnits ?? [])
            ->filter(fn ($productUnit) => ($productUnit->status ?? 'active') === 'active')
            ->sortByDesc(fn ($productUnit) => (int) ($productUnit->conversion_factor_to_base ?: 1))
            ->values();

        if ($units->isEmpty()) {
            $unit = $product?->baseUnit?->abbreviation ?: $product?->baseUnit?->name;

            return trim($formatQty($remaining) . ' ' . ($unit ?: 'base units'));
        }

        $parts = [];

        foreach ($units as $productUnit) {
            $conversion = max(1, (int) ($productUnit->conversion_factor_to_base ?: 1));
            $quantity = intdiv($remaining, $conversion);

            if ($quantity <= 0 && ! ($conversion === 1 && $parts === [])) {
                continue;
            }

            if ($quantity > 0) {
                $label = $productUnit->unit?->abbreviation ?: $productUnit->unit?->name ?: 'unit';
                $parts[] = $formatQty($quantity) . ' ' . $label;
                $remaining -= $quantity * $conversion;
            }
        }

        if ($remaining > 0) {
            $baseUnit = $units->first(fn ($productUnit) => (int) ($productUnit->conversion_factor_to_base ?: 1) === 1);
            $label = $baseUnit?->unit?->abbreviation ?: $baseUnit?->unit?->name ?: $product?->baseUnit?->abbreviation ?: $product?->baseUnit?->name ?: 'base units';
            $parts[] = $formatQty($remaining) . ' ' . $label;
        }

        return $parts ? implode(', ', $parts) : '0';
    };
    $totalQuantity = $rows->sum('available_base_quantity');
    $totalValue = $rows->sum('stock_value_amount');
@endphp
<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Inventory Report</title>
        <link rel="icon" type="image/png" href="{{ asset('favicon.png') }}">
        @vite(['resources/css/app.css'])
        <style>
            @page { size: A4 landscape; margin: 12mm; }

            :root {
                --inventory-report-paper-width: 273mm;
            }

            body.inventory-report-page {
                color: #172033;
                background: #eef4f4;
                font-family: Inter, "Noto Sans Myanmar", Arial, sans-serif;
            }

            .inventory-report-toolbar {
                position: sticky;
                top: 0;
                z-index: 5;
                display: flex;
                justify-content: space-between;
                align-items: center;
                gap: 12px;
                padding: 10px 14px;
                background: #fff;
                border-bottom: 1px solid #d8e1e1;
            }

            .inventory-report-toolbar strong,
            .inventory-report-toolbar span {
                display: block;
                line-height: 1.2;
            }

            .inventory-report-toolbar span {
                color: #69768a;
                font-size: 11px;
                font-weight: 800;
                text-transform: uppercase;
            }

            .inventory-report-actions {
                display: flex;
                justify-content: flex-end;
                align-items: center;
                gap: 8px;
            }

            .inventory-report-actions button {
                border: 1px solid #0f172a1f;
                border-radius: 6px;
                min-height: 36px;
                padding: 0 12px;
                color: #172033;
                background: #fff;
                font-weight: 800;
            }

            .inventory-report-actions button.primary {
                color: #fff;
                background: #087f74;
                border-color: #087f74;
            }

            .inventory-report-sheet {
                box-sizing: border-box;
                width: min(100%, var(--inventory-report-paper-width));
                margin: 16px auto;
                padding: 18px;
                background: #fff;
                border: 1px solid #d8e1e1;
            }

            .inventory-report-header {
                display: grid;
                grid-template-columns: minmax(0, 1fr) auto;
                gap: 16px;
                align-items: start;
                margin-bottom: 14px;
            }

            .inventory-report-header h1 {
                margin: 0;
                font-size: 22px;
                line-height: 1.15;
            }

            .inventory-report-meta {
                display: grid;
                gap: 3px;
                text-align: right;
                color: #69768a;
                font-size: 11px;
                font-weight: 700;
            }

            .inventory-report-summary {
                display: grid;
                grid-template-columns: repeat(3, minmax(0, 1fr));
                gap: 8px;
                margin-bottom: 14px;
            }

            .inventory-report-summary span {
                display: block;
                border: 1px solid #d8e1e1;
                padding: 8px;
                font-size: 11px;
                font-weight: 800;
            }

            .inventory-report-summary strong {
                display: block;
                margin-top: 3px;
                font-size: 15px;
            }

            .inventory-report-table {
                width: 100%;
                border-collapse: collapse;
                table-layout: fixed;
                font-size: 11px;
            }

            .inventory-report-table th,
            .inventory-report-table td {
                border: 1px solid #cfdada;
                padding: 6px 7px;
                vertical-align: top;
                overflow-wrap: anywhere;
            }

            .inventory-report-table th {
                background: #edf5f4;
                font-size: 10px;
                text-align: left;
                text-transform: uppercase;
            }

            .inventory-report-table .col-no { width: 10mm; }
            .inventory-report-table .col-company { width: 56mm; }
            .inventory-report-table .col-product { width: 78mm; }
            .inventory-report-table .col-qty { width: 34mm; }
            .inventory-report-table .col-expire { width: 30mm; }
            .inventory-report-table .col-value { width: auto; }

            .inventory-report-table .number-cell {
                text-align: right;
                white-space: nowrap;
            }

            .inventory-report-table .date-cell {
                white-space: nowrap;
            }

            .inventory-report-table tfoot td {
                font-weight: 900;
                background: #f7fbfb;
            }

            @media print {
                body.inventory-report-page *,
                body.inventory-report-page *::before,
                body.inventory-report-page *::after {
                    visibility: visible !important;
                }

                body.inventory-report-page {
                    background: #fff;
                }

                .inventory-report-toolbar,
                .inventory-report-toolbar * {
                    display: none !important;
                    visibility: hidden !important;
                }

                .inventory-report-sheet {
                    position: static !important;
                    box-sizing: border-box;
                    width: var(--inventory-report-paper-width);
                    margin: 0;
                    padding: 0;
                    border: 0;
                }

                .inventory-report-header {
                    margin-bottom: 8px;
                }

                .inventory-report-header h1 {
                    font-size: 18px;
                }

                .inventory-report-header p,
                .inventory-report-meta {
                    font-size: 9px;
                }

                .inventory-report-summary {
                    gap: 5px;
                    margin-bottom: 8px;
                }

                .inventory-report-summary span {
                    padding: 5px 6px;
                    font-size: 9px;
                }

                .inventory-report-summary strong {
                    font-size: 12px;
                }

                .inventory-report-table {
                    font-size: 9px;
                }

                .inventory-report-table th,
                .inventory-report-table td {
                    padding: 4px 5px;
                }
            }
        </style>
    </head>
    <body class="inventory-report-page">
        <div class="inventory-report-toolbar">
            <div>
                <span>Inventory report</span>
                <strong>All matching stock rows</strong>
            </div>
            <div class="inventory-report-actions">
                <button class="primary" data-print-report type="button">Save PDF</button>
                <button data-print-report type="button">Print</button>
            </div>
        </div>

        <main class="inventory-report-sheet">
            <header class="inventory-report-header">
                <div>
                    <h1>Inventory Report</h1>
                    <p>All matching inventory rows from the current filters.</p>
                </div>
                <div class="inventory-report-meta">
                    <span>Generated: {{ now()->format('d-M-Y H:i') }}</span>
                    @if (! empty($filterCompany))
                        <span>Company: {{ $filterCompany->name }}</span>
                    @endif
                    @if (! empty($filterWarehouse))
                        <span>Warehouse: {{ $filterWarehouse->name }}</span>
                    @endif
                    @if (! empty($filters['search']))
                        <span>Search: {{ $filters['search'] }}</span>
                    @endif
                    @if (! empty($filters['status']))
                        <span>Status: {{ str_replace('_', ' ', ucfirst($filters['status'])) }}</span>
                    @endif
                </div>
            </header>

            <section class="inventory-report-summary">
                <span>Records<strong>{{ number_format($rows->count()) }}</strong></span>
                <span>Total quantity<strong>{{ $formatQty($totalQuantity) }} base units</strong></span>
                <span>Stock value<strong>{{ $formatMoney($totalValue) }}</strong></span>
            </section>

            <table class="inventory-report-table">
                <colgroup>
                    <col class="col-no">
                    <col class="col-company">
                    <col class="col-product">
                    <col class="col-qty">
                    <col class="col-expire">
                    <col class="col-value">
                </colgroup>
                <thead>
                    <tr>
                        <th>No.</th>
                        <th>Company</th>
                        <th>Product name</th>
                        <th>Qty</th>
                        <th>Expire</th>
                        <th>Stock value</th>
                    </tr>
                </thead>
                <tbody>
                    @forelse ($rows as $row)
                        <tr>
                            <td class="number-cell">{{ $loop->iteration }}</td>
                            <td>{{ $row->company?->name ?? '-' }}</td>
                            <td>{{ $row->product?->name ?? 'Product #' . $row->product_id }}</td>
                            <td class="number-cell">{{ $formatProductQuantity($row->available_base_quantity, $row->product) }}</td>
                            <td class="date-cell">{{ $formatDate($row->nearest_expiry_date) }}</td>
                            <td class="number-cell">{{ $formatMoney($row->stock_value_amount) }}</td>
                        </tr>
                    @empty
                        <tr>
                            <td colspan="6" align="center">No inventory rows match the selected filters.</td>
                        </tr>
                    @endforelse
                </tbody>
                <tfoot>
                    <tr>
                        <td colspan="3" class="number-cell">Total</td>
                        <td class="number-cell">{{ $formatQty($totalQuantity) }} base units</td>
                        <td></td>
                        <td class="number-cell">{{ $formatMoney($totalValue) }}</td>
                    </tr>
                </tfoot>
            </table>
        </main>

        <script>
            document.querySelectorAll('[data-print-report]').forEach((button) => {
                button.addEventListener('click', () => window.print());
            });
        </script>
    </body>
</html>
