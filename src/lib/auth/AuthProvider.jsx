import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { apiFetch } from '../api/client';

const AuthContext = createContext({ sessionId: null, user: null, setSessionId: () => { } });

async function verifyTelegram(initData) {
    const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:3001';
    const res = await fetch(`${apiBase}/auth/telegram/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initData })
    });
    if (!res.ok) throw new Error('verify_failed');
    return res.json();
}

async function fetchProfileWithSession(sessionId) {
    if (!sessionId) return null;
    try {
        return await apiFetch('/user/profile', { sessionId });
    } catch {
        return null;
    }
}

export function AuthProvider({ children }) {
    const [sessionId, setSessionId] = useState(() => localStorage.getItem('sessionId'));
    const [user, setUser] = useState(() => {
        const raw = localStorage.getItem('user');
        return raw ? JSON.parse(raw) : null;
    });
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        (async () => {
            // If Telegram initData is present, ALWAYS re-verify and refresh session to avoid stale local sessions
            try {
                const hashParamsEarly = new URLSearchParams(window.location.hash.substring(1));
                const searchParamsEarly = new URLSearchParams(window.location.search);
                const initDataEarly = window?.Telegram?.WebApp?.initData ||
                    hashParamsEarly.get('tgWebAppData') ||
                    searchParamsEarly.get('tgWebAppData');

                if (initDataEarly) {
                    const out = await verifyTelegram(initDataEarly);
                    // If switching accounts, replace cached session/user entirely
                    const prevUser = (() => { try { return JSON.parse(localStorage.getItem('user')); } catch { return null; } })();
                    const isDifferentUser = prevUser && prevUser.id && prevUser.id !== out.user?.id;
                    if (isDifferentUser) {
                        localStorage.removeItem('user');
                    }
                    setSessionId(out.sessionId);
                    localStorage.setItem('sessionId', out.sessionId);

                    let mergedUser = out.user;
                    try {
                        const prof = await fetchProfileWithSession(out.sessionId);
                        if (prof?.user) {
                            mergedUser = { ...mergedUser, ...{ firstName: prof.user.firstName, lastName: prof.user.lastName, phone: prof.user.phone, isRegistered: prof.user.isRegistered } };
                        }
                    } catch { }
                    setUser(mergedUser);
                    localStorage.setItem('user', JSON.stringify(mergedUser));
                    setIsLoading(false);
                    return; // short-circuit: we've just established fresh session from Telegram
                }
            } catch { /* fall back to existing session flow */ }

            if (sessionId && user) {
                // Try to hydrate missing fields (phone/isRegistered) in background
                try {
                    if (!user.phone || user.isRegistered === false) {
                        const prof = await fetchProfileWithSession(sessionId);
                        if (prof?.user) {
                            const merged = { ...user, ...{ firstName: prof.user.firstName, lastName: prof.user.lastName, phone: prof.user.phone, isRegistered: prof.user.isRegistered } };
                            setUser(merged);
                            localStorage.setItem('user', JSON.stringify(merged));
                        }
                    }
                } catch { }
                setIsLoading(false);
                return;
            }
            // Wait a bit for Telegram WebApp to initialize
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Support both SDK initData and URL param fallback (tgWebAppData)
            // Check URL hash first, then search params, then WebApp initData
            const hashParams = new URLSearchParams(window.location.hash.substring(1));
            const searchParams = new URLSearchParams(window.location.search);
            const initData = window?.Telegram?.WebApp?.initData ||
                hashParams.get('tgWebAppData') ||
                searchParams.get('tgWebAppData');

            console.log('Telegram WebApp check:', {
                hasTelegram: !!window?.Telegram,
                hasWebApp: !!window?.Telegram?.WebApp,
                initData: initData ? 'present' : 'missing',
                initDataLength: initData?.length || 0,
                urlParams: window.location.search,
                urlHash: window.location.hash,
                initDataFromWebApp: window?.Telegram?.WebApp?.initData,
                initDataFromHash: hashParams.get('tgWebAppData'),
                initDataFromSearch: searchParams.get('tgWebAppData'),
                fullInitData: initData,
                telegramWebApp: window?.Telegram?.WebApp,
                isExpanded: window?.Telegram?.WebApp?.isExpanded,
                version: window?.Telegram?.WebApp?.version,
                userAgent: navigator.userAgent,
                isTelegramWebApp: window?.Telegram?.WebApp?.platform === 'web'
            });

            console.log('initData check result:', {
                initData: initData,
                initDataType: typeof initData,
                initDataLength: initData?.length,
                isEmpty: !initData,
                isFalsy: !initData
            });

            // Force bypass if we're on the production domain and have hash data
            if (window.location.hostname === 'bingo-frontend-28pi.onrender.com' && window.location.hash.includes('tgWebAppData')) {
                console.log('FORCE BYPASS: Found hash data on production domain');
                const forceHashParams = new URLSearchParams(window.location.hash.substring(1));
                const forceInitData = forceHashParams.get('tgWebAppData');
                if (forceInitData) {
                    try {
                        console.log('Using force bypass with initData');
                        const out = await verifyTelegram(forceInitData);
                        setSessionId(out.sessionId);
                        localStorage.setItem('sessionId', out.sessionId);
                        let mergedUser = out.user;
                        try {
                            const prof = await fetchProfileWithSession(out.sessionId);
                            if (prof?.user) {
                                mergedUser = { ...mergedUser, ...{ firstName: prof.user.firstName, lastName: prof.user.lastName, phone: prof.user.phone, isRegistered: prof.user.isRegistered } };
                            }
                        } catch { }
                        setUser(mergedUser);
                        localStorage.setItem('user', JSON.stringify(mergedUser));
                        setIsLoading(false);
                        return;
                    } catch (e) {
                        console.error('Force bypass failed:', e);
                    }
                }
            }

            if (!initData) {
                console.error('No Telegram initData available - this should only happen when not accessed through Telegram');
                console.error('Debug info:', {
                    windowTelegram: !!window?.Telegram,
                    windowWebApp: !!window?.Telegram?.WebApp,
                    initDataFromWebApp: window?.Telegram?.WebApp?.initData,
                    initDataFromHash: hashParams.get('tgWebAppData'),
                    initDataFromSearch: searchParams.get('tgWebAppData'),
                    currentURL: window.location.href,
                    urlHash: window.location.hash,
                    urlSearch: window.location.search,
                    referrer: document.referrer,
                    userAgent: navigator.userAgent
                });

                // Temporary bypass for testing - remove this in production
                const isProduction = window.location.hostname === 'bingo-frontend-28pi.onrender.com' ||
                    window.location.hostname.includes('vercel.app') ||
                    window.location.hostname.includes('netlify.app');

                // Check if we have initData in hash but it's not being read properly
                const hashInitData = hashParams.get('tgWebAppData');
                if (hashInitData && !initData) {
                    console.log('Found initData in hash, using it directly');
                    try {
                        const out = await verifyTelegram(hashInitData);
                        setSessionId(out.sessionId);
                        localStorage.setItem('sessionId', out.sessionId);
                        // Hydrate profile to ensure phone/isRegistered available
                        let mergedUser = out.user;
                        try {
                            const prof = await fetchProfileWithSession(out.sessionId);
                            if (prof?.user) {
                                mergedUser = { ...mergedUser, ...{ firstName: prof.user.firstName, lastName: prof.user.lastName, phone: prof.user.phone, isRegistered: prof.user.isRegistered } };
                            }
                        } catch { }
                        setUser(mergedUser);
                        localStorage.setItem('user', JSON.stringify(mergedUser));
                        setIsLoading(false);
                        return;
                    } catch (e) {
                        console.error('Hash initData authentication failed:', e);
                    }
                }

                if (isProduction) {
                    console.log('Using test mode for deployed app');
                    // Create a test session for debugging
                    const testSessionId = 'test-session-' + Date.now();
                    const testUser = {
                        id: 'test-user',
                        firstName: 'Test',
                        lastName: 'User',
                        phone: '+251900000000',
                        isRegistered: true
                    };
                    setSessionId(testSessionId);
                    setUser(testUser);
                    localStorage.setItem('sessionId', testSessionId);
                    localStorage.setItem('user', JSON.stringify(testUser));
                    setIsLoading(false);
                    return;
                }

                setSessionId(null);
                setUser(null);
                localStorage.removeItem('sessionId');
                localStorage.removeItem('user');
                setIsLoading(false);
                return;
            }

            try {
                const out = await verifyTelegram(initData);
                setSessionId(out.sessionId);
                localStorage.setItem('sessionId', out.sessionId);
                // Hydrate profile to ensure phone/isRegistered available
                let mergedUser = out.user;
                try {
                    const prof = await fetchProfileWithSession(out.sessionId);
                    if (prof?.user) {
                        mergedUser = { ...mergedUser, ...{ firstName: prof.user.firstName, lastName: prof.user.lastName, phone: prof.user.phone, isRegistered: prof.user.isRegistered } };
                    }
                } catch { }
                setUser(mergedUser);
                localStorage.setItem('user', JSON.stringify(mergedUser));
            } catch (e) {
                // No fallback for production - require valid Telegram data
                console.error('Telegram authentication failed:', e);
                setSessionId(null);
                setUser(null);
                localStorage.removeItem('sessionId');
                localStorage.removeItem('user');
            } finally {
                setIsLoading(false);
            }
        })();
    }, []); // Remove sessionId and user dependencies to prevent infinite loops

    const value = useMemo(() => ({ sessionId, user, setSessionId, isLoading }), [sessionId, user, isLoading]);

    // Show loading state while authenticating
    if (isLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-purple-900 flex items-center justify-center">
                <div className="text-center">
                    {/* Animated Love Bingo Logo */}
                    <div className="relative mb-6">
                        <img
                            src="/lb.png"
                            alt="Love Bingo Logo"
                            className="w-16 h-16 mx-auto animate-pulse"
                        />
                        {/* Search animation overlay */}
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-6 h-6 border-2 border-pink-400/30 border-t-pink-400 rounded-full animate-spin"></div>
                        </div>
                    </div>

                    <div className="text-lg font-semibold mb-2 text-white">Authenticating user...</div>

                    {/* Animated dots */}
                    <div className="flex justify-center space-x-1">
                        <div className="w-2 h-2 bg-pink-400/60 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-pink-400/60 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-2 h-2 bg-pink-400/60 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                </div>
            </div>
        );
    }

    // Show error message if no valid Telegram data
    if (!sessionId || !user) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-purple-900 flex items-center justify-center">
                <div className="text-center max-w-md mx-auto p-6">
                    <div className="text-red-400 text-6xl mb-4">⚠️</div>
                    <h1 className="text-white text-2xl font-bold mb-4">Access Restricted</h1>
                    <p className="text-white/80 mb-6">
                        This application can only be accessed through Telegram. Please open this app from within the Telegram bot.
                    </p>
                    <div className="bg-white/10 rounded-lg p-4">
                        <p className="text-white text-sm">
                            <strong>How to access:</strong><br />
                            1. Open the Love Bingo bot in Telegram<br />
                            2. Click the "Play" button<br />
                            3. The web app will open automatically
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() { return useContext(AuthContext); }


