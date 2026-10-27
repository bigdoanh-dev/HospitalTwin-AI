import React from 'react';
import { AlertCircle, AlertTriangle, Info, ChevronRight, Sparkles } from 'lucide-react';
import { AlertItem } from '../../types/hospital';

interface AlertsPanelProps {
  alerts?: AlertItem[];
  onSelectAlert?: (roomId: string) => void;
  onOpenAI?: (roomId: string) => void;
}

export const AlertsPanel: React.FC<AlertsPanelProps> = ({ alerts, onSelectAlert, onOpenAI }) => {
  const items = alerts || [];

  const severityDot = (sev: string) => {
    switch (sev) {
      case 'critical':
        return <span className="w-2.5 h-2.5 rounded-full bg-red-500 shrink-0 mt-1 animate-pulse" />;
      case 'warning':
        return <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0 mt-1" />;
      default:
        return <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shrink-0 mt-1" />;
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-2xs">
      {/* Header matching concept */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 text-red-500" />
          <h3 className="font-extrabold text-xs text-slate-800">
            Cảnh báo vận hành
          </h3>
        </div>

      </div>

      {/* List matching concept */}
      <div className="space-y-3">
        {!items.length && <p className="py-10 text-xs text-slate-400 text-center">Không có cảnh báo trong phạm vi đang xem.</p>}
        {items.map((alert) => (
          <div
            key={alert.id}
            onClick={() => onSelectAlert && onSelectAlert(alert.room_id)}
            className="flex items-start justify-between p-2 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer group"
          >
            <div className="flex items-start space-x-3">
              {severityDot(alert.severity)}
              <div>
                <div className="text-xs font-bold text-slate-800 group-hover:text-blue-600 transition-colors">
                  {alert.title}
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  {alert.description}
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2 shrink-0">
              <span className="text-[11px] font-mono text-slate-400">
                {alert.created_at}
              </span>
              {onOpenAI && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenAI(alert.room_id);
                  }}
                  className="opacity-70 group-hover:opacity-100 p-1 rounded-md text-blue-600 hover:bg-blue-50 transition-all"
                  title="Phân tích với AI"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
