<?php

use Illuminate\Support\Facades\Route;
use Modules\Audit\Http\Controllers\AlertController;
use Modules\Audit\Http\Controllers\EvidenceController;
use Modules\Audit\Http\Controllers\InboxController;
use Modules\Audit\Http\Controllers\LogController;

Route::middleware(['auth', 'admin.active'])->prefix('panel/logs')->group(function (): void {
    Route::get('/', [LogController::class, 'index'])
        ->middleware('permission:log.view')->name('admin.logs.index');
    Route::get('/export', [LogController::class, 'export'])
        ->middleware('permission:log.export')->name('admin.logs.export');
});

// صف ورودی لاگ اپ‌ها (وضعیت + retry دستی)
Route::middleware(['auth', 'admin.active', 'permission:log.view'])->prefix('panel/logs/inbox')->group(function (): void {
    Route::get('/', [InboxController::class, 'index'])->name('admin.logs.inbox');
    Route::post('/retry-dead', [InboxController::class, 'retryDead'])->name('admin.logs.inbox.retry-dead');
    Route::post('/{item}/retry', [InboxController::class, 'retry'])->whereNumber('item')->name('admin.logs.inbox.retry');
});

Route::middleware(['auth', 'admin.active', 'permission:log.view'])->prefix('panel/alerts')->group(function (): void {
    Route::post('/ack-all', [AlertController::class, 'acknowledgeAll'])->name('admin.alerts.ack-all');
    Route::post('/{event}/ack', [AlertController::class, 'acknowledge'])->whereNumber('event')->name('admin.alerts.ack');
});

Route::middleware(['auth', 'admin.active', 'permission:log.export'])
    ->prefix('panel/licenses/{license}/evidence')->group(function (): void {
        Route::get('/', [EvidenceController::class, 'index'])->name('admin.evidence.index');
        Route::post('/', [EvidenceController::class, 'store'])->name('admin.evidence.store');
        Route::get('/{report}', [EvidenceController::class, 'show'])->whereUuid('report')->name('admin.evidence.show');
        Route::get('/{report}/print', [EvidenceController::class, 'print'])->whereUuid('report')->name('admin.evidence.print');
        Route::get('/{report}/download/{format}', [EvidenceController::class, 'download'])
            ->whereUuid('report')->whereIn('format', ['zip', 'json'])->name('admin.evidence.download');
    });
