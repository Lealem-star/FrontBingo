import React, { useMemo, useState, useEffect, useRef } from 'react';
import BottomNav from '../components/BottomNav';
import GameLayout from '../components/GameLayout';
import WinnerAnnounce from '../components/WinnerAnnounce';
import { useGameSocket } from '../lib/ws/useGameSocket';
import { playNumberSound } from '../lib/audio/numberSounds';
import { useAuth } from '../lib/auth/AuthProvider';
import lbLogo from '../assets/lb.png';
import { apiFetch } from '../lib/api/client';

export default function Game({ onNavigate, onStakeSelected, selectedCartela, selectedStake }) {
    const { sessionId, user, isLoading } = useAuth();

    // Debug logging
    console.log('Game component render:', { sessionId: !!sessionId, user: !!user, isLoading, selectedStake });

    // Add a visible test element to see if component is rendering at all
    if (isLoading) {
        return (
            <div className="min-h-screen bg-red-500 flex items-center justify-center">
                <div className="text-white text-2xl">Game Loading...</div>
            </div>
        );
    }
    const [stake, setStake] = useState(selectedStake);
    const [phase, setPhase] = useState('lobby');
    const [gameId, setGameId] = useState(null);
    const [availableCards, setAvailableCards] = useState([]);
    const [called, setCalled] = useState([]);
    const [myCard, setMyCard] = useState(null);
    const [pendingSelectedCardNumber, setPendingSelectedCardNumber] = useState(null);
    const [endsAt, setEndsAt] = useState(null);
    const [winners, setWinners] = useState([]);
    const [showWinners, setShowWinners] = useState(false);
    const [currentCalledNumber, setCurrentCalledNumber] = useState(null);
    const [playersCount, setPlayersCount] = useState(0);
    const [prizePool, setPrizePool] = useState(0);
    const [profile, setProfile] = useState(null);
    const [wallet, setWallet] = useState({ balance: 0, coins: 0, gamesWon: 0 });
    const [adminPost, setAdminPost] = useState(null);
    const [debugOpen, setDebugOpen] = useState(false); // Hide by default
    const [lastWsEvent, setLastWsEvent] = useState(null);
    const [selectionConfirmed, setSelectionConfirmed] = useState(false);
    const [requestedRegistration, setRequestedRegistration] = useState(false);
    const [debugMessages, setDebugMessages] = useState(['App started']);

    // Define debug logger before any usage
    const addDebugMessage = (message) => {
        const timestamp = new Date().toLocaleTimeString();
        setDebugMessages(prev => [...prev.slice(-9), `${timestamp}: ${message}`]);
    };

    // Update stake when selectedStake prop changes
    useEffect(() => {
        if (selectedStake && selectedStake !== stake) {
            setStake(selectedStake);
        }
    }, [selectedStake, stake]);

    // Add authentication status to debug messages
    useEffect(() => {
        addDebugMessage(`Auth: sessionId ${sessionId ? 'present' : 'missing'}`);
    }, [sessionId]);

    // Add URL debugging
    useEffect(() => {
        addDebugMessage(`API URL: ${import.meta.env.VITE_API_URL || (window.location.hostname === 'localhost' ? 'http://localhost:3001' : 'https://bingo-back-2evw.onrender.com')}`);
    }, []);

    const wsUrl = useMemo(() => {
        // Use environment variable or try to detect the correct URL
        const base = import.meta.env.VITE_WS_URL ||
            (window.location.hostname === 'localhost' ? 'ws://localhost:3001/ws' :
                'wss://bingo-back-2evw.onrender.com/ws');
        console.log('WebSocket URL:', base);
        return stake ? `${base}?stake=${stake}` : null;
    }, [stake]);

    // Log wsUrl after it is computed
    useEffect(() => {
        if (wsUrl) addDebugMessage(`WebSocket URL: ${wsUrl}`);
    }, [wsUrl]);

    // Initialize websocket before effects that depend on `connected`
    const { connected, send } = useGameSocket(wsUrl, {
        token: sessionId, // Use real session token
        onEvent: (evt) => {
            try {
                setLastWsEvent(evt);
                addDebugMessage(`Received: ${evt.type}`);
            } catch (_) { }
            switch (evt.type) {
                case 'lobby_info':
                    setPhase(evt.payload.phase);
                    setEndsAt(evt.payload.nextStartAt || null);
                    break;
                case 'registration_open':
                    setPhase('registration');
                    setGameId(evt.payload.gameId);
                    setAvailableCards(evt.payload.availableCards || []);
                    setEndsAt(evt.payload.endsAt);
                    setPlayersCount(Number(evt.payload.playersCount || 0));
                    setPrizePool(Number(evt.payload.prizePool || 0));
                    // If user selected a cartella before a gameId existed, auto-send now
                    if (pendingSelectedCardNumber) {
                        try { send('select_card', { gameId: evt.payload.gameId, cardNumber: pendingSelectedCardNumber }); } catch (_) { }
                    }
                    break;
                case 'registration_update':
                    if (typeof evt.payload.timeLeft === 'number') {
                        setEndsAt(Date.now() + evt.payload.timeLeft * 1000);
                    }
                    if (typeof evt.payload.prizePool === 'number') {
                        setPrizePool(evt.payload.prizePool);
                    }
                    break;
                case 'registration_closed':
                    // Return to registration and rely on server to drive countdown/opening
                    setPhase('registration');
                    break;
                case 'game_started':
                    setPhase('running');
                    setGameId(evt.payload.gameId);
                    // Use server-provided card data for consistent gameplay
                    setMyCard(evt.payload.card ? { id: pendingSelectedCardNumber, data: evt.payload.card } : null);
                    setCalled(evt.payload.called || evt.payload.calledNumbers || []);
                    setPlayersCount(Number(evt.payload.playersCount || playersCount));
                    setPrizePool(Number(evt.payload.prizePool || prizePool));
                    setEndsAt(null);
                    break;
                case 'number_called': {
                    const n = evt.payload.value;
                    setCalled(evt.payload.called || []);
                    setCurrentCalledNumber(n);
                    playNumberSound(n).finally(() => {
                        try { send('audio_done', { gameId: evt.payload.gameId || gameId }); } catch (_) { }
                    });
                    break;
                }
                case 'bingo_accepted': {
                    const winnersList = Array.isArray(evt.payload?.winners) ? evt.payload.winners : [];
                    if (winnersList.length) {
                        setWinners(winnersList);
                        setShowWinners(true);
                        setPhase('announce');
                    }
                    break;
                }
                case 'game_finished':
                    setPhase('announce');
                    setEndsAt(evt.payload.nextStartAt);
                    setWinners(evt.payload.winners || []);
                    setShowWinners(true);
                    // Redirect to cartella selection after short delay
                    setTimeout(() => {
                        onNavigate?.('cartela-selection');
                    }, 3000);
                    break;
                case 'snapshot':
                    setPhase(evt.payload.phase);
                    setGameId(evt.payload.gameId || null);
                    // Use server card data if available, otherwise keep existing
                    if (evt.payload.card) {
                        setMyCard({ id: pendingSelectedCardNumber, data: evt.payload.card });
                    } else if (!myCard && pendingSelectedCardNumber) {
                        setMyCard({ id: pendingSelectedCardNumber });
                    }
                    setCalled(evt.payload.called || evt.payload.calledNumbers || []);
                    setAvailableCards(evt.payload.availableCards || []);
                    setEndsAt(evt.payload.nextStartAt || evt.payload.endsAt || null);
                    setPlayersCount(Number(evt.payload.playersCount || playersCount));
                    // If room is idle (waiting), proactively request registration to start
                    if (stake && evt.payload.phase === 'waiting' && !requestedRegistration) {
                        try { send('start_registration', {}); setRequestedRegistration(true); } catch (_) { }
                    }
                    break;
                case 'players_update':
                    setPlayersCount(Number(evt.payload.playersCount || 0));
                    if (typeof evt.payload.prizePool === 'number') {
                        setPrizePool(evt.payload.prizePool);
                    }
                    break;
                case 'selection_confirmed': {
                    // Optimistically update players count if server doesn't push players_update immediately
                    const serverCount = Number(evt.payload?.playersCount ?? NaN);
                    if (!Number.isNaN(serverCount)) {
                        setPlayersCount(serverCount);
                    } else {
                        setPlayersCount(prev => (prev > 0 ? prev + 1 : 1));
                    }
                    // Update prize pool if provided
                    if (typeof evt.payload?.prizePool === 'number') {
                        setPrizePool(evt.payload.prizePool);
                    }
                    // Ensure player is not forced into watching-only if they selected a card and have balance
                    const confirmedCard = evt.payload?.cardNumber || pendingSelectedCardNumber;
                    if (!myCard && confirmedCard) {
                        setMyCard({ id: confirmedCard });
                    }
                    setSelectionConfirmed(true);
                    break;
                }
                default:
                    break;
            }
        }
    });

    // Add connection status to debug messages (after `connected` is defined)
    useEffect(() => {
        addDebugMessage(`WebSocket ${connected ? 'connected' : 'disconnected'}`);
    }, [connected]);

    const joinStake = (s) => {
        setStake(s);
        onStakeSelected?.(s);
        // Optionally inform server
        // send('join_lobby', { stake: s });
    };

    // Add initial debug message
    useEffect(() => {
        addDebugMessage(`Game render: sessionId=${!!sessionId}, user=${!!user}, isLoading=${isLoading}, selectedStake=${selectedStake}`);
    }, [sessionId, user, isLoading, selectedStake]);

    const selectCard = (cardNumber) => {
        const debugInfo = { cardNumber, gameId, connected, stake };
        console.log('selectCard called with:', debugInfo);
        addDebugMessage(`selectCard: ${JSON.stringify(debugInfo)}`);

        setPendingSelectedCardNumber(cardNumber);
        // Always send card selection - this will trigger registration if needed
        send('select_card', { gameId: gameId || null, cardNumber });
        addDebugMessage(`Sent: select_card ${cardNumber}`);
        // Optimistically reflect selection in UI
        if (!myCard) setMyCard({ id: cardNumber });
    };

    const claimBingo = () => {
        if (!gameId || !myCard) return;
        send('bingo_claim', { gameId, cardNumber: myCard.id });
    };

    // Fetch identity profile for lobby header display
    useEffect(() => {
        let cancelled = false;
        (async () => {
            if (!sessionId) return;
            try {
                const data = await apiFetch('/user/profile', { sessionId });
                if (!cancelled) setProfile(data);
            } catch (_) { }
        })();
        return () => { cancelled = true; };
    }, [sessionId]);

    // Fetch latest active admin post for in-app banner
    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const data = await apiFetch('/admin/posts');
                const posts = Array.isArray(data?.posts) ? data.posts : [];
                const active = posts.filter(p => p.active);
                if (!cancelled && active.length) {
                    setAdminPost(active[0]);
                }
            } catch (_) { }
        })();
        return () => { cancelled = true; };
    }, []);

    // Fetch wallet balance so GameLayout can determine play vs watch
    useEffect(() => {
        let cancelled = false;
        (async () => {
            if (!sessionId) return;
            try {
                const w = await apiFetch('/wallet', { sessionId });
                if (!cancelled) setWallet(w);
            } catch (_) { }
        })();
        return () => { cancelled = true; };
    }, [sessionId]);

    // Leave: return to origin (stake selection) and clear session state
    const handleLeave = () => {
        if (gameId) {
            try { send('leave_game', { gameId }); } catch (_) { }
        }
        setPhase('lobby');
        setGameId(null);
        setAvailableCards([]);
        setCalled([]);
        setMyCard(null);
        setEndsAt(null);
        setStake(null);
        onStakeSelected?.(null);
        onNavigate?.('game');
    };

    // Show initial screen when no stake is selected
    if (!stake) {
        console.log('Rendering initial screen - no stake selected');
        return (
            <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-purple-900" style={{ position: 'relative' }}>
                {/* Test element to see if component renders */}
                <div className="fixed top-0 left-0 right-0 bg-yellow-500 text-black p-2 text-center z-50">
                    TEST: Game component is rendering! Auth: {sessionId ? 'OK' : 'FAIL'} | User: {user ? 'OK' : 'FAIL'}
                </div>
                <header className="p-4">
                    <div className="app-header">
                        <div className="app-logo">
                            <div className="logo-circle">
                                <img src={lbLogo} alt="Love Bingo Logo" className="logo-image" />
                            </div>
                            <span className="app-title">Love Bingo</span>
                        </div>
                        <button className="rules-button" onClick={() => onNavigate?.('rules')}>
                            <span className="rules-icon">❓</span>
                            <span>Rules</span>
                        </button>
                    </div>
                    <h1 className="text-center text-3xl md:text-4xl font-extrabold leading-tight mt-6 text-white">
                        Welcome to Love Bingo
                    </h1>
                    <div className="text-center text-white mt-4">
                        <p>Choose your stake amount to start playing</p>
                    </div>
                </header>

                <main className="p-4 space-y-4">
                    <div className="stake-card rounded-2xl p-4 mx-auto max-w-md fade-in-up mt-4">
                        <div className="stake-card__header">
                            <div className="play-icon">▶</div>
                            <div className="stake-card__title">Choose Your Stake</div>
                        </div>
                        <div className="flex justify-center gap-4 mt-8">
                            <button onClick={() => joinStake(10)} className="stake-btn stake-green">
                                <div className="play-icon-small">▶</div>
                                <span>Play 10</span>
                            </button>
                            <button onClick={() => joinStake(50)} className="stake-btn stake-blue">
                                <div className="play-icon-small">▶</div>
                                <span>Play 50</span>
                            </button>
                        </div>
                    </div>

                    {/* Admin Announcement - Always visible under stake card */}
                    {adminPost && (
                        <div className="mx-auto max-w-md w-full px-2">
                            <div className="rounded-2xl overflow-hidden ring-1 ring-white/10 bg-white/5 shadow-lg">
                                {adminPost.kind === 'image' ? (
                                    <img
                                        src={adminPost.url}
                                        alt={adminPost.caption || 'Announcement'}
                                        className="w-full h-32 sm:h-40 md:h-48 object-cover"
                                    />
                                ) : (
                                    <video
                                        src={adminPost.url}
                                        className="w-full h-32 sm:h-40 md:h-48 object-cover"
                                        controls
                                        muted
                                        playsInline
                                    />
                                )}
                                {adminPost.caption ? (
                                    <div className="p-2 sm:p-3 text-white text-xs sm:text-sm bg-black/30">
                                        {adminPost.caption}
                                    </div>
                                ) : null}
                            </div>
                        </div>
                    )}

                    <StatsPanel />
                </main>

                <BottomNav current="game" onNavigate={onNavigate} />

            </div>
        );
    }

    // Main game screen - Using separate component
    const hasSelectedCartelaId = Boolean(myCard?.id || selectedCartela || pendingSelectedCardNumber);

    return (
        <>
            <GameLayout
                stake={stake}
                called={called}
                selectedCartela={myCard?.id || selectedCartela || pendingSelectedCardNumber}
                onClaimBingo={claimBingo}
                onNavigate={onNavigate}
                onLeave={handleLeave}
                gameStatus={phase === 'running' ? 'playing' : 'ready'}
                currentCalledNumber={currentCalledNumber}
                onRefresh={() => window.location.reload()}
                playersCount={playersCount}
                prizePool={prizePool}
                walletBalance={Number(wallet?.balance || 0)}
                isWatchingOnly={!hasSelectedCartelaId && !selectionConfirmed}
                gamePhase={phase === 'running' ? 'playing' : (phase === 'announce' ? 'finished' : 'waiting')}
                gameId={gameId}
            />
            {/* Dev-only floating debug toggle */}
            <button
                onClick={() => setDebugOpen(v => !v)}
                style={{ position: 'fixed', top: 20, left: 20, zIndex: 9999 }}
                className="bg-black/60 text-white rounded-full w-10 h-10 text-xl"
                aria-label="Toggle debug"
            >🐞</button>
            {debugOpen && (
                <div style={{ position: 'fixed', top: 70, right: 10, left: 10, zIndex: 9999 }} className="bg-black/90 text-white p-3 rounded-xl text-xs max-h-80 overflow-auto">
                    <div className="flex justify-between items-center mb-2">
                        <strong>Debug Panel</strong>
                        <button onClick={() => setDebugOpen(false)} className="text-red-400">✕</button>
                    </div>

                    <div className="grid grid-cols-2 gap-1 mb-2">
                        <div><strong>phase:</strong> {phase}</div>
                        <div><strong>connected:</strong> {String(connected)}</div>
                        <div><strong>gameId:</strong> {String(gameId || 'null')}</div>
                        <div><strong>players:</strong> {playersCount}</div>
                        <div><strong>stake:</strong> {String(stake)}</div>
                        <div><strong>prizePool:</strong> {String(prizePool)}</div>
                        <div><strong>selectedCartela:</strong> {String(myCard?.id || selectedCartela || '')}</div>
                        <div><strong>confirmed:</strong> {String(selectionConfirmed)}</div>
                    </div>

                    <div className="mt-2">
                        <strong>Recent Events:</strong>
                        <div className="bg-gray-800 p-2 rounded mt-1 max-h-32 overflow-auto text-xs">
                            {debugMessages.map((msg, i) => (
                                <div key={i} className="text-green-300">{msg}</div>
                            ))}
                        </div>
                    </div>

                    <div className="mt-2">
                        <strong>Last Event:</strong> {lastWsEvent?.type || '(none)'}
                    </div>
                </div>
            )}
            <WinnerAnnounce open={showWinners} onClose={() => setShowWinners(false)} winners={winners} />
            <BottomNav current="game" onNavigate={onNavigate} />
        </>
    );
}

