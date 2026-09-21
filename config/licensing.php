<?php

// پیکربندی لایسنسینگ StoreServer
// نکته: کلید خصوصی هرگز در دیتابیس نگهداری نمی‌شود و فقط از فایل خارج از webroot خوانده می‌شود.
// در کد اپلیکیشن هرگز از env() استفاده نکنید؛ فقط config('licensing.*').

return [

    /*
    |--------------------------------------------------------------------------
    | الگوریتم امضا
    |--------------------------------------------------------------------------
    */
    'algorithm' => 'EdDSA', // Ed25519 از طریق ext-sodium

    /*
    |--------------------------------------------------------------------------
    | مسیر کلیدها (خارج از webroot)
    |--------------------------------------------------------------------------
    | مقدار پیش‌فرض: storage/keys که با .htaccess/nginx از دسترس عمومی خارج است.
    */
    'keys' => [
        'path'        => env('LICENSING_KEYS_PATH', storage_path('keys')),
        'private_key' => env('LICENSING_PRIVATE_KEY_FILE'), // خالی = {kid}.key در مسیر keys.path
        'public_key'  => env('LICENSING_PUBLIC_KEY_FILE'),
        'active_kid'  => env('LICENSING_ACTIVE_KID', null),
    ],

    /*
    |--------------------------------------------------------------------------
    | توکن لایسنس
    |--------------------------------------------------------------------------
    */
    'token' => [
        'type'               => 'GSL', // GameShop License Token
        'issuer'             => env('LICENSING_ISSUER', 'storeserver'),
        'audience'           => env('LICENSING_AUDIENCE', 'gameshop-desktop'),
        // مهلت آفلاین پیش‌فرض (اگر تنظیمات سرور مقدار نداشته باشد)
        'default_offline_grace_days' => 7,
        'default_heartbeat_minutes'  => 60,
    ],

    /*
    |--------------------------------------------------------------------------
    | امنیت درخواست‌های کلاینت
    |--------------------------------------------------------------------------
    */
    'security' => [
        'replay_window_seconds' => 300,       // اختلاف مجاز timestamp: ۵ دقیقه
        'nonce_cache_prefix'    => 'gsl:nonce:',
        'nonce_ttl_seconds'     => 600,
        'rate_limiter'          => 'client-api',
        'rate_limit_per_minute' => 60,
    ],

    /*
    |--------------------------------------------------------------------------
    | پچ‌ها
    |--------------------------------------------------------------------------
    */
    'patch' => [
        'disk'                  => env('PATCH_DISK', 'patches'),      // دیسک خصوصی
        'signed_link_ttl'       => 15,                                 // دقیقه (قابل بازنویسی از تنظیمات سرور)
        'max_failures_per_device' => 3,
        'max_upload_mb'         => (int) env('PATCH_MAX_UPLOAD_MB', 512),
        'allowed_roots'         => ['app', 'resources', 'public', 'config', 'routes', 'database', 'lang'],
        'forbidden_patterns'    => ['..', './', '\\', ':'],
    ],

    /*
    |--------------------------------------------------------------------------
    | کدهای یک‌بارمصرف
    |--------------------------------------------------------------------------
    */
    'codes' => [
        'prefix'        => 'GS',
        'groups'        => 4,   // GS-XXXX-XXXX-XXXX-XXXX
        'group_length'  => 4,
        'alphabet'      => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789', // بدون کاراکترهای مبهم
        'default_ttl_days' => 30,
    ],

    /*
    |--------------------------------------------------------------------------
    | نگهداشت لاگ‌ها (روز) - مقدار پیش‌فرض، قابل بازنویسی از جدول server_settings
    |--------------------------------------------------------------------------
    */
    'retention' => [
        'audit'     => 3650,
        'license'   => 1095,
        'heartbeat' => 90,
        'device'    => 365,
        'patch'     => 365,
        'security'  => 730,
        'error'     => 180,
        'api'       => 30,
    ],
];
