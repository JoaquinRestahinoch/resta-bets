import { useState } from 'react';
import { X, CheckCircle, DollarSign, Copy, Check, TrendingUp } from 'lucide-react';

const OUTCOME_LABELS = { home: 'Local (1)', draw: 'Empate (X)', away: 'Visitante (2)' };
const SPORT_ICONS = { soccer: '⚽', basketball: '🏀', tennis: '🎾', baseball: '⚾' };

export default function OpportunityModal({ opportunity: opp, onClose }) {
  const [investment, setInvestment] = useState(100);
  const [copied, setCopied] = useState(false);

  if (!opp) return null;

  const pi = opp.impliedProbability;
  const outcomes = opp.bestOdds.map(o => o.outcome);

  const customStakes = {};
  let stakeSum = 0;
  for (const bo of opp.bestOdds) {
    customStakes[bo.outcome] = Math.round((investment * (1 / bo.odd)) / pi * 100) / 100;
    stakeSum += customStakes[bo.outcome];
  }
  const diff = Math.round((investment - stakeSum) * 100) / 100;
  if (Math.abs(diff) > 0.001) customStakes[outcomes[0]] = Math.round((customStakes[outcomes[0]] + diff) * 100) / 100;

  const customWinnings = {};
  for (const bo of opp.bestOdds) {
    customWinnings[bo.outcome] = Math.round(customStakes[bo.outcome] * bo.odd * 100) / 100;
  }
  const customProfit = Math.round((customWinnings[outcomes[0]] - investment) * 100) / 100;

  const handleCopy = () => {
    const text = opp.bestOdds.map(bo =>
      `${OUTCOME_LABELS[bo.outcome]}: ${bo.bookmaker} @ ${bo.odd.toFixed(2)} → Apostar $${customStakes[bo.outcome].toFixed(2)}`
    ).join('\n') + `\n\nInversion: $${investment}\nGanancia: $${customProfit.toFixed(2)} (ROI: ${opp.roi.toFixed(2)}%)`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fade-in-fast" onClick={onClose}>
      <div
        className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl shadow-black/50 w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-slate-800 sticky top-0 bg-slate-900/95 backdrop-blur-sm z-10">
          <div>
            <div className="flex items-center gap-2.5 mb-1.5">
              <span className="text-xl">{SPORT_ICONS[opp.sport] || '🎯'}</span>
              <h2 className="text-lg font-bold text-slate-50">{opp.matchName}</h2>
            </div>
            <p className="text-xs text-slate-400">
              {opp.league} &bull; {new Date(opp.scheduledTime).toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' })}
              {' '}{new Date(opp.scheduledTime).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })} hs
              {opp.location && <> &bull; {opp.location}</>}
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200 cursor-pointer p-1.5 rounded-lg hover:bg-slate-800/60 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* ROI Banner */}
        <div className="mx-5 mt-4 p-4 rounded-xl bg-gradient-to-b from-emerald-500/15 to-emerald-500/5 border border-emerald-500/30 animate-arb-glow">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle size={18} className="text-emerald-400" />
            <span className="text-sm font-bold text-emerald-400 tracking-wide">ARBITRAJE ENCONTRADO</span>
            <span className="relative flex h-2 w-2 ml-1">
              <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 animate-live-ping" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
            </span>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center bg-slate-950/30 rounded-lg py-2.5 px-2">
              <div className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">P. Implicita</div>
              <div className="text-lg font-bold font-data text-blue-400 mt-0.5">{(pi * 100).toFixed(2)}%</div>
            </div>
            <div className="text-center bg-slate-950/30 rounded-lg py-2.5 px-2">
              <div className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">ROI</div>
              <div className="text-lg font-bold font-data text-emerald-400 mt-0.5">+{opp.roi.toFixed(2)}%</div>
            </div>
            <div className="text-center bg-slate-950/30 rounded-lg py-2.5 px-2">
              <div className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Ganancia</div>
              <div className="text-lg font-bold font-data text-emerald-400 mt-0.5">${customProfit.toFixed(2)}</div>
            </div>
          </div>
        </div>

        {/* Investment input */}
        <div className="mx-5 mt-4">
          <label className="text-xs text-slate-400 uppercase tracking-wider font-medium">Inversion Total ($)</label>
          <input
            type="number"
            value={investment}
            onChange={(e) => setInvestment(Math.max(1, parseFloat(e.target.value) || 0))}
            min="1"
            max="100000"
            className="w-full mt-1 bg-slate-950/60 border border-slate-800 rounded-lg px-3 py-2 text-sm font-data text-slate-200 focus:outline-none focus:border-emerald-500/60"
          />
        </div>

        {/* Best Combination */}
        <div className="mx-5 mt-4">
          <h3 className="text-xs text-slate-400 uppercase tracking-wider font-medium mb-3">Mejor Combinacion</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {opp.bestOdds.map((bo) => (
              <div key={bo.outcome} className="bg-slate-950/50 rounded-xl p-3.5 border border-slate-800 hover:border-slate-700 transition-colors">
                <div className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mb-1.5">
                  {OUTCOME_LABELS[bo.outcome]}
                </div>
                <div className="text-sm font-medium text-blue-300 mb-2.5">
                  {bo.bookmaker} <span className="font-data text-slate-400">@ {bo.odd.toFixed(2)}</span>
                </div>
                <div className="space-y-1.5 pt-2 border-t border-slate-800/60">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">Apostar:</span>
                    <span className="font-data font-bold text-slate-100">${customStakes[bo.outcome].toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">Si gana:</span>
                    <span className="font-data font-bold text-emerald-400">${customWinnings[bo.outcome].toFixed(2)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* All bookmaker odds */}
        {opp.allBookmakerOdds && (
          <div className="mx-5 mt-4">
            <h3 className="text-xs text-slate-400 uppercase tracking-wider font-medium mb-3">Todas las Cuotas</h3>
            <div className="overflow-x-auto rounded-lg border border-slate-800/60">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-slate-500 border-b border-slate-700/50 bg-slate-800/30">
                    <th className="text-left py-2 px-2.5 font-semibold">Casa</th>
                    {outcomes.map(o => (
                      <th key={o} className="text-center py-2 px-2 font-semibold">{OUTCOME_LABELS[o]}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(opp.allBookmakerOdds).map(([bm, odds]) => (
                    <tr key={bm} className="border-b border-slate-700/30 hover:bg-slate-800/30 transition-colors">
                      <td className="py-2 px-2.5 text-slate-300">{bm}</td>
                      {outcomes.map(o => {
                        const isBest = opp.bestOdds.find(bo => bo.outcome === o && bo.bookmaker === bm);
                        return (
                          <td key={o} className={`text-center py-2 px-2 font-data ${isBest ? 'text-emerald-400 font-bold' : 'text-slate-400'}`}>
                            {odds[o]?.toFixed(2) || '-'}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Winnings scenarios */}
        <div className="mx-5 mt-4">
          <h3 className="text-xs text-slate-400 uppercase tracking-wider font-semibold mb-3">Resultados Posibles</h3>
          <div className="bg-slate-950/40 rounded-xl border border-slate-800/60 overflow-hidden">
            {opp.bestOdds.map((bo, i) => (
              <div key={bo.outcome} className={`flex items-center justify-between py-2.5 px-3.5 text-xs hover:bg-slate-800/30 transition-colors ${i < opp.bestOdds.length - 1 ? 'border-b border-slate-800/40' : ''}`}>
                <span className="text-slate-300">Si {OUTCOME_LABELS[bo.outcome]} <span className="font-data text-slate-500">({bo.odd.toFixed(2)})</span></span>
                <div className="flex items-center gap-4">
                  <span className="font-data text-slate-200">Cobras: <span className="font-bold">${customWinnings[bo.outcome].toFixed(2)}</span></span>
                  <span className="font-data font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">+${customProfit.toFixed(2)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer buttons */}
        <div className="p-5 border-t border-slate-800 mt-4 flex gap-3 justify-end sticky bottom-0 bg-slate-900/95 backdrop-blur-sm">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-800 text-slate-200 text-xs font-medium hover:bg-slate-700 transition-all hover:scale-[1.02] cursor-pointer"
          >
            {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
            {copied ? 'Copiado!' : 'Copiar Datos'}
          </button>
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/40 text-xs font-semibold hover:bg-emerald-500/25 transition-all hover:scale-[1.02] cursor-pointer"
          >
            <TrendingUp size={14} />
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
