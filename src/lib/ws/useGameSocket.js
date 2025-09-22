import { useEffect, useRef, useState, useCallback } from 'react';

export function useGameSocket(url, { onEvent, token } = {}) {
    const wsRef = useRef(null);
    const [connected, setConnected] = useState(false);
    const [lastEvent, setLastEvent] = useState(null);

    const send = useCallback((type, payload) => {
        const ws = wsRef.current;
        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type, payload }));
        }
    }, []);

    useEffect(() => {
        if (!url || !token) return;
        let stopped = false;
        let retry = 0;

        const connect = () => {
            const wsUrl = new URL(url);
            wsUrl.searchParams.set('token', token);
            const ws = new WebSocket(wsUrl.toString());
            wsRef.current = ws;

            ws.onopen = () => {
                setConnected(true);
                retry = 0;
            };
            ws.onmessage = (e) => {
                try {
                    const evt = JSON.parse(e.data);
                    setLastEvent(evt);
                    onEvent && onEvent(evt);
                } catch { }
            };
            ws.onclose = () => {
                setConnected(false);
                if (!stopped) {
                    const delay = Math.min(1000 * 2 ** retry, 10000);
                    retry += 1;
                    setTimeout(connect, delay);
                }
            };
            ws.onerror = () => ws.close();
        };

        connect();
        return () => {
            stopped = true;
            wsRef.current?.close();
        };
    }, [url, token, onEvent]);

    return { connected, lastEvent, send };
}
