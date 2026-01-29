import React from 'react';

interface SeparatorProps extends React.HTMLAttributes<HTMLDivElement> {
    orientation?: 'horizontal' | 'vertical';
}

export const Separator = React.forwardRef<HTMLDivElement, SeparatorProps>(
    ({ className = '', orientation = 'horizontal', ...props }, ref) => {
        const baseStyle = "bg-slate-200 dark:bg-slate-700";
        const orientStyle = orientation === 'horizontal' ? 'h-[1px] w-full' : 'h-full w-[1px]';

        return (
            <div
                ref={ref}
                className={`${baseStyle} ${orientStyle} ${className}`}
                {...props}
            />
        );
    }
);
Separator.displayName = "Separator";
