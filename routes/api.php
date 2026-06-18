<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\LookupController;
use App\Http\Controllers\Api\NotificationController;
use App\Http\Controllers\Api\Office\ActivityLogController as OfficeActivityLogController;
use App\Http\Controllers\Api\Office\DashboardController as OfficeDashboardController;
use App\Http\Controllers\Api\Office\CompanyController as OfficeCompanyController;
use App\Http\Controllers\Api\Office\CustomerController as OfficeCustomerController;
use App\Http\Controllers\Api\Office\FocRuleController as OfficeFocRuleController;
use App\Http\Controllers\Api\Office\FinanceCategoryController as OfficeFinanceCategoryController;
use App\Http\Controllers\Api\Office\FinanceController as OfficeFinanceController;
use App\Http\Controllers\Api\Office\InvoiceController as OfficeInvoiceController;
use App\Http\Controllers\Api\Office\PaymentController as OfficePaymentController;
use App\Http\Controllers\Api\Office\ProductCategoryController as OfficeProductCategoryController;
use App\Http\Controllers\Api\Office\ProductController as OfficeProductController;
use App\Http\Controllers\Api\Office\ProfileController as OfficeProfileController;
use App\Http\Controllers\Api\Office\ReportController as OfficeReportController;
use App\Http\Controllers\Api\Office\SalesRepresentativeController as OfficeSalesRepresentativeController;
use App\Http\Controllers\Api\Office\SalesOrderController as OfficeSalesOrderController;
use App\Http\Controllers\Api\Office\StockController as OfficeStockController;
use App\Http\Controllers\Api\Office\StockReceiptController as OfficeStockReceiptController;
use App\Http\Controllers\Api\Office\UnitController as OfficeUnitController;
use App\Http\Controllers\Api\Office\UserController as OfficeUserController;
use App\Http\Controllers\Api\Office\WarehouseController as OfficeWarehouseController;
use App\Http\Controllers\Api\Sales\CustomerController as SalesCustomerController;
use App\Http\Controllers\Api\Sales\DashboardController as SalesDashboardController;
use App\Http\Controllers\Api\Sales\ProfileController as SalesProfileController;
use App\Http\Controllers\Api\Sales\SalesOrderController as SalesSalesOrderController;
use App\Http\Controllers\Api\Sales\StockController as SalesStockController;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| Here is where you can register API routes for your application. These
| routes are loaded by the RouteServiceProvider within a group which
| is assigned the "api" middleware group. Enjoy building your API!
|
*/

Route::middleware('auth:sanctum')->get('/user', function (Request $request) {
    return $request->user()->load('role', 'salesRepresentative.company');
});

Route::post('auth/login', [AuthController::class, 'login']);

