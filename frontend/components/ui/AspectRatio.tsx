import React from 'react';

interface AspectRatioProps extends React.HTMLAttributes<HTMLDivElement> {
    ratio?: number;
}

export const AspectRatio = React.forwardRef<HTMLDivElement, AspectRatioProps>(
    ({ ratio = 16 / 9, className = '', children, ...props }, ref) => {
        return (
            <div ref={ref} className={`relative w-full ${className}`} {...props}>
                <div
                    style={{ paddingBottom: `${(1 / ratio) * 100}%` }}
                    className="w-full"
                />
                <div className="absolute inset-0">{children}</div>
            </div>
        );
    }
);
AspectRatio.displayName = "AspectRatio";
