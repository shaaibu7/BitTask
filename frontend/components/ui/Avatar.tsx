import React from 'react';

interface AvatarProps extends React.ImgHTMLAttributes<HTMLImageElement> {
    size?: 'sm' | 'md' | 'lg';
    fallback?: string;
}

export const Avatar = React.forwardRef<HTMLImageElement, AvatarProps>(
    ({ className = '', size = 'md', src, alt = "Avatar", fallback = '?', ...props }, ref) => {
        const [error, setError] = React.useState(false);

        const sizes = {
            sm: "h-8 w-8 text-xs",
            md: "h-10 w-10 text-sm",
            lg: "h-14 w-14 text-base",
        };

        const containerClasses = `relative inline-block overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800 ${sizes[size]} ${className}`;
        const imageClasses = "h-full w-full object-cover";
        const fallbackClasses = "flex h-full w-full items-center justify-center font-medium text-slate-500 dark:text-slate-400";

        if (error || !src) {
            return (
                <div className={containerClasses} title={alt}>
                    <span className={fallbackClasses}>{fallback}</span>
                </div>
            );
        }

        return (
            <div className={containerClasses}>
                <img
                    ref={ref}
                    src={src}
                    alt={alt}
                    className={imageClasses}
                    onError={() => setError(true)}
                    {...props}
                />
            </div>
        );
    }
);
Avatar.displayName = "Avatar";
