import React, { useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import {
  ShieldCheck,
  CheckCircle2,
  UserCheck,
  Clock,
  Info,
  Check
} from 'lucide-react';
import { EducationDemo } from './useEducationDemo';
import { Plan } from './model';

interface TeacherViewProps {
  demo: EducationDemo;
}

export const TeacherView: React.FC<TeacherViewProps> = ({ demo }) => {
  const { state, actions } = demo;
  const isTeacher = state.role === 'teacher';
  const shouldReduceMotion = useReducedMotion();

  const pendingPlans = state.plans.filter((p) => p.status === 'pending');
  const reviewedPlans = state.plans.filter((p) => p.status !== 'pending');

  return (
    <motion.div
      initial={shouldReduceMotion ? false : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18 }}
      className="space-y-6 max-w-7xl mx-auto pb-8"
    >
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-[30px] font-black text-slate-900 tracking-tight leading-tight">
            Giáo viên duyệt
          </h1>
          <p className="text-sm text-slate-500 font-medium mt-0.5">
            Kiểm tra và phê duyệt lộ trình trước khi giao cho học sinh.
          </p>
        </div>

        <div className="flex items-center space-x-2 text-xs bg-blue-50 text-blue-900 border border-blue-200 px-3 py-1.5 rounded-xl font-medium shrink-0 self-start sm:self-auto">
          <ShieldCheck className="w-4 h-4 text-blue-600" />
          <span>Kiểm duyệt sư phạm</span>
        </div>
      </div>

      {/* Role Reminder for Student */}
      {!isTeacher && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start space-x-3">
            <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-xs sm:text-sm text-amber-900">
              <span className="font-bold block">Bạn đang ở vai trò: Học sinh (Chỉ đọc)</span>
              <span>
                Để duyệt hoặc chỉnh sửa các bước của lộ trình, hãy chuyển sang vai trò <strong>Giáo viên</strong>.
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => actions.setRole('teacher')}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-semibold shadow-2xs transition-colors shrink-0 cursor-pointer"
          >
            Chuyển sang Giáo viên
          </button>
        </div>
      )}

      {/* Main Review Area */}
      <div className="space-y-6">
        {/* Pending Proposals Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-extrabold text-slate-900 flex items-center space-x-2">
              <Clock className="w-4 h-4 text-amber-600" />
              <span>Đề xuất chờ duyệt ({pendingPlans.length})</span>
            </h2>
            <span className="text-xs text-slate-400">
              Chỉ giao bài khi giáo viên phê duyệt
            </span>
          </div>

          {pendingPlans.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200/90 p-8 text-center space-y-2 shadow-2xs">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
              <h3 className="font-bold text-sm text-slate-800">
                Không có đề xuất nào đang chờ duyệt
              </h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                Khi tạo lộ trình mới ở trang <strong>Tác nhân AI</strong>, bản đề xuất sẽ tự động xuất hiện tại đây để giáo viên thẩm định.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingPlans.map((plan) => (
                <PendingPlanReviewCard
                  key={plan.id}
                  plan={plan}
                  isTeacher={isTeacher}
                  onDecide={(decision, feedback, steps) =>
                    actions.decide(plan.id, decision, feedback, steps)
                  }
                />
              ))}
            </div>
          )}
        </div>

        {/* Reviewed History Section */}
        {reviewedPlans.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs space-y-3">
            <h2 className="text-sm font-extrabold text-slate-900 flex items-center space-x-2">
              <UserCheck className="w-4 h-4 text-blue-600" />
              <span>Lịch sử duyệt gần đây</span>
            </h2>

            <div className="divide-y divide-slate-100">
              {reviewedPlans.map((p) => (
                <div key={p.id} className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-mono text-[10px] text-slate-400">{p.id}</span>
                      <strong className="text-slate-800 text-[13px]">{p.title}</strong>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        p.status === 'approved'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}>
                        {p.status === 'approved' ? '✓ Đã duyệt' : '⚠ Yêu cầu sửa'}
                      </span>
                    </div>
                    {p.feedback && (
                      <p className="text-xs text-slate-500 mt-0.5 italic">
                        Ý kiến giáo viên: "{p.feedback}"
                      </p>
                    )}
                  </div>

                  <span className="text-[10px] text-slate-400 font-mono">
                    {new Date(p.createdAt).toLocaleTimeString('vi-VN')}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};

interface PendingPlanReviewCardProps {
  plan: Plan;
  isTeacher: boolean;
  onDecide: (decision: 'approved' | 'changes_requested', feedback: string, steps: string[]) => void;
}

const PendingPlanReviewCard: React.FC<PendingPlanReviewCardProps> = ({
  plan,
  isTeacher,
  onDecide,
}) => {
  const [steps, setSteps] = useState<string[]>(plan.steps);
  const [feedback, setFeedback] = useState<string>(plan.feedback || '');

  const handleStepChange = (index: number, val: string) => {
    const next = [...steps];
    next[index] = val;
    setSteps(next);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-2xs space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-xs font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md">
              {plan.id}
            </span>
            <h3 className="font-extrabold text-base text-slate-900">
              {plan.title}
            </h3>
          </div>
          <p className="text-xs sm:text-sm text-slate-600 mt-1">
            <strong>Mục tiêu:</strong> {plan.goal}
          </p>
        </div>

        <span className="text-[11px] font-semibold text-amber-800 bg-amber-50 border border-amber-200 px-3 py-1 rounded-full self-start sm:self-auto">
          ● Chờ duyệt
        </span>
      </div>

      {/* Editable 3 Steps */}
      <div className="space-y-2.5">
        <label className="block text-xs font-bold text-slate-800">
          3 Bước học tập do tác nhân đề xuất (Giáo viên có thể chỉnh sửa):
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {steps.map((st, i) => (
            <div key={i} className="space-y-1">
              <span className="text-[11px] font-bold text-slate-500">
                Bước {i + 1}
              </span>
              <textarea
                rows={3}
                value={st}
                onChange={(e) => handleStepChange(i, e.target.value)}
                disabled={!isTeacher}
                aria-label={`Nội dung bước ${i + 1}`}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs sm:text-sm text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500 disabled:opacity-75 leading-relaxed"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Teacher Feedback Input */}
      <div className="space-y-1.5 pt-1">
        <label htmlFor={`feedback-${plan.id}`} className="block text-xs font-bold text-slate-800">
          Nhận xét & Hướng dẫn sư phạm:
        </label>
        <textarea
          id={`feedback-${plan.id}`}
          rows={2}
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          disabled={!isTeacher}
          placeholder={
            isTeacher
              ? 'Nhập nhận xét hoặc lý do yêu cầu chỉnh sửa (bắt buộc nếu yêu cầu sửa)...'
              : 'Chuyển sang vai trò Giáo viên để nhập nhận xét'
          }
          className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs sm:text-sm text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500 disabled:opacity-75 leading-relaxed"
        />
      </div>

      {/* Decision Buttons */}
      <div className="flex flex-wrap items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
        <button
          type="button"
          onClick={() => onDecide('changes_requested', feedback, steps)}
          disabled={!isTeacher}
          className="px-4 py-2 rounded-xl text-xs font-semibold text-amber-900 bg-amber-100 hover:bg-amber-200 disabled:opacity-50 transition-colors cursor-pointer"
        >
          Yêu cầu chỉnh sửa
        </button>

        <button
          type="button"
          onClick={() => onDecide('approved', feedback, steps)}
          disabled={!isTeacher}
          className="px-5 py-2 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 shadow-2xs transition-colors flex items-center space-x-1.5 cursor-pointer"
        >
          <Check className="w-3.5 h-3.5" />
          <span>Duyệt & giao bài</span>
        </button>
      </div>
    </div>
  );
};
