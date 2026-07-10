<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>{{ config('app.name', 'Medi Mart Distribution System') }}</title>
        <link rel="icon" type="image/png" href="{{ asset('favicon.png') }}">
        @if (request()->segment(1) === 'sales')
            <meta name="theme-color" content="#0f766e">
            <meta name="mobile-web-app-capable" content="yes">
            <meta name="apple-mobile-web-app-capable" content="yes">
            <meta name="apple-mobile-web-app-title" content="Medi Mart Sales">
            <meta name="apple-mobile-web-app-status-bar-style" content="default">
            <link rel="manifest" href="{{ asset('sales-manifest.webmanifest') }}">
            <link rel="apple-touch-icon" href="{{ asset('logo.png') }}">
        @endif
        <script>
            window.appConfig = {
                baseUrl: @json(url('/')),
                currentApp: @json(request()->segment(1) === 'sales' ? 'sales' : 'office'),
                currentPage: @json(request()->segment(2) ?: 'dashboard'),
                faviconUrl: @json(asset('favicon.png')),
                invoiceDueDays: @json((int) config('billing.invoice_due_days', 30)),
                logoUrl: @json(asset('logo.png')),
            };
        </script>
        @viteReactRefresh
        @vite(['resources/css/app.css', 'resources/js/app.js'])
    </head>
    <body>
        <div id="app"></div>
    </body>
</html>
