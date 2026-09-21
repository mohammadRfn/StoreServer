<?php

use Illuminate\Support\Facades\Route;
use Modules\Patch\Http\Controllers\PatchController;

Route::middleware(['auth', 'admin.active'])->prefix('panel/patches')->group(function (): void {
    Route::get('/', [PatchController::class, 'index'])
        ->middleware('permission:patch.view')->name('admin.patches.index');
    Route::get('/{patch}', [PatchController::class, 'show'])
        ->middleware('permission:patch.view')->name('admin.patches.show');

    Route::post('/', [PatchController::class, 'store'])
        ->middleware('permission:patch.upload')->name('admin.patches.store');
    Route::post('/{patch}/publish', [PatchController::class, 'publish'])
        ->middleware('permission:patch.publish')->name('admin.patches.publish');
    Route::post('/{patch}/schedule', [PatchController::class, 'schedule'])
        ->middleware('permission:patch.publish')->name('admin.patches.schedule');
    Route::post('/{patch}/withdraw', [PatchController::class, 'withdraw'])
        ->middleware('permission:patch.withdraw')->name('admin.patches.withdraw');
});
