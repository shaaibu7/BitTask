import React from 'react';

interface GridProps extends React.HTMLAttributes<HTMLDivElement> {
    cols?: 1 | 2 | 3 | 4 | 5 | 6 | 12;
    gap?: number;
}

export const Grid = React.forwardRef<HTMLDivElement, GridProps>(
    ({ className = '', cols = 1, gap = 4, style, ...props }, ref) => {
        // Mapping for Tailwind classes (safelist these if needed, or use inline styles for dynamic values)
        const gridCols = {
            1: 'grid-cols-1',
            2: 'grid-cols-2',
            3: 'grid-cols-3',
            4: 'grid-cols-4',
            5: 'grid-cols-5',
            6: 'grid-cols-6',
            12: 'grid-cols-12',
        };

        return (
            <div
                ref={ref}
                className={`grid ${gridCols[cols]} ${className}`}
                style={{ gap: `${gap * 0.25}rem`, ...style }}
                {...props}
            />
        );
    }
);
Grid.displayName = "Grid";
