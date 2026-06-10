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
        'companies',
        'products',
        'units',
        'pharmacies',
        'representatives',
        'inventory',
        'receiving',
        'orders',
        'invoices',
        'payments',
        'receivables',
        'payables',
        'foc-rules',
        'commissions',
        'reports',
        'settings',
    ])
    ->name('office.page');

Route::view('/sales', 'welcome')->name('sales.index');
Route::view('/sales/{page}', 'welcome')
    ->whereIn('page', [
        'dashboard',
        'products',
        'stock',
        'pharmacies',
        'new-order',
        'orders',
        'performance',
    ])
    ->name('sales.page');
