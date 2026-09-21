<?php

declare(strict_types=1);

namespace Modules\Plan\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class PlanRequest extends FormRequest
{
    public function authorize(): bool
    {
        return (bool) $this->user()?->hasPermission('plan.manage');
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        $plan = $this->route('plan');
        $planId = is_object($plan) ? $plan->getKey() : null;

        return [
            'code'             => ['required', 'string', 'max:64', 'regex:/^[a-z0-9_\-]+$/', Rule::unique('plans', 'code')->ignore($planId)],
            'name'             => ['required', 'string', 'max:128'],
            'description'      => ['nullable', 'string', 'max:500'],
            'price_irr'        => ['required', 'integer', 'min:0'],
            'default_duration' => ['required', 'in:monthly,yearly,permanent'],
            'is_active'        => ['sometimes', 'boolean'],
            'sort_order'       => ['sometimes', 'integer', 'min:0'],
            'modules'          => ['array'],
            'modules.*'        => ['integer', 'exists:gameshop_modules,id'],
            'limits'           => ['array'],
            'limits.*.key'     => ['required_with:limits', 'string', 'max:64'],
            'limits.*.value'   => ['nullable', 'integer', 'min:0'],
        ];
    }
}
