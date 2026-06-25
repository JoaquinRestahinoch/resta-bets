const SPORT_ICONS = { soccer: '⚽', basketball: '🏀', tennis: '🎾', baseball: '⚾' };
const SPORT_LABELS = { soccer: 'FUTBOL', basketball: 'BASKETBALL', tennis: 'TENIS', baseball: 'BASEBALL' };

const PROFITABILITY_COLORS = {
  HIGH: 'text-emerald-400',
  MEDIUM: 'text-amber-400',
  LOW: 'text-blue-400',
};

export default function SportGroupView({ opportunities, onSelect }) {
  const grouped = {};
  for (const opp of opportunities) {
    const sport = opp.sport;
    if (!grouped[sport]) grouped[sport] = {};
    const league = opp.league;
    if (!grouped[sport][league]) grouped[sport][league] = [];
    grouped[sport][league].push(opp);
  }

  if (!Object.keys(grouped).length) {
    return (
      <div className="bg-slate-900/40 rounded-xl border border-slate-800/70 p-10 text-center">
        <div className="grid place-items-center w-14 h-14 rounded-xl bg-slate-800/60 mx-auto mb-4 border border-slate-700/40">
          <span className="text-2xl">🎯</span>
        </div>
        <p className="text-slate-300 text-sm font-medium">No hay oportunidades para mostrar en vista agrupada</p>
        <p className="text-slate-600 text-xs mt-1.5">Las oportunidades apareceran aqui cuando se detecten.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {Object.entries(grouped).map(([sport, leagues]) => (
        <div key={sport} className="bg-slate-900/40 rounded-xl border border-slate-800/70 overflow-hidden">
          <div className="px-4 py-3 bg-gradient-to-r from-slate-800/30 to-transparent border-b border-slate-800/70">
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2.5">
              <span className="text-base">{SPORT_ICONS[sport] || '🎯'}</span>
              {SPORT_LABELS[sport] || sport.toUpperCase()}
              <span className="text-[10px] font-data font-semibold text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full border border-slate-700/50">
                {Object.values(leagues).flat().length} ops
              </span>
            </h3>
          </div>
          <div className="divide-y divide-slate-800/40">
            {Object.entries(leagues).map(([league, opps]) => (
              <div key={league} className="px-4 py-3.5">
                <div className="text-xs text-slate-500 font-semibold mb-2.5 uppercase tracking-wider">{league}</div>
                <div className="space-y-1">
                  {opps.map((opp) => (
                    <div
                      key={opp.opportunityId}
                      onClick={() => onSelect(opp)}
                      className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-slate-800/50 cursor-pointer transition-all group"
                    >
                      <span className="text-sm text-slate-200 group-hover:text-white transition-colors">{opp.matchName}</span>
                      <div className="flex items-center gap-4">
                        <span className={`text-xs font-data font-bold ${PROFITABILITY_COLORS[opp.profitability]}`}>
                          ROI {opp.roi.toFixed(2)}%
                        </span>
                        <span className="text-xs font-data text-emerald-400 font-bold">
                          ${opp.profit.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
