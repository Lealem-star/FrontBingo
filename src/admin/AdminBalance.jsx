import React, { useEffect, useState } from 'react';
import { apiFetch } from '../lib/api/client';

export default function AdminBalance() {
    const [withdrawals, setWithdrawals] = useState([]);
    const [deposits, setDeposits] = useState([]);
    const [activeTab, setActiveTab] = useState('deposit');

    useEffect(() => {
        (async () => {
            const w = await apiFetch('/admin/balances/withdrawals?status=pending');
            setWithdrawals(w.withdrawals || []);
            const d = await apiFetch('/admin/balances/deposits');
            setDeposits(d.deposits || []);
        })();
    }, []);

    const getStatusColor = (status) => {
        switch (status) {
            case 'pending': return 'admin-status-pending';
            case 'completed': return 'admin-status-completed';
            case 'cancelled': return 'admin-status-cancelled';
            case 'failed': return 'admin-status-failed';
            default: return 'admin-status-default';
        }
    };

    return (
        <div className="admin-balance-container admin-balance-page">
            {/* Toggle Buttons */}
            <div className="admin-balance-toggle">
                <button
                    onClick={() => setActiveTab('deposit')}
                    className={`admin-balance-button ${activeTab === 'deposit' ? 'admin-balance-button-active' : 'admin-balance-button-inactive'}`}
                >
                    <span>💰</span>
                    <span>Deposit</span>
                </button>

                <div className="admin-balance-center">
                </div>

                <button
                    onClick={() => setActiveTab('withdraw')}
                    className={`admin-balance-button ${activeTab === 'withdraw' ? 'admin-balance-button-active' : 'admin-balance-button-inactive'}`}
                >
                    <span>💸</span>
                    <span>Withdraw</span>
                </button>
            </div>

            {/* Main Content Area */}
            <div className="admin-card">

                {/* Table Header */}
                <div className="admin-table-header">
                    <div className="admin-table-header-item">
                        <span>👤</span>
                        Player Name
                    </div>
                    {activeTab === 'deposit' ? (
                        <>
                            <div className="admin-table-header-item">
                                <span>💰</span>
                                Deposit Amount
                            </div>
                            <div className="admin-table-header-item">
                                <span>🎁</span>
                                Gift
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="admin-table-header-item">
                                <span>💸</span>
                                Withdraw Amount
                            </div>
                            <div className="admin-table-header-item">
                                <span>🏦</span>
                                Account Number
                            </div>
                        </>
                    )}
                </div>

                {/* Table Content */}
                <div className="admin-table-content">
                    {activeTab === 'deposit' ? (
                        deposits.length > 0 ? (
                            deposits.map(d => (
                                <div key={d._id} className="admin-table-row">
                                    <div className="admin-table-cell admin-table-cell-blue">
                                        <span>👤</span>
                                        User {d.userId?.slice(-6) || 'Unknown'}
                                    </div>
                                    <div className="admin-table-cell admin-table-cell-bold admin-table-cell-green">
                                        <span>💰</span>
                                        ETB {d.amount}
                                    </div>
                                    <div className="admin-table-cell admin-table-cell-bold admin-table-cell-amber">
                                        <span>🎁</span>
                                        +{Math.floor(d.amount * 0.1)} coins
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="admin-empty-state">
                                <div className="admin-empty-icon">💰</div>
                                <div className="admin-empty-title">No deposits found</div>
                                <div className="admin-empty-subtitle">Deposit transactions will appear here</div>
                            </div>
                        )
                    ) : (
                        withdrawals.length > 0 ? (
                            withdrawals.map(w => (
                                <div key={w._id} className="admin-table-row">
                                    <div className="admin-table-cell admin-table-cell-blue">
                                        <span>👤</span>
                                        User {w.userId?.slice(-6) || 'Unknown'}
                                    </div>
                                    <div className="admin-table-cell admin-table-cell-bold admin-table-cell-orange">
                                        <span>💸</span>
                                        ETB {w.amount}
                                    </div>
                                    <div className="admin-table-cell">
                                        <span className={`admin-status-badge-small ${getStatusColor(w.status)}`}>
                                            {w.status === 'pending' && '⏳'}
                                            {w.status === 'completed' && '✅'}
                                            {w.status === 'cancelled' && '❌'}
                                            {w.status === 'failed' && '⚠️'}
                                            {w.status || 'pending'}
                                        </span>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="admin-empty-state">
                                <div className="admin-empty-icon">💸</div>
                                <div className="admin-empty-title">No withdrawal requests</div>
                                <div className="admin-empty-subtitle">Withdrawal requests will appear here</div>
                            </div>
                        )
                    )}
                </div>
            </div>
        </div>
    );
}
