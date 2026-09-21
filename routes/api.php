<?php

use Illuminate\Support\Facades\Route;

// روت‌های اصلی API توسط ماژول ClientApi ثبت می‌شوند.
// این فایل فقط برای فعال‌سازی گروه api در bootstrap/app.php لازم است.

Route::get('/ping', fn () => response()->json([
    'ok'   => true,
    'data' => ['service' => 'storeserver', 'time' => now()->utc()->toIso8601String()],
]))->name('api.ping');
