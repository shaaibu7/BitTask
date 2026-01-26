import React, { useState } from 'react';

export const DropdownMenu = ({ children }: { children: React.ReactNode }) => {
    return <div className="relative inline-block text-left">{children}</div>;
};

export const DropdownMenuTrigger = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => {
    return (
        <div className={className}>{children}</div>
    );
};

export const DropdownMenuContent = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => {
    return (
        <div className={`absolute right-0 z-50 mt-2 w-56 origin-top-right rounded-md border border-slate-200 bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none dark:border-slate-800 dark:bg-slate-950 ${className}`}>
            <div className="py-1">{children}</div>
        </div>
    );
};

export const DropdownMenuItem = ({ children, className = '', ...props }: React.HTMLAttributes<HTMLDivElement>) => {
    return (
        <div
            className={`block px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-50 cursor-pointer ${className}`}
            {...props}
        >
            {children}
        </div>
    );
};
