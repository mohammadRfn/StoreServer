<?php

use Illuminate\Support\Facades\Route;
use Modules\Audit\Http\Controllers\AlertController;
use Modules\Audit\Http\Controllers\LogController;

Route::middleware(['auth', 'admin.active'])->prefix('panel/logs')->group(function (): void {
    Route::get('/', [LogController::class, 'index'])
        ->middleware('permission:log.view')->name('admin.logs.index');
    Route::get('/export', [LogController::class, 'export'])
        ->middleware('permission:log.export')->name('admin.logs.export');
});

Route::middleware(['auth', 'admin.active', 'permission:log.view'])->prefix('panel/alerts')->group(function (): void {
    Route::post('/ack-all', [AlertController::class, 'acknowledgeAll'])->name('admin.alerts.ack-all');
    Route::post('/{event}/ack', [AlertController::class, 'acknowledge'])->whereNumber('event')->name('admin.alerts.ack');
});
