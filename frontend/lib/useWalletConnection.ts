'use client';

import { useEffect, useState } from 'react';
import { useAccount, useConnect, useDisconnect } from 'wagmi';

export interface WalletState {
  address: string | null;
  isConnected: boolean;
  isConnecting: boolean;
  chainId: number | null;
}

export function useWalletConnection() {
  const { address, isConnected, chainId } = useAccount();
  const { connectors, isPending: isConnecting } = useConnect();
  const { disconnect } = useDisconnect();
  const [walletState, setWalletState] = useState<WalletState>({
    address: null,
    isConnected: false,
    isConnecting: false,
    chainId: null,
  });

  useEffect(() => {
    setWalletState({
      address: address || null,
      isConnected,
      isConnecting,
      chainId: chainId || null,
    });
  }, [address, isConnected, isConnecting, chainId]);

  const handleDisconnect = () => {
    disconnect();
  };

  return {
    ...walletState,
    connectors,
    disconnect: handleDisconnect,
  };
}
