import React, { useState, useEffect } from 'react';
import {
  UserCheck,
  Search,
  MapPin,
  Clock,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  Building2,
  Calendar,
  AlertCircle,
  RefreshCw,
  FileText,
  BadgeAlert
} from 'lucide-react';
import { api } from '../services/api';
import { UserProfile } from '../types/hospital';

interface PatientPortalViewProps {
  currentUser?: UserProfile | null;
}

export const PatientPortalView: React.FC<PatientPortalViewProps> = ({ currentUser: propUser }) => {
  const currentUser = propUser || api.getCurrentUser();
  const [ticketInput, setTicketInput] = useState('VISIT-0269');
  const [loading, setLoading] = useState(false);
  const [visitData, setVisitData] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // If logged in as patient role, automatically fetch /operations/my-visit
  useEffect(() => {
    const loadInitialVisit = async () => {
      setLoading(true);
      setErrorMsg(null);
      try {
        if (currentUser?.role === 'patient') {
          const myVisit = await api.getMyVisit();
          setVisitData(myVisit);
          if (myVisit?.id) setTicketInput(myVisit.id);
        } else {
          // If operator or another role is testing portal, search default demo visit
          const defaultVisit = await api.getVisitById('VISIT-0269');
          setVisitData(defaultVisit);
        }
      } catch (err: any) {
        console.warn('Patient portal fetch:', err.message);
        setErrorMsg(err.message || 'Không thể tải thông tin lượt khám');
      } finally {
        setLoading(false);
      }
    };

    loadInitialVisit();
  }, [currentUser?.role]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketInput.trim()) return;
    setLoading(true);
    setErrorMsg(null);

    let queryId = ticketInput.trim().toUpperCase();
    // If user enters ticket like A269 or 269, normalize to VISIT-0269 if possible
    if (queryId.startsWith('A') && queryId.length <= 5) {
      const num = queryId.substring(1).padStart(4, '0');
      queryId = `VISIT-${num}`;
    }

    try {
      const res = await api.getVisitById(queryId);
      setVisitData(res);
    } catch (err: any) {
      setErrorMsg(`Không tìm thấy lượt khám "${ticketInput}". Hãy thử nhập mã dạng VISIT-0269 hoặc A269.`);
      setVisitData(null);
    } finally {
      setLoading(false);
    }
  };

  // Standard step progression
  const standardJourney = [
    { key: 'rec', name: 'Tiếp đón & Đăng ký', room: 'ROOM-REC-101 (Tầng 1)' },
    { key: 'ins', name: 'Xác thực BHYT', room: 'ROOM-INS-101 (Tầng 1)' },
    { key: 'exam', name: 'Khám chuyên khoa', room: 'ROOM-EXAM-101 (Tầng 1)' },
    { key: 'lab', name: 'Lấy mẫu xét nghiệm', room: 'ROOM-LAB-101 (Tầng 1)' },
    { key: 'res', name: 'Trả kết quả & Bác sĩ kết luận', room: 'ROOM-RES-101 (Tầng 1)' },
    { key: 'pay', name: 'Thanh toán viện phí', room: 'ROOM-PAY-101 (Tầng 1)' },
    { key: 'phar', name: 'Cấp phát thuốc', room: 'ROOM-PHAR-101 (Tầng 1)' },
  ];

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Cổng Tra cứu & Đồng hành cùng Người bệnh (Patient Portal)
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Theo dõi tiến trình lượt khám • Dữ liệu kết nối trực tiếp với HIS & Bản sao số • Không sử dụng số liệu ảo
          </p>
        </div>

        <div className="flex items-center space-x-2 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-xl">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Bệnh viện Đa khoa Giả định Bạch Mai</span>
        </div>
      </div>

      {/* Ticket Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs">
        <form onSubmit={handleSearch} className="flex items-center space-x-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
            <input
              type="text"
              value={ticketInput}
              onChange={(e) => setTicketInput(e.target.value)}
              placeholder="Nhập mã lượt khám (Ví dụ: VISIT-0269) hoặc số thứ tự (A269)..."
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-mono focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold text-xs px-5 py-2.5 rounded-xl transition-colors shadow-xs flex items-center space-x-1.5"
          >
            {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : null}
            <span>Tra cứu</span>
          </button>
        </form>

        <div className="flex items-center space-x-2 mt-2 text-[11px] text-slate-400">
          <span>Gợi ý mã tra cứu mẫu:</span>
          {['VISIT-0269', 'A269', 'VISIT-0348'].map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => {
                setTicketInput(s);
              }}
              className="underline hover:text-blue-600 font-mono"
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {errorMsg && (
        <div className="p-3 bg-amber-50 border border-amber-200 text-amber-900 text-xs rounded-xl flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Patient Live Status Card */}
      {visitData ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 rounded-2xl bg-blue-600 text-white flex flex-col items-center justify-center font-extrabold shadow-sm shrink-0">
                <span className="text-[10px] tracking-wider uppercase opacity-80">SỐ KHÁM</span>
                <span className="text-xl leading-none">{visitData.ticket_number || 'A---'}</span>
              </div>
              <div>
                <h2 className="text-base font-black text-slate-900">
                  {visitData.patient_name || 'Người bệnh'}
                </h2>
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mt-1">
                  <span className="font-mono text-slate-600 font-bold">{visitData.patient_code || visitData.patient_id}</span>
                  <span>•</span>
                  <span className="text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                    {visitData.payment_type === 'bhyt' ? 'BHYT Đúng tuyến' : visitData.payment_type === 'hybrid' ? 'BHYT + Dịch vụ' : 'Dịch vụ'}
                  </span>
                  <span>•</span>
                  <span className="font-mono text-slate-500">Mã lượt: {visitData.id}</span>
                </div>
              </div>
            </div>

            <div className="text-left sm:text-right">
              <span className="text-xs text-slate-400 block">Vị trí hiện tại</span>
              <div className="text-base font-bold text-blue-700 mt-0.5">
                {visitData.current_room_id}
              </div>
              <span className="text-[11px] text-slate-500 block">
                {visitData.current_step} ({visitData.status === 'in_service' ? 'Đang phục vụ' : visitData.status === 'completed' ? 'Đã hoàn tất' : 'Đang chờ đến lượt'})
              </span>
            </div>
          </div>

          {/* Stepper Timeline from Real Visit Steps */}
          <div>
            <h3 className="font-extrabold text-xs text-slate-400 uppercase tracking-wider mb-4">
              Lộ trình khám & Tiến độ thực tế (HIS Live Tracking)
            </h3>

            <div className="space-y-3">
              {standardJourney.map((st, i) => {
                // Determine matching step in visitData
                const isCurrent = visitData.current_step?.toLowerCase().includes(st.name.toLowerCase().substring(0, 5)) ||
                  (st.key === 'lab' && visitData.current_room_id === 'ROOM-LAB-101') ||
                  (st.key === 'exam' && visitData.current_room_id === 'ROOM-EXAM-101') ||
                  (st.key === 'rec' && visitData.current_room_id === 'ROOM-REC-101');

                const isPast = visitData.status === 'completed' ||
                  (st.key === 'rec' && visitData.current_step !== 'Tiếp đón & Cấp số');

                return (
                  <div key={st.key} className="flex items-start space-x-3.5">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold ${
                      isPast
                        ? 'bg-emerald-600 text-white'
                        : isCurrent
                        ? 'bg-blue-600 text-white ring-4 ring-blue-100 animate-pulse'
                        : 'bg-slate-100 text-slate-400 border border-slate-200'
                    }`}>
                      {isPast ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
                    </div>

                    <div className="flex-1 bg-slate-50 p-3 rounded-xl border border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <div className="text-xs font-bold text-slate-900 flex items-center space-x-2">
                          <span>{st.name}</span>
                          {isCurrent && (
                            <span className="bg-blue-600 text-white text-[9px] font-bold px-1.5 py-0.2 rounded-full">
                              Đang thực hiện
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5 flex items-center space-x-1">
                          <MapPin className="w-3 h-3 text-slate-400" />
                          <span>{st.room}</span>
                        </div>
                      </div>

                      <div className="text-left sm:text-right">
                        <span className={`text-xs font-semibold ${
                          isPast ? 'text-emerald-700' : isCurrent ? 'text-blue-700' : 'text-slate-400'
                        }`}>
                          {isPast ? 'Đã hoàn thành' : isCurrent ? 'Đang thực hiện tại quầy' : 'Chưa diễn ra'}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Orders Section if any */}
          {visitData.orders && visitData.orders.length > 0 && (
            <div className="pt-4 border-t border-slate-100">
              <h4 className="font-extrabold text-xs text-slate-700 mb-2 flex items-center space-x-1.5">
                <FileText className="w-4 h-4 text-blue-600" />
                <span>Chỉ định cận lâm sàng & Xét nghiệm</span>
              </h4>
              <div className="space-y-1.5">
                {visitData.orders.map((ord: any) => (
                  <div key={ord.id} className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs flex items-center justify-between">
                    <div>
                      <span className="font-mono font-bold text-blue-700">{ord.id}</span>
                      <span className="text-slate-700 ml-2 font-medium">{ord.description || 'Chỉ định xét nghiệm'}</span>
                    </div>
                    <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                      Trạng thái: {ord.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Privacy & Research Notice */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-500 flex items-start space-x-2">
            <ShieldCheck className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
            <span>
              <strong>Bảo mật thông tin:</strong> Tên và số định danh người bệnh trên giao diện này là dữ liệu giả lập tổng hợp ngẫu nhiên (synthetic cohort), tuyệt đối không lưu giữ hay phản ánh thông tin người bệnh thực tế.
            </span>
          </div>
        </div>
      ) : null}
    </div>
  );
};
