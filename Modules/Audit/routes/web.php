<?php

use Illuminate\Support\Facades\Route;
use Modules\Audit\Http\Controllers\LogController;

Route::middleware(['auth', 'admin.active'])->prefix('panel/logs')->group(function (): void {
    Route::get('/', [LogController::class, 'index'])
        ->middleware('permission:log.view')->name('admin.logs.index');
    Route::get('/export', [LogController::class, 'export'])
        ->middleware('permission:log.export')->name('admin.logs.export');
});
