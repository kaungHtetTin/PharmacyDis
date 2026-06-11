<?php

namespace App\Http\Controllers\Api\Sales;

use App\Http\Controllers\Controller;
use App\Services\DashboardMetricService;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    public function __invoke(Request $request, DashboardMetricService $dashboardMetricService)
    {
        $salesRepresentative = $request->user()->salesRepresentative;

        return $dashboardMetricService->salesRepresentativeSummary((int) $salesRepresentative?->id);
    }
}
