<?php

namespace App\Http\Controllers\Api\Office;

use App\Http\Controllers\Controller;
use App\Models\Setting;
use App\Support\InvoicePrintSettings;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class SettingController extends Controller
{
    public function invoicePrint()
    {
        return response()->json([
            'settings' => InvoicePrintSettings::payload(),
        ]);
    }

    public function updateInvoicePrint(Request $request)
    {
        $validKeys = InvoicePrintSettings::fieldKeys();

        $validated = $request->validate([
            'settings' => ['required', 'array'],
            'settings.*.key' => ['required', 'string', Rule::in($validKeys)],
            'settings.*.value' => ['nullable', 'string', 'max:2000'],
        ]);

        DB::transaction(function () use ($validated) {
            collect($validated['settings'])
                ->unique('key')
                ->each(function (array $setting) {
                    $field = InvoicePrintSettings::fieldForFullKey($setting['key']);

                    Setting::updateOrCreate(
                        ['key' => $setting['key']],
                        [
                            'setting_group' => InvoicePrintSettings::GROUP,
                            'value' => $setting['value'] ?? '',
                            'value_type' => $field['value_type'] ?? 'string',
                        ]
                    );
                });
        });

        return response()->json([
            'message' => 'Invoice print settings saved.',
            'settings' => InvoicePrintSettings::payload(),
        ]);
    }
}
