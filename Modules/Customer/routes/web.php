<?php

use Illuminate\Support\Facades\Route;
use Modules\Customer\Http\Controllers\CustomerController;

Route::middleware(['auth', 'admin.active'])->prefix('panel/customers')->group(function (): void {
    Route::get('/', [CustomerController::class, 'index'])
        ->middleware('permission:customer.view')->name('admin.customers.index');
    Route::get('/{customer}', [CustomerController::class, 'show'])
        ->middleware('permission:customer.view')->name('admin.customers.show');

    Route::middleware('permission:customer.manage')->group(function (): void {
        Route::post('/', [CustomerController::class, 'store'])->name('admin.customers.store');
        Route::put('/{customer}', [CustomerController::class, 'update'])->name('admin.customers.update');
        Route::delete('/{customer}', [CustomerController::class, 'destroy'])->name('admin.customers.destroy');
    });
});