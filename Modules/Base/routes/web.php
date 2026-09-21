<?php

use Illuminate\Support\Facades\Route;

// وضعیت سرویس برای مانیتورینگ داخلی
Route::get('/status', fn () => response()->json([
    'ok'      => true,
    'service' => 'StoreServer',
    'time'    => now()->utc()->toIso8601String(),
]))->name('base.status');
