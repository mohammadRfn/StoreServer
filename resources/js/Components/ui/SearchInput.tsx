import { Search, X } from 'lucide-react';
import { Input, type InputProps } from './Field';

export function SearchInput({ value, onChange, onClear, ...rest }: Omit<InputProps, 'onChange' | 'value'> & { value: string; onChange: (v: string) => void; onClear?: () => void }) {
    return (
        <Input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            startIcon={<Search className="size-4" />}
            endIcon={
                value ? (
                    <button type="button" onClick={() => (onClear ? onClear() : onChange(''))} className="rounded p-0.5 hover:text-white">
                        <X className="size-3.5" />
                    </button>
                ) : undefined
            }
            {...rest}
        />
    );
}
