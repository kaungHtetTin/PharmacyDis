<?php

use Illuminate\Support\Facades\Route;

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
Route::view('/office/{page}', 'welcome')
    ->whereIn('page', [
        'dashboard',
        'login',
        'companies',
        'products',
        'units',
        'pharmacies',
        'pharmacies-detail',
        'representatives',
        'representatives-detail',
        'inventory',
        'inventory-detail',
        'receiving',
        'stock-transfers',
        'stock-transfer-create',
        'orders',
        'invoices',
        'invoice-detail',
        'payments',
        'receivables',
        'payables',
        'reports-representatives',
        'reports-pharmacies',
        'reports-finance',
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
        'orders',
        'profile',
    ])
    ->name('sales.page');
