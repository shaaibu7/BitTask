'use client';

import React, { useState, useEffect } from 'react';
import { Button } from './ui/Button';
import { Input } from './ui/input';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from './ui/card';
import { TrendingUp, Lock, Coins, ArrowUpRight, Clock, Award } from 'lucide-react';
import { stakeTokens, unstakeTokens, StakeInfo } from '../lib/stakingActions';
import { useStacksWallet } from '../lib/stacks-wallet';
import { toast } from 'sonner';

export default function StakingDashboard() {
    const { address, userSession, isConnected } = useStacksWallet();
    const [stakeAmount, setStakeAmount] = useState<string>('');
    const [loading, setLoading] = useState(false);
    const [stakeInfo, setStakeInfo] = useState<StakeInfo | null>(null);

    const handleStake = async () => {
        if (!stakeAmount || isNaN(Number(stakeAmount)) || Number(stakeAmount) <= 0) {
            toast.error('Please enter a valid amount to stake');
            return;
        }

        setLoading(true);
        try {
            await stakeTokens(Number(stakeAmount), address!, userSession);
            toast.success('Staking transaction initiated!');
            setStakeAmount('');
        } catch (error) {
            console.error(error);
            toast.error('Failed to initiate staking');
        } finally {
            setLoading(false);
        }
    };

    const handleUnstake = async () => {
        setLoading(true);
        try {
            await unstakeTokens(userSession);
            toast.success('Unstaking transaction initiated!');
        } catch (error) {
            console.error(error);
            toast.error('Failed to initiate unstaking');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6 p-6 max-w-4xl mx-auto animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-transparent">
                        Staking Mastery
                    </h1>
                    <p className="text-muted-foreground mt-1 text-lg">
                        Lock your BTK tokens to earn passive rewards and increase your governance weight.
                    </p>
                </div>
                <div className="bg-indigo-500/10 p-3 rounded-2xl border border-indigo-500/20">
                    <TrendingUp className="text-indigo-400 w-8 h-8" />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="bg-gradient-to-br from-background to-indigo-950/20 border-indigo-500/20 shadow-xl shadow-indigo-500/5">
                    <CardHeader className="pb-2">
                        <CardDescription className="flex items-center gap-2">
                            <Lock className="w-4 h-4 text-indigo-400" />
                            Total Staked
                        </CardDescription>
                        <CardTitle className="text-3xl font-mono">
                            {stakeInfo ? stakeInfo.amount.toString() : '0'} <span className="text-sm font-sans font-medium text-muted-foreground">BTK</span>
                        </CardTitle>
                    </CardHeader>
                </Card>

                <Card className="bg-gradient-to-br from-background to-emerald-950/20 border-emerald-500/20 shadow-xl shadow-emerald-500/5">
                    <CardHeader className="pb-2">
                        <CardDescription className="flex items-center gap-2">
                            <Coins className="w-4 h-4 text-emerald-400" />
                            Pending Rewards
                        </CardDescription>
                        <CardTitle className="text-3xl font-mono">
                            {stakeInfo ? '12.4' : '0.0'} <span className="text-sm font-sans font-medium text-muted-foreground">BTK</span>
                        </CardTitle>
                    </CardHeader>
                </Card>

                <Card className="bg-gradient-to-br from-background to-amber-950/20 border-amber-500/20 shadow-xl shadow-amber-500/5">
                    <CardHeader className="pb-2">
                        <CardDescription className="flex items-center gap-2">
                            <Award className="w-4 h-4 text-amber-400" />
                            Reward Multiplier
                        </CardDescription>
                        <CardTitle className="text-3xl font-mono text-amber-400">
                            {stakeInfo ? '1.2x' : '1.0x'}
                        </CardTitle>
                    </CardHeader>
                </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-4">
                <Card className="border-indigo-500/10 bg-black/40 backdrop-blur-sm relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <ArrowUpRight className="w-24 h-24 text-indigo-500" />
                    </div>
                    <CardHeader>
                        <CardTitle>Stake BTK</CardTitle>
                        <CardDescription>Add tokens to your stake to increase rewards.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Amount to Stake</label>
                            <div className="relative">
                                <Input
                                    type="number"
                                    placeholder="0.00"
                                    value={stakeAmount}
                                    onChange={(e) => setStakeAmount(e.target.value)}
                                    className="pl-10 h-12 bg-white/5 border-white/10 focus:border-indigo-500/50 transition-all text-lg font-mono"
                                />
                                <Coins className="absolute left-3 top-3.5 w-5 h-5 text-muted-foreground" />
                            </div>
                        </div>
                        <Button
                            className="w-full h-12 text-lg bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-600/20"
                            onClick={handleStake}
                            disabled={loading || !isConnected}
                        >
                            {loading ? 'Processing...' : 'Confirm Staking'}
                        </Button>
                    </CardContent>
                </Card>

                <Card className="border-emerald-500/10 bg-black/40 backdrop-blur-sm relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Clock className="w-24 h-24 text-emerald-500" />
                    </div>
                    <CardHeader>
                        <CardTitle>Unstake & Claim</CardTitle>
                        <CardDescription>Withdraw your tokens and claim accumulated rewards.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4 pt-4">
                        <div className="bg-emerald-500/5 rounded-xl p-4 border border-emerald-500/10 mb-6">
                            <p className="text-sm text-emerald-400/80 leading-relaxed">
                                Tokens can be unstaked after the minimum duration (24h). Your rewards are calculated per block based on your multiplier.
                            </p>
                        </div>
                        <Button
                            variant="outline"
                            className="w-full h-12 text-lg border-emerald-500/20 hover:bg-emerald-500/10 text-emerald-400"
                            onClick={handleUnstake}
                            disabled={loading || !isConnected}
                        >
                            {loading ? 'Processing...' : 'Unstake All'}
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
