
import { Task } from '../../lib/contracts';
import { TaskCard } from './ui/TaskCard';
import { Loader2 } from 'lucide-react';
import { Card, CardContent } from './ui/Card';

interface TaskListProps {
    tasks: Task[];
    isLoading: boolean;
}

export function TaskList({ tasks, isLoading }: TaskListProps) {
    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
            </div>
        );
    }

    if (tasks.length === 0) {
        return (
            <Card className="bg-slate-50 border-slate-200 dark:bg-slate-900/50 dark:border-slate-800">
                <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                    <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-200">No tasks found</h3>
                    <p className="text-slate-500 dark:text-slate-400 mt-2 max-w-sm">
                        Try adjusting your search or filters, or be the first to post a new task!
                    </p>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tasks.map((task) => (
                <TaskCard key={task.id} task={task} />
            ))}
        </div>
    );
}
