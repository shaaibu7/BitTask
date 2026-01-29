import React from 'react';
import { Search } from 'lucide-react';

export const Command = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
    ({ className = '', ...props }, ref) => (
        <div
            ref={ref}
            className={`flex h-full w-full flex-col overflow-hidden rounded-md bg-white text-slate-950 dark:bg-slate-950 dark:text-slate-50 ${className}`}
            {...props}
        />
    )
);
Command.displayName = "Command";

export const CommandInput = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
    ({ className = '', ...props }, ref) => (
        <div className="flex items-center border-b px-3" cmdk-input-wrapper="">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <input
                ref={ref}
                className={`flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-slate-500 disabled:cursor-not-allowed disabled:opacity-50 dark:placeholder:text-slate-400 ${className}`}
                {...props}
            />
        </div>
    )
);
CommandInput.displayName = "CommandInput";

export const CommandList = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
    ({ className = '', ...props }, ref) => (
        <div
            ref={ref}
            className={`max-h-[300px] overflow-y-auto overflow-x-hidden ${className}`}
            {...props}
        />
    )
);
CommandList.displayName = "CommandList";

export const CommandEmpty = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
    ({ ...props }, ref) => (
        <div
            ref={ref}
            className="py-6 text-center text-sm"
            {...props}
        />
    )
);
CommandEmpty.displayName = "CommandEmpty";

export const CommandGroup = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement> & { heading?: React.ReactNode }>(
    ({ className = '', heading, ...props }, ref) => (
        <div
            ref={ref}
            className={`overflow-hidden p-1 text-slate-950 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-slate-500 dark:text-slate-50 dark:[&_[cmdk-group-heading]]:text-slate-400 ${className}`}
            {...props}
        >
            {heading && <div className="px-2 py-1.5 text-xs font-medium text-slate-500">{heading}</div>}
            {props.children}
        </div>
    )
);
CommandGroup.displayName = "CommandGroup";

export const CommandItem = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
    ({ className = '', ...props }, ref) => (
        <div
            ref={ref}
            className={`relative flex cursor-default gap-2 select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none data-[disabled=true]:pointer-events-none data-[selected='true']:bg-slate-100 data-[selected=true]:text-slate-900 data-[disabled=true]:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 dark:data-[selected=true]:bg-slate-800 dark:data-[selected=true]:text-slate-50 ${className}`}
            {...props}
        />
    )
);
CommandItem.displayName = "CommandItem";
