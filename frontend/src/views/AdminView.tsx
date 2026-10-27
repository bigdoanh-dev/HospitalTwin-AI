import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  RotateCcw,
  AlertTriangle,
  Users,
  Key,
  History,
  CheckCircle2,
  Lock,
  Sliders,
  RefreshCw,
  Power,
  Clock,
  Play,
  Pause,
  FastForward,
  Wrench,
  Info
} from 'lucide-react';
import { api } from '../services/api';
import { UserProfile } from '../types/hospital';

interface AdminViewProps {
  currentUser?: UserProfile | null;
  onRefreshAppState?: () => void;
}

export const AdminView: React.FC<AdminViewProps> = ({ currentUser: propUser, onRefreshAppState }) => {
  const currentUser = propUser || api.getCurrentUser();
  const isAdmin = currentUser?.role === 'admin';

  // Demo controls state
  const [demoState, setDemoState] = useState<{
    now: string;
    running: boolean;
    speed: number;
    data_mode: string;
    spare_staff: number;
    spare_counters: number;
    clock_note: string;
  } | null>(null);

  const [users, setUsers] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [features, setFeatures] = useState<any>(null);

  const [loading, setLoading] = useState(false);
  const [actionNotice, setActionNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const state = await api.getDemoState();
      setDemoState(state);

      const ftrs = await api.getSystemFeatures();
      setFeatures(ftrs);

      if (isAdmin) {
        const userList = await api.getAdminUsers();
        setUsers(userList);

        const logs = await api.getAdminAudit();
        setAuditLogs(logs);
      }
    } catch (err: any) {
      console.warn('Lỗi tải dữ liệu quản trị:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [isAdmin]);

  const handleReset = async () => {
    if (!isAdmin) {
      alert('Chỉ tài khoản Quản trị viên (admin) mới có quyền reset hệ thống.');
      return;
    }
    if (!confirm('Bạn có chắc muốn thiết lập lại toàn bộ dữ liệu demo về trạng thái ban đầu?')) return;
    try {
      const res = await api.resetDemo();
      setActionNotice({ type: 'success', text: res.message || 'Đã đặt lại dữ liệu demo thành công!' });
      await loadData();
      if (onRefreshAppState) onRefreshAppState();
    } catch (err: any) {
      setActionNotice({ type: 'error', text: err.message || 'Lỗi khi reset demo' });
    }
  };

  const handleTriggerCongestion = async () => {
    try {
      await api.triggerCongestion();
      setActionNotice({ type: 'success', text: 'Đã kích hoạt dồn ứ khu xét nghiệm! Số ca chờ thực tế đã được cập nhật.' });
      await loadData();
      if (onRefreshAppState) onRefreshAppState();
    } catch (err: any) {
      setActionNotice({ type: 'error', text: err.message });
    }
  };

  const handleTriggerCT = async () => {
    try {
      await api.triggerCTIncident();
      setActionNotice({ type: 'success', text: 'Đã mô phỏng sự cố máy CT Scanner Tầng 3 (Chuyển sang trạng thái Offline).' });
      await loadData();
      if (onRefreshAppState) onRefreshAppState();
    } catch (err: any) {
      setActionNotice({ type: 'error', text: err.message });
    }
  };

  const handleRestoreCT = async () => {
    try {
      await api.restoreCT();
      setActionNotice({ type: 'success', text: 'Đã khôi phục hoạt động cho máy CT Scanner Tầng 3 (Online).' });
      await loadData();
      if (onRefreshAppState) onRefreshAppState();
    } catch (err: any) {
      setActionNotice({ type: 'error', text: err.message });
    }
  };

  const handleTick = async (minutes: number) => {
    try {
      await api.tickClock(minutes);
      await loadData();
      if (onRefreshAppState) onRefreshAppState();
    } catch (err: any) {
      setActionNotice({ type: 'error', text: err.message });
    }
  };

  const handleToggleClock = async () => {
    if (!demoState) return;
    try {
      await api.setClock(!demoState.running, demoState.speed);
      await loadData();
    } catch (err: any) {
      setActionNotice({ type: 'error', text: err.message });
    }
  };

  const handleToggleUserActive = async (userId: string, currentActive: boolean) => {
    try {
      await api.updateAdminUser(userId, !currentActive);
      await loadData();
    } catch (err: any) {
      alert(`Lỗi cập nhật người dùng: ${err.message}`);
    }
  };

  const rbacMatrix = [
    { role: 'admin', title: 'Quản trị viên', viewMonitoring: true, runSim: true, proposeIntervention: true, approveIntervention: true, manageSystem: true },
    { role: 'director', title: 'Ban Giám đốc', viewMonitoring: true, runSim: true, proposeIntervention: true, approveIntervention: true, manageSystem: false },
    { role: 'operator', title: 'Điều phối viên', viewMonitoring: true, runSim: true, proposeIntervention: true, approveIntervention: false, manageSystem: false },
    { role: 'department_manager', title: 'Trưởng khoa / Đơn nguyên', viewMonitoring: true, runSim: true, proposeIntervention: true, approveIntervention: false, manageSystem: false },
    { role: 'camera_operator', title: 'Giám sát viên Camera', viewMonitoring: true, runSim: false, proposeIntervention: false, approveIntervention: false, manageSystem: false },
    { role: 'doctor', title: 'Bác sĩ Khám', viewMonitoring: true, runSim: false, proposeIntervention: false, approveIntervention: false, manageSystem: false },
    { role: 'lab_staff', title: 'Kỹ thuật viên Xét nghiệm', viewMonitoring: true, runSim: false, proposeIntervention: false, approveIntervention: false, manageSystem: false },
    { role: 'patient', title: 'Người bệnh', viewMonitoring: false, runSim: false, proposeIntervention: false, approveIntervention: false, manageSystem: false },
  ];

  return (
    <div className="space-y-4">
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Quản trị Hệ thống, Phân quyền RBAC & Điều khiển Demo
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Quản lý tài khoản, nhật ký kiểm toán (Audit Trail) và các công cụ giả lập kiểm thử vận hành
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {isAdmin && (
            <button
              onClick={handleReset}
              className="flex items-center space-x-1.5 bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors shadow-2xs"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset dữ liệu Demo</span>
            </button>
          )}

          <button
            onClick={loadData}
            disabled={loading}
            className="flex items-center space-x-1.5 bg-white border border-slate-200 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Làm mới</span>
          </button>
        </div>
      </div>

      {actionNotice && (
        <div className={`p-3 rounded-xl border text-xs font-medium flex items-center space-x-2 ${
          actionNotice.type === 'success'
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
            : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          {actionNotice.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> : <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />}
          <span>{actionNotice.text}</span>
        </div>
      )}

      {/* Demo Controls Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <h3 className="font-extrabold text-sm text-slate-800 flex items-center space-x-2">
            <Sliders className="w-4 h-4 text-blue-600" />
            <span>Bảng điều khiển Giả lập Sự kiện Vận hành (Demo Controls)</span>
          </h3>

          {demoState && (
            <div className="flex items-center space-x-3 text-xs">
              <span className="text-slate-500">
                Đồng hồ hệ thống: <strong className="font-mono text-slate-800">{demoState.now}</strong>
              </span>
              <button
                onClick={handleToggleClock}
                className="flex items-center space-x-1 bg-slate-100 hover:bg-slate-200 px-2.5 py-1 rounded-lg text-slate-700 font-semibold text-[11px]"
              >
                {demoState.running ? <Pause className="w-3 h-3 text-amber-600" /> : <Play className="w-3 h-3 text-emerald-600" />}
                <span>{demoState.running ? 'Tạm dừng' : 'Chạy tiếp'}</span>
              </button>
              <button
                onClick={() => handleTick(5)}
                className="flex items-center space-x-1 bg-blue-50 text-blue-700 hover:bg-blue-100 px-2 py-1 rounded-lg font-semibold text-[11px]"
              >
                <FastForward className="w-3 h-3" />
                <span>+5 phút</span>
              </button>
              <button
                onClick={() => handleTick(15)}
                className="flex items-center space-x-1 bg-blue-50 text-blue-700 hover:bg-blue-100 px-2 py-1 rounded-lg font-semibold text-[11px]"
              >
                <span>+15 phút</span>
              </button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
          <button
            onClick={handleTriggerCongestion}
            className="p-3 bg-red-50 hover:bg-red-100 border border-red-200 rounded-xl text-left transition-colors"
          >
            <strong className="block text-red-700 font-bold mb-1">1. Kích hoạt dồn ứ Xét nghiệm</strong>
            <span className="text-[11px] text-red-600">Bổ sung lượt khám và tăng hàng đợi khu lấy mẫu thực tế.</span>
          </button>

          <button
            onClick={handleTriggerCT}
            className="p-3 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-xl text-left transition-colors"
          >
            <strong className="block text-amber-800 font-bold mb-1">2. Mô phỏng sự cố CT Scanner</strong>
            <span className="text-[11px] text-amber-700">Ngắt máy CT Tầng 3 và kích hoạt luồng cảnh báo kỹ thuật.</span>
          </button>

          <button
            onClick={handleRestoreCT}
            className="p-3 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl text-left transition-colors"
          >
            <strong className="block text-emerald-800 font-bold mb-1">3. Khôi phục máy CT (Online)</strong>
            <span className="text-[11px] text-emerald-700">Đưa thiết bị CT hoạt động trở lại sau bảo trì.</span>
          </button>

          <button
            onClick={handleReset}
            disabled={!isAdmin}
            className={`p-3 rounded-xl text-left transition-colors ${
              isAdmin
                ? 'bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-800'
                : 'bg-slate-100 border border-slate-200 text-slate-400 cursor-not-allowed'
            }`}
          >
            <strong className="block font-bold mb-1">4. Reset về trạng thái chuẩn</strong>
            <span className="text-[11px] text-slate-500">Khôi phục seed 42 với 360 ca ngoại trú ban đầu (Admin only).</span>
          </button>
        </div>
      </div>

      {/* Research Capabilities & Limitations (from /system/features) */}
      {features && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-3">
          <h3 className="font-extrabold text-sm text-slate-800 flex items-center space-x-2">
            <Info className="w-4 h-4 text-blue-600" />
            <span>Năng lực Kỹ thuật & Giới hạn Nghiên cứu (System Capabilities & Boundaries)</span>
          </h3>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-[10px] text-slate-400 block uppercase font-bold">Giám sát số</span>
              <strong className="text-slate-800 font-mono text-[11px]">{features.monitoring}</strong>
            </div>
            <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-[10px] text-slate-400 block uppercase font-bold">Động cơ mô phỏng</span>
              <strong className="text-blue-700 font-mono text-[11px]">{features.simulation}</strong>
            </div>
            <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-[10px] text-slate-400 block uppercase font-bold">Trí tuệ nhân tạo</span>
              <strong className="text-emerald-700 font-mono text-[11px]">{features.AI}</strong>
            </div>
            <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-[10px] text-slate-400 block uppercase font-bold">Thị giác camera (CV)</span>
              <strong className="text-amber-700 font-mono text-[11px]">{features.camera_CV}</strong>
            </div>
          </div>

          <p className="text-[11px] text-slate-500 leading-relaxed pt-1">
            Hệ thống là bản thiết kế trình diễn nghiên cứu khoa học (<strong>{features.research_status}</strong>), không thay thế quyết định lâm sàng của bác sĩ và không kết nối trực tiếp cơ sở dữ liệu bệnh viện thực.
          </p>
        </div>
      )}

      {/* Admin Users & Audit Trail (If Admin) */}
      {isAdmin && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* User Management (6 cols) */}
          <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-3">
            <h3 className="font-extrabold text-sm text-slate-800 flex items-center space-x-2">
              <Users className="w-4 h-4 text-blue-600" />
              <span>Quản lý Tài khoản & Phân quyền ({users.length})</span>
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 uppercase tracking-wider font-semibold">
                    <th className="py-2">Tài khoản</th>
                    <th className="py-2">Vai trò</th>
                    <th className="py-2 text-center">Trạng thái</th>
                    <th className="py-2 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50">
                      <td className="py-2">
                        <span className="font-bold text-slate-800 block">{u.full_name}</span>
                        <span className="font-mono text-[10px] text-slate-400">@{u.username}</span>
                      </td>
                      <td className="py-2">
                        <span className="font-mono text-[11px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                          {u.role}
                        </span>
                      </td>
                      <td className="py-2 text-center">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          u.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                        }`}>
                          {u.is_active ? 'Kích hoạt' : 'Khóa'}
                        </span>
                      </td>
                      <td className="py-2 text-right">
                        <button
                          onClick={() => handleToggleUserActive(u.id, u.is_active)}
                          className="text-[11px] text-slate-500 hover:text-blue-600 underline font-semibold"
                        >
                          {u.is_active ? 'Vô hiệu hóa' : 'Kích hoạt'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Audit Logs (6 cols) */}
          <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-3">
            <h3 className="font-extrabold text-sm text-slate-800 flex items-center space-x-2">
              <History className="w-4 h-4 text-blue-600" />
              <span>Nhật ký Kiểm toán Hệ thống (Audit Trail)</span>
            </h3>

            <div className="max-h-72 overflow-y-auto space-y-2 pr-1 text-xs">
              {auditLogs.map((log) => (
                <div key={log.id} className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="font-mono font-bold text-blue-700">{log.action}</span>
                    <span className="text-slate-400">{log.timestamp}</span>
                  </div>
                  <div className="text-[11px] text-slate-800 font-semibold mt-0.5">
                    Tác nhân: <span className="font-mono text-purple-700">@{log.user_role}</span>
                  </div>
                  <div className="text-[11px] text-slate-600 mt-0.5">{log.details}</div>
                </div>
              ))}

              {auditLogs.length === 0 && (
                <div className="text-center py-8 text-xs text-slate-400">
                  Chưa ghi nhận sự kiện kiểm toán mới
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* RBAC Security Matrix */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-3">
        <h3 className="font-extrabold text-sm text-slate-800 flex items-center space-x-2">
          <ShieldCheck className="w-4 h-4 text-blue-600" />
          <span>Ma trận Phân quyền Vai trò Nghiệp vụ (RBAC Security Matrix)</span>
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-slate-200 text-slate-400 font-semibold uppercase tracking-wider">
                <th className="py-2.5">Vai trò</th>
                <th className="py-2.5 text-center">Giám sát 3D</th>
                <th className="py-2.5 text-center">Chạy mô phỏng</th>
                <th className="py-2.5 text-center">Đề xuất can thiệp</th>
                <th className="py-2.5 text-center">Phê duyệt can thiệp</th>
                <th className="py-2.5 text-center">Quản trị hệ thống</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rbacMatrix.map((r) => (
                <tr key={r.role} className="hover:bg-slate-50">
                  <td className="py-2.5 font-bold text-slate-800">
                    {r.title} <span className="font-mono text-[10px] text-slate-400 font-normal">({r.role})</span>
                  </td>
                  <td className="py-2.5 text-center">
                    {r.viewMonitoring ? <span className="text-emerald-600 font-bold">✔</span> : <span className="text-slate-300">—</span>}
                  </td>
                  <td className="py-2.5 text-center">
                    {r.runSim ? <span className="text-emerald-600 font-bold">✔</span> : <span className="text-slate-300">—</span>}
                  </td>
                  <td className="py-2.5 text-center">
                    {r.proposeIntervention ? <span className="text-emerald-600 font-bold">✔</span> : <span className="text-slate-300">—</span>}
                  </td>
                  <td className="py-2.5 text-center">
                    {r.approveIntervention ? <span className="text-emerald-600 font-bold">✔</span> : <span className="text-slate-300">—</span>}
                  </td>
                  <td className="py-2.5 text-center">
                    {r.manageSystem ? <span className="text-emerald-600 font-bold">✔</span> : <span className="text-slate-300">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
