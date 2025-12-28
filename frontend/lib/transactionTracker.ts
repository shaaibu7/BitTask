'use client';

import { useState, useEffect, useCallback } from 'react';
import { STACKS_MAINNET, STACKS_TESTNET } from '@stacks/network';

export type TransactionStatus = 'pending' | 'success' | 'failed' | 'unknown';

export interface Transaction {
  txId: string;
  status: TransactionStatus;
  timestamp: number;
  type: 'create-task' | 'accept-task' | 'submit-work' | 'approve-work' | 'reject-work';
  taskId?: number;
}

const network = process.env.NEXT_PUBLIC_STACKS_NETWORK === 'mainnet' ? STACKS_MAINNET : STACKS_TESTNET;
const API_URL = network.coreApiUrl;

// Store transactions in localStorage for persistence
const STORAGE_KEY = 'bittask_transactions';

export function useTransactionTracker() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isPolling, setIsPolling] = useState(false);

  // Load transactions from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setTransactions(parsed);
        // Start polling if there are pending transactions
        const hasPending = parsed.some((tx: Transaction) => tx.status === 'pending');
        if (hasPending) {
          setIsPolling(true);
        }
      }
    } catch (e) {
      console.error('Failed to load transactions from storage', e);
    }
  }, []);

  // Save transactions to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
    } catch (e) {
      console.error('Failed to save transactions to storage', e);
    }
  }, [transactions]);

  // Poll for transaction status
  useEffect(() => {
    if (!isPolling) return;

    const pendingTxs = transactions.filter(tx => tx.status === 'pending');
    if (pendingTxs.length === 0) {
      setIsPolling(false);
      return;
    }

    const pollInterval = setInterval(async () => {
      for (const tx of pendingTxs) {
        try {
          const response = await fetch(`${API_URL}/extended/v1/tx/${tx.txId}`);
          if (!response.ok) continue;

          const data = await response.json();
          let newStatus: TransactionStatus = 'unknown';

          if (data.tx_status === 'success') {
            newStatus = 'success';
          } else if (data.tx_status === 'abort_by_response' || data.tx_status === 'abort_by_post_condition') {
            newStatus = 'failed';
          } else if (data.tx_status === 'pending' || data.tx_status === 'submitted') {
            newStatus = 'pending';
          }

          if (newStatus !== tx.status) {
            setTransactions(prev =>
              prev.map(t =>
                t.txId === tx.txId
                  ? { ...t, status: newStatus }
                  : t
              )
            );
          }
        } catch (error) {
          console.error(`Failed to check transaction ${tx.txId}:`, error);
        }
      }
    }, 5000); // Poll every 5 seconds

    return () => clearInterval(pollInterval);
  }, [isPolling, transactions]);

  const addTransaction = useCallback((tx: Transaction) => {
    setTransactions(prev => {
      // Avoid duplicates
      if (prev.some(t => t.txId === tx.txId)) {
        return prev;
      }
      const updated = [tx, ...prev].slice(0, 50); // Keep last 50 transactions
      return updated;
    });
    setIsPolling(true);
  }, []);

  const clearTransactions = useCallback(() => {
    setTransactions([]);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return {
    transactions,
    addTransaction,
    clearTransactions,
    isPolling,
  };
}

// Helper to get transaction explorer URL
export function getTransactionExplorerUrl(txId: string): string {
  const baseUrl = network === STACKS_MAINNET
    ? 'https://explorer.stacks.co/txid'
    : 'https://explorer.stacks.co/txid';
  return `${baseUrl}/${txId}?chain=${network === STACKS_MAINNET ? 'mainnet' : 'testnet'}`;
}

