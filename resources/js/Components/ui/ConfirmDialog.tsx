import { AlertTriangle } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Button } from './Button';
import { Field, Textarea } from './Field';
import { Modal } from './Modal';

interface ConfirmDialogProps {
    open: boolean;
    onClose: () => void;
    onConfirm: (reason?: string) => void;
    title: ReactNode;
    description?: ReactNode;
    confirmLabel?: string;
    tone?: 'danger' | 'primary' | 'success';
    loading?: boolean;
    withReason?: boolean;
    reasonLabel?: string;
    reasonError?: string;
}

export function ConfirmDialog({
    open,
    onClose,
    onConfirm,
    title,
    description,
    confirmLabel = 'تأیید',
    tone = 'danger',
    loading,
    withReason,
    reasonLabel = 'دلیل',
    reasonError,
}: ConfirmDialogProps) {
    const [reason, setReason] = useState('');

    return (
        <Modal
            open={open}
            onClose={onClose}
            size="sm"
            footer={
                <>
                    <Button variant="ghost" onClick={onClose} disabled={loading}>
                        انصراف
                    </Button>
                    <Button variant={tone} loading={loading} onClick={() => onConfirm(withReason ? reason : undefined)} disabled={withReason && reason.trim().length === 0}>
                        {confirmLabel}
                    </Button>
                </>
            }
        >
            <div className="flex gap-4 py-2">
                <div className={`grid size-11 shrink-0 place-items-center rounded-xl ${tone === 'danger' ? 'bg-rose-500/10 text-rose-400' : 'bg-amber-500/10 text-amber-400'}`}>
                    <AlertTriangle className="size-5" />
                </div>
                <div className="flex-1 space-y-3">
                    <div>
                        <h3 className="text-base font-semibold text-white">{title}</h3>
                        {description && <p className="mt-1 text-sm leading-6 text-neutral-400">{description}</p>}
                    </div>
                    {withReason && (
                        <Field label={reasonLabel} required error={reasonError}>
                            <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} maxLength={255} autoFocus placeholder="حداکثر ۲۵۵ کاراکتر" />
                        </Field>
                    )}
                </div>
            </div>
        </Modal>
    );
}
