'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../components/Providers';
import { useStacksWallet } from '../../lib/stacks-wallet';
import { useTransactionTracker } from '../../lib/transactionTracker';
import { showNotification } from '../../lib/notifications';
import { createTask } from '../../lib/contractActions';
import { ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';

// Stacks API endpoints
const STACKS_MAINNET_API = 'https://api.stacks.co';
const STACKS_TESTNET_API = 'https://api.testnet.stacks.co';

// Fallback block height approximation (mainnet)
const FALLBACK_APPROXIMATE_MAINNET_HEIGHT = 100000;

export default function CreateTaskPage() {
    const router = useRouter();
    const { isConnected } = useAuth();
    const { userSession } = useStacksWallet();
    const { addTransaction } = useTransactionTracker();
    const [isLoading, setIsLoading] = useState(false);
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        amount: '',
        deadline: '',
    });

    if (!isConnected) {
        return (
            <div className="min-h-screen bg-gray-950 text-white p-8">
                <div className="max-w-2xl mx-auto">
                    <Link href="/" className="flex items-center gap-2 text-indigo-400 hover:text-indigo-300 mb-8">
                        <ArrowLeft className="h-5 w-5" />
                        Back Home
                    </Link>
                    <div className="text-center py-24 bg-gray-900 rounded-2xl border border-gray-800">
                        <h3 className="text-xl font-semibold text-gray-300">Connect Your Wallet</h3>
                        <p className="text-gray-500 mt-2">You need to connect your wallet to create a task</p>
                    </div>
                </div>
            </div>
        );
    }

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validation
        if (!formData.title.trim()) {
            showNotification.error('Title is required');
            return;
        }
        if (!formData.description.trim()) {
            showNotification.error('Description is required');
            return;
        }
        if (!formData.amount || parseFloat(formData.amount) <= 0) {
            showNotification.error('Amount must be greater than 0');
            return;
        }
        if (!formData.deadline) {
            showNotification.error('Deadline is required');
            return;
        }

        setIsLoading(true);

        try {
            // Convert deadline to block height
            // Stacks blocks are approximately 10 minutes apart
            const deadlineDate = new Date(formData.deadline);
            const now = new Date();
            
            if (deadlineDate <= now) {
                showNotification.error('Deadline must be in the future');
                setIsLoading(false);
                return;
            }

            // Get current block height estimate (we'll fetch it from API if available)
            // For now, use approximation: ~144 blocks per day (10 min per block)
            const diffMs = deadlineDate.getTime() - now.getTime();
            const diffMinutes = Math.floor(diffMs / (1000 * 60));
            const blocksFromNow = Math.floor(diffMinutes / 10);
            
            // Fetch current block height from Stacks API
            let currentBlockHeight = 0;
            try {
                const apiUrl = process.env.NEXT_PUBLIC_STACKS_NETWORK === 'mainnet' 
                    ? STACKS_MAINNET_API 
                    : STACKS_TESTNET_API;
                const response = await fetch(`${apiUrl}/v2/info`);
                const info = await response.json();
                currentBlockHeight = info.stacks_tip_height || 0;
            } catch (e) {
                console.warn('Could not fetch current block height, using approximation', e);
                // Fallback: assume we're at a reasonable block height
                currentBlockHeight = FALLBACK_APPROXIMATE_MAINNET_HEIGHT;
            }

            const deadlineBlockHeight = currentBlockHeight + blocksFromNow + 1;

            // Convert amount to number
            const amount = parseFloat(formData.amount);

            // Call create-task contract function
            await createTask(
                userSession,
                formData.title.trim(),
                formData.description.trim(),
                amount, // Will be converted to micro-STX in contractActions
                deadlineBlockHeight,
                {
                    onTransactionId: (txId) => {
                        addTransaction({
                            txId,
                            status: 'pending',
                            timestamp: Date.now(),
                            type: 'create-task',
                        });
                        showNotification.success(
                            'Transaction submitted!', 
                            'Your task is being created on the blockchain...'
                        );
                    },
                    onFinish: (data) => {
                        console.log('Task created successfully:', data);
                        // Redirect after a short delay
                        setTimeout(() => {
                            router.push('/marketplace');
                        }, 1500);
                    },
                    onCancel: () => {
                        showNotification.error('Transaction cancelled', 'Task creation was cancelled');
                        setIsLoading(false);
                    },
                }
            );
        } catch (error) {
            console.error('Failed to create task', error);
            showNotification.error(
                'Failed to create task', 
                error instanceof Error ? error.message : 'Please try again'
            );
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-950 text-white p-8">
            <div className="max-w-2xl mx-auto space-y-8">
                <Link href="/" className="flex items-center gap-2 text-indigo-400 hover:text-indigo-300 w-fit">
                    <ArrowLeft className="h-5 w-5" />
                    Back Home
                </Link>

                <div className="space-y-2">
                    <h1 className="text-4xl font-bold">Post a New Task</h1>
                    <p className="text-gray-400">Create a task and find the perfect worker</p>
                </div>

                <form onSubmit={handleSubmit} className="bg-gray-900 border border-gray-800 rounded-2xl p-8 space-y-6">
                    {/* Title */}
                    <div className="space-y-2">
                        <label htmlFor="title" className="block text-sm font-medium text-gray-300">
                            Task Title
                        </label>
                        <input
                            type="text"
                            id="title"
                            name="title"
                            value={formData.title}
                            onChange={handleChange}
                            placeholder="e.g., Design a logo for my startup"
                            maxLength={50}
                            className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition-colors"
                        />
                        <p className="text-xs text-gray-500">{formData.title.length}/50</p>
                    </div>

                    {/* Description */}
                    <div className="space-y-2">
                        <label htmlFor="description" className="block text-sm font-medium text-gray-300">
                            Task Description
                        </label>
                        <textarea
                            id="description"
                            name="description"
                            value={formData.description}
                            onChange={handleChange}
                            placeholder="Describe what you need done in detail..."
                            maxLength={256}
                            rows={5}
                            className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition-colors resize-none"
                        />
                        <p className="text-xs text-gray-500">{formData.description.length}/256</p>
                    </div>

                    {/* Amount */}
                    <div className="space-y-2">
                        <label htmlFor="amount" className="block text-sm font-medium text-gray-300">
                            Reward Amount (STX)
                        </label>
                        <input
                            type="number"
                            id="amount"
                            name="amount"
                            value={formData.amount}
                            onChange={handleChange}
                            placeholder="e.g., 100"
                            min="1"
                            step="1"
                            className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition-colors"
                        />
                        <p className="text-xs text-gray-500">This amount will be locked in escrow</p>
                    </div>

                    {/* Deadline */}
                    <div className="space-y-2">
                        <label htmlFor="deadline" className="block text-sm font-medium text-gray-300">
                            Deadline
                        </label>
                        <input
                            type="datetime-local"
                            id="deadline"
                            name="deadline"
                            value={formData.deadline}
                            onChange={handleChange}
                            className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-indigo-500 transition-colors"
                        />
                        <p className="text-xs text-gray-500">When should this task be completed?</p>
                    </div>

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full py-3 px-6 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
                    >
                        {isLoading && <Loader2 className="h-5 w-5 animate-spin" />}
                        {isLoading ? 'Creating Task...' : 'Create Task'}
                    </button>
                </form>

                {/* Info Box */}
                <div className="bg-indigo-500/10 border border-indigo-500/30 rounded-lg p-4">
                    <p className="text-sm text-indigo-300">
                        💡 <strong>Tip:</strong> Set a reasonable deadline and reward to attract quality workers. Your funds will be held in escrow until you approve the work.
                    </p>
                </div>
            </div>
        </div>
    );
}
