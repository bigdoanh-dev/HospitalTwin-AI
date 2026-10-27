import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import {
  Bot,
  Play,
  Pause,
  X,
  ClipboardList,
  FileText,
  GraduationCap,
  ShieldCheck,
  ArrowRight,
  Database,
  Sparkles,
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import { EducationDemo } from './useEducationDemo';
import { agents } from './model';

interface AgentsViewProps {
  demo: EducationDemo;
}

export const AgentsView: React.FC<AgentsViewProps> = ({ demo }) => {
  const { state, actions } = demo;
  const { run, events, plans } = state;
  const latestPlan = plans[0] || null;
  const shouldReduceMotion = useReducedMotion();

  const isRunning = run.status === 'running';
  const isPaused = run.status === 'paused';
  const isCompleted = run.status === 'completed';
  const isCancelled = run.status === 'cancelled';

  return (
    <motion.div
      initial={shouldReduceMotion ? false : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18 }}
      className="space-y-6 max-w-7xl mx-auto pb-8"
    >
      {/* Title */}
      <div>
        <h1 className="text-2xl sm:text-[30px] font-black text-slate-900 tracking-tight leading-tight">
          Tác nhân AI
        </h1>
        <p className="text-sm text-slate-500 font-medium mt-0.5">
          Mô phỏng 4 tác nhân đề xuất lộ trình từ bài luyện tập và học liệu mẫu.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Goal & 4 Agents (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Goal & Run Trigger Card */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-2xs space-y-4">
            <h2 className="font-extrabold text-base text-slate-900 flex items-center space-x-2">
              <Bot className="w-5 h-5 text-blue-600" />
              <span>Mục tiêu học tập</span>
            </h2>

            <div>
              <label htmlFor="goal-input" className="block text-xs font-bold text-slate-700 mb-1.5">
                Nội dung trọng tâm cần đạt:
              </label>
              <textarea
                id="goal-input"
                rows={3}
                value={state.goal}
                onChange={(e) => actions.setGoal(e.target.value)}
                disabled={isRunning}
                placeholder="Nhập mục tiêu cụ thể, ví dụ: Nhận biết đỉnh và chiều biến thiên của parabol..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs sm:text-sm text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500 disabled:opacity-60 leading-relaxed"
              />
            </div>

            {/* Run Action Controls */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
              <div className="flex items-center space-x-2">
                {!isRunning && !isPaused && (
                  <button
                    type="button"
                    onClick={actions.startRun}
                    className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-xs transition-colors cursor-pointer"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Tạo lộ trình</span>
                  </button>
                )}

                {isRunning && (
                  <button
                    type="button"
                    onClick={actions.pauseRun}
                    className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-amber-800 bg-amber-100 hover:bg-amber-200 transition-colors cursor-pointer"
                  >
                    <Pause className="w-3.5 h-3.5" />
                    <span>Tạm dừng</span>
                  </button>
                )}

                {isPaused && (
                  <button
                    type="button"
                    onClick={actions.resumeRun}
                    className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors cursor-pointer"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Tiếp tục</span>
                  </button>
                )}

                {(isRunning || isPaused) && (
                  <button
                    type="button"
                    onClick={actions.cancelRun}
                    className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-700 hover:bg-rose-50 transition-colors cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Hủy</span>
                  </button>
                )}
              </div>

              {/* Status indicator */}
              <div className="text-xs">
                {isRunning && (
                  <span className="font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-3 py-1 rounded-full animate-pulse">
                    Đang xử lý bước {run.completed + 1}/4...
                  </span>
                )}
                {isPaused && (
                  <span className="font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1 rounded-full">
                    Đang tạm dừng
                  </span>
                )}
                {isCompleted && (
                  <span className="font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">
                    ✓ Hoàn thành
                  </span>
                )}
                {isCancelled && (
                  <span className="font-semibold text-rose-700 bg-rose-50 border border-rose-200 px-3 py-1 rounded-full">
                    Đã hủy
                  </span>
                )}
                {run.status === 'idle' && (
                  <span className="text-slate-400 font-medium">
                    Sẵn sàng
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* 4 Agent Rows */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-2xs space-y-3.5">
            <h3 className="font-extrabold text-sm text-slate-900">
              4 Tác nhân chuyên trách
            </h3>

            <div className="space-y-2.5">
              {agents.map((ag, idx) => {
                const isCurrent = isRunning && run.completed === idx;
                const isDone = run.completed > idx;

                const getIcon = () => {
                  if (ag.id === 'planner') return ClipboardList;
                  if (ag.id === 'knowledge') return FileText;
                  if (ag.id === 'tutor') return GraduationCap;
                  return ShieldCheck;
                };
                const Icon = getIcon();

                return (
                  <div
                    key={ag.id}
                    className={`p-3 rounded-xl border transition-all ${
                      isCurrent
                        ? 'bg-blue-50/80 border-blue-300 shadow-2xs'
                        : isDone
                        ? 'bg-slate-50/70 border-emerald-200'
                        : 'bg-white border-slate-200/80'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                          isCurrent
                            ? 'bg-blue-600 text-white animate-pulse'
                            : isDone
                            ? 'bg-emerald-600 text-white'
                            : 'bg-slate-100 text-slate-500'
                        }`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-bold text-xs sm:text-sm text-slate-900">
                              {idx + 1}. {ag.name}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                            {ag.description}
                          </p>
                        </div>
                      </div>

                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${
                        isCurrent
                          ? 'bg-blue-100 text-blue-800 animate-pulse'
                          : isDone
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'text-slate-400'
                      }`}>
                        {isCurrent ? 'Đang chạy...' : isDone ? '✓ Hoàn thành' : 'Chờ'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Latest Draft & Events (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Latest Proposed Plan (Draft) */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-sm text-slate-900 flex items-center space-x-1.5">
                <Sparkles className="w-4 h-4 text-blue-600" />
                <span>Bản đề xuất lộ trình mới nhất</span>
              </h3>
              {latestPlan && (
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  latestPlan.status === 'approved'
                    ? 'bg-emerald-100 text-emerald-800'
                    : latestPlan.status === 'changes_requested'
                    ? 'bg-rose-100 text-rose-800'
                    : 'bg-amber-100 text-amber-800'
                }`}>
                  {latestPlan.status === 'approved'
                    ? 'Đã duyệt'
                    : latestPlan.status === 'changes_requested'
                    ? 'Yêu cầu sửa'
                    : 'Chờ giáo viên duyệt'}
                </span>
              )}
            </div>

            {/* Teacher Feedback Banner when changes requested */}
            {latestPlan && latestPlan.status === 'changes_requested' && (
              <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-xs text-rose-900 space-y-1.5">
                <div className="flex items-center space-x-1.5 font-bold text-rose-800">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>Ý kiến phản hồi từ Giáo viên:</span>
                </div>
                <p className="italic pl-5 leading-relaxed">
                  "{latestPlan.feedback || 'Cần điều chỉnh lại các bước học tập cho sát với năng lực học sinh.'}"
                </p>
                <div className="pt-1 pl-5">
                  <button
                    type="button"
                    onClick={actions.startRun}
                    className="inline-flex items-center space-x-1 font-bold text-blue-700 hover:text-blue-900 transition-colors cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Tạo lại lộ trình mới từ mục tiêu trên</span>
                  </button>
                </div>
              </div>
            )}

            {latestPlan ? (
              <div className="space-y-3 bg-slate-50/70 border border-slate-200 rounded-xl p-3.5 text-xs">
                <div>
                  <span className="font-mono text-[10px] text-slate-400 block">{latestPlan.id}</span>
                  <div className="font-bold text-sm text-slate-900 mt-0.5">{latestPlan.title}</div>
                  <div className="text-xs text-slate-600 mt-0.5">Mục tiêu: {latestPlan.goal}</div>
                </div>

                <div className="space-y-1.5 pt-1 border-t border-slate-200">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                    3 Bước đề xuất:
                  </span>
                  {latestPlan.steps.map((st, i) => (
                    <div key={i} className="flex items-start space-x-2 bg-white p-2 rounded-lg border border-slate-200/80">
                      <span className="font-bold text-blue-600 text-xs">{i + 1}.</span>
                      <span className="text-slate-800 leading-relaxed text-xs">{st}</span>
                    </div>
                  ))}
                </div>

                <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => actions.setPage('teacher')}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-3 rounded-xl text-xs flex items-center justify-center space-x-1.5 transition-colors shadow-2xs cursor-pointer"
                  >
                    <span>Xem ở trang Giáo viên duyệt</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-6 text-center text-slate-400 text-xs border border-dashed border-slate-200 rounded-xl space-y-1.5">
                <Bot className="w-6 h-6 mx-auto text-slate-300" />
                <p className="font-medium text-slate-500">Chưa có đề xuất nào</p>
                <p className="text-[11px]">Bấm "Tạo lộ trình" ở trên để tác nhân tạo bản đề xuất đầu tiên.</p>
              </div>
            )}
          </div>

          {/* Summarized Events Stream */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs space-y-3">
            <h3 className="font-extrabold text-sm text-slate-900 flex items-center space-x-2">
              <Database className="w-4 h-4 text-blue-600" />
              <span>Nhật ký phối hợp tác nhân</span>
            </h3>

            {events.length > 0 ? (
              <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1">
                {events.map((ev) => (
                  <div key={ev.id} className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-0.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800 text-[11px]">
                        {ev.title}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {ev.source}
                      </span>
                    </div>
                    <p className="text-slate-600 text-xs leading-relaxed">
                      {ev.detail}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic py-2 text-center">
                Chưa có sự kiện nào trong phiên hiện tại.
              </p>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};
