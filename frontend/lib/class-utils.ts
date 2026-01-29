export type ClassValue = string | number | boolean | undefined | null;
export type ClassArray = ClassValue[];
export type ClassDictionary = Record<string, any>;
export type ClassArgument = ClassValue | ClassArray | ClassDictionary;

export function cn(...inputs: ClassArgument[]): string {
    const classes: string[] = [];

    for (const arg of inputs) {
        if (!arg) continue;

        if (typeof arg === 'string') {
            classes.push(arg);
        } else if (Array.isArray(arg)) {
            if (arg.length) {
                const inner = cn(...arg);
                if (inner) {
                    classes.push(inner);
                }
            }
        } else if (typeof arg === 'object') {
            if (arg.toString === Object.prototype.toString && !arg.toString().startsWith('[object ')) {
                classes.push(arg.toString());
            } else {
                for (const key in arg) {
                    if (Object.prototype.hasOwnProperty.call(arg, key) && arg[key]) {
                        classes.push(key);
                    }
                }
            }
        }
    }

    return classes.join(' ');
}
