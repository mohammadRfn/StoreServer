<?php

declare(strict_types=1);

namespace Modules\Admin\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreRoleRequest extends FormRequest
{
    public function authorize(): bool
    {
        return (bool) $this->user()?->hasPermission('admin.manage');
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        $roleId = $this->route('role');
        $roleId = is_object($roleId) ? $roleId->getKey() : $roleId;

        return [
            'name'          => ['required', 'string', 'max:64', 'regex:/^[a-z_]+$/', Rule::unique('roles', 'name')->ignore($roleId)],
            'title'         => ['required', 'string', 'max:128'],
            'description'   => ['nullable', 'string', 'max:255'],
            'permissions'   => ['array'],
            'permissions.*' => ['integer', 'exists:permissions,id'],
        ];
    }
}
