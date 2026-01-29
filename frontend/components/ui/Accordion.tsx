import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

export const Accordion = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
    <div className={`space-y-1 ${className}`}>{children}</div>
);

export const AccordionItem = ({
    title,
    children,
    className = '',
}: {
    title: string;
    children: React.ReactNode;
    className?: string;
}) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className={`border-b dark:border-slate-700 ${className}`}>
            <button
                type="button"
                className="flex w-full items-center justify-between py-4 font-medium transition-all hover:underline [&[data-state=open]>svg]:rotate-180"
                onClick={() => setIsOpen(!isOpen)}
                data-state={isOpen ? 'open' : 'closed'}
            >
                {title}
                <ChevronDown className="h-4 w-4 shrink-0 transition-transform duration-200" />
            </button>
            {isOpen && (
                <div className="pb-4 pt-0 text-sm transition-all animate-accordion-down">
                    {children}
                </div>
            )}
        </div>
    );
};
