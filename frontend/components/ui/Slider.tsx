import React from 'react';

interface SliderProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
    min?: number;
    max?: number;
    step?: number;
}

export const Slider = React.forwardRef<HTMLInputElement, SliderProps>(
    ({ className = '', min = 0, max = 100, step = 1, ...props }, ref) => {
        return (
            <input
                type="range"
                min={min}
                max={max}
                step={step}
                ref={ref}
                className={`w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer dark:bg-slate-700 accent-blue-600 ${className}`}
                {...props}
            />
        );
    }
);
Slider.displayName = "Slider";
