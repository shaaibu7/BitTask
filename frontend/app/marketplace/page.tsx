'use client';

import { useEffect, useState } from 'react';
import { Task, fetchTasks } from '../../lib/contracts';
import { TaskCard } from '../../components/TaskCard';
import { Loader2 } from 'lucide-react';

export default function MarketplacePage() {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        async function loadTasks() {
            try {
                const fetchedTasks = await fetchTasks();
                setTasks(fetchedTasks);
            } catch (error) {
                console.error('Failed to load tasks', error);
            } finally {
                setIsLoading(false);
            }
        }

        loadTasks();
    }, []);

    return (
        <div className="min-h-screen bg-gray-950 text-white p-8">
            <div className="max-w-7xl mx-auto space-y-8">
                <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-bold">Marketplace</h1>
                        <p className="text-gray-400">Explore and pick up microgigs</p>
                    </div>
                    {/* Future: Add search/filter here */}
                </div>

                {isLoading ? (
                    <div className="flex justify-center items-center h-64">
                        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
                    </div>
                ) : tasks.length === 0 ? (
                    <div className="text-center py-24 bg-gray-900 rounded-2xl border border-gray-800">
                        <h3 className="text-xl font-semibold text-gray-300">No tasks found</h3>
                        <p className="text-gray-500 mt-2">Be the first to post a task!</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {tasks.map((task) => (
                            <TaskCard key={task.id} task={task} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
