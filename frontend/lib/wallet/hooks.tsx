/**
 * React Hooks for Wallet Integration
 * 
 * Provides React hooks that use the wallet abstraction layer.
 * These hooks can work with any wallet provider (Stacks Connect, Reown, etc.)
 */

'use client';

import { useState, useEffect, createContext, useContext, ReactNode, useCallback } from 'react';
import { 
  WalletProviderRegistry, 
  WalletConnection, 
  WalletAccount,
  createWalletRegistry,
} from './index';

interface WalletContextType {
  registry: WalletProviderRegistry;
  isConnected: boolean;
  account: WalletAccount | null;
  connection: WalletConnection | null;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export function WalletProvider({ children }: { children: ReactNode }) {
  const [registry] = useState(() => createWalletRegistry());
  const [isConnected, setIsConnected] = useState(false);
  const [account, setAccount] = useState<WalletAccount | null>(null);
  const [connection, setConnection] = useState<WalletConnection | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check connection status on mount
  useEffect(() => {
    async function checkConnection() {
      try {
        const currentAccount = await registry.getAccount();
        if (currentAccount) {
          setAccount(currentAccount);
          setIsConnected(true);
          // Reconstruct connection from account
          setConnection({
            address: currentAccount.address,
            network: currentAccount.network,
            provider: registry.getProvider()?.name || 'unknown',
          });
        }
      } catch (err) {
        console.error('Failed to check wallet connection', err);
      } finally {
        setIsLoading(false);
      }
    }

    checkConnection();
  }, [registry]);

  const connect = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const conn = await registry.connect();
      setConnection(conn);
      setIsConnected(true);
      
      const acc = await registry.getAccount();
      setAccount(acc);
    } catch (err: any) {
      setError(err.message || 'Failed to connect wallet');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [registry]);

  const disconnect = useCallback(async () => {
    try {
      await registry.disconnect();
      setIsConnected(false);
      setAccount(null);
      setConnection(null);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to disconnect wallet');
    }
  }, [registry]);

  return (
    <WalletContext.Provider
      value={{
        registry,
        isConnected,
        account,
        connection,
        connect,
        disconnect,
        isLoading,
        error,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
}

/**
 * Hook to get the underlying user session (for Stacks Connect)
 * This is provider-specific and may not work with all providers
 */
export function useWalletSession() {
  const { registry } = useWallet();
  const provider = registry.getProvider();
  
  // Type guard for Stacks Connect provider
  if (provider && provider.name === 'stacks-connect') {
    const stacksProvider = provider as any;
    return stacksProvider.getUserSession?.() || null;
  }
  
  return null;
}

