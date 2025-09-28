import React, { useState, useEffect } from 'react';
import { apiFetch } from '../lib/api/client';

export default function AdminDepositVerification() {
    const [verifications, setVerifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState(null);
    const [selectedVerification, setSelectedVerification] = useState(null);
    const [actionLoading, setActionLoading] = useState(false);

    useEffect(() => {
        fetchVerifications();
        fetchStats();
    }, []);

    const fetchVerifications = async () => {
        try {
            setLoading(true);
            const response = await apiFetch('/sms-forwarder/verifications');
            if (response.success) {
                setVerifications(response.verifications);
            }
        } catch (error) {
            console.error('Error fetching verifications:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchStats = async () => {
        try {
            const response = await apiFetch('/sms-forwarder/stats');
            if (response.success) {
                setStats(response.stats);
            }
        } catch (error) {
            console.error('Error fetching stats:', error);
        }
    };

    const handleApprove = async (verificationId) => {
        try {
            setActionLoading(true);
            const response = await apiFetch(`/sms-forwarder/approve/${verificationId}`, {
                method: 'POST',
                body: { adminId: 'current_admin' } // In real app, get from auth context
            });

            if (response.success) {
                await fetchVerifications();
                await fetchStats();
                setSelectedVerification(null);
            }
        } catch (error) {
            console.error('Error approving verification:', error);
            alert('Failed to approve verification');
        } finally {
            setActionLoading(false);
        }
    };

    const handleReject = async (verificationId, reason) => {
        try {
            setActionLoading(true);
            const response = await apiFetch(`/sms-forwarder/reject/${verificationId}`, {
                method: 'POST',
                body: {
                    adminId: 'current_admin', // In real app, get from auth context
                    reason
                }
            });

            if (response.success) {
                await fetchVerifications();
                await fetchStats();
                setSelectedVerification(null);
            }
        } catch (error) {
            console.error('Error rejecting verification:', error);
            alert('Failed to reject verification');
        } finally {
            setActionLoading(false);
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'pending_review': return 'text-yellow-500';
            case 'approved': return 'text-green-500';
            case 'rejected': return 'text-red-500';
            default: return 'text-gray-500';
        }
    };

    const getConfidenceColor = (confidence) => {
        if (confidence >= 80) return 'text-green-500';
        if (confidence >= 60) return 'text-yellow-500';
        return 'text-red-500';
    };

    if (loading) {
        return (
            <div className="p-6">
                <div className="animate-pulse">
                    <div className="h-8 bg-gray-300 rounded w-1/4 mb-4"></div>
                    <div className="space-y-3">
                        {[...Array(5)].map((_, i) => (
                            <div key={i} className="h-16 bg-gray-300 rounded"></div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900 mb-4">Deposit Verifications</h1>

                {/* Stats Cards */}
                {stats && (
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                        <div className="bg-white p-4 rounded-lg shadow">
                            <h3 className="text-sm font-medium text-gray-500">Total SMS</h3>
                            <p className="text-2xl font-bold text-blue-600">{stats.sms?.total || 0}</p>
                        </div>
                        <div className="bg-white p-4 rounded-lg shadow">
                            <h3 className="text-sm font-medium text-gray-500">Matched SMS</h3>
                            <p className="text-2xl font-bold text-green-600">{stats.sms?.matched || 0}</p>
                        </div>
                        <div className="bg-white p-4 rounded-lg shadow">
                            <h3 className="text-sm font-medium text-gray-500">Match Rate</h3>
                            <p className="text-2xl font-bold text-purple-600">
                                {stats.sms?.matchRate?.toFixed(1) || 0}%
                            </p>
                        </div>
                        <div className="bg-white p-4 rounded-lg shadow">
                            <h3 className="text-sm font-medium text-gray-500">Pending Reviews</h3>
                            <p className="text-2xl font-bold text-yellow-600">
                                {verifications.filter(v => v.status === 'pending_review').length}
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {/* Verifications List */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200">
                    <h2 className="text-lg font-medium text-gray-900">Verification Requests</h2>
                </div>

                <div className="divide-y divide-gray-200">
                    {verifications.map((verification) => (
                        <div key={verification._id} className="p-6 hover:bg-gray-50">
                            <div className="flex items-center justify-between">
                                <div className="flex-1">
                                    <div className="flex items-center space-x-4">
                                        <div>
                                            <h3 className="text-sm font-medium text-gray-900">
                                                {verification.userId?.firstName} {verification.userId?.lastName}
                                            </h3>
                                            <p className="text-sm text-gray-500">
                                                {verification.userId?.phone} • {verification.userId?.telegramId}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-lg font-bold text-green-600">
                                                ETB {verification.amount?.toFixed(2)}
                                            </p>
                                            <p className={`text-sm font-medium ${getConfidenceColor(verification.matchResult?.confidence)}`}>
                                                {verification.matchResult?.confidence?.toFixed(1)}% confidence
                                            </p>
                                        </div>
                                    </div>

                                    {/* Match Details */}
                                    <div className="mt-3 flex space-x-4">
                                        <div className="flex items-center space-x-2">
                                            <span className="text-xs text-gray-500">Amount:</span>
                                            <span className={`text-xs font-medium ${verification.matchResult?.matches?.amountMatch ? 'text-green-600' : 'text-red-600'}`}>
                                                {verification.matchResult?.matches?.amountMatch ? '✓' : '✗'}
                                            </span>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <span className="text-xs text-gray-500">Reference:</span>
                                            <span className={`text-xs font-medium ${verification.matchResult?.matches?.referenceMatch ? 'text-green-600' : 'text-red-600'}`}>
                                                {verification.matchResult?.matches?.referenceMatch ? '✓' : '✗'}
                                            </span>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <span className="text-xs text-gray-500">Time:</span>
                                            <span className={`text-xs font-medium ${verification.matchResult?.matches?.timeMatch ? 'text-green-600' : 'text-red-600'}`}>
                                                {verification.matchResult?.matches?.timeMatch ? '✓' : '✗'}
                                            </span>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <span className="text-xs text-gray-500">Method:</span>
                                            <span className={`text-xs font-medium ${verification.matchResult?.matches?.paymentMethodMatch ? 'text-green-600' : 'text-red-600'}`}>
                                                {verification.matchResult?.matches?.paymentMethodMatch ? '✓' : '✗'}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center space-x-3">
                                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(verification.status)} bg-gray-100`}>
                                        {verification.status?.replace('_', ' ')}
                                    </span>

                                    {verification.status === 'pending_review' && (
                                        <div className="flex space-x-2">
                                            <button
                                                onClick={() => setSelectedVerification(verification)}
                                                className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                                            >
                                                View Details
                                            </button>
                                            <button
                                                onClick={() => handleApprove(verification._id)}
                                                disabled={actionLoading}
                                                className="px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                                            >
                                                Approve
                                            </button>
                                            <button
                                                onClick={() => {
                                                    const reason = prompt('Rejection reason:');
                                                    if (reason) handleReject(verification._id, reason);
                                                }}
                                                disabled={actionLoading}
                                                className="px-3 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                                            >
                                                Reject
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Verification Details Modal */}
            {selectedVerification && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-medium">Verification Details</h3>
                            <button
                                onClick={() => setSelectedVerification(null)}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="space-y-4">
                            {/* User Info */}
                            <div className="bg-gray-50 p-4 rounded">
                                <h4 className="font-medium text-gray-900 mb-2">User Information</h4>
                                <p className="text-sm text-gray-600">
                                    {selectedVerification.userId?.firstName} {selectedVerification.userId?.lastName}
                                </p>
                                <p className="text-sm text-gray-600">
                                    Phone: {selectedVerification.userId?.phone}
                                </p>
                                <p className="text-sm text-gray-600">
                                    Telegram: {selectedVerification.userId?.telegramId}
                                </p>
                            </div>

                            {/* User SMS */}
                            <div className="bg-blue-50 p-4 rounded">
                                <h4 className="font-medium text-gray-900 mb-2">User SMS</h4>
                                <p className="text-sm text-gray-600 font-mono">
                                    {selectedVerification.userSMS?.message}
                                </p>
                                <div className="mt-2 text-xs text-gray-500">
                                    Amount: {selectedVerification.userSMS?.parsedData?.amount} ETB
                                </div>
                            </div>

                            {/* Receiver SMS */}
                            <div className="bg-green-50 p-4 rounded">
                                <h4 className="font-medium text-gray-900 mb-2">Receiver SMS</h4>
                                <p className="text-sm text-gray-600 font-mono">
                                    {selectedVerification.receiverSMS?.message}
                                </p>
                                <div className="mt-2 text-xs text-gray-500">
                                    Amount: {selectedVerification.receiverSMS?.parsedData?.amount} ETB
                                </div>
                            </div>

                            {/* Match Results */}
                            <div className="bg-yellow-50 p-4 rounded">
                                <h4 className="font-medium text-gray-900 mb-2">Match Analysis</h4>
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <span className="text-gray-600">Confidence:</span>
                                        <span className={`ml-2 font-medium ${getConfidenceColor(selectedVerification.matchResult?.confidence)}`}>
                                            {selectedVerification.matchResult?.confidence?.toFixed(1)}%
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-gray-600">Score:</span>
                                        <span className="ml-2 font-medium">
                                            {selectedVerification.matchResult?.matchScore}/{selectedVerification.matchResult?.totalCriteria}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex justify-end space-x-3">
                                <button
                                    onClick={() => setSelectedVerification(null)}
                                    className="px-4 py-2 text-sm bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                                >
                                    Close
                                </button>
                                <button
                                    onClick={() => handleApprove(selectedVerification._id)}
                                    disabled={actionLoading}
                                    className="px-4 py-2 text-sm bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                                >
                                    Approve Deposit
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
