import { TrendingUp, BarChart3, DollarSign, Clock, Activity, Zap } from 'lucide-react';

function Stat({ icon: Icon, label, value, accent = 'slate', glow = false }) {
  const ACCENTS = {
    slate: 'text-slate-100',
    emerald: 'text-emerald-400',
    blue: 'text-blue-400',
    amber: 'text-amber-400',
  };
  const ICON_BG = {
    slate: 'bg-slate-800/80 text-slate-400 border-slate-700/60',
    emerald: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    blue: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
    amber: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  };
  const CARD_BG = {
    slate: 'bg-slate-900/50',
    emerald: 'bg-emerald-500/[0.04]',
    blue: 'bg-blue-500/[0.04]',
    amber: 'bg-amber-500/[0.04]',
  };
  return (
    <div
      className={`flex items-center gap-3.5 px-4 py-3.5 rounded-xl border transition-all hover:scale-[1.02] hover:shadow-lg hover:shadow-black/20 ${
        glow
          ? 'bg-emerald-500/[0.07] border-emerald-500/30 shadow-sm shadow-emerald-500/10'
          : `${CARD_BG[accent]} border-slate-800/80 hover:border-slate-700`
      }`}
    >
      <div className={`grid place-items-center w-10 h-10 rounded-xl shrink-0 border ${ICON_BG[accent]}`}>
        <Icon size={18} strokeWidth={2.2} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider truncate mb-0.5">{label}</div>
        <div className={`text-xl font-bold font-data leading-none ${ACCENTS[accent]}`}>{value}</div>
      </div>
    </div>
  );
}

export default function StatsPanel({ stats, eventCount, liveArbCount = 0 }) {
  const arbCount = liveArbCount || stats.activeOpportunities || 0;
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      <Stat icon={Activity} label="Eventos" value={eventCount || 0} />
      <Stat icon={Zap} label="Arbitrajes" value={arbCount} accent="emerald" glow={arbCount > 0} />
      <Stat icon={TrendingUp} label="ROI Promedio" value={`${(stats.avgROI || 0).toFixed(2)}%`} accent="blue" />
      <Stat icon={BarChart3} label="Mayor ROI" value={`${(stats.maxROI || 0).toFixed(2)}%`} accent="amber" />
      <Stat icon={DollarSign} label="Profit Hoy" value={`$${(stats.totalPotentialProfit || 0).toFixed(2)}`} accent="emerald" />
      <Stat icon={Clock} label="Encontradas" value={`${stats.todayFound || 0}`} />
    </div>
  );
}

/* Compact bookmaker status for the sidebar */
export function BookmakerStatus({ scraperStatus = [], connected }) {
  const onlineCount = scraperStatus.filter((s) => s.status === 'online').length;
  return (
    <div className="bg-slate-900/50 rounded-xl border border-slate-800/80 overflow-hidden">
      {/* Card header with subtle gradient */}
      <div className="px-3.5 py-3 bg-gradient-to-r from-slate-800/40 to-transparent border-b border-slate-800/60 flex items-center justify-between">
        <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Casas de Apuestas</h3>
        <span className="text-[10px] font-data font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700/50">
          {onlineCount}/{scraperStatus.length}
        </span>
      </div>
      <div className="px-3.5 py-3 space-y-2">
        {scraperStatus.map((s) => {
          const isOnline = s.status === 'online';
          return (
            <div key={s.name} className={`flex items-center justify-between text-xs px-2.5 py-1.5 rounded-lg transition-colors ${isOnline ? 'hover:bg-emerald-500/[0.04]' : 'hover:bg-slate-800/40'}`}>
              <div className="flex items-center gap-2.5">
                {isOnline ? (
                  <span className="relative flex h-2 w-2 shrink-0">
                    <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 animate-live-ping opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
                  </span>
                ) : (
                  <span className="w-2 h-2 rounded-full bg-slate-600 shrink-0" />
                )}
                <span className={isOnline ? 'text-slate-200' : 'text-slate-500'}>{s.name}</span>
              </div>
              {s.lastUpdate && (
                <span className="text-slate-600 font-data text-[10px]">
                  {Math.round((Date.now() - new Date(s.lastUpdate).getTime()) / 1000)}s
                </span>
              )}
            </div>
          );
        })}
        {scraperStatus.length === 0 && (
          <p className="text-[11px] text-slate-600 text-center py-2">Sin datos de casas.</p>
        )}
      </div>
      <div className="mx-3.5 mb-3 px-3 py-2 rounded-lg bg-slate-800/40 border border-slate-800/60 flex items-center gap-2.5">
        {connected ? (
          <span className="relative flex h-2.5 w-2.5 shrink-0">
            <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 animate-live-ping opacity-60" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400" />
          </span>
        ) : (
          <span className="w-2.5 h-2.5 rounded-full bg-rose-400 shrink-0" />
        )}
        <span className={`text-[11px] font-medium ${connected ? 'text-emerald-400/80' : 'text-rose-400/80'}`}>
          {connected ? 'Sistema activo' : 'Desconectado'}
        </span>
      </div>
    </div>
  );
}
