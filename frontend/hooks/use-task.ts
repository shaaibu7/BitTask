
import { useState, useEffect, useCallback } from 'react';
import { Task, fetchTasks, fetchTask } from '../lib/contracts';

export function useTasks() {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    const refreshTasks = useCallback(async () => {
        setIsLoading(true);
        try {
            const data = await fetchTasks();
            setTasks(data);
            setError(null);
        } catch (err) {
            setError(err as Error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        refreshTasks();
    }, [refreshTasks]);

    return { tasks, isLoading, error, refreshTasks };
}

export function useTask(id: number) {
    const [task, setTask] = useState<Task | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    const refreshTask = useCallback(async () => {
        if (!id) return;
        setIsLoading(true);
        try {
            const data = await fetchTask(id);
            setTask(data);
            setError(null);
        } catch (err) {
            setError(err as Error);
        } finally {
            setIsLoading(false);
        }
    }, [id]);

    useEffect(() => {
        refreshTask();
    }, [refreshTask]);

    return { task, isLoading, error, refreshTask };
}
