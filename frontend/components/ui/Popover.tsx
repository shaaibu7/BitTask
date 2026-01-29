import React, { useState, useRef, useEffect } from 'react';

export const Popover = ({ children, content, className = '' }: { children: React.ReactNode; content: React.ReactNode; className?: string }) => {
    const [isOpen, setIsOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (ref.current && !ref.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };

    }, [isOpen]);


    return (
        <div className="relative inline-block text-left" ref={ref}>
            <div onClick={() => setIsOpen(!isOpen)}>{children}</div>
            {isOpen && (
                <div
                    className={`absolute z-50 w-72 rounded-md border border-slate-200 bg-white p-4 shadow-md outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 dark:border-slate-800 dark:bg-slate-950 mt-2 ${className}`}
                >
                    {content}
                </div>
            )}
        </div>
    );
};
