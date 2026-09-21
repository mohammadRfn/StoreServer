<?php

declare(strict_types=1);

namespace Modules\Customer\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class CustomerRequest extends FormRequest
{
    public function authorize(): bool
    {
        return (bool) $this->user()?->hasPermission('customer.manage');
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'name'        => ['required', 'string', 'max:191'],
            'company'     => ['nullable', 'string', 'max:191'],
            'phone'       => ['nullable', 'string', 'max:20'],
            'email'       => ['nullable', 'email', 'max:191'],
            'national_id' => ['nullable', 'string', 'max:20'],
            'province'    => ['nullable', 'string', 'max:64'],
            'city'        => ['nullable', 'string', 'max:64'],
            'address'     => ['nullable', 'string', 'max:500'],
            'notes'       => ['nullable', 'string', 'max:2000'],
            'status'      => ['required', 'in:active,inactive'],
        ];
    }
}
