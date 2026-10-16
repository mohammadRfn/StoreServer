<?php

declare(strict_types=1);

namespace Modules\Audit\Http\Controllers;

use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Routing\Controller;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;
use Modules\Audit\Services\AuditLogger;
use Modules\Audit\Services\EvidenceReportBuilder;
use Modules\Audit\Services\EvidenceRepository;
use Modules\License\Models\License;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use ZipArchive;

class EvidenceController extends Controller
{
    public function __construct(
        private readonly EvidenceReportBuilder $builder,
        private readonly EvidenceRepository $repo,
        private readonly AuditLogger $audit,
    ) {}

    // GET /panel/licenses/{license}/evidence
    public function index(License $license): InertiaResponse
    {
        $license->loadMissing(['customer:id,uuid,name', 'device:id,license_id,hostname,fingerprint']);

        return Inertia::render('Admin/Evidence/Index', [
            'license' => $license->only(['id', 'uuid', 'status']) + [
                'customer' => $license->customer?->only(['uuid', 'name']),
                'device'   => $license->device?->only(['hostname', 'fingerprint']),
            ],
            'reports' => $this->repo->list($license),
        ]);
    }

    // POST /panel/licenses/{license}/evidence
    public function store(Request $request, License $license): RedirectResponse
    {
        $data = $request->validate([
            'title'     => ['required', 'string', 'max:191'],
            'reference' => ['nullable', 'string', 'max:191'],
            'notes'     => ['nullable', 'string', 'max:5000'],
        ]);

        $id     = (string) Str::uuid();
        $report = $this->builder->build($license, $request->user(), $id, $data);
        $saved  = $this->repo->save($license, $report);

        // زنجیره‌ی نگهداری مدرک: هش لحظه‌ی تولید در جدول فقط‌افزودنی ثبت می‌شود
        $this->audit->log(
            'evidence.generate',
            'تولید گزارش مدرک لایسنس',
            'License',
            (int) $license->getKey(),
            null,
            ['report_id' => $id, 'sha256' => $saved['sha256'], 'bytes' => $saved['bytes'], 'title' => $data['title'], 'reference' => $data['reference'] ?? null],
        );

        return redirect()->route('admin.evidence.show', [$license->uuid, $id]);
    }

    // GET /panel/licenses/{license}/evidence/{report}
    public function show(License $license, string $report): InertiaResponse
    {
        return Inertia::render('Admin/Evidence/Show', $this->payload($license, $report));
    }

    // GET /panel/licenses/{license}/evidence/{report}/print
    public function print(License $license, string $report): InertiaResponse
    {
        return Inertia::render('Admin/Evidence/Print', $this->payload($license, $report));
    }

    // GET /panel/licenses/{license}/evidence/{report}/download/{format}
    public function download(License $license, string $report, string $format): Response|BinaryFileResponse
    {
        $found = $this->repo->find($license, $report) ?? abort(404);

        // فایلی که با هش ثبت‌شده نمی‌خواند، به‌عنوان مدرک تحویل داده نمی‌شود
        if (! $found['integrity']['file_ok'] || $found['integrity']['log_ok'] === false) {
            abort(409, 'فایل این گزارش با هش ثبت‌شده مطابقت ندارد و قابل دانلود نیست.');
        }

        $sha  = (string) $found['integrity']['sha256'];
        $base = 'evidence-' . Str::substr($license->uuid, 0, 8) . '-' . Str::substr($report, 0, 8);

        $this->audit->log('evidence.download', 'دانلود گزارش مدرک لایسنس', 'License', (int) $license->getKey(), null, [
            'report_id' => $report, 'format' => $format, 'sha256' => $sha,
        ]);

        if ($format === 'json') {
            return response($found['raw'], 200, [
                'Content-Type'        => 'application/json; charset=UTF-8',
                'Content-Disposition' => "attachment; filename=\"{$base}.json\"",
                'X-Evidence-SHA256'   => $sha,
            ]);
        }

        if (! class_exists(ZipArchive::class)) {
            abort(501, 'افزونه‌ی zip در PHP سرور فعال نیست؛ فرمت JSON را دانلود کنید.');
        }

        return $this->zip($found['report'], $found['raw'], $sha, $base);
    }

