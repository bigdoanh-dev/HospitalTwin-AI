import React, { useEffect, useState } from 'react';
import { Video, Users, DoorOpen, Sparkles, Clock3, Activity, ShieldCheck, Maximize2, X } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from 'recharts';
import { api } from '../../services/api';

interface RoomInspectorProps { roomId: string; roomDetails?: any; onOpenAI: (id: string) => void; clockTime?: string; }
export const RoomInspector: React.FC<RoomInspectorProps> = ({ roomId, roomDetails: room, onOpenAI, clockTime }) => {
  const [history, setHistory] = useState<Array<{ time: string; count: number }>>([]);
  const [tab, setTab] = useState<'current' | 'history'>('current');
  const [expanded, setExpanded] = useState(false);
  const [error, setError] = useState('');
  const camera = room?.cameras?.[0];
  const isOnline = camera?.is_online;
  const present = room?.people_present;
  useEffect(() => {
    let active = true;
    setHistory([]); setError('');
    if (roomId) api.getQueueHistory(roomId).then(data => { if (active) setHistory(data); }).catch(err => { if (active) setError(err.message); });
    return () => { active = false; };
  }, [roomId, room?.measured_at]);
  const syntheticScene = (
    <div className="relative h-full min-h-36 overflow-hidden rounded-xl bg-slate-900">
      <div className="absolute inset-0 opacity-70" style={{ backgroundImage: 'linear-gradient(160deg,#334155 0%,#172435 55%,#0f172a 100%)' }} />
      <div className="absolute inset-x-6 top-8 h-10 rounded border border-slate-500 bg-slate-700 flex items-center justify-around">
        {Array.from({ length: Math.min(room?.counters || 0, 12) }, (_, i) => <span key={i} className="w-5 h-4 rounded-sm border border-cyan-300/40 bg-cyan-200/20" />)}
      </div>
      <div className="absolute inset-x-8 bottom-8 top-24 flex flex-wrap gap-2 content-center justify-center">
        {Array.from({ length: Math.min(present || 0, 36) }, (_, i) => <div key={i} className="flex flex-col items-center" style={{ opacity: .5 + (i % 4) * .15 }}><span className="h-2 w-2 rounded-full bg-cyan-100" /><span className="h-4 w-2.5 rounded-t bg-slate-300 mt-0.5" /></div>)}
      </div>
      <span className="absolute top-3 left-3 flex items-center gap-1.5 rounded-md bg-slate-950/80 px-2 py-1 text-[10px] text-white"><Video size={12} /> Minh họa tổng hợp</span>
      <span className="absolute bottom-3 left-3 text-[10px] font-mono text-slate-200">{camera?.name || 'Chưa bố trí camera'}</span>
      <span className="absolute bottom-3 right-3 text-[10px] text-slate-300">{clockTime?.replace('T', ' ').slice(11, 19) || '—'}</span>
      {!camera || !isOnline ? <div className="absolute inset-0 bg-slate-950/75 flex items-center justify-center text-xs text-slate-200">{camera ? 'Camera đang ngoại tuyến' : 'Khu vực không có camera'}</div> : null}
    </div>
  );
  if (!room || room.id !== roomId) return <aside className="w-full rounded-2xl border bg-white p-5 min-h-96" role="status"><div className="h-40 bg-slate-100 animate-pulse rounded-xl" /><p className="text-xs text-slate-400 mt-4">{roomId ? 'Đang tải khu vực…' : 'Chọn một phòng trên bản đồ để xem chi tiết.'}</p></aside>;
  const congested = room.current_queue_length > 50;
  return <aside className="w-full rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm flex flex-col gap-3">
    <div className="flex items-start justify-between gap-2"><div><p className="text-[10px] uppercase tracking-widest font-semibold text-slate-400">Chi tiết khu vực · {room.floor_id?.replace('FL-', '')}</p><h2 className="mt-1 text-sm font-bold text-slate-900">{room.name}</h2></div><span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-semibold ${congested ? 'bg-red-50 text-red-600' : room.status === 'offline' ? 'bg-slate-100 text-slate-500' : 'bg-blue-50 text-blue-700'}`}>{congested ? 'Hàng đợi cao' : room.status === 'offline' ? 'Ngoại tuyến' : 'Đang theo dõi'}</span></div>
    <div className="relative h-40">{syntheticScene}<button aria-label="Mở rộng minh họa camera" onClick={() => setExpanded(true)} className="absolute top-2 right-2 p-1.5 rounded-md bg-black/40 text-white hover:bg-black/70"><Maximize2 size={13} /></button></div>
    <p className="text-[10px] text-slate-400 flex gap-1.5"><ShieldCheck size={12} className="shrink-0" />Dữ liệu tổng hợp; hình người chỉ minh họa, chưa kết nối thị giác máy tính.</p>
    <div className="flex p-1 rounded-lg bg-slate-100 text-[11px] font-semibold" role="tablist" aria-label="Thông tin khu vực">{(['current', 'history'] as const).map(t => <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)} className={`flex-1 py-1.5 rounded-md ${tab === t ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500'}`}>{t === 'current' ? 'Trạng thái hiện tại' : 'Diễn biến hàng đợi'}</button>)}</div>
    {tab === 'current' ? <div className="grid grid-cols-2 gap-2">
      {[{ icon: Users, label: 'Đang chờ phục vụ', value: `${room.current_queue_length} người` }, { icon: Clock3, label: 'Chờ trung vị · bước đã xong', value: `${room.current_waiting_time} phút` }, { icon: DoorOpen, label: 'Quầy / nhân viên', value: `${room.counters} / ${room.active_staff}` }, { icon: Video, label: 'Có mặt · camera tổng hợp', value: present == null ? 'Chưa có dữ liệu' : `${present} người` }].map(m => <div key={m.label} className="border border-slate-100 rounded-xl p-2.5"><m.icon size={15} className="text-blue-600 mb-2" /><div className="text-sm font-bold text-slate-800">{m.value}</div><p className="text-[10px] text-slate-500 mt-1">{m.label}</p></div>)}
    </div> : <div className="h-40 min-w-0">{history.length ? <ResponsiveContainer width="100%" height="100%"><AreaChart data={history} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}><defs><linearGradient id="queueFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#2563eb" stopOpacity={.25} /><stop offset="100%" stopColor="#2563eb" stopOpacity={0} /></linearGradient></defs><XAxis dataKey="time" tick={{ fontSize: 9 }} minTickGap={24} axisLine={false} tickLine={false} /><YAxis tick={{ fontSize: 9 }} allowDecimals={false} axisLine={false} tickLine={false} /><Tooltip formatter={v => [`${v} người`, 'Đang chờ']} /><Area type="stepAfter" dataKey="count" stroke="#2563eb" fill="url(#queueFill)" strokeWidth={2} isAnimationActive={false} /></AreaChart></ResponsiveContainer> : <p className="text-xs text-slate-500 pt-8">{error || 'Đang tải diễn biến…'}</p>}</div>}
    <div className="text-[10px] text-slate-500 flex flex-wrap gap-x-3 gap-y-1"><span>Đang phục vụ: <b>{room.being_served}</b></span><span>Chờ kết quả: <b>{room.waiting_for_results}</b></span><span>Mẫu bước hoàn tất: <b>{room.sample_size}</b></span></div>
    <button onClick={() => onOpenAI(roomId)} className="mt-auto w-full flex items-center justify-center gap-2 rounded-xl bg-blue-600 py-2.5 text-xs font-semibold text-white hover:bg-blue-700 transition-colors"><Sparkles size={15} />Phân tích khu vực với AI</button>
    {expanded && <div className="fixed inset-0 z-50 bg-slate-950/70 p-6 flex items-center justify-center" onClick={() => setExpanded(false)}><div role="dialog" aria-modal="true" aria-label="Minh họa camera tổng hợp" className="relative w-full max-w-3xl h-96" onClick={e => e.stopPropagation()}>{syntheticScene}<button autoFocus onClick={() => setExpanded(false)} aria-label="Đóng minh họa camera" className="absolute -top-10 right-0 text-white p-2"><X /></button></div></div>}
  </aside>;
};
