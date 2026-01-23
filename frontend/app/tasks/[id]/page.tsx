'use client';

import { use, useEffect, useState } from 'react';
import { Task, fetchTask } from '../../../lib/contracts';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/Card';
import { Loader2, ArrowLeft, Calendar, User, DollarSign } from 'lucide-react';
import Link from 'next/link';

export default function TaskDetailsPage({ params }: { params: Promise<{ id: string }> }) {
    const resolvedParams = use(params);
    const [task, setTask] = useState<Task | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        async function loadTask() {
            try {
                // Mock fetch for now as individual fetch logic might need adjustment
                const allTasks = await fetchTask(parseInt(resolvedParams.id));
                setTask(allTasks);
            } catch (error) {
                console.error('Failed to load task', error);
            } finally {
                setIsLoading(false);
            }
        }
        loadTask();
    }, [resolvedParams.id]);

    if (isLoading) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            </div>
        );
    }

    if (!task) {
        return (
            <div className="flex min-h-screen flex-col items-center justify-center gap-4">
                <h1 className="text-2xl font-bold">Task not found</h1>
                <Link href="/">
                    <Button variant="outline">Go Home</Button>
                </Link>
            </div>
        );
    }

    return (
        <div className="container mx-auto max-w-4xl px-4 py-8">
            <Link href="/">
                <Button variant="ghost" className="mb-6 pl-0">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Tasks
                </Button>
            </Link>

            <div className="grid gap-6 md:grid-cols-3">
                <div className="md:col-span-2 space-y-6">
                    <Card>
                        <CardHeader>
                            <div className="flex justify-between items-start">
                                <Badge variant="outline">#{task.id}</Badge>
                                <Badge className="capitalize">{task.status}</Badge>
                            </div>
                            <CardTitle className="text-3xl mt-4">{task.title}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="prose dark:prose-invert max-w-none">
                                <h3 className="text-lg font-semibold mb-2">Description</h3>
                                <p className="text-slate-600 dark:text-slate-300 whitespace-pre-wrap">
                                    {task.description}
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Details</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center text-slate-500">
                                    <DollarSign className="mr-2 h-4 w-4" />
                                    Reward
                                </div>
                                <span className="font-bold text-lg">{task.amount} STX</span>
                            </div>

                            <div className="flex items-center justify-between">
                                <div className="flex items-center text-slate-500">
                                    <Calendar className="mr-2 h-4 w-4" />
                                    Deadline
                                </div>
                                <span>Block {task.deadline}</span>
                            </div>

                            <div className="flex items-center justify-between">
                                <div className="flex items-center text-slate-500">
                                    <User className="mr-2 h-4 w-4" />
                                    Creator
                                </div>
                                <span className="font-mono text-sm truncate w-24" title={task.creator}>
                                    {task.creator.slice(0, 6)}...
                                </span>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="pt-6">
                            <Button className="w-full" size="lg">
                                Accept Task
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
