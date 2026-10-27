import { useEffect, useState } from 'react';
import { DemoState, Page, Role, Stage, ResourceTab, initialState, assessment, identifyFocus, createPlan, teacherDecision, replyToQuestion, agents } from './model';
const KEY = 'eduagents-ui-demo-v1';
function restore(): DemoState {
  try {
    const data = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (data?.schema === 1 && Array.isArray(data.plans) && Array.isArray(data.chat) && Array.isArray(data.events) && data.run && data.answers) {
      return { ...initialState(), ...data, run: { ...data.run, status: data.run.status === 'running' ? 'paused' : data.run.status } };
    }
  } catch { /* A disabled or stale browser store must not prevent the demo from opening. */ }
  return initialState();
}
export function useEducationDemo() {
  const [state, setState] = useState<DemoState>(restore);
  const [notice, setNotice] = useState('');
  useEffect(() => { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* In-memory state remains usable. */ } }, [state]);
  useEffect(() => {
    if (state.run.status !== 'running') return;
    const timer = window.setTimeout(() => setState(s => {
      if (s.run.status !== 'running') return s;
      const i = s.run.completed;
      const details = [
        `Mục tiêu đã chọn: ${s.run.goal}`,
        'Đã chọn ghi chú công thức đỉnh và sơ đồ chiều biến thiên trong bộ học liệu mẫu.',
        `Đã sắp xếp ba hoạt động, ưu tiên ${s.run.focus === 'vertex' ? 'cách tìm đỉnh' : s.run.focus === 'direction' ? 'chiều biến thiên' : 'đỉnh và chiều biến thiên'}.`,
        'Đối chiếu với nội dung mẫu; chưa xuất bản. Giáo viên cần xem và phê duyệt.',
      ];
      const events = [...s.events, { id: `${s.plans.length}-${i}`, agent: i, title: agents[i].name, detail: details[i], source: i === 0 ? 'Mục tiêu + bài luyện tập mẫu' : i === 1 ? 'Ghi chú và sơ đồ nội bộ' : i === 2 ? 'Bộ hoạt động biên soạn sẵn' : 'Quy tắc kiểm tra mẫu' }];
      if (i === 3) {
        const plan = createPlan(s.run.goal, s.run.focus, s.plans.length, new Date().toISOString());
        return { ...s, events, run: { ...s.run, status: 'completed', completed: 4 }, plans: [plan, ...s.plans] };
      }
      return { ...s, events, run: { ...s.run, completed: i + 1 } };
    }), 1050);
    return () => clearTimeout(timer);
  }, [state.run.status, state.run.completed]);
  const actions = {
    setPage: (page: Page) => setState(s => ({ ...s, page })),
    setRole: (role: Role) => setState(s => ({ ...s, role })),
    setStage: (stage: Stage) => {
      if (stage === 'feedback' && !state.submitted) {
        setNotice('Hoàn thành hai câu luyện tập để xem phản hồi nhé.');
        setState(s => ({ ...s, stage: 'practice' }));
        return;
      }
      setState(s => ({ ...s, stage }));
    },
    setResourceTab: (resourceTab: ResourceTab) => setState(s => ({ ...s, resourceTab })),
    setGoal: (goal: string) => setState(s => ({ ...s, goal })),
    answer: (id: string, answer: string) => setState(s => s.submitted ? s : ({ ...s, answers: { ...s.answers, [id]: answer } })),
    submitQuiz: () => {
      if (!assessment(state).complete) { setNotice('Chọn câu trả lời cho cả hai câu hỏi trước nhé.'); return; }
      setState(s => ({ ...s, submitted: true, stage: 'feedback' }));
    },
    retryQuiz: () => setState(s => ({ ...s, answers: {}, submitted: false, stage: 'practice' })),
    startRun: () => {
      if (!state.goal.trim()) { setNotice('Nhập mục tiêu học tập trước khi tạo lộ trình.'); return; }
      setState(s => ['running', 'paused'].includes(s.run.status) ? s : ({ ...s, events: [], run: { status: 'running', completed: 0, goal: s.goal.trim(), focus: identifyFocus(s, s.goal) } }));
    },
    pauseRun: () => setState(s => s.run.status === 'running' ? { ...s, run: { ...s.run, status: 'paused' } } : s),
    resumeRun: () => setState(s => s.run.status === 'paused' ? { ...s, run: { ...s.run, status: 'running' } } : s),
    cancelRun: () => setState(s => ['running', 'paused'].includes(s.run.status) ? { ...s, run: { ...s.run, status: 'cancelled' } } : s),
    decide: (id: string, decision: 'approved' | 'changes_requested', feedback: string, steps?: string[]) => {
      try { const next = teacherDecision(state, id, decision, feedback, steps); setState(next); setNotice(decision === 'approved' ? 'Đã duyệt và giao lộ trình cho học sinh.' : 'Đã gửi yêu cầu chỉnh sửa.'); } catch (err) { setNotice((err as Error).message); }
    },
    sendMessage: (text: string) => {
      if (!text.trim()) return;
      const reply = replyToQuestion(text);
      setState(s => ({ ...s, chat: [...s.chat, { id: `q-${Date.now()}`, role: 'user' as const, text: text.trim() }, { id: `a-${Date.now()}`, role: 'assistant' as const, ...reply }].slice(-20) }));
    },
    openResource: (id: string) => setState(s => ({ ...s, page: 'learn', stage: 'discover', resourceTab: id === 'note-direction' ? 'diagram' : 'text' })),
    reset: () => { setState(initialState()); setNotice('Đã bắt đầu lại demo với dữ liệu mẫu.'); },
    clearNotice: () => setNotice(''),
  };
  return { state, actions, notice, result: assessment(state) };
}
export type EducationDemo = ReturnType<typeof useEducationDemo>;
