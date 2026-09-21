<?php

declare(strict_types=1);

namespace Modules\Patch\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UploadPatchRequest extends FormRequest
{
    public function authorize(): bool
    {
        return (bool) $this->user()?->hasPermission('patch.upload');
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        $maxKb = ((int) config('licensing.patch.max_upload_mb', 512)) * 1024;

        return [
            // حجم مجاز باید با upload_max_filesize و post_max_size در php.ini هماهنگ باشد
            'file'         => ['required', 'file', 'mimes:zip', "max:{$maxKb}"],
            'target_type'  => ['required', 'in:all,plans,licenses'],
            'is_mandatory' => ['sometimes', 'boolean'],
            'plans'        => ['array', 'required_if:target_type,plans'],
            'plans.*'      => ['integer', 'exists:plans,id'],
            'licenses'     => ['array', 'required_if:target_type,licenses'],
            'licenses.*'   => ['integer', 'exists:licenses,id'],
            'depends_on'   => ['array'],
            'depends_on.*' => ['string', 'exists:patches,patch_code'],
        ];
    }
}
