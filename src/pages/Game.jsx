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
    const { sessionId } = useAuth();
    const [stake, setStake] = useState(selectedStake);
    const [phase, setPhase] = useState('lobby');
    const [gameId, setGameId] = useState(null);
    const [availableCards, setAvailableCards] = useState([]);
    const [called, setCalled] = useState([]);
    const [myCard, setMyCard] = useState(null);
    const [endsAt, setEndsAt] = useState(null);
    const [winners, setWinners] = useState([]);
    const [showWinners, setShowWinners] = useState(false);
    const [currentCalledNumber, setCurrentCalledNumber] = useState(null);
    const [playersCount, setPlayersCount] = useState(0);
    const [profile, setProfile] = useState(null);
    const [wallet, setWallet] = useState({ balance: 0, coins: 0, gamesWon: 0 });
    const [adminPost, setAdminPost] = useState(null);

    // Update stake when selectedStake prop changes
    useEffect(() => {
        if (selectedStake && selectedStake !== stake) {
            setStake(selectedStake);
        }
    }, [selectedStake, stake]);

    const wsUrl = useMemo(() => {
        const base = import.meta.env.VITE_WS_URL || 'ws://localhost:3001/ws';
        return stake ? `${base}?stake=${stake}` : null;
    }, [stake]);

    const { connected, send } = useGameSocket(wsUrl, {
        token: sessionId,
        onEvent: (evt) => {
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
                    break;
                case 'registration_update':
                    if (typeof evt.payload.timeLeft === 'number') {
                        setEndsAt(Date.now() + evt.payload.timeLeft * 1000);
                    }
                    break;
                case 'registration_closed':
                    setPhase('registration');
                    // Check if we need to restart countdown (no players selected cartelas)
                    if (availableCards.length === 0) {
                        // Restart registration phase with new countdown
                        setTimeout(() => {
                            setPhase('registration');
                            setEndsAt(Date.now() + 15000); // 15 seconds countdown
                        }, 1000);
                    }
                    break;
                case 'game_started':
                    setPhase('running');
                    setGameId(evt.payload.gameId);
                    setMyCard(evt.payload.card);
                    setCalled(evt.payload.called || []);
                    setPlayersCount(Number(evt.payload.playersCount || playersCount));
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
                    setMyCard(evt.payload.card || null);
                    setCalled(evt.payload.called || evt.payload.calledNumbers || []);
                    setAvailableCards(evt.payload.availableCards || []);
                    setEndsAt(evt.payload.endsAt || evt.payload.nextStartAt || null);
                    setPlayersCount(Number(evt.payload.playersCount || playersCount));
                    break;
                case 'players_update':
                    setPlayersCount(Number(evt.payload.playersCount || 0));
                    break;
                case 'selection_confirmed': {
                    // Optimistically update players count if server doesn't push players_update immediately
                    const serverCount = Number(evt.payload?.playersCount ?? NaN);
                    if (!Number.isNaN(serverCount)) {
                        setPlayersCount(serverCount);
                    } else {
                        setPlayersCount(prev => (prev > 0 ? prev + 1 : 1));
                    }
                    break;
                }
                default:
                    break;
            }
        }
    });

    const joinStake = (s) => {
        setStake(s);
        onStakeSelected?.(s);
        // Optionally inform server
        // send('join_lobby', { stake: s });
    };

    const selectCard = (cardNumber) => {
        if (!gameId) return;
        send('select_card', { gameId, cardNumber });
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

    // If no stake selected, show the initial screen
    if (!stake) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-purple-900">
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
    return (
        <>
            <GameLayout
                stake={stake}
                called={called}
                selectedCartela={myCard?.id || selectedCartela}
                onClaimBingo={claimBingo}
                onNavigate={onNavigate}
                onLeave={handleLeave}
                gameStatus={phase === 'running' ? 'playing' : 'ready'}
                currentCalledNumber={currentCalledNumber}
                onRefresh={() => window.location.reload()}
                playersCount={playersCount}
                walletBalance={Number(wallet?.balance || 0)}
                isWatchingOnly={!myCard}
                gamePhase={phase === 'running' ? 'playing' : (phase === 'announce' ? 'finished' : 'waiting')}
            />
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

