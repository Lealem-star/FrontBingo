import React, { useState, useEffect } from 'react';
import CartellaCard from '../components/CartellaCard';
import BottomNav from '../components/BottomNav';
import { apiFetch } from '../lib/api/client';

export default function CartelaSelection({ onNavigate, stake, onCartelaSelected }) {
    const [cards, setCards] = useState([]);
    const [selectedCardNumber, setSelectedCardNumber] = useState(null);
    const [selectedCard, setSelectedCard] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Fetch all cards from server
    useEffect(() => {
        const fetchCards = async () => {
            try {
                setLoading(true);
                const response = await apiFetch('/api/cartellas');
                if (response.success) {
                    setCards(response.cards);
                } else {
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

    // Fetch specific card when selected
    const handleCardSelect = async (cardNumber) => {
        try {
            const response = await apiFetch(`/api/cartellas/${cardNumber}`);
            if (response.success) {
                setSelectedCardNumber(cardNumber);
                setSelectedCard(response.card);
            } else {
                console.error('Failed to load card:', response.error);
            }
        } catch (err) {
            console.error('Error fetching card:', err);
        }
    };

    // Handle card confirmation
    const handleConfirmSelection = () => {
        if (selectedCardNumber && selectedCard) {
            onCartelaSelected?.(selectedCardNumber);
        }
    };

    if (loading) {
        return (
            <div className="app-container">
                <header className="p-4">
                    <div className="flex items-center justify-between mb-4">
                        <button onClick={() => onNavigate?.('game')} className="header-button">
                            ← Back
                        </button>
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
        return (
            <div className="app-container">
                <header className="p-4">
                    <div className="flex items-center justify-between mb-4">
                        <button onClick={() => onNavigate?.('game')} className="header-button">
                            ← Back
                        </button>
                    </div>
                </header>
                <main className="p-4 flex items-center justify-center min-h-96">
                    <div className="text-center">
                        <div className="text-lg text-red-400 mb-2">Error</div>
                        <div className="text-sm text-gray-300 mb-4">{error}</div>
                        <button
                            onClick={() => window.location.reload()}
                            className="px-4 py-2 bg-blue-600 text-white rounded"
                        >
                            Retry
                        </button>
                    </div>
                </main>
                <BottomNav current="game" onNavigate={onNavigate} />
            </div>
        );
    }

    return (
        <div className="app-container">
            <header className="p-4">
                {/* Top Row: Back and Refresh buttons */}
                <div className="flex items-center justify-between mb-4">
                    <button onClick={() => onNavigate?.('game')} className="header-button">
                        ← Back
                    </button>
                    <button onClick={() => window.location.reload()} className="header-button">
                        ↻ Refresh
                    </button>
                </div>

                {/* Second Row: Wallet info and Timer */}
                <div className="flex items-center justify-between">
                    <div className="flex gap-2">
                        <div className="wallet-box">
                            <div className="wallet-label">Wallet</div>
                            <div className="wallet-value text-green-400">
                                1000
                            </div>
                        </div>
                        <div className="wallet-box">
                            <div className="wallet-label">Stake</div>
                            <div className="wallet-value">{stake}</div>
                        </div>
                    </div>
                    <div className="timer-box">
                        15 s
                    </div>
                </div>
            </header>

            <main className="p-4">
                {/* Number Selection Grid */}
                <div className="cartela-numbers-grid">
                    {Array.from({ length: cards.length }, (_, i) => i + 1).map((cartelaNumber) => (
                        <button
                            key={cartelaNumber}
                            onClick={() => handleCardSelect(cartelaNumber)}
                            className={`cartela-number-btn ${selectedCardNumber === cartelaNumber ? 'bg-blue-600 text-white' : ''
                                }`}
                        >
                            {cartelaNumber}
                        </button>
                    ))}
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
            </main>

            <BottomNav current="game" onNavigate={onNavigate} />
        </div>
    );
}