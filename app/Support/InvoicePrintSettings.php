<?php

namespace App\Support;

use App\Models\Setting;
use Illuminate\Support\Collection;

class InvoicePrintSettings
{
    public const GROUP = 'invoice_print';
    public const PREFIX = 'invoice_print.';

    private const FIELDS = [
        ['key' => 'company_name', 'label' => 'Company name', 'default' => 'AA MEDICAL PRODUCTS LTD'],
        ['key' => 'company_address', 'label' => 'Company address', 'default' => 'No. 81, Insein Road, Kamayut Township, Yangon', 'input_type' => 'textarea'],
        ['key' => 'company_phone', 'label' => 'Company phone', 'default' => '(+95) 1 7532577, (+95) 1 7532568 - 87'],
        ['key' => 'document_title', 'label' => 'Document title', 'default' => 'SALES INVOICE'],
        ['key' => 'footer_text', 'label' => 'Footer text', 'default' => 'Thank you for your business'],
    ];

    public static function defaults(): array
    {
        return collect(self::FIELDS)
            ->mapWithKeys(fn (array $field) => [$field['key'] => $field['default']])
            ->all();
    }

    public static function values(): array
    {
        return array_merge(self::defaults(), self::storedValues());
    }

    public static function fieldKeys(): array
    {
        return collect(self::FIELDS)
            ->map(fn (array $field) => self::PREFIX.$field['key'])
            ->all();
    }

    public static function fieldForFullKey(string $key): ?array
    {
        return collect(self::FIELDS)
            ->first(fn (array $field) => self::PREFIX.$field['key'] === $key);
    }

    public static function payload(): array
    {
        $stored = self::storedValues();

        return collect(self::FIELDS)
            ->map(function (array $field) use ($stored) {
                $key = $field['key'];

                return [
                    'key' => self::PREFIX.$key,
                    'setting_key' => $key,
                    'label' => $field['label'],
                    'value' => $stored[$key] ?? $field['default'],
                    'default_value' => $field['default'],
                    'value_type' => $field['value_type'] ?? 'string',
                    'input_type' => $field['input_type'] ?? 'text',
                    'help' => $field['help'] ?? null,
                ];
            })
            ->values()
            ->all();
    }

    private static function storedValues(): array
    {
        return Setting::query()
            ->where('setting_group', self::GROUP)
            ->pluck('value', 'key')
            ->mapWithKeys(fn ($value, $key) => [str_replace(self::PREFIX, '', $key) => $value])
            ->all();
    }

    public static function collection(): Collection
    {
        return collect(self::FIELDS);
    }
}
