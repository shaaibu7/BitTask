import React, { useState } from 'react';

interface TooltipProps {
    content: string;
    children: React.ReactNode;
    delay?: number;
}

export const Tooltip: React.FC<TooltipProps> = ({ content, children, delay = 200 }) => {
    let timeout: NodeJS.Timeout;
    const [active, setActive] = useState(false);

    const showTip = () => {
        timeout = setTimeout(() => {
            setActive(true);
        }, delay);
    };

    const hideTip = () => {
        clearInterval(timeout);
        setActive(false);
    };

    return (
        <div
            className="relative inline-block"
            onMouseEnter={showTip}
            onMouseLeave={hideTip}
        >
            {children}
            {active && (
                <div className="absolute z-10 px-2 py-1 mb-2 text-xs font-medium text-white bg-black rounded shadow-sm bottom-full left-1/2 transform -translate-x-1/2 whitespace-nowrap dark:bg-slate-700">
                    {content}
                    <div className="absolute w-2 h-2 bg-black transform rotate-45 left-1/2 -translate-x-1/2 top-full -mt-1 dark:bg-slate-700"></div>
                </div>
            )}
        </div>
    );
};
