import React, { useState, useEffect } from 'react';
import CartellaCard from '../components/CartellaCard';
import BottomNav from '../components/BottomNav';
import { apiFetch } from '../lib/api/client';
import { useAuth } from '../lib/auth/AuthProvider';
import { useToast } from '../contexts/ToastContext';
import { useCartellaWebSocket } from '../lib/ws/useCartellaWebSocket';

export default function CartelaSelection({ onNavigate, stake, onCartelaSelected }) {
    const { sessionId } = useAuth();
    const { showError, showSuccess, showWarning } = useToast();
    const [cards, setCards] = useState([]);
    const [selectedCardNumber, setSelectedCardNumber] = useState(null);
    const [selectedCard, setSelectedCard] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [wallet, setWallet] = useState({ main: 0, play: 0, coins: 0 });
    const [walletLoading, setWalletLoading] = useState(true);

    // WebSocket integration
    const { connected, gameState, selectCartella, startRegistration } = useCartellaWebSocket(stake, sessionId);

    // Debug authentication
    useEffect(() => {
        console.log('CartelaSelection - Authentication Debug:', {
            sessionId: sessionId ? 'Present' : 'Missing',
            sessionIdLength: sessionId?.length || 0,
            stake: stake,
            connected: connected
        });
    }, [sessionId, stake, connected]);

    // Fetch wallet data
    useEffect(() => {
        const fetchWallet = async () => {
            if (!sessionId) {
                setWalletLoading(false);
                return;
            }

            try {
                setWalletLoading(true);
                const response = await apiFetch('/user/profile', { sessionId });
                if (response.wallet) {
                    setWallet({
                        main: response.wallet.main || 0,
                        play: response.wallet.play || 0,
                        coins: response.wallet.coins || 0
                    });
                }
            } catch (err) {
                console.error('Error fetching wallet:', err);
                // Fallback to direct wallet fetch
                try {
                    const walletResponse = await apiFetch('/wallet', { sessionId });
                    setWallet({
                        main: walletResponse.main || 0,
                        play: walletResponse.play || 0,
                        coins: walletResponse.coins || 0
                    });
                } catch (walletErr) {
                    console.error('Error fetching wallet fallback:', walletErr);
                    // Set default values if all requests fail
                    setWallet({
                        main: 0,
                        play: 0,
                        coins: 0
                    });
                }
            } finally {
                setWalletLoading(false);
            }
        };

        fetchWallet();
    }, [sessionId]);

    // Fetch all cards from server
    useEffect(() => {
        const fetchCards = async () => {
            try {
                console.log('Fetching cartellas from /api/cartellas...');
                setLoading(true);

                // Try direct fetch first to test the endpoint
                const directResponse = await fetch('/api/cartellas');
                console.log('Direct fetch response status:', directResponse.status);

                const response = await apiFetch('/api/cartellas');
                console.log('Cartellas API response:', response);
                if (response.success) {
                    console.log('Cartellas loaded successfully:', response.cards?.length, 'cards');
                    setCards(response.cards);
                } else {
                    console.error('Cartellas API returned error:', response);
                    setError('Failed to load cards');
                }
            } catch (err) {
                console.error('Error fetching cards:', err);
                setError('Failed to load cards from server');
            } finally {
                setLoading(false);
            }
        };

        fetchCards();
    }, []);

    // Handle game state changes
    useEffect(() => {
        if (gameState.phase === 'running' && gameState.gameId) {
            // Game has started, navigate to game layout
            console.log('Game started, navigating to game layout');
            onCartelaSelected?.(selectedCardNumber);
        }
    }, [gameState.phase, gameState.gameId, selectedCardNumber, onCartelaSelected]);

    // Fetch specific card when selected
    const handleCardSelect = async (cardNumber) => {
        // Check if player has sufficient balance first
        if (wallet.play < stake) {
            showError('Insufficient wallet balance. Please top up your wallet.');
            return;
        }

        // Check if card is already taken
        if (gameState.takenCards.includes(cardNumber)) {
            showError('This cartella is already taken by another player!');
            return;
        }

        try {
            // Fetch card data for preview
            const response = await apiFetch(`/api/cartellas/${cardNumber}`);
            if (response.success) {
                setSelectedCardNumber(cardNumber);
                setSelectedCard(response.card);
            } else {
                showError('Failed to load cartella. Please try again.');
            }
        } catch (err) {
            console.error('Error fetching card:', err);
            showError('Failed to load cartella. Please try again.');
        }
    };

    // Handle card confirmation via WebSocket
    const handleConfirmSelection = async () => {
        if (selectedCardNumber && selectedCard) {
            try {
                // Check if player has sufficient balance
                if (wallet.play < stake) {
                    showError('Insufficient wallet balance. Please top up your wallet.');
                    return;
                }

                // Send selection via WebSocket
                const success = selectCartella(selectedCardNumber);

                if (success) {
                    showSuccess(`Cartella #${selectedCardNumber} selected! Waiting for game to start...`);
                    // The WebSocket will handle the rest
                } else {
                    showError('Failed to select cartella. Please try again.');
                }
            } catch (err) {
                console.error('Error selecting cartella:', err);
                showError('Failed to select cartella. Please try again.');
            }
        }
    };

    // Refresh wallet data
    const refreshWallet = async () => {
        if (!sessionId) return;

        try {
            setWalletLoading(true);
            const response = await apiFetch('/user/profile', { sessionId });
            if (response.wallet) {
                setWallet({
                    main: response.wallet.main || 0,
                    play: response.wallet.play || 0,
                    coins: response.wallet.coins || 0
                });
            }
        } catch (err) {
            console.error('Error refreshing wallet:', err);
            // Fallback to direct wallet fetch
            try {
                const walletResponse = await apiFetch('/wallet', { sessionId });
                setWallet({
                    main: walletResponse.main || 0,
                    play: walletResponse.play || 0,
                    coins: walletResponse.coins || 0
                });
            } catch (walletErr) {
                console.error('Error refreshing wallet fallback:', walletErr);
            }
        } finally {
            setWalletLoading(false);
        }
    };

    console.log('CartelaSelection render - loading:', loading, 'error:', error, 'cards:', cards.length);

    if (loading) {
        console.log('Showing loading screen');
        return (
            <div className="app-container">
                <header className="p-4">
                    <div className="flex items-center justify-between mb-4">
                        <button onClick={() => onNavigate?.('game')} className="header-button">
                            ← Back
                        </button>
                    </div>
                    {/* Wallet info during loading */}
                    <div className="flex items-center justify-between">
                        <div className="flex gap-2">
                            <div className="wallet-box">
                                <div className="wallet-label">Main Wallet</div>
                                <div className="wallet-value text-blue-400">
                                    {walletLoading ? '...' : wallet.main?.toLocaleString() || 0}
                                </div>
                            </div>
                            <div className="wallet-box">
                                <div className="wallet-label">Play Wallet</div>
                                <div className="wallet-value text-green-400">
                                    {walletLoading ? '...' : wallet.play?.toLocaleString() || 0}
                                </div>
                            </div>
                            <div className="wallet-box">
                                <div className="wallet-label">Stake</div>
                                <div className="wallet-value">{stake}</div>
                            </div>
                        </div>
                        <div className="timer-box">
                            <div className="timer-countdown">
                                {gameState.countdown}s
                            </div>
                            <div className="timer-status">
                                {gameState.phase === 'waiting' && 'Waiting for players...'}
                                {gameState.phase === 'registration' && `Registration open... (${gameState.playersCount} players)`}
                                {gameState.phase === 'starting' && `Starting game... (${gameState.playersCount} players)`}
                                {gameState.phase === 'running' && 'Game in progress!'}
                            </div>
                            <div className="connection-status">
                                {connected ? '🟢 Connected' : '🔴 Disconnected'}
                            </div>
                        </div>
                    </div>
                </header>
                <main className="p-4 flex items-center justify-center min-h-96">
                    <div className="text-center">
                        <div className="text-lg text-white mb-2">Loading cards...</div>
                        <div className="text-sm text-gray-300">Fetching from server</div>
                    </div>
                </main>
                <BottomNav current="game" onNavigate={onNavigate} />
            </div>
        );
    }

    if (error) {
        console.log('Showing error screen:', error);
        return (
            <div className="app-container">
                <header className="p-4">
                    <div className="flex items-center justify-between mb-4">
                        <button onClick={() => onNavigate?.('game')} className="header-button">
                            ← Back
                        </button>
                    </div>
                    {/* Wallet info during error */}
                    <div className="flex items-center justify-between">
                        <div className="flex gap-2">
                            <div className="wallet-box">
                                <div className="wallet-label">Main Wallet</div>
                                <div className="wallet-value text-blue-400">
                                    {walletLoading ? '...' : wallet.main?.toLocaleString() || 0}
                                </div>
                            </div>
                            <div className="wallet-box">
                                <div className="wallet-label">Play Wallet</div>
                                <div className="wallet-value text-green-400">
                                    {walletLoading ? '...' : wallet.play?.toLocaleString() || 0}
                                </div>
                            </div>
                            <div className="wallet-box">
                                <div className="wallet-label">Stake</div>
                                <div className="wallet-value">{stake}</div>
                            </div>
                        </div>
                        <div className="timer-box">
                            <div className="timer-countdown">
                                {gameState.countdown}s
                            </div>
                            <div className="timer-status">
                                {gameState.phase === 'waiting' && 'Waiting for players...'}
                                {gameState.phase === 'registration' && `Registration open... (${gameState.playersCount} players)`}
                                {gameState.phase === 'starting' && `Starting game... (${gameState.playersCount} players)`}
                                {gameState.phase === 'running' && 'Game in progress!'}
                            </div>
                            <div className="prize-pool">
                                Prize Pool: ETB {gameState.prizePool || 0}
                            </div>
                            <div className="connection-status">
                                {connected ? '🟢 Connected' : '🔴 Disconnected'}
                            </div>
                            <div className="debug-info text-xs text-gray-400">
                                Phase: {gameState.phase} | Players: {gameState.playersCount}
                            </div>
                        </div>
                    </div>
                </header>

                {/* Show error message but still allow interaction */}
                <div className="p-4">
                    <div className="mb-4 p-3 bg-yellow-900/20 border border-yellow-500/30 rounded-lg">
                        <div className="flex items-center gap-2 text-yellow-400">
                            <span className="text-lg">⚠️</span>
                            <div>
                                <div className="font-semibold">Limited Mode</div>
                                <div className="text-sm text-yellow-300">{error}</div>
                            </div>
                        </div>
                    </div>
                </div>

                <main className="p-4">

                    {/* Selected Cartela Preview */}
                    <div className="cartela-preview-section">
                        {selectedCard ? (
                            <CartellaCard
                                id={selectedCardNumber}
                                card={selectedCard}
                                called={[]}
                                selectedNumber={selectedCardNumber}
                                isPreview={true}
                            />
                        ) : (
                            <div className="text-center text-gray-400 py-8">
                                Select a card number to preview
                            </div>
                        )}
                    </div>

                    {/* Confirm Selection Button */}
                    {selectedCardNumber && selectedCard && (
                        <div className="mt-4 text-center">
                            <button
                                onClick={handleConfirmSelection}
                                className="px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors"
                            >
                                Confirm Selection - Card #{selectedCardNumber}
                            </button>
                        </div>
                    )}
                </main>
                <BottomNav current="game" onNavigate={onNavigate} />
            </div>
        );
    }

    console.log('Rendering main CartelaSelection interface with', cards.length, 'cards');

    return (
        <div className="app-container">
            <header className="p-4">
                {/* Top Row: Back and Refresh buttons */}
                <div className="flex items-center justify-between mb-4">
                    <button onClick={() => onNavigate?.('game')} className="header-button">
                        ← Back
                    </button>
                    <button onClick={() => { refreshWallet(); window.location.reload(); }} className="header-button">
                        ↻ Refresh
                    </button>
                </div>

                {/* Second Row: Wallet info and Timer */}
                <div className="flex items-center justify-between">
                    <div className="flex gap-2">
                        <div className="wallet-box">
                            <div className="wallet-label">Main Wallet</div>
                            <div className="wallet-value text-blue-400">
                                {walletLoading ? '...' : wallet.main?.toLocaleString() || 0}
                            </div>
                        </div>
                        <div className="wallet-box">
                            <div className="wallet-label">Play Wallet</div>
                            <div className="wallet-value text-green-400">
                                {walletLoading ? '...' : wallet.play?.toLocaleString() || 0}
                            </div>
                        </div>
                        <div className="wallet-box">
                            <div className="wallet-label">Stake</div>
                            <div className="wallet-value">{stake}</div>
                        </div>
                    </div>
                    <div className="timer-box">
                        <div className="timer-countdown">
                            {gameState.countdown}s
                        </div>
                        <div className="timer-status">
                            {gameState.phase === 'waiting' && 'Waiting for players...'}
                            {gameState.phase === 'registration' && `Registration open... (${gameState.playersCount} players)`}
                            {gameState.phase === 'starting' && `Starting game... (${gameState.playersCount} players)`}
                            {gameState.phase === 'running' && 'Game in progress!'}
                        </div>
                        <div className="prize-pool">
                            Prize Pool: ETB {gameState.prizePool || 0}
                        </div>
                        <div className="connection-status">
                            {connected ? '🟢 Connected' : '🔴 Disconnected'}
                        </div>
                    </div>
                </div>
            </header>

            <main className="p-4">

                {/* Number Selection Grid */}
                <div className="cartela-numbers-grid">
                    {Array.from({ length: cards.length }, (_, i) => i + 1).map((cartelaNumber) => {
                        const isTaken = gameState.takenCards.includes(cartelaNumber);
                        const isSelected = selectedCardNumber === cartelaNumber;
                        const takenByMe = gameState.yourSelection === cartelaNumber;

                        return (
                            <button
                                key={cartelaNumber}
                                onClick={() => !isTaken && handleCardSelect(cartelaNumber)}
                                disabled={isTaken || gameState.phase === 'running'}
                                className={`cartela-number-btn ${isTaken
                                    ? takenByMe
                                        ? 'bg-green-600 text-white cursor-default'
                                        : 'bg-red-600 text-white cursor-not-allowed opacity-60'
                                    : isSelected
                                        ? 'bg-blue-600 text-white'
                                        : 'hover:bg-blue-500'
                                    }`}
                                title={
                                    isTaken
                                        ? takenByMe
                                            ? 'Your selected cartella'
                                            : 'Taken by another player'
                                        : `Select cartella #${cartelaNumber}`
                                }
                            >
                                {cartelaNumber}
                                {isTaken && !takenByMe && <span className="block text-xs">TAKEN</span>}
                                {takenByMe && <span className="block text-xs">YOURS</span>}
                            </button>
                        );
                    })}
                </div>

                {/* Selected Cartela Preview */}
                <div className="cartela-preview-section">
                    {selectedCard ? (
                        <CartellaCard
                            id={selectedCardNumber}
                            card={selectedCard}
                            called={[]}
                            selectedNumber={selectedCardNumber}
                            isPreview={true}
                        />
                    ) : (
                        <div className="text-center text-gray-400 py-8">
                            Select a card number to preview
                        </div>
                    )}
                </div>

                {/* Confirm Selection Button */}
                {selectedCardNumber && selectedCard && (
                    <div className="mt-4 text-center">
                        <button
                            onClick={handleConfirmSelection}
                            className="px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors"
                        >
                            Confirm Selection - Card #{selectedCardNumber}
                        </button>
                    </div>
                )}

                {/* Recent Selections Display */}
                {gameState.playersCount > 0 && (
                    <div className="mt-6">
                        <h3 className="text-lg font-semibold text-white mb-3 text-center">Game Status</h3>
                        <div className="bg-gray-800 rounded-lg p-4">
                            <div className="text-center text-sm">
                                <span className="text-blue-400">{gameState.playersCount} player(s) joined</span>
                                <br />
                                <span className="text-gray-400">Prize Pool: ETB {gameState.prizePool || 0}</span>
                            </div>
                        </div>
                    </div>
                )}
            </main>

            <BottomNav current="game" onNavigate={onNavigate} />
        </div>
    );
}