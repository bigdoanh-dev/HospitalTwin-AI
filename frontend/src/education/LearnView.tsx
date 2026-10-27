import React, { useState, useRef, useEffect } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import {
  Target,
  FileText,
  Network,
  Lightbulb,
  ArrowRight,
  RotateCcw,
  Sparkles,
  Send,
  CheckCircle2,
  XCircle,
  GraduationCap,
  ClipboardList,
  ShieldCheck,
  Bot,
  CheckCircle,
  ChevronRight,
  ExternalLink,
  HelpCircle
} from 'lucide-react';
import { EducationDemo } from './useEducationDemo';
import { ParabolaChart } from './ParabolaChart';
import { questions, resources, agents, Stage } from './model';

interface LearnViewProps {
  demo: EducationDemo;
  onOpenResetModal: () => void;
}

export const LearnView: React.FC<LearnViewProps> = ({ demo, onOpenResetModal }) => {
  const { state, actions, result } = demo;
  const [chatInput, setChatInput] = useState('');
  const shouldReduceMotion = useReducedMotion();
  const chatStream = useRef<HTMLDivElement>(null);
  useEffect(() => { const node = chatStream.current; if (node) node.scrollTop = node.scrollHeight; }, [state.chat.length]);
  const openResource = (id: string) => {
    actions.openResource(id);
    window.scrollTo({ top: 0, behavior: shouldReduceMotion ? 'instant' : 'smooth' });
  };

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    actions.sendMessage(chatInput);
    setChatInput('');
  };

  const stages: Array<{ id: Stage; label: string; number: number }> = [
    { id: 'discover', label: 'Khám phá', number: 1 },
    { id: 'practice', label: 'Luyện tập', number: 2 },
    { id: 'feedback', label: 'Phản hồi', number: 3 },
  ];

  return (
    <motion.div
      initial={shouldReduceMotion ? false : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18 }}
      className="space-y-4 max-w-7xl mx-auto"
    >
      {/* Page Title & Reset Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-[30px] font-black text-slate-900 tracking-tight leading-tight">
            Không gian học tập
          </h1>
          <p className="text-sm text-slate-500 font-medium mt-0.5">
            Một lộ trình rõ ràng, theo nhịp học của bạn.
          </p>
        </div>

        <button
          type="button"
          onClick={onOpenResetModal}
          className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-white border border-slate-200/90 hover:bg-slate-50 shadow-2xs transition-colors cursor-pointer self-start sm:self-auto"
          aria-label="Bắt đầu lại bài học"
        >
          <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
          <span>Bắt đầu lại</span>
        </button>
      </div>

      {/* Stepper: Full-width matching concept */}
      <div className="w-full px-1 sm:px-0 py-2">
        <div className="flex items-center justify-between w-full">
          {stages.map((st, idx) => {
            const isActive = state.stage === st.id;
            const isPassed =
              (st.id === 'discover' && (state.stage === 'practice' || state.stage === 'feedback')) ||
              (st.id === 'practice' && state.stage === 'feedback');

            return (
              <React.Fragment key={st.id}>
                <button
                  type="button"
                  onClick={() => actions.setStage(st.id)}
                  aria-current={isActive ? 'step' : undefined}
                  className="flex flex-1 sm:flex-none flex-col sm:flex-row items-center gap-1.5 sm:gap-2.5 group cursor-pointer min-w-0"
                >
                  <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    isActive
                      ? 'bg-blue-600 text-white ring-4 ring-blue-100 shadow-2xs'
                      : isPassed
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-slate-100 text-slate-500 group-hover:bg-slate-200'
                  }`}>
                    {st.number}
                  </span>
                  <span className={`text-[13px] font-bold transition-colors ${
                    isActive ? 'text-blue-700' : 'text-slate-600 group-hover:text-slate-900'
                  }`}>
                    {st.label}
                  </span>
                </button>

                {idx < stages.length - 1 && (
                  <div className="hidden sm:block flex-1 mx-4 sm:mx-8">
                    <div className={`h-0.5 rounded-full transition-colors ${
                      isPassed ? 'bg-blue-500' : 'bg-slate-200'
                    }`} />
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Main 2-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Lesson Stage Area (8 Cols) */}
        <div className="lg:col-span-8 space-y-6">
          {/* STAGE 1: KHÁM PHÁ (DISCOVER) */}
          {state.stage === 'discover' && (
            <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs space-y-3">
              {/* Header Badge & Title */}
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  TOÁN 10 · BÀI HỌC MẪU
                </span>
                <h2 className="text-xl sm:text-[26px] font-black text-slate-900 tracking-tight leading-snug">
                  Khám phá hàm số bậc hai
                </h2>
                <p className="text-sm text-slate-600 leading-relaxed mt-1">
                  Hàm số bậc hai có đồ thị là một parabol với nhiều đặc điểm thú vị. Trong bài học này, chúng ta sẽ tìm hiểu đỉnh và chiều biến thiên của parabol.
                </p>
              </div>

              {/* Goal Box */}
              <div className="bg-blue-50/70 border border-blue-200/80 rounded-xl p-3 sm:p-3.5 flex items-center space-x-2.5 text-xs sm:text-sm text-blue-900">
                <Target className="w-4 h-4 text-blue-600 shrink-0" />
                <span className="font-semibold">
                  Mục tiêu hôm nay: nhận biết đỉnh và chiều biến thiên của parabol.
                </span>
              </div>

              {/* Sub-tabs */}
              <div className="flex items-center space-x-1.5 border-b border-slate-100 pb-2">
                <button
                  type="button"
                  onClick={() => actions.setResourceTab('text')}
                  className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    state.resourceTab === 'text'
                      ? 'bg-slate-100 text-slate-900 shadow-2xs'
                      : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5 text-blue-600" />
                  <span>Văn bản</span>
                </button>
                <button
                  type="button"
                  onClick={() => actions.setResourceTab('diagram')}
                  className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    state.resourceTab === 'diagram'
                      ? 'bg-slate-100 text-slate-900 shadow-2xs'
                      : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                  }`}
                >
                  <Network className="w-3.5 h-3.5 text-blue-600" />
                  <span>Sơ đồ</span>
                </button>
                <button
                  type="button"
                  onClick={() => actions.setResourceTab('example')}
                  className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    state.resourceTab === 'example'
                      ? 'bg-slate-100 text-slate-900 shadow-2xs'
                      : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                  }`}
                >
                  <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
                  <span>Ví dụ</span>
                </button>
              </div>

              {/* Content Grid: items-start align */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
                {/* Left: Text explanation */}
                <div className="md:col-span-5 space-y-3 text-sm leading-relaxed text-slate-700">
                  {state.resourceTab === 'example' ? (
                    <div className="space-y-2 bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs">
                      <span className="font-bold text-slate-900 block text-[13px]">
                        Ví dụ tính toán từng bước:
                      </span>
                      <p>Hàm số: <code className="font-bold text-blue-700">y = x² − 2x − 3</code></p>
                      <p>1. Hệ số: <strong className="text-slate-900">a = 1, b = −2, c = −3</strong></p>
                      <p>2. Hoành độ đỉnh: <code className="bg-white px-1.5 py-0.5 rounded border border-slate-200">x = −b/(2a) = 1</code></p>
                      <p>3. Tung độ đỉnh: <code className="bg-white px-1.5 py-0.5 rounded border border-slate-200">y = 1² − 2(1) − 3 = −4</code></p>
                      <p className="font-semibold text-emerald-700">➜ Đỉnh: I(1; −4)</p>
                    </div>
                  ) : (
                    <>
                      <p className="font-medium text-slate-800">
                        Xét hàm số bậc hai:
                      </p>
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-center">
                        <span className="font-serif italic font-extrabold text-base text-blue-800">
                          y = x² − 2x − 3
                        </span>
                      </div>
                      <p className="text-xs text-slate-600">
                        Hoành độ đỉnh được tính bằng công thức x = −b/(2a). Thay vào hàm số để tìm tung độ đỉnh.
                      </p>

                      <div className="space-y-2 pt-1 text-xs">
                        <div className="flex items-start space-x-2.5">
                          <span className="w-5 h-5 rounded-full bg-blue-600 text-white font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                            1
                          </span>
                          <span>Đỉnh của parabol là <strong className="text-slate-900 font-semibold">I(1, −4)</strong>.</span>
                        </div>
                        <div className="flex items-start space-x-2.5">
                          <span className="w-5 h-5 rounded-full bg-blue-600 text-white font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                            2
                          </span>
                          <span>
                            Hàm số nghịch biến trên <strong className="text-slate-900 font-semibold">(−∞, 1)</strong> và đồng biến trên <strong className="text-slate-900 font-semibold">(1, +∞)</strong>.
                          </span>
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* Right: Parabola Chart SVG (clean, height ~265px) */}
                <div className="md:col-span-7">
                  <ParabolaChart key={state.resourceTab}
                    interactive={state.resourceTab === 'diagram'}
                    showHeader={state.resourceTab === 'diagram'}
                    showCaption={state.resourceTab === 'diagram'}
                  />
                </div>
              </div>

              {/* Action row */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => actions.setStage('practice')}
                  className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl font-semibold text-xs text-white bg-blue-600 hover:bg-blue-700 shadow-xs transition-colors cursor-pointer"
                >
                  <span>Luyện tập ngay</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <span className="text-[11px] text-slate-400 font-medium">
                  Nội dung mẫu đã được biên soạn sẵn.
                </span>
              </div>
            </div>
          )}

          {/* STAGE 2: LUYỆN TẬP (PRACTICE) */}
          {state.stage === 'practice' && (
            <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-2xs space-y-5">
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  TOÁN 10 · BÀI LUYỆN TẬP
                </span>
                <h2 className="text-xl sm:text-[26px] font-black text-slate-900 tracking-tight leading-snug">
                  Luyện tập nhanh
                </h2>
                <p className="text-sm text-slate-600 mt-1">
                  Chọn đáp án chính xác cho 2 câu hỏi sau để hệ thống tác nhân xác định trọng tâm cần củng cố.
                </p>
              </div>

              <div className="space-y-4">
                {questions.map((q, idx) => (
                  <div key={q.id} className="bg-slate-50/70 border border-slate-200/90 rounded-2xl p-4 sm:p-5 space-y-3">
                    <div className="flex items-start space-x-2.5">
                      <span className="w-6 h-6 rounded-lg bg-blue-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <p className="font-bold text-sm text-slate-900 leading-snug">
                        {q.question}
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1 pl-8">
                      {q.options.map((opt) => {
                        const isSelected = state.answers[q.id] === opt;
                        return (
                          <button
                            key={opt}
                            type="button"
                            onClick={() => actions.answer(q.id, opt)}
                            className={`p-3 rounded-xl border text-left text-xs font-semibold transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                                : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                            }`}
                          >
                            {opt}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => actions.setStage('discover')}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 transition-colors cursor-pointer"
                >
                  ← Quay lại lý thuyết
                </button>

                <button
                  type="button"
                  onClick={actions.submitQuiz}
                  className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl font-semibold text-xs text-white bg-blue-600 hover:bg-blue-700 shadow-xs transition-colors cursor-pointer"
                >
                  <span>Nộp bài & Xem phản hồi</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STAGE 3: PHẢN HỒI (FEEDBACK) */}
          {state.stage === 'feedback' && (
            <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-2xs space-y-5">
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  BÀI LUYỆN TẬP MẪU
                </span>
                <h2 className="text-xl sm:text-[26px] font-black text-slate-900 tracking-tight leading-snug">
                  Phản hồi bài làm
                </h2>
              </div>

              {/* Score Banner */}
              <div className={`rounded-2xl p-4 border flex items-center justify-between ${
                result.correct === result.total
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : 'bg-amber-50 border-amber-200 text-amber-900'
              }`}>
                <div className="flex items-center space-x-3">
                  {result.correct === result.total ? (
                    <CheckCircle className="w-6 h-6 text-emerald-600 shrink-0" />
                  ) : (
                    <HelpCircle className="w-6 h-6 text-amber-600 shrink-0" />
                  )}
                  <div>
                    <h3 className="font-extrabold text-sm">
                      Kết quả: {result.correct}/{result.total} câu trả lời chính xác
                    </h3>
                    <p className="text-xs opacity-90 mt-0.5">
                      {result.correct === result.total
                        ? 'Bạn trả lời đúng cả hai câu trong bài luyện tập mẫu.'
                        : 'Bạn đã hoàn thành bài kiểm tra. Hãy xem lại giải thích chi tiết phía dưới.'}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={actions.retryQuiz}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Làm lại
                </button>
              </div>

              {/* Question details */}
              <div className="space-y-4">
                {questions.map((q, idx) => {
                  const userAnswer = state.answers[q.id];
                  const isCorrect = userAnswer === q.correct;

                  return (
                    <div key={q.id} className="bg-slate-50/70 border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-2.5">
                          <span className="w-5 h-5 rounded-md bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center shrink-0">
                            {idx + 1}
                          </span>
                          <div>
                            <p className="font-bold text-xs sm:text-sm text-slate-900">
                              {q.question}
                            </p>
                            <div className="flex items-center space-x-2 mt-1.5 text-xs">
                              <span>Bạn chọn: <strong className={isCorrect ? 'text-emerald-700' : 'text-rose-700'}>{userAnswer || '(chưa chọn)'}</strong></span>
                              {isCorrect ? (
                                <span className="inline-flex items-center space-x-1 text-emerald-700 font-semibold text-[11px]">
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span>Đúng</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center space-x-1 text-rose-700 font-semibold text-[11px]">
                                  <XCircle className="w-3.5 h-3.5" />
                                  <span>Đáp án đúng: {q.correct}</span>
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="bg-white p-3 rounded-xl border border-slate-200/80 text-xs text-slate-700 space-y-1.5">
                        <div className="font-semibold text-slate-900 flex items-center justify-between">
                          <span>Giải thích chi tiết:</span>
                          <button
                            type="button"
                            onClick={() => openResource(q.source)}
                            className="text-blue-600 hover:text-blue-800 text-[11px] font-medium flex items-center space-x-1 cursor-pointer"
                          >
                            <span>Xem tài liệu mẫu</span>
                            <ExternalLink className="w-3 h-3" />
                          </button>
                        </div>
                        <p className="leading-relaxed">{q.explanation}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Next Action: Generate Agent Plan */}
              <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h4 className="font-extrabold text-sm text-blue-950">
                    Sẵn sàng cho kế hoạch học tập tùy chỉnh?
                  </h4>
                  <p className="text-xs text-blue-800 mt-0.5">
                    Hệ thống 4 tác nhân AI sẽ phân tích kết quả và đề xuất 3 bước học phù hợp.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => actions.setPage('agents')}
                  className="px-4 py-2.5 rounded-xl font-semibold text-xs text-white bg-blue-600 hover:bg-blue-700 shadow-2xs transition-colors flex items-center space-x-1.5 shrink-0 cursor-pointer"
                >
                  <Bot className="w-4 h-4" />
                  <span>Chuyển sang Tác nhân AI</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* PUBLISHED PLAN (IF APPROVED BY TEACHER) */}
          {state.publishedPlan && (
            <div className="bg-emerald-50/50 border border-emerald-200 rounded-2xl p-5 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full">
                    Lộ trình đã được giáo viên phê duyệt
                  </span>
                </div>
                <span className="text-[11px] font-mono text-emerald-700">
                  {state.publishedPlan.id}
                </span>
              </div>

              <div>
                <h3 className="font-black text-base text-slate-900">
                  {state.publishedPlan.title}
                </h3>
                <p className="text-xs text-slate-600 mt-0.5">
                  Mục tiêu: {state.publishedPlan.goal}
                </p>
              </div>

              {/* 3 Steps */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {state.publishedPlan.steps.map((st, i) => (
                  <div key={i} className="bg-white p-3 rounded-xl border border-emerald-200 text-xs space-y-1 shadow-2xs">
                    <span className="font-bold text-emerald-700 text-[11px] block">
                      Bước {i + 1}
                    </span>
                    <p className="text-slate-800 leading-relaxed font-medium">
                      {st}
                    </p>
                  </div>
                ))}
              </div>

              {state.publishedPlan.feedback && (
                <div className="text-xs text-emerald-900 bg-white/80 p-2.5 rounded-xl border border-emerald-100 italic">
                  <strong>Nhận xét từ giáo viên:</strong> "{state.publishedPlan.feedback}"
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Column: Chat Box (~290px) & 4 Agents Box (4 Cols) */}
        <div className="lg:col-span-4 space-y-5">
          {/* Box 1: Trợ lý học tập (Chat box: h-[290px] desktop, content scrollable) */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-2xs flex flex-col h-[290px]">
            <div className="flex items-center space-x-2 pb-2 border-b border-slate-100 shrink-0">
              <Sparkles className="w-4 h-4 text-blue-600" />
              <h3 className="font-extrabold text-xs text-slate-900">
                Trợ lý học tập
              </h3>
            </div>

            {/* Chat Stream (Scrollable) */}
            <div ref={chatStream} role="log" aria-label="Trao đổi với trợ lý học tập" className="flex-1 overflow-y-auto space-y-2.5 py-2 pr-1 text-xs min-h-0">
              {state.chat.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[92%] p-2.5 rounded-2xl leading-relaxed text-[12px] ${
                      msg.role === 'user'
                        ? 'bg-blue-600 text-white rounded-tr-xs font-medium'
                        : 'bg-blue-50/80 text-blue-950 border border-blue-100 rounded-tl-xs'
                    }`}
                  >
                    {msg.text}
                  </div>

                  {msg.source && (
                    <button
                      type="button"
                      onClick={() => openResource(msg.source!)}
                      className="mt-0.5 text-[10px] font-medium text-blue-600 hover:text-blue-800 inline-flex items-center space-x-0.5 cursor-pointer"
                    >
                      <span>Nguồn học liệu</span>
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Quick suggested chips */}
            <div className="py-1.5 flex items-center space-x-1.5 overflow-x-auto text-[10px] shrink-0 border-t border-slate-50">
              <button
                type="button"
                onClick={() => actions.sendMessage('Giải thích đỉnh parabol')}
                className="whitespace-nowrap bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full font-medium transition-colors cursor-pointer"
              >
                Giải thích đỉnh parabol
              </button>
              <button
                type="button"
                onClick={() => actions.sendMessage('Cho mình một gợi ý')}
                className="whitespace-nowrap bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full font-medium transition-colors cursor-pointer"
              >
                Cho mình một gợi ý
              </button>
            </div>

            {/* Input Box */}
            <form onSubmit={handleSendChat} className="pt-2 border-t border-slate-100 flex items-center space-x-1.5 shrink-0">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Đặt câu hỏi về bài học..."
                aria-label="Đặt câu hỏi về bài học"
                className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="submit"
                disabled={!chatInput.trim()}
                aria-label="Gửi câu hỏi"
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white p-2 rounded-xl transition-colors cursor-pointer shadow-2xs"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>

          {/* Box 2: 4 tác nhân, 1 lộ trình */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-2xs space-y-3 text-xs">
            <div className="flex items-center space-x-2 pb-2 border-b border-slate-100">
              <Bot className="w-4 h-4 text-blue-600" />
              <h3 className="font-extrabold text-xs text-slate-900">
                4 tác nhân, 1 lộ trình
              </h3>
            </div>

            <div className="space-y-2">
              {agents.map((ag, idx) => {
                const isRunning = state.run.status === 'running' && state.run.completed === idx;
                const isCompleted = state.run.completed > idx;

                const getIcon = () => {
                  if (ag.id === 'planner') return ClipboardList;
                  if (ag.id === 'knowledge') return FileText;
                  if (ag.id === 'tutor') return GraduationCap;
                  return ShieldCheck;
                };
                const Icon = getIcon();

                return (
                  <div key={ag.id} className="flex items-center justify-between p-2 rounded-xl bg-slate-50/70 border border-slate-100">
                    <div className="flex items-center space-x-2.5">
                      <div className="w-7 h-7 rounded-lg bg-white border border-slate-200 text-slate-600 flex items-center justify-center shrink-0">
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <span className="font-bold text-slate-800 text-[12px]">
                        {ag.name}
                      </span>
                    </div>

                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                      isRunning
                        ? 'bg-amber-100 text-amber-800 animate-pulse'
                        : isCompleted
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'text-slate-500'
                    }`}>
                      {isRunning ? 'Đang xử lý...' : isCompleted ? '✓ Hoàn thành' : '● Sẵn sàng'}
                    </span>
                  </div>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => actions.setPage('agents')}
              className="w-full pt-1.5 text-center text-[11px] font-bold text-blue-600 hover:text-blue-800 flex items-center justify-center space-x-1 cursor-pointer transition-colors"
            >
              <span>Xem cách phối hợp</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* FULL-WIDTH BELOW BOTH COLUMNS: Học liệu được sử dụng */}
      <div className="w-full space-y-2">
        <h3 className="font-extrabold text-sm text-slate-900">
          Học liệu được sử dụng
        </h3>

        <div className="divide-y divide-slate-100 bg-white rounded-xl border border-slate-200/90 px-3">
          {resources.map((res) => (
            <button
              key={res.id}
              type="button"
              onClick={() => openResource(res.id)}
              className="w-full py-1.5 flex items-center justify-between group cursor-pointer hover:bg-slate-50/80 px-2 rounded-xl transition-colors text-left"
            >
              <div className="flex items-center space-x-3">
                <div className="w-6 h-6 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                  {res.id === 'note-vertex' ? <FileText className="w-4 h-4" /> : <Network className="w-4 h-4" />}
                </div>
                <span className="text-xs sm:text-sm font-bold text-slate-800 group-hover:text-blue-600 transition-colors">
                  {res.title}
                </span>
              </div>

              <span className="text-xs font-medium text-slate-400 group-hover:text-slate-600">
                Nội dung demo
              </span>
            </button>
          ))}
        </div>
      </div>
    </motion.div>
  );
};
