<?php

use Illuminate\Support\Facades\Route;
use Modules\Admin\Http\Controllers\AdminController;
use Modules\Admin\Http\Controllers\AuthController;
use Modules\Admin\Http\Controllers\RoleController;
use Modules\Admin\Http\Controllers\SettingController;

// ورود ادمین با throttle اختصاصی
Route::middleware('guest')->group(function (): void {
    Route::get('/login', [AuthController::class, 'showLogin'])->name('admin.login');
    Route::post('/login', [AuthController::class, 'login'])
        ->middleware('throttle:admin-login')
        ->name('admin.login.attempt');
});

Route::middleware(['auth', 'admin.active'])->prefix('panel')->group(function (): void {
    Route::post('/logout', [AuthController::class, 'logout'])->name('admin.logout');
    Route::get('/', [AuthController::class, 'dashboard'])->name('admin.dashboard');

    // مدیریت ادمین‌ها
    Route::middleware('permission:admin.manage')->group(function (): void {
        Route::get('/admins', [AdminController::class, 'index'])->name('admin.admins.index');
        Route::post('/admins', [AdminController::class, 'store'])->name('admin.admins.store');
        Route::put('/admins/{admin}', [AdminController::class, 'update'])->name('admin.admins.update');
        Route::delete('/admins/{admin}', [AdminController::class, 'destroy'])->name('admin.admins.destroy');

        Route::get('/roles', [RoleController::class, 'index'])->name('admin.roles.index');
        Route::post('/roles', [RoleController::class, 'store'])->name('admin.roles.store');
        Route::put('/roles/{role}', [RoleController::class, 'update'])->name('admin.roles.update');
        Route::delete('/roles/{role}', [RoleController::class, 'destroy'])->name('admin.roles.destroy');
    });

    // تنظیمات سرور
    Route::middleware('permission:setting.manage')->group(function (): void {
        Route::get('/settings', [SettingController::class, 'index'])->name('admin.settings.index');
        Route::put('/settings', [SettingController::class, 'update'])->name('admin.settings.update');
    });
});
