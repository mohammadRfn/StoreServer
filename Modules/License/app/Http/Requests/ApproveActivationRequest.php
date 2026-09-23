<?php

declare(strict_types=1);

namespace Modules\License\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class ApproveActivationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return (bool) $this->user()?->hasPermission('license.approve');
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            // اختیاری: اگر خالی بماند، مشابه تولید آزاد کد، بدون مشتری از پیش‌تعیین‌شده صادر می‌شود
            'customer_id'   => ['nullable', 'integer', 'exists:customers,id'],
            'plan_id'       => ['required', 'integer', 'exists:plans,id'],
            'duration_type' => ['required', 'in:monthly,yearly,permanent'],
            'ttl_days'      => ['nullable', 'integer', 'min:1', 'max:3650'],
        ];
    }
}