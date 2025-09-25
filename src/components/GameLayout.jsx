import React, { useState, useEffect, useRef } from 'react';
import { BingoCards } from '../data/cartellas.data';

export default function GameLayout({
    stake,
    called = [],
    selectedCartela,
    onClaimBingo,
    gameStatus = 'ready', // 'ready' or 'playing'
    currentCalledNumber = null,
    onLeave,
    onRefresh,
    playersCount = 0,
    prizePool = 0,
    gameId,
    walletBalance = 0,
    gamePhase = 'waiting', // 'waiting', 'playing', 'finished'
    isWatchingOnly = false
}) {
    const [showReadyMessage, setShowReadyMessage] = useState(true);
    const [recentCalledNumbers, setRecentCalledNumbers] = useState([]);
    const [winningPatternIndices, setWinningPatternIndices] = useState(null);
    const [isAudioOn, setIsAudioOn] = useState(() => {
        try { const v = localStorage.getItem('audioOn'); return v ? v === 'true' : true; } catch { return true; }
    });
    const [markedNumbers, setMarkedNumbers] = useState([]); // player-marked numbers on their cartella
    const hasLocalBingo = Array.isArray(winningPatternIndices) && winningPatternIndices.length > 0;

    // Stable game ID per mount: LB + 6 digits, unless provided via props
    const generateGameId = () => `LB${Math.floor(100000 + Math.random() * 900000)}`;
    const gameIdRef = useRef(gameId || generateGameId());

    // Use prize pool from props, fallback to calculated value
    const numericStake = Number(stake || 0);
    const derashAmount = Number(prizePool || Math.floor(playersCount * numericStake * 0.8));

    // Check if user has sufficient wallet balance
    const numericWalletBalance = Number(walletBalance || 0);
    const hasInsufficientFunds = numericWalletBalance < numericStake;

    // Determine if user should be in watching-only mode
    const hasSelectedCartela = !!selectedCartela;
    const shouldWatchOnly = (!hasSelectedCartela) || isWatchingOnly || hasInsufficientFunds || gamePhase === 'finished';

    // Show "Get ready for the next number!" for 3 seconds when game starts
    useEffect(() => {
        if (gameStatus === 'ready') {
            setShowReadyMessage(true);
            const timer = setTimeout(() => {
                setShowReadyMessage(false);
            }, 3000);
            return () => clearTimeout(timer);
        } else {
            setShowReadyMessage(false);
        }
    }, [gameStatus]);

    const toggleAudio = () => {
        setIsAudioOn(prev => {
            const next = !prev;
            try { localStorage.setItem('audioOn', String(next)); } catch { }
            return next;
        });
    };

    // Update recent called numbers (keep latest 4, newest on the right)
    useEffect(() => {
        if (currentCalledNumber) {
            setRecentCalledNumbers(prev => {
                const appended = [...prev, currentCalledNumber];
                // Remove duplicates while preserving order
                const unique = appended.filter((v, i, a) => a.indexOf(v) === i);
                return unique.slice(-4);
            });
        }
    }, [currentCalledNumber]);

    // Fallback: also refresh from full called list so chips are visible
    useEffect(() => {
        if (Array.isArray(called) && called.length) {
            const unique = called.filter((v, i, a) => a.indexOf(v) === i);
            setRecentCalledNumbers(unique.slice(-4));
        }
    }, [called]);

    const getLetterForNumber = (num) => {
        if (num >= 1 && num <= 15) return 'B';
        if (num >= 16 && num <= 30) return 'I';
        if (num >= 31 && num <= 45) return 'N';
        if (num >= 46 && num <= 60) return 'G';
        if (num >= 61 && num <= 75) return 'O';
        return '';
    };

    const chipBgForLetter = (letter) => {
        switch (letter) {
            case 'B': return 'bg-blue-500';
            case 'I': return 'bg-purple-500';
            case 'N': return 'bg-green-500';
            case 'G': return 'bg-pink-500';
            case 'O': return 'bg-orange-500';
            default: return 'bg-slate-600';
        }
    };

    // Find a winning pattern indices if present; otherwise null
    const findWinningPattern = () => {
        if (!selectedCartela) return null;

        // Use server-provided card data if available, otherwise fall back to predefined cards
        let cartellaNumbers;
        if (selectedCartela.data && Array.isArray(selectedCartela.data)) {
            cartellaNumbers = selectedCartela.data;
        } else if (BingoCards?.cards?.[selectedCartela - 1]) {
            cartellaNumbers = BingoCards.cards[selectedCartela - 1];
        } else {
            return null;
        }

        const patterns = [
            [0, 1, 2, 3, 4],
            [5, 6, 7, 8, 9],
            [10, 11, 12, 13, 14],
            [15, 16, 17, 18, 19],
            [20, 21, 22, 23, 24],
            [0, 5, 10, 15, 20],
            [1, 6, 11, 16, 21],
            [2, 7, 12, 17, 22],
            [3, 8, 13, 18, 23],
            [4, 9, 14, 19, 24],
            [0, 6, 12, 18, 24],
            [4, 8, 12, 16, 20]
        ];

        for (const pattern of patterns) {
            const patternNumbers = pattern.map(index => {
                const row = Math.floor(index / 5);
                const col = index % 5;
                return cartellaNumbers[row]?.[col];
            }).filter(n => n !== 0);

            // For manual marking, check against player-marked numbers
            if (patternNumbers.every(num => markedNumbers.includes(num))) {
                return pattern;
            }
        }

        return null;
    };

    // Check if player has any winning pattern
    const checkWinningPattern = () => {
        return !!findWinningPattern();
    };

    // Track and expose the current winning pattern for highlighting
    useEffect(() => {
        const pattern = findWinningPattern();
        setWinningPatternIndices(pattern);
    }, [markedNumbers, selectedCartela]);

    // Reset marks on new cartella or when leaving/refreshing game
    useEffect(() => {
        setMarkedNumbers([]);
    }, [selectedCartela, gameStatus]);

    const toggleMark = (number) => {
        if (!number || shouldWatchOnly) return;
        setMarkedNumbers(prev => prev.includes(number)
            ? prev.filter(n => n !== number)
            : [...prev, number]
        );
    };

    const handleBingoClaim = () => {
        if (checkWinningPattern()) {
            onClaimBingo?.();
        } else {
            // Remove player from game for false claim
            onLeave?.();
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-purple-900 relative overflow-hidden">
            {/* Animated background elements */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-pink-500/20 to-purple-600/20 rounded-full blur-3xl animate-pulse"></div>
                <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-tr from-blue-500/20 to-purple-600/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
            </div>

            <div className="max-w-md mx-auto px-3 py-3 relative z-10">
                {/* Enhanced Top Information Bar */}
                <div className="flex items-stretch gap-2 p-3 rounded-2xl bg-gradient-to-r from-purple-800/30 to-purple-900/30 ring-1 ring-white/20 shadow-2xl shadow-purple-900/20 backdrop-blur-md border border-white/10">
                    <div className="wallet-box flex-1 group">
                        <div className="wallet-label text-xs opacity-80">Game ID</div>
                        <div className="wallet-value text-sm font-bold text-yellow-300">{gameIdRef.current}</div>
                    </div>
                    <div className="wallet-box flex-1 group">
                        <div className="wallet-label text-xs opacity-80">Players</div>
                        <div className="wallet-value text-sm font-bold text-green-300">{playersCount}</div>
                    </div>
                    <div className="wallet-box flex-1 group">
                        <div className="wallet-label text-xs opacity-80">Bet</div>
                        <div className="wallet-value text-sm font-bold text-blue-300">ETB {stake}</div>
                    </div>
                    <div className="wallet-box flex-1 group">
                        <div className="wallet-label text-xs opacity-80">Prize</div>
                        <div className="wallet-value text-sm font-bold text-orange-300">ETB {derashAmount}</div>
                    </div>
                    <div className="wallet-box flex-1 group">
                        <div className="wallet-label text-xs opacity-80">Called</div>
                        <div className="wallet-value text-sm font-bold text-pink-300">{called.length}/75</div>
                    </div>
                </div>

                {/* Main Content Area - Enhanced 2 Column Layout */}
                <div className="grid grid-cols-2 p-2 gap-3 mt-4">
                    {/* Left Card - Enhanced BINGO Grid */}
                    <div className="rounded-2xl p-4 bg-gradient-to-br from-purple-900/70 to-slate-900/50 ring-1 ring-white/20 shadow-2xl shadow-purple-900/30 backdrop-blur-md border border-white/10">
                        <div className="grid grid-cols-5 gap-1">
                            {/* B Column */}
                            <div className="space-y-0.5">
                                <div className="cartela-letter bg-gradient-to-b from-blue-500 to-blue-600 text-white font-bold text-center py-2 rounded-lg shadow-lg">B</div>
                                {Array.from({ length: 15 }, (_, i) => i + 1).map(n => (
                                    <button
                                        key={n}
                                        className={`cartela-number-btn text-[10px] leading-none transition-all duration-200 ${called.includes(n) ? 'cartela-number-btn-selected bg-gradient-to-b from-red-500 to-red-600 text-white shadow-lg scale-105' : 'bg-gradient-to-b from-slate-700/80 to-slate-800/80 text-slate-200 hover:from-blue-400/30 hover:to-blue-500/30'} ${n === currentCalledNumber ? 'ring-2 ring-yellow-300 animate-pulse animate-pop scale-110 shadow-[0_0_20px_rgba(251,191,36,0.6)]' : ''}`}
                                    >
                                        {n}
                                    </button>
                                ))}
                            </div>
                            {/* I Column */}
                            <div className="space-y-0.5">
                                <div className="cartela-letter bg-gradient-to-b from-purple-500 to-purple-600 text-white font-bold text-center py-2 rounded-lg shadow-lg">I</div>
                                {Array.from({ length: 15 }, (_, i) => i + 16).map(n => (
                                    <button
                                        key={n}
                                        className={`cartela-number-btn text-[10px] leading-none transition-all duration-200 ${called.includes(n) ? 'cartela-number-btn-selected bg-gradient-to-b from-red-500 to-red-600 text-white shadow-lg scale-105' : 'bg-gradient-to-b from-slate-700/80 to-slate-800/80 text-slate-200 hover:from-purple-400/30 hover:to-purple-500/30'} ${n === currentCalledNumber ? 'ring-2 ring-yellow-300 animate-pulse animate-pop scale-110 shadow-[0_0_20px_rgba(251,191,36,0.6)]' : ''}`}
                                    >
                                        {n}
                                    </button>
                                ))}
                            </div>
                            {/* N Column */}
                            <div className="space-y-0.5">
                                <div className="cartela-letter bg-gradient-to-b from-green-500 to-green-600 text-white font-bold text-center py-2 rounded-lg shadow-lg">N</div>
                                {Array.from({ length: 15 }, (_, i) => i + 31).map(n => (
                                    <button
                                        key={n}
                                        className={`cartela-number-btn text-[10px] leading-none transition-all duration-200 ${called.includes(n) ? 'cartela-number-btn-selected bg-gradient-to-b from-red-500 to-red-600 text-white shadow-lg scale-105' : 'bg-gradient-to-b from-slate-700/80 to-slate-800/80 text-slate-200 hover:from-green-400/30 hover:to-green-500/30'} ${n === currentCalledNumber ? 'ring-2 ring-yellow-300 animate-pulse animate-pop scale-110 shadow-[0_0_20px_rgba(251,191,36,0.6)]' : ''}`}
                                    >
                                        {n}
                                    </button>
                                ))}
                            </div>
                            {/* G Column */}
                            <div className="space-y-0.5">
                                <div className="cartela-letter bg-gradient-to-b from-orange-500 to-orange-600 text-white font-bold text-center py-2 rounded-lg shadow-lg">G</div>
                                {Array.from({ length: 15 }, (_, i) => i + 46).map(n => (
                                    <button
                                        key={n}
                                        className={`cartela-number-btn text-[10px] leading-none transition-all duration-200 ${called.includes(n) ? 'cartela-number-btn-selected bg-gradient-to-b from-red-500 to-red-600 text-white shadow-lg scale-105' : 'bg-gradient-to-b from-slate-700/80 to-slate-800/80 text-slate-200 hover:from-orange-400/30 hover:to-orange-500/30'} ${n === currentCalledNumber ? 'ring-2 ring-yellow-300 animate-pulse animate-pop scale-110 shadow-[0_0_20px_rgba(251,191,36,0.6)]' : ''}`}
                                    >
                                        {n}
                                    </button>
                                ))}
                            </div>
                            {/* O Column */}
                            <div className="space-y-0.5">
                                <div className="cartela-letter bg-gradient-to-b from-red-500 to-red-600 text-white font-bold text-center py-2 rounded-lg shadow-lg">O</div>
                                {Array.from({ length: 15 }, (_, i) => i + 61).map(n => (
                                    <button
                                        key={n}
                                        className={`cartela-number-btn text-[10px] leading-none transition-all duration-200 ${called.includes(n) ? 'cartela-number-btn-selected bg-gradient-to-b from-red-500 to-red-600 text-white shadow-lg scale-105' : 'bg-gradient-to-b from-slate-700/80 to-slate-800/80 text-slate-200 hover:from-red-400/30 hover:to-red-500/30'} ${n === currentCalledNumber ? 'ring-2 ring-green-300 animate-pulse animate-pop scale-110 shadow-[0_0_20px_rgba(34,197,94,0.6)]' : ''}`}
                                    >
                                        {n}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>






                    {/* Right Side - Enhanced Two Cards Stacked */}
                    <div className="space-y-3">
                        {/* Right Top Card - Enhanced Game Status */}
                        <div className="relative rounded-2xl p-4 bg-gradient-to-br from-purple-900/70 to-slate-900/50 ring-1 ring-white/20 shadow-2xl shadow-pink-500/20 backdrop-blur-md overflow-hidden border border-white/10">
                            <div className="shimmer-overlay"></div>
                            {/* Reference Design Status Header */}
                            <div className="flex items-center justify-between mb-4 px-1">
                                <div className="flex items-center gap-2">
                                    <span className="text-white/80 text-sm font-medium">Recent Numbers</span>
                                    <div className="flex items-center gap-1">
                                        {recentCalledNumbers.map((num, idx) => {
                                            const letter = getLetterForNumber(num);
                                            return (
                                                <div key={`${num}-${idx}`} className={`text-white text-xs font-bold px-2 py-1 rounded-md ${chipBgForLetter(letter)} shadow-sm`}>{`${letter}-${num}`}</div>
                                            );
                                        })}
                                    </div>
                                </div>
                                <button onClick={toggleAudio} aria-pressed={isAudioOn} className={`text-white text-lg w-8 h-8 grid place-items-center rounded-full transition-all duration-200 ${isAudioOn ? 'bg-green-500/20 hover:bg-green-500/30' : 'bg-white/10 hover:bg-white/20'}`}>
                                    {isAudioOn ? '🔊' : '🔈'}
                                </button>
                            </div>

                            {/* Reference Design Current Number Display */}
                            <div className="text-center mb-2">
                                <div className="mx-auto w-full flex items-center justify-center">
                                    {currentCalledNumber ? (
                                        <div className="w-48 h-48 rounded-full bg-white border-8 border-yellow-400 flex items-center justify-center shadow-2xl">
                                            <div className="text-purple-900 font-extrabold text-3xl">{`${getLetterForNumber(currentCalledNumber)}-${currentCalledNumber}`}</div>
                                        </div>
                                    ) : (
                                        <div className="w-48 h-48 rounded-full bg-white/20 border-8 border-white/30 flex items-center justify-center">
                                            <div className="text-white/60 text-lg font-medium">Waiting...</div>
                                        </div>
                                    )}
                                </div>
                            </div>

                        </div>














                        {/* Right Bottom Card - Enhanced User's Cartella */}
                        <div className="relative rounded-2xl p-3 bg-gradient-to-br from-purple-900/70 to-slate-900/50 ring-1 ring-white/20 shadow-2xl shadow-black/30 overflow-hidden border border-white/10">
                            <div className="shimmer-overlay"></div>
                            {shouldWatchOnly ? (
                                /* Enhanced Watching Only Mode */
                                <div className="rounded-xl p-4 text-center bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-white/10">
                                    <div className="text-white font-bold text-lg mb-3 flex items-center justify-center gap-2">
                                        <span>👀</span>
                                        <span>Watching Only</span>
                                    </div>
                                    <div className="text-white/80 text-sm mb-4 space-y-2">
                                        {hasInsufficientFunds ? (
                                            <>
                                                <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-3">
                                                    <div className="mb-1 font-semibold text-red-300">💰 Insufficient Balance</div>
                                                    <div className="text-red-200">Please deposit to your wallet first.</div>
                                                </div>
                                            </>
                                        ) : gamePhase === 'finished' ? (
                                            <>
                                                <div className="bg-orange-500/20 border border-orange-500/30 rounded-lg p-3">
                                                    <div className="mb-1 font-semibold text-orange-300">🏁 Game Finished</div>
                                                    <div className="text-orange-200">Please wait for the next round to begin.</div>
                                                </div>
                                            </>
                                        ) : (
                                            <>
                                                <div className="bg-blue-500/20 border border-blue-500/30 rounded-lg p-3">
                                                    <div className="mb-1 font-semibold text-blue-300">⏳ Round Started</div>
                                                    <div className="text-blue-200">Please wait here until a new round begins.</div>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                /* Enhanced Normal Cartella Mode */
                                <>
                                    {/* Enhanced User's Cartella - 5x5 Grid */}
                                    <div className="rounded-xl p-3 bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-white/10">
                                        {/* Enhanced BINGO Header */}
                                        <div className="grid grid-cols-5 gap-1 mb-2">
                                            <div className="text-center text-white font-bold text-[10px] bg-gradient-to-b from-blue-500 to-blue-600 rounded-lg py-2 shadow-lg">B</div>
                                            <div className="text-center text-white font-bold text-[10px] bg-gradient-to-b from-purple-500 to-purple-600 rounded-lg py-2 shadow-lg">I</div>
                                            <div className="text-center text-white font-bold text-[10px] bg-gradient-to-b from-green-500 to-green-600 rounded-lg py-2 shadow-lg">N</div>
                                            <div className="text-center text-white font-bold text-[10px] bg-gradient-to-b from-pink-500 to-pink-600 rounded-lg py-2 shadow-lg">G</div>
                                            <div className="text-center text-white font-bold text-[10px] bg-gradient-to-b from-orange-500 to-orange-600 rounded-lg py-2 shadow-lg">O</div>
                                        </div>

                                        {/* Enhanced Numbers Grid */}
                                        <div className="grid grid-cols-5 gap-1">
                                            {Array.from({ length: 25 }, (_, i) => {
                                                const row = Math.floor(i / 5);
                                                const col = i % 5;
                                                const isCenter = row === 2 && col === 2;
                                                const isWinningCell = Array.isArray(winningPatternIndices) && winningPatternIndices.includes(i);

                                                if (isCenter) {
                                                    return (
                                                        <div key={i} className={`bg-gradient-to-b from-green-500 to-green-600 rounded-lg text-center py-2 flex items-center justify-center shadow-lg ${isWinningCell ? 'ring-2 ring-yellow-400 animate-pulse scale-105' : ''}`}>
                                                            <span className="text-yellow-300 text-lg drop-shadow-lg">★</span>
                                                        </div>
                                                    );
                                                }

                                                // Use server-provided card data if available, otherwise fall back to predefined cards
                                                let displayNumbers = [
                                                    [3, 17, 43, 54, 63],
                                                    [15, 20, 32, 58, 61],
                                                    [5, 18, 0, 50, 72],
                                                    [7, 25, 34, 46, 67],
                                                    [2, 23, 45, 59, 64]
                                                ];

                                                if (selectedCartela) {
                                                    if (selectedCartela.data && Array.isArray(selectedCartela.data)) {
                                                        displayNumbers = selectedCartela.data;
                                                    } else if (BingoCards?.cards?.[selectedCartela - 1]) {
                                                        displayNumbers = BingoCards.cards[selectedCartela - 1];
                                                    }
                                                }

                                                const number = displayNumbers[row]?.[col] || 0;
                                                const isMarked = markedNumbers.includes(number);

                                                return (
                                                    <button
                                                        key={i}
                                                        onClick={() => toggleMark(number)}
                                                        className={`w-full text-[9px] leading-none py-2 rounded-lg border transition-all duration-200 flex items-center justify-center font-semibold ${isMarked ? 'bg-gradient-to-b from-green-500 to-green-600 border-green-400 text-white shadow-lg scale-105 animate-pop' : 'bg-gradient-to-b from-slate-700/80 to-slate-800/80 text-slate-200 border-white/20 hover:from-blue-400/30 hover:to-blue-500/30'} ${isWinningCell ? 'ring-2 ring-yellow-400 animate-pulse scale-105' : ''}`}
                                                    >
                                                        {number}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Enhanced Cartela Number Display */}
                                    <div className="text-center mt-3">
                                        <div className="bg-gradient-to-r from-amber-600 to-orange-600 text-white text-sm font-bold px-4 py-2 rounded-full inline-block shadow-lg border border-amber-400/30">
                                            🎫 Cartela #{selectedCartela || 47}
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>















                {/* Enhanced Bottom Action Buttons */}
                <div className="flex justify-between p-3 mt-4 gap-3">
                    <button
                        onClick={onLeave}
                        className="bg-gradient-to-r from-red-500 to-red-600 text-white px-4 py-3 rounded-xl font-bold flex-1 text-sm hover:from-red-600 hover:to-red-700 transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 border border-red-400/30"
                    >
                        🚪 Leave
                    </button>
                    <button
                        onClick={onRefresh}
                        className="bg-gradient-to-r from-amber-500 to-orange-500 text-white px-4 py-3 rounded-xl font-bold flex-1 flex items-center justify-center gap-2 text-sm hover:from-amber-600 hover:to-orange-600 transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 border border-amber-400/30"
                    >
                        <span className="animate-spin">↻</span>
                        <span>Refresh</span>
                    </button>
                    <button
                        onClick={shouldWatchOnly ? undefined : handleBingoClaim}
                        disabled={shouldWatchOnly}
                        className={`px-4 py-3 rounded-xl font-bold flex-1 text-sm transition-all duration-200 ${shouldWatchOnly
                            ? 'bg-gradient-to-r from-gray-500 to-gray-600 text-gray-300 cursor-not-allowed border border-gray-400/30'
                            : `bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 text-white hover:from-yellow-500 hover:via-orange-600 hover:to-red-600 shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 border border-yellow-400/30 ${hasLocalBingo ? 'ring-4 ring-yellow-300 shadow-[0_0_30px_rgba(250,204,21,0.8)] animate-pulse' : ''}`
                            }`}
                    >
                        🎉 BINGO
                    </button>
                </div>
            </div>
        </div>
    );
}