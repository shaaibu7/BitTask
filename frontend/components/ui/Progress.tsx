import React from 'react';

interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
    value: number; // 0 to 100
    max?: number;
}

export const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
    ({ className = '', value, max = 100, ...props }, ref) => {
        const percentage = Math.min(100, Math.max(0, (value / max) * 100));

        return (
            <div
                ref={ref}
                className={`w-full bg-slate-200 rounded-full h-2.5 dark:bg-slate-700 ${className}`}
                {...props}
            >
                <div
                    className="bg-blue-600 h-2.5 rounded-full transition-all duration-300 ease-in-out"
                    style={{ width: `${percentage}%` }}
                ></div>
            </div>
        );
    }
);
Progress.displayName = "Progress";
