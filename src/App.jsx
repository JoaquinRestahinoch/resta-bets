import { useState, useMemo } from 'react';
import { LayoutGrid, List, Info, Trophy, Zap } from 'lucide-react';
import logoImg from './assets/logo.png';
import useSocket from './hooks/useSocket';
import useWorldCup, { deriveLiveArbitrages } from './hooks/useWorldCup';
import Header from './components/Header';
import StatsPanel, { BookmakerStatus } from './components/StatsPanel';
import SportFilter from './components/SportFilter';
import OpportunitiesTable from './components/OpportunitiesTable';
import SportGroupView from './components/SportGroupView';
import OpportunityModal from './components/OpportunityModal';
import Notifications from './components/Notifications';
import ApiKeyPanel from './components/ApiKeyPanel';
import WorldCupView from './components/WorldCupView';
import LiveArbitrage from './components/LiveArbitrage';

export default function App() {
  const {
    connected, opportunities, stats, scraperStatus,
    lastUpdate, eventCount, notifications, dismissNotification,
  } = useSocket();

  const { matches, loading: wcLoading, lastUpdate: wcLastUpdate, refetch } = useWorldCup();

  const [searchQuery, setSearchQuery] = useState('');
  const [activeSport, setActiveSport] = useState('all');
  const [minROI, setMinROI] = useState(0);
  const [selectedOpp, setSelectedOpp] = useState(null);
  const [viewMode, setViewMode] = useState('table');
  const [activeTab, setActiveTab] = useState('worldcup');

  // Live arbitrages across ALL markets (roi > 0), derived from World Cup data
  const liveArbitrages = useMemo(() => {
    let arbs = deriveLiveArbitrages(matches);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      arbs = arbs.filter(
        (a) =>
          a.matchName.toLowerCase().includes(q) ||
          a.league.toLowerCase().includes(q) ||
          a.market.label.toLowerCase().includes(q),
      );
    }
    return arbs;
  }, [matches, searchQuery]);

  const filtered = useMemo(() => {
    let result = opportunities;
    if (activeSport !== 'all') result = result.filter((o) => o.sport === activeSport);
    if (minROI > 0) result = result.filter((o) => o.roi >= minROI);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (o) =>
          o.matchName.toLowerCase().includes(q) ||
          o.league.toLowerCase().includes(q) ||
          o.bestOdds.some((bo) => bo.bookmaker.toLowerCase().includes(q)),
      );
    }
    return result;
  }, [opportunities, activeSport, minROI, searchQuery]);

  return (
    <div className="min-h-screen text-slate-100">
      <Notifications notifications={notifications} onDismiss={dismissNotification} />
      <Header
        connected={connected}
        lastUpdate={lastUpdate}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-6 space-y-5">
        {/* Horizontal stats bar */}
        <StatsPanel stats={stats} eventCount={eventCount} liveArbCount={liveArbitrages.length} />

        {/* Always-visible live arbitrage section */}
        <LiveArbitrage arbitrages={liveArbitrages} />

        <div className="flex flex-col lg:flex-row gap-5">
          {/* Main content */}
          <main className="flex-1 min-w-0 space-y-4 order-2 lg:order-1">
            {/* Tabs */}
            <div className="flex items-center gap-1 bg-slate-900/60 rounded-xl p-1 border border-slate-800/80">
              <button
                onClick={() => setActiveTab('worldcup')}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all cursor-pointer flex-1 justify-center whitespace-nowrap ${
                  activeTab === 'worldcup'
                    ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30 shadow-sm shadow-amber-500/10'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 border border-transparent'
                }`}
              >
                <Trophy size={15} />
                <span>Mundial</span>
              </button>
              <button
                onClick={() => setActiveTab('arbitrage')}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all cursor-pointer flex-1 justify-center whitespace-nowrap ${
                  activeTab === 'arbitrage'
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-sm shadow-emerald-500/10'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 border border-transparent'
                }`}
              >
                <Zap size={15} />
                <span>Arbitraje</span>
                {opportunities.length > 0 && (
                  <span className="text-[10px] font-data bg-slate-800 px-1.5 py-0.5 rounded-full">{opportunities.length}</span>
                )}
              </button>
            </div>

            {activeTab === 'worldcup' && (
              <WorldCupView
                matches={matches}
                loading={wcLoading}
                lastUpdate={wcLastUpdate}
                onRefresh={refetch}
              />
            )}

            {activeTab === 'arbitrage' && (
              <div className="space-y-4 animate-fade-in">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <SportFilter
                    activeSport={activeSport}
                    onSportChange={setActiveSport}
                    minROI={minROI}
                    onMinROIChange={setMinROI}
                    opportunities={opportunities}
                  />
                  <div className="flex gap-0.5 bg-slate-900/60 rounded-lg p-1 border border-slate-800">
                    <button
                      onClick={() => setViewMode('table')}
                      className={`p-2 rounded-md cursor-pointer transition-all ${viewMode === 'table' ? 'bg-emerald-500/15 text-emerald-400 shadow-sm shadow-emerald-500/10' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/40'}`}
                      aria-label="Vista tabla"
                    >
                      <List size={15} />
                    </button>
                    <button
                      onClick={() => setViewMode('grouped')}
                      className={`p-2 rounded-md cursor-pointer transition-all ${viewMode === 'grouped' ? 'bg-emerald-500/15 text-emerald-400 shadow-sm shadow-emerald-500/10' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/40'}`}
                      aria-label="Vista agrupada"
                    >
                      <LayoutGrid size={15} />
                    </button>
                  </div>
                </div>

                {viewMode === 'table' ? (
                  <OpportunitiesTable opportunities={filtered} onSelect={setSelectedOpp} />
                ) : (
                  <SportGroupView opportunities={filtered} onSelect={setSelectedOpp} />
                )}

                {filtered.length > 0 && (
                  <p className="text-xs text-slate-600 text-center font-data">
                    Mostrando {filtered.length} de {opportunities.length} oportunidades
                  </p>
                )}
              </div>
            )}

            {/* Footer */}
            <footer className="mt-8 bg-slate-900/40 rounded-xl border border-slate-800/70 overflow-hidden">
              <div className="h-px w-full accent-line opacity-40" />
              <div className="p-5">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
                  <div className="flex items-center gap-2.5">
                    <img src={logoImg} alt="" className="w-7 h-7 rounded-full object-cover border border-emerald-500/30" />
                    <span className="text-xs font-black tracking-widest text-slate-400">
                      RESTA <span className="text-emerald-400">BETS</span>
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-[10px] text-slate-600 font-data">
                    <span>v1.0</span>
                    <span className="w-px h-3 bg-slate-800" />
                    <span>React 18 + Tailwind</span>
                    <span className="w-px h-3 bg-slate-800" />
                    <span>The Odds API</span>
                  </div>
                </div>
                <div className="grid sm:grid-cols-3 gap-3 text-[11px] text-slate-500 mb-4">
                  <div className="flex items-start gap-2">
                    <Info size={12} className="text-slate-600 shrink-0 mt-0.5" />
                    <p>Cuotas reales via The Odds API. Actualizacion cada 10 segundos.</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <Info size={12} className="text-slate-600 shrink-0 mt-0.5" />
                    <p>Las casas de apuestas pueden limitar apuestas de arbitraje.</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <Info size={12} className="text-slate-600 shrink-0 mt-0.5" />
                    <p className="font-data">PI = (1/C1) + (1/C2) + (1/C3) &mdash; Arb si PI {'<'} 1.0</p>
                  </div>
                </div>
                <div className="pt-3 border-t border-slate-800/60 text-center text-[10px] text-slate-600">
                  Arbitraje deportivo en tiempo real &bull; Solo con fines informativos &bull; Apuesta responsablemente
                </div>
              </div>
            </footer>
          </main>

          {/* Sidebar */}
          <aside className="lg:w-72 shrink-0 space-y-3 order-1 lg:order-2">
            <ApiKeyPanel />
            <BookmakerStatus scraperStatus={scraperStatus} connected={connected} />
            {/* Logo decorativo */}
            <div className="hidden lg:flex flex-col items-center pt-5 pb-2">
              <img
                src={logoImg}
                alt=""
                className="w-28 h-28 rounded-full object-cover border-2 border-emerald-500/30 shadow-lg shadow-emerald-500/10 hover:shadow-xl hover:shadow-emerald-500/15 transition-shadow"
              />
              <span className="text-[11px] text-slate-400 font-black tracking-widest mt-3">RESTA <span className="text-emerald-400">BETS</span></span>
              <span className="text-[9px] text-slate-600 mt-0.5 tracking-wide">ARBITRAJE DEPORTIVO</span>
            </div>
          </aside>
        </div>
      </div>

      {selectedOpp && (
        <OpportunityModal opportunity={selectedOpp} onClose={() => setSelectedOpp(null)} />
      )}
    </div>
  );
}
