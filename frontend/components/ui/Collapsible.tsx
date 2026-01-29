import React, { useState } from 'react';
import { ChevronsUpDown } from 'lucide-react';
import { Button } from './Button';

export const Collapsible = ({
    open,
    onOpenChange,
    children,
    className = '',
    ...props
}: {
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    children: React.ReactNode;
    className?: string;
}) => {
    const [isOpen, setIsOpen] = useState(open || false);

    const handleOpenChange = () => {
        const newState = !isOpen;
        setIsOpen(newState);
        onOpenChange?.(newState);
    };

    return (
        <div className={className} data-state={isOpen ? 'open' : 'closed'} {...props}>
            {React.Children.map(children, (child) => {
                if (React.isValidElement(child) && (child.type as any).displayName === 'CollapsibleTrigger') {
                    return React.cloneElement(child as React.ReactElement<any>, { onClick: handleOpenChange });
                }
                if (React.isValidElement(child) && (child.type as any).displayName === 'CollapsibleContent') {
                    return isOpen ? child : null;
                }
                return child;
            })}
        </div>
    );
};

export const CollapsibleTrigger = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement>>(
    ({ children, ...props }, ref) => {
        // Logic handled in parent cloneElement
        return (
            <Button variant="ghost" size="sm" ref={ref} {...props}>
                {children || <ChevronsUpDown className="h-4 w-4" />}
                <span className="sr-only">Toggle</span>
            </Button>
        );
    }
);
CollapsibleTrigger.displayName = "CollapsibleTrigger";


export const CollapsibleContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
    ({ className = '', children, ...props }, ref) => (
        <div ref={ref} className={`overflow-hidden transition-all data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down ${className}`} {...props}>
            {children}
        </div>
    )
);
CollapsibleContent.displayName = "CollapsibleContent";
