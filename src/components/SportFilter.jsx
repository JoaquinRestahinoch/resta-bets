const SPORTS = [
  { key: 'all', label: 'Todos', icon: '🎯' },
  { key: 'soccer', label: 'Futbol', icon: '⚽' },
  { key: 'tennis', label: 'Tenis', icon: '🎾' },
  { key: 'baseball', label: 'Baseball', icon: '⚾' },
];

export default function SportFilter({ activeSport, onSportChange, minROI, onMinROIChange, opportunities }) {
  const counts = {};
  for (const opp of opportunities) {
    counts[opp.sport] = (counts[opp.sport] || 0) + 1;
  }

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <div className="flex gap-1.5 flex-wrap">
        {SPORTS.map((s) => {
          const count = s.key === 'all' ? opportunities.length : (counts[s.key] || 0);
          const active = activeSport === s.key;
          return (
            <button
              key={s.key}
              onClick={() => onSportChange(s.key)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer border hover:scale-[1.03] ${
                active
                  ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/40 shadow-sm shadow-emerald-500/10'
                  : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-300 hover:bg-slate-800/40'
              }`}
            >
              <span>{s.icon}</span>
              <span>{s.label}</span>
              {count > 0 && (
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-data font-semibold ${
                  active ? 'bg-emerald-500/25' : 'bg-slate-800'
                }`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-2 ml-auto">
        <label className="text-xs text-slate-500 font-medium">ROI min</label>
        <select
          value={minROI}
          onChange={(e) => onMinROIChange(parseFloat(e.target.value))}
          className="bg-slate-900 border border-slate-800 text-slate-200 text-xs rounded-lg px-2.5 py-2 focus:outline-none focus:border-emerald-500/60 cursor-pointer hover:border-slate-700 transition-colors"
        >
          <option value={0}>Todos</option>
          <option value={0.5}>{'>'} 0.5%</option>
          <option value={1}>{'>'} 1%</option>
          <option value={2}>{'>'} 2%</option>
          <option value={3}>{'>'} 3%</option>
          <option value={5}>{'>'} 5%</option>
        </select>
      </div>
    </div>
  );
}
