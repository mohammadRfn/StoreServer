<?php

declare(strict_types=1);

namespace Modules\Base\Console;

use Illuminate\Console\Command;
use Modules\Base\Services\SignerService;

// دستور تولید جفت‌کلید Ed25519 برای امضای توکن و پچ
class GenerateKeypairCommand extends Command
{
    protected $signature = 'licensing:generate-keypair
                            {--kid= : شناسه کلید؛ پیش‌فرض بر اساس تاریخ}
                            {--no-activate : کلید ساخته شود ولی فعال نشود}';

    protected $description = 'تولید جفت‌کلید Ed25519 و ثبت کلید عمومی در جدول signing_keys';

    public function handle(SignerService $signer): int
    {
        $kid = $this->option('kid');
        $kid = is_string($kid) && $kid !== '' ? $kid : null;

        $result = $signer->generateKeypair($kid, ! (bool) $this->option('no-activate'));

        $this->info('جفت‌کلید با موفقیت ساخته شد.');
        $this->table(['کلید', 'مقدار'], [
            ['kid', $result['kid']],
            ['public_key', $result['public_key']],
            ['private_key_path', $result['private_key_path']],
            ['public_key_path', $result['public_key_path']],
        ]);
        $this->warn('کلید خصوصی را خارج از webroot و با دسترسی 0600 نگهداری کنید و هرگز در دیتابیس ذخیره نکنید.');

        return self::SUCCESS;
    }
}
