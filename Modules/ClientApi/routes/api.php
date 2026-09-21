<?php

use Illuminate\Support\Facades\Route;
use Modules\ClientApi\Http\Controllers\ActivationController;
use Modules\ClientApi\Http\Controllers\HeartbeatController;
use Modules\ClientApi\Http\Controllers\PatchClientController;
use Modules\ClientApi\Http\Controllers\PublicKeyController;

// همه اندپوینت‌های کلاینت GameShop زیر /api/v1 و با rate limiter به نام client-api
Route::prefix('v1')
    ->middleware(['throttle:client-api'])
    ->group(function (): void {

        // کلیدهای عمومی (بدون احراز هویت)
        Route::get('/keys', PublicKeyController::class)->name('api.v1.keys');

        // مسیر فعال‌سازی (بدون توکن ولی با ضدتکرار)
        Route::middleware('client.sig')->group(function (): void {
            Route::post('/activation/request', [ActivationController::class, 'request'])->name('api.v1.activation.request');
            Route::post('/activation/redeem', [ActivationController::class, 'redeem'])->name('api.v1.activation.redeem');
        });

        Route::get('/activation/status/{uuid}', [ActivationController::class, 'status'])->name('api.v1.activation.status');

        // اندپوینت‌های محافظت‌شده با توکن لایسنس
        Route::middleware(['client.sig', 'license.token:allow_expired'])
            ->post('/heartbeat', HeartbeatController::class)->name('api.v1.heartbeat');

        Route::middleware(['client.sig', 'license.token'])->group(function (): void {
            Route::get('/patches', [PatchClientController::class, 'index'])->name('api.v1.patches.index');
            Route::post('/patches/{patchCode}/status', [PatchClientController::class, 'reportStatus'])->name('api.v1.patches.status');
        });

        // دانلود: توکن لایسنس + لینک امضاشده کوتاه‌مدت (بدون nonce تا resume ممکن باشد)
        Route::middleware(['license.token', 'patch.link'])
            ->get('/patches/{patchCode}/download', [PatchClientController::class, 'download'])
            ->name('api.v1.patches.download');
    });
