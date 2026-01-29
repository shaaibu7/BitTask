'use client';

import React, { useState, useEffect } from 'react';
import { getPersistentNotifications, markPersistentAsRead, clearPersistentNotifications, PersistentNotification } from '../lib/notifications';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from './ui/Card';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { Bell, Check, Trash2, X } from 'lucide-react';

export function NotificationCenter() {
    const [notifications, setNotifications] = useState<PersistentNotification[]>([]);
    const [isOpen, setIsOpen] = useState(false);

    const refreshNotifications = () => {
        setNotifications(getPersistentNotifications());
    };

    useEffect(() => {
        refreshNotifications();
        window.addEventListener('notifications-updated', refreshNotifications);
        return () => window.removeEventListener('notifications-updated', refreshNotifications);
    }, []);

    const unreadCount = notifications.filter(n => !n.read).length;

    const handleMarkAsRead = (id: string) => {
        markPersistentAsRead(id);
    };

    const handleClearAll = () => {
        clearPersistentNotifications();
    };

    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className="relative p-2 rounded-full hover:bg-primary/10 transition-colors"
            >
                <Bell className="w-5 h-5 text-muted-foreground" />
                {unreadCount > 0 && (
                    <span className="absolute top-0 right-0 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] text-white font-bold">
                        {unreadCount}
                    </span>
                )}
            </button>
        );
    }

    return (
        <div className="fixed inset-y-0 right-0 w-80 bg-background border-l border-primary/10 shadow-2xl z-50 animate-in slide-in-from-right duration-300">
            <div className="flex flex-col h-full">
                <div className="p-4 border-b border-primary/10 flex justify-between items-center bg-primary/5">
                    <div className="flex items-center gap-2">
                        <Bell className="w-5 h-5 text-primary" />
                        <span className="font-bold">Notifications</span>
                        {unreadCount > 0 && (
                            <Badge variant="default" className="text-[10px]">
                                {unreadCount} New
                            </Badge>
                        )}
                    </div>
                    <button onClick={() => setIsOpen(false)} className="p-1 hover:bg-primary/10 rounded-full transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-2 space-y-2">
                    {notifications.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-muted-foreground space-y-2 opacity-50">
                            <Bell className="w-12 h-12" />
                            <p className="text-sm">No notifications yet</p>
                        </div>
                    ) : (
                        notifications.map((n) => (
                            <div
                                key={n.id}
                                className={`p-3 rounded-lg border text-sm transition-all ${n.read ? 'bg-background border-primary/5 opacity-70' : 'bg-primary/5 border-primary/20 scale-[1.02]'
                                    }`}
                                onClick={() => handleMarkAsRead(n.id)}
                            >
                                <div className="flex justify-between items-start gap-2">
                                    <span className={`font-semibold ${n.read ? 'text-foreground' : 'text-primary'}`}>{n.title}</span>
                                    {!n.read && <div className="w-2 h-2 rounded-full bg-primary mt-1" />}
                                </div>
                                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{n.message}</p>
                                <div className="mt-2 text-[10px] text-muted-foreground/60 flex justify-between items-center">
                                    <span>{new Date(n.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                    {n.read && <span className="flex items-center gap-1 italic"><Check className="w-3 h-3" /> read</span>}
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {notifications.length > 0 && (
                    <div className="p-4 border-t border-primary/10 bg-primary/5">
                        <Button
                            variant="outline"
                            className="w-full text-xs gap-2 group border-primary/10 hover:bg-primary/10"
                            onClick={handleClearAll}
                        >
                            <Trash2 className="w-4 h-4 group-hover:text-red-500 transition-colors" />
                            Clear History
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
}
