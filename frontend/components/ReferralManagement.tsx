'use client';

import React, { useState } from 'react';
import { useStacksWallet } from '../lib/stacks-wallet';
import { registerReferrer } from '../lib/contractActions';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from './ui/Card';
import { Alert, AlertDescription } from './ui/Alert';

/**
 * ReferralManagement Component
 * Allows users to register their referrer on the Stacks blockchain.
 * Uses @stacks/connect for transaction signing.
 */
export function ReferralManagement() {
    const { isConnected, userSession, address } = useStacksWallet();
    const [referrerAddress, setReferrerAddress] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    const handleRegisterReferrer = async () => {
        if (!isConnected) {
            setMessage({ type: 'error', text: 'Please connect your wallet first.' });
            return;
        }

        if (!referrerAddress.trim()) {
            setMessage({ type: 'error', text: 'Please enter a valid Stacks address.' });
            return;
        }

        setIsLoading(true);
        setMessage(null);

        try {
            await registerReferrer(userSession, referrerAddress, {
                onFinish: (data) => {
                    console.log('Transaction finished:', data);
                    setMessage({ type: 'success', text: 'Referrer registration transaction submitted!' });
                    setReferrerAddress('');
                },
                onCancel: () => {
                    setMessage({ type: 'error', text: 'Transaction cancelled.' });
                },
            });
        } catch (error) {
            console.error('Registration failed:', error);
            setMessage({ type: 'error', text: 'Failed to register referrer. Please try again.' });
        } finally {
            setIsLoading(false);
        }
    };

    if (!isConnected) return null;

    return (
        <Card className="w-full max-w-md mx-auto my-8 border-primary/20 shadow-lg bg-background/50 backdrop-blur-sm">
            <CardHeader>
                <CardTitle className="text-xl font-bold bg-gradient-to-r from-primary to-blue-500 bg-clip-text text-transparent">
                    Referral Program
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                    Register a referrer to start earning impact points and bonuses on the BitTask network.
                </p>

                <div className="space-y-2">
                    <label htmlFor="referrer" className="text-sm font-medium">
                        Referrer Stacks Address
                    </label>
                    <Input
                        id="referrer"
                        placeholder="SP..."
                        value={referrerAddress}
                        onChange={(e) => setReferrerAddress(e.target.value)}
                        disabled={isLoading}
                        className="font-mono text-xs"
                    />
                </div>

                {message && (
                    <Alert variant={message.type === 'success' ? 'default' : 'destructive'} className="animate-in fade-in slide-in-from-top-1">
                        <AlertDescription>
                            {message.text}
                        </AlertDescription>
                    </Alert>
                )}
            </CardContent>
            <CardFooter>
                <Button
                    onClick={handleRegisterReferrer}
                    disabled={isLoading || !referrerAddress}
                    className="w-full transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                    {isLoading ? 'Processing...' : 'Register Referrer'}
                </Button>
            </CardFooter>
        </Card>
    );
}
