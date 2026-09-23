<?php

declare(strict_types=1);

namespace Modules\ClientApi\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

// شکل بدنه مطابق Modules\AuditLog\Services\LogPayloadBuilder::build در گیم‌استور
class IngestLogsRequest extends FormRequest
{
    public function authorize(): bool
    {
        // احراز هویت واقعی روی میدلور client.sig + license.token انجام شده است
        return true;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        $maxLogs = (int) env('AUDIT_CLIENT_INGEST_MAX_LOGS', 500);

        return [
            'schema'               => ['required', 'string', 'max:16'],
            'batch'                => ['required', 'array'],
            'batch.uuid'           => ['required', 'uuid'],
            'batch.count'          => ['sometimes', 'integer', 'min:0'],
            'batch.checksum'       => ['sometimes', 'nullable', 'string', 'max:64'],

            'client'               => ['required', 'array'],
            'client.app_version'   => ['sometimes', 'nullable', 'string', 'max:32'],
            'client.fingerprint'   => ['sometimes', 'nullable', 'string', 'max:64'],

            'logs'                 => ['present', 'array', 'max:' . $maxLogs],
            'logs.*.uuid'          => ['required', 'uuid'],
            'logs.*.occurred_at'   => ['required', 'date'],
            'logs.*.channel'       => ['required', 'string', 'max:32'],
            'logs.*.level'         => ['required', 'string', 'max:16'],
            'logs.*.action'        => ['required', 'string', 'max:191'],
            'logs.*.description'   => ['sometimes', 'nullable', 'string'],

            'logs.*.entity'        => ['sometimes', 'array'],
            'logs.*.actor'         => ['sometimes', 'array'],
            'logs.*.request'       => ['sometimes', 'array'],
            'logs.*.changes'       => ['sometimes', 'array'],
            'logs.*.context'       => ['sometimes', 'array'],
            'logs.*.tags'          => ['sometimes', 'array'],
            'logs.*.source'        => ['sometimes', 'array'],
            'logs.*.integrity'     => ['sometimes', 'array'],
        ];
    }
}