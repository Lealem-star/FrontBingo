import React, { useState, useEffect, useMemo } from 'react';
import CartellaCard from '../components/CartellaCard';
import BottomNav from '../components/BottomNav';
import { useAuth } from '../lib/auth/AuthProvider';
import { apiFetch } from '../lib/api/client';
import { useGameSocket } from '../lib/ws/useGameSocket';

export default function CartelaSelection({ onNavigate, stake, onCartelaSelected }) {
    const [selectedCartela, setSelectedCartela] = useState(null);
    const [selectionCount, setSelectionCount] = useState(0);
    const [timeLeft, setTimeLeft] = useState(15);
    const [walletBalance, setWalletBalance] = useState(0);
    const [hasSelectedPlayers, setHasSelectedPlayers] = useState(false);
    const [showToast, setShowToast] = useState(false);
    const [toastProgress, setToastProgress] = useState(100);
    const [toastPosition, setToastPosition] = useState({ x: 0, y: 0 });
    const { sessionId } = useAuth();
    const [takenCards, setTakenCards] = useState([]);
    const [phase, setPhase] = useState('waiting');
    const [pendingSelection, setPendingSelection] = useState(null);

    // Fetch wallet balance
    useEffect(() => {
        if (sessionId) {
            apiFetch('/wallet', { sessionId })
                .then(wallet => setWalletBalance(wallet.balance || 0))
                .catch(() => setWalletBalance(0));
        }
    }, [sessionId]);

    // Realtime selection via websocket
    const wsUrl = useMemo(() => {
        const base = import.meta.env.VITE_WS_URL ||
            (window.location.hostname === 'localhost' ? 'ws://localhost:3001/ws' : 'wss://bingo-back-2evw.onrender.com/ws');
        return stake ? `${base}?stake=${stake}` : null;
    }, [stake]);

    const { send } = useGameSocket(wsUrl, {
        token: sessionId,
        onEvent: (evt) => {
            switch (evt.type) {
                case 'registration_open':
                    setPhase('registration');
                    // If user clicked while waiting, auto-send now
                    if (pendingSelection) {
                        try { send('select_card', { cardNumber: pendingSelection }); } catch (_) { }
                    }
                // fallthrough to update taken cards if provided
                case 'registration_update':
                case 'snapshot': {
                    if (evt.type === 'snapshot' && evt.payload?.phase) {
                        setPhase(evt.payload.phase);
                        // If we joined mid-registration via snapshot, auto-send queued selection
                        if (evt.payload.phase === 'registration' && pendingSelection) {
                            try { send('select_card', { cardNumber: pendingSelection }); } catch (_) { }
                        }
                        // Proactively start registration when room is waiting
                        if (evt.payload.phase === 'waiting') {
                            try { send('start_registration', {}); } catch (_) { }
                        }
                    }
                    const serverTaken = evt.payload?.takenCards || [];
                    if (Array.isArray(serverTaken)) setTakenCards(serverTaken);
                    const yourSel = evt.payload?.yourSelection;
                    if (yourSel) setSelectedCartela(yourSel);
                    break;
                }
                case 'game_cancelled':
                    setPhase('waiting');
                    break;
                case 'selection_confirmed':
                    if (evt.payload?.cardNumber) setSelectedCartela(evt.payload.cardNumber);
                    break;
                default:
                    break;
            }
        }
    });

    // Timer effect with auto-restart
    useEffect(() => {
        if (timeLeft > 0) {
            const timer = setTimeout(() => {
                setTimeLeft(timeLeft - 1);
            }, 1000);
            return () => clearTimeout(timer);
        } else {
            // When timer expires, check if we have players
            if (hasSelectedPlayers) {
                // If players have selected cartelas, proceed to game
                if (selectedCartela && onCartelaSelected) {
                    onCartelaSelected(selectedCartela);
                } else {
                    onNavigate?.('game');
                }
            } else {
                // If no players selected cartelas, restart countdown
                setTimeLeft(15);
                setHasSelectedPlayers(false);
            }
        }
    }, [timeLeft, selectedCartela, onCartelaSelected, onNavigate, hasSelectedPlayers]);

    const selectCartela = (cartelaNumber, event) => {
        // Check if user has sufficient wallet balance
        if (walletBalance < stake) {
            // Get button position
            const buttonRect = event.target.getBoundingClientRect();
            setToastPosition({
                x: buttonRect.left + buttonRect.width / 2,
                y: buttonRect.top - 10
            });

            setShowToast(true);
            setToastProgress(100);

            // Auto-close after 4 seconds with progress animation
            const interval = setInterval(() => {
                setToastProgress(prev => {
                    if (prev <= 0) {
                        clearInterval(interval);
                        setShowToast(false);
                        return 0;
                    }
                    return prev - 2.5; // 100% / 40 intervals = 2.5% per interval (4 seconds total)
                });
            }, 100);

            return;
        }

        // If taken by someone else, ignore
        if (takenCards.includes(cartelaNumber)) return;

        // If not in registration, still send selection now; server will open registration and accept it
        if (phase !== 'registration') {
            setPendingSelection(cartelaNumber);
        }

        // Send selection immediately (works in both waiting and registration)
        setSelectedCartela(cartelaNumber);
        setSelectionCount(prev => prev + 1);
        setHasSelectedPlayers(true);
        try { send('select_card', { cardNumber: cartelaNumber }); } catch (_) { }
    };

    const confirmSelection = () => {
        if (selectedCartela && onCartelaSelected) {
            onCartelaSelected(selectedCartela);
        }
    };

    const goBack = () => {
        // Clear the selected cartela and stake to go back to stake selection
        onCartelaSelected?.(null);
        onNavigate?.('game');
    };

    const refreshPage = () => {
        setTimeLeft(15);
        setSelectedCartela(null);
        setSelectionCount(0);
    };

    return (
        <>
            {/* Toast Notification - Near clicked button */}
            {showToast && (
                <div
                    className="fixed z-[9999] pointer-events-none"
                    style={{
                        left: `${toastPosition.x}px`,
                        top: `${toastPosition.y}px`,
                        transform: 'translateX(-50%)'
                    }}
                >
                    <div className="bg-white rounded-xl border border-red-300 relative shadow-2xl backdrop-blur-sm w-64">
                        {/* Close Button */}
                        <button
                            onClick={() => setShowToast(false)}
                            className="absolute top-1 right-1 text-gray-500 hover:text-gray-700 text-lg font-bold w-6 h-6 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors pointer-events-auto"
                        >
                            ×
                        </button>

                        {/* Content */}
                        <div className="p-4 pt-6">
                            <div className="flex items-start gap-3">
                                <div className="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                                    <span className="text-red-500 text-sm">⚠️</span>
                                </div>
                                <p className="text-gray-700 text-sm leading-relaxed">
                                    Insufficient balance. Please top up your wallet.
                                </p>
                            </div>
                        </div>

                        {/* Animated Progress Bar */}
                        <div className="h-0.5 bg-gray-100 rounded-b-xl overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-red-400 via-pink-500 to-purple-500 transition-all duration-100 ease-linear"
                                style={{ width: `${toastProgress}%` }}
                            ></div>
                        </div>
                    </div>
                </div>
            )}

            <div className="app-container">
                <header className="p-4">
                    {/* Top Row: Back and Refresh buttons */}
                    <div className="flex items-center justify-between mb-4">
                        <button onClick={goBack} className="header-button">
                            ← Back
                        </button>
                        <button onClick={refreshPage} className="header-button">
                            ↻ Refresh
                        </button>
                    </div>

                    {/* Second Row: Wallet info and Timer */}
                    <div className="flex items-center justify-between">
                        <div className="flex gap-2">
                            <div className="wallet-box">
                                <div className="wallet-label">Wallet</div>
                                <div className={`wallet-value ${walletBalance < stake ? 'text-red-400' : 'text-green-400'}`}>
                                    {walletBalance}
                                </div>
                            </div>
                            <div className="wallet-box">
                                <div className="wallet-label">Stake</div>
                                <div className="wallet-value">{stake}</div>
                            </div>
                        </div>
                        <div className="timer-box">
                            {timeLeft} s
                        </div>
                    </div>
                </header>

                <main className="p-4">
                    {/* Number Selection Grid */}
                    <div className="cartela-numbers-grid">
                        {Array.from({ length: 100 }, (_, i) => i + 1).map((cartelaNumber) => {
                            const isTaken = takenCards.includes(cartelaNumber);
                            const isMine = selectedCartela === cartelaNumber;
                            return (
                                <button
                                    key={cartelaNumber}
                                    onClick={(e) => selectCartela(cartelaNumber, e)}
                                    disabled={walletBalance < stake}
                                    className={`cartela-number-btn ${isMine ? 'cartela-number-btn-selected' : ''} ${isTaken && !isMine ? 'bg-red-500/70 text-white border-red-300' : ''} ${walletBalance < stake ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                    {cartelaNumber}
                                </button>
                            );
                        })}
                    </div>

                    {/* Selected Cartela Preview */}
                    {selectedCartela && (
                        <div className="cartela-preview-section">
                            <CartellaCard
                                id={selectedCartela}
                                called={[]}
                                selectedNumber={selectedCartela}
                                isPreview={true}
                            />
                        </div>
                    )}
                </main>

                <BottomNav current="game" onNavigate={onNavigate} />
            </div>
        </>
    );
}
