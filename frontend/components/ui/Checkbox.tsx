import React from 'react';
import { Check } from 'lucide-react';

interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
}

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
    ({ className = '', label, ...props }, ref) => {
        return (
            <label className="flex items-center space-x-2 cursor-pointer">
                <div className="relative">
                    <input
                        type="checkbox"
                        className="peer sr-only"
                        ref={ref}
                        {...props}
                    />
                    <div className={`
            h-4 w-4 rounded border border-slate-300 dark:border-slate-600
            bg-white dark:bg-slate-900 
            peer-focus-visible:ring-2 peer-focus-visible:ring-blue-500
            peer-checked:bg-blue-600 peer-checked:border-blue-600
            transition-colors
            ${className}
          `}>
                        <Check className="h-3 w-3 text-white hidden peer-checked:block" />
                    </div>
                </div>
                {label && <span className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">{label}</span>}
            </label>
        );
    }
);
Checkbox.displayName = "Checkbox";