Route::middleware('auth:sanctum')->group(function () {
    Route::post('auth/logout', [AuthController::class, 'logout']);
    Route::get('notifications', [NotificationController::class, 'index']);
    Route::post('notifications/{notification}/mark-as-read', [NotificationController::class, 'markAsRead']);

    Route::prefix('lookups')->group(function () {
        Route::get('companies', [LookupController::class, 'companies']);
        Route::get('customers', [LookupController::class, 'customers']);
        Route::get('products', [LookupController::class, 'products']);
        Route::get('sales-representatives', [LookupController::class, 'salesRepresentatives']);
        Route::get('units', [LookupController::class, 'units']);
        Route::get('product-categories', [LookupController::class, 'productCategories']);
        Route::get('brands', [LookupController::class, 'brands']);
    });

    Route::prefix('office')->middleware('user.type:office')->group(function () {
        Route::post('profile', [OfficeProfileController::class, 'update']);
        Route::get('dashboard', OfficeDashboardController::class)->middleware('permission:office.dashboard');

        Route::middleware('permission:office.master-data')->group(function () {
            Route::apiResource('companies', OfficeCompanyController::class)->except(['show']);
            Route::apiResource('customers', OfficeCustomerController::class)->except(['show']);
            Route::get('customers/{customer}/detail', [OfficeCustomerController::class, 'detail']);
            Route::apiResource('product-categories', OfficeProductCategoryController::class)->except(['show']);
            Route::get('products/{product}', [OfficeProductController::class, 'show']);
            Route::apiResource('products', OfficeProductController::class)->except(['show']);
            Route::get('sales-representatives/{salesRepresentative}/detail', [OfficeSalesRepresentativeController::class, 'detail']);
            Route::apiResource('sales-representatives', OfficeSalesRepresentativeController::class)->except(['show']);
            Route::apiResource('units', OfficeUnitController::class)->except(['show']);
            Route::apiResource('warehouses', OfficeWarehouseController::class)->except(['show']);
            Route::apiResource('foc-rules', OfficeFocRuleController::class)->except(['show']);
        });

        Route::middleware('permission:office.operations')->group(function () {
            Route::get('orders', [OfficeSalesOrderController::class, 'index']);
            Route::post('orders', [OfficeSalesOrderController::class, 'store']);
            Route::post('orders/{salesOrder}/approve', [OfficeSalesOrderController::class, 'approve']);
            Route::post('orders/{salesOrder}/deliver', [OfficeSalesOrderController::class, 'deliver']);
            Route::post('orders/{salesOrder}/reject', [OfficeSalesOrderController::class, 'reject']);

            Route::get('invoices', [OfficeInvoiceController::class, 'index']);
            Route::post('orders/{salesOrder}/generate-invoice', [OfficeInvoiceController::class, 'generateFromOrder']);

            Route::get('stock-receipts', [OfficeStockReceiptController::class, 'index']);
            Route::post('stock-receipts', [OfficeStockReceiptController::class, 'store']);
            Route::get('stock-receipts/{stockReceipt}', [OfficeStockReceiptController::class, 'show']);
            Route::put('stock-receipts/{stockReceipt}', [OfficeStockReceiptController::class, 'update']);
            Route::delete('stock-receipts/{stockReceipt}', [OfficeStockReceiptController::class, 'destroy']);
            Route::get('stock/transfers', [OfficeStockController::class, 'transfers']);
            Route::get('stock/transfers/{stockTransfer}', [OfficeStockController::class, 'transferDetail']);
            Route::get('stock/current', [OfficeStockController::class, 'current']);
            Route::get('stock/products/{product}/batches', [OfficeStockController::class, 'productBatches']);
            Route::post('stock/adjustments', [OfficeStockController::class, 'adjust']);
            Route::post('stock/transfers', [OfficeStockController::class, 'transfer']);
        });

        Route::middleware('permission:office.finance')->group(function () {
            Route::get('payments', [OfficePaymentController::class, 'index']);
            Route::get('payments/{payment}', [OfficePaymentController::class, 'show']);
            Route::post('payments', [OfficePaymentController::class, 'store']);
            Route::apiResource('finance-categories', OfficeFinanceCategoryController::class)->except(['show']);
            Route::get('finance/transactions', [OfficeFinanceController::class, 'transactions']);
            Route::post('finance/transactions', [OfficeFinanceController::class, 'storeTransaction']);
            Route::put('finance/transactions/{financeTransaction}', [OfficeFinanceController::class, 'updateTransaction']);
            Route::delete('finance/transactions/{financeTransaction}', [OfficeFinanceController::class, 'destroyTransaction']);
            Route::get('receivables', [OfficeFinanceController::class, 'receivables']);
            Route::get('payables', [OfficeFinanceController::class, 'payables']);
            Route::get('payables/{companyPayable}', [OfficeFinanceController::class, 'payableDetail']);
            Route::get('company-payments', [OfficeFinanceController::class, 'companyPayments']);
            Route::post('company-payments', [OfficeFinanceController::class, 'recordCompanyPayment']);
        });

        Route::middleware('permission:office.reports')->group(function () {
            Route::get('reports/sales/top-representatives', [OfficeReportController::class, 'topSalesRepresentatives']);
            Route::get('reports/pharmacies/top-sales', [OfficeReportController::class, 'topPharmacies']);
            Route::get('reports/finance/overview', [OfficeReportController::class, 'financeOverview']);
        });

        Route::middleware('permission:office.users')->group(function () {
            Route::get('activity-logs', [OfficeActivityLogController::class, 'index']);
            Route::delete('activity-logs', [OfficeActivityLogController::class, 'clear']);
            Route::get('users/roles', [OfficeUserController::class, 'roles']);
            Route::apiResource('users', OfficeUserController::class)->except(['show']);
        });
    });

    Route::prefix('sales')->middleware('user.type:sales')->group(function () {
        Route::get('dashboard', SalesDashboardController::class);
        Route::post('profile', [SalesProfileController::class, 'update']);
        Route::get('customers/{customer}/detail', [SalesCustomerController::class, 'detail']);
        Route::get('stock/current', [SalesStockController::class, 'current']);
        Route::get('orders', [SalesSalesOrderController::class, 'index']);
        Route::post('orders', [SalesSalesOrderController::class, 'store']);
    });
});
