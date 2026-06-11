<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AppNotification;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    public function index(Request $request)
    {
        return AppNotification::query()
            ->where(function ($query) use ($request) {
                $query->whereNull('user_id')->orWhere('user_id', $request->user()->id);
            })
            ->latest()
            ->paginate($request->integer('per_page', 15));
    }

    public function markAsRead(Request $request, AppNotification $notification)
    {
        abort_if($notification->user_id && $notification->user_id !== $request->user()->id, 403);

        $notification->update(['read_at' => now()]);

        return $notification;
    }
}
