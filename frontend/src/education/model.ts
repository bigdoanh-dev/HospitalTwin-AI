export type Page = 'learn' | 'agents' | 'teacher';
export type Role = 'student' | 'teacher';
export type Stage = 'discover' | 'practice' | 'feedback';
export type ResourceTab = 'text' | 'diagram' | 'example';
export type PlanStatus = 'pending' | 'approved' | 'changes_requested';
export interface Plan { id: string; title: string; goal: string; focus: 'vertex' | 'direction' | 'both'; steps: string[]; status: PlanStatus; feedback: string; sources: string[]; createdAt: string; }
export interface AgentEvent { id: string; agent: number; title: string; detail: string; source: string; }
export interface ChatMessage { id: string; role: 'user' | 'assistant'; text: string; source?: string; }
export interface DemoState {
  schema: 1; page: Page; role: Role; stage: Stage; resourceTab: ResourceTab;
  answers: Record<string, string>; submitted: boolean;
  goal: string; plans: Plan[]; publishedPlan: Plan | null;
  run: { status: 'idle' | 'running' | 'paused' | 'completed' | 'cancelled'; completed: number; goal: string; focus: 'vertex' | 'direction' | 'both' };
  events: AgentEvent[]; chat: ChatMessage[];
}
export const agents = [
  { id: 'planner', name: 'Lập kế hoạch', description: 'Xác định mục tiêu từ bài luyện tập và nhu cầu người học.', icon: 'clipboard' },
  { id: 'knowledge', name: 'Truy xuất học liệu', description: 'Chọn ghi chú và sơ đồ liên quan trong bộ học liệu mẫu.', icon: 'network' },
  { id: 'tutor', name: 'Gia sư', description: 'Sắp xếp ví dụ và câu hỏi gợi mở phù hợp với mục tiêu.', icon: 'graduation' },
  { id: 'verifier', name: 'Kiểm tra', description: 'Đối chiếu nội dung mẫu và chuyển đề xuất cho giáo viên.', icon: 'shield' },
];
export const resources = [
  { id: 'note-vertex', title: 'Ghi chú bài học mẫu', type: 'Văn bản', description: 'Với y = ax² + bx + c (a ≠ 0), hoành độ đỉnh là −b/(2a). Thay vào hàm số để tính tung độ đỉnh. Ví dụ y = x² − 2x − 3 có đỉnh I(1; −4).' },
  { id: 'note-direction', title: 'Sơ đồ parabol tương tác', type: 'Sơ đồ', description: 'Với a > 0, parabol mở lên: hàm số nghịch biến trước hoành độ đỉnh và đồng biến sau hoành độ đỉnh. Với a < 0, chiều biến thiên đảo lại.' },
];
export const questions = [
  { id: 'vertex', question: 'Đồ thị y = x² − 2x − 3 có đỉnh là điểm nào?', options: ['I(1; −4)', 'I(−1; −4)', 'I(1; 4)'], correct: 'I(1; −4)', explanation: 'Hoành độ đỉnh x = −(−2)/(2 × 1) = 1; thay x = 1 vào hàm số được y = −4.', source: 'note-vertex' },
  { id: 'direction', question: 'Hàm số y = x² − 2x − 3 đồng biến trên khoảng nào?', options: ['(−∞; 1)', '(1; +∞)', '(−∞; +∞)'], correct: '(1; +∞)', explanation: 'Vì a = 1 > 0, parabol mở lên. Hàm số đồng biến khi x lớn hơn hoành độ đỉnh 1.', source: 'note-direction' },
];
export const initialState = (): DemoState => ({
  schema: 1, page: 'learn', role: 'student', stage: 'discover', resourceTab: 'text', answers: {}, submitted: false,
  goal: 'Nhận biết đỉnh và chiều biến thiên của parabol.', plans: [], publishedPlan: null,
  run: { status: 'idle', completed: 0, goal: '', focus: 'both' }, events: [],
  chat: [{ id: 'welcome', role: 'assistant', text: 'Bạn muốn bắt đầu từ đồ thị hay thử một câu hỏi ngắn?' }],
});
export function assessment(state: DemoState) {
  const correct = questions.filter(q => state.answers[q.id] === q.correct).length;
  const complete = questions.every(q => !!state.answers[q.id]);
  const gaps = state.submitted ? questions.filter(q => state.answers[q.id] !== q.correct).map(q => q.id) : [];
  return { correct, total: questions.length, complete, gaps };
}
export function identifyFocus(state: DemoState, goal: string): Plan['focus'] {
  const gaps = assessment(state).gaps;
  if (gaps.length === 1) return gaps[0] as Plan['focus'];
  const normalized = goal.toLowerCase();
  if (normalized.includes('đỉnh') && !normalized.includes('biến thiên')) return 'vertex';
  if (normalized.includes('biến thiên') && !normalized.includes('đỉnh')) return 'direction';
  return 'both';
}
export function createPlan(goal: string, focus: Plan['focus'], count: number, now: string): Plan {
  const steps = focus === 'vertex'
    ? ['Đọc công thức xác định đỉnh và thay hệ số a, b.', 'Tìm đỉnh trên sơ đồ parabol và đối chiếu phép tính.', 'Làm lại câu hỏi về tọa độ đỉnh.']
    : focus === 'direction'
    ? ['Xác định dấu của hệ số a và hoành độ đỉnh.', 'Quan sát hai nhánh parabol trên sơ đồ.', 'Giải thích khoảng đồng biến bằng lời của bạn.']
    : ['Xác định đỉnh từ công thức và sơ đồ parabol.', 'So sánh chiều biến thiên ở hai phía của đỉnh.', 'Luyện tập hai câu hỏi và đọc phản hồi.'];
  if (goal.toLowerCase().includes('ví dụ')) steps[0] = 'Xem ví dụ y = x² − 2x − 3: thay a = 1, b = −2 để tìm hoành độ đỉnh.';
  return { id: `PLAN-${String(count + 1).padStart(3, '0')}`, title: focus === 'vertex' ? 'Củng cố cách tìm đỉnh parabol' : focus === 'direction' ? 'Đọc chiều biến thiên từ đồ thị' : 'Khám phá hàm số bậc hai', goal, focus, steps, status: 'pending', feedback: '', sources: focus === 'vertex' ? ['note-vertex', 'note-direction'] : ['note-direction', 'note-vertex'], createdAt: now };
}
export function teacherDecision(state: DemoState, id: string, decision: 'approved' | 'changes_requested', feedback: string, steps?: string[]): DemoState {
  if (state.role !== 'teacher') throw new Error('Chuyển sang vai trò giáo viên để duyệt lộ trình.');
  const plan = state.plans.find(p => p.id === id);
  if (!plan || plan.status !== 'pending') throw new Error('Đề xuất này không còn chờ duyệt.');
  if (decision === 'changes_requested' && !feedback.trim()) throw new Error('Vui lòng ghi rõ nội dung cần chỉnh sửa.');
  const edited = steps?.map(s => s.trim()) || plan.steps;
  if (edited.length !== 3 || edited.some(s => !s)) throw new Error('Cần đủ ba bước học tập trước khi duyệt.');
  const updated = { ...plan, status: decision, feedback: feedback.trim(), steps: edited };
  return { ...state, plans: state.plans.map(p => p.id === id ? updated : p), publishedPlan: decision === 'approved' ? updated : state.publishedPlan };
}
export function replyToQuestion(question: string) {
  const q = question.toLocaleLowerCase('vi');
  if (/đỉnh|tọa độ|công thức/.test(q)) return { text: 'Với y = ax² + bx + c, hãy bắt đầu bằng x = −b/(2a). Ở bài này a = 1, b = −2 nên x = 1. Thay x = 1 để tìm y = −4. Bạn thử kiểm tra điểm I(1; −4) trên sơ đồ nhé.', source: 'note-vertex' };
  if (/biến thiên|đồng biến|nghịch biến|mở lên|hệ số/.test(q)) return { text: 'Hệ số a = 1 > 0 nên parabol mở lên. Hàm số nghịch biến trên (−∞; 1) và đồng biến trên (1; +∞). Mốc 1 chính là hoành độ đỉnh.', source: 'note-direction' };
  if (/gợi ý|khó|giúp/.test(q)) return { text: 'Hãy tìm hoành độ đỉnh trước, sau đó nhìn hai nhánh của đồ thị. Ở bên phải đỉnh, khi x tăng thì y thay đổi thế nào?', source: 'note-direction' };
  return { text: 'Trợ lý mẫu hiện hỗ trợ đỉnh parabol và chiều biến thiên của y = x² − 2x − 3. Bạn có thể hỏi về một trong hai nội dung này. Câu hỏi ngoài bài học cần giáo viên hỗ trợ.' };
}
export function quadratic(a: number, b: number, c: number, x: number) { return a * x * x + b * x + c; }
