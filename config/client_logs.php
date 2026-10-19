<?php

declare(strict_types=1);

// تنظیمات دریافت async لاگ اپ‌ها (inbox + job)
return [
    // sync = رفتار قبلی (درج همزمان) | queue = ذخیره در inbox و پردازش بعداً
    // با ServerSettings کلید client_logs_ingest_mode هم می‌شود بدون دیپلوی عوضش کرد.
    'ingest_mode' => env('CLIENT_LOGS_INGEST_MODE', 'sync'),

    // اگر worker دارید true کنید تا بعد از ذخیره‌ی inbox یک job هم dispatch شود.
    // بدون worker باید false بماند (job ها در جدول jobs بی‌مصرف جمع می‌شوند)؛
    // در این حالت دستور client-logs:process-inbox (هر دقیقه در scheduler) پردازش را انجام می‌دهد.
    'dispatch_job' => (bool) env('CLIENT_LOGS_DISPATCH_JOB', false),

    'queue'            => env('CLIENT_LOGS_QUEUE', 'client-logs'),
    'queue_connection' => env('CLIENT_LOGS_QUEUE_CONNECTION'), // null = پیش‌فرض برنامه

    // حداکثر تلاش پردازش یک دسته؛ بعد از آن status=dead (payload حفظ می‌شود)
    'max_attempts' => (int) env('CLIENT_LOGS_MAX_ATTEMPTS', 5),

    // فاصله‌ی تلاش‌ها (ثانیه) به ترتیب تلاش؛ ±۲۰٪ jitter اضافه می‌شود
    'backoff' => [30, 120, 600, 1800, 7200],

    'job_timeout' => 120,

    // سقف حجم ذخیره‌شده‌ی هر دسته (gzip+base64) و حجم JSON خام
    'max_stored_bytes' => (int) env('CLIENT_LOGS_INBOX_MAX_BYTES', 4 * 1024 * 1024),
    'max_raw_bytes'    => (int) env('CLIENT_LOGS_INBOX_MAX_RAW_BYTES', 10 * 1024 * 1024),

    // ردیف processing که بیشتر از این (ثانیه) قفل مانده را crash فرض می‌کنیم
    'stale_lock_seconds'  => 600,
    // طول قفل هر دستگاه (باید از job_timeout بزرگ‌تر باشد)
    'device_lock_seconds' => 180,

    // هشدار انباشتگی: قدیمی‌ترین دسته‌ی منتظر از این دقیقه بیشتر یا تعداد منتظرها از این بیشتر
    'backlog_alert_minutes' => 15,
    'backlog_alert_count'   => 200,

    // پیش‌فرض retention (با ServerSettings کلیدهای client_inbox_* قابل تغییر)
    'retention_days'    => 14, // حذف ردیف‌های done
    'payload_keep_days' => 3,  // خالی کردن payload ردیف‌های done
];