import { TrendingUp, ChevronRight } from 'lucide-react';

const SPORT_ICONS = { soccer: '⚽', basketball: '🏀', tennis: '🎾', baseball: '⚾' };

const PROFITABILITY_BADGE = {
  HIGH: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  MEDIUM: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  LOW: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
};

export default function OpportunitiesTable({ opportunities, onSelect }) {
  if (!opportunities.length) {
    return (
      <div className="bg-slate-900/40 rounded-xl border border-slate-800/70 p-12 text-center">
        <div className="grid place-items-center w-14 h-14 rounded-xl bg-slate-800/60 mx-auto mb-4 border border-slate-700/40">
          <TrendingUp size={24} className="text-slate-600" />
        </div>
        <p className="text-slate-300 text-sm font-medium">No se encontraron oportunidades de arbitraje</p>
        <p className="text-slate-600 text-xs mt-1.5">Las cuotas se actualizan cada 10 segundos. Las oportunidades apareceran aqui automaticamente.</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-900/40 rounded-xl border border-slate-800/70 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[10px] text-slate-500 uppercase tracking-wider border-b border-slate-800/70 bg-gradient-to-r from-slate-800/30 to-transparent">
              <th className="text-left py-3 px-4 font-semibold w-8"></th>
              <th className="text-left py-3 px-2 font-semibold">Evento</th>
              <th className="text-left py-3 px-2 font-semibold hidden md:table-cell">Liga</th>
              <th className="text-center py-3 px-2 font-semibold">Casas</th>
              <th className="text-center py-3 px-2 font-semibold">Mejor Cuota</th>
              <th className="text-center py-3 px-2 font-semibold">P.I.</th>
              <th className="text-center py-3 px-2 font-semibold">ROI</th>
              <th className="text-right py-3 px-4 font-semibold">Profit</th>
              <th className="w-8 py-3 px-2"></th>
            </tr>
          </thead>
          <tbody>
            {opportunities.map((opp) => (
              <tr
                key={opp.opportunityId}
                onClick={() => onSelect(opp)}
                className={`border-b border-slate-800/40 last:border-0 cursor-pointer transition-all hover:bg-slate-800/40 group ${
                  opp.roi > 3 ? 'bg-emerald-500/[0.04]' : ''
                }`}
              >
                <td className="py-3.5 px-4 text-base">{SPORT_ICONS[opp.sport] || '🎯'}</td>
                <td className="py-3.5 px-2">
                  <div className="font-medium text-slate-100 text-xs md:text-sm group-hover:text-white transition-colors">{opp.matchName}</div>
                  <div className="text-[10px] text-slate-600 md:hidden">{opp.league}</div>
                  {opp.scheduledTime && (
                    <div className="text-[10px] text-slate-600 mt-0.5 font-data">
                      {new Date(opp.scheduledTime).toLocaleDateString('es', { weekday: 'short', day: 'numeric', month: 'short' })}
                      {' '}
                      {new Date(opp.scheduledTime).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  )}
                </td>
                <td className="py-3.5 px-2 text-xs text-slate-400 hidden md:table-cell">{opp.league}</td>
                <td className="py-3.5 px-2 text-center">
                  <div className="flex flex-col items-center gap-0.5">
                    {opp.bestOdds.map((bo, i) => (
                      <span key={i} className="text-[10px] text-slate-400 whitespace-nowrap">{bo.bookmaker}</span>
                    ))}
                  </div>
                </td>
                <td className="py-3.5 px-2 text-center">
                  <div className="flex flex-col items-center gap-0.5">
                    {opp.bestOdds.map((bo, i) => (
                      <span key={i} className="text-xs text-slate-300 font-data font-semibold">{bo.odd.toFixed(2)}</span>
                    ))}
                  </div>
                </td>
                <td className="py-3.5 px-2 text-center font-data text-xs text-slate-400">
                  {(opp.impliedProbability * 100).toFixed(1)}%
                </td>
                <td className="py-3.5 px-2 text-center">
                  <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold font-data border ${
                    PROFITABILITY_BADGE[opp.profitability] || PROFITABILITY_BADGE.LOW
                  }`}>
                    +{opp.roi.toFixed(2)}%
                  </span>
                </td>
                <td className="py-3.5 px-4 text-right font-data text-sm font-bold text-emerald-400">
                  ${opp.profit.toFixed(2)}
                </td>
                <td className="py-3.5 px-2">
                  <ChevronRight size={14} className="text-slate-600 group-hover:text-slate-400 transition-colors" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