function useCountUp(target, durationMs = 1200) {
    const [value, setValue] = useState(0);
    const startRef = useRef(null);
    useEffect(() => {
        let raf = null;
        const step = (ts) => {
            if (!startRef.current) startRef.current = ts;
            const progress = Math.min(1, (ts - startRef.current) / durationMs);
            setValue(Math.floor(progress * target));
            if (progress < 1) raf = requestAnimationFrame(step);
        };
        raf = requestAnimationFrame(step);
        return () => cancelAnimationFrame(raf);
    }, [target, durationMs]);
    return value;
}

function StatsPanel() {
    const players = useCountUp(1000, 1200);
    const games = useCountUp(2000, 1400);
    const winners = useCountUp(100, 1200);

    return (
        <section className="stats-panel mt-5">
            <div className="stat fade-in-up delay-1">
                <div className="stat-value">{players.toLocaleString()}+</div>
                <div className="stat-label">Active Players</div>
            </div>
            <div className="stat fade-in-up delay-2">
                <div className="stat-value">{games.toLocaleString()}+</div>
                <div className="stat-label">Games Played</div>
            </div>
            <div className="stat fade-in-up delay-3">
                <div className="stat-value">{winners.toLocaleString()}+</div>
                <div className="stat-label">Winners Daily</div>
            </div>
        </section>
    );
}

