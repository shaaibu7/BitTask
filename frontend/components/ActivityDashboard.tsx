'use client';

import React, { useState, useEffect } from 'react';
import { useStacksWallet } from '../lib/stacks-wallet';
import { Card, CardHeader, CardTitle, CardContent } from './ui/Card';
import { Badge } from './ui/Badge';
import { Skeleton } from './ui/Skeleton';
import { TrendingUp, Users, Award, Zap, Activity } from 'lucide-react';

interface ActivityStats {
    points: number;
    referrals: number;
    multiplier: number;
    tasksCompleted: number;
    impactScore: number;
}

export function ActivityDashboard() {
    const { isConnected, address } = useStacksWallet();
    const [stats, setStats] = useState<ActivityStats | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (isConnected) {
            // Simulate fetching stats from contract/indexer
            setTimeout(() => {
                setStats({
                    points: 1250,
                    referrals: 8,
                    multiplier: 1.1,
                    tasksCompleted: 5,
                    impactScore: 85,
                });
                setIsLoading(false);
            }, 1500);
        }
    }, [isConnected]);

    if (!isConnected) return null;

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    title="Impact Points"
                    value={isLoading ? null : stats?.points}
                    icon={<TrendingUp className="w-4 h-4 text-green-500" />}
                    description="Total points earned"
                />
                <StatCard
                    title="Referrals"
                    value={isLoading ? null : stats?.referrals}
                    icon={<Users className="w-4 h-4 text-blue-500" />}
                    description="Active network size"
                />
                <StatCard
                    title="Multiplier"
                    value={isLoading ? null : `${stats?.multiplier}x`}
                    icon={<Zap className="w-4 h-4 text-yellow-500" />}
                    description="Earning bonus tier"
                />
                <StatCard
                    title="Tasks Done"
                    value={isLoading ? null : stats?.tasksCompleted}
                    icon={<Award className="w-4 h-4 text-purple-500" />}
                    description="Verified contributions"
                />
            </div>

            <Card className="border-primary/10 overflow-hidden">
                <CardHeader className="bg-primary/5 border-b border-primary/10">
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <Activity className="w-5 h-5 text-primary" />
                        Network Activity & Impact
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="p-6 space-y-6">
                        <div className="space-y-2">
                            <div className="flex justify-between items-end">
                                <span className="text-sm font-medium">Impact Score</span>
                                <span className="text-2xl font-bold text-primary">{isLoading ? '--' : stats?.impactScore}%</span>
                            </div>
                            <div className="w-full bg-primary/10 rounded-full h-3">
                                <div
                                    className="bg-primary h-3 rounded-full transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(var(--primary),0.5)]"
                                    style={{ width: isLoading ? '0%' : `${stats?.impactScore}%` }}
                                />
                            </div>
                            <p className="text-xs text-muted-foreground italic">
                                Your impact score is calculated based on smart contract interactions and community contributions.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-primary/5">
                            <div className="space-y-3">
                                <h4 className="text-sm font-semibold flex items-center gap-2">
                                    <TrendingUp className="w-4 h-4" /> Recent Growth
                                </h4>
                                <div className="h-24 bg-primary/5 rounded-lg flex items-end p-2 gap-1">
                                    {[40, 60, 45, 70, 85, 90, 100].map((h, i) => (
                                        <div
                                            key={i}
                                            className="flex-1 bg-primary/40 rounded-t-sm hover:bg-primary transition-all cursor-pointer"
                                            style={{ height: isLoading ? '10%' : `${h}%` }}
                                        />
                                    ))}
                                </div>
                            </div>
                            <div className="space-y-3">
                                <h4 className="text-sm font-semibold">Tier Status</h4>
                                <div className="p-4 bg-primary/5 rounded-lg flex items-center justify-between">
                                    <div>
                                        <p className="font-bold">Gold Contributor</p>
                                        <p className="text-xs text-muted-foreground">Next tier: Platinum (4,000 pts)</p>
                                    </div>
                                    <div className="w-12 h-12 rounded-full border-2 border-primary/30 flex items-center justify-center bg-primary/10 shadow-inner">
                                        <Award className="w-6 h-6 text-primary" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

function StatCard({ title, value, icon, description }: { title: string, value: any, icon: React.ReactNode, description: string }) {
    return (
        <Card className="border-primary/5 hover:border-primary/20 transition-all hover:scale-[1.02] cursor-default">
            <CardContent className="p-4">
                <div className="flex justify-between items-start">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{title}</span>
                    {icon}
                </div>
                <div className="mt-2 flex items-baseline gap-2">
                    {value === null ? (
                        <Skeleton className="h-8 w-20" />
                    ) : (
                        <span className="text-2xl font-bold tracking-tight">{value}</span>
                    )}
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">{description}</p>
            </CardContent>
        </Card>
    );
}
