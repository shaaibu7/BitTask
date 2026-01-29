export const isValidEmail = (email: string): boolean => {
    const re = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return re.test(email);
};

export const isValidUrl = (url: string): boolean => {
    try {
        new URL(url);
        return true;
    } catch (e) {
        return false;
    }
};

export const isValidSTXAddress = (address: string): boolean => {
    // Basic Regex for mainnet/testnet STX addresses (SP... or ST...)
    const re = /^(SP|ST)[A-Z0-9]{39,40}$/;
    return re.test(address);
};

export const hasMinLength = (str: string, min: number): boolean => {
    return str.length >= min;
};
