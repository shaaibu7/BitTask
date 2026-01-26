import React from 'react';

interface SwitchProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
}

export const Switch = React.forwardRef<HTMLInputElement, SwitchProps>(
    ({ className = '', label, ...props }, ref) => {
        return (
            <label className={`inline-flex items-center cursor-pointer ${className}`}>
                <input
                    type="checkbox"
                    className="sr-only peer"
                    ref={ref}
                    {...props}
                />
                <div className="relative w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-blue-600"></div>
                {label && <span className="ms-3 text-sm font-medium text-slate-900 dark:text-slate-300">{label}</span>}
            </label>
        );
    }
);
Switch.displayName = "Switch";
