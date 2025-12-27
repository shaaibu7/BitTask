'use client';

import { connect, disconnect as stackDisconnect } from '@stacks/connect';
import { createContext, useContext, useEffect, useState } from 'react';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { wagmiAdapter } from '../lib/appkit-config';

// Define a type for the wallet info based on usage or library types
// We use 'any' for now to match the user's snippet flexibility or define a specific interface
// connectionResponse has 'addresses' array.
interface AuthContextType {
    isConnected: boolean;
    walletInfo: any;
    bnsName: string;
    connectWallet: () => Promise<void>;
    disconnectWallet: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Create query client for Wagmi
const queryClient = new QueryClient();

export function Providers({ children }: { children: React.ReactNode }) {
    const [isConnected, setIsConnected] = useState<boolean>(false);
    const [walletInfo, setWalletInfo] = useState<any>(null);
    const [bnsName, setBnsName] = useState<string>('');

    async function getBns(stxAddress: string) {
        try {
            // Changed to mainnet URL default or testnet based on config? 
            // User snippet used testnet URL: https://api.bnsv2.com/testnet/names/address/${stxAddress}/valid
            // BitTask seems to be in dev/test mode mostly, let's stick to the URL provided in snippet but watch out if we need mainnet.
            // Actually, let's keep it generic or check network. 
            // User snippet: `https://api.bnsv2.com/testnet/names/address/${stxAddress}/valid`
            const response = await fetch(`https://api.bnsv2.com/testnet/names/address/${stxAddress}/valid`);
            if (!response.ok) return '';
            const data = await response.json();
            return data.names[0]?.full_name || '';
        } catch (e) {
            console.error('Failed to fetch BNS', e);
            return '';
        }
    }

    async function connectWallet() {
        try {
            const connectionResponse = await connect();
            // Index 2 usually corresponds to testnet in some wallets, or mainnet in others depending on derivation path?
            // User snippet used index 2. Let's start with that but maybe fall back or check.
            // Actually typical Stacks wallets return a list.
            // Let's assume standard behavior:
            // addresses[0]: Mainnet P2PKH
            // addresses[1]: Mainnet P2SH (I think?)
            // addresses[2]: Testnet P2PKH ?
            // User specifically accessed connectionResponse.addresses[2].address

            // Safety check
            const address = connectionResponse.addresses[2]?.address || connectionResponse.addresses[0]?.address;

            if (address) {
                const bns = await getBns(address);
                setIsConnected(true);
                setWalletInfo(connectionResponse);
                setBnsName(bns);
            }
        } catch (error) {
            console.error("Connection failed", error);
        }
    }

    function disconnectWallet() {
        stackDisconnect();
        setIsConnected(false);
        setWalletInfo(null);
        setBnsName('');
        // Optionally clear local storage if any was set by library
    }

    // Effect to verify session consistency if needed, but 'connect' is mostly interactive.
    // The 'connect' package might persist session in localStorage. 
    // However, the simplified snippet provided implies a more direct approach. 
    // If we want to persist state on reload, we'd need to check localStorage or UserSession too.
    // The user *requested* building wallet connection logic using Stacks.js and provided a specific snippet.
    // I will follow the snippet pattern closely.

    return (
        <WagmiProvider adapter={wagmiAdapter} config={wagmiAdapter.wagmiConfig}>
            <QueryClientProvider client={queryClient}>
                <AuthContext.Provider value={{ isConnected, walletInfo, bnsName, connectWallet, disconnectWallet }}>
                    {children}
                </AuthContext.Provider>
            </QueryClientProvider>
        </WagmiProvider>
    );
}

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within a Providers');
    }
    return context;
};
