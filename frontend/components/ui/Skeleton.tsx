import React from 'react';

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
    variant?: 'default' | 'circle';
}

export const Skeleton = React.forwardRef<HTMLDivElement, SkeletonProps>(
    ({ className = '', variant = 'default', ...props }, ref) => {
        const baseStyles = "animate-pulse bg-slate-200 dark:bg-slate-800";

        const variants = {
            default: "rounded-md",
            circle: "rounded-full",
        };

        const classes = `${baseStyles} ${variants[variant]} ${className}`;

        return (
            <div
                ref={ref}
                className={classes}
                {...props}
            />
        );
    }
);
Skeleton.displayName = "Skeleton";
