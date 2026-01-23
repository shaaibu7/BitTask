
export function truncate(str: string, length: number): string {
    if (!str) return '';
    if (str.length <= length) return str;
    return str.slice(0, length) + '...';
}

export function capitalize(str: string): string {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
}

export function slugify(str: string): string {
    if (!str) return '';
    return str
        .toLowerCase()
        .replace(/[^\w ]+/g, '')
        .replace(/ +/g, '-');
}

export function formatAddress(address: string, start = 6, end = 4): string {
    if (!address) return '';
    return `${address.slice(0, start)}...${address.slice(-end)}`;
}
