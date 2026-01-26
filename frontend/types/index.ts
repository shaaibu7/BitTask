export interface Task {
    id: number;
    title: string;
    description: string;
    reward: number;
    deadline: number;
    creator: string;
    assignee: string | null;
    status: 'open' | 'in-progress' | 'submitted' | 'completed' | 'disputed';
}

export interface User {
    address: string;
    balance: number;
}
