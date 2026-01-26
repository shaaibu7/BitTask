import React from 'react';

export const NavigationMenu = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => {
    return (
        <nav className={`relative z-10 flex max-w-max flex-1 items-center justify-center ${className}`}>
            <ul className="group flex flex-1 list-none items-center justify-center space-x-1">{children}</ul>
        </nav>
    );
};

export const NavigationMenuItem = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
    <li className={className}>{children}</li>
);

export const NavigationMenuLink = ({ children, className = '', href, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a
        href={href}
        className={`group inline-flex h-10 w-max items-center justify-center rounded-md bg-white px-4 py-2 text-sm font-medium transition-colors hover:bg-slate-100 hover:text-slate-900 focus:bg-slate-100 focus:text-slate-900 focus:outline-none disabled:pointer-events-none disabled:opacity-50 data-[active]:bg-slate-100/50 data-[state=open]:bg-slate-100/50 dark:bg-slate-950 dark:hover:bg-slate-800 dark:hover:text-slate-50 dark:focus:bg-slate-800 dark:focus:text-slate-50 ${className}`}
        {...props}
    >
        {children}
    </a>
);
