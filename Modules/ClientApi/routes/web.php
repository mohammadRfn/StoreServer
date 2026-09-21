<?php

use Illuminate\Support\Facades\Route;
use Modules\ClientApi\Http\Controllers\ClientApiController;

Route::middleware(['auth', 'verified'])->group(function () {
    Route::resource('clientapis', ClientApiController::class)->names('clientapi');
});
