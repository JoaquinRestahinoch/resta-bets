import { useState, useEffect } from 'react';
import { Key, ExternalLink, CheckCircle, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';

export default function ApiKeyPanel() {
  const [open, setOpen] = useState(false);
  const [theOddsApi, setTheOddsApi] = useState('');
  const [oddsApiIo, setOddsApiIo] = useState('');
  const [status, setStatus] = useState(null);
  const [saved, setSaved] = useState({});

  const apiBase = import.meta.env.DEV ? 'http://localhost:3001' : '';

  useEffect(() => {
    fetch(`${apiBase}/api/apikeys`)
      .then((r) => r.json())
      .then((data) => setSaved(data))
      .catch(() => {});
  }, []);

  const handleSave = async () => {
    setStatus('saving');
    try {
      const body = {};
      if (theOddsApi.trim()) body.theOddsApi = theOddsApi.trim();
      if (oddsApiIo.trim()) body.oddsApiIo = oddsApiIo.trim();
      const res = await fetch(`${apiBase}/api/apikeys`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      setSaved(data.keys);
      setStatus('ok');
      setTheOddsApi('');
      setOddsApiIo('');
      setTimeout(() => setStatus(null), 3000);
    } catch {
      setStatus('error');
    }
  };

  return (
    <div className="bg-slate-900/50 rounded-xl border border-slate-800/80 overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-3.5 py-3 text-xs cursor-pointer hover:bg-slate-800/40 transition-all"
      >
        <div className="flex items-center gap-2.5">
          <div className="grid place-items-center w-7 h-7 rounded-lg bg-amber-500/15 border border-amber-500/30">
            <Key size={12} className="text-amber-400" />
          </div>
          <span className="font-semibold text-slate-300">API Keys</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
            saved.theOddsApi ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25' : 'bg-amber-500/15 text-amber-400 border-amber-500/25'
          }`}>
            {saved.theOddsApi ? 'Conectado' : 'Sin key'}
          </span>
          {open ? <ChevronUp size={13} className="text-slate-500" /> : <ChevronDown size={13} className="text-slate-500" />}
        </div>
      </button>

      {open && (
        <div className="px-3.5 pb-3.5 space-y-3 border-t border-slate-800/80 pt-3 animate-fade-in-fast">
          <div>
            <label className="text-[10px] text-slate-500 uppercase tracking-wider font-medium block mb-1">
              The Odds API (Recomendado)
            </label>
            <input
              type="password"
              value={theOddsApi}
              onChange={(e) => setTheOddsApi(e.target.value)}
              placeholder={saved.theOddsApi || 'Pega tu API key…'}
              className="w-full bg-slate-950/60 border border-slate-800 rounded-lg px-2.5 py-2 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-emerald-500/60"
            />
            <a
              href="https://the-odds-api.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-[10px] text-blue-400 hover:text-blue-300 mt-1.5"
            >
              <ExternalLink size={10} /> Obtener key gratis (500 req/mes)
            </a>
          </div>

          <div>
            <label className="text-[10px] text-slate-500 uppercase tracking-wider font-medium block mb-1">
              Odds-API.io (Respaldo)
            </label>
            <input
              type="password"
              value={oddsApiIo}
              onChange={(e) => setOddsApiIo(e.target.value)}
              placeholder={saved.oddsApiIo || 'Opcional…'}
              className="w-full bg-slate-950/60 border border-slate-800 rounded-lg px-2.5 py-2 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-emerald-500/60"
            />
            <a
              href="https://odds-api.io/pricing/free"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-[10px] text-blue-400 hover:text-blue-300 mt-1.5"
            >
              <ExternalLink size={10} /> Obtener key gratis (100 req/hora)
            </a>
          </div>

          <button
            onClick={handleSave}
            disabled={!theOddsApi.trim() && !oddsApiIo.trim()}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-500/15 text-emerald-400 border border-emerald-500/40 text-xs font-semibold hover:bg-emerald-500/25 transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
          >
            {status === 'ok' && <><CheckCircle size={12} /> Conectado!</>}
            {status === 'error' && <><AlertCircle size={12} /> Error</>}
            {status === 'saving' && 'Conectando…'}
            {!status && 'Guardar y conectar'}
          </button>

          <p className="text-[10px] text-slate-600 leading-relaxed">
            Estas APIs agregan cuotas reales de Bet365, Betano, Betsson, Codere y 100+ casas en tiempo real.
          </p>
        </div>
      )}
    </div>
  );
}
