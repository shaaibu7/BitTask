import React from 'react';

interface FlexProps extends React.HTMLAttributes<HTMLDivElement> {
    direction?: 'row' | 'col';
    align?: 'start' | 'center' | 'end' | 'baseline' | 'stretch';
    justify?: 'start' | 'center' | 'end' | 'between' | 'around' | 'evenly';
    gap?: number;
}

export const Flex = React.forwardRef<HTMLDivElement, FlexProps>(
    ({ className = '', direction = 'row', align = 'stretch', justify = 'start', gap = 0, style, ...props }, ref) => {

        // Using inline styles for gap to allow arbitrary values easily, 
        // but classes for direction/align/justify to leverage Tailwind
        const directions = {
            row: 'flex-row',
            col: 'flex-col',
        };

        const aligns = {
            start: 'items-start',
            center: 'items-center',
            end: 'items-end',
            baseline: 'items-baseline',
            stretch: 'items-stretch',
        };

        const justifies = {
            start: 'justify-start',
            center: 'justify-center',
            end: 'justify-end',
            between: 'justify-between',
            around: 'justify-around',
            evenly: 'justify-evenly',
        };

        return (
            <div
                ref={ref}
                className={`flex ${directions[direction]} ${aligns[align]} ${justifies[justify]} ${className}`}
                style={{ gap: `${gap * 0.25}rem`, ...style }}
                {...props}
            />
        );
    }
);
Flex.displayName = "Flex";
