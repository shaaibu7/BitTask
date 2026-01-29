import React from 'react';

export const Container = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
    ({ className = '', ...props }, ref) => {
        return (
            <div
                ref={ref}
                className={`mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 ${className}`}
                {...props}
            />
        );
    }
);
Container.displayName = "Container";
