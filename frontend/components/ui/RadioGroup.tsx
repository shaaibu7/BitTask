import React from 'react';

interface RadioGroupProps {
    name: string;
    value: string;
    onChange: (value: string) => void;
    options: { label: string; value: string; disabled?: boolean }[];
    className?: string;
}

export const RadioGroup: React.FC<RadioGroupProps> = ({ name, value, onChange, options, className = '' }) => {
    return (
        <div className={`space-y-2 ${className}`}>
            {options.map((option) => (
                <label key={option.value} className="flex items-center space-x-2 cursor-pointer">
                    <div className="relative flex items-center">
                        <input
                            type="radio"
                            name={name}
                            value={option.value}
                            checked={value === option.value}
                            onChange={(e) => onChange(e.target.value)}
                            disabled={option.disabled}
                            className="peer sr-only"
                        />
                        <div className="h-4 w-4 rounded-full border border-slate-400 bg-white dark:bg-slate-900 dark:border-slate-600 peer-checked:border-blue-600 peer-checked:border-4 transition-all"></div>
                    </div>
                    <span className={`text-sm font-medium ${option.disabled ? 'opacity-50 cursor-not-allowed' : ''}`}>{option.label}</span>
                </label>
            ))}
        </div>
    );
};
