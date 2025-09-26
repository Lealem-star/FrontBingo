import React, { useState, useEffect } from 'react';
import BottomNav from '../components/BottomNav';
import { useAuth } from '../lib/auth/AuthProvider';
import { apiFetch } from '../lib/api/client';

export default function Profile({ onNavigate }) {
    const [sound, setSound] = useState(true);
    const [profileData, setProfileData] = useState({
        user: {
            firstName: 'User',
            lastName: '',
            phone: null,
            isRegistered: false,
            totalGamesPlayed: 0,
            totalGamesWon: 0,
            registrationDate: new Date()
        },
        wallet: {
            balance: 0,
            coins: 0,
            gamesWon: 0
        }
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const { user, sessionId, isLoading: authLoading } = useAuth();

    const displayName = profileData.user?.firstName || user?.firstName || 'Player';
    const initials = displayName.charAt(0).toUpperCase();

    // Fetch profile data
    useEffect(() => {
        const fetchProfileData = async () => {
            if (authLoading || !sessionId) {
                setLoading(false);
                return;
            }
            try {
                setLoading(true);
                setError(null);

                const data = await apiFetch('/user/profile', { sessionId });
                setProfileData(data);
            } catch (error) {
                console.error('Failed to fetch profile data:', error);
                if (error.message === 'request_timeout') {
                    setError('Request timeout - please try again');
                } else {
                    setError('Failed to load profile. Please try again.');
                }
            } finally {
                setLoading(false);
            }
        };

        fetchProfileData();
    }, [sessionId, authLoading]);

    return (
        <div className="profile-page">
            {/* Header */}
            <header className="profile-header">
                <div className="profile-header-content">
                    <div className="profile-avatar">{initials}</div>
                    <h1 className="profile-name">{displayName}</h1>
                    {profileData.user?.isRegistered && (
                        <div className="profile-verified">
                            <span className="profile-verified-icon">✓</span>
                            <span className="profile-verified-text">Verified User</span>
                        </div>
                    )}
                </div>
            </header>

            {/* Main content */}
            <main className="profile-main">
                {loading ? (
                    <div className="profile-loading">
                        <div className="profile-spinner"></div>
                        <div className="profile-loading-text">Loading profile...</div>
                    </div>
                ) : error ? (
                    <div className="profile-error">
                        <div className="profile-error-icon">❌ Error Loading Data</div>
                        <div className="profile-error-text">{error}</div>
                        <button
                            onClick={() => window.location.reload()}
                            className="profile-retry-button"
                        >
                            Retry
                        </button>
                    </div>
                ) : (
                    <>
                        {/* Wallet & Statistics Cards */}
                        <div className="profile-cards">
                            {/* Main Wallet Balance */}
                            <div className="profile-card">
                                <div className="profile-card-title">
                                    <span className="profile-card-icon">💰</span>
                                    <span className="profile-card-label">Main Wallet</span>
                                </div>
                                <div className="profile-card-value">{profileData.wallet.main?.toLocaleString() || 0}</div>
                                <div className="profile-card-subtitle">Primary balance</div>
                            </div>

                            {/* Play Wallet Balance */}
                            <div className="profile-card">
                                <div className="profile-card-title">
                                    <span className="profile-card-icon">🎮</span>
                                    <span className="profile-card-label">Play Wallet</span>
                                </div>
                                <div className="profile-card-value profile-card-value-green">{profileData.wallet.play?.toLocaleString() || 0}</div>
                                <div className="profile-card-subtitle">Game funds</div>
                            </div>

                            {/* Total Coins */}
                            <div className="profile-card">
                                <div className="profile-card-title">
                                    <span className="profile-card-icon">🪙</span>
                                    <span className="profile-card-label">Total Coins</span>
                                </div>
                                <div className="profile-card-value profile-card-value-yellow">{profileData.wallet.coins?.toLocaleString() || 0}</div>
                                <div className="profile-card-subtitle">Earned coins</div>
                            </div>

                            {/* Games Won */}
                            <div className="profile-card">
                                <div className="profile-card-title">
                                    <span className="profile-card-icon">🏆</span>
                                    <span className="profile-card-label">Games Won</span>
                                </div>
                                <div className="profile-card-value">{profileData.wallet.gamesWon?.toLocaleString() || 0}</div>
                                <div className="profile-card-subtitle">Victories</div>
                            </div>
                        </div>

                        {/* Settings Section */}
                        <div className="profile-settings">
                            <h2 className="profile-settings-title">Settings</h2>

                            {/* Sound Toggle */}
                            <div className="profile-settings-row">
                                <div className="profile-settings-content">
                                    <div className="profile-settings-label">
                                        <span className="profile-settings-icon">🔉</span>
                                        <span className="profile-settings-text">Sound</span>
                                    </div>
                                    <button onClick={() => setSound(!sound)} className={`profile-switch ${sound ? 'on' : ''}`} aria-pressed={sound}>
                                        <span className="profile-switch-knob"></span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </main>

            <BottomNav current="profile" onNavigate={onNavigate} />
        </div>
    );
}

