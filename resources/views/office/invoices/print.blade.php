@php
    $settings = $invoiceSettings ?? [];
    $formatMoney = fn ($value) => number_format((float) ($value ?? 0));
    $dateFormat = $settings['date_format'] ?? 'd-M-Y';
    $formatDate = fn ($value) => $value ? $value->format($dateFormat) : '-';
    $taxAmount = (float) ($invoice->tax_amount ?? 0);
    $netTotal = (float) $invoice->total_amount;
    $itemCount = $invoice->items->count();
    $unitGroups = $invoice->items->groupBy(fn ($item) => $item->unit?->name ?? 'Unit');
    $totalQuantity = $unitGroups->map(fn ($items, $unit) => $items->sum('quantity') . ' ' . $unit)->values()->join(', ');
    $saleType = $settings['sale_type_default'] ?? 'Cash';
    $orderNo = $invoice->salesOrder?->order_no ?? '-';
    $faviconUrl = asset('favicon.png');
    $logoUrl = asset('logo.png');
    $remarks = strtr($settings['remarks_template'] ?? '#{sale_type} {time} Based On Sales Order {order_no}.', [
        '{sale_type}' => strtolower($saleType),
        '{time}' => optional($invoice->created_at)->format('h:i A') ?? now()->format('h:i A'),
        '{order_no}' => $orderNo,
    ]);
