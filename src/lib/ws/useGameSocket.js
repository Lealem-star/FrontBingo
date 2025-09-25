import { useEffect, useRef, useState, useCallback } from 'react';

export function useGameSocket(url, { onEvent, token } = {}) {
    const wsRef = useRef(null);
    const [connected, setConnected] = useState(false);
    const [lastEvent, setLastEvent] = useState(null);

    const send = useCallback((type, payload) => {
        const ws = wsRef.current;
        console.log('WebSocket send attempt:', { type, payload, connected, readyState: ws?.readyState });
        if (ws && ws.readyState === WebSocket.OPEN) {
            const message = JSON.stringify({ type, payload });
            console.log('Sending WebSocket message:', message);
            ws.send(message);
        } else {
            console.warn('WebSocket not ready:', { connected, readyState: ws?.readyState });
        }
    }, [connected]);

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
                console.log('WebSocket connected');
                setConnected(true);
                retry = 0;
            };
            ws.onmessage = (e) => {
                try {
                    const evt = JSON.parse(e.data);
                    try { console.debug('[WS] event:', evt.type, evt.payload); } catch { }
                    setLastEvent(evt);
                    onEvent && onEvent(evt);
                } catch { }
            };
            ws.onclose = (event) => {
                console.log('WebSocket closed:', event.code, event.reason);
                setConnected(false);
                if (!stopped) {
                    const delay = Math.min(1000 * 2 ** retry, 10000);
                    retry += 1;
                    console.log(`Retrying connection in ${delay}ms (attempt ${retry})`);
                    setTimeout(connect, delay);
                }
            };
            ws.onerror = (error) => {
                console.error('WebSocket error:', error);
                ws.close();
            };
        };

        connect();
        return () => {
            stopped = true;
            wsRef.current?.close();
        };
    }, [url, token, onEvent]);

    return { connected, lastEvent, send };
}
