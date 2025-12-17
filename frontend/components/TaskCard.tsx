import { Task } from "../lib/contracts";
import Link from "next/link";

interface TaskCardProps {
    task: Task;
}

export function TaskCard({ task }: TaskCardProps) {
    const isExpired = Date.now() > task.deadline * 1000;

    return (
        <Link href={`/marketplace/${task.id}`}>
            <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 hover:border-indigo-500/50 transition-colors flex flex-col justify-between h-full cursor-pointer hover:bg-gray-800/80">
                <div className="space-y-4">
                    <div className="flex justify-between items-start">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${task.status === 'open' ? 'bg-green-500/10 text-green-400' :
                                task.status === 'in-progress' ? 'bg-yellow-500/10 text-yellow-400' :
                                    'bg-gray-700 text-gray-400'
                            }`}>
                            {task.status.toUpperCase()}
                        </span>
                        <span className="text-gray-400 text-sm">
                            ID: #{task.id}
                        </span>
                    </div>

                    <div>
                        <h3 className="text-xl font-bold text-white mb-2 line-clamp-2">{task.title}</h3>
                        <p className="text-gray-400 text-sm line-clamp-3 mb-4">{task.description}</p>
                    </div>
                </div>

                <div className="space-y-4 mt-4 pt-4 border-t border-gray-700">
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-500">Reward</span>
                        <span className="font-semibold text-indigo-400">{task.amount} STX</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-500">Deadline</span>
                        <span className={`${isExpired ? 'text-red-400' : 'text-gray-300'}`}>
                            {new Date(task.deadline * 1000).toLocaleDateString()}
                        </span>
                    </div>

                    <button
                        className="w-full py-2 px-4 bg-indigo-600 hover:bg-indigo-700 rounded-lg text-white font-medium transition-colors"
                    >
                        View Details
                    </button>
                </div>
            </div>
        </Link>
    );
}
