import React, { useEffect, useState } from 'react';
import { UserPlus, Stethoscope, FlaskConical, CreditCard, Pill, Search, RefreshCw, ArrowRight, X, Clock3, ChevronRight } from 'lucide-react';
import { api } from '../services/api';
interface Props { onOpenAI: (id: string) => void; onError: (title: string, detail?: string) => void; onSuccess: (title: string, detail?: string) => void; }
const tabs = [
  { id: 'reception', label: 'Tiếp đón & BHYT', icon: UserPlus, matches: ['ROOM-REC-101', 'ROOM-INS-101'] },
  { id: 'doctor', label: 'Bác sĩ khám', icon: Stethoscope, matches: ['ROOM-EXAM'] },
  { id: 'lab', label: 'Xét nghiệm', icon: FlaskConical, matches: ['ROOM-LAB', 'ROOM-RES'] },
  { id: 'payment', label: 'Viện phí', icon: CreditCard, matches: ['ROOM-PAY'] },
  { id: 'pharmacy', label: 'Nhà thuốc', icon: Pill, matches: ['ROOM-PHAR'] },
];
const stateNames: Record<string,string> = { waiting: 'Đang chờ', called: 'Đã mời', in_service: 'Đang phục vụ', waiting_for_result: 'Chờ kết quả', completed: 'Hoàn tất', paused: 'Tạm hoãn', no_show: 'Vắng mặt', cancelled: 'Đã hủy' };
const orderNames: Record<string,string> = { ordered: 'Đã chỉ định', collected: 'Đã lấy mẫu', processing: 'Đang xử lý', ready: 'Đã có kết quả', reviewed: 'Đã xem kết quả' };
export const OperationsView: React.FC<Props> = ({ onOpenAI, onError, onSuccess }) => {
  const role = api.getCurrentUser()?.role || '';
  const defaultTab = role === 'doctor' ? 'doctor' : role === 'lab_staff' ? 'lab' : role === 'cashier' ? 'payment' : role === 'pharmacy_staff' ? 'pharmacy' : 'reception';
  const [tab, setTab] = useState(defaultTab);
  const [visits, setVisits] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [includeDone, setIncludeDone] = useState(false);
  const [busy, setBusy] = useState('');
  const [loading, setLoading] = useState(false);
  const [fullName, setFullName] = useState('');
  const [dob, setDob] = useState('1990-01-01');
  const [gender, setGender] = useState('Không xác định');
  const [payment, setPayment] = useState('bhyt');
  const [details, setDetails] = useState<any>(null);
  const load = async () => { setLoading(true); try { setVisits(await api.listVisits()); } catch (err: any) { onError('Tải lượt khám', err.message); } finally { setLoading(false); } };
  useEffect(() => { void load(); const listener = () => void load(); window.addEventListener('hospital:data-changed', listener); return () => window.removeEventListener('hospital:data-changed', listener); }, []);
  const act = async (v: any, action: () => Promise<any>) => {
    setBusy(v.id);
    try { const result = await action(); onSuccess(result.message || 'Đã cập nhật lượt khám'); await load(); } catch (err: any) { onError('Thao tác chưa thực hiện', err.message); } finally { setBusy(''); }
  };
  const register = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy('register');
    try { const res = await api.registerPatient({ full_name: fullName, dob, gender, payment_type: payment, chief_complaint: 'Lượt khám trình diễn · dữ liệu tổng hợp' }); onSuccess('Đã tạo lượt khám', `${res.ticket_number} · ${res.visit_id}`); setSearch(fullName); setFullName(''); await load(); } catch (err: any) { onError('Đăng ký chưa thành công', err.message); } finally { setBusy(''); }
  };
  const relevant = (v: any, id: string) => tabs.find(t => t.id === id)!.matches.some(m => v.current_room_id?.startsWith(m));
  const found = visits.filter(v => (includeDone || !['completed', 'cancelled', 'no_show'].includes(v.status)) && `${v.patient_name} ${v.ticket_number} ${v.patient_code} ${v.id}`.toLowerCase().includes(search.toLowerCase()));
  const rows = found.filter(v => relevant(v, tab));
  const canRegister = ['admin', 'operator', 'receptionist'].includes(role);
  const canRoom = (v: any) => ['admin', 'operator', 'department_manager'].includes(role) || ({ receptionist: 'reception', doctor: 'doctor', lab_staff: 'lab', cashier: 'payment', pharmacy_staff: 'pharmacy' } as Record<string,string>)[role] === tabs.find(t => t.matches.some(m => v.current_room_id?.startsWith(m)))?.id;
  const actionButton = (v: any, label: string, fn: () => Promise<any>, secondary = false) => <button disabled={!!busy || !canRoom(v)} onClick={() => act(v, fn)} className={`px-3 py-2 rounded-lg text-[11px] font-semibold disabled:opacity-40 ${secondary ? 'bg-blue-50 text-blue-700 hover:bg-blue-100' : 'bg-blue-600 text-white hover:bg-blue-700'}`}>{busy === v.id ? 'Đang xử lý…' : label}</button>;
  const actions = (v: any) => {
    const id = v.id, rid = v.current_room_id;
    if (v.status === 'waiting') return actionButton(v, 'Mời vào', () => api.callPatient(id, rid));
    if (v.status === 'called') return actionButton(v, 'Bắt đầu phục vụ', () => api.startService(id, rid));
    if (v.status === 'in_service') {
      if (rid === 'ROOM-LAB-101') return actionButton(v, 'Hoàn tất lấy mẫu', () => api.completeStep(id, rid));
      if (rid?.startsWith('ROOM-EXAM')) return <>{!v.orders?.some((o: any) => o.status === 'ready') && ['admin','operator','doctor'].includes(role) && actionButton(v, 'Chỉ định xét nghiệm', () => api.orderLab(id), true)}{actionButton(v, v.orders?.some((o: any) => o.status === 'ready') ? 'Xem kết quả & kết luận' : 'Hoàn tất khám', () => api.completeStep(id, rid))}</>;
      return actionButton(v, rid === 'ROOM-PHAR-101' ? 'Cấp thuốc & hoàn tất' : rid === 'ROOM-PAY-101' ? 'Xác nhận thu phí demo' : 'Hoàn tất bước', () => api.completeStep(id, rid));
    }
    if (v.status === 'waiting_for_result') {
      if (v.orders?.some((o: any) => o.status === 'collected')) return actionButton(v, 'Bắt đầu xử lý mẫu', () => api.processLab(id));
      if (v.orders?.some((o: any) => o.status === 'processing')) return actionButton(v, 'Xác nhận kết quả demo', () => api.resultReadyLab(id));
    }
    return <span className="text-[11px] text-slate-400">{stateNames[v.status] || v.status}</span>;
  };
  return <div className="space-y-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><h1 className="text-2xl font-bold tracking-tight">Vận hành ngoại trú</h1><p className="text-xs text-slate-500 mt-1">Đăng ký → BHYT → Khám → Xét nghiệm → Khám lại → Viện phí → Nhận thuốc</p></div><button aria-label="Làm mới lượt khám" onClick={load} className="p-2 rounded-lg bg-white border text-slate-500"><RefreshCw size={16} className={loading ? 'animate-spin' : ''}/></button></div>
    <div className="flex gap-1 overflow-x-auto rounded-xl border bg-white p-1" role="tablist" aria-label="Bàn làm việc">{tabs.map(t => <button role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)} key={t.id} className={`flex items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2.5 text-xs font-semibold ${tab === t.id ? 'bg-blue-600 text-white' : 'text-slate-500 hover:bg-slate-50'}`}><t.icon size={15}/>{t.label}<span className="opacity-60">{found.filter(v => relevant(v,t.id)).length}</span></button>)}</div>
    <div className="grid lg:grid-cols-12 gap-4">
      {tab === 'reception' && canRegister && <section className="lg:col-span-4 rounded-2xl border bg-white p-5 h-fit"><h2 className="font-bold text-sm flex items-center gap-2 mb-4"><UserPlus size={17} className="text-blue-600"/>Đăng ký lượt khám</h2><form onSubmit={register} className="space-y-3 text-xs"><label className="block text-slate-500">Họ tên giả lập<input required minLength={2} value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Ví dụ: Người bệnh Demo 01" className="mt-1 w-full rounded-lg border bg-slate-50 p-2.5 text-slate-800"/></label><label className="block text-slate-500">Ngày sinh<input type="date" required value={dob} onChange={e => setDob(e.target.value)} className="mt-1 w-full rounded-lg border bg-slate-50 p-2.5 text-slate-800"/></label><label className="block text-slate-500">Giới tính<select value={gender} onChange={e => setGender(e.target.value)} className="mt-1 w-full rounded-lg border bg-slate-50 p-2.5 text-slate-800"><option>Không xác định</option><option>Nam</option><option>Nữ</option></select></label><label className="block text-slate-500">Phương thức chi trả<select value={payment} onChange={e => setPayment(e.target.value)} className="mt-1 w-full rounded-lg border bg-slate-50 p-2.5 text-slate-800"><option value="bhyt">BHYT</option><option value="service">Khám theo yêu cầu</option><option value="hybrid">Kết hợp BHYT & dịch vụ</option></select></label><button disabled={!!busy} type="submit" className="w-full bg-blue-600 hover:bg-blue-700 rounded-lg py-2.5 text-white font-semibold disabled:opacity-40">Tạo lượt khám & cấp số</button><p className="text-[10px] text-slate-400 leading-relaxed">Chỉ nhập dữ liệu giả lập. Một người bệnh có thể có nhiều lượt khám; mỗi lượt theo dõi quy trình riêng.</p></form></section>}
      <section className={`${tab === 'reception' && canRegister ? 'lg:col-span-8' : 'lg:col-span-12'} rounded-2xl border bg-white p-4 min-w-0`}><div className="flex flex-wrap items-center justify-between gap-3 mb-4"><label className="flex items-center gap-2 border rounded-lg px-3 py-2 text-xs flex-1 max-w-sm"><Search size={14} className="text-slate-400"/><input aria-label="Tìm lượt khám" value={search} onChange={e => setSearch(e.target.value)} placeholder="Tên, số thứ tự hoặc mã lượt…" className="outline-none w-full"/></label><label className="text-[11px] text-slate-500 flex items-center gap-2"><input type="checkbox" checked={includeDone} onChange={e => setIncludeDone(e.target.checked)}/>Gồm lượt đã kết thúc</label>{tab === 'lab' && <button onClick={() => onOpenAI('ROOM-LAB-101')} className="text-blue-600 text-xs font-semibold">Phân tích hàng đợi →</button>}</div>
      <div className="space-y-2 max-h-[65vh] overflow-y-auto pr-1">{rows.length ? rows.map(v => <article key={v.id} data-testid={`visit-${v.id}`} className="rounded-xl border border-slate-100 bg-slate-50/50 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3"><div className="min-w-0"><div className="flex items-center flex-wrap gap-2"><b className="text-blue-600 text-sm">{v.ticket_number}</b><button onClick={async () => { try { setDetails(await api.getVisitById(v.id)); } catch (err: any) { onError('Chi tiết lượt khám', err.message); } }} className="font-semibold text-sm text-slate-800 hover:text-blue-600 text-left">{v.patient_name}</button><span className="text-[10px] rounded-full px-2 py-1 bg-white border text-slate-500">{stateNames[v.status] || v.status}</span></div><p className="text-[10px] text-slate-400 mt-1.5">{v.current_room_name || v.current_room_id} · {v.payment_type?.toUpperCase()} · {v.id}</p>{v.orders?.length > 0 && <p className="text-[10px] text-indigo-500 mt-1">{v.orders.map((o: any) => orderNames[o.status] || o.status).join(' · ')}</p>}</div><div className="flex flex-wrap gap-2 shrink-0">{actions(v)}</div></article>) : <p className="py-16 text-center text-sm text-slate-400">{loading ? 'Đang tải…' : 'Không có lượt khám phù hợp.'}</p>}</div></section>
    </div>
    <p className="text-[10px] text-slate-400">Thao tác cập nhật bộ dữ liệu demo dùng chung và được ghi nhật ký. Máy chủ kiểm tra vai trò, bước đang thực hiện và năng lực phục vụ.</p>
    {details && <div className="fixed inset-0 bg-slate-950/50 z-50 p-4 flex items-center justify-center" onClick={() => setDetails(null)}><section role="dialog" aria-modal="true" aria-label="Hành trình lượt khám" onClick={e=>e.stopPropagation()} className="w-full max-w-xl max-h-[85vh] overflow-y-auto rounded-2xl bg-white p-6"><div className="flex justify-between"><div><h2 className="font-bold">{details.patient_name}</h2><p className="text-xs text-slate-400 mt-1">{details.ticket_number} · {details.id}</p></div><button autoFocus aria-label="Đóng hành trình" onClick={() => setDetails(null)}><X size={19}/></button></div><div className="mt-5 space-y-3">{details.steps?.map((s: any) => <div className="border-l-2 border-blue-200 pl-4 py-1" key={s.id}><h3 className="text-sm font-semibold">{s.name}</h3><p className="text-xs text-slate-500 mt-1">{stateNames[s.status] || s.status} · Chờ {s.waiting_minutes ?? '—'} phút · Phục vụ {s.service_minutes ?? '—'} phút</p><p className="text-[10px] text-slate-400 mt-1">{s.queued_at?.replace('T',' ')}</p></div>)}</div></section></div>}
  </div>;
};