    /** @return array<string, mixed> */
    private function payload(License $license, string $report): array
    {
        $found = $this->repo->find($license, $report) ?? abort(404);

        return [
            'license' => ['uuid' => $license->uuid, 'status' => $license->status],
            'report'  => $found['report'],
            'integrity' => $found['integrity'],
        ];
    }

    /**
     * بسته‌ی تحویل: report.json (بایت‌به‌بایت همان فایل هش‌شده) + CSV ها + SHA256SUMS + راهنمای راستی‌آزمایی.
     *
     * @param array<string, mixed> $report
     */
    private function zip(array $report, string $raw, string $sha, string $base): BinaryFileResponse
    {
        $files = [
            'report.json'   => $raw,
            'ip-addresses.csv' => $this->csv(
                ['ip', 'is_public', 'first_seen_utc', 'last_seen_utc', 'total_hits', 'heartbeat', 'api', 'license_event', 'security', 'activation'],
                array_map(static fn (array $r): array => [
                    $r['ip'], $r['is_public'] ? 'yes' : 'no', $r['first_seen'], $r['last_seen'], $r['hits'],
                    $r['by_source']['heartbeat'] ?? 0, $r['by_source']['api'] ?? 0, $r['by_source']['license_event'] ?? 0,
                    $r['by_source']['security'] ?? 0, $r['by_source']['activation'] ?? 0,
                ], (array) ($report['ip_addresses'] ?? [])),
            ),
            'timeline.csv' => $this->csv(
                ['at_utc', 'source', 'type', 'severity', 'ip', 'actor', 'message'],
                array_map(static fn (array $r): array => [$r['at'], $r['source'], $r['type'], $r['severity'], $r['ip'], $r['actor'], $r['message']], (array) ($report['timeline']['rows'] ?? [])),
            ),
        ];

        $sums = '';
        foreach ($files as $name => $content) {
            $sums .= hash('sha256', $content) . '  ' . $name . "\n";
        }
        $files['SHA256SUMS.txt'] = $sums;

        $files['README.txt'] = "گزارش مدرک StoreServer\n"
            . "شناسه گزارش: {$report['meta']['report_id']}\n"
            . "تاریخ تولید (UTC): {$report['meta']['generated_at']}\n"
            . "SHA-256 فایل report.json: {$sha}\n\n"
            . "راستی‌آزمایی:\n"
            . "  Windows (PowerShell):  Get-FileHash .\\report.json -Algorithm SHA256\n"
            . "  Linux/macOS:           sha256sum -c SHA256SUMS.txt\n"
            . "مقدار خروجی باید دقیقاً با هش بالا و هش ثبت‌شده در پنل یکی باشد.\n";

        $tmp = tempnam(sys_get_temp_dir(), 'evd');
        $zip = new ZipArchive();

        if ($zip->open($tmp, ZipArchive::OVERWRITE) !== true) {
            abort(500, 'ساخت فایل ZIP ممکن نشد.');
        }

        foreach ($files as $name => $content) {
            $zip->addFromString($name, $content);
        }

        $zip->close();

        return response()->download($tmp, "{$base}.zip", [
            'Content-Type'      => 'application/zip',
            'X-Evidence-SHA256' => $sha,
        ])->deleteFileAfterSend(true);
    }

    /**
     * @param list<string> $header
     * @param list<list<mixed>> $rows
     */
    private function csv(array $header, array $rows): string
    {
        $h = fopen('php://temp', 'w+');
        fwrite($h, "\xEF\xBB\xBF"); // BOM تا Excel فارسی را درست باز کند
        fputcsv($h, $header);

        foreach ($rows as $row) {
            // جلوگیری از CSV/Formula injection در Excel
            fputcsv($h, array_map(static function ($v) {
                $v = is_scalar($v) || $v === null ? (string) $v : json_encode($v, JSON_UNESCAPED_UNICODE);

                return $v !== '' && str_contains('=+-@', $v[0]) ? "'" . $v : $v;
            }, $row));
        }

        rewind($h);
        $out = (string) stream_get_contents($h);
        fclose($h);

        return $out;
    }
}