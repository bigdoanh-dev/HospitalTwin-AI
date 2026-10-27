import React, { useState, useEffect } from 'react';
import {
  Cpu,
  Play,
  ArrowRight,
  TrendingDown,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  FileCheck,
  RefreshCw,
  Info,
  ChevronRight,
  Sliders,
  Send,
  Link2,
  Unlink
} from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { api } from '../services/api';
import { SimulationResult } from '../types/hospital';

interface SimulationViewProps {
  onNavigateToIntervention: () => void;
  initialScenarioVersionId?: string;
}

export const SimulationView: React.FC<SimulationViewProps> = ({
  onNavigateToIntervention,
  initialScenarioVersionId
}) => {
  // Scenario Version Link state
  const [activeVersionId, setActiveVersionId] = useState<string | undefined>(initialScenarioVersionId);
  const [isModifiedFromVersion, setIsModifiedFromVersion] = useState(false);

  // Parameters
  const [labCounters, setLabCounters] = useState(7);
  const [labStaff, setLabStaff] = useState(7);
  const [serviceTime, setServiceTime] = useState(8);
  const [examCounters, setExamCounters] = useState(14);
  const [ctOnline, setCtOnline] = useState(true);
  const [fastTrack, setFastTrack] = useState(false);
  const [seed, setSeed] = useState(42);
  const [repetitions, setRepetitions] = useState(1);

  // Execution state (NO AUTORUN ON MOUNT)
  const [running, setRunning] = useState(false);
  const [simResult, setSimResult] = useState<SimulationResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Intervention creation modal state
  const [showModal, setShowModal] = useState(false);
  const [proposalTitle, setProposalTitle] = useState('Bổ sung bàn lấy mẫu xét nghiệm 07');
  const [submittingProposal, setSubmittingProposal] = useState(false);
  const [proposalSuccess, setProposalSuccess] = useState<string | null>(null);

  // Load configuration from scenario version if provided (NO AUTORUN)
  useEffect(() => {
    if (!initialScenarioVersionId) return;
    setActiveVersionId(initialScenarioVersionId);

    const loadVersionConfig = async () => {
      try {
        const scenarios = await api.listScenarios();
        for (const sc of scenarios) {
          const matchedVersion = sc.versions?.find((v: any) => v.id === initialScenarioVersionId);
          if (matchedVersion && matchedVersion.config) {
            const cfg = matchedVersion.config;
            if (cfg.lab_counters !== undefined) setLabCounters(cfg.lab_counters);
            if (cfg.lab_staff !== undefined) setLabStaff(cfg.lab_staff);
            if (cfg.service_time !== undefined) setServiceTime(cfg.service_time);
            if (cfg.exam_counters !== undefined) setExamCounters(cfg.exam_counters);
            if (cfg.ct_online !== undefined) setCtOnline(cfg.ct_online);
            if (cfg.fast_track_returning !== undefined) setFastTrack(cfg.fast_track_returning);
            break;
          }
        }
      } catch (err: any) {
        console.warn('Lỗi tải cấu hình phiên bản:', err.message);
      }
    };

    loadVersionConfig();
  }, [initialScenarioVersionId]);

  // Handle control modifications: if user modifies controls, unlink version to prevent backend override
  const handleParamChange = (updater: () => void) => {
    updater();
    if (activeVersionId) {
      setIsModifiedFromVersion(true);
      setActiveVersionId(undefined); // Unlink so backend runs with raw modified parameters
    }
  };

  const handleRunSimulation = async () => {
    setRunning(true);
    setErrorMsg(null);
    try {
      const res = await api.runSimulation({
        lab_counters: labCounters,
        lab_staff: labStaff,
        service_time: serviceTime,
        exam_counters: examCounters,
        ct_online: ctOnline,
        fast_track_returning: fastTrack,
        seed: seed,
        repetitions: repetitions,
        scenario_version_id: activeVersionId, // Passed only if still linked
      });
      setSimResult(res);
    } catch (err: any) {
      setErrorMsg(err.message || 'Lỗi chạy mô phỏng');
    } finally {
      setRunning(false);
    }
  };

  const handleCreateIntervention = async () => {
    if (!simResult || !simResult.simulation_id) return;
    setSubmittingProposal(true);
    try {
      const deltaMinutes = simResult.comparison?.waiting_time_delta_minutes
        ? `${simResult.comparison.waiting_time_delta_minutes > 0 ? '+' : ''}${simResult.comparison.waiting_time_delta_minutes} phút`
        : 'Theo tính toán mô phỏng';

      await api.createIntervention({
        title: proposalTitle,
        description: `Phương án xuất phát từ kết quả mô phỏng ${simResult.simulation_id}. Cấu hình: ${labCounters} bàn lấy mẫu, ${labStaff} điều dưỡng, máy CT ${ctOnline ? 'Online' : 'Offline'}.`,
        target_room_id: 'ROOM-LAB-101',
        simulation_run_id: simResult.simulation_id, // Concrete simulation_id from result
        resource_delta: `+${Math.max(0, labCounters - (simResult.baseline?.assumptions?.lab_counters || 6))} bàn lấy mẫu, ${labStaff} điều dưỡng`,
        expected_impact: `Trung vị thời gian chờ: ${simResult.proposed?.median_waiting_time_minutes}p (chênh lệch: ${deltaMinutes})`,
        proposed_by: 'Nguyễn Văn Hùng (Điều phối viên)',
      });

      setProposalSuccess(`Đã tạo phương án can thiệp liên kết với mã mô phỏng ${simResult.simulation_id}!`);
      setTimeout(() => {
        setShowModal(false);
        setProposalSuccess(null);
        onNavigateToIntervention();
      }, 1500);
    } catch (err: any) {
      alert(`Lỗi tạo đề xuất: ${err.message}`);
    } finally {
      setSubmittingProposal(false);
    }
  };

  // Build chart timeline data using RELATIVE time offsets (+0p, +15p...), strictly NO fabricated 07:30
  const buildTimelineChartData = () => {
    if (!simResult || !simResult.baseline?.queue_timeline || !simResult.proposed?.queue_timeline) {
      return [];
    }
    const bLine = simResult.baseline.queue_timeline;
    const pLine = simResult.proposed.queue_timeline;

    return bLine.map((item: any, idx: number) => {
      const minutes = item.time_minute;
      const relativeTimeLabel = `+${minutes}p`; // Relative offset from simulation start (0 min)

      const pItem = pLine[idx] || {};

      return {
        time: relativeTimeLabel,
        minute: minutes,
        baselineLab: item.lab_queue ?? 0,
        proposedLab: pItem.lab_queue ?? 0,
        baselineExam: item.exam_queue ?? 0,
        proposedExam: pItem.exam_queue ?? 0,
      };
    });
  };

  const chartData = buildTimelineChartData();

  // Baseline labels from real assumptions in API response, strictly NO hardcoded 6 bàn / exam 14
  const baselineLabCounters = simResult?.baseline?.assumptions?.lab_counters ?? 6;
  const baselineExamCounters = simResult?.baseline?.assumptions?.exam_counters ?? 14;

  return (
    <div className="space-y-4">
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Mô phỏng Sự kiện Rời rạc SimPy & Đối sánh Kịch bản
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Tính toán động học hàng đợi và thông lượng thực tế • Seed đối chứng {seed} • Thời gian tương đối
          </p>
        </div>

        <div className="flex items-center space-x-2 text-xs bg-slate-100 text-slate-700 px-3 py-1.5 rounded-xl border border-slate-200">
          <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></span>
          <span>Engine: Python SimPy Discrete-Event</span>
        </div>
      </div>

      {/* Version Link Banner */}
      {activeVersionId ? (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-center justify-between text-xs text-blue-900">
          <div className="flex items-center space-x-2">
            <Link2 className="w-4 h-4 text-blue-600 shrink-0" />
            <span>
              Đang liên kết phiên bản quy trình: <strong className="font-mono">{activeVersionId}</strong> (Tham số đã được nạp tự động).
            </span>
          </div>
          <span className="text-[11px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded font-semibold">
            Đã đồng bộ
          </span>
        </div>
      ) : isModifiedFromVersion ? (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center justify-between text-xs text-amber-900">
          <div className="flex items-center space-x-2">
            <Unlink className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              Bạn đã hiệu chỉnh tham số khác với phiên bản ban đầu. Mô phỏng sẽ chạy với các tham số tùy chỉnh trực tiếp hiện tại.
            </span>
          </div>
        </div>
      ) : null}

      {errorMsg && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-800 text-xs rounded-xl flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Control Configuration Panel */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4">
        <h3 className="font-extrabold text-sm text-slate-800 flex items-center space-x-2">
          <Cpu className="w-4 h-4 text-blue-600" />
          <span>Cấu hình tham số kịch bản mô phỏng (SimPy Execution Parameters)</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 text-xs">
          <div>
            <label className="block text-slate-600 font-semibold mb-1">
              Quầy lấy mẫu xét nghiệm: <strong className="text-blue-700 font-black">{labCounters} quầy</strong>
            </label>
            <input
              type="range"
              min={4}
              max={8}
              value={labCounters}
              onChange={(e) => handleParamChange(() => setLabCounters(parseInt(e.target.value)))}
              className="w-full accent-blue-600 mt-1"
            />
            <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
              <span>4</span>
              <span>6</span>
              <span>7</span>
              <span>8</span>
            </div>
          </div>

          <div>
            <label className="block text-slate-600 font-semibold mb-1">
              Nhân lực điều dưỡng: <strong className="text-blue-700 font-black">{labStaff} người</strong>
            </label>
            <input
              type="range"
              min={4}
              max={8}
              value={labStaff}
              onChange={(e) => handleParamChange(() => setLabStaff(parseInt(e.target.value)))}
              className="w-full accent-blue-600 mt-1"
            />
            <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
              <span>4</span>
              <span>6</span>
              <span>7</span>
              <span>8</span>
            </div>
          </div>

          <div>
            <label className="block text-slate-600 font-semibold mb-1">
              Thời gian phục vụ mẫu: <strong className="text-blue-700 font-black">{serviceTime} phút/ca</strong>
            </label>
            <input
              type="range"
              min={5}
              max={12}
              value={serviceTime}
              onChange={(e) => handleParamChange(() => setServiceTime(parseInt(e.target.value)))}
              className="w-full accent-blue-600 mt-1"
            />
            <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
              <span>5p</span>
              <span>8p</span>
              <span>12p</span>
            </div>
          </div>

          <div>
            <label className="block text-slate-600 font-semibold mb-1">Trạng thái máy CT Scanner</label>
            <div className="flex items-center space-x-3 mt-2">
              <label className="flex items-center space-x-1.5 cursor-pointer text-slate-700">
                <input
                  type="radio"
                  checked={ctOnline}
                  onChange={() => handleParamChange(() => setCtOnline(true))}
                  className="accent-blue-600"
                />
                <span>Online</span>
              </label>
              <label className="flex items-center space-x-1.5 cursor-pointer text-amber-700 font-medium">
                <input
                  type="radio"
                  checked={!ctOnline}
                  onChange={() => handleParamChange(() => setCtOnline(false))}
                  className="accent-red-600"
                />
                <span>Sự cố (Offline)</span>
              </label>
            </div>
          </div>
        </div>

        {/* Secondary parameters */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-3 border-t border-slate-100 text-xs">
          <div>
            <label className="block text-slate-500 font-semibold mb-1">Phòng khám chuyên khoa</label>
            <input
              type="number"
              min={8}
              max={20}
              value={examCounters}
              onChange={(e) => handleParamChange(() => setExamCounters(parseInt(e.target.value) || 14))}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800"
            />
          </div>

          <div>
            <label className="block text-slate-500 font-semibold mb-1">Seed ngẫu nhiên</label>
            <input
              type="number"
              value={seed}
              onChange={(e) => setSeed(parseInt(e.target.value) || 42)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-mono text-slate-800"
            />
          </div>

          <div>
            <label className="block text-slate-500 font-semibold mb-1">Số lần lặp (Repetitions)</label>
            <input
              type="number"
              min={1}
              max={10}
              value={repetitions}
              onChange={(e) => setRepetitions(parseInt(e.target.value) || 1)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800"
            />
          </div>

          <div className="flex items-end">
            <button
              onClick={handleRunSimulation}
              disabled={running}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold py-2 rounded-xl transition-all shadow-xs flex items-center justify-center space-x-2"
            >
              {running ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Đang tính toán SimPy...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-white" />
                  <span>Chạy mô phỏng SimPy</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Results Comparison Grid (Appears only after simulation run) */}
      {simResult ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-500 px-1">
            <span>
              Mã chạy mô phỏng: <strong className="font-mono text-slate-800">{simResult.simulation_id}</strong>
              {simResult.scenario_version_id && (
                <span> • Phiên bản kịch bản: <span className="font-mono text-blue-700">{simResult.scenario_version_id}</span></span>
              )}
            </span>
            <span className="bg-blue-50 text-blue-700 border border-blue-200 px-2.5 py-0.5 rounded-full font-semibold">
              Chế độ: Dự báo mô phỏng (Simulation Prediction)
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* KPI 1: Median Waiting Time */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs">
              <span className="text-xs font-semibold text-slate-500 block">Thời gian chờ trung vị (Phút)</span>
              <div className="flex items-baseline space-x-2 mt-2">
                <div className="text-xl font-black text-slate-400 line-through">
                  {simResult.baseline?.median_waiting_time_minutes ?? '—'}p
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                <div className="text-2xl font-black text-emerald-600">
                  {simResult.proposed?.median_waiting_time_minutes ?? '—'}p
                </div>
              </div>
              <span className="text-[11px] font-semibold text-emerald-600 mt-1 block">
                {simResult.comparison?.waiting_time_delta_minutes !== undefined ? (
                  simResult.comparison.waiting_time_delta_minutes <= 0
                    ? `↓ Giảm ${Math.abs(simResult.comparison.waiting_time_delta_minutes)} phút`
                    : `↑ Tăng ${simResult.comparison.waiting_time_delta_minutes} phút`
                ) : 'Dữ liệu tính từ trace'}
              </span>
            </div>

            {/* KPI 2: Max Queue Length */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs">
              <span className="text-xs font-semibold text-slate-500 block">Hàng đợi cực đại (Người)</span>
              <div className="flex items-baseline space-x-2 mt-2">
                <div className="text-xl font-black text-red-500">
                  {simResult.baseline?.max_queue_length ?? '—'}
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                <div className="text-2xl font-black text-blue-700">
                  {simResult.proposed?.max_queue_length ?? '—'}
                </div>
              </div>
              <span className="text-[11px] font-semibold text-blue-700 mt-1 block">
                {simResult.comparison?.queue_reduction_percent !== undefined
                  ? `${simResult.comparison.queue_reduction_percent > 0 ? '↓ Giảm' : '↑ Thay đổi'} ${Math.abs(simResult.comparison.queue_reduction_percent)}% dồn ứ`
                  : '—'}
              </span>
            </div>

            {/* KPI 3: Completed Visits */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs">
              <span className="text-xs font-semibold text-slate-500 block">Số ca hoàn tất khám</span>
              <div className="flex items-baseline space-x-2 mt-2">
                <div className="text-xl font-black text-slate-700">
                  {simResult.baseline?.completed_visits ?? '—'}
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                <div className="text-2xl font-black text-emerald-600">
                  {simResult.proposed?.completed_visits ?? '—'} ca
                </div>
              </div>
              <span className="text-[11px] font-semibold text-emerald-600 mt-1 block">
                {simResult.comparison?.throughput_delta_patients !== undefined
                  ? `Chênh lệch: ${simResult.comparison.throughput_delta_patients >= 0 ? '+' : ''}${simResult.comparison.throughput_delta_patients} ca`
                  : '—'}
              </span>
            </div>

            {/* KPI 4: Completion Rate */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs">
              <span className="text-xs font-semibold text-slate-500 block">Tỷ lệ hoàn thành lượt khám</span>
              <div className="flex items-baseline space-x-2 mt-2">
                <div className="text-xl font-black text-slate-400">
                  {simResult.baseline?.completion_rate_percent ?? '—'}%
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                <div className="text-2xl font-black text-blue-600">
                  {simResult.proposed?.completion_rate_percent ?? '—'}%
                </div>
              </div>
              <span className="text-[10px] text-slate-400 mt-1 block">
                Chưa hoàn tất: {simResult.proposed?.unfinished_visits ?? 0} ca (trong khung 300p)
              </span>
            </div>
          </div>

          {/* Timeline Chart using RELATIVE TIME (+0p, +15p, +30p...) */}
          {chartData.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-extrabold text-sm text-slate-800">
                  Dự báo diễn biến hàng đợi (Thời gian tương đối từ lúc bắt đầu ca khám)
                </h3>
                <span className="text-xs text-slate-400 font-mono">Dữ liệu từ queue_timeline tương đối</span>
              </div>

              <div className="w-full h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                    <XAxis dataKey="time" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} domain={[0, 'auto']} />
                    <Tooltip formatter={(val: any) => [`${val} lượt`, '']} />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="baselineLab"
                      name={`Hiện trạng (${baselineLabCounters} bàn)`}
                      stroke="#ef4444"
                      fill="#fee2e2"
                      strokeWidth={2}
                    />
                    <Area
                      type="monotone"
                      dataKey="proposedLab"
                      name={`Đề xuất (${labCounters} bàn)`}
                      stroke="#0284c7"
                      fill="#e0f2fe"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Call to action for Intervention using concrete simulation_id */}
              <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="text-xs text-slate-600">
                  <span>Mô phỏng đã hoàn tất với mã cụ thể </span>
                  <strong className="font-mono text-blue-700">{simResult.simulation_id}</strong>.
                  <span> Bạn có thể gửi kết quả này thành Đề xuất Can thiệp để trình Ban Giám đốc phê duyệt.</span>
                </div>

                <button
                  onClick={() => setShowModal(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs px-4 py-2 rounded-xl flex items-center justify-center space-x-2 transition-colors shadow-xs shrink-0"
                >
                  <FileCheck className="w-4 h-4" />
                  <span>Tạo đề xuất can thiệp &rarr;</span>
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Empty State before running */
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-2">
          <Cpu className="w-8 h-8 text-slate-400 mx-auto" />
          <h4 className="font-bold text-sm text-slate-700">Mô hình chưa được khởi chạy</h4>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Vui lòng cấu hình các tham số bên trên và nhấn nút <strong>Chạy mô phỏng SimPy</strong> để tính toán đối sánh thời gian chờ và thông lượng.
          </p>
        </div>
      )}

      {/* Modal for creating proposal linked to concrete simulation_id */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl border border-slate-200">
            <h3 className="font-black text-base text-slate-900">
              Trình duyệt Phương án Can thiệp Vận hành
            </h3>
            <p className="text-xs text-slate-500">
              Phương án sẽ liên kết trực tiếp với mã mô phỏng cụ thể <strong className="font-mono text-blue-700">{simResult?.simulation_id}</strong>.
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Tiêu đề phương án</label>
                <input
                  type="text"
                  value={proposalTitle}
                  onChange={(e) => setProposalTitle(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800"
                />
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-1.5 text-[11px] text-slate-600">
                <div><strong>Khu vực mục tiêu:</strong> ROOM-LAB-101 (Lấy mẫu xét nghiệm)</div>
                <div><strong>Nguồn lực bổ sung:</strong> +{Math.max(0, labCounters - baselineLabCounters)} bàn lấy mẫu, {labStaff} điều dưỡng</div>
                <div><strong>Máy CT Scanner:</strong> {ctOnline ? 'Online (Bình thường)' : 'Offline (Đang có sự cố)'}</div>
                <div><strong>Dự kiến trung vị chờ:</strong> {simResult?.proposed?.median_waiting_time_minutes} phút</div>
              </div>

              {proposalSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center space-x-2 font-semibold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{proposalSuccess}</span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50 transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={handleCreateIntervention}
                disabled={submittingProposal}
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold px-4 py-2 rounded-xl transition-colors shadow-xs flex items-center space-x-1.5"
              >
                {submittingProposal ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                <span>Gửi trình Ban Giám đốc</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
