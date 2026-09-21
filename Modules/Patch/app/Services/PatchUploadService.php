<?php

declare(strict_types=1);

namespace Modules\Patch\Services;

use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;
use Modules\Audit\Services\AuditLogger;
use Modules\Base\Services\SignerService;
use Modules\Base\Support\Base64Url;
use Modules\Base\Support\SemVer;
use Modules\Patch\Models\Patch;
use ZipArchive;

// آپلود بسته پچ: اعتبارسنجی zip و manifest، جلوگیری از path traversal، امضای Ed25519
class PatchUploadService
{
    public function __construct(
        private readonly SignerService $signer,
        private readonly AuditLogger $audit,
    ) {}

    /** @param array{target_type?: string, plans?: array<int,int>, licenses?: array<int,int>, depends_on?: array<int,string>, is_mandatory?: bool} $options */
    public function upload(UploadedFile $file, array $options, ?User $actor = null): Patch
    {
        $manifest = $this->extractAndValidate($file);

        $disk = (string) config('licensing.patch.disk', 'patches');
        $sha256 = hash_file('sha256', $file->getRealPath());
        $patchCode = (string) $manifest['patch_id'];

        if (Patch::query()->where('patch_code', $patchCode)->exists()) {
            throw ValidationException::withMessages(['file' => "پچی با شناسه {$patchCode} قبلاً ثبت شده است."]);
        }

        $storedPath = Storage::disk($disk)->putFileAs(
            'packages/' . now()->utc()->format('Y/m'),
            $file,
            $patchCode . '.zip',
        );

        if ($storedPath === false) {
            throw ValidationException::withMessages(['file' => 'ذخیره فایل پچ روی دیسک خصوصی ناموفق بود.']);
        }

        // امضا روی هش بسته و manifest به صورت قطعی
        $signingInput = $sha256 . '.' . Base64Url::encodeJson($manifest);
        $signature = $this->signer->sign($signingInput);
        $kid = $this->signer->activeKid();

        return DB::transaction(function () use ($manifest, $patchCode, $storedPath, $file, $sha256, $signature, $kid, $disk, $options, $actor): Patch {
            $patch = Patch::query()->create([
                'patch_code'       => $patchCode,
                'title'            => (string) $manifest['title'],
                'description'      => $manifest['description'] ?? null,
                'type'             => (string) $manifest['type'],
                'from_min'         => (string) $manifest['from_min'],
                'from_min_code'    => SemVer::toCode((string) $manifest['from_min']),
                'from_max'         => (string) $manifest['from_max'],
                'from_max_code'    => SemVer::toCode((string) $manifest['from_max']),
                'to_version'       => (string) $manifest['to_version'],
                'to_version_code'  => SemVer::toCode((string) $manifest['to_version']),
                'requires_restart' => (bool) ($manifest['requires_restart'] ?? false),
                'is_mandatory'     => (bool) ($options['is_mandatory'] ?? false),
                'status'           => 'draft',
                'target_type'      => $options['target_type'] ?? 'all',
                'file_disk'        => $disk,
                'file_path'        => $storedPath,
                'file_name'        => $file->getClientOriginalName(),
                'file_size'        => (int) $file->getSize(),
                'file_sha256'      => (string) $sha256,
                'manifest'         => $manifest,
                'signature'        => $signature,
                'signing_kid'      => $kid,
                'uploaded_by'      => $actor?->getKey(),
            ]);

            foreach ($manifest['files'] ?? [] as $entry) {
                $patch->files()->create([
                    'path'   => (string) $entry['path'],
                    'action' => (string) $entry['action'],
                    'sha256' => $entry['sha256'] ?? null,
                    'size'   => isset($entry['size']) ? (int) $entry['size'] : null,
                ]);
            }

            foreach (array_values($manifest['sql_scripts'] ?? []) as $index => $script) {
                $patch->scripts()->create([
                    'order_no'  => (int) ($script['order'] ?? $index + 1),
                    'file_name' => (string) $script['file'],
                    'checksum'  => (string) $script['checksum'],
                ]);
            }

            if (($options['target_type'] ?? 'all') === 'plans') {
                $patch->targetPlans()->sync(array_map('intval', $options['plans'] ?? []));
            }

            if (($options['target_type'] ?? 'all') === 'licenses') {
                $patch->targetLicenses()->sync(array_map('intval', $options['licenses'] ?? []));
            }

            if (! empty($options['depends_on'])) {
                $ids = Patch::query()->whereIn('patch_code', $options['depends_on'])->pluck('id')->all();
                $patch->dependencies()->sync($ids);
            }

            $this->audit->log('patch.upload', 'آپلود بسته پچ', 'Patch', $patch->getKey(), null, [
                'patch_code' => $patch->patch_code,
                'sha256'     => $patch->file_sha256,
            ]);

            return $patch;
        });
    }

