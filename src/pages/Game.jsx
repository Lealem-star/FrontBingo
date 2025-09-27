import React from 'react';
import BottomNav from '../components/BottomNav';
import { useAuth } from '../lib/auth/AuthProvider';
import lbLogo from '../assets/lb.png';
import StatsPanel from '../components/StatsPanel';

export default function Game({ onNavigate, onStakeSelected, selectedStake }) {
    const adminPost = null;
    const joinStake = (s) => {
        onStakeSelected?.(s);
    };

    // Show initial screen when no stake is selected
    if (!selectedStake) {
        console.log('Rendering initial screen - no stake selected');
        return (
            <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-purple-900" style={{ position: 'relative' }}>
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






    // If stake exists, App will navigate to selection; keep screen minimal here
    return null;


}