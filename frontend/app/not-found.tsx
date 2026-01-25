import Link from 'next/link';
import { Button } from '@/components/ui/Button';

export default function NotFound() {
    return (
        <div className="flex min-h-[50vh] flex-col items-center justify-center text-center">
            <h2 className="text-4xl font-bold tracking-tight">404</h2>
            <p className="mt-4 text-lg text-slate-500 dark:text-slate-400">Page Not Found</p>
            <div className="mt-8">
                <Link href="/">
                    <Button variant="primary">Return Home</Button>
                </Link>
            </div>
        </div>
    );
}
