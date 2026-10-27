import React from 'react';
import { Users } from 'lucide-react';
import { QueueLocationData } from '../../types/hospital';
export const QueueBarChart: React.FC<{ locations?: QueueLocationData[]; onSelectLocation?: (id: string) => void }> = ({ locations = [], onSelectLocation }) => {
  const max = Math.max(10, ...locations.map(x => x.waiting));
  return <section className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-sm">
    <div className="flex items-center justify-between gap-3 mb-4"><h2 className="flex items-center gap-2 font-bold text-xs text-slate-800"><Users size={16} className="text-blue-600" />Hàng đợi theo khu vực</h2><span className="text-[10px] text-slate-400">Chờ phục vụ / Có mặt*</span></div>
    {!locations.length && <p className="py-8 text-xs text-slate-400 text-center">Chưa có hàng đợi phục vụ trong phạm vi này.</p>}
    <div className="space-y-2">{locations.map(item => <button key={item.room_id} onClick={() => onSelectLocation?.(item.room_id)} className="flex w-full items-center gap-3 p-1.5 rounded-lg hover:bg-slate-50 text-left group">
      <span className="w-28 sm:w-36 shrink-0 truncate text-[11px] text-slate-600" title={item.name}>{item.name}</span>
      <span className="flex-1 h-2.5 rounded-full bg-slate-100 overflow-hidden"><span className={`block h-full rounded-full transition-[width] duration-500 ${item.waiting > 50 ? 'bg-red-500' : item.waiting > 20 ? 'bg-amber-400' : 'bg-blue-500'}`} style={{ width: `${100 * item.waiting / max}%` }} /></span>
      <span className="w-16 shrink-0 text-right text-xs tabular-nums"><b className="text-slate-800">{item.waiting}</b><span className="text-slate-400"> / {item.present ?? '—'}</span></span>
    </button>)}</div><p className="mt-3 text-[9px] text-slate-400">* Có mặt: camera tổng hợp; hàng đợi: trạng thái lượt khám. Hai chỉ số khác nhau.</p>
  </section>;
};
