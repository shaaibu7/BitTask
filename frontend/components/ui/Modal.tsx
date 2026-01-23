import React, { useEffect, useRef } from 'react';
import { Button } from './Button';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    description?: string;
    children: React.ReactNode;
    footer?: React.ReactNode;
}

export const Modal = ({ isOpen, onClose, title, description, children, footer }: ModalProps) => {
    const modalRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };

        if (isOpen) {
            document.addEventListener('keydown', handleEscape);
            document.body.style.overflow = 'hidden';
        }

        return () => {
            document.removeEventListener('keydown', handleEscape);
            document.body.style.overflow = 'unset';
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div
                ref={modalRef}
                className="relative w-full max-w-lg rounded-lg bg-white p-6 shadow-lg animate-in zoom-in-95 duration-200 dark:bg-slate-900"
                role="dialog"
                aria-modal="true"
            >
                <div className="flex flex-col space-y-1.5 text-center sm:text-left mb-4">
                    {title && <h2 className="text-lg font-semibold leading-none tracking-tight text-slate-900 dark:text-slate-50">{title}</h2>}
                    {description && <p className="text-sm text-slate-500 dark:text-slate-400">{description}</p>}
                </div>

                <div className="py-2">
                    {children}
                </div>

                {footer || (
                    <div className="flex justify-end gap-2 mt-4">
                        <Button variant="outline" onClick={onClose}>Close</Button>
                    </div>
                )}
            </div>
        </div>
    );
};
