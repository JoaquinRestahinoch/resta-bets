import { useState } from 'react';
import { Trophy, TrendingUp, TrendingDown, Minus, RefreshCw, ChevronDown, ChevronUp, Zap, Target } from 'lucide-react';

const OUTCOME_LABELS = {
  home: 'Local', away: 'Visitante', draw: 'Empate',
  over: 'Over', under: 'Under', yes: 'Si', no: 'No',
  '1X': '1X', '12': '12', 'X2': 'X2',
};

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' });
}
function formatTime(iso) {
  return new Date(iso).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });
}

function RoiBadge({ roi }) {
  if (roi === null || roi === undefined) return <span className="text-[10px] text-slate-600">-</span>;
  const cls = roi > 0
    ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
    : roi > -2
    ? 'bg-amber-500/10 text-amber-400 border-amber-500/25'
    : 'bg-rose-500/10 text-rose-400/80 border-rose-500/20';
  const Icon = roi > 0 ? TrendingUp : roi > -2 ? Minus : TrendingDown;
  return (
    <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] font-semibold font-data border ${cls}`}>
      <Icon size={10} />{roi > 0 ? '+' : ''}{roi.toFixed(2)}%
    </span>
  );
}

function MarketRow({ market }) {
  const [open, setOpen] = useState(false);
  const isArb = market.isArbitrage;
  return (
    <div className={`transition-colors ${isArb ? '' : 'border-b border-slate-800/30 last:border-0'}`}>
      {/* Arbitrage markets get a visual wrapper */}
      <div className={isArb ? 'mx-2 my-1.5 rounded-lg border border-emerald-500/25 bg-emerald-500/[0.06] overflow-hidden' : ''}>
        <div
          onClick={() => setOpen(!open)}
          className={`flex items-center gap-2.5 px-3.5 py-3 cursor-pointer transition-colors ${
            isArb
              ? 'hover:bg-emerald-500/[0.06]'
              : 'hover:bg-slate-800/40'
          }`}
        >
          {isArb && (
            <div className="grid place-items-center w-5 h-5 rounded bg-emerald-500/20 shrink-0">
              <Zap size={11} className="text-emerald-400" />
            </div>
          )}
          <span className={`text-xs flex-1 ${isArb ? 'text-emerald-200 font-medium' : 'text-slate-300'}`}>{market.label}</span>
          <RoiBadge roi={market.roi} />
          {isArb && <span className="text-[10px] font-data text-emerald-400 font-bold">+${market.profit.toFixed(2)}</span>}
          <span className="text-[10px] text-slate-600 font-data hidden sm:inline">{market.bookmakerCount} casas</span>
          {open ? <ChevronUp size={12} className="text-slate-500" /> : <ChevronDown size={12} className="text-slate-500" />}
        </div>
        {open && (
          <div className="px-3.5 pb-3.5 space-y-3 animate-fade-in-fast">
            {/* Best odds chips */}
            <div className="flex flex-wrap gap-2">
              {market.bestOdds.map((bo) => (
                <div key={bo.outcome} className="bg-slate-800/60 border border-slate-700/50 rounded-lg px-2.5 py-1.5 text-[10px]">
                  <span className="text-slate-500 uppercase tracking-wider text-[9px]">{OUTCOME_LABELS[bo.outcome] || bo.outcome}</span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-blue-300 font-medium">{bo.bookmaker}</span>
                    <span className="text-slate-300 font-data font-semibold">@ {bo.odd.toFixed(2)}</span>
                  </div>
                </div>
              ))}
            </div>
            {/* Arbitrage stake calculator */}
            {isArb && market.stakes && (
              <div className="bg-emerald-500/10 border border-emerald-500/25 rounded-xl p-3">
                <div className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Target size={11} /> Apostar (base $100)
                </div>
                <div className="grid sm:grid-cols-3 gap-2">
                  {Object.entries(market.stakes).map(([o, s]) => {
                    const bo = market.bestOdds.find((b) => b.outcome === o);
                    return (
                      <div key={o} className="bg-slate-950/40 rounded-lg px-2.5 py-2 text-[10px]">
                        <div className="text-slate-500 text-[9px] uppercase tracking-wider">{OUTCOME_LABELS[o] || o}</div>
                        <div className="flex items-baseline justify-between mt-1">
                          <span className="text-slate-100 font-data font-bold text-xs">${s.toFixed(2)}</span>
                          <span className="text-slate-600 text-[9px]">{bo?.bookmaker}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-emerald-500/20">
                  <span className="text-[10px] text-emerald-300 font-medium">Ganancia garantizada</span>
                  <span className="text-sm font-bold font-data text-emerald-400">+${market.profit.toFixed(2)}</span>
                </div>
              </div>
            )}
            {/* All odds table */}
            {market.allOdds && (
              <div className="overflow-x-auto rounded-lg border border-slate-800/60">
                <table className="w-full text-[10px]">
                  <thead>
                    <tr className="text-slate-500 bg-slate-800/40">
                      <th className="text-left py-2 px-2.5 font-semibold">Casa</th>
                      {market.bestOdds.map((bo) => (
                        <th key={bo.outcome} className="text-center py-2 px-1.5 font-semibold">
                          {OUTCOME_LABELS[bo.outcome] || bo.outcome}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(market.allOdds).map(([bm, odds]) => (
                      <tr key={bm} className="border-t border-slate-800/40 hover:bg-slate-800/30 transition-colors">
                        <td className="py-1.5 px-2.5 text-slate-400">{bm}</td>
                        {market.bestOdds.map((bo) => {
                          const val = odds[bo.outcome];
                          const isBest = bo.bookmaker === bm;
                          return (
                            <td key={bo.outcome} className={`text-center py-1.5 px-1.5 font-data ${isBest ? 'text-emerald-400 font-bold' : 'text-slate-500'}`}>
                              {val?.toFixed(2) || '-'}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function MatchCard({ match }) {
  const [expanded, setExpanded] = useState(false);
  const isPast = new Date(match.scheduledTime) < new Date();
  const arbCount = match.arbMarketsCount || 0;

  return (
    <div className={`border-b border-slate-800/50 last:border-0 transition-colors ${arbCount > 0 ? 'bg-emerald-500/[0.03]' : ''} ${isPast ? 'opacity-40' : ''}`}>
      <div
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-3 px-4 py-3.5 cursor-pointer hover:bg-slate-800/40 transition-all group"
      >
        <div className="text-xs text-slate-500 font-data w-12 shrink-0 tabular-nums">{formatTime(match.scheduledTime)}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-slate-100 truncate group-hover:text-white transition-colors">{match.home} vs {match.away}</span>
            {isPast && <span className="text-[9px] text-slate-500 bg-slate-800 px-1.5 py-0.5 rounded">JUGADO</span>}
            {arbCount > 0 && (
              <span className="text-[9px] text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold flex items-center gap-1 animate-soft-pulse">
                <Zap size={9} />{arbCount} arb
              </span>
            )}
          </div>
          {match.location && <div className="text-[10px] text-slate-600 mt-0.5 truncate">{match.location}</div>}
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="text-right">
            <RoiBadge roi={match.roi} />
            <div className="text-[10px] text-slate-600 font-data mt-0.5">{match.marketCount} mercados</div>
          </div>
          <div className={`grid place-items-center w-6 h-6 rounded-md transition-colors ${expanded ? 'bg-slate-700/60' : 'bg-slate-800/40 group-hover:bg-slate-700/40'}`}>
            {expanded ? <ChevronUp size={13} className="text-slate-400" /> : <ChevronDown size={13} className="text-slate-500" />}
          </div>
        </div>
      </div>

      {expanded && match.markets && (
        <div className="mx-3 mb-3 bg-slate-950/50 rounded-xl border border-slate-800/70 overflow-hidden animate-fade-in-fast">
          <div className="px-4 py-2.5 bg-gradient-to-r from-slate-800/40 to-transparent border-b border-slate-800/60 flex items-center justify-between">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">
              Todos los mercados ({match.markets.length})
            </span>
            {arbCount > 0 && (
              <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                <Zap size={9} />{arbCount} con arbitraje
              </span>
            )}
          </div>
          <div className="divide-y divide-slate-800/30">
            {/* Sort: arb markets first */}
            {[...match.markets].sort((a, b) => (b.isArbitrage ? 1 : 0) - (a.isArbitrage ? 1 : 0)).map((mkt) => (
              <MarketRow key={mkt.key} market={mkt} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function WorldCupView({ matches = [], loading, lastUpdate, onRefresh }) {
  const grouped = {};
  for (const m of matches) {
    const day = formatDate(m.scheduledTime);
    if (!grouped[day]) grouped[day] = [];
    grouped[day].push(m);
  }

  const totalArb = matches.reduce((s, m) => s + (m.arbMarketsCount || 0), 0);
  const totalMarkets = matches.reduce((s, m) => s + (m.marketCount || 0), 0);
  const matchesWithArb = matches.filter((m) => m.arbMarketsCount > 0).length;

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="grid place-items-center w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30">
            <Trophy size={18} className="text-amber-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-50 tracking-tight">Mundial FIFA 2026</h2>
            <span className="text-[10px] text-slate-500 font-data">{matches.length} partidos monitoreados</span>
          </div>
        </div>
        <button
          onClick={onRefresh}
          className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 cursor-pointer px-3 py-1.5 rounded-lg hover:bg-slate-800/40 transition-colors"
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          {lastUpdate && <span className="font-data">{Math.round((Date.now() - lastUpdate.getTime()) / 1000)}s</span>}
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-4 text-center hover:border-slate-700 hover:scale-[1.02] transition-all">
          <div className="text-2xl font-bold font-data text-slate-100">{matches.length}</div>
          <div className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mt-1">Partidos</div>
        </div>
        <div className="bg-blue-500/[0.04] border border-slate-800/80 rounded-xl p-4 text-center hover:border-blue-500/30 hover:scale-[1.02] transition-all">
          <div className="text-2xl font-bold font-data text-blue-400">{totalMarkets}</div>
          <div className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mt-1">Mercados</div>
        </div>
        <div className="bg-emerald-500/10 border border-emerald-500/25 rounded-xl p-4 text-center hover:border-emerald-500/40 hover:scale-[1.02] transition-all">
          <div className="text-2xl font-bold font-data text-emerald-400">{totalArb}</div>
          <div className="text-[10px] text-emerald-400/70 uppercase tracking-wider font-semibold mt-1">Arbitrajes</div>
        </div>
        <div className="bg-amber-500/[0.04] border border-slate-800/80 rounded-xl p-4 text-center hover:border-amber-500/30 hover:scale-[1.02] transition-all">
          <div className="text-2xl font-bold font-data text-amber-400">{matchesWithArb}</div>
          <div className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mt-1">Partidos c/arb</div>
        </div>
      </div>

      {loading && matches.length === 0 && (
        <div className="bg-slate-900/40 rounded-xl border border-slate-800/70 p-12 text-center text-slate-500 text-sm">
          Cargando partidos…
        </div>
      )}

      {/* Matches by day */}
      {Object.entries(grouped).map(([day, dayMatches]) => {
        const isToday = day === formatDate(new Date().toISOString());
        const dayArbs = dayMatches.reduce((s, m) => s + (m.arbMarketsCount || 0), 0);
        return (
          <div key={day} className="bg-slate-900/40 rounded-2xl border border-slate-800/70 overflow-hidden">
            <div className={`px-4 py-3 border-b border-slate-800/70 flex items-center justify-between ${isToday ? 'bg-gradient-to-r from-blue-500/10 to-transparent' : 'bg-gradient-to-r from-slate-800/30 to-transparent'}`}>
              <div className="flex items-center gap-2.5">
                <span className="text-sm font-bold text-slate-100 capitalize">{day}</span>
                {isToday && (
                  <span className="text-[10px] bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full font-bold border border-blue-500/25 flex items-center gap-1">
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="absolute inline-flex h-full w-full rounded-full bg-blue-400 animate-live-ping" />
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-blue-400" />
                    </span>
                    HOY
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3">
                {dayArbs > 0 && (
                  <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                    <Zap size={9} />{dayArbs} arb
                  </span>
                )}
                <span className="text-[10px] text-slate-500 font-data">{dayMatches.length} partidos</span>
              </div>
            </div>
            {dayMatches.map((m) => <MatchCard key={m.eventId} match={m} />)}
          </div>
        );
      })}

      <div className="bg-slate-900/30 rounded-xl border border-slate-800/50 px-4 py-3 text-[10px] text-slate-600 text-center space-y-1">
        <p>Click en cualquier partido para ver TODOS los mercados: 1X2, Over/Under, Handicap, BTTS, Doble Oportunidad</p>
        <p className="flex items-center justify-center gap-3 flex-wrap">
          <span><span className="inline-block w-2 h-2 rounded-full bg-emerald-400 mr-1 align-middle" /><span className="text-emerald-400">+ROI%</span> = Arbitraje real</span>
          <span><span className="inline-block w-2 h-2 rounded-full bg-amber-400 mr-1 align-middle" /><span className="text-amber-400">-0 a -2%</span> = Marginal</span>
          <span><span className="inline-block w-2 h-2 rounded-full bg-rose-400 mr-1 align-middle" /><span className="text-rose-400">{'<'}-2%</span> = No apostar</span>
        </p>
      </div>
    </div>
  );
}
