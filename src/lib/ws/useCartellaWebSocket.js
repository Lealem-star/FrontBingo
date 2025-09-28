import { useEffect, useRef, useState, useCallback } from 'react';

export function useCartellaWebSocket(stake, sessionId) {
    const wsRef = useRef(null);
    const [connected, setConnected] = useState(false);
    const [gameState, setGameState] = useState({
        phase: 'waiting',
        gameId: null,
        playersCount: 0,
        countdown: 15,
        takenCards: [],
        prizePool: 0,
        yourSelection: null
    });
    const [lastEvent, setLastEvent] = useState(null);

    const send = useCallback((type, payload) => {
        const ws = wsRef.current;
        const message = JSON.stringify({ type, payload });
        console.log('WebSocket send:', { type, payload, connected, readyState: ws?.readyState });

        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(message);
        } else {
            console.warn('WebSocket not ready, message not sent:', { type, payload });
        }
    }, [connected]);

    useEffect(() => {
        if (!stake || !sessionId) return;

        let stopped = false;
        let retry = 0;
        let heartbeat = null;

        const connect = () => {
            const wsUrl = `ws://localhost:3001/ws?token=${sessionId}&stake=${stake}`;
            console.log('Connecting to WebSocket:', wsUrl);

            const ws = new WebSocket(wsUrl);
            wsRef.current = ws;

            ws.onopen = () => {
                console.log('Cartella WebSocket connected');
                setConnected(true);
                retry = 0;

                // Join the room for this stake
                send('join_room', { stake });
            };

            ws.onmessage = (e) => {
                try {
                    const event = JSON.parse(e.data);
                    console.log('Cartella WebSocket event:', event.type, event.payload);

                    setLastEvent(event);

                    // Handle different event types
                    switch (event.type) {
                        case 'snapshot':
                            setGameState(prev => ({
                                ...prev,
                                phase: event.payload.phase,
                                gameId: event.payload.gameId,
                                playersCount: event.payload.playersCount,
                                takenCards: event.payload.takenCards || [],
                                yourSelection: event.payload.yourSelection,
                                prizePool: event.payload.prizePool || 0
                            }));
                            break;

                        case 'registration_open':
                            setGameState(prev => ({
                                ...prev,
                                phase: 'registration',
                                gameId: event.payload.gameId,
                                playersCount: event.payload.playersCount,
                                takenCards: event.payload.takenCards || [],
                                prizePool: event.payload.prizePool || 0,
                                registrationEndTime: event.payload.endsAt,
                                countdown: Math.ceil((event.payload.endsAt - Date.now()) / 1000)
                            }));
                            break;

                        case 'registration_update':
                            setGameState(prev => ({
                                ...prev,
                                takenCards: event.payload.takenCards || [],
                                prizePool: event.payload.prizePool || 0
                            }));
                            break;

                        case 'players_update':
                            setGameState(prev => ({
                                ...prev,
                                playersCount: event.payload.playersCount,
                                prizePool: event.payload.prizePool || 0
                            }));
                            break;

                        case 'selection_confirmed':
                            setGameState(prev => ({
                                ...prev,
                                yourSelection: event.payload.cardNumber,
                                playersCount: event.payload.playersCount,
                                prizePool: event.payload.prizePool || 0
                            }));
                            break;

                        case 'selection_rejected':
                            console.warn('Selection rejected:', event.payload);
                            break;

                        case 'game_started':
                            setGameState(prev => ({
                                ...prev,
                                phase: 'running',
                                gameId: event.payload.gameId,
                                playersCount: event.payload.playersCount,
                                prizePool: event.payload.prizePool
                            }));
                            break;

                        case 'registration_closed':
                            setGameState(prev => ({
                                ...prev,
                                phase: 'starting'
                            }));
                            break;

                        case 'game_cancelled':
                            setGameState(prev => ({
                                ...prev,
                                phase: 'waiting',
                                gameId: null,
                                playersCount: 0,
                                yourSelection: null
                            }));
                            break;
                    }
                } catch (error) {
                    console.error('Error parsing WebSocket message:', error);
                }
            };

            ws.onclose = (event) => {
                console.log('Cartella WebSocket closed:', event.code, event.reason);
                setConnected(false);
                if (heartbeat) {
                    clearInterval(heartbeat);
                    heartbeat = null;
                }

                if (!stopped) {
                    const delay = Math.min(1000 * 2 ** retry, 10000);
                    retry += 1;
                    console.log(`Retrying WebSocket connection in ${delay}ms (attempt ${retry})`);
                    setTimeout(connect, delay);
                }
            };

            ws.onerror = (error) => {
                console.error('Cartella WebSocket error:', error);
                ws.close();
            };

            // Start heartbeat keepalive every 20s
            heartbeat = setInterval(() => {
                try {
                    if (ws.readyState === WebSocket.OPEN) {
                        ws.send(JSON.stringify({ type: 'ping', payload: { ts: Date.now() } }));
                    }
                } catch (_) { }
            }, 20000);
        };

        connect();

        return () => {
            stopped = true;
            wsRef.current?.close();
            if (heartbeat) {
                clearInterval(heartbeat);
                heartbeat = null;
            }
        };
    }, [stake, sessionId, send]);

    // Countdown effect - decrement every second when in registration phase
    useEffect(() => {
        if (gameState.phase !== 'registration') return;

        const interval = setInterval(() => {
            setGameState(prev => {
                if (prev.phase === 'registration') {
                    // Calculate countdown based on registration end time
                    const now = Date.now();
                    const endTime = prev.registrationEndTime || (now + 15000);
                    const remaining = Math.max(0, Math.ceil((endTime - now) / 1000));

                    if (remaining === 0) {
                        return {
                            ...prev,
                            phase: 'starting',
                            countdown: 0
                        };
                    }

                    return {
                        ...prev,
                        countdown: remaining
                    };
                }
                return prev;
            });
        }, 1000);

        return () => clearInterval(interval);
    }, [gameState.phase, gameState.registrationEndTime]);

    const selectCartella = useCallback((cardNumber) => {
        if (!connected) {
            console.error('WebSocket not connected');
            return false;
        }

        send('select_card', { cardNumber });
        return true;
    }, [connected, send]);

    const startRegistration = useCallback(() => {
        if (!connected) {
            console.error('WebSocket not connected');
            return false;
        }

        send('start_registration', {});
        return true;
    }, [connected, send]);

    return {
        connected,
        gameState,
        lastEvent,
        selectCartella,
        startRegistration,
        send
    };
}
