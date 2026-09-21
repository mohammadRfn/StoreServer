<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// -----------------------------------------------------------------
// زمان‌بندی دستورهای StoreServer
// -----------------------------------------------------------------

// انتشار پچ‌های زمان‌بندی‌شده (هر ۵ دقیقه)
Schedule::command('patch:publish-scheduled')
    ->everyFiveMinutes()
    ->withoutOverlapping()
    ->runInBackground();

// منقضی کردن لایسنس‌هایی که تاریخشان گذشته است (هر ساعت)
Schedule::command('license:expire-due')
    ->hourly()
    ->withoutOverlapping();

// منقضی کردن کدهای یک‌بارمصرف گذشته از تاریخ (روزانه ۰۰:۳۰ UTC)
Schedule::command('license:expire-codes')
    ->dailyAt('00:30');

// پاکسازی لاگ‌ها بر اساس retention (روزانه ۰۱:۰۰ UTC)
Schedule::command('logs:prune')
    ->dailyAt('01:00')
    ->withoutOverlapping();
