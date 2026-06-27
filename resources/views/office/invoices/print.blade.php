@php
    $settings = $invoiceSettings ?? [];
    $formatMoney = fn ($value) => number_format((float) ($value ?? 0));
    $dateFormat = $settings['date_format'] ?? 'd-M-Y';
    $formatDate = fn ($value) => $value ? $value->format($dateFormat) : '-';
    $taxAmount = (float) ($invoice->tax_amount ?? 0);
    $netTotal = (float) $invoice->total_amount;
    $orderNo = $invoice->salesOrder?->order_no ?? '-';
    $faviconUrl = asset('favicon.png');
    $publicShareUrl = $shareUrl ?? route('public.invoices.show', $invoice);
    $salesRepresentative = $invoice->salesRepresentative ?? $invoice->salesOrder?->salesRepresentative;
    $representativeName = $salesRepresentative?->user?->name ?? '-';
    $representativePhone = $salesRepresentative?->phone ?: $salesRepresentative?->user?->phone;
    $representativeLabel = trim($representativeName . ($representativePhone ? ' . ' . $representativePhone : ''));
    $saleType = ucfirst($invoice->sale_type ?? 'cash');
    $remarks = trim($invoice->remark ?? '');
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
            <div class="print-page-title">
                <span>Invoice print</span>
                <strong>{{ $invoice->invoice_no }}</strong>
            </div>
            <span class="print-page-size-label">A5 pharmacy invoice</span>
            <div class="print-page-actions">
                <button data-share-url="{{ $publicShareUrl }}" id="copy-invoice-link" type="button">Copy link</button>
                <button onclick="window.print()" type="button">Save PDF</button>
                <button onclick="window.print()" type="button">Print</button>
            </div>
        </div>

        <main class="invoice-print-area paper-{{ $paper }}">
            <article class="invoice-paper invoice-classic-paper">
                <table class="invoice-classic-header" width="100%" border="0" cellpadding="4" cellspacing="0">
                    <tr>
                        <td width="38%" valign="top">
                            <h3 class="invoice-document-title">{{ $settings['document_title'] ?? 'SALES INVOICE' }}</h3>
                            <strong class="invoice-medicine-company">{{ $invoice->company?->name ?? '-' }}</strong>
                        </td>
                        <td width="62%" align="right" valign="top">
                            <h3>{{ $settings['company_name'] ?? 'AA MEDICAL PRODUCTS LTD' }}</h3>
                            <small>
                                {{ $settings['company_address'] ?? '-' }}<br>
                                Phone: {{ $settings['company_phone'] ?? '-' }}
                            </small>
                        </td>
                    </tr>
                </table>

                <table class="invoice-classic-info" width="100%" border="0" cellpadding="4">
                    <tr>
                        <td width="50%" valign="top">
                            <b>{{ $settings['sold_to_label'] ?? 'SOLD TO' }}</b><br>
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
                            MR/ MSR: {{ $representativeLabel ?: '-' }}
                        </td>
                    </tr>
                </table>

                <table class="invoice-classic-lines" width="100%" border="1" cellpadding="4" cellspacing="0">
                    <colgroup>
                        <col class="invoice-col-no">
                        <col class="invoice-col-product">
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
                                <td>{{ $loop->iteration }}</td>
                                <td class="invoice-cell-product">
                                    {{ $item->product?->name ?? 'Product #' . $item->product_id }}
                                    @if ((int) $item->foc_base_unit_quantity > 0)
                                        <br><small>FOC: {{ $formatMoney($item->foc_base_unit_quantity) }} base units</small>
                                    @endif
                                </td>
                                <td>{{ $batchSummary['expiry'] }}</td>
                                <td>{{ $formatMoney($item->quantity) }}</td>
                                <td>{{ $item->unit?->name ?? '-' }}</td>
                                <td>{{ $formatMoney($item->unit_price) }}</td>
                                <td>{{ $formatMoney($item->line_total) }}</td>
                            </tr>
                        @empty
                            <tr>
                                <td colspan="7" align="center">No invoice items available.</td>
                            </tr>
                        @endforelse
                    </tbody>
                </table>

                <table class="invoice-classic-summary" width="100%" border="0" cellpadding="4">
                    <tr>
                        <td width="55%" valign="top"></td>
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
                        <td>Authorized By</td>
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
                </table>

                <div class="invoice-classic-remarks">
                    <b>Remarks:</b>
                    <div>{{ $remarks ?: ' ' }}</div>
                </div>

                <hr>

                <center>
                    <small>{{ $settings['footer_text'] ?? 'Thank you for your business' }}</small>
                </center>
            </article>
        </main>

        <script>
            (() => {
                const copyButton = document.getElementById('copy-invoice-link');

                if (!copyButton) {
                    return;
                }

                const resetLabel = () => {
                    copyButton.textContent = 'Copy link';
                };

                copyButton.addEventListener('click', async () => {
                    const shareUrl = copyButton.dataset.shareUrl || window.location.href;

                    try {
                        if (navigator.clipboard?.writeText) {
                            await navigator.clipboard.writeText(shareUrl);
                        } else {
                            const input = document.createElement('input');
                            input.value = shareUrl;
                            input.setAttribute('readonly', 'readonly');
                            input.style.position = 'fixed';
                            input.style.opacity = '0';
                            document.body.appendChild(input);
                            input.select();
                            document.execCommand('copy');
                            document.body.removeChild(input);
                        }

                        copyButton.textContent = 'Copied';
                        window.setTimeout(resetLabel, 1800);
                    } catch (error) {
                        copyButton.textContent = 'Copy failed';
                        window.setTimeout(resetLabel, 1800);
                    }
                });
            })();
        </script>

        @if ($autoPrint)
            <script>
                window.addEventListener('load', () => window.print());
            </script>
        @endif
    </body>
</html>
