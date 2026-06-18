<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Office\InvoicePrintController;

/*
|--------------------------------------------------------------------------
| Web Routes
|--------------------------------------------------------------------------
|
| Here is where you can register web routes for your application. These
| routes are loaded by the RouteServiceProvider within a group which
| contains the "web" middleware group. Now create something great!
|
*/

Route::get('/', function () {
    return view('welcome');
});

Route::view('/office', 'welcome')->name('office.index');
Route::get('/office/invoices/{invoice}/print', InvoicePrintController::class)->name('office.invoices.print');
Route::view('/office/{page}', 'welcome')
    ->whereIn('page', [
        'dashboard',
        'login',
        'companies',
        'products',
        'product-detail',
        'units',
        'pharmacies',
        'pharmacies-detail',
        'representatives',
        'representatives-detail',
        'inventory',
        'inventory-detail',
        'receiving',
        'receiving-detail',
        'stock-transfers',
        'stock-transfer-create',
        'stock-transfer-detail',
        'orders',
        'order-detail',
        'invoices',
        'invoice-detail',
        'finance',
        'finance-categories',
        'payments',
        'payment-detail',
        'receivables',
        'payables',
        'payable-detail',
        'profile',
        'reports-representatives',
        'reports-pharmacies',
        'reports-finance',
        'users',
        'activity-logs',
        'settings',
    ])
    ->name('office.page');

Route::view('/sales', 'welcome')->name('sales.index');
Route::view('/sales/{page}', 'welcome')
    ->whereIn('page', [
        'login',
        'dashboard',
        'stock',
        'pharmacies',
        'pharmacies-detail',
        'new-order',
        'order-detail',
        'order-submitted',
        'orders',
        'profile',
    ])
    ->name('sales.page');
