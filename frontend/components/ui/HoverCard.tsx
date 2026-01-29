import React, { useState } from 'react';

export const HoverCard = ({ children, content, className = '' }: { children: React.ReactNode; content: React.ReactNode; className?: string }) => {
    const [isHovered, setIsHovered] = useState(false);
    let timeout: NodeJS.Timeout;

    const handleMouseEnter = () => {
        clearTimeout(timeout);
        setIsHovered(true);
    };

    const handleMouseLeave = () => {
        timeout = setTimeout(() => setIsHovered(false), 300);
    };

    return (
        <div className="relative inline-block" onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
            {children}
            {isHovered && (
                <div className={`absolute z-50 w-64 rounded-md border border-slate-200 bg-white p-4 shadow-md outline-none animate-in zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 dark:border-slate-800 dark:bg-slate-950 top-full mt-2 ${className}`}>
                    {content}
                </div>
            )}
        </div>
    );
};
