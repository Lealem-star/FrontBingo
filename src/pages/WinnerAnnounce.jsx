import React from 'react';

export default function WinnerAnnounce({
    open,
    onClose,
    winners = [], // [{name, cardId, cardNumbers, called, prize}]
}) {
    if (!open) return null;

    const isMulti = winners.length > 1;
    const main = winners[0] || {};

    // Find a winning pattern indices for display (rows, cols, diagonals)
    const findWinningPattern = (grid = [[]], called = []) => {
        if (!Array.isArray(grid) || grid.length !== 5) return null;
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
        for (const p of patterns) {
            const nums = p.map(idx => grid[Math.floor(idx / 5)]?.[idx % 5]).filter(n => n !== 0);
            if (nums.length === 5 && nums.every(n => called.includes(n))) return p;
        }
        return null;
    };

    const pattern = findWinningPattern(main.cardNumbers, main.called);

    return (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/60 p-3">
            <div className="w-full max-w-sm rounded-2xl bg-slate-900/80 backdrop-blur-md border border-white/10 shadow-2xl p-4 text-white relative">
                <button onClick={onClose} className="absolute right-3 top-3 text-white/70">✕</button>

                <div className="flex flex-col items-center gap-2 mb-3">
                    <div className="w-10 h-10 rounded-full bg-yellow-400/90 flex items-center justify-center shadow">
                        <span className="text-slate-900">👑</span>
                    </div>
                    <div className="text-yellow-300 font-extrabold text-xl tracking-wide">BINGO!</div>
                    {isMulti ? (
                        <>
                            <div className="text-sm text-white/90">🎉 {winners.length} players won!</div>
                            {typeof main.prize === 'number' && (
                                <div className="text-xs text-amber-300">Each wins: <span className="font-bold">{main.prize}</span></div>
                            )}
                        </>
                    ) : (
                        <div className="text-sm text-white/90">🎉 {main.name || 'Winner'} WON! 🎉</div>
                    )}
                </div>

                {isMulti && (
                    <div className="flex flex-wrap gap-2 justify-center mb-3">
                        {winners.map((w, i) => (
                            <div key={i} className="px-2 py-1 rounded-full bg-white/10 border border-white/15 text-xs">
                                <span className="font-semibold mr-1">{w.name || `Player ${i + 1}`}</span>
                                <span className="opacity-80">#{w.cardId}</span>
                            </div>
                        ))}
                    </div>
                )}

                <div className="rounded-xl bg-white/5 border border-white/10 p-3">
                    <div className="text-xs mb-2 flex items-center gap-1">
                        <span>🏆</span>
                        <span>Winning Cartela : </span>
                        <span className="font-bold">{main.cardId ?? '-'}</span>
                    </div>

                    {typeof main.prize === 'number' && (
                        <div className="text-xs mb-2 flex items-center gap-1 text-amber-300">
                            <span>💰</span>
                            <span>Prize per winner:</span>
                            <span className="font-bold">{main.prize}</span>
                        </div>
                    )}

                    <div className="grid grid-cols-5 gap-0.5 mb-2">
                        {['B', 'I', 'N', 'G', 'O'].map((h) => (
                            <div key={h} className={`text-center text-[11px] font-bold rounded-md py-1 ${h === 'B' ? 'bg-blue-500' : h === 'I' ? 'bg-purple-500' : h === 'N' ? 'bg-green-500' : h === 'G' ? 'bg-pink-500' : 'bg-orange-500'
                                }`}>{h}</div>
                        ))}
                        {(main.cardNumbers || Array.from({ length: 25 }, (_, i) => i === 12 ? 0 : i + 1)).map((n, idx) => {
                            const row = Math.floor(idx / 5);
                            const col = idx % 5;
                            const isCenter = row === 2 && col === 2;
                            const isHit = (main.called || []).includes(n);
                            const isWinningCell = Array.isArray(pattern) && pattern.includes(idx);
                            if (isCenter) {
                                return <div key={idx} className={`bg-green-500 rounded-md text-center py-1 text-yellow-300 ${isWinningCell ? 'ring-2 ring-yellow-400' : ''}`}>★</div>;
                            }
                            return (
                                <div key={idx} className={`text-center text-[11px] leading-none py-1 rounded-md border ${isHit ? 'bg-orange-500/90 border-orange-400 text-white' : 'bg-white text-slate-900 border-white/60'} ${isWinningCell ? 'ring-2 ring-yellow-400' : ''}`}>{n}</div>
                            );
                        })}
                    </div>

                    <div className="w-full h-8 rounded-md bg-amber-700/70 text-amber-200 text-xs flex items-center justify-center">Joining...</div>
                    <div className="w-full h-8 rounded-md bg-slate-800/80 text-slate-200 text-xs flex items-center justify-center mt-2">Auto-starting next game in 0s</div>
                </div>
            </div>
        </div>
    );
}


