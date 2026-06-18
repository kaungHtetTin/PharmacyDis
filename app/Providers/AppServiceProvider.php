<?php

namespace App\Providers;

use App\Models\Company;
use App\Models\CompanyPayable;
use App\Models\CompanyPayment;
use App\Models\Customer;
use App\Models\CustomerBalance;
use App\Models\CustomerCompanyCreditStatus;
use App\Models\DeliveryVoucher;
use App\Models\FinanceCategory;
use App\Models\FinanceTransaction;
use App\Models\FocRule;
use App\Models\Invoice;
use App\Models\Payment;
use App\Models\Product;
use App\Models\ProductCategory;
use App\Models\ProductUnit;
use App\Models\SalesOrder;
use App\Models\SalesRepresentative;
use App\Models\Setting;
use App\Models\StockAdjustment;
use App\Models\StockBatch;
use App\Models\StockReceipt;
use App\Models\StockTransfer;
use App\Models\Unit;
use App\Models\User;
use App\Models\Warehouse;
use App\Observers\ActivityLogObserver;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     *
     * @return void
     */
    public function register()
    {
        //
    }

    /**
     * Bootstrap any application services.
     *
     * @return void
     */
    public function boot()
    {
        foreach ($this->auditedModels() as $model) {
            $model::observe(ActivityLogObserver::class);
        }
    }

    private function auditedModels(): array
    {
        return [
            Company::class,
            CompanyPayable::class,
            CompanyPayment::class,
            Customer::class,
            CustomerBalance::class,
            CustomerCompanyCreditStatus::class,
            DeliveryVoucher::class,
            FinanceCategory::class,
            FinanceTransaction::class,
            FocRule::class,
            Invoice::class,
            Payment::class,
            Product::class,
            ProductCategory::class,
            ProductUnit::class,
            SalesOrder::class,
            SalesRepresentative::class,
            Setting::class,
            StockAdjustment::class,
            StockBatch::class,
            StockReceipt::class,
            StockTransfer::class,
            Unit::class,
            User::class,
            Warehouse::class,
        ];
    }
}
