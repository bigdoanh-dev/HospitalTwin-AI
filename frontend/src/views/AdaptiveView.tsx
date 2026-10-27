import React, { useEffect, useState } from 'react';
import { Activity, AlertTriangle, RotateCcw, Sparkles, ShieldCheck, Wrench } from 'lucide-react';
import { api } from '../services/api';
export const AdaptiveView: React.FC<{ onOpenAI: (id: string) => void }> = ({ onOpenAI }) => {
  const [room, setRoom] = useState<any>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const canEdit = ['admin', 'operator', 'maintenance', 'department_manager'].includes(api.getCurrentUser()?.role || '');
  const load = async () => { try { const [r,e] = await Promise.all([api.getRoomDetails('ROOM-IMG-302'), api.getEvents()]); setRoom(r); setEvents(e.filter(x => x.event_type.startsWith('equipment_'))); } catch (err: any) { setError(err.message); } };
  useEffect(() => { void load(); window.addEventListener('hospital:data-changed', load); return () => window.removeEventListener('hospital:data-changed', load); }, []);
  const offline = room?.status === 'offline';
  const changeState = async () => {
    setBusy(true); setError('');
    try { if (offline) await api.restoreCT(); else await api.triggerCTIncident(); await load(); } catch (err: any) { setError(err.message); } finally { setBusy(false); }
  };
  return <div className="space-y-5"><div className="flex flex-wrap justify-between gap-3"><div><h1 className="text-2xl font-bold tracking-tight">Vận hành thích ứng</h1><p className="text-xs text-slate-500 mt-1">Thử tình huống gián đoạn thiết bị và đánh giá phương án có giám sát.</p></div><button disabled={!canEdit || busy || !room} onClick={changeState} className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold disabled:opacity-40 ${offline ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-600 border border-red-200'}`}><RotateCcw size={16} />{offline ? 'Khôi phục CT trong demo' : 'Kích hoạt sự cố CT'}</button></div>
    {error && <p role="alert" className="text-sm text-red-600 bg-red-50 rounded-xl p-3">{error}</p>}
    <div className="grid lg:grid-cols-3 gap-4"><section className="lg:col-span-2 border rounded-2xl bg-white p-6"><div className="flex items-center gap-3"><div className={`rounded-xl p-3 ${offline ? 'bg-red-50 text-red-500' : 'bg-blue-50 text-blue-600'}`}><Activity size={26} /></div><div><p className="text-[10px] uppercase tracking-widest text-slate-400">Thiết bị · tầng 3</p><h2 className="font-bold mt-1">{room?.name || 'Đang tải máy CT…'}</h2></div><span className={`ml-auto rounded-full px-3 py-1 text-xs ${offline ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-700'}`}>{!room ? 'Đang tải' : offline ? 'Tạm dừng' : 'Sẵn sàng'}</span></div>
      <div className="mt-6 rounded-xl bg-slate-50 p-4 text-sm leading-relaxed text-slate-600">{offline ? 'Sự cố do người dùng kích hoạt cho trình diễn. Chưa có dữ liệu xác định nguyên nhân kỹ thuật hoặc thời điểm khắc phục.' : 'Thiết bị sẵn sàng trong trạng thái demo. Trạng thái này không xác nhận việc kiểm định hoặc bảo trì thiết bị thật.'}</div>
      <ol className="mt-6 space-y-4 text-sm">{['Xác minh phạm vi sự cố và các lượt bị ảnh hưởng.', 'Đề xuất giữ hàng đợi, điều chỉnh lịch hoặc sử dụng nguồn lực thay thế sau khi kiểm tra khả năng.', 'Mô phỏng phương án trước khi trình người có thẩm quyền.', 'Theo dõi sau thực hiện và cho phép hoàn tác cấu hình.'].map((text,i) => <li key={text} className="flex gap-3"><span className="h-6 w-6 flex shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600 text-xs font-bold">{i+1}</span><span className="text-slate-600 text-xs pt-1">{text}</span></li>)}</ol>
      <button onClick={() => onOpenAI('ROOM-IMG-302')} className="mt-6 flex items-center gap-2 bg-blue-600 text-white rounded-xl px-4 py-2.5 text-xs font-semibold"><Sparkles size={16} />Phân tích phương án với trợ lý AI</button>
    </section><section className="border rounded-2xl bg-white p-5"><h2 className="font-bold text-sm flex items-center gap-2"><Wrench size={17} className="text-blue-600" />Nhật ký thiết bị</h2><div className="mt-5 space-y-4">{events.length ? events.map(e => <div key={e.id} className="border-l-2 border-blue-100 pl-3"><p className="text-[10px] font-mono text-slate-400">{e.timestamp}</p><p className="text-xs text-slate-600 mt-1">{e.description}</p></div>) : <p className="text-xs text-slate-400">Chưa có sự kiện thiết bị trong demo.</p>}</div></section></div>
    <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 flex items-start gap-3 text-xs text-blue-800"><ShieldCheck size={18} className="shrink-0" /><p>Trong mô phỏng, CT ngừng hoạt động sẽ giữ các lượt cần chụp ở trạng thái chưa hoàn tất. Demo chưa có máy CT dự phòng; hệ thống không tự điều chuyển người bệnh hoặc tự bỏ qua chỉ định.</p></div>
  </div>;
};
