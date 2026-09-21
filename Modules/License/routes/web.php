<?php

use Illuminate\Support\Facades\Route;
use Modules\License\Http\Controllers\ActivationRequestController;
use Modules\License\Http\Controllers\DeviceController;
use Modules\License\Http\Controllers\LicenseCodeController;
use Modules\License\Http\Controllers\LicenseController;

Route::middleware(['auth', 'admin.active'])->prefix('panel')->group(function (): void {

    // لایسنس‌ها
    Route::get('/licenses', [LicenseController::class, 'index'])
        ->middleware('permission:license.view')->name('admin.licenses.index');
    Route::get('/licenses/{license}', [LicenseController::class, 'show'])
        ->middleware('permission:license.view')->name('admin.licenses.show');

    Route::post('/licenses', [LicenseController::class, 'store'])
        ->middleware('permission:license.issue')->name('admin.licenses.store');
    Route::post('/licenses/{license}/renew', [LicenseController::class, 'renew'])
        ->middleware('permission:license.renew')->name('admin.licenses.renew');
    Route::post('/licenses/{license}/change-plan', [LicenseController::class, 'changePlan'])
        ->middleware('permission:license.change_plan')->name('admin.licenses.change-plan');
    Route::post('/licenses/{license}/suspend', [LicenseController::class, 'suspend'])
        ->middleware('permission:license.suspend')->name('admin.licenses.suspend');
    Route::post('/licenses/{license}/reactivate', [LicenseController::class, 'reactivate'])
        ->middleware('permission:license.suspend')->name('admin.licenses.reactivate');
    Route::post('/licenses/{license}/revoke', [LicenseController::class, 'revoke'])
        ->middleware('permission:license.revoke')->name('admin.licenses.revoke');
    Route::post('/licenses/{license}/override', [LicenseController::class, 'override'])
        ->middleware('permission:license.change_plan')->name('admin.licenses.override');

    // درخواست‌های فعال‌سازی
    Route::get('/activation-requests', [ActivationRequestController::class, 'index'])
        ->middleware('permission:license.view')->name('admin.activation-requests.index');
    Route::post('/activation-requests/{activationRequest}/approve', [ActivationRequestController::class, 'approve'])
        ->middleware('permission:license.approve')->name('admin.activation-requests.approve');
    Route::post('/activation-requests/{activationRequest}/reject', [ActivationRequestController::class, 'reject'])
        ->middleware('permission:license.approve')->name('admin.activation-requests.reject');

    // کدهای یک‌بارمصرف
    Route::get('/license-codes', [LicenseCodeController::class, 'index'])
        ->middleware('permission:license.view')->name('admin.license-codes.index');
    Route::post('/license-codes', [LicenseCodeController::class, 'store'])
        ->middleware('permission:license.issue')->name('admin.license-codes.store');
    Route::post('/license-codes/{code}/revoke', [LicenseCodeController::class, 'revoke'])
        ->middleware('permission:license.issue')->name('admin.license-codes.revoke');

    // دستگاه‌ها
    Route::get('/devices', [DeviceController::class, 'index'])
        ->middleware('permission:device.view')->name('admin.devices.index');
    Route::get('/devices/{device}', [DeviceController::class, 'show'])
        ->middleware('permission:device.view')->name('admin.devices.show');
});
