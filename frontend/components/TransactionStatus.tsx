'use client';

import { useTransactionTracker, getTransactionExplorerUrl, Transaction } from '../lib/transactionTracker';
import { CheckCircle, XCircle, Loader2, ExternalLink, X } from 'lucide-react';
import { useState } from 'react';

export function TransactionStatus() {
  const { transactions, clearTransactions, isPolling } = useTransactionTracker();
  const [isOpen, setIsOpen] = useState(false);

  if (transactions.length === 0) return null;

  const getStatusIcon = (status: Transaction['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-400" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-400" />;
      case 'pending':
        return <Loader2 className="h-4 w-4 text-yellow-400 animate-spin" />;
      default:
        return <Loader2 className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusText = (status: Transaction['status']) => {
    switch (status) {
      case 'success':
        return 'Success';
      case 'failed':
        return 'Failed';
      case 'pending':
        return 'Pending';
      default:
        return 'Unknown';
    }
  };

  const getTypeText = (type: Transaction['type']) => {
    switch (type) {
      case 'create-task':
        return 'Create Task';
      case 'accept-task':
        return 'Accept Task';
      case 'submit-work':
        return 'Submit Work';
      case 'approve-work':
        return 'Approve Work';
      case 'reject-work':
        return 'Reject Work';
      default:
        return type;
    }
  };

  const pendingCount = transactions.filter(tx => tx.status === 'pending').length;

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {!isOpen ? (
        <button
          onClick={() => setIsOpen(true)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2"
        >
          {pendingCount > 0 && (
            <span className="bg-yellow-400 text-yellow-900 text-xs font-bold px-2 py-1 rounded-full">
              {pendingCount}
            </span>
          )}
          <span>Transactions</span>
          {isPolling && <Loader2 className="h-4 w-4 animate-spin" />}
        </button>
      ) : (
        <div className="bg-gray-900 border border-gray-800 rounded-lg shadow-xl w-96 max-h-96 overflow-y-auto">
          <div className="flex items-center justify-between p-4 border-b border-gray-800">
            <h3 className="text-lg font-semibold">Transaction Status</h3>
            <div className="flex items-center gap-2">
              {pendingCount > 0 && (
                <span className="text-xs text-yellow-400">
                  {pendingCount} pending
                </span>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div className="p-2">
            {transactions.map((tx) => (
              <div
                key={tx.txId}
                className="p-3 mb-2 bg-gray-800 rounded-lg border border-gray-700"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {getStatusIcon(tx.status)}
                      <span className="text-sm font-medium text-white">
                        {getTypeText(tx.type)}
                      </span>
                      {tx.taskId && (
                        <span className="text-xs text-gray-400">
                          Task #{tx.taskId}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                      <span
                        className={`px-2 py-1 rounded ${
                          tx.status === 'success'
                            ? 'bg-green-500/20 text-green-400'
                            : tx.status === 'failed'
                            ? 'bg-red-500/20 text-red-400'
                            : 'bg-yellow-500/20 text-yellow-400'
                        }`}
                      >
                        {getStatusText(tx.status)}
                      </span>
                      <span className="font-mono truncate">
                        {tx.txId.slice(0, 8)}...{tx.txId.slice(-6)}
                      </span>
                    </div>
                  </div>
                  <a
                    href={getTransactionExplorerUrl(tx.txId)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-indigo-400 hover:text-indigo-300 flex-shrink-0"
                    title="View on explorer"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </div>
              </div>
            ))}
          </div>

          {transactions.length > 0 && (
            <div className="p-3 border-t border-gray-800">
              <button
                onClick={clearTransactions}
                className="text-xs text-gray-400 hover:text-gray-300 w-full text-left"
              >
                Clear all transactions
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

