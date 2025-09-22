import React, { useState, useEffect } from 'react';
import BottomNav from '../components/BottomNav';
import { useAuth } from '../lib/auth/AuthProvider';
import { apiFetch } from '../lib/api/client';

export default function Scores({ onNavigate }) {
    const { sessionId, user } = useAuth();
    const [userStats, setUserStats] = useState({
        totalGamesPlayed: 0,
        totalGamesWon: 0,
        totalWinnings: 0,
        winRate: 0
    });
    const [loading, setLoading] = useState(true);
    const [topFilter, setTopFilter] = useState('newyear'); // newyear | alltime | monthly | weekly | daily

    const leaderboards = {
        newyear: [
            { name: 'Kiya', played: 1293, wins: 102 },
            { name: 'djx@etc', played: 774, wins: 97 },
            { name: 'Sara', played: 650, wins: 80 }
        ],
        alltime: [
            { name: 'Alpha', played: 2301, wins: 320 },
            { name: 'Beta', played: 2019, wins: 298 },
            { name: 'Gamma', played: 1890, wins: 276 }
        ],
        monthly: [
            { name: 'Miki', played: 120, wins: 28 },
            { name: 'Lulu', played: 110, wins: 25 },
            { name: 'Noah', played: 95, wins: 22 }
        ],
        weekly: [
            { name: 'Ken', played: 38, wins: 9 },
            { name: 'Abel', played: 34, wins: 8 },
            { name: 'Ruth', played: 30, wins: 7 }
        ],
        daily: [
            { name: 'Mina', played: 9, wins: 3 },
            { name: 'Yon', played: 8, wins: 2 },
            { name: 'Geez', played: 7, wins: 2 }
        ]
    };

    useEffect(() => {
        if (!sessionId) {
            setLoading(false);
            return;
        }
        const fetchUserStats = async () => {
            try {
                setLoading(true);

                // Add timeout to prevent infinite loading
                const timeoutId = setTimeout(() => {
                    setLoading(false);
                }, 10000); // 10 second timeout

                const data = await apiFetch('/user/profile', { sessionId });
                const stats = data.user;
                setUserStats({
                    totalGamesPlayed: stats.totalGamesPlayed || 0,
                    totalGamesWon: stats.totalGamesWon || 0,
                    totalWinnings: stats.totalWinnings || 0,
                    winRate: stats.totalGamesPlayed > 0 ? Math.round((stats.totalGamesWon / stats.totalGamesPlayed) * 100) : 0
                });
                clearTimeout(timeoutId);
            } catch (error) {
                console.error('Failed to fetch user stats:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchUserStats();
    }, [sessionId]);

    return (
        <div className="scores-page">
            <main className="scores-main">
                {loading ? (
                    <div className="scores-loading">
                        <div className="scores-spinner"></div>
                    </div>
                ) : (
                    <>
                        {/* Leaderboard header */}
                        <section className="scores-section">
                            <h2 className="scores-title">Leaderboard</h2>
                            <div className="scores-user-card">
                                <div className="scores-user-info">
                                    <div className="scores-user-avatar">
                                        {String(user?.firstName || 'U').charAt(0).toUpperCase()}
                                    </div>
                                    <div className="scores-user-details">
                                        <div className="scores-user-name">{user?.firstName || 'User'}</div>
                                        <div className="scores-user-stats">{userStats.totalGamesPlayed} Played • {userStats.totalGamesWon} wins</div>
                                    </div>
                                </div>
                                <div className="scores-user-rank">Unranked</div>
                            </div>
                        </section>

                        {/* Top Players filter bar + list */}
                        <section className="scores-section">
                            <h3 className="scores-subtitle">Top Players</h3>
                            <div className="scores-segmented">
                                <button onClick={() => setTopFilter('newyear')} className={`scores-seg ${topFilter === 'newyear' ? 'active' : ''}`}>New year</button>
                                <button onClick={() => setTopFilter('alltime')} className={`scores-seg ${topFilter === 'alltime' ? 'active' : ''}`}>All time</button>
                                <button onClick={() => setTopFilter('monthly')} className={`scores-seg ${topFilter === 'monthly' ? 'active' : ''}`}>Monthly</button>
                                <button onClick={() => setTopFilter('weekly')} className={`scores-seg ${topFilter === 'weekly' ? 'active' : ''}`}>Weekly</button>
                                <button onClick={() => setTopFilter('daily')} className={`scores-seg ${topFilter === 'daily' ? 'active' : ''}`}>Daily</button>
                            </div>
                            <div className="scores-leaderboard">
                                {(leaderboards[topFilter] || []).map((p, i) => (
                                    <div key={p.name} className="scores-leaderboard-item">
                                        <div className="scores-leaderboard-content">
                                            <div className="scores-leaderboard-rank">{i + 1}</div>
                                            <div className="scores-leaderboard-details">
                                                <div className="scores-leaderboard-name">{p.name}</div>
                                                <div className="scores-leaderboard-wins">{p.wins} wins</div>
                                            </div>
                                            <div className="scores-leaderboard-played">{p.played}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>
                    </>
                )}
            </main>
            <BottomNav current="scores" onNavigate={onNavigate} />
        </div>
    );
}

