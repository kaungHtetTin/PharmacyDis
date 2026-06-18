@php
    $formatMoney = fn ($value) => number_format((float) ($value ?? 0));
    $formatDate = fn ($value) => $value ? $value->format('Y-m-d') : '-';
    $printUrl = fn ($paperKey, $print = false) => route('office.invoices.print', ['invoice' => $invoice->id, 'paper' => $paperKey] + ($print ? ['print' => 1] : []));
    $compact = str_starts_with($paper, 'inch-');
@endphp
<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>{{ $invoice->invoice_no }} Print</title>
        @vite(['resources/css/app.css'])
    </head>
    <body class="invoice-print-standalone">
        <div class="print-page-toolbar">
            <div>
                <span>Invoice print</span>
                <strong>{{ $invoice->invoice_no }}</strong>
            </div>
            <nav aria-label="Paper size">
                @foreach ($paperSizes as $key => $size)
                    <a class="{{ $paper === $key ? 'active' : '' }}" href="{{ $printUrl($key) }}">
                        <strong>{{ $size['label'] }}</strong>
                        <small>{{ $size['detail'] }}</small>
                    </a>
                @endforeach
            </nav>
            <button onclick="window.print()" type="button">Print</button>
        </div>

        <main class="invoice-print-area paper-{{ $paper }}">
            <article class="invoice-paper">
                <header class="invoice-print-header">
                    <div class="invoice-print-brand">
                        <span class="invoice-print-mark">PD</span>
                        <div>
                            <span>Paramacy DIS</span>
                            <strong>Invoice to Pharmacy</strong>
                            <small>Distribution system</small>
                        </div>
                    </div>
                    <div class="invoice-print-meta">
                        <strong>{{ $invoice->invoice_no }}</strong>
                        <small>Invoice date: {{ $formatDate($invoice->invoice_date) }}</small>
                        <small>Due date: {{ $formatDate($invoice->due_date) }}</small>
                    </div>
                </header>

                <section class="invoice-print-party">
                    <div>
                        <span>Pharmacy</span>
                        <strong>{{ $invoice->customer?->name ?? '-' }}</strong>
                    </div>
                    <div>
                        <span>Company</span>
                        <strong>{{ $invoice->company?->name ?? '-' }}</strong>
                    </div>
                    <div>
                        <span>Order</span>
                        <strong>{{ $invoice->salesOrder?->order_no ?? '-' }}</strong>
                    </div>
                    <div>
                        <span>Status</span>
                        <strong>{{ str($invoice->status)->replace('_', ' ')->title() }}</strong>
                    </div>
                </section>

                <section class="invoice-print-lines">
                    <div class="invoice-print-line-head">
                        <span>Item</span>
                        @unless ($compact)
                            <span>Unit</span>
                        @endunless
                        <span>Qty</span>
                        <span>FOC</span>
                        <span>Total</span>
                    </div>
                    @forelse ($invoice->items as $item)
                        <div class="invoice-print-line-row">
                            <strong>{{ $item->product?->name ?? 'Product #' . $item->product_id }}</strong>
                            @unless ($compact)
                                <span>{{ $item->unit?->name ?? 'Unit #' . $item->unit_id }}</span>
                            @endunless
                            <span>{{ $item->quantity }}</span>
                            <span>{{ $item->foc_base_unit_quantity ?: '-' }}</span>
                            <strong>{{ $formatMoney($item->line_total) }}</strong>
                        </div>
                    @empty
                        <p class="muted">No invoice items available.</p>
                    @endforelse
                </section>

                <section class="invoice-print-settlement">
                    <div class="invoice-settlement-minor">
                        <span>Total {{ $formatMoney($invoice->total_amount) }}</span>
                        <span>Paid {{ $formatMoney($invoice->paid_amount) }}</span>
                    </div>
                    <div class="invoice-settlement-balance">
                        <span>Balance due</span>
                        <strong>{{ $formatMoney($invoice->balance_amount) }}</strong>
                    </div>
                </section>

                <footer class="invoice-print-footer">
                    <span>Prepared for pharmacy settlement and delivery reference.</span>
                    <strong>Thank you</strong>
                </footer>
            </article>
        </main>

        @if ($autoPrint)
            <script>
                window.addEventListener('load', () => window.print());
            </script>
        @endif
    </body>
</html>
