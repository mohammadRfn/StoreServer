<?php

declare(strict_types=1);

namespace Modules\ClientApi\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class ActivationRequestRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'fingerprint'                    => ['required', 'string', 'size:64', 'regex:/^[a-f0-9]{64}$/i'],
            'customer_name'                  => ['nullable', 'string', 'max:191'],
            'customer_phone'                 => ['nullable', 'string', 'max:20'],
            'app_version'                    => ['required', 'string', 'max:32'],
            'system_info'                    => ['required', 'array'],
            'system_info.os'                 => ['nullable', 'string', 'max:128'],
            'system_info.os_version'         => ['nullable', 'string', 'max:64'],
            'system_info.cpu'                => ['nullable', 'string', 'max:191'],
            'system_info.motherboard_serial' => ['nullable', 'string', 'max:128'],
            'system_info.disk_serial'        => ['nullable', 'string', 'max:128'],
            'system_info.mac_address'        => ['nullable', 'string', 'max:64'],
            'system_info.ram_mb'             => ['nullable', 'integer', 'min:0'],
            'system_info.hostname'           => ['nullable', 'string', 'max:191'],
            'system_info.timezone'           => ['nullable', 'string', 'max:64'],
        ];
    }
}
