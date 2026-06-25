import { useState, useEffect, useRef } from 'react';
import { Zap, TrendingUp, DollarSign, ChevronDown, ChevronUp, Target } from 'lucide-react';

const OUTCOME_LABELS = {
  home: 'Local', away: 'Visitante', draw: 'Empate',
  over: 'Over', under: 'Under', yes: 'Si', no: 'No',
  '1X': '1X', '12': '12', 'X2': 'X2',
};

function formatTime(iso) {
  return new Date(iso).toLocaleString('es', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  });
}

function ArbCard({ arb }) {
  const [open, setOpen] = useState(false);
  const { market } = arb;
  return (
    <div className="rounded-xl bg-slate-900 border border-emerald-500/40 overflow-hidden animate-arb-glow animate-fade-in">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full text-left flex items-start gap-3 p-4 cursor-pointer hover:bg-emerald-500/[0.04] transition-colors"
      >
        <div className="grid place-items-center w-9 h-9 rounded-lg bg-emerald-500/15 border border-emerald-500/30 shrink-0">
          <Zap size={16} className="text-emerald-400" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-slate-100 truncate">{arb.matchName}</span>
            <span className="text-[10px] font-medium text-blue-300 bg-blue-500/10 border border-blue-500/20 px-1.5 py-0.5 rounded">
              {market.label}
            </span>
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5 font-data">{formatTime(arb.scheduledTime)} · {market.bookmakerCount} casas</div>
        </div>

        <div className="flex items-center gap-4 shrink-0">
          <div className="text-right">
            <div className="text-[10px] text-slate-500 uppercase tracking-wider">ROI</div>
            <div className="text-lg font-bold font-data text-emerald-400 leading-none">+{market.roi.toFixed(2)}%</div>
          </div>
          <div className="text-right hidden sm:block">
            <div className="text-[10px] text-slate-500 uppercase tracking-wider">$100 →</div>
            <div className="text-lg font-bold font-data text-emerald-400 leading-none">+${market.profit.toFixed(2)}</div>
          </div>
          {open ? <ChevronUp size={16} className="text-slate-500" /> : <ChevronDown size={16} className="text-slate-500" />}
        </div>
      </button>

      {open && (
        <div className="px-4 pb-4 pt-1 space-y-3 animate-fade-in-fast">
          <div className="text-[10px] text-emerald-400 font-semibold uppercase tracking-wider flex items-center gap-1.5">
            <Target size={11} /> Apostar (base $100)
          </div>
          <div className="grid sm:grid-cols-3 gap-2">
            {market.bestOdds.map((bo) => {
              const stake = market.stakes?.[bo.outcome];
              return (
                <div key={bo.outcome} className="rounded-lg bg-slate-950/60 border border-slate-800 p-3">
                  <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">
                    {OUTCOME_LABELS[bo.outcome] || bo.outcome}
                  </div>
                  <div className="text-xs font-medium text-blue-300">{bo.bookmaker}</div>
                  <div className="flex items-baseline justify-between mt-1.5">
                    <span className="text-[10px] text-slate-500 font-data">@ {bo.odd.toFixed(2)}</span>
                    {stake != null && (
                      <span className="text-sm font-bold font-data text-slate-100">${stake.toFixed(2)}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex items-center justify-between rounded-lg bg-emerald-500/10 border border-emerald-500/25 px-3 py-2">
            <span className="text-xs text-emerald-300 font-medium flex items-center gap-1.5">
              <DollarSign size={13} /> Ganancia garantizada
            </span>
            <span className="text-sm font-bold font-data text-emerald-400">+${market.profit.toFixed(2)}</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default function LiveArbitrage({ arbitrages }) {
  const count = arbitrages.length;
  const prevCount = useRef(count);
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    if (count > prevCount.current) {
      setFlash(true);
      const t = setTimeout(() => setFlash(false), 1500);
      prevCount.current = count;
      return () => clearTimeout(t);
    }
    prevCount.current = count;
  }, [count]);

  /* ---------- Compact slim bar when 0 arbitrages ---------- */
  if (count === 0) {
    return (
      <section className="rounded-xl bg-slate-900/40 border border-slate-800/80 px-4 py-2.5 flex items-center gap-3">
        <div className="grid place-items-center w-7 h-7 rounded-lg bg-slate-800 border border-slate-700 shrink-0">
          <Zap size={14} className="text-slate-500" />
        </div>
        <span className="text-xs text-slate-500 font-medium">
          <span className="font-data text-slate-400">0</span> arbitrajes activos
        </span>
        <span className="text-[10px] text-slate-600 hidden sm:inline">&mdash;</span>
        <span className="text-[10px] text-slate-600 hidden sm:flex items-center gap-1.5">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full rounded-full bg-slate-500 animate-live-ping" />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-slate-500" />
          </span>
          escaneando todos los mercados...
        </span>
      </section>
    );
  }

  /* ---------- Full section when arbitrages exist ---------- */
  return (
    <section
      className={`rounded-2xl border p-4 sm:p-5 transition-colors bg-gradient-to-b from-emerald-500/[0.08] to-slate-900/40 border-emerald-500/30 ${flash ? 'animate-arb-glow' : ''}`}
    >
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="grid place-items-center w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/40">
            <Zap size={18} className="text-emerald-400" />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-bold text-slate-50 tracking-tight flex items-center gap-2">
              ARBITRAJES EN VIVO
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 animate-live-ping" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400" />
              </span>
            </h2>
            <p className="text-[11px] text-slate-500">Todos los mercados con ROI positivo</p>
          </div>
        </div>
        <span className="text-sm font-bold font-data px-3 py-1.5 rounded-full border bg-emerald-500/15 text-emerald-400 border-emerald-500/40">
          {count} {count === 1 ? 'activo' : 'activos'}
        </span>
      </div>

      <div className="grid gap-2.5">
        {arbitrages.map((arb) => (
          <ArbCard key={arb.id} arb={arb} />
        ))}
      </div>
    </section>
  );
}
