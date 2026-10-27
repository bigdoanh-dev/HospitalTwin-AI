import React, { useState, useEffect, useCallback, useMemo } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  MarkerType,
} from 'reactflow';
import 'reactflow/dist/style.css';
import {
  GitFork,
  Layers,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ArrowRight,
  Sparkles,
  Save,
  RefreshCw,
  Plus,
  Trash2,
  Info,
  Play
} from 'lucide-react';
import { api } from '../services/api';

interface ProcessViewProps {
  onOpenAI: (roomId: string) => void;
  onNavigateToSimulation?: (scenarioVersionId?: string) => void;
}

// Pathway Templates definition
const PATHWAY_TEMPLATES = {
  bhyt: {
    id: 'bhyt',
    title: 'Khám BHYT Tiêu chuẩn',
    desc: 'Lộ trình khám đầy đủ: Đăng ký -> BHYT -> Khám -> Xét nghiệm -> Trả KQ -> Thu phí -> Phát thuốc',
    config: { lab_counters: 7, lab_staff: 7, service_time: 8, exam_counters: 14 },
    nodes: [
      { id: 'ROOM-REC-101', type: 'default', position: { x: 40, y: 80 }, data: { label: '1. Tiếp đón & Đăng ký\n(ROOM-REC-101)' } },
      { id: 'ROOM-INS-101', type: 'default', position: { x: 240, y: 80 }, data: { label: '2. Xác thực BHYT\n(ROOM-INS-101)' } },
      { id: 'ROOM-EXAM-101', type: 'default', position: { x: 440, y: 80 }, data: { label: '3. Khám chuyên khoa\n(ROOM-EXAM-101)' } },
      { id: 'ROOM-LAB-101', type: 'default', position: { x: 640, y: 80 }, data: { label: '4. Lấy mẫu xét nghiệm\n(ROOM-LAB-101)' } },
      { id: 'ROOM-RES-101', type: 'default', position: { x: 840, y: 80 }, data: { label: '5. Chờ & Trả kết quả\n(ROOM-RES-101)' } },
      { id: 'ROOM-PAY-101', type: 'default', position: { x: 640, y: 220 }, data: { label: '6. Thanh toán viện phí\n(ROOM-PAY-101)' } },
      { id: 'ROOM-PHAR-101', type: 'default', position: { x: 440, y: 220 }, data: { label: '7. Cấp phát thuốc\n(ROOM-PHAR-101)' } },
    ],
    edges: [
      { id: 'e1-2', source: 'ROOM-REC-101', target: 'ROOM-INS-101', animated: true, markerEnd: { type: MarkerType.ArrowClosed } },
      { id: 'e2-3', source: 'ROOM-INS-101', target: 'ROOM-EXAM-101', animated: true, markerEnd: { type: MarkerType.ArrowClosed } },
      { id: 'e3-4', source: 'ROOM-EXAM-101', target: 'ROOM-LAB-101', animated: true, markerEnd: { type: MarkerType.ArrowClosed } },
      { id: 'e4-5', source: 'ROOM-LAB-101', target: 'ROOM-RES-101', animated: true, markerEnd: { type: MarkerType.ArrowClosed } },
      { id: 'e5-6', source: 'ROOM-RES-101', target: 'ROOM-PAY-101', animated: true, markerEnd: { type: MarkerType.ArrowClosed } },
      { id: 'e6-7', source: 'ROOM-PAY-101', target: 'ROOM-PHAR-101', animated: true, markerEnd: { type: MarkerType.ArrowClosed } },
    ]
  },
  service: {
    id: 'service',
    title: 'Khám Dịch vụ Yêu cầu (Fast-track)',
    desc: 'Bỏ qua bước xác minh BHYT, ưu tiên quầy khám và xét nghiệm nhanh',
    config: { lab_counters: 8, lab_staff: 8, service_time: 6, exam_counters: 16 },
    nodes: [
      { id: 'ROOM-REC-101', type: 'default', position: { x: 40, y: 80 }, data: { label: '1. Tiếp đón VIP\n(ROOM-REC-101)' } },
      { id: 'ROOM-EXAM-101', type: 'default', position: { x: 280, y: 80 }, data: { label: '2. Khám Chuyên gia\n(ROOM-EXAM-101)' } },
      { id: 'ROOM-LAB-101', type: 'default', position: { x: 520, y: 80 }, data: { label: '3. Xét nghiệm Nhanh\n(ROOM-LAB-101)' } },
      { id: 'ROOM-RES-101', type: 'default', position: { x: 760, y: 80 }, data: { label: '4. Trả KQ & Tư vấn\n(ROOM-RES-101)' } },
      { id: 'ROOM-PHAR-101', type: 'default', position: { x: 520, y: 220 }, data: { label: '5. Nhận thuốc & Rời viện\n(ROOM-PHAR-101)' } },
    ],
    edges: [
      { id: 'e-s1-2', source: 'ROOM-REC-101', target: 'ROOM-EXAM-101', animated: true, markerEnd: { type: MarkerType.ArrowClosed } },
      { id: 'e-s2-3', source: 'ROOM-EXAM-101', target: 'ROOM-LAB-101', animated: true, markerEnd: { type: MarkerType.ArrowClosed } },
      { id: 'e-s3-4', source: 'ROOM-LAB-101', target: 'ROOM-RES-101', animated: true, markerEnd: { type: MarkerType.ArrowClosed } },
      { id: 'e-s4-5', source: 'ROOM-RES-101', target: 'ROOM-PHAR-101', animated: true, markerEnd: { type: MarkerType.ArrowClosed } },
    ]
  },
  hybrid: {
    id: 'hybrid',
    title: 'Tái khám Bệnh Mạn tính & Kết hợp',
    desc: 'Lộ trình tái khám định kỳ, tập trung đánh giá kết quả và kê đơn thuốc',
    config: { lab_counters: 6, lab_staff: 6, service_time: 7, exam_counters: 12 },
    nodes: [
      { id: 'ROOM-REC-101', type: 'default', position: { x: 40, y: 80 }, data: { label: '1. Check-in Tái khám\n(ROOM-REC-101)' } },
      { id: 'ROOM-LAB-101', type: 'default', position: { x: 280, y: 80 }, data: { label: '2. Đo chỉ số định kỳ\n(ROOM-LAB-101)' } },
      { id: 'ROOM-EXAM-101', type: 'default', position: { x: 520, y: 80 }, data: { label: '3. Bác sĩ đánh giá\n(ROOM-EXAM-101)' } },
      { id: 'ROOM-PHAR-101', type: 'default', position: { x: 760, y: 80 }, data: { label: '4. Cấp thuốc mạn tính\n(ROOM-PHAR-101)' } },
    ],
    edges: [
      { id: 'e-h1-2', source: 'ROOM-REC-101', target: 'ROOM-LAB-101', animated: true, markerEnd: { type: MarkerType.ArrowClosed } },
      { id: 'e-h2-3', source: 'ROOM-LAB-101', target: 'ROOM-EXAM-101', animated: true, markerEnd: { type: MarkerType.ArrowClosed } },
      { id: 'e-h3-4', source: 'ROOM-EXAM-101', target: 'ROOM-PHAR-101', animated: true, markerEnd: { type: MarkerType.ArrowClosed } },
    ]
  }
};

