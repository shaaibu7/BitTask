import { useRef, useEffect } from 'react';

export function useEventListener(
    eventName: string,
    handler: EventListener,
    element?: HTMLElement | Window
) {
    const savedHandler = useRef<EventListener>();

    useEffect(() => {
        savedHandler.current = handler;
    }, [handler]);

    useEffect(() => {
        const targetElement: HTMLElement | Window = element || window;
        const isSupported = targetElement && targetElement.addEventListener;

        if (!isSupported) return;

        const eventListener: EventListener = (event) => {
            if (savedHandler.current) {
                savedHandler.current(event);
            }
        };

        targetElement.addEventListener(eventName, eventListener);

        return () => {
            targetElement.removeEventListener(eventName, eventListener);
        };
    }, [eventName, element]);
}
