/* -------------------------------------------------------------------------- */
/*  Shared TypeScript types – mirror of Eloquent models in StoreServer        */
/* -------------------------------------------------------------------------- */

export type ID = number;
export type ISODate = string;

export type DurationType = 'monthly' | 'yearly' | 'permanent';
export type LicenseStatus = 'unactivated' | 'active' | 'suspended' | 'expired' | 'revoked';
export type CustomerStatus = 'active' | 'inactive';
export type ActivationStatus = 'pending' | 'approved' | 'rejected';
export type CodeStatus = 'active' | 'used' | 'expired' | 'revoked';
export type PatchStatus = 'draft' | 'scheduled' | 'published' | 'withdrawn';
export type PatchTargetType = 'all' | 'plans' | 'licenses';
export type DevicePatchState = 'offered' | 'downloading' | 'applied' | 'failed' | 'skipped';
export type LogCategory = 'audit' | 'license' | 'heartbeat' | 'device' | 'security' | 'api' | 'error' | 'patch';

/* ------------------------------ Pagination ------------------------------- */

export interface PaginationLink {
    url: string | null;
    label: string;
    active: boolean;
}

export interface Paginated<T> {
    data: T[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number | null;
    to: number | null;
    first_page_url: string;
    last_page_url: string;
    next_page_url: string | null;
    prev_page_url: string | null;
    path: string;
    links: PaginationLink[];
}

/* --------------------------------- Auth ---------------------------------- */

export interface Permission {
    id: ID;
    name: string;
    title: string;
    group: string;
}

export interface Role {
    id: ID;
    name: string;
    title: string;
    description?: string | null;
    is_system: boolean;
    permissions?: Permission[];
    created_at?: ISODate;
}

export interface AuthUser {
    id: ID;
    name: string;
    email: string;
    phone?: string | null;
    is_active: boolean;
    last_login_at?: ISODate | null;
    last_login_ip?: string | null;
    roles: string[];
    permissions: string[];
    is_super_admin: boolean;
}

export interface AdminUser {
    id: ID;
    name: string;
    email: string;
    phone?: string | null;
    is_active: boolean;
    last_login_at?: ISODate | null;
    last_login_ip?: string | null;
    roles: Pick<Role, 'id' | 'name' | 'title'>[];
    created_at: ISODate;
}

/* ------------------------------ Domain models ---------------------------- */

export interface Customer {
    id: ID;
    uuid: string;
    name: string;
    company?: string | null;
    phone?: string | null;
    email?: string | null;
    national_id?: string | null;
    province?: string | null;
    city?: string | null;
    address?: string | null;
    notes?: string | null;
    status: CustomerStatus;
    licenses_count?: number;
    licenses?: License[];
    created_at: ISODate;
    updated_at: ISODate;
}

export interface GameshopModule {
    id: ID;
    key: string;
    title: string;
    description?: string | null;
    is_core: boolean;
    is_active: boolean;
    sort_order: number;
}

export interface PlanLimit {
    id?: ID;
    plan_id?: ID;
    limit_key: string;
    limit_value: number | null;
}

export interface Plan {
    id: ID;
    code: string;
    name: string;
    description?: string | null;
    price_irr: number;
    default_duration: DurationType;
    is_active: boolean;
    sort_order: number;
    modules?: Pick<GameshopModule, 'id' | 'key' | 'title'>[];
    limits?: PlanLimit[];
    licenses_count?: number;
    created_at?: ISODate;
}

export interface Device {
    id: ID;
    license_id: ID;
    fingerprint: string;
    hostname?: string | null;
    os?: string | null;
    os_version?: string | null;
    cpu?: string | null;
    motherboard_serial?: string | null;
    disk_serial?: string | null;
    mac_address?: string | null;
    ram_mb?: number | null;
    timezone?: string | null;
    app_version?: string | null;
    app_version_code?: number | null;
    last_ip?: string | null;
    system_info?: Record<string, unknown> | null;
    first_seen_at?: ISODate | null;
    last_heartbeat_at?: ISODate | null;
    license?: License;
    patch_statuses?: DevicePatchStatus[];
    created_at?: ISODate;
}

export interface LicenseModuleOverride {
    id: ID;
    license_id: ID;
    module_id: ID;
    enabled: boolean;
    reason?: string | null;
    module?: Pick<GameshopModule, 'id' | 'key' | 'title'>;
    created_at: ISODate;
}

export interface LicensePlanHistory {
    id: ID;
    license_id: ID;
    action: string;
    from_plan_id?: ID | null;
    to_plan_id?: ID | null;
    from_expires_at?: ISODate | null;
    to_expires_at?: ISODate | null;
    performed_by?: ID | null;
    note?: string | null;
    from_plan?: Pick<Plan, 'id' | 'code'> | null;
    to_plan?: Pick<Plan, 'id' | 'code'> | null;
    performer?: { id: ID; name: string } | null;
    created_at: ISODate;
}

export interface License {
    id: ID;
    uuid: string;
    customer_id: ID;
    plan_id: ID;
    status: LicenseStatus;
    duration_type: DurationType;
    activated_at?: ISODate | null;
    expires_at?: ISODate | null;
    suspended_at?: ISODate | null;
    suspend_reason?: string | null;
    revoked_at?: ISODate | null;
    revoke_reason?: string | null;
    last_seen_at?: ISODate | null;
    note?: string | null;
    issued_by?: ID | null;
    customer?: Pick<Customer, 'id' | 'uuid' | 'name'> & Partial<Customer>;
    plan?: Pick<Plan, 'id' | 'code' | 'name'> & Partial<Plan>;
    device?: Pick<Device, 'id' | 'license_id' | 'fingerprint' | 'app_version' | 'last_heartbeat_at'> & Partial<Device>;
    module_overrides?: LicenseModuleOverride[];
    history?: LicensePlanHistory[];
    created_at: ISODate;
    updated_at?: ISODate;
}

export interface ActivationRequest {
    id: ID;
    uuid: string;
    fingerprint: string;
    customer_name?: string | null;
    customer_phone?: string | null;
    app_version?: string | null;
    app_version_code?: number | null;
    system_info?: Record<string, unknown> | null;
    request_ip?: string | null;
    status: ActivationStatus;
    license_id?: ID | null;
    reviewed_by?: ID | null;
    reviewed_at?: ISODate | null;
    reject_reason?: string | null;
    license?: Pick<License, 'id' | 'uuid'> | null;
    reviewer?: { id: ID; name: string } | null;
    created_at: ISODate;
}

export interface LicenseCode {
    id: ID;
    code_prefix: string;
    customer_id?: ID | null;
    plan_id: ID;
    duration_type: DurationType;
    status: CodeStatus;
    expires_at?: ISODate | null;
    used_at?: ISODate | null;
    used_license_id?: ID | null;
    used_fingerprint?: string | null;
    created_by?: ID | null;
    plan?: Pick<Plan, 'id' | 'code' | 'name'>;
    customer?: Pick<Customer, 'id' | 'name'> | null;
    license?: Pick<License, 'id' | 'uuid'> | null;
    creator?: { id: ID; name: string } | null;
    created_at: ISODate;
}

export interface PatchFile {
    id: ID;
    patch_id: ID;
    path: string;
    action: 'add' | 'update' | 'delete' | string;
    sha256: string;
    size: number;
}

export interface PatchScript {
    id: ID;
    patch_id: ID;
    order_no: number;
    file_name: string;
    checksum: string;
}

export interface DevicePatchStatus {
    id: ID;
    device_id: ID;
    patch_id: ID;
    status: DevicePatchState;
    attempts: number;
    failure_count: number;
    is_blocked: boolean;
    error_message?: string | null;
    version_before?: string | null;
    version_after?: string | null;
    offered_at?: ISODate | null;
    applied_at?: ISODate | null;
    last_reported_at?: ISODate | null;
    device?: Pick<Device, 'id' | 'fingerprint' | 'hostname' | 'app_version'>;
    patch?: Pick<Patch, 'id' | 'patch_code' | 'title' | 'to_version'>;
}

export interface Patch {
    id: ID;
    uuid: string;
    patch_code: string;
    title: string;
    description?: string | null;
    type?: string | null;
    from_min?: string | null;
    from_max?: string | null;
    to_version: string;
    to_version_code?: number;
    requires_restart: boolean;
    is_mandatory: boolean;
    status: PatchStatus;
    target_type: PatchTargetType;
    scheduled_at?: ISODate | null;
    published_at?: ISODate | null;
    withdrawn_at?: ISODate | null;
    file_name?: string | null;
    file_size?: number | null;
    file_sha256?: string | null;
    signing_kid?: string | null;
    manifest?: Record<string, unknown> | null;
    uploader?: { id: ID; name: string } | null;
    target_plans?: Pick<Plan, 'id' | 'code' | 'name'>[];
    target_licenses?: Pick<License, 'id' | 'uuid'>[];
    files?: PatchFile[];
    scripts?: PatchScript[];
    dependencies?: Pick<Patch, 'id' | 'patch_code' | 'title'>[];
    device_statuses?: DevicePatchStatus[];
    device_statuses_count?: number;
    downloads_count?: number;
    created_at: ISODate;
}

export interface ServerSetting {
    id: ID;
    key: string;
    value: string | null;
    type: 'string' | 'int' | 'integer' | 'bool' | 'boolean' | 'json' | string;
    group: string;
    description?: string | null;
    is_public: boolean;
}

export interface SigningKey {
    id: ID;
    kid: string;
    algorithm: string;
    status: 'active' | 'retired' | 'pending' | string;
    activated_at?: ISODate | null;
    retired_at?: ISODate | null;
}

/* ------------------------------ Log rows --------------------------------- */

export interface LogRow {
    id: ID;
    created_at: ISODate;
    [key: string]: unknown;
}

/* ------------------------------ Dashboard -------------------------------- */

export interface DashboardStats {
    licenses: { total: number; active: number; suspended: number; expiring_soon: number };
    customers: { total: number; active: number };
    devices: { total: number; online: number };
    activation_requests: { pending: number };
    patches: { published: number; draft: number };
    security_events_24h: number;
    recent_licenses?: License[];
    recent_requests?: ActivationRequest[];
    heartbeat_series?: { day: string; count: number }[];
}

/* ------------------------------ Inertia props ---------------------------- */

export interface FlashProps {
    success?: string | null;
    error?: string | null;
    warning?: string | null;
    info?: string | null;
    plain_codes?: string[] | null;
}

export interface SharedProps {
    app: { name: string; version?: string; env?: string };
    auth: { user: AuthUser | null };
    flash: FlashProps;
    ziggy?: unknown;
    errors: Record<string, string>;
    [key: string]: unknown;
}

export type PageProps<T = Record<string, unknown>> = SharedProps & T;
