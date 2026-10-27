import React, { useState, useEffect } from 'react';
import {
  FileCheck,
  Check,
  X,
  Clock,
  CheckCircle2,
  UserCheck,
  ArrowRight,
  TrendingUp,
  AlertTriangle,
  Sparkles,
  RotateCcw,
  RefreshCw,
  Info,
  ShieldAlert,
  HelpCircle,
  FileText
} from 'lucide-react';
import { api } from '../services/api';
import { InterventionItem, UserProfile } from '../types/hospital';

interface InterventionsViewProps {
  currentUser?: UserProfile | null;
}

export const InterventionsView: React.FC<InterventionsViewProps> = ({ currentUser: propUser }) => {
  const [interventions, setInterventions] = useState<InterventionItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIntervention, setSelectedIntervention] = useState<InterventionItem | null>(null);

  // Reject modal
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('Chưa phù hợp với phân bổ ngân sách và nhân lực ca trực.');

  // Action status message
  const [actionMsg, setActionMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [evaluatingId, setEvaluatingId] = useState<string | null>(null);

  const currentUser = propUser || api.getCurrentUser();
  const userRole = currentUser?.role || 'operator';
  const canApprove = userRole === 'director' || userRole === 'admin';
  const canExecuteTasks = ['operator', 'department_manager', 'lab_staff', 'maintenance', 'admin'].includes(userRole);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await api.listInterventions();
      setInterventions(data);
      if (data.length > 0) {
        if (!selectedIntervention) {
          setSelectedIntervention(data[0]);
        } else {
          const updated = data.find((x) => x.id === selectedIntervention.id);
          if (updated) setSelectedIntervention(updated);
        }
      }
    } catch (err: any) {
      console.error('Lỗi tải can thiệp:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [userRole]);

  const handleApprove = async (id: string) => {
    setActionMsg(null);
    try {
      await api.decideIntervention(id, 'approved');
      setActionMsg({ type: 'success', text: `Ban Giám đốc đã phê duyệt phương án ${id} thành công!` });
      await loadData();
    } catch (err: any) {
      setActionMsg({ type: 'error', text: err.message || 'Lỗi phê duyệt' });
    }
  };

  const handleRejectConfirm = async () => {
    if (!rejectId) return;
    if (!rejectReason.trim()) {
      alert('Vui lòng nhập lý do từ chối.');
      return;
    }
    setActionMsg(null);
    try {
      await api.decideIntervention(rejectId, 'rejected', rejectReason);
      setActionMsg({ type: 'success', text: `Đã từ chối phương án ${rejectId}.` });
      setRejectId(null);
      await loadData();
    } catch (err: any) {
      setActionMsg({ type: 'error', text: err.message || 'Lỗi từ chối' });
    }
  };

  const handleTaskToggle = async (taskId: string, currentStatus: string) => {
    if (!canExecuteTasks) {
      alert('Tài khoản của bạn không có quyền cập nhật tiến độ nhiệm vụ vận hành.');
      return;
    }
    setActionMsg(null);
    try {
      const nextStatus = currentStatus === 'completed' ? 'in_progress' : 'completed';
      await api.updateTask(taskId, nextStatus);
      await loadData();
    } catch (err: any) {
      setActionMsg({ type: 'error', text: err.message || 'Lỗi cập nhật nhiệm vụ' });
    }
  };

  const handleEvaluate = async (id: string) => {
    setEvaluatingId(id);
    setActionMsg(null);
    try {
      const res = await api.evaluateIntervention(id);
      setActionMsg({ type: 'success', text: `Đánh giá hậu can thiệp ${id} thành công!` });
      await loadData();
    } catch (err: any) {
      setActionMsg({ type: 'error', text: err.message || 'Lỗi đánh giá' });
    } finally {
      setEvaluatingId(null);
    }
  };

  const handleRollback = async (id: string) => {
    if (!confirm(`Bạn có chắc muốn rollback hoàn tác phương án can thiệp ${id}?`)) return;
    setActionMsg(null);
    try {
      await api.rollbackIntervention(id);
      setActionMsg({ type: 'success', text: `Đã hoàn tác (rollback) phương án ${id} về trạng thái ban đầu.` });
      await loadData();
    } catch (err: any) {
      setActionMsg({ type: 'error', text: err.message || 'Lỗi rollback' });
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Quản lý Can thiệp, Phê duyệt & Đánh giá Vận hành
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Chu trình Human-in-the-loop: Đề xuất &rarr; Phê duyệt Giám đốc &rarr; Phân rã nhiệm vụ &rarr; Đánh giá kết quả thực tế
          </p>
        </div>

        <div className="flex items-center space-x-2 text-xs bg-blue-50 text-blue-700 px-3 py-1.5 rounded-xl border border-blue-200 font-medium">
          <FileCheck className="w-4 h-4 text-blue-600" />
          <span>Vai trò hiện tại: <strong className="font-bold">{currentUser?.full_name || userRole}</strong></span>
        </div>
      </div>

      {actionMsg && (
        <div className={`p-3 rounded-xl border text-xs font-medium flex items-center space-x-2 ${
          actionMsg.type === 'success'
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
            : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          {actionMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> : <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />}
          <span>{actionMsg.text}</span>
        </div>
      )}

      {/* Main Grid: Left List (7 cols), Right Evaluation Details (5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left: Interventions List */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-xs text-slate-500 uppercase tracking-wider">
              Danh sách phương án can thiệp ({interventions.length})
            </h3>
            <button
              onClick={loadData}
              disabled={loading}
              className="text-slate-400 hover:text-slate-600 text-xs flex items-center space-x-1"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Làm mới</span>
            </button>
          </div>

          {interventions.map((item) => {
            const isPending = item.status === 'pending_approval';
            const isApproved = item.status === 'approved' || item.status === 'in_progress';
            const isEvaluated = item.status === 'evaluated' || item.status === 'completed';
            const isRejected = item.status === 'rejected';
            const isSelected = selectedIntervention?.id === item.id;

            return (
              <div
                key={item.id}
                onClick={() => setSelectedIntervention(item)}
                className={`bg-white rounded-2xl border p-5 shadow-2xs space-y-4 cursor-pointer transition-all ${
                  isSelected ? 'border-blue-500 ring-2 ring-blue-100' : 'border-slate-200'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-mono font-bold bg-blue-100 text-blue-800 px-2 py-0.5 rounded-md">
                        {item.id}
                      </span>
                      <h3 className="font-extrabold text-sm text-slate-900">
                        {item.title}
                      </h3>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      Khu vực: <strong>{item.target_room_id}</strong> • Đề xuất bởi: {item.proposed_by}
                      {item.simulation_run_id && (
                        <span> • Căn cứ SimPy: <strong className="font-mono text-blue-700">{item.simulation_run_id}</strong></span>
                      )}
                    </p>
                  </div>

                  <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                    isEvaluated
                      ? 'bg-purple-50 text-purple-700 border border-purple-200'
                      : isApproved
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : isRejected
                      ? 'bg-red-50 text-red-700 border border-red-200'
                      : 'bg-amber-50 text-amber-700 border border-amber-200 animate-pulse'
                  }`}>
                    {item.status === 'evaluated' ? 'Đã đánh giá' : item.status === 'in_progress' ? 'Đang thực thi' : item.status === 'approved' ? 'Đã duyệt' : item.status === 'rejected' ? 'Bị từ chối' : 'Chờ Giám đốc duyệt'}
                  </span>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs text-slate-700 space-y-2">
                  <p><strong>Nội dung:</strong> {item.description}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                    <div>
                      <span className="text-slate-400 block">Nguồn lực can thiệp:</span>
                      <strong className="text-slate-800">{item.resource_delta || 'Cấu hình tiêu chuẩn'}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Kỳ vọng kết quả:</span>
                      <strong className="text-emerald-700">{item.expected_impact || 'Theo mô phỏng'}</strong>
                    </div>
                  </div>
                </div>

                {/* Director Approval / Reject Actions */}
                {isPending && (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-slate-100">
                    <span className="text-[11px] text-slate-500">
                      {canApprove ? (
                        <span className="text-emerald-700 font-medium">Bạn có quyền phê duyệt với vai trò Ban Giám đốc/Admin.</span>
                      ) : (
                        <span className="text-amber-800 font-medium flex items-center space-x-1">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-600 inline shrink-0" />
                          <span>Chỉ Ban Giám đốc (Director) hoặc Quản trị viên mới có quyền phê duyệt.</span>
                        </span>
                      )}
                    </span>

                    <div className="flex items-center space-x-2 shrink-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!canApprove) {
                            alert('Chỉ tài khoản Ban Giám đốc mới có quyền từ chối phương án.');
                            return;
                          }
                          setRejectId(item.id);
                        }}
                        disabled={!canApprove}
                        className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors flex items-center space-x-1 ${
                          canApprove
                            ? 'bg-white hover:bg-red-50 text-red-600 border border-red-200'
                            : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                        }`}
                        title={!canApprove ? 'Yêu cầu quyền Giám đốc để thao tác' : ''}
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>Từ chối</span>
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!canApprove) {
                            alert('Chỉ tài khoản Ban Giám đốc mới có quyền phê duyệt phương án.');
                            return;
                          }
                          handleApprove(item.id);
                        }}
                        disabled={!canApprove}
                        className={`text-xs font-semibold px-4 py-1.5 rounded-lg transition-colors flex items-center space-x-1 shadow-xs ${
                          canApprove
                            ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                            : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                        }`}
                        title={!canApprove ? 'Yêu cầu quyền Giám đốc để thao tác' : ''}
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Phê duyệt triển khai</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Tasks Execution List */}
                {(isApproved || isEvaluated) && item.tasks && item.tasks.length > 0 && (
                  <div className="pt-3 border-t border-slate-100">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-slate-700">
                        Nhiệm vụ triển khai thực tế (Task Tracking):
                      </span>
                      <span className="text-[11px] text-slate-400 font-medium">
                        {canExecuteTasks ? 'Nhấn vào nhiệm vụ để hoàn tất' : 'Chỉ bộ phận vận hành được cập nhật'}
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      {item.tasks.map((task) => {
                        const isDone = task.status === 'completed';
                        return (
                          <div
                            key={task.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleTaskToggle(task.id, task.status);
                            }}
                            className={`flex items-center justify-between p-2.5 rounded-xl border text-xs transition-colors ${
                              isDone ? 'bg-slate-50 border-slate-200' : 'bg-white border-blue-200 hover:bg-blue-50/50'
                            } ${canExecuteTasks ? 'cursor-pointer' : 'cursor-default'}`}
                          >
                            <div className="flex items-center space-x-2.5">
                              <div className={`w-4 h-4 rounded-md border flex items-center justify-center ${
                                isDone ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-slate-300'
                              }`}>
                                {isDone && <Check className="w-3 h-3" />}
                              </div>
                              <span className={isDone ? 'line-through text-slate-400' : 'text-slate-800 font-semibold'}>
                                {task.title}
                              </span>
                            </div>

                            <span className="text-[11px] text-slate-500 font-mono">
                              {task.assigned_to}
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    {/* Action buttons: Evaluate & Rollback */}
                    <div className="flex items-center justify-between pt-3 mt-2 border-t border-slate-100">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRollback(item.id);
                        }}
                        className="text-xs text-slate-500 hover:text-red-600 flex items-center space-x-1"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Hoàn tác (Rollback)</span>
                      </button>

                      {item.status !== 'evaluated' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEvaluate(item.id);
                          }}
                          disabled={evaluatingId === item.id}
                          className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold text-xs px-3.5 py-1.5 rounded-xl flex items-center space-x-1.5 shadow-xs transition-colors"
                        >
                          {evaluatingId === item.id ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <TrendingUp className="w-3.5 h-3.5" />}
                          <span>Đánh giá kết quả hậu can thiệp</span>
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {interventions.length === 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-xs text-slate-400">
              Chưa có phương án can thiệp nào. Hãy chạy mô phỏng và gửi đề xuất từ phân hệ Mô phỏng.
            </div>
          )}
        </div>

        {/* Right: Post-Intervention Evaluation Details */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4">
            <h3 className="font-extrabold text-sm text-slate-900 flex items-center space-x-2">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              <span>Đánh giá Hậu Can thiệp (Post-Evaluation)</span>
            </h3>

            {selectedIntervention?.evaluation ? (
              <div className="space-y-4 text-xs">
                <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl text-blue-900 text-xs">
                  <strong>Phương án đang xem:</strong> {selectedIntervention.id} — {selectedIntervention.title}
                  <div className="text-[11px] text-blue-700 mt-0.5">
                    Thời điểm đánh giá: <span className="font-mono">{selectedIntervention.evaluation.evaluated_at || '10:24:36'}</span>
                  </div>
                </div>

                {/* 3-Pillar Comparison from Real API */}
                <div className="space-y-3">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-[11px] text-slate-500 font-semibold block">Hàng đợi ghi nhận (Queue Length)</span>
                    <div className="grid grid-cols-3 gap-2 mt-2 text-center">
                      <div className="bg-white p-2 rounded-lg border border-slate-200">
                        <span className="text-[10px] text-slate-400 block">Hiện trạng trước</span>
                        <span className="font-bold text-red-500 text-sm">
                          {selectedIntervention.evaluation.baseline?.queue_length ?? '—'}
                        </span>
                      </div>
                      <div className="bg-white p-2 rounded-lg border border-slate-200">
                        <span className="text-[10px] text-slate-400 block">Dự báo mô phỏng</span>
                        <span className="font-bold text-blue-600 text-sm">
                          {selectedIntervention.evaluation.predicted?.queue ?? '—'}
                        </span>
                      </div>
                      <div className="bg-white p-2 rounded-lg border border-slate-200">
                        <span className="text-[10px] text-slate-400 block">Thực tế quan sát</span>
                        <span className="font-bold text-emerald-600 text-sm">
                          {selectedIntervention.evaluation.observed?.queue_length ?? '—'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-[11px] text-slate-500 font-semibold block">Thời gian chờ trung vị (Phút)</span>
                    <div className="grid grid-cols-3 gap-2 mt-2 text-center">
                      <div className="bg-white p-2 rounded-lg border border-slate-200">
                        <span className="text-[10px] text-slate-400 block">Hiện trạng trước</span>
                        <span className="font-bold text-red-500 text-sm">
                          {selectedIntervention.evaluation.baseline?.median_waiting_time ?? '—'}p
                        </span>
                      </div>
                      <div className="bg-white p-2 rounded-lg border border-slate-200">
                        <span className="text-[10px] text-slate-400 block">Dự báo mô phỏng</span>
                        <span className="font-bold text-blue-600 text-sm">
                          {selectedIntervention.evaluation.predicted?.waiting_minutes ?? '—'}p
                        </span>
                      </div>
                      <div className="bg-white p-2 rounded-lg border border-slate-200">
                        <span className="text-[10px] text-slate-400 block">Thực tế quan sát</span>
                        <span className="font-bold text-emerald-600 text-sm">
                          {selectedIntervention.evaluation.observed?.median_waiting_time ?? '—'}p
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Research limitation notice from Backend API */}
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs leading-relaxed">
                  <div className="flex items-center space-x-1.5 font-bold mb-1">
                    <Info className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Giới hạn nghiên cứu & Căn cứ dữ liệu</span>
                  </div>
                  <p className="text-[11px]">
                    {selectedIntervention.evaluation.limitation ||
                      'Quan sát là dữ liệu demo; số đo hiện tại khác thống kê cả chân trời mô phỏng, chưa phải ước lượng tác động nhân quả.'}
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-xs text-slate-500 space-y-3">
                <p>
                  Chọn một phương án can thiệp đã triển khai xong các nhiệm vụ và nhấn <strong>Đánh giá kết quả hậu can thiệp</strong> để đối chiếu ba mốc: Hiện trạng, Dự báo và Thực tế.
                </p>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-slate-400 text-center py-6">
                  Chưa có dữ liệu đánh giá cho phương án được chọn
                </div>
              </div>
            )}
          </div>

          {/* Audit History Card */}
          {selectedIntervention?.audit_history && selectedIntervention.audit_history.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-3">
              <h4 className="font-extrabold text-xs text-slate-800 uppercase tracking-wider flex items-center space-x-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>Nhật ký kiểm toán (Audit Trail)</span>
              </h4>

              <div className="space-y-2 text-xs">
                {selectedIntervention.audit_history.map((log: any, idx: number) => (
                  <div key={idx} className="p-2 rounded-lg bg-slate-50 border border-slate-100 text-slate-700">
                    <div className="flex items-center justify-between text-[10px] text-slate-400">
                      <span className="font-mono font-bold text-blue-700">{log.action}</span>
                      <span>{log.timestamp?.split('T')[1]?.substring(0, 8) || log.timestamp}</span>
                    </div>
                    <div className="text-[11px] font-medium text-slate-800 mt-0.5">
                      Tác nhân: <span className="font-semibold">{log.actor}</span>
                    </div>
                    {log.details && (
                      <div className="text-[10px] text-slate-500 mt-0.5">{log.details}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Reject Modal */}
      {rejectId && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 space-y-3 shadow-xl border border-slate-200 text-xs">
            <h3 className="font-black text-sm text-slate-900">
              Nhập lý do từ chối phương án can thiệp {rejectId}
            </h3>
            <p className="text-slate-500">
              Lý do từ chối sẽ được lưu vào lịch sử kiểm toán của hệ thống và phản hồi lại cho người đề xuất.
            </p>

            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800"
              placeholder="Nhập lý do cụ thể..."
            />

            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setRejectId(null)}
                className="px-3 py-1.5 rounded-xl border border-slate-200 text-slate-600 font-semibold hover:bg-slate-50"
              >
                Hủy
              </button>
              <button
                onClick={handleRejectConfirm}
                className="bg-red-600 hover:bg-red-700 text-white font-semibold px-4 py-1.5 rounded-xl shadow-xs"
              >
                Xác nhận từ chối
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
