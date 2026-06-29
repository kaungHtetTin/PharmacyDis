@php
    $formatMoney = fn ($value) => number_format((float) ($value ?? 0));
    $formatDate = fn ($value) => $value ? $value->format('d-M-Y') : '-';
    $totalAmount = $invoices->sum('total_amount');
    $paidAmount = $invoices->sum('paid_amount');
    $dateFrom = $filters['date_from'] ?? '';
    $dateTo = $filters['date_to'] ?? '';
    $periodLabel = $dateFrom || $dateTo
        ? trim(($dateFrom ?: 'Start') . ' to ' . ($dateTo ?: 'Today'))
        : 'All dates';
@endphp
<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Invoice Report</title>
        <link rel="icon" type="image/png" href="{{ asset('favicon.png') }}">
        @vite(['resources/css/app.css'])
        <style>
            @page { size: A4 landscape; margin: 12mm; }

            :root {
                --invoice-report-paper-width: 273mm;
            }

            body.invoice-report-page {
                color: #172033;
                background: #eef4f4;
                font-family: Inter, "Noto Sans Myanmar", Arial, sans-serif;
            }

            .invoice-report-toolbar {
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

            .invoice-report-toolbar strong,
            .invoice-report-toolbar span {
                display: block;
                line-height: 1.2;
            }

            .invoice-report-toolbar span {
                color: #69768a;
                font-size: 11px;
                font-weight: 800;
                text-transform: uppercase;
            }

            .invoice-report-actions {
                display: flex;
                justify-content: flex-end;
                align-items: center;
                gap: 8px;
            }

            .invoice-report-actions button {
                border: 1px solid #0f172a1f;
                border-radius: 6px;
                min-height: 36px;
                padding: 0 12px;
                color: #172033;
                background: #fff;
                font-weight: 800;
            }

            .invoice-report-actions button.primary {
                color: #fff;
                background: #087f74;
                border-color: #087f74;
            }

            .invoice-report-sheet {
                box-sizing: border-box;
                width: min(100%, var(--invoice-report-paper-width));
                margin: 16px auto;
                padding: 18px;
                background: #fff;
                border: 1px solid #d8e1e1;
            }

            .invoice-report-header {
                display: grid;
                grid-template-columns: minmax(0, 1fr) auto;
                gap: 16px;
                align-items: start;
                margin-bottom: 14px;
            }

            .invoice-report-header h1 {
                margin: 0;
                font-size: 22px;
                line-height: 1.15;
            }

            .invoice-report-meta {
                display: grid;
                gap: 3px;
                text-align: right;
                color: #69768a;
                font-size: 11px;
                font-weight: 700;
            }

            .invoice-report-summary {
                display: grid;
                grid-template-columns: repeat(3, minmax(0, 1fr));
                gap: 8px;
                margin-bottom: 14px;
            }

            .invoice-report-summary span {
                display: block;
                border: 1px solid #d8e1e1;
                padding: 8px;
                font-size: 11px;
                font-weight: 800;
            }

            .invoice-report-summary strong {
                display: block;
                margin-top: 3px;
                font-size: 15px;
            }

            .invoice-report-table {
                width: 100%;
                border-collapse: collapse;
                table-layout: fixed;
                font-size: 11px;
            }

            .invoice-report-table th,
            .invoice-report-table td {
                border: 1px solid #cfdada;
                padding: 6px 7px;
                vertical-align: top;
            }

            .invoice-report-table th {
                background: #edf5f4;
                font-size: 10px;
                text-align: left;
                text-transform: uppercase;
            }

            .invoice-report-table .col-no { width: 9mm; }
            .invoice-report-table .col-date { width: 24mm; }
            .invoice-report-table .col-name { width: 72mm; }
            .invoice-report-table .col-invoice { width: 42mm; }
            .invoice-report-table .col-due { width: 24mm; }
            .invoice-report-table .col-amount { width: 24mm; }
            .invoice-report-table .col-paid { width: 24mm; }
            .invoice-report-table .col-remark { width: 34mm; }

            .invoice-report-table th,
            .invoice-report-table td {
                overflow-wrap: anywhere;
                word-break: normal;
            }

            .invoice-report-table .number-cell {
                text-align: right;
                white-space: nowrap;
            }

            .invoice-report-table .date-cell,
            .invoice-report-table .invoice-cell {
                color: #101828;
                font-weight: 850;
                white-space: nowrap;
            }

            .invoice-report-table .remark-cell {
                font-size: 10px;
                line-height: 1.35;
            }

            .invoice-report-table tfoot td {
                font-weight: 900;
                background: #f7fbfb;
            }

            @media print {
                body.invoice-report-page *,
                body.invoice-report-page *::before,
                body.invoice-report-page *::after {
                    visibility: visible !important;
                }

                body.invoice-report-page {
                    background: #fff;
                }

                .invoice-report-toolbar,
                .invoice-report-toolbar * {
                    display: none !important;
                    visibility: hidden !important;
                }

                .invoice-report-sheet {
                    position: static !important;
                    box-sizing: border-box;
                    width: var(--invoice-report-paper-width);
                    margin: 0;
                    padding: 0;
                    border: 0;
                }

                .invoice-report-header {
                    margin-bottom: 8px;
                }

                .invoice-report-header h1 {
                    font-size: 18px;
                }

                .invoice-report-header p,
                .invoice-report-meta {
                    font-size: 9px;
                }

                .invoice-report-summary {
                    gap: 5px;
                    margin-bottom: 8px;
                }

                .invoice-report-summary span {
                    padding: 5px 6px;
                    font-size: 9px;
                }

                .invoice-report-summary strong {
                    font-size: 12px;
                }

                .invoice-report-table {
                    font-size: 9px;
                }

                .invoice-report-table th,
                .invoice-report-table td {
                    padding: 4px 5px;
                }
            }
        </style>
    </head>
    <body class="invoice-report-page">
        <div class="invoice-report-toolbar">
            <div>
                <span>Invoice report</span>
                <strong>{{ $periodLabel }}</strong>
            </div>
            <div class="invoice-report-actions">
                <button class="primary" data-print-report type="button">Save PDF</button>
                <button data-print-report type="button">Print</button>
            </div>
        </div>

        <main class="invoice-report-sheet">
            <header class="invoice-report-header">
                <div>
                    <h1>Invoice Report</h1>
                    <p>Period: {{ $periodLabel }}</p>
                </div>
                <div class="invoice-report-meta">
                    <span>Generated: {{ now()->format('d-M-Y H:i') }}</span>
                    @if (! empty($filterCompany))
                        <span>Company: {{ $filterCompany->name }}</span>
                    @endif
                    @if (! empty($filters['search']))
                        <span>Search: {{ $filters['search'] }}</span>
                    @endif
                    @if (! empty($filters['status']))
                        <span>Status: {{ ucfirst($filters['status']) }}</span>
                    @endif
                </div>
            </header>

            <section class="invoice-report-summary">
                <span>Records<strong>{{ number_format($invoices->count()) }}</strong></span>
                <span>Total amount<strong>{{ $formatMoney($totalAmount) }}</strong></span>
                <span>Total paid<strong>{{ $formatMoney($paidAmount) }}</strong></span>
            </section>

            <table class="invoice-report-table">
                <colgroup>
                    <col class="col-no">
                    <col class="col-date">
                    <col class="col-name">
                    <col class="col-invoice">
                    <col class="col-due">
                    <col class="col-amount">
                    <col class="col-paid">
                    <col class="col-remark">
                </colgroup>
                <thead>
                    <tr>
                        <th>No.</th>
                        <th>Date</th>
                        <th>Name</th>
                        <th>Invoice No.</th>
                        <th>Due date</th>
                        <th>Amount</th>
                        <th>Paid</th>
                        <th>Remark</th>
                    </tr>
                </thead>
                <tbody>
                    @forelse ($invoices as $invoice)
                        <tr>
                            <td class="number-cell">{{ $loop->iteration }}</td>
                            <td class="date-cell">{{ $formatDate($invoice->invoice_date) }}</td>
                            <td>{{ $invoice->customer?->name ?? '-' }}</td>
                            <td class="invoice-cell">{{ $invoice->invoice_no }}</td>
                            <td class="date-cell">{{ $formatDate($invoice->due_date) }}</td>
                            <td class="number-cell">{{ $formatMoney($invoice->total_amount) }}</td>
                            <td class="number-cell">{{ $formatMoney($invoice->paid_amount) }}</td>
                            <td class="remark-cell">{{ $invoice->remark ?: '-' }}</td>
                        </tr>
                    @empty
                        <tr>
                            <td colspan="8" align="center">No invoices match the selected filters.</td>
                        </tr>
                    @endforelse
                </tbody>
                <tfoot>
                    <tr>
                        <td colspan="5" class="number-cell">Total</td>
                        <td class="number-cell">{{ $formatMoney($totalAmount) }}</td>
                        <td class="number-cell">{{ $formatMoney($paidAmount) }}</td>
                        <td></td>
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
