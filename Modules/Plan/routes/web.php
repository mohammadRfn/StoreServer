<?php

use Illuminate\Support\Facades\Route;
use Modules\Plan\Http\Controllers\ModuleCatalogController;
use Modules\Plan\Http\Controllers\PlanController;

Route::middleware(['auth', 'admin.active'])->prefix('panel')->group(function (): void {
    Route::get('/plans', [PlanController::class, 'index'])
        ->middleware('permission:plan.view')->name('admin.plans.index');
    Route::get('/plans/{plan}', [PlanController::class, 'show'])
        ->middleware('permission:plan.view')->name('admin.plans.show');

    Route::middleware('permission:plan.manage')->group(function (): void {
        Route::post('/plans', [PlanController::class, 'store'])->name('admin.plans.store');
        Route::put('/plans/{plan}', [PlanController::class, 'update'])->name('admin.plans.update');
        Route::delete('/plans/{plan}', [PlanController::class, 'destroy'])->name('admin.plans.destroy');

        Route::get('/modules', [ModuleCatalogController::class, 'index'])->name('admin.modules.index');
        Route::post('/modules', [ModuleCatalogController::class, 'store'])->name('admin.modules.store');
        Route::put('/modules/{module}', [ModuleCatalogController::class, 'update'])->name('admin.modules.update');
    });
});
