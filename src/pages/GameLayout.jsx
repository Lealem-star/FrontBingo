import React from 'react';
import { useGameWebSocket } from '../lib/ws/useGameWebSocket';
import { useAuth } from '../lib/auth/AuthProvider';

export default function GameLayout({
    stake,
    selectedCartela,
    playersCount = 0,
    prizePool = 0,
    gameId,
}) {
    const { sessionId } = useAuth();
    const { connected, gameState } = useGameWebSocket(gameId, sessionId);

    // Use WebSocket data if available, otherwise fall back to props
    const currentPlayersCount = gameState.playersCount || playersCount;
    const currentPrizePool = gameState.prizePool || prizePool;
    const calledNumbers = gameState.calledNumbers || [];
    const currentNumber = gameState.currentNumber;

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
                        <div className="wallet-value text-sm font-bold text-yellow-300">{gameId || 'LB000000'}</div>
                    </div>
                    <div className="wallet-box flex-1 group">
                        <div className="wallet-label text-xs opacity-80">Players</div>
                        <div className="wallet-value text-sm font-bold text-green-300">{currentPlayersCount}</div>
                    </div>
                    <div className="wallet-box flex-1 group">
                        <div className="wallet-label text-xs opacity-80">Bet</div>
                        <div className="wallet-value text-sm font-bold text-blue-300">ETB {stake}</div>
                    </div>
                    <div className="wallet-box flex-1 group">
                        <div className="wallet-label text-xs opacity-80">Prize</div>
                        <div className="wallet-value text-sm font-bold text-orange-300">ETB {currentPrizePool}</div>
                    </div>
                    <div className="wallet-box flex-1 group">
                        <div className="wallet-label text-xs opacity-80">Called</div>
                        <div className="wallet-value text-sm font-bold text-pink-300">{calledNumbers.length}/75</div>
                    </div>
                    <div className="wallet-box flex-1 group">
                        <div className="wallet-label text-xs opacity-80">Status</div>
                        <div className="wallet-value text-sm font-bold text-purple-300">
                            {connected ? '🟢' : '🔴'}
                        </div>
                    </div>
                </div>

                {/* Current Number Display */}
                {currentNumber && (
                    <div className="mt-4 text-center">
                        <div className="text-6xl font-bold text-yellow-300 animate-pulse">
                            {currentNumber}
                        </div>
                        <div className="text-sm text-gray-300 mt-2">
                            Last Called Number
                        </div>
                    </div>
                )}

                {/* Main Content Area - Enhanced 2 Column Layout */}
                <div className="grid grid-cols-2 p-2 gap-3 mt-4">
                    {/* Left Card - Enhanced BINGO Grid */}
                    <div className="rounded-2xl p-4 bg-gradient-to-br from-purple-900/70 to-slate-900/50 ring-1 ring-white/20 shadow-2xl shadow-purple-900/30 backdrop-blur-md border border-white/10">
                        <div className="grid grid-cols-5 gap-1">
                            {/* B Column */}
                            <div className="space-y-0.5">
                                <div className="cartela-letter bg-gradient-to-b from-blue-500 to-blue-600 text-white font-bold text-center py-2 rounded-lg shadow-lg">B</div>
                                {Array.from({ length: 15 }, (_, i) => i + 1).map(n => {
                                    const isCalled = calledNumbers.includes(n);
                                    return (
                                        <button
                                            key={n}
                                            className={`cartela-number-btn text-[10px] leading-none transition-all duration-200 ${isCalled
                                                    ? 'bg-gradient-to-b from-green-500 to-green-600 text-white animate-pulse'
                                                    : 'bg-gradient-to-b from-slate-700/80 to-slate-800/80 text-slate-200'
                                                }`}
                                        >
                                            {n}
                                        </button>
                                    );
                                })}
                            </div>
                            {/* I Column */}
                            <div className="space-y-0.5">
                                <div className="cartela-letter bg-gradient-to-b from-purple-500 to-purple-600 text-white font-bold text-center py-2 rounded-lg shadow-lg">I</div>
                                {Array.from({ length: 15 }, (_, i) => i + 16).map(n => {
                                    const isCalled = calledNumbers.includes(n);
                                    return (
                                        <button
                                            key={n}
                                            className={`cartela-number-btn text-[10px] leading-none transition-all duration-200 ${isCalled
                                                    ? 'bg-gradient-to-b from-green-500 to-green-600 text-white animate-pulse'
                                                    : 'bg-gradient-to-b from-slate-700/80 to-slate-800/80 text-slate-200'
                                                }`}
                                        >
                                            {n}
                                        </button>
                                    );
                                })}
                            </div>
                            {/* N Column */}
                            <div className="space-y-0.5">
                                <div className="cartela-letter bg-gradient-to-b from-green-500 to-green-600 text-white font-bold text-center py-2 rounded-lg shadow-lg">N</div>
                                {Array.from({ length: 15 }, (_, i) => i + 31).map(n => {
                                    const isCalled = calledNumbers.includes(n);
                                    return (
                                        <button
                                            key={n}
                                            className={`cartela-number-btn text-[10px] leading-none transition-all duration-200 ${isCalled
                                                    ? 'bg-gradient-to-b from-green-500 to-green-600 text-white animate-pulse'
                                                    : 'bg-gradient-to-b from-slate-700/80 to-slate-800/80 text-slate-200'
                                                }`}
                                        >
                                            {n}
                                        </button>
                                    );
                                })}
                            </div>
                            {/* G Column */}
                            <div className="space-y-0.5">
                                <div className="cartela-letter bg-gradient-to-b from-orange-500 to-orange-600 text-white font-bold text-center py-2 rounded-lg shadow-lg">G</div>
                                {Array.from({ length: 15 }, (_, i) => i + 46).map(n => {
                                    const isCalled = calledNumbers.includes(n);
                                    return (
                                        <button
                                            key={n}
                                            className={`cartela-number-btn text-[10px] leading-none transition-all duration-200 ${isCalled
                                                    ? 'bg-gradient-to-b from-green-500 to-green-600 text-white animate-pulse'
                                                    : 'bg-gradient-to-b from-slate-700/80 to-slate-800/80 text-slate-200'
                                                }`}
                                        >
                                            {n}
                                        </button>
                                    );
                                })}
                            </div>
                            {/* O Column */}
                            <div className="space-y-0.5">
                                <div className="cartela-letter bg-gradient-to-b from-red-500 to-red-600 text-white font-bold text-center py-2 rounded-lg shadow-lg">O</div>
                                {Array.from({ length: 15 }, (_, i) => i + 61).map(n => {
                                    const isCalled = calledNumbers.includes(n);
                                    return (
                                        <button
                                            key={n}
                                            className={`cartela-number-btn text-[10px] leading-none transition-all duration-200 ${isCalled
                                                    ? 'bg-gradient-to-b from-green-500 to-green-600 text-white animate-pulse'
                                                    : 'bg-gradient-to-b from-slate-700/80 to-slate-800/80 text-slate-200'
                                                }`}
                                        >
                                            {n}
                                        </button>
                                    );
                                })}
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
                                        {/* TODO: Implement recent numbers display */}
                                    </div>
                                </div>
                                <button className="text-white text-lg w-8 h-8 grid place-items-center rounded-full transition-all duration-200 bg-white/10">
                                    🔊
                                </button>
                            </div>

                            {/* Reference Design Current Number Display */}
                            <div className="text-center mb-2">
                                <div className="mx-auto w-full flex items-center justify-center">
                                    {currentCalledNumber ? (
                                        <div className="w-48 h-48 rounded-full bg-white border-8 border-yellow-400 flex items-center justify-center shadow-2xl">
                                            <div className="text-purple-900 font-extrabold text-3xl">{currentCalledNumber}</div>
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
                            {isWatchingOnly ? (
                                /* Enhanced Watching Only Mode */
                                <div className="rounded-xl p-4 text-center bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-white/10">
                                    <div className="text-white font-bold text-lg mb-3 flex items-center justify-center gap-2">
                                        <span>👀</span>
                                        <span>Watching Only</span>
                                    </div>
                                    <div className="text-white/80 text-sm mb-4 space-y-2">
                                        {walletBalance < stake ? (
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

                                        {/* TODO: Implement cartella grid */}
                                        <div className="grid grid-cols-5 gap-1">
                                            {Array.from({ length: 25 }, (_, i) => (
                                                <div key={i} className="w-full text-[9px] leading-none py-2 rounded-lg border bg-gradient-to-b from-slate-700/80 to-slate-800/80 text-slate-200 border-white/20">
                                                    {i === 12 ? '★' : '0'}
                                                </div>
                                            ))}
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
                        onClick={() => { }}
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
                        onClick={() => { }}
                        disabled={isWatchingOnly}
                        className={`px-4 py-3 rounded-xl font-bold flex-1 text-sm transition-all duration-200 ${isWatchingOnly
                            ? 'bg-gradient-to-r from-gray-500 to-gray-600 text-gray-300 cursor-not-allowed border border-gray-400/30'
                            : 'bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 text-white hover:from-yellow-500 hover:via-orange-600 hover:to-red-600 shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 border border-yellow-400/30'
                            }`}
                    >
                        🎉 BINGO
                    </button>
                </div>
            </div>
        </div>
    );
}