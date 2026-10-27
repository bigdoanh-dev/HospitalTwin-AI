import test from 'node:test';
import assert from 'node:assert/strict';
import { initialState, assessment, identifyFocus, createPlan, teacherDecision, replyToQuestion, quadratic, resources } from '../src/education/model.ts';

test('Assessment waits for both answers and identifies the actual learning gap', () => {
  const s = initialState();
  s.answers = { vertex: 'I(1; −4)', direction: '(−∞; 1)' };
  assert.deepEqual(assessment(s).gaps, []);
  s.submitted = true;
  assert.deepEqual(assessment(s), { correct: 1, total: 2, complete: true, gaps: ['direction'] });
  assert.equal(identifyFocus(s, 'Tạo lộ trình phù hợp'), 'direction');
  delete s.answers.direction;
  assert.equal(assessment(s).complete, false);
});

test('A proposed plan stays separate from the published learner plan', () => {
  const s = initialState();
  s.plans = [createPlan('Tìm đỉnh parabol', 'vertex', 0, '2026-10-27T00:00:00Z')];
  assert.equal(s.publishedPlan, null);
  assert.equal(s.plans[0].status, 'pending');
  assert.ok(s.plans[0].sources.every(id => resources.some(r => r.id === id)));
  assert.throws(() => teacherDecision(s, s.plans[0].id, 'approved', ''), /giáo viên/);
});

test('Teacher can edit and publish a pending plan exactly once', () => {
  const s = initialState(); s.role = 'teacher';
  s.plans = [createPlan('Tìm đỉnh', 'vertex', 0, '2026-10-27T00:00:00Z')];
  const steps = ['Ôn hệ số a, b.', 'Tính tọa độ đỉnh.', 'Đối chiếu với đồ thị.'];
  const approved = teacherDecision(s, 'PLAN-001', 'approved', 'Thêm bước đối chiếu đồ thị.', steps);
  assert.equal(approved.publishedPlan.status, 'approved');
  assert.deepEqual(approved.publishedPlan.steps, steps);
  assert.equal(s.plans[0].status, 'pending');
  assert.throws(() => teacherDecision(approved, 'PLAN-001', 'approved', ''), /không còn chờ duyệt/);
});

test('Requesting changes requires feedback and leaves an earlier published plan intact', () => {
  const s = initialState(); s.role = 'teacher';
  s.plans = [createPlan('Đỉnh', 'vertex', 0, '2026-10-27T00:00:00Z')];
  const approved = teacherDecision(s, 'PLAN-001', 'approved', '');
  approved.plans.unshift(createPlan('Biến thiên', 'direction', 1, '2026-10-27T01:00:00Z'));
  assert.throws(() => teacherDecision(approved, 'PLAN-002', 'changes_requested', '  '), /ghi rõ/);
  const changed = teacherDecision(approved, 'PLAN-002', 'changes_requested', 'Bổ sung một ví dụ dễ hơn.');
  assert.equal(changed.plans[0].status, 'changes_requested');
  assert.equal(changed.publishedPlan.id, 'PLAN-001');
  assert.throws(() => teacherDecision(approved, 'PLAN-002', 'approved', '', ['','','']), /đủ ba bước/);
});

test('The diagram example has the claimed vertex and roots', () => {
  assert.equal(quadratic(1, -2, -3, 1), -4);
  assert.equal(quadratic(1, -2, -3, -1), 0);
  assert.equal(quadratic(1, -2, -3, 3), 0);
  assert.equal(quadratic(1, -2, -3, 0), quadratic(1, -2, -3, 2));
});

test('The sample assistant cites local material and admits unsupported questions', () => {
  assert.equal(replyToQuestion('Giải thích đỉnh parabol').source, 'note-vertex');
  assert.equal(replyToQuestion('Khoảng đồng biến?').source, 'note-direction');
  const unsupported = replyToQuestion('Kế hoạch du lịch Đà Nẵng');
  assert.equal(unsupported.source, undefined);
  assert.match(unsupported.text, /ngoài bài học cần giáo viên/);
});

test('A revised goal requesting an example changes the proposed first activity', () => {
  const draft = createPlan('Tìm đỉnh; bổ sung một ví dụ trước khi luyện tập.', 'vertex', 1, '2026-10-27T00:00:00Z');
  assert.match(draft.steps[0], /Xem ví dụ/);
  assert.equal(draft.id, 'PLAN-002');
  assert.equal(draft.status, 'pending');
});
