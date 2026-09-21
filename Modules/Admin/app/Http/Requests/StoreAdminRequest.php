<?php

declare(strict_types=1);

namespace Modules\Admin\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreAdminRequest extends FormRequest
{
    public function authorize(): bool
    {
        return (bool) $this->user()?->hasPermission('admin.manage');
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        $adminId = $this->route('admin');
        $adminId = is_object($adminId) ? $adminId->getKey() : $adminId;

        return [
            'name'      => ['required', 'string', 'max:191'],
            'email'     => ['required', 'email', 'max:191', Rule::unique('users', 'email')->ignore($adminId)],
            'phone'     => ['nullable', 'string', 'max:20'],
            'password'  => [$this->isMethod('post') ? 'required' : 'nullable', 'string', 'min:8', 'max:255'],
            'is_active' => ['sometimes', 'boolean'],
            'roles'     => ['array'],
            'roles.*'   => ['integer', 'exists:roles,id'],
        ];
    }
}
