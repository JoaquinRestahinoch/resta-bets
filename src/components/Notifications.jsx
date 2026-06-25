import { CheckCircle, AlertCircle, Info, X } from 'lucide-react';

const ICONS = {
  success: CheckCircle,
  error: AlertCircle,
  info: Info,
  warning: AlertCircle,
};

const STYLES = {
  success: { wrap: 'border-emerald-500/40 bg-emerald-500/10', icon: 'text-emerald-400', bar: 'bg-emerald-400' },
  error: { wrap: 'border-rose-500/40 bg-rose-500/10', icon: 'text-rose-400', bar: 'bg-rose-400' },
  info: { wrap: 'border-blue-500/40 bg-blue-500/10', icon: 'text-blue-400', bar: 'bg-blue-400' },
  warning: { wrap: 'border-amber-500/40 bg-amber-500/10', icon: 'text-amber-400', bar: 'bg-amber-400' },
};

export default function Notifications({ notifications, onDismiss }) {
  if (!notifications.length) return null;

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-[calc(100%-2rem)] sm:w-full pointer-events-none">
      {notifications.map((n) => {
        const Icon = ICONS[n.type] || Info;
        const s = STYLES[n.type] || STYLES.info;
        return (
          <div
            key={n.id}
            className={`pointer-events-auto relative overflow-hidden border rounded-xl p-3.5 pl-5 shadow-2xl shadow-black/40 backdrop-blur-md animate-slide-in hover:shadow-3xl transition-shadow ${s.wrap}`}
          >
            <span className={`absolute left-0 top-0 bottom-0 w-1 rounded-full ${s.bar}`} />
            <div className="flex items-start gap-2.5">
              <Icon size={18} className={`shrink-0 mt-0.5 ${s.icon}`} />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold text-slate-50">{n.title}</div>
                <div className="text-xs text-slate-300 mt-0.5 break-words leading-relaxed">{n.message}</div>
              </div>
              <button onClick={() => onDismiss(n.id)} className="text-slate-500 hover:text-slate-200 cursor-pointer shrink-0 p-0.5 rounded hover:bg-slate-800/40 transition-colors">
                <X size={14} />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