    /**
     * استخراج و اعتبارسنجی manifest.json داخل zip.
     *
     * @return array<string, mixed>
     */
    public function extractAndValidate(UploadedFile $file): array
    {
        $maxBytes = ((int) config('licensing.patch.max_upload_mb', 512)) * 1024 * 1024;

        if ($file->getSize() > $maxBytes) {
            throw ValidationException::withMessages(['file' => 'حجم فایل از حد مجاز بیشتر است.']);
        }

        $zip = new ZipArchive;

        if ($zip->open((string) $file->getRealPath()) !== true) {
            throw ValidationException::withMessages(['file' => 'فایل zip معتبر نیست.']);
        }

        $raw = $zip->getFromName('manifest.json');

        if ($raw === false) {
            $zip->close();
            throw ValidationException::withMessages(['file' => 'فایل manifest.json در بسته یافت نشد.']);
        }

        // بررسی همه ورودی‌های zip برای path traversal و مسیر مطلق
        for ($i = 0; $i < $zip->numFiles; $i++) {
            $name = (string) $zip->getNameIndex($i);
            $this->assertSafePath($name);
        }

        $zip->close();

        $manifest = json_decode($raw, true);

        if (! is_array($manifest)) {
            throw ValidationException::withMessages(['file' => 'ساختار manifest.json معتبر نیست.']);
        }

        $this->validateManifest($manifest);

        return $manifest;
    }

    /** @param array<string, mixed> $manifest */
    private function validateManifest(array $manifest): void
    {
        foreach (['patch_id', 'title', 'type', 'from_min', 'from_max', 'to_version'] as $key) {
            if (! isset($manifest[$key]) || $manifest[$key] === '') {
                throw ValidationException::withMessages(['file' => "کلید {$key} در manifest الزامی است."]);
            }
        }

        if (! in_array($manifest['type'], ['files', 'database', 'both'], true)) {
            throw ValidationException::withMessages(['file' => 'مقدار type در manifest نامعتبر است.']);
        }

        foreach (['from_min', 'from_max', 'to_version'] as $key) {
            if (! SemVer::isValid((string) $manifest[$key])) {
                throw ValidationException::withMessages(['file' => "نسخه {$key} باید semver باشد."]);
            }
        }

        if (SemVer::toCode((string) $manifest['from_min']) > SemVer::toCode((string) $manifest['from_max'])) {
            throw ValidationException::withMessages(['file' => 'بازه نسخه پایه نامعتبر است.']);
        }

        if (SemVer::toCode((string) $manifest['to_version']) <= SemVer::toCode((string) $manifest['from_min'])) {
            throw ValidationException::withMessages(['file' => 'نسخه مقصد باید بزرگ‌تر از کمینه نسخه پایه باشد.']);
        }

        foreach ($manifest['files'] ?? [] as $entry) {
            if (! isset($entry['path'], $entry['action'])) {
                throw ValidationException::withMessages(['file' => 'ساختار فهرست فایل‌ها ناقص است.']);
            }

            if (! in_array($entry['action'], ['add', 'replace', 'delete'], true)) {
                throw ValidationException::withMessages(['file' => 'عمل فایل نامعتبر است.']);
            }

            if ($entry['action'] !== 'delete' && ! preg_match('/^[a-f0-9]{64}$/i', (string) ($entry['sha256'] ?? ''))) {
                throw ValidationException::withMessages(['file' => "هش SHA-256 فایل {$entry['path']} نامعتبر است."]);
            }

            $this->assertSafePath((string) $entry['path'], true);
        }

        foreach ($manifest['sql_scripts'] ?? [] as $script) {
            if (! isset($script['file'], $script['checksum'])) {
                throw ValidationException::withMessages(['file' => 'ساختار اسکریپت‌های SQL ناقص است.']);
            }

            if (! preg_match('/^[a-f0-9]{64}$/i', (string) $script['checksum'])) {
                throw ValidationException::withMessages(['file' => 'checksum اسکریپت SQL نامعتبر است.']);
            }

            $this->assertSafePath((string) $script['file']);
        }

        if (in_array($manifest['type'], ['database', 'both'], true) && empty($manifest['sql_scripts'])) {
            throw ValidationException::withMessages(['file' => 'پچ دیتابیسی باید حداقل یک اسکریپت SQL داشته باشد.']);
        }
    }

    // رد مسیر مطلق، path traversal و مسیر خارج از پوشه‌های مجاز
    private function assertSafePath(string $path, bool $enforceRoots = false): void
    {
        $normalized = str_replace('\\', '/', $path);

        if ($normalized === '' || str_starts_with($normalized, '/') || preg_match('/^[a-zA-Z]:/', $normalized) === 1) {
            throw ValidationException::withMessages(['file' => "مسیر مطلق مجاز نیست: {$path}"]);
        }

        if (str_contains($normalized, '..') || str_contains($normalized, "\0")) {
            throw ValidationException::withMessages(['file' => "مسیر نامعتبر است: {$path}"]);
        }

        if ($enforceRoots) {
            $allowed = (array) config('licensing.patch.allowed_roots', []);
            $root = explode('/', $normalized)[0];

            if (! in_array($root, $allowed, true)) {
                throw ValidationException::withMessages(['file' => "مسیر خارج از پوشه‌های مجاز است: {$path}"]);
            }
        }
    }
}
