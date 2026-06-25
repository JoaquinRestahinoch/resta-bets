import { Wifi, WifiOff, Search } from 'lucide-react';
import logoImg from '../assets/logo.png';

export default function Header({ connected, lastUpdate, searchQuery, onSearchChange }) {
  const timeSince = lastUpdate
    ? Math.round((Date.now() - new Date(lastUpdate).getTime()) / 1000)
    : null;

  return (
    <header className="sticky top-0 z-40">
      <div className="h-0.5 w-full accent-line" />

      <div className="bg-slate-950/80 backdrop-blur-xl border-b border-slate-800/80">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-2.5">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            {/* Brand */}
            <div className="flex items-center gap-3">
              <img
                src={logoImg}
                alt="RESTA BETS"
                className="w-11 h-11 rounded-full object-cover border-2 border-emerald-500/40 shadow-lg shadow-emerald-500/10"
              />
              <div className="leading-tight">
                <h1 className="text-base sm:text-lg font-black text-slate-50 tracking-tight">
                  RESTA <span className="text-emerald-400">BETS</span>
                </h1>
                <p className="text-[10px] text-slate-500 font-medium tracking-wide">ARBITRAJE EN TIEMPO REAL</p>
              </div>
            </div>

            {/* Search */}
            <div className="flex items-center gap-3 flex-1 min-w-[180px] max-w-md order-3 sm:order-2">
              <div className="relative flex-1">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  placeholder="Buscar evento, liga o casa..."
                  value={searchQuery}
                  onChange={(e) => onSearchChange(e.target.value)}
                  className="w-full bg-slate-900/70 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500/60 focus:ring-2 focus:ring-emerald-500/10 transition"
                />
              </div>
            </div>

            {/* Status */}
            <div className="flex items-center gap-3 text-xs order-2 sm:order-3">
              {timeSince !== null && (
                <span className="hidden sm:inline text-slate-500 font-data">
                  hace {timeSince}s
                </span>
              )}
              <div
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg border font-bold tracking-wide text-[11px] transition-all ${
                  connected
                    ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/40 shadow-sm shadow-emerald-500/10'
                    : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                }`}
              >
                {connected ? (
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 animate-live-ping" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400" />
                  </span>
                ) : (
                  <WifiOff size={13} />
                )}
                {connected ? 'EN VIVO' : 'OFFLINE'}
                {connected && <Wifi size={13} className="hidden sm:inline opacity-70" />}
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