@endphp
<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>{{ $invoice->invoice_no }} Print</title>
        <link rel="icon" type="image/png" href="{{ $faviconUrl }}">
        @vite(['resources/css/app.css'])
    </head>
    <body class="invoice-print-standalone">
        <div class="print-page-toolbar">
            <div>
                <span>Invoice print</span>
                <strong>{{ $invoice->invoice_no }}</strong>
            </div>
            <span class="print-page-size-label">A5 pharmacy invoice</span>
            <button onclick="window.print()" type="button">Print</button>
        </div>

        <main class="invoice-print-area paper-{{ $paper }}">
            <article class="invoice-paper invoice-classic-paper">
                <table class="invoice-classic-header" width="100%" border="0" cellpadding="4" cellspacing="0">
                    <tr>
                        <td width="18%" align="center">
                            <img class="invoice-classic-logo" src="{{ $logoUrl }}" alt="{{ $settings['company_name'] ?? 'Company logo' }}">
                        </td>
                        <td width="52%">
                            <h3>{{ $settings['company_name'] ?? 'AA MEDICAL PRODUCTS LTD' }}</h3>
                            <small>
                                {{ $settings['company_address'] ?? '-' }}<br>
                                Phone: {{ $settings['company_phone'] ?? '-' }}
                            </small>
                        </td>
                        <td width="30%" align="center">
                            <h3>{{ $settings['document_title'] ?? 'SALES INVOICE' }}</h3>
                            <b>{{ $settings['copy_label'] ?? 'CUSTOMER COPY' }}</b>
                        </td>
                    </tr>
                </table>

                <hr>

                <table class="invoice-classic-info" width="100%" border="0" cellpadding="4">
                    <tr>
                        <td width="50%" valign="top">
                            <b>{{ $settings['sold_to_label'] ?? 'SOLD TO' }}</b><br>
                            Customer Code: {{ $invoice->customer?->code ?? '-' }}<br>
                            Customer Name: {{ $invoice->customer?->name ?? '-' }}<br>
                            Address: {{ $invoice->customer?->address ?? '-' }}<br>
                            Phone: {{ $invoice->customer?->phone ?? '-' }}
                        </td>
                        <td width="50%" valign="top">
                            Invoice No: {{ $invoice->invoice_no }}<br>
                            Invoice Date: {{ $formatDate($invoice->invoice_date) }}<br>
                            <b>Payment Due Date: {{ $formatDate($invoice->due_date) }}</b><br>
                            Sale Type: {{ $saleType }}<br>
                            Order No: {{ $orderNo }}<br>
                            Order Taker: {{ $invoice->salesOrder?->salesRepresentative?->user?->name ?? '-' }}
                        </td>
                    </tr>
                </table>

                <table class="invoice-classic-lines" width="100%" border="1" cellpadding="4" cellspacing="0">
                    <colgroup>
                        <col class="invoice-col-no">
                        <col class="invoice-col-product">
                        <col class="invoice-col-batch">
                        <col class="invoice-col-exp">
                        <col class="invoice-col-qty">
                        <col class="invoice-col-unit">
                        <col class="invoice-col-price">
                        <col class="invoice-col-amount">
                    </colgroup>
                    <thead>
                        <tr>
                            <th>No</th>
                            <th>Product</th>
                            <th>Batch</th>
                            <th>Exp</th>
                            <th>Qty</th>
                            <th>Unit</th>
                            <th>Price</th>
                            <th>Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        @forelse ($invoice->items as $item)
                            @php
                                $batchSummary = $itemBatchSummaries[$item->product_id] ?? ['batch' => '-', 'expiry' => '-'];
                            @endphp
                            <tr>
                                <td align="center">{{ $loop->iteration }}</td>
                                <td class="invoice-cell-product">
                                    {{ $item->product?->name ?? 'Product #' . $item->product_id }}
                                    @if ((int) $item->foc_base_unit_quantity > 0)
                                        <br><small>FOC: {{ $formatMoney($item->foc_base_unit_quantity) }} base units</small>
                                    @endif
                                </td>
                                <td class="invoice-cell-batch">{{ $batchSummary['batch'] }}</td>
                                <td>{{ $batchSummary['expiry'] }}</td>
                                <td align="right">{{ $formatMoney($item->quantity) }}</td>
                                <td>{{ $item->unit?->name ?? '-' }}</td>
                                <td align="right">{{ $formatMoney($item->unit_price) }}</td>
                                <td align="right">{{ $formatMoney($item->line_total) }}</td>
                            </tr>
                        @empty
                            <tr>
                                <td colspan="8" align="center">No invoice items available.</td>
                            </tr>
                        @endforelse
                    </tbody>
                </table>

                <table class="invoice-classic-summary" width="100%" border="0" cellpadding="4">
                    <tr>
                        <td width="55%" valign="top">
                            Total Items: {{ $itemCount }}<br>
                            Total Qty: {{ $totalQuantity ?: '-' }}<br><br>
                            Remarks:<br>
                            {{ $remarks }}
                        </td>
                        <td width="45%" valign="top">
                            <table width="100%" border="1" cellpadding="4" cellspacing="0">
                                <tr>
                                    <td>Total Amount</td>
                                    <td align="right">{{ $formatMoney($invoice->subtotal_amount ?: $invoice->total_amount) }}</td>
                                </tr>
                                <tr>
                                    <td>Discount</td>
                                    <td align="right">{{ $formatMoney($invoice->discount_amount) }}</td>
                                </tr>
                                <tr>
                                    <td>Commercial Tax</td>
                                    <td align="right">{{ $formatMoney($taxAmount) }}</td>
                                </tr>
                                <tr>
                                    <td><b>Net Total</b></td>
                                    <td align="right"><b>{{ $formatMoney($netTotal) }} {{ $settings['currency'] ?? 'MMK' }}</b></td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>

                <table class="invoice-classic-signatures" width="100%" border="0" cellpadding="6">
                    <tr align="center">
                        <td>{{ $settings['prepared_by_label'] ?? 'Prepared By' }}</td>
                        <td>{{ $settings['checked_by_label'] ?? 'Checked By' }}</td>
                        <td>{{ $settings['delivered_by_label'] ?? 'Delivered By' }}</td>
                        <td>{{ $settings['received_by_label'] ?? 'Received By' }}</td>
                    </tr>
                    <tr align="center">
                        <td>________________</td>
                        <td>________________</td>
                        <td>________________</td>
                        <td>________________</td>
                    </tr>
                    <tr align="center">
                        <td>{{ $settings['prepared_by_hint'] ?? 'Name / Date' }}</td>
                        <td>{{ $settings['checked_by_hint'] ?? 'Name / Date' }}</td>
                        <td>{{ $settings['delivered_by_hint'] ?? 'Name / Date' }}</td>
                        <td>{{ $settings['received_by_hint'] ?? 'Name / Signature / Stamp' }}</td>
                    </tr>
                </table>

                <hr>

                <center>
                    <small>{{ $settings['footer_text'] ?? 'Thank you for your business' }}</small>
                </center>
            </article>
        </main>

        @if ($autoPrint)
            <script>
                window.addEventListener('load', () => window.print());
            </script>
        @endif
    </body>
</html>
