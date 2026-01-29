export const scrollToTop = (smooth = true) => {
    if (typeof window !== 'undefined') {
        window.scrollTo({
            top: 0,
            behavior: smooth ? 'smooth' : 'auto',
        });
    }
};

export const copyToClipboard = async (text: string): Promise<boolean> => {
    if (!navigator?.clipboard) return false;
    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch {
        return false;
    }
};

export const getScrollPercentage = (): number => {
    if (typeof window === 'undefined') return 0;
    const { scrollTop, scrollHeight, clientHeight } = document.documentElement;
    if (scrollHeight === clientHeight) return 0;
    return (scrollTop / (scrollHeight - clientHeight)) * 100;
};
