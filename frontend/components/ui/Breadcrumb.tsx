import React from 'react';
import { ChevronRight } from 'lucide-react';

export const Breadcrumb = React.forwardRef<HTMLElement, React.HTMLAttributes<HTMLElement>>(
    ({ ...props }, ref) => <nav ref={ref} aria-label="breadcrumb" {...props} />
);
Breadcrumb.displayName = "Breadcrumb";

export const BreadcrumbList = React.forwardRef<HTMLOListElement, React.OlHTMLAttributes<HTMLOListElement>>(
    ({ className = '', ...props }, ref) => (
        <ol
            ref={ref}
            className={`flex flex-wrap items-center gap-1.5 break-words text-sm text-slate-500 sm:gap-2.5 dark:text-slate-400 ${className}`}
            {...props}
        />
    )
);
BreadcrumbList.displayName = "BreadcrumbList";

export const BreadcrumbItem = React.forwardRef<HTMLLIElement, React.LiHTMLAttributes<HTMLLIElement>>(
    ({ className = '', ...props }, ref) => (
        <li
            ref={ref}
            className={`inline-flex items-center gap-1.5 ${className}`}
            {...props}
        />
    )
);
BreadcrumbItem.displayName = "BreadcrumbItem";

export const BreadcrumbLink = React.forwardRef<HTMLAnchorElement, React.AnchorHTMLAttributes<HTMLAnchorElement>>(
    ({ className = '', ...props }, ref) => (
        <a
            ref={ref}
            className={`transition-colors hover:text-slate-950 dark:hover:text-slate-50 ${className}`}
            {...props}
        />
    )
);
BreadcrumbLink.displayName = "BreadcrumbLink";

export const BreadcrumbSeparator = ({ children, className = '', ...props }: React.ComponentProps<'li'>) => (
    <li
        role="presentation"
        aria-hidden="true"
        className={`[&>svg]:w-3.5 [&>svg]:h-3.5 ${className}`}
        {...props}
    >
        {children ?? <ChevronRight />}
    </li>
);
BreadcrumbSeparator.displayName = "BreadcrumbSeparator";
