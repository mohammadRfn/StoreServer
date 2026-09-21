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
            'customer_id'   => ['required', 'integer', 'exists:customers,id'],
            'plan_id'       => ['required', 'integer', 'exists:plans,id'],
            'duration_type' => ['required', 'in:monthly,yearly,permanent'],
        ];
    }
}
