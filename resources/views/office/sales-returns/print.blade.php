@php
    $money = fn ($value) => number_format((float) ($value ?? 0), 2);
@endphp
<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>{{ $salesReturn->credit_note_no ?: $salesReturn->return_no }}</title>
    @vite(['resources/css/app.css'])
</head>
<body class="invoice-print-standalone">
    <div class="print-page-toolbar">
        <div class="print-page-title"><span>Return / credit receipt</span><strong>{{ $salesReturn->credit_note_no ?: $salesReturn->return_no }}</strong></div>
        <div class="print-page-actions"><button onclick="window.print()" type="button">Print / Save PDF</button></div>
    </div>
    <main class="invoice-print-area paper-a5">
        <article class="invoice-paper invoice-classic-paper">
            <h2>SALES RETURN / CREDIT NOTE</h2>
            <table class="invoice-classic-info" width="100%" border="0" cellpadding="4">
                <tr>
                    <td>Customer: <b>{{ $salesReturn->customer?->name ?? '-' }}</b><br>Company: {{ $salesReturn->company?->name ?? '-' }}<br>Warehouse: {{ $salesReturn->warehouse?->name ?? '-' }}</td>
                    <td>Return: {{ $salesReturn->return_no }}<br>Credit note: {{ $salesReturn->credit_note_no ?: '-' }}<br>Date: {{ optional($salesReturn->return_date)->format('d-M-Y') }}<br>Invoice: {{ $salesReturn->invoice?->invoice_no ?? '-' }}<br>Order: {{ $salesReturn->salesOrder?->order_no ?? '-' }}</td>
                </tr>
            </table>
            <table class="invoice-classic-lines" width="100%" border="1" cellpadding="4" cellspacing="0">
                <thead><tr><th>Product</th><th>Quantity</th><th>Condition</th><th>Line credit</th><th>Tax credit</th></tr></thead>
                <tbody>
                    @foreach ($salesReturn->items as $item)
                        <tr><td>{{ $item->product?->name ?? 'Product #' . $item->product_id }}</td><td>{{ $item->quantity }} {{ $item->unit?->abbreviation ?: $item->unit?->name }}</td><td>{{ ucfirst($item->condition) }}</td><td align="right">{{ $money($item->line_total) }}</td><td align="right">{{ $money($item->tax_amount) }}</td></tr>
                    @endforeach
                </tbody>
                <tfoot><tr><td colspan="4"><b>Total credit</b></td><td align="right"><b>{{ $money($salesReturn->total_amount) }}</b></td></tr></tfoot>
            </table>
            @if ($salesReturn->focItems->isNotEmpty())
                <h3>FOC disposition</h3>
                <table class="invoice-classic-lines" width="100%" border="1" cellpadding="4" cellspacing="0">
                    <thead><tr><th>Product</th><th>Base quantity</th><th>Decision</th><th>Value</th><th>Approval</th></tr></thead>
                    <tbody>@foreach ($salesReturn->focItems as $item)<tr><td>{{ $item->product?->name ?? 'Product #' . $item->product_id }}</td><td>{{ $item->base_unit_quantity }}</td><td>{{ ucfirst(str_replace('_', ' ', $item->disposition)) }}</td><td align="right">{{ $money($item->estimated_value_amount) }}</td><td>{{ $item->approver?->name ?? 'Pending' }}{{ $item->chargeAdjustment ? ' / ' . $item->chargeAdjustment->adjustment_no : '' }}</td></tr>@endforeach</tbody>
                </table>
            @endif
            <div class="invoice-classic-remarks"><b>Reason:</b><div>{{ $salesReturn->reason ?: '-' }}</div></div>
            <div class="invoice-classic-remarks"><b>Settlement effect:</b><div>This credit is separate from payment. Current invoice balance: {{ $money($salesReturn->invoice?->balance_amount) }}.</div></div>
        </article>
    </main>
</body>
</html>
