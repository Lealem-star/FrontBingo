import React, { useEffect, useState } from 'react';
import BottomNav from '../components/BottomNav';
import { useAuth } from '../lib/auth/AuthProvider.jsx';
import { apiFetch } from '../lib/api/client.js';

export default function Wallet({ onNavigate }) {
    const { sessionId, user } = useAuth();
    const [wallet, setWallet] = useState({ main: 0, play: 0, coins: 0 });
    const [coins, setCoins] = useState('');
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('balance');
    const [transactions, setTransactions] = useState([]);
    const [profileData, setProfileData] = useState(null);
    const [displayPhone, setDisplayPhone] = useState(null);
    const [displayRegistered, setDisplayRegistered] = useState(false);

    // Transfer functionality
    const [transferAmount, setTransferAmount] = useState('');
    const [transferDirection, setTransferDirection] = useState('main-to-play'); // 'main-to-play' or 'play-to-main'
    const [transferLoading, setTransferLoading] = useState(false);

    // Quick transfer functionality
    const [quickTransferLoading, setQuickTransferLoading] = useState(false);

    // History loading state
    const [historyLoading, setHistoryLoading] = useState(false);

    // Fetch wallet and profile data once
    useEffect(() => {
        if (!sessionId) {
            setLoading(false);
            return;
        }
        const fetchData = async () => {
            try {
                setLoading(true);

                // Add timeout to prevent infinite loading
                const timeoutId = setTimeout(() => {
                    setLoading(false);
                }, 10000); // 10 second timeout

                // Fetch profile data which includes wallet information
                try {
                    const profile = await apiFetch('/user/profile', { sessionId });
                    setProfileData(profile);
                    setDisplayPhone(profile?.user?.phone || null);
                    setDisplayRegistered(!!profile?.user?.isRegistered);

                    // Extract wallet data from profile response
                    if (profile?.wallet) {
                        setWallet({
                            main: profile.wallet.main || 0,
                            play: profile.wallet.play || 0,
                            coins: profile.wallet.coins || 0
                        });
                    }
                } catch (e) {
                    console.error('Profile fetch error:', e);
                    // Fallback to direct wallet fetch if profile fails
                    try {
                        const walletData = await apiFetch('/wallet', { sessionId });
                        setWallet(walletData);
                    } catch (walletError) {
                        console.error('Wallet fetch error:', walletError);
                    }
                }
                clearTimeout(timeoutId);
            } catch (error) {
                console.error('Failed to fetch wallet data:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [sessionId]); // Removed activeTab dependency

    // Fetch transactions only when history tab is active
    useEffect(() => {
        if (!sessionId || activeTab !== 'history') return;

        const fetchTransactions = async () => {
            try {
                setHistoryLoading(true);
                const timeoutId = setTimeout(() => {
                    setHistoryLoading(false);
                }, 10000); // 10 second timeout

                const transactionData = await apiFetch('/user/transactions', { sessionId });
                clearTimeout(timeoutId);
                setTransactions(transactionData.transactions || []);
            } catch (error) {
                console.error('Failed to fetch transactions:', error);
                setTransactions([]); // Ensure we have an empty array on error
            } finally {
                setHistoryLoading(false);
            }
        };
        fetchTransactions();
    }, [sessionId, activeTab]);

    const convert = async () => {
        if (!sessionId) return;
        const amt = Number(coins || 0);
        if (!amt) return;
        try {
            // Convert coins to Birr and add to Play Wallet
            const out = await apiFetch('/wallet/convert', {
                method: 'POST',
                body: {
                    coins: amt,
                    targetWallet: 'play' // Add to Play Wallet instead of Main
                },
                sessionId
            });
            setWallet(out.wallet);
            setCoins('');
            // Refresh transactions if on history tab
            if (activeTab === 'history') {
                const transactionData = await apiFetch('/user/transactions', { sessionId });
                setTransactions(transactionData.transactions || []);
            }
        } catch (error) {
            console.error('Coin conversion failed:', error);
            alert('Coin conversion failed. Please try again.');
        }
    };

    const transferFunds = async () => {
        if (!sessionId) return;
        const amt = Number(transferAmount || 0);
        if (!amt) return;

        try {
            setTransferLoading(true);
            const out = await apiFetch('/wallet/transfer', {
                method: 'POST',
                body: {
                    amount: amt,
                    direction: transferDirection
                },
                sessionId
            });
            setWallet(out.wallet);
            setTransferAmount('');
            // Refresh transactions if on history tab
            if (activeTab === 'history') {
                const transactionData = await apiFetch('/user/transactions', { sessionId });
                setTransactions(transactionData.transactions || []);
            }
        } catch (error) {
            console.error('Transfer failed:', error);
            alert('Transfer failed. Please try again.');
        } finally {
            setTransferLoading(false);
        }
    };

    // Quick transfer function for circular icons - transfers entire balance immediately
    const quickTransfer = async (direction) => {
        if (!sessionId) return;

        // Get the source wallet balance
        const sourceBalance = direction === 'main-to-play' ? wallet.main : wallet.play;
        if (!sourceBalance || sourceBalance <= 0) {
            return; // No funds available, do nothing
        }

        try {
            setQuickTransferLoading(true);
            const out = await apiFetch('/wallet/transfer', {
                method: 'POST',
                body: {
                    amount: sourceBalance,
                    direction: direction
                },
                sessionId
            });
            setWallet(out.wallet);
            // Refresh transactions if on history tab
            if (activeTab === 'history') {
                const transactionData = await apiFetch('/user/transactions', { sessionId });
                setTransactions(transactionData.transactions || []);
            }
        } catch (error) {
            console.error('Quick transfer failed:', error);
        } finally {
            setQuickTransferLoading(false);
        }
    };
    return (
        <div className="wallet-page">
            {/* Header */}
            <header className="wallet-header">
                <div className="wallet-header-content">
                    <h1 className="wallet-title">Wallet</h1>
                </div>
            </header>

            <main className="wallet-main">
                {/* User Info Section */}
                <div className="wallet-panel">
                    <div className="wallet-user-info">
                        <div className="wallet-user-details">
                            <div className="wallet-user-icon">👤</div>
                            <div className="wallet-user-text">
                                <span className="wallet-user-name">
                                    {profileData?.user?.firstName || user?.firstName || 'Player'}
                                </span>
                                {displayPhone && (
                                    <span className="wallet-user-phone">{displayPhone}</span>
                                )}
                            </div>
                        </div>
                        {displayRegistered ? (
                            <div className="wallet-status-verified">
                                <span className="wallet-status-icon">✓</span>
                                <span className="wallet-status-text">Verified</span>
                            </div>
                        ) : (
                            <div className="wallet-status-unverified">
                                <span className="wallet-status-icon">!</span>
                                <span className="wallet-status-text">Not registered</span>
                            </div>
                        )}
                    </div>

                    {/* Tabs */}
                    <div className="wallet-segmented">
                        <button
                            onClick={() => setActiveTab('balance')}
                            className={`wallet-seg ${activeTab === 'balance' ? 'active' : ''}`}
                        >
                            Balance
                        </button>
                        <button
                            onClick={() => setActiveTab('history')}
                            className={`wallet-seg ${activeTab === 'history' ? 'active' : ''}`}
                        >
                            History
                        </button>
                    </div>
                </div>

                {loading ? (
                    <div className="wallet-loading">
                        <div className="wallet-spinner"></div>
                    </div>
                ) : activeTab === 'balance' ? (
                    /* Wallet Balances */
                    <div className="wallet-balances">
                        {/* Main Wallet */}
                        <div className="wallet-card">
                            <div className="wallet-card-content">
                                <div className="wallet-card-label">
                                    <span className="wallet-label-text">Main Wallet</span>
                                    <span className="wallet-label-icon">💰</span>
                                </div>
                                <span className="wallet-value">{wallet.main?.toLocaleString() || 0}</span>
                            </div>
                            {/* Quick Transfer Icon */}
                            <button
                                onClick={() => quickTransfer('main-to-play')}
                                disabled={quickTransferLoading || !wallet.main || wallet.main <= 0}
                                className="wallet-transfer-icon wallet-transfer-icon-main"
                                title="Transfer to Play Wallet"
                            >
                                {quickTransferLoading ? (
                                    <div className="wallet-transfer-spinner"></div>
                                ) : (
                                    <span className="wallet-transfer-arrow">→</span>
                                )}
                            </button>
                        </div>

                        {/* Play Wallet */}
                        <div className="wallet-card">
                            <div className="wallet-card-content">
                                <div className="wallet-card-label">
                                    <span className="wallet-label-text">Play Wallet</span>
                                    <span className="wallet-label-icon">🎮</span>
                                </div>
                                <span className="wallet-value wallet-value-green">{wallet.play?.toLocaleString() || 0}</span>
                            </div>
                            {/* Quick Transfer Icon */}
                            <button
                                onClick={() => quickTransfer('play-to-main')}
                                disabled={quickTransferLoading || !wallet.play || wallet.play <= 0}
                                className="wallet-transfer-icon wallet-transfer-icon-play"
                                title="Transfer to Main Wallet"
                            >
                                {quickTransferLoading ? (
                                    <div className="wallet-transfer-spinner"></div>
                                ) : (
                                    <span className="wallet-transfer-arrow">←</span>
                                )}
                            </button>
                        </div>

                        {/* Coins */}
                        <div className="wallet-card">
                            <div className="wallet-card-content">
                                <div className="wallet-card-label">
                                    <span className="wallet-label-text">Coins</span>
                                    <span className="wallet-label-icon">🪙</span>
                                </div>
                                <span className="wallet-value wallet-value-yellow">{wallet.coins?.toLocaleString() || 0}</span>
                            </div>
                            <div className="wallet-card-description">
                                Earned coins that can be converted to wallet funds
                            </div>
                        </div>
                    </div>
                ) : (
                    /* Transaction History */
                    <div className="wallet-history">
                        <h3 className="wallet-history-title">Recent Transactions</h3>
                        {historyLoading ? (
                            <div className="wallet-loading">
                                <div className="wallet-spinner"></div>
                                <div className="wallet-loading-text">Loading transactions...</div>
                            </div>
                        ) : transactions.length === 0 ? (
                            <div className="wallet-empty-state">
                                <div className="wallet-empty-icon">📝</div>
                                <div className="wallet-empty-text">No transactions yet</div>
                            </div>
                        ) : (
                            transactions.map((transaction) => (
                                <div key={transaction.id} className="wallet-transaction">
                                    <div className="wallet-transaction-content">
                                        <div className="wallet-transaction-info">
                                            <div className="wallet-transaction-icon">📄</div>
                                            <div className="wallet-transaction-details">
                                                <div className="wallet-transaction-description">{transaction.description || (transaction.type === 'deposit' ? 'Deposit' : 'Transaction')}</div>
                                                <div className="wallet-transaction-date">
                                                    {new Date(transaction.createdAt).toLocaleString()}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="wallet-transaction-amount">
                                            <div className={`wallet-transaction-value ${transaction.amount > 0 ? 'positive' : 'negative'}`}>{transaction.amount > 0 ? `+${transaction.amount}` : `${transaction.amount}`}</div>
                                            <div className={`wallet-transaction-status ${transaction.status === 'Approved' || transaction.amount > 0 ? 'approved' : 'pending'}`}>{transaction.status || (transaction.amount > 0 ? 'Approved' : '')}</div>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}

                {/* Transfer Section - show only on Balance tab */}
                {activeTab === 'balance' && (
                    <div className="wallet-transfer">
                        <h3 className="wallet-transfer-title">Transfer Funds</h3>
                        <div className="wallet-transfer-controls">
                            <div className="wallet-transfer-direction">
                                <button
                                    onClick={() => setTransferDirection('main-to-play')}
                                    className={`wallet-transfer-btn ${transferDirection === 'main-to-play' ? 'active' : ''}`}
                                >
                                    Main → Play
                                </button>
                                <button
                                    onClick={() => setTransferDirection('play-to-main')}
                                    className={`wallet-transfer-btn ${transferDirection === 'play-to-main' ? 'active' : ''}`}
                                >
                                    Play → Main
                                </button>
                            </div>
                            <div className="wallet-transfer-amount">
                                <input
                                    type="number"
                                    value={transferAmount}
                                    onChange={(e) => setTransferAmount(e.target.value)}
                                    className="wallet-transfer-input"
                                    placeholder="Enter amount to transfer"
                                    min="1"
                                />
                                <button
                                    onClick={transferFunds}
                                    disabled={transferLoading || !transferAmount}
                                    className="wallet-transfer-button"
                                >
                                    {transferLoading ? 'Transferring...' : 'Transfer'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Convert Section - show only on Balance tab */}
                {activeTab === 'balance' && (
                    <div className="wallet-convert">
                        <h3 className="wallet-convert-title">Convert Coins to Birr</h3>
                        <div className="wallet-convert-description">
                            Convert your earned coins to Birr and add to your Play Wallet for gaming
                        </div>
                        <div className="wallet-convert-controls">
                            <input
                                value={coins}
                                onChange={(e) => setCoins(e.target.value)}
                                className="wallet-convert-input"
                                placeholder="Enter coins to convert to Birr"
                            />
                            <button
                                onClick={convert}
                                className="wallet-convert-button"
                            >
                                <span>🪙→💰</span>
                                <span>Convert to Play Wallet</span>
                            </button>
                        </div>
                    </div>
                )}
            </main>
            <BottomNav current="wallet" onNavigate={onNavigate} />
        </div>
    );
}

