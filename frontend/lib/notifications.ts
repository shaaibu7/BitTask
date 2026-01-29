import { toast } from 'sonner';

export const showNotification = {
  success: (message: string, description?: string) => {
    toast.success(message, {
      description,
      duration: 4000,
    });
    addPersistentNotification({ title: message, message: description || '', type: 'success' });
  },
  error: (message: string, description?: string) => {
    toast.error(message, {
      description,
      duration: 4000,
    });
    addPersistentNotification({ title: message, message: description || '', type: 'error' });
  },
  loading: (message: string) => {
    return toast.loading(message);
  },
  promise: <T,>(
    promise: Promise<T>,
    messages: {
      loading: string;
      success: string;
      error: string;
    }
  ) => {
    return toast.promise(promise, {
      ...messages,
      finally: () => {
        // Option to add persistent notification on completion
      }
    });
  },
};

/**
 * Persistent Notification System
 */

export interface PersistentNotification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  timestamp: number;
  read: boolean;
  link?: string;
}

const STORAGE_KEY = 'bittask_persistent_notifications';

export const getPersistentNotifications = (): PersistentNotification[] => {
  if (typeof window === 'undefined') return [];
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored ? JSON.parse(stored) : [];
};

export const savePersistentNotifications = (notifications: PersistentNotification[]) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications));
  window.dispatchEvent(new CustomEvent('notifications-updated'));
};

export const addPersistentNotification = (notification: Omit<PersistentNotification, 'id' | 'timestamp' | 'read'>) => {
  const notifications = getPersistentNotifications();
  const newNotification: PersistentNotification = {
    ...notification,
    id: Math.random().toString(36).substring(2, 9),
    timestamp: Date.now(),
    read: false,
  };
  savePersistentNotifications([newNotification, ...notifications].slice(0, 50));
  return newNotification;
};

export const markPersistentAsRead = (id: string) => {
  const notifications = getPersistentNotifications();
  const updated = notifications.map(n => n.id === id ? { ...n, read: true } : n);
  savePersistentNotifications(updated);
};

export const clearPersistentNotifications = () => {
  savePersistentNotifications([]);
};
