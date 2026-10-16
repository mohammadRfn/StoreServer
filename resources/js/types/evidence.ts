export interface EvidenceIp {
    ip: string;
    is_public: boolean;
    first_seen: string | null;
    last_seen: string | null;
    hits: number;
    by_source: Record<string, number>;
}

export interface EvidenceTimelineRow {
    at: string;
    source: string;
    type: string;
    severity: string | null;
    ip: string | null;
    actor: string | null;
    message: string | null;
}

export interface EvidenceSecurityRow {
    at: string;
    type: string;
    severity: string;
    ip: string | null;
    endpoint: string | null;
    fingerprint: string | null;
    message: string | null;
    context: Record<string, unknown> | null;
}

export interface EvidenceHeartbeatRow {
    at: string;
    ip: string | null;
    app_version: string | null;
    license_status: string | null;
    plan_code: string | null;
    duration_ms: number | null;
}

export interface EvidenceActivation {
    uuid: string;
    status: string;
    customer_name: string | null;
    customer_phone: string | null;
    request_ip: string | null;
    fingerprint: string;
    app_version: string | null;
    system_info: Record<string, unknown> | null;
    created_at: string;
    reviewed_at: string | null;
    reviewed_by: string | null;
    reject_reason: string | null;
}

export interface EvidenceAdminAction {
    at: string;
    action: string;
    description: string | null;
    user_name: string | null;
    ip: string | null;
}

export interface EvidenceDevice {
    fingerprint: string;
    hostname: string | null;
    os: string | null;
    os_version: string | null;
    cpu: string | null;
    ram_mb: number | null;
    motherboard_serial: string | null;
    disk_serial: string | null;
    mac_address: string | null;
    timezone: string | null;
    app_version: string | null;
    last_ip: string | null;
    first_seen_at: string | null;
    last_heartbeat_at: string | null;
    system_info: Record<string, unknown> | null;
}

export interface EvidenceReport {
    meta: {
        report_id: string;
        generated_at: string;
        generated_by: { id: number; name: string; email: string | null } | null;
        case: { title: string; reference: string | null; notes: string | null };
        notes: string[];
    };
    summary: {
        distinct_ips: number;
        public_ips: number;
        first_seen_at: string | null;
        last_seen_at: string | null;
        heartbeats_total: number;
        security_total: number;
        security_critical: number;
        api_failures_total: number;
        activation_attempts: number;
        chain_status: string | null;
    };
    license: {
        uuid: string;
        status: string;
        plan: { code: string; name: string } | null;
        duration_type: string;
        created_at: string | null;
        activated_at: string | null;
        expires_at: string | null;
        suspended_at: string | null;
        suspend_reason: string | null;
        revoked_at: string | null;
        revoke_reason: string | null;
        last_seen_at: string | null;
        issued_by: string | null;
        note: string | null;
    };
    customer: {
        uuid: string;
        name: string;
        company: string | null;
        phone: string | null;
        email: string | null;
        national_id: string | null;
        province: string | null;
        city: string | null;
        address: string | null;
    } | null;
    device: EvidenceDevice | null;
    activation_requests: EvidenceActivation[];
    ip_addresses: EvidenceIp[];
    heartbeats: { total: number; first_at: string | null; last_at: string | null; versions: string[]; first: EvidenceHeartbeatRow[]; recent: EvidenceHeartbeatRow[] };
    api_requests: {
        total: number;
        failures_total: number;
        by_status: Record<string, number>;
        failures: { at: string; ip: string | null; method: string | null; path: string | null; status_code: number; error_code: string | null; user_agent: string | null }[];
    };
    security_events: { total: number; critical: number; rows: EvidenceSecurityRow[] };
    client_logs: {
        total: number;
        first_sequence: number | null;
        last_sequence: number | null;
        last_hash: string | null;
        first_at: string | null;
        last_at: string | null;
        by_channel: Record<string, number>;
        chain: { status: string; reason: string | null; broken_sequence: number | null; missing_from: number | null; verified_at: string | null } | null;
        security_sample: { at: string; sequence: number; level: string; action: string; description: string | null; actor_name: string | null; ip: string | null; route: string | null }[];
    };
    plan_history: { at: string; action: string; from_plan: string | null; to_plan: string | null; performed_by: string | null; note: string | null }[];
    admin_actions: EvidenceAdminAction[];
    timeline: { total: number; rows: EvidenceTimelineRow[] };
}

export interface EvidenceIntegrity {
    sha256: string;
    bytes: number;
    stored_sha256: string | null;
    logged_sha256: string | null;
    file_ok: boolean;
    log_ok: boolean | null;
}

export const evidenceSource: Record<string, string> = {
    heartbeat: 'ضربان (heartbeat)',
    api: 'درخواست API',
    license_event: 'رویداد لایسنس',
    security: 'رویداد امنیتی',
    activation: 'فعال‌سازی',
    device: 'آخرین IP دستگاه',
    admin: 'اقدام مدیر',
    plan_history: 'تاریخچه پلن',
};

export function evidenceVerified(i: EvidenceIntegrity): boolean {
    return i.file_ok && i.log_ok !== false;
}