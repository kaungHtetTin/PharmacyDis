<?php

namespace App\Http\Controllers\Api\Office;

use App\Http\Controllers\Controller;
use App\Services\DashboardMetricService;

class DashboardController extends Controller
{
    public function __invoke(DashboardMetricService $dashboardMetricService)
    {
        return $dashboardMetricService->officeSummary();
    }
}