export const ProcessView: React.FC<ProcessViewProps> = ({ onOpenAI, onNavigateToSimulation }) => {
  const [scenarios, setScenarios] = useState<any[]>([]);
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>('SCEN-001');
  const [selectedPathway, setSelectedPathway] = useState<'bhyt' | 'service' | 'hybrid'>('bhyt');

  // ReactFlow state
  const [nodes, setNodes, onNodesChange] = useNodesState(PATHWAY_TEMPLATES.bhyt.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(PATHWAY_TEMPLATES.bhyt.edges);
  const [selectedNodeId, setSelectedNodeId] = useState<string>('ROOM-LAB-101');

  // Working draft configuration parameters
  const [scenarioName, setScenarioName] = useState('Kịch bản tăng cường công suất xét nghiệm');
  const [labCounters, setLabCounters] = useState(7);
  const [labStaff, setLabStaff] = useState(7);
  const [labServiceTime, setLabServiceTime] = useState(8);
  const [examCounters, setExamCounters] = useState(14);
  const [ctOnline, setCtOnline] = useState(true);

  // Status
  const [saving, setSaving] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [latestVersionId, setLatestVersionId] = useState<string>('VER-001');

  // Load scenarios from API
  const loadScenarios = useCallback(async () => {
    try {
      const list = await api.listScenarios();
      setScenarios(list);
      if (list.length > 0) {
        const found = list.find(s => s.id === selectedScenarioId) || list[0];
        setSelectedScenarioId(found.id);
        const verId = found.latest_version_id || found.versions?.[found.versions.length - 1]?.id || 'VER-001';
        setLatestVersionId(verId);
      }
    } catch (err: any) {
      console.warn('Lỗi tải scenarios:', err.message);
    }
  }, [selectedScenarioId]);

  useEffect(() => {
    loadScenarios();
  }, [loadScenarios]);

  // Connect edges in ReactFlow
  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge({ ...params, animated: true, markerEnd: { type: MarkerType.ArrowClosed } }, eds)),
    [setEdges]
  );

  // Switch Pathway template
  const handleSelectPathway = (key: 'bhyt' | 'service' | 'hybrid') => {
    setSelectedPathway(key);
    const tpl = PATHWAY_TEMPLATES[key];
    setNodes(tpl.nodes);
    setEdges(tpl.edges);
    setLabCounters(tpl.config.lab_counters);
    setLabStaff(tpl.config.lab_staff);
    setLabServiceTime(tpl.config.service_time);
    setExamCounters(tpl.config.exam_counters);
    setFeedbackMsg({
      type: 'success',
      text: `Đã nạp mẫu quy trình: ${tpl.title}`
    });
  };

  // Add a new node to the graph
  const handleAddNode = () => {
    const nextIdx = nodes.length + 1;
    const newId = `STEP-CUSTOM-${Date.now().toString().slice(-4)}`;
    const newNode: Node = {
      id: newId,
      type: 'default',
      position: { x: 300, y: 150 + (nextIdx % 3) * 60 },
      data: { label: `${nextIdx}. Bước tùy chỉnh\n(${newId})` }
    };
    setNodes((nds) => [...nds, newNode]);
    setSelectedNodeId(newId);
  };

  // Delete currently selected node
  const handleDeleteSelected = () => {
    if (!selectedNodeId) return;
    setNodes((nds) => nds.filter((n) => n.id !== selectedNodeId));
    setEdges((eds) => eds.filter((e) => e.source !== selectedNodeId && e.target !== selectedNodeId));
    setSelectedNodeId('');
  };

  // Save version (Immutable version persistence)
  const handleSaveVersion = async (): Promise<string | null> => {
    setSaving(true);
    setFeedbackMsg(null);
    try {
      const configPayload = {
        lab_counters: labCounters,
        lab_staff: labStaff,
        service_time: labServiceTime,
        exam_counters: examCounters,
        ct_online: ctOnline,
        target_room_id: selectedNodeId || 'ROOM-LAB-101'
      };

      if (selectedScenarioId) {
        const res = await api.createScenarioVersion(selectedScenarioId, {
          name: scenarioName,
          config: configPayload,
          nodes: nodes,
          edges: edges
        });
        const newVerId = res.latest_version_id || res.versions?.[res.versions.length - 1]?.id || res.id || 'VER-001';
        setLatestVersionId(newVerId);
        setFeedbackMsg({
          type: 'success',
          text: `Đã lưu phiên bản bất biến mới (${newVerId}) thành công!`
        });
        await loadScenarios();
        return newVerId;
      } else {
        const res = await api.createScenario({
          name: scenarioName,
          description: 'Kịch bản thiết kế từ Graph Editor',
          config: configPayload,
          nodes: nodes,
          edges: edges
        });
        const verId = res.latest_version_id || 'VER-001';
        setSelectedScenarioId(res.id);
        setLatestVersionId(verId);
        setFeedbackMsg({
          type: 'success',
          text: `Đã tạo kịch bản mới ${res.id} thành công!`
        });
        await loadScenarios();
        return verId;
      }
    } catch (err: any) {
      setFeedbackMsg({
        type: 'error',
        text: `Lưu kịch bản thất bại: ${err.message}`
      });
      return null;
    } finally {
      setSaving(false);
    }
  };

  // CRITICAL: Navigate to Simulation transmitting VER-... id, NEVER SCEN-...
  const handleProceedToSimulation = async () => {
    if (!onNavigateToSimulation) return;

    // Save current draft first to ensure SimPy receives the concrete immutable version
    setSaving(true);
    const savedVerId = await handleSaveVersion();
    const verToSend = savedVerId || latestVersionId;

    if (verToSend && verToSend.startsWith('VER-')) {
      onNavigateToSimulation(verToSend);
    } else {
      // Fallback to latestVersionId if savedVerId not available
      onNavigateToSimulation(latestVersionId);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Thiết kế & Mô hình hóa Quy trình Khám (Process Modelling)
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Trình biên tập đồ thị chuỗi bước (ReactFlow Graph Editor) • Lưu phiên bản bất biến (VER-...) • Đối sánh kịch bản
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => onOpenAI('ROOM-LAB-101')}
            className="flex items-center space-x-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors shadow-2xs"
          >
            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            <span>AI Đề xuất kịch bản</span>
          </button>
        </div>
      </div>

      {/* Engine Limitation Disclaimer */}
      <div className="bg-amber-50/90 border border-amber-200 rounded-xl p-3 flex items-start space-x-2.5 text-xs text-amber-900">
        <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <strong>Giới hạn kỹ thuật động cơ SimPy:</strong> Động cơ SimPy backend hiện tại mô phỏng dòng bệnh nhân ngoại trú chuẩn dựa trên cấu hình tài nguyên (số bàn xét nghiệm, số bác sĩ, thời gian phục vụ, v.v.), chưa phân tích đồ thị tùy ý bất kỳ trong thời gian thực. Sơ đồ đồ thị dưới đây phục vụ trực quan hóa quy trình, sắp xếp chuỗi bước và đóng gói phiên bản cấu hình bất biến (VER-...).
        </div>
      </div>

      {feedbackMsg && (
        <div className={`p-3 rounded-xl border text-xs font-medium flex items-center space-x-2 ${
          feedbackMsg.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          {feedbackMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> : <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />}
          <span>{feedbackMsg.text}</span>
        </div>
      )}

      {/* 3-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Column 1: Scenarios & Pathway Templates (3 cols) */}
        <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs space-y-4">
          <div>
            <h3 className="font-extrabold text-xs text-slate-500 uppercase tracking-wider mb-2">
              Mẫu luồng quy trình (Pathways)
            </h3>
            <div className="space-y-2">
              {(['bhyt', 'service', 'hybrid'] as const).map((key) => {
                const tpl = PATHWAY_TEMPLATES[key];
                const isSelected = selectedPathway === key;
                return (
                  <button
                    key={key}
                    onClick={() => handleSelectPathway(key)}
                    className={`w-full text-left p-3 rounded-xl border transition-all ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50/70 shadow-xs ring-1 ring-blue-200'
                        : 'border-slate-100 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="text-xs font-bold text-slate-900">{tpl.title}</div>
                    <div className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">{tpl.desc}</div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-extrabold text-xs text-slate-500 uppercase tracking-wider">
                Kịch bản trong hệ thống
              </h3>
              <button onClick={loadScenarios} className="text-slate-400 hover:text-slate-600" title="Tải lại">
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {scenarios.map((sc) => (
                <div
                  key={sc.id}
                  onClick={() => {
                    setSelectedScenarioId(sc.id);
                    setScenarioName(sc.name);
                    const verId = sc.latest_version_id || sc.versions?.[sc.versions.length - 1]?.id || 'VER-001';
                    setLatestVersionId(verId);
                    if (sc.config) {
                      if (sc.config.lab_counters) setLabCounters(sc.config.lab_counters);
                      if (sc.config.lab_staff) setLabStaff(sc.config.lab_staff);
                      if (sc.config.service_time) setLabServiceTime(sc.config.service_time);
                      if (sc.config.exam_counters) setExamCounters(sc.config.exam_counters);
                    }
                  }}
                  className={`p-2.5 rounded-xl border cursor-pointer text-xs transition-colors ${
                    selectedScenarioId === sc.id ? 'border-blue-500 bg-blue-50/60 font-semibold' : 'border-slate-100 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span className="truncate">{sc.name}</span>
                    <span className="text-[9px] font-mono text-blue-700 bg-blue-100 px-1 py-0.2 rounded shrink-0 ml-1">
                      {sc.latest_version_id || 'v1'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Column 2: Interactive ReactFlow Graph Editor (6 cols) */}
        <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs flex flex-col h-[560px]">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h3 className="font-extrabold text-xs text-slate-800">
                Sơ đồ chuỗi bước khám (ReactFlow Editor)
              </h3>
              <span className="text-[11px] text-slate-400">Kéo thả các node, nối cạnh (edge) hoặc chọn node để sửa</span>
            </div>

            <div className="flex items-center space-x-1.5">
              <button
                onClick={handleAddNode}
                className="flex items-center space-x-1 bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-1 rounded-lg text-xs font-semibold transition-colors"
                title="Thêm bước quy trình mới"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Thêm bước</span>
              </button>

              {selectedNodeId && (
                <button
                  onClick={handleDeleteSelected}
                  className="flex items-center space-x-1 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 px-2 py-1 rounded-lg text-xs font-semibold transition-colors"
                  title="Xóa bước đang chọn"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Xóa</span>
                </button>
              )}
            </div>
          </div>

          {/* ReactFlow Canvas */}
          <div className="flex-1 w-full bg-slate-50 rounded-xl overflow-hidden border border-slate-200 relative">
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onNodeClick={(_, node) => setSelectedNodeId(node.id)}
              fitView
            >
              <Background color="#cbd5e1" gap={16} />
              <Controls />
              <MiniMap
                nodeColor={(n) => n.id === selectedNodeId ? '#2563eb' : '#94a3b8'}
                className="rounded-lg shadow-sm"
              />
            </ReactFlow>
          </div>
        </div>

        {/* Column 3: Configuration & Save Version (3 cols) */}
        <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs flex flex-col justify-between space-y-4">
          <div>
            <h3 className="font-extrabold text-xs text-slate-800 mb-2">
              Hiệu chỉnh tham số kịch bản
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-500 font-semibold mb-1">Tên kịch bản</label>
                <input
                  type="text"
                  value={scenarioName}
                  onChange={(e) => setScenarioName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">
                  Bàn lấy mẫu xét nghiệm: <strong className="text-blue-700 font-black">{labCounters} quầy</strong>
                </label>
                <input
                  type="range"
                  min={4}
                  max={8}
                  value={labCounters}
                  onChange={(e) => setLabCounters(parseInt(e.target.value))}
                  className="w-full accent-blue-600"
                />
                <div className="flex justify-between text-[10px] text-slate-400">
                  <span>4</span>
                  <span>6 (Hiện trạng)</span>
                  <span>7 (Khuyến nghị)</span>
                  <span>8</span>
                </div>
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">
                  Điều dưỡng lấy mẫu: <strong className="text-blue-700 font-black">{labStaff} người</strong>
                </label>
                <input
                  type="range"
                  min={4}
                  max={8}
                  value={labStaff}
                  onChange={(e) => setLabStaff(parseInt(e.target.value))}
                  className="w-full accent-blue-600"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">
                  Thời gian phục vụ mẫu: <strong className="text-blue-700 font-black">{labServiceTime} phút</strong>
                </label>
                <input
                  type="range"
                  min={5}
                  max={12}
                  value={labServiceTime}
                  onChange={(e) => setLabServiceTime(parseInt(e.target.value))}
                  className="w-full accent-blue-600"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">
                  Phòng khám chuyên khoa: <strong className="text-blue-700 font-black">{examCounters} phòng</strong>
                </label>
                <input
                  type="range"
                  min={8}
                  max={20}
                  value={examCounters}
                  onChange={(e) => setExamCounters(parseInt(e.target.value))}
                  className="w-full accent-blue-600"
                />
              </div>

              <div className="p-2.5 bg-blue-50/70 border border-blue-200 rounded-xl text-blue-900 text-[11px] leading-relaxed">
                <div>Phiên bản xuất bản mục tiêu:</div>
                <strong className="font-mono text-xs text-blue-700">{latestVersionId}</strong>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 space-y-2">
            <button
              onClick={handleSaveVersion}
              disabled={saving}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl text-xs flex items-center justify-center space-x-2 transition-colors shadow-xs"
            >
              {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>Lưu phiên bản bất biến (VER-...)</span>
            </button>

            {onNavigateToSimulation && (
              <button
                onClick={handleProceedToSimulation}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2.5 rounded-xl text-xs flex items-center justify-center space-x-2 transition-colors shadow-xs"
                title={`Chuyển sang Mô phỏng với mã phiên bản: ${latestVersionId}`}
              >
                <Play className="w-4 h-4 fill-white" />
                <span>Mô phỏng với phiên bản này &rarr;</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
