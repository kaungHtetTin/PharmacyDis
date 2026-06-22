<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>{{ config('app.name', 'Medi Mart Distribution System') }}</title>
        <link rel="icon" type="image/png" href="{{ asset('favicon.png') }}">
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
